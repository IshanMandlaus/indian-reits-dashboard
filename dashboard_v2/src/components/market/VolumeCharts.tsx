/**
 * Turnover trajectory (Exhibit 6): the REITs veterans basket vs NIFTY 50 / NIFTY
 * REALTY turnover, rebased to a VOL INDEX, with a 20-day moving average below. The
 * rebase + MA recompute against the selected time window (`years`) — narrowing the
 * window re-anchors the index to the window start, matching the Tableau table-calc.
 * The Embassy block-deal (24-Feb-26) is flagged with a triangle + tooltip.
 */
import type { ChartConfiguration } from 'chart.js'
import { baseOptions, zoomOptions, CHART, type RangeConfig } from '../../lib/chartSetup'
import { fmtM, fmtDay } from '../../lib/reit'
import { type BenchCtx, type Pt, volumeSeries, turnoverCal, startFrom } from '../../lib/bench'
import { TimeSeriesChart, ZOOM_HINT } from '../charts/TimeSeriesChart'

function timeAxis(yTitle: string): NonNullable<ChartConfiguration['options']> {
  return {
    ...baseOptions(),
    scales: {
      x: { type: 'linear', ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 12 }, grid: { display: false } },
      y: { title: { display: true, text: yTitle } },
    },
    plugins: { ...baseOptions().plugins, zoom: zoomOptions() },
  }
}

function withRange(cfg: ChartConfiguration, ptsForExtent: Pt[][]): RangeConfig {
  const xs = ptsForExtent.flat().map((p) => p.x)
  const out = cfg as RangeConfig
  out._xmin = xs.length ? Math.min(...xs) : 0
  out._xmax = xs.length ? Math.max(...xs) : 0
  return out
}

export function VolumeCharts({ ctx, years }: { ctx: BenchCtx; years: number }) {
  const cal = turnoverCal(ctx)
  if (cal.length < 2) {
    return <p className="py-8 text-center text-[12px] text-subtle">No turnover history loaded yet.</p>
  }

  return (
    <>
      <TimeSeriesChart
        deps={[ctx, years]}
        height={210}
        build={() => {
          const v = volumeSeries(ctx, startFrom(cal, years))!
          return withRange(
            {
              type: 'line',
              data: {
                datasets: [
                  { label: 'REITs basket', data: v.rawBasket, borderColor: CHART.acc, borderWidth: 1.5, pointRadius: 0 },
                  { label: 'NIFTY 50', data: v.rawN50, borderColor: CHART.gold, borderWidth: 1.3, pointRadius: 0 },
                  { label: 'NIFTY REALTY', data: v.rawNRE, borderColor: CHART.red, borderWidth: 1.3, pointRadius: 0 },
                  {
                    label: 'Embassy block deal',
                    data: v.blockPt,
                    pointStyle: 'triangle',
                    pointRadius: 8,
                    pointBackgroundColor: CHART.gold,
                    borderWidth: 0,
                    showLine: false,
                  },
                ],
              },
              options: {
                ...timeAxis('VOL INDEX'),
                plugins: {
                  ...timeAxis('VOL INDEX').plugins,
                  tooltip: {
                    callbacks: {
                      title: (it) => (it[0] ? fmtDay(it[0].parsed.x as number) : ''),
                      afterBody: (items) =>
                        items.some((i) => i.dataset.label === 'Embassy block deal')
                          ? 'PPFAS bought ~5.63 cr units (~6%) at ₹420\nfrom exiting Capital Group funds'
                          : '',
                    },
                  },
                },
              },
            },
            [v.rawBasket, v.rawN50, v.rawNRE],
          )
        }}
      />
      <p className="mt-3 mb-1 text-[11.5px] text-muted">20-day moving average</p>
      <TimeSeriesChart
        deps={[ctx, years]}
        height={210}
        caption={ZOOM_HINT}
        build={() => {
          const v = volumeSeries(ctx, startFrom(cal, years))!
          return withRange(
            {
              type: 'line',
              data: {
                datasets: [
                  { label: 'REITs basket (20d MA)', data: v.maBasket, borderColor: CHART.acc, borderWidth: 1.8, pointRadius: 0 },
                  { label: 'NIFTY 50 (20d MA)', data: v.maN50, borderColor: CHART.gold, borderWidth: 1.5, pointRadius: 0 },
                  { label: 'NIFTY REALTY (20d MA)', data: v.maNRE, borderColor: CHART.red, borderWidth: 1.5, pointRadius: 0 },
                ],
              },
              options: timeAxis('20d MA'),
            },
            [v.maBasket, v.maN50, v.maNRE],
          )
        }}
      />
    </>
  )
}
