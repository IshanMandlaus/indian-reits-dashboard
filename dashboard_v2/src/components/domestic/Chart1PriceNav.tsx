/**
 * Chart 1 — traded price vs stepped NAV/unit, with a switchable 2nd axis:
 * DPU bars (default) or the P/B ratio line. A label plugin annotates every
 * NAV step and each FY's price peak/valley.
 */
import { useState } from 'react'
import { Chart } from 'chart.js'
import type { ReitData, ReitKey, LivePrices, PriceHistory } from '../../types/data'
import {
  CHART,
  EXPORT_STATE,
  labelFont,
  baseOptions,
  zoomOptions,
  rescaleY,
  type ChartWithRange,
  type RangeConfig,
} from '../../lib/chartSetup'
import { navSteps, navAt, closeSeries, pbSeries, dTs, perTs, fyTs, fmtM, fmtDay } from '../../lib/reit'
import { inr, pct } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { RangeBar } from '../charts/RangeBar'
import type { ChartConfiguration, Plugin } from 'chart.js'

type AltAxis = 'dpu' | 'pb'

export function Chart1PriceNav({
  D,
  k,
  LIVE,
  H,
}: {
  D: ReitData
  k: ReitKey
  LIVE: LivePrices | null
  H: PriceHistory | null
}) {
  const [alt, setAlt] = useState<AltAxis>('dpu')
  // Reset to DPU whenever the REIT changes.
  const [lastK, setLastK] = useState(k)
  if (lastK !== k) {
    setLastK(k)
    setAlt('dpu')
  }
  const { canvasRef, chartRef } = useChartCanvas(() => build(D, k, LIVE, H, alt), [D, k, LIVE, H, alt])
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setAlt(alt === 'dpu' ? 'pb' : 'dpu')}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
        >
          {alt === 'dpu' ? 'switch to P/B ×' : 'switch to DPU'}
        </button>
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
    const ink = Chart.defaults.color as string // black while the export re-theme is active
    ctx.save()
    ctx.beginPath()
    ctx.rect(chartArea.left - 30, chartArea.top - 14, chartArea.width + 60, chartArea.height + 28)
    ctx.clip()
    ctx.font = labelFont()
    ctx.textAlign = 'center'
    const visible = (el: { x: number; y: number }) =>
      el.x >= chartArea.left - 4 && el.x <= chartArea.right + 4 && el.y >= chartArea.top - 8 && el.y <= chartArea.bottom + 8

    // NAV steps (dataset 1) — value above each reported point.
    const navMeta = ch.getDatasetMeta(1)
    ctx.fillStyle = exp ? ink : CHART.gold
    ctx.textBaseline = 'bottom'
    for (const el of navMeta.data) {
      const p = el as unknown as { x: number; y: number; raw?: unknown }
      if (!visible(p)) continue
      const v = (p as { $context?: { parsed?: { y?: number } } }).$context?.parsed?.y
      if (v == null) continue
      ctx.fillText(inr(v, 0), p.x, p.y - 6)
    }

    // Price (dataset 0) — each FY's peak above, valley below.
    const priceMeta = ch.getDatasetMeta(0)
    ctx.fillStyle = exp ? ink : CHART.acc
    for (const [idxs, above] of [
      [cfg.peaks, true],
      [cfg.valleys, false],
    ] as [number[], boolean][]) {
      ctx.textBaseline = above ? 'bottom' : 'top'
      for (const i of idxs) {
        const el = priceMeta.data[i] as unknown as { x: number; y: number } | undefined
        if (!el || !visible(el)) continue
        const v = (el as { $context?: { parsed?: { y?: number } } }).$context?.parsed?.y
        if (v == null) continue
        ctx.fillText(inr(v, 0), el.x, above ? el.y - 5 : el.y + 5)
      }
    }
    ctx.restore()
  },
}

function build(D: ReitData, k: ReitKey, LIVE: LivePrices | null, H: PriceHistory | null, alt: AltAxis): ChartConfiguration {
  const f = D.fin[k]
  const price = closeSeries(D, k, H).map((p) => ({ x: dTs(p[0]), y: p[1] }))
  const live = LIVE?.[k]
  if (live && live.price && (!price.length || Date.now() > price[price.length - 1].x)) price.push({ x: Date.now(), y: live.price })
  const nav = navSteps(D, k).map((p) => ({ x: p.ts, y: p.nav }))

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

  const hasQ = (f.q || []).some((x) => x.dpu != null)
  const dpu = hasQ
    ? f.q.filter((x) => x.dpu != null).map((x) => ({ x: perTs(x.per), y: x.dpu as number }))
    : f.years
        .map((y, i) => ({ x: fyTs(y), y: f.dpu[i] as number }))
        .filter((p) => p.y != null)
  const pb = alt === 'pb' ? pbSeries(D, k, LIVE, H) : []
  const xmin = Math.min(...price.map((p) => p.x), ...nav.map((p) => p.x))
  const xmax = Math.max(...price.map((p) => p.x), ...nav.map((p) => p.x), Date.now())

  const altDataset =
    alt === 'dpu'
      ? ({ type: 'bar', label: hasQ ? 'DPU (quarter)' : 'DPU (FY)', data: dpu, backgroundColor: 'rgba(96,165,250,.5)', barThickness: hasQ ? 5 : 14, yAxisID: 'y2' } as const)
      : ({ type: 'line', label: 'P/B (price ÷ NAV)', data: pb, borderColor: CHART.violet, borderWidth: 1.4, borderDash: [5, 3], pointRadius: 0, yAxisID: 'y2' } as const)
  const y2 =
    alt === 'dpu'
      ? { position: 'right' as const, title: { display: true, text: 'DPU ₹' }, grid: { display: false }, beginAtZero: true, suggestedMax: Math.max(...dpu.map((p) => p.y || 0)) * 3 || 10 }
      : { position: 'right' as const, title: { display: true, text: 'P/B ×' }, grid: { display: false }, grace: '10%' as const }

  const cfg: RangeConfig = {
    type: 'line',
    data: {
      datasets: [
        { type: 'line', label: 'Price', data: price, borderColor: CHART.acc, borderWidth: 1.8, pointRadius: 0, yAxisID: 'y' },
        { type: 'line', label: 'NAV / unit', data: nav, borderColor: CHART.gold, borderWidth: 2, stepped: 'before', pointRadius: 3, pointBackgroundColor: CHART.gold, yAxisID: 'y' },
        altDataset,
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
        ...({ priceNavLabels: { peaks, valleys } } as object),
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
