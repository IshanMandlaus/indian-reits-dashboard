/** Chart 1 — traded price vs stepped NAV/unit, with DPU bars on a 2nd axis. */
import type { ReitData, ReitKey, LivePrices } from '../../types/data'
import { CHART, baseOptions, zoomOptions, rescaleY, type ChartWithRange, type RangeConfig } from '../../lib/chartSetup'
import { navSteps, navAt, dTs, perTs, fyTs, fmtM } from '../../lib/reit'
import { inr, pct } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { RangeBar } from '../charts/RangeBar'
import type { ChartConfiguration } from 'chart.js'

export function Chart1PriceNav({
  D,
  k,
  LIVE,
}: {
  D: ReitData
  k: ReitKey
  LIVE: LivePrices | null
}) {
  const { canvasRef, chartRef } = useChartCanvas(() => build(D, k, LIVE), [D, k, LIVE])
  return (
    <>
      <div className="mb-2 flex justify-end">
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

function build(D: ReitData, k: ReitKey, LIVE: LivePrices | null): ChartConfiguration {
  const f = D.fin[k]
  const price = (D.prices[k] || []).map((p) => ({ x: dTs(p[0]), y: p[1] }))
  const live = LIVE?.[k]
  if (live && live.price) price.push({ x: Date.now(), y: live.price })
  const nav = navSteps(D, k).map((p) => ({ x: p.ts, y: p.nav }))
  const hasQ = (f.q || []).some((x) => x.dpu != null)
  const dpu = hasQ
    ? f.q.filter((x) => x.dpu != null).map((x) => ({ x: perTs(x.per), y: x.dpu as number }))
    : f.years
        .map((y, i) => ({ x: fyTs(y), y: f.dpu[i] as number }))
        .filter((p) => p.y != null)
  const xmin = Math.min(...price.map((p) => p.x), ...nav.map((p) => p.x))
  const xmax = Math.max(...price.map((p) => p.x), ...nav.map((p) => p.x), Date.now())

  const cfg: RangeConfig = {
    type: 'line',
    data: {
      datasets: [
        { type: 'line', label: 'Price', data: price, borderColor: CHART.acc, borderWidth: 1.8, pointRadius: 0, yAxisID: 'y' },
        { type: 'line', label: 'NAV / unit', data: nav, borderColor: CHART.gold, borderWidth: 2, stepped: 'before', pointRadius: 3, pointBackgroundColor: CHART.gold, yAxisID: 'y' },
        { type: 'bar', label: hasQ ? 'DPU (quarter)' : 'DPU (FY)', data: dpu, backgroundColor: 'rgba(96,165,250,.5)', barThickness: hasQ ? 5 : 14, yAxisID: 'y2' },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { type: 'linear', min: xmin, ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 12 }, grid: { display: false } },
        y: { title: { display: true, text: '₹ / unit' }, grace: '5%' },
        y2: { position: 'right', title: { display: true, text: 'DPU ₹' }, grid: { display: false }, beginAtZero: true, suggestedMax: Math.max(...dpu.map((p) => p.y || 0)) * 3 || 10 },
      },
      plugins: {
        ...baseOptions().plugins,
        zoom: zoomOptions(),
        tooltip: {
          callbacks: {
            title: (it) => fmtM(it[0].parsed.x as number),
            label: (it) => {
              const px = it.parsed.x as number
              const py = it.parsed.y as number
              if (it.dataset.label === 'Price') {
                const n = navAt(D, k, px)
                return ['Price: ' + inr(py, 2), n ? 'vs NAV ' + inr(n, 2) + ' → ' + pct(py / n - 1) : '']
              }
              return it.dataset.label + ': ' + inr(py, 2)
            },
          },
        },
      },
    },
  }
  cfg._xmin = xmin
  cfg._xmax = xmax
  return cfg
}
