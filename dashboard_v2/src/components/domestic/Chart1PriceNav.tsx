/**
 * Chart 1 — traded price vs stepped NAV/unit, with a switchable 2nd axis:
 * daily traded volume bars (default; NSE + BSE combined, from
 * volume-history.json) or the P/B ratio line. A label plugin annotates every
 * NAV step and each FY's price peak/valley.
 */
import { useState } from 'react'
import type { ReitData, ReitKey, LivePrices, PriceHistory, VolumeHistory } from '../../types/data'
import {
  CHART,
  EXPORT_STATE,
  labelFont,
  haloText,
  baseOptions,
  zoomOptions,
  rescaleY,
  type ChartWithRange,
  type RangeConfig,
} from '../../lib/chartSetup'
import { LabelPlacer } from '../../lib/barValueLabels'
import { seriesInk } from '../../lib/svgExport'
import { REIT_SEC, navSteps, navAt, closeSeries, pbSeries, dTs, fyTs, fmtM, fmtDay } from '../../lib/reit'
import { inr, pct } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { RangeBar } from '../charts/RangeBar'
import type { ChartConfiguration, Plugin } from 'chart.js'

type AltAxis = 'vol' | 'pb'

export function Chart1PriceNav({
  D,
  k,
  LIVE,
  H,
  V,
}: {
  D: ReitData
  k: ReitKey
  LIVE: LivePrices | null
  H: PriceHistory | null
  V: VolumeHistory | null
}) {
  const [alt, setAlt] = useState<AltAxis>('vol')
  // Reset to volume whenever the REIT changes.
  const [lastK, setLastK] = useState(k)
  if (lastK !== k) {
    setLastK(k)
    setAlt('vol')
  }
  // No exchange CSVs for this security (e.g. Bagmane) → P/B only, no toggle.
  const hasVol = !!V?.secs[REIT_SEC[k]] && Object.keys(V.secs[REIT_SEC[k]]).length > 0
  const eff: AltAxis = hasVol ? alt : 'pb'
  const { canvasRef, chartRef } = useChartCanvas(() => build(D, k, LIVE, H, V, eff), [D, k, LIVE, H, V, eff])
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        {hasVol ? (
          <button
            onClick={() => setAlt(eff === 'vol' ? 'pb' : 'vol')}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            {eff === 'vol' ? 'switch to P/B ×' : 'switch to volume'}
          </button>
        ) : (
          <span />
        )}
        <RangeBar key={k} chartRef={chartRef} />
      </div>
      <div className="relative h-[340px]" onDoubleClick={() => resetZoom(chartRef.current)}>
        <canvas ref={canvasRef} />
      </div>
      <p className="mt-1.5 text-[10.5px] text-subtle">
        scroll = zoom · shift-drag = box zoom · ctrl-drag = pan · double-click = reset
      </p>
    </>
  )
}

function resetZoom(ch: ChartWithRange | null) {
  if (!ch) return
  ch.resetZoom?.()
  const x = ch.options.scales!.x as { min?: number; max?: number }
  x.min = ch._xmin
  x.max = ch._xmax
  rescaleY(ch)
  ch.update()
}

interface LabelCfg {
  /** Price-dataset indices of each FY's highest close / lowest close. */
  peaks: number[]
  valleys: number[]
  /** NAV-dataset indices to label (FY-end marks only, not quarterly steps). */
  navIdx: number[]
}

/** Indian FY bucket of a timestamp: FY ends 31 Mar of the returned year. */
function fyOf(ts: number): number {
  const d = new Date(ts)
  return d.getMonth() >= 3 ? d.getFullYear() + 1 : d.getFullYear()
}

/** NAV value above every step point + price value at each FY's peak/valley. */
const priceNavLabels: Plugin = {
  id: 'priceNavLabels',
  afterDatasetsDraw(ch) {
    const cfg = (ch.config.options?.plugins as { priceNavLabels?: LabelCfg } | undefined)?.priceNavLabels
    if (!cfg) return
    const { ctx, chartArea } = ch
    const exp = EXPORT_STATE.active
    ctx.save()
    ctx.beginPath()
    ctx.rect(chartArea.left - 30, chartArea.top - 14, chartArea.width + 60, chartArea.height + 28)
    ctx.clip()
    ctx.font = labelFont()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const visible = (el: { x: number; y: number }) =>
      el.x >= chartArea.left - 4 && el.x <= chartArea.right + 4 && el.y >= chartArea.top - 8 && el.y <= chartArea.bottom + 8

    // Shared placer: NAV labels claim their spots first, then price peaks,
    // then valleys — later labels are nudged away instead of overprinting.
    const placer = new LabelPlacer()
    const h = 11
    const draw = (x: number, y: number, v: number, above: boolean, color: string) => {
      const text = inr(v, 0)
      const w = ctx.measureText(text).width
      const top = above ? y - 7 - h : y + 6
      const t = placer.place(x - w / 2, top, w, h, above ? -1 : 1)
      // haloed so the number reads over any line; export keeps it colour-coded
      // to its series (print-legible shade)
      haloText(ctx, text, x, t, exp ? seriesInk(color) : color)
    }

    // NAV steps (dataset 1) — value above each FY-end mark. Skip when the NAV
    // series is toggled off in the legend.
    if (ch.isDatasetVisible(1)) {
      const navMeta = ch.getDatasetMeta(1)
      for (const i of cfg.navIdx) {
        const p = navMeta.data[i] as unknown as { x: number; y: number } | undefined
        if (!p || !visible(p)) continue
        const v = (p as { $context?: { parsed?: { y?: number } } }).$context?.parsed?.y
        if (v == null) continue
        draw(p.x, p.y, v, true, CHART.gold)
      }
    }

    // Price (dataset 0) — each FY's peak above, valley below. Skip when the
    // price series is toggled off.
    if (ch.isDatasetVisible(0)) {
      const priceMeta = ch.getDatasetMeta(0)
      for (const [idxs, above] of [
        [cfg.peaks, true],
        [cfg.valleys, false],
      ] as [number[], boolean][]) {
        for (const i of idxs) {
          const el = priceMeta.data[i] as unknown as { x: number; y: number } | undefined
          if (!el || !visible(el)) continue
          const v = (el as { $context?: { parsed?: { y?: number } } }).$context?.parsed?.y
          if (v == null) continue
          draw(el.x, el.y, v, above, CHART.acc)
        }
      }
    }
    ctx.restore()
  },
}

function build(D: ReitData, k: ReitKey, LIVE: LivePrices | null, H: PriceHistory | null, V: VolumeHistory | null, alt: AltAxis): ChartConfiguration {
  const f = D.fin[k]
  const price = closeSeries(D, k, H).map((p) => ({ x: dTs(p[0]), y: p[1] }))
  const live = LIVE?.[k]
  if (live && live.price && (!price.length || Date.now() > price[price.length - 1].x)) price.push({ x: Date.now(), y: live.price })
  const nav = navSteps(D, k).map((p) => ({ x: p.ts, y: p.nav }))
  // Label only FY-end NAV marks; navSteps also interleaves quarterly steps.
  const fye = new Set(f.years.map((y) => fyTs(y)))
  const navIdx = nav.map((p, i) => (fye.has(p.x) ? i : -1)).filter((i) => i >= 0)

  // Per-FY price extremes for the label plugin (indices into `price`).
  const byFy = new Map<number, { hi: number; lo: number }>()
  price.forEach((p, i) => {
    const g = byFy.get(fyOf(p.x))
    if (!g) byFy.set(fyOf(p.x), { hi: i, lo: i })
    else {
      if (p.y > price[g.hi].y) g.hi = i
      if (p.y < price[g.lo].y) g.lo = i
    }
  })
  const peaks = [...byFy.values()].map((g) => g.hi)
  const valleys = [...byFy.values()].map((g) => g.lo).filter((i) => !peaks.includes(i))

  // Daily traded volume in lakh units (NSE RR + BSE combined).
  const vol =
    alt === 'vol'
      ? Object.entries(V?.secs[REIT_SEC[k]] ?? {})
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([d, r]) => ({ x: dTs(d), y: r.v / 1e5 }))
      : []
  const pb = alt === 'pb' ? pbSeries(D, k, LIVE, H) : []
  const xmin = Math.min(...price.map((p) => p.x), ...nav.map((p) => p.x))
  const xmax = Math.max(...price.map((p) => p.x), ...nav.map((p) => p.x), Date.now())

  const altDataset =
    alt === 'vol'
      ? { type: 'bar' as const, label: 'Volume (NSE+BSE)', data: vol, backgroundColor: 'rgba(96,165,250,.45)', barThickness: 1, yAxisID: 'y2' }
      : { type: 'line' as const, label: 'P/B (price ÷ NAV)', data: pb, borderColor: CHART.violet, borderWidth: 1.4, borderDash: [5, 3], pointRadius: 0, yAxisID: 'y2' }
  const y2 =
    alt === 'vol'
      ? { position: 'right' as const, title: { display: true, text: 'Volume (lakh units)' }, grid: { display: false }, beginAtZero: true, suggestedMax: vol.length ? Math.max(...vol.map((p) => p.y || 0)) * 3 : 10 }
      : { position: 'right' as const, title: { display: true, text: 'P/B ×' }, grid: { display: false }, grace: '10%' as const }

  const cfg: RangeConfig = {
    type: 'line',
    data: {
      datasets: [
        { type: 'line', label: 'Price', data: price, borderColor: CHART.acc, borderWidth: 1.8, pointRadius: 0, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'NAV / unit', data: nav, borderColor: CHART.gold, borderWidth: 2, stepped: 'before', pointRadius: 3, pointBackgroundColor: CHART.gold, yAxisID: 'y', order: 1 },
        { ...altDataset, order: 3 },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { type: 'linear', min: xmin, ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 12 }, grid: { display: false } },
        y: { title: { display: true, text: '₹ / unit' }, grace: '5%' },
        y2,
      },
      plugins: {
        ...baseOptions().plugins,
        zoom: zoomOptions(),
        ...({ priceNavLabels: { peaks, valleys, navIdx } } as object),
        tooltip: {
          callbacks: {
            title: (it) => fmtDay(it[0].parsed.x as number),
            label: (it) => {
              const px = it.parsed.x as number
              const py = it.parsed.y as number
              if (it.dataset.label === 'Price') {
                const n = navAt(D, k, px)
                return ['Price: ' + inr(py, 2), n ? 'vs NAV ' + inr(n, 2) + ' → ' + pct(py / n - 1) : '']
              }
              if (it.dataset.label?.startsWith('P/B')) return 'P/B: ' + py.toFixed(2) + '×'
              if (it.dataset.label?.startsWith('Volume')) return 'Volume: ' + py.toFixed(2) + ' lakh units'
              return it.dataset.label + ': ' + inr(py, 2)
            },
          },
        },
      },
    },
    plugins: [priceNavLabels],
  }
  cfg._xmin = xmin
  cfg._xmax = xmax
  return cfg
}
