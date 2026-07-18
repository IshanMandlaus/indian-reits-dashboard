/**
 * The four InvIT charts (v1 c_px / c_rb / c_yield / c_ev):
 *  • unit-price lines (own colours, range bar + zoom),
 *  • rebased-to-100 vs NIFTY 50 / FDs / G-Sec with a basket ↔ own-life toggle,
 *  • trailing cash-yield bars, and
 *  • enterprise-value bars.
 * Time-series charts feed the shared <TimeSeriesChart>; the two bar charts use
 * `useChartCanvas` directly (category axis, no zoom).
 */
import { useState } from 'react'
import type { ChartConfiguration } from 'chart.js'
import type { InvitTrust } from '../../types/data'
import { baseOptions, zoomOptions, CHART, type RangeConfig } from '../../lib/chartSetup'
import { fmtCrLabel } from '../../lib/barValueLabels'
import { fmtM, fmtDay } from '../../lib/reit'
import {
  type BenchCtx,
  type Pt,
  rebase,
  secPts,
  fdPts,
  fdFlatPts,
  gsecPts,
} from '../../lib/bench'
import {
  invitPricePts,
  invitNavPts,
  invitFrom,
  invitCal,
  invitOwnLine,
  invitBasket,
  lastInvitPx,
} from '../../lib/invit'
import { TimeSeriesChart, ZOOM_HINT } from '../charts/TimeSeriesChart'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type Plugin } from 'chart.js'
import { labelFont, haloText } from '../../lib/chartSetup'
import { inr } from '../../lib/format'

interface DS {
  label: string
  data: Pt[]
  borderColor: string
  borderWidth: number
  borderDash?: number[]
}

/** Assemble a linear-time line config with the shared dark styling + zoom. */
function timeLineConfig(datasets: DS[], yTitle: string): RangeConfig {
  const xs = datasets.flatMap((d) => d.data.map((p) => p.x))
  const xmin = xs.length ? Math.min(...xs) : 0
  const xmax = xs.length ? Math.max(...xs) : 0
  const cfg: RangeConfig = {
    type: 'line',
    data: { datasets: datasets.map((d) => ({ ...d, pointRadius: 0, spanGaps: true })) },
    options: {
      ...baseOptions(),
      scales: {
        x: {
          type: 'linear',
          min: xmin,
          max: xmax,
          ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 12 },
          grid: { display: false },
        },
        y: { title: { display: true, text: yTitle } },
      },
      plugins: {
        ...baseOptions().plugins,
        zoom: zoomOptions(),
        tooltip: { callbacks: { title: (it) => (it[0] ? fmtDay(it[0].parsed.x as number) : '') } },
      },
    },
  }
  cfg._xmin = xmin
  cfg._xmax = xmax
  return cfg
}

/** Benchmark lines shared by both rebased modes (NIFTY 50 · SBI FD · 7% FD · G-Sec). */
function benchLines(ctx: BenchCtx, from: string): DS[] {
  return [
    { label: 'NIFTY 50', data: rebase(secPts(ctx, 'NIFTY 50', from)), borderColor: CHART.gold, borderWidth: 1.5 },
    { label: 'SBI 1-yr FD', data: fdPts(ctx, from), borderColor: CHART.mut, borderDash: [5, 4], borderWidth: 1.4 },
    { label: 'FD @ 7% p.a.', data: fdFlatPts(ctx, from, 7), borderColor: '#7fd4c8', borderDash: [2, 3], borderWidth: 1.4 },
    { label: 'GoI 10Y G-Sec (indicative)', data: gsecPts(ctx, from), borderColor: CHART.violet, borderDash: [6, 3], borderWidth: 1.5 },
  ]
}

// ─── unit prices ────────────────────────────────────────────────────────────

export function InvitPriceChart({ ctx, trusts }: { ctx: BenchCtx; trusts: InvitTrust[] }) {
  return (
    <TimeSeriesChart
      deps={[ctx, trusts]}
      height={360}
      rangeBar
      caption={ZOOM_HINT}
      build={() =>
        timeLineConfig(
          trusts.map((t) => ({
            label: t.nse,
            data: invitPricePts(ctx, t.key),
            borderColor: t.color,
            borderWidth: 1.7,
          })),
          '₹ / unit',
        ) as ChartConfiguration
      }
    />
  )
}

// ─── price vs NAV ───────────────────────────────────────────────────────────

/**
 * Unit price (solid, daily closes) vs independent-valuation NAV/unit (dashed
 * stepped line, quarterly/FY points from `nav_hist`) — one colour per trust.
 * NAV points get visible markers: PGInvIT/RIIT have few (or one) points and a
 * bare line would vanish.
 */
export function InvitNavChart({ ctx, trusts }: { ctx: BenchCtx; trusts: InvitTrust[] }) {
  return (
    <TimeSeriesChart
      deps={[ctx, trusts]}
      height={360}
      rangeBar
      caption={ZOOM_HINT}
      build={() => {
        const cfg = timeLineConfig(
          trusts.flatMap((t) => {
            const nav = invitNavPts(t)
            const px = invitPricePts(ctx, t.key)
            const series: DS[] = []
            if (px.length) series.push({ label: t.nse + ' price', data: px, borderColor: t.color, borderWidth: 1.7 })
            if (nav.length)
              series.push({ label: t.nse + ' NAV', data: nav, borderColor: t.color, borderWidth: 1.4, borderDash: [5, 4] })
            return series
          }),
          '₹ / unit',
        )
        // NAV series: stepped between valuation dates + visible point markers.
        for (const ds of cfg.data!.datasets as unknown as Record<string, unknown>[]) {
          if (String(ds.label).endsWith('NAV')) {
            ds.stepped = 'before'
            ds.pointRadius = 2.5
            ds.pointBackgroundColor = ds.borderColor
          }
        }
        return cfg as ChartConfiguration
      }}
    />
  )
}

// ─── P/NAV across trusts (bars) ─────────────────────────────────────────────

/** Latest price ÷ latest disclosed NAV per trust, dashed guide at 1.0× parity. */
export function InvitPNavChart({ ctx, trusts }: { ctx: BenchCtx; trusts: InvitTrust[] }) {
  const { canvasRef } = useChartCanvas(() => buildPNav(ctx, trusts), [ctx, trusts])
  return (
    <div className="relative h-[240px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function buildPNav(ctx: BenchCtx, trusts: InvitTrust[]): ChartConfiguration {
  const rows = trusts
    .filter((t) => t.nav > 0)
    .map((t) => ({ t, price: lastInvitPx(ctx, t), pnav: lastInvitPx(ctx, t) / t.nav }))

  const labelPlugin: Plugin = {
    id: 'invitPNavLabels',
    afterDatasetsDraw(ch) {
      const c = ch.ctx
      const mt = ch.getDatasetMeta(0)
      c.save()
      c.font = labelFont() // scales up during the SVG export capture
      c.textAlign = 'left'
      c.textBaseline = 'middle'
      mt.data.forEach((el, i) => {
        // flips to black ink in the export re-theme; haloed for legibility over gridlines
        haloText(c, rows[i].pnav.toFixed(2) + '×', el.x + 6, el.y, Chart.defaults.color as string)
      })
      c.restore()
    },
  }
  const parityPlugin: Plugin = {
    id: 'invitPNavParity',
    beforeDatasetsDraw(ch) {
      const xs = ch.scales.x
      if (!xs) return
      const px = xs.getPixelForValue(1)
      if (px < xs.left || px > xs.right) return
      const c = ch.ctx
      c.save()
      c.strokeStyle = CHART.bookGrid
      c.setLineDash([5, 4])
      c.lineWidth = 1
      c.beginPath()
      c.moveTo(px, ch.chartArea.top)
      c.lineTo(px, ch.chartArea.bottom)
      c.stroke()
      c.restore()
    },
  }

  return {
    type: 'bar',
    data: {
      labels: rows.map((r) => r.t.nse),
      datasets: [{ data: rows.map((r) => r.pnav), backgroundColor: rows.map((r) => r.t.color) }],
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, grace: '12%', ticks: { callback: (v) => (+v).toFixed(1) + '×' }, grid: { display: false } },
        y: { grid: { display: false } },
      },
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        barValueLabels: { display: false }, // draws its own labels (labelPlugin)
        tooltip: {
          callbacks: {
            label: (it) => {
              const r = rows[it.dataIndex]
              return ['P/NAV: ' + r.pnav.toFixed(2) + '×', 'price ' + inr(r.price, 2) + ' ÷ NAV ' + inr(r.t.nav, 2)]
            },
          },
        },
      },
    },
    plugins: [labelPlugin, parityPlugin],
  }
}

// ─── rebased (basket ↔ own-life) ────────────────────────────────────────────

export function InvitRebasedChart({ ctx, trusts }: { ctx: BenchCtx; trusts: InvitTrust[] }) {
  const [mode, setMode] = useState<'basket' | 'own'>('basket')
  const keys = trusts.map((t) => t.key)
  const note =
    mode === 'basket'
      ? 'Total-InvITs basket (equal-weight, growing as each lists) vs NIFTY 50 · SBI 1-yr FD · a flat 7% p.a. FD · GoI 10Y G-Sec — price return only, excludes their high distributions'
      : 'Each InvIT rebased to 100 at its OWN listing (own life) — PGInvIT May-21, NHIT Nov-21, RIIT Mar-26 — vs NIFTY 50 & the benchmarks (price return only)'
  return (
    <>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11.5px] leading-relaxed text-muted">{note}</p>
        <button
          onClick={() => setMode(mode === 'basket' ? 'own' : 'basket')}
          className="shrink-0 rounded-md border border-border bg-surface-2 px-3 py-1 text-[11px] font-medium text-ink transition hover:border-accent"
        >
          {mode === 'basket' ? 'show individual (own life)' : 'show basket'}
        </button>
      </div>
      <TimeSeriesChart
        deps={[ctx, trusts, mode]}
        height={320}
        caption={ZOOM_HINT}
        build={() => {
          const from = invitFrom(ctx, keys)
          const cal = invitCal(ctx, from)
          const series: DS[] =
            mode === 'basket'
              ? [
                  { label: 'Total InvITs basket (equal-wt, price only)', data: invitBasket(ctx, keys, cal), borderColor: CHART.acc, borderWidth: 2 },
                  ...benchLines(ctx, from),
                ]
              : [
                  ...trusts.map((t) => ({
                    label: t.nse + ' (own life)',
                    data: invitOwnLine(ctx, t.key, cal),
                    borderColor: t.color,
                    borderWidth: 1.7,
                  })),
                  ...benchLines(ctx, from),
                ]
          return timeLineConfig(series, 'rebased = 100') as ChartConfiguration
        }}
      />
    </>
  )
}

// ─── trailing cash yield (bars) ─────────────────────────────────────────────

export function InvitYieldChart({
  ctx,
  trusts,
  reitYield,
}: {
  ctx: BenchCtx
  trusts: InvitTrust[]
  reitYield: number | null
}) {
  const { canvasRef } = useChartCanvas(() => buildYield(ctx, trusts, reitYield), [ctx, trusts, reitYield])
  return (
    <div className="relative h-[300px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function buildYield(ctx: BenchCtx, trusts: InvitTrust[], reitYield: number | null): ChartConfiguration {
  const bars: { l: string; v: number; c: string }[] = []
  for (const t of trusts) {
    if (!t.dpu_fy26) continue
    bars.push({ l: t.nse, v: +((t.dpu_fy26 / lastInvitPx(ctx, t)) * 100).toFixed(2), c: t.color })
  }
  if (reitYield != null) bars.push({ l: 'Indian REITs (combined FY26)', v: reitYield, c: CHART.gold })
  const fdNow = ctx.fdSteps[ctx.fdSteps.length - 1][1]
  bars.push({ l: 'SBI 1-yr FD', v: fdNow, c: CHART.mut })
  bars.push({ l: 'FD @ 7% p.a.', v: 7, c: '#7fd4c8' })
  return {
    type: 'bar',
    data: { labels: bars.map((b) => b.l), datasets: [{ data: bars.map((b) => b.v), backgroundColor: bars.map((b) => b.c) }] },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        barValueLabels: { format: (v) => v.toFixed(1) + '%' }, // export-only value above each bar
      },
      scales: {
        x: { grid: { display: false } },
        y: { title: { display: true, text: '% p.a.' } },
      },
    },
  }
}

// ─── enterprise value (horizontal bars) ─────────────────────────────────────

export function InvitEvChart({ trusts }: { trusts: InvitTrust[] }) {
  const { canvasRef } = useChartCanvas(() => buildEv(trusts), [trusts])
  return (
    <div className="relative h-[200px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function buildEv(trusts: InvitTrust[]): ChartConfiguration {
  return {
    type: 'bar',
    data: {
      labels: trusts.map((t) => t.nse),
      datasets: [{ data: trusts.map((t) => t.ev_cr), backgroundColor: trusts.map((t) => t.color) }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        barValueLabels: { format: fmtCrLabel }, // export-only value beside each bar
      },
      scales: {
        x: { title: { display: true, text: '₹ cr' } },
        y: { grid: { display: false } },
      },
    },
  }
}
