/**
 * Distributions vs FD hurdle (v1 c_dist): total distributions paid per FY (₹ cr,
 * stacked by REIT) with the combined trailing distribution yield vs the SBI 1-yr
 * FD rate and a flat 7% p.a. FD on a second axis. Category axis, no zoom.
 */
import type { ChartConfiguration } from 'chart.js'
import type { ReitData } from '../../types/data'
import { type BenchCtx, KEY, PALETTE, REIT_SECS, SHORTNM } from '../../lib/bench'
import { useChartCanvas } from '../charts/useChartCanvas'

const FYS = ['FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025', 'FY2026']

export function DistributionChart({ ctx, D }: { ctx: BenchCtx; D: ReitData }) {
  const { canvasRef } = useChartCanvas(() => build(ctx, D), [ctx, D])
  return (
    <div className="relative h-[320px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function build(ctx: BenchCtx, D: ReitData): ChartConfiguration {
  const datasets: NonNullable<ChartConfiguration['data']>['datasets'] = []
  // one stacked bar series per REIT
  for (const sec of REIT_SECS) {
    const f = D.fin[KEY[sec]]
    datasets.push({
      type: 'bar',
      label: SHORTNM[sec] || sec,
      stack: 'd',
      yAxisID: 'y',
      order: 5,
      backgroundColor: PALETTE[sec],
      data: FYS.map((fy) => {
        const i = f.years.indexOf(fy)
        return i >= 0 ? f.dist_total[i] : null
      }),
    })
  }
  // combined trailing distribution yield (%)
  const yieldLine = FYS.map((fy) => {
    let dist = 0
    let mcap = 0
    for (const sec of REIT_SECS) {
      const f = D.fin[KEY[sec]]
      const i = f.years.indexOf(fy)
      if (i < 0) continue
      const dt = f.dist_total[i]
      const px = f.price_eoy[i]
      const un = f.units_mn[i]
      if (dt != null && px != null && un != null) {
        dist += dt
        mcap += (px * un) / 10
      }
    }
    return mcap ? +((dist / mcap) * 100).toFixed(2) : null
  })
  // SBI 1-yr FD rate at each FY end
  const fdLine = FYS.map((fy) => {
    const d = '20' + fy.slice(4) + '-03-31'
    let r = ctx.fdSteps[0][1]
    for (const [sd, sr] of ctx.fdSteps) {
      if (sd <= d) r = sr
      else break
    }
    return r
  })
  datasets.push(
    { type: 'line', label: 'Combined distribution yield %', data: yieldLine, borderColor: '#e8eef4', borderWidth: 2.4, pointRadius: 3, yAxisID: 'y2', order: 0 },
    { type: 'line', label: 'SBI 1-yr FD %', data: fdLine, borderColor: '#93a1b3', borderDash: [5, 4], borderWidth: 1.6, pointRadius: 0, yAxisID: 'y2', order: 0 },
    { type: 'line', label: 'FD @ 7% p.a.', data: FYS.map(() => 7), borderColor: '#7fd4c8', borderDash: [2, 3], borderWidth: 1.6, pointRadius: 0, yAxisID: 'y2', order: 0 },
  )
  return {
    type: 'bar',
    data: { labels: FYS, datasets },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 12 } } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, title: { display: true, text: '₹ cr paid' } },
        y2: { position: 'right', grid: { drawOnChartArea: false }, min: 0, title: { display: true, text: '%' } },
      },
    },
  }
}
