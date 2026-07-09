/** Chart 3 — Fair value (GAV) vs Book value (RE assets) grouped bars by FY. */
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions } from '../../lib/chartSetup'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import type { ChartConfiguration } from 'chart.js'

export function Chart3FvBv({ D, k }: { D: ReitData; k: ReitKey }) {
  const { canvasRef } = useChartCanvas(() => build(D, k), [D, k])
  return (
    <div className="relative h-[260px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function build(D: ReitData, k: ReitKey): ChartConfiguration {
  const f = D.fin[k]
  const bv = D.bv[k] || {}
  const yrs = f.years.filter((y, i) => f.gav[i] != null || bv[y])
  const fv = yrs.map((y) => f.gav[f.years.indexOf(y)])
  const b = yrs.map((y) => {
    const r = bv[y]
    if (!r) return null
    return Math.round(((r.inv_prop || 0) + (r.ipud || 0) + (r.ppe || 0) + (r.cwip || 0)) * 10) / 10
  })
  return {
    type: 'bar',
    data: {
      labels: yrs.map((y) => y.replace('20', '')),
      datasets: [
        { label: 'Fair value (GAV)', data: fv, backgroundColor: CHART.acc },
        { label: 'Book value (RE assets)', data: b, backgroundColor: 'rgba(147,160,184,.55)' },
      ],
    },
    options: {
      ...baseOptions(),
      scales: { x: { grid: { display: false } }, y: { title: { display: true, text: '₹ crore' } } },
      plugins: {
        ...baseOptions().plugins,
        tooltip: { callbacks: { label: (it) => it.dataset.label + ': ' + inr(it.parsed.y) + ' cr' } },
      },
    },
  }
}
