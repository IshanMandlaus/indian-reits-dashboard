/**
 * Chart 7 — P/B ratio: traded price ÷ latest reported NAV per unit, with a
 * dashed 1.0× parity line (above = premium to NAV, below = discount).
 * Complete pairs only: the series starts at the REIT's first reported NAV.
 */
import type { ReitData, ReitKey, LivePrices, PriceHistory } from '../../types/data'
import { CHART, baseOptions, zoomOptions, rescaleY, type ChartWithRange, type RangeConfig } from '../../lib/chartSetup'
import { pbSeries, closeSeries, navAtStrict, dTs, fmtM, fmtDay } from '../../lib/reit'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { RangeBar } from '../charts/RangeBar'
import type { ChartConfiguration } from 'chart.js'

export function Chart7Pb({
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
  const { canvasRef, chartRef } = useChartCanvas(() => build(D, k, LIVE, H), [D, k, LIVE, H])
  const pb = pbSeries(D, k, LIVE, H)
  const firstPrice = closeSeries(D, k, H)[0]
  const startsLate = pb.length > 0 && firstPrice && pb[0].x > dTs(firstPrice[0])
  return (
    <>
      <div className="mb-2 flex justify-end">
        <RangeBar key={k} chartRef={chartRef} />
      </div>
      {startsLate && (
        <p className="mb-2 text-[11px] leading-relaxed text-muted">
          P/B shown from {fmtDay(pb[0].x)} — no reported NAV before that date.
        </p>
      )}
      <div className="relative h-[280px]" onDoubleClick={() => resetZoom(chartRef.current)}>
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

function build(D: ReitData, k: ReitKey, LIVE: LivePrices | null, H: PriceHistory | null): ChartConfiguration {
  const pb = pbSeries(D, k, LIVE, H)
  const xmin = pb.length ? pb[0].x : Date.now() - 30 * 864e5
  const xmax = Math.max(pb.length ? pb[pb.length - 1].x : 0, Date.now())

  const cfg: RangeConfig = {
    type: 'line',
    data: {
      datasets: [
        { type: 'line', label: 'P/B (price ÷ NAV)', data: pb, borderColor: CHART.acc, borderWidth: 1.8, pointRadius: 0, yAxisID: 'y' },
        {
          type: 'line',
          label: 'Parity (1.0×)',
          data: [
            { x: xmin, y: 1 },
            { x: xmax, y: 1 },
          ],
          borderColor: CHART.bookGrid,
          borderWidth: 1,
          borderDash: [5, 4],
          pointRadius: 0,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { type: 'linear', min: xmin, ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 12 }, grid: { display: false } },
        y: { title: { display: true, text: 'P/B (×)' }, grace: '5%', ticks: { callback: (v) => (+v).toFixed(2) + '×' } },
      },
      plugins: {
        ...baseOptions().plugins,
        zoom: zoomOptions(),
        tooltip: {
          filter: (it) => it.datasetIndex === 0,
          callbacks: {
            title: (it) => fmtDay(it[0].parsed.x as number),
            label: (it) => {
              const px = it.parsed.x as number
              const py = it.parsed.y as number
              const n = navAtStrict(D, k, px)
              return ['P/B: ' + py.toFixed(2) + '×', n ? 'price ' + inr(py * n, 2) + ' ÷ NAV ' + inr(n, 2) : '']
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
