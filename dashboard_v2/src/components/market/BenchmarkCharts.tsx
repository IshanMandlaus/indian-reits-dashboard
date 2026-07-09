/**
 * The three range-aware benchmark charts (v1 c_levels / c_rebased / c_vets).
 * They recompute from the shared benchmark window (`years`) — rebasing and FD /
 * G-Sec indices re-anchor to the window start — so the window is controlled
 * externally and each renders through <TimeSeriesChart> (zoom/pan on, no own
 * range bar).
 */
import type { ChartConfiguration } from 'chart.js'
import { baseOptions, zoomOptions, CHART, type RangeConfig } from '../../lib/chartSetup'
import { fmtM, fmtDay } from '../../lib/reit'
import {
  type BenchCtx,
  type Pt,
  REIT_SECS,
  startFrom,
  secPts,
  combinedPts,
  rebase,
  fdPts,
  fdFlatPts,
  gsecPts,
} from '../../lib/bench'
import { TimeSeriesChart, ZOOM_HINT } from '../charts/TimeSeriesChart'

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
    data: { datasets: datasets.map((d) => ({ ...d, pointRadius: 0 })) },
    options: {
      ...baseOptions(),
      scales: {
        x: {
          type: 'linear',
          min: xmin,
          max: xmax,
          ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 14 },
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

export function BenchLevels({ ctx, years }: { ctx: BenchCtx; years: number }) {
  return (
    <TimeSeriesChart
      deps={[ctx, years]}
      height={360}
      caption={ZOOM_HINT}
      build={() => {
        const from = startFrom(ctx.CAL, years)
        return timeLineConfig(
          [
            { label: 'Listed REITs (combined)', data: combinedPts(ctx, REIT_SECS, from), borderColor: CHART.acc, borderWidth: 1.8 },
            { label: 'NIFTY REALTY', data: secPts(ctx, 'NIFTY REALTY', from), borderColor: CHART.red, borderWidth: 1.6 },
          ],
          'level / ₹ basket',
        ) as ChartConfiguration
      }}
    />
  )
}

export function BenchRebased({ ctx, years }: { ctx: BenchCtx; years: number }) {
  return (
    <TimeSeriesChart
      deps={[ctx, years]}
      height={360}
      caption={ZOOM_HINT}
      build={() => {
        const from = startFrom(ctx.CAL, years)
        const ds: DS[] = [
          { label: 'Listed REITs (combined)', data: rebase(combinedPts(ctx, REIT_SECS, from)), borderColor: CHART.acc, borderWidth: 2 },
          { label: 'NIFTY 50', data: rebase(secPts(ctx, 'NIFTY 50', from)), borderColor: CHART.gold, borderWidth: 1.6 },
          { label: 'NIFTY REALTY', data: rebase(secPts(ctx, 'NIFTY REALTY', from)), borderColor: CHART.red, borderWidth: 1.6 },
          { label: 'SBI 1-yr FD', data: fdPts(ctx, from), borderColor: CHART.mut, borderDash: [5, 4], borderWidth: 1.4 },
          { label: 'FD @ 7% p.a.', data: fdFlatPts(ctx, from, 7), borderColor: '#7fd4c8', borderDash: [2, 3], borderWidth: 1.4 },
          { label: 'GoI 10Y G-Sec (indicative)', data: gsecPts(ctx, from), borderColor: CHART.violet, borderDash: [6, 3], borderWidth: 1.5 },
        ]
        if (ctx.hasSensex) {
          ds.splice(2, 0, { label: 'SENSEX', data: rebase(secPts(ctx, 'SENSEX', from)), borderColor: '#c39bd3', borderWidth: 1.6 })
        }
        return timeLineConfig(ds, 'rebased = 100') as ChartConfiguration
      }}
    />
  )
}

export function BenchVets({ ctx, years }: { ctx: BenchCtx; years: number }) {
  return (
    <TimeSeriesChart
      deps={[ctx, years]}
      height={300}
      caption={ZOOM_HINT}
      build={() => {
        const from = startFrom(ctx.CAL, years)
        return timeLineConfig(
          [
            { label: 'REITs veterans (E+M+B+N)', data: rebase(combinedPts(ctx, ctx.veterans, from)), borderColor: CHART.acc, borderWidth: 2 },
            { label: 'NIFTY 50', data: rebase(secPts(ctx, 'NIFTY 50', from)), borderColor: CHART.gold, borderWidth: 1.6 },
          ],
          'rebased = 100',
        ) as ChartConfiguration
      }}
    />
  )
}
