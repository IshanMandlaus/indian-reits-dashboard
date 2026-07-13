/**
 * Development-pipeline stacked bar (v1 c_area): completed vs under-construction vs
 * future-development area per REIT, ordered by total area. Category axis, no zoom.
 */
import type { ChartConfiguration } from 'chart.js'
import { CHART } from '../../lib/chartSetup'
import { type BenchCtx, SHORTNM } from '../../lib/bench'
import { useChartCanvas } from '../charts/useChartCanvas'

export function AreaChart({ ctx }: { ctx: BenchCtx }) {
  const { canvasRef } = useChartCanvas(() => build(ctx), [ctx])
  return (
    <div className="relative h-[300px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function build(ctx: BenchCtx): ChartConfiguration {
  const rows = [...ctx.overview].sort((a, b) => b.area_msf - a.area_msf)
  return {
    type: 'bar',
    data: {
      labels: rows.map((r) => SHORTNM[r.security] || r.name),
      datasets: [
        { label: 'Completed', data: rows.map((r) => r.completed_msf), backgroundColor: CHART.acc, stack: 'a' },
        { label: 'Under construction', data: rows.map((r) => r.uc_msf), backgroundColor: CHART.info, stack: 'a' },
        { label: 'Future development', data: rows.map((r) => r.future_msf), backgroundColor: CHART.mut, stack: 'a' },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 14 } } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, title: { display: true, text: 'msf' } },
      },
    },
  }
}
