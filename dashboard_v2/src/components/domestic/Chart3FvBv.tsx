/**
 * Chart 3 — Fair value (GAV) vs Book value (RE assets) grouped bars by FY.
 * Complete pairs only: a year with only one leg reported (e.g. Bagmane FY23–25 —
 * book value filed but no valuer GAV) is omitted rather than drawn lopsided.
 */
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions } from '../../lib/chartSetup'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import type { ChartConfiguration } from 'chart.js'

const bvTotal = (D: ReitData, k: ReitKey, y: string): number | null => {
  const r = (D.bv[k] || {})[y]
  if (!r) return null
  return Math.round(((r.inv_prop || 0) + (r.ipud || 0) + (r.ppe || 0) + (r.cwip || 0)) * 10) / 10
}

const pairYears = (D: ReitData, k: ReitKey): string[] =>
  D.fin[k].years.filter((y, i) => D.fin[k].gav[i] != null && bvTotal(D, k, y) != null)

export function Chart3FvBv({ D, k }: { D: ReitData; k: ReitKey }) {
  const { canvasRef } = useChartCanvas(() => build(D, k), [D, k])
  const f = D.fin[k]
  const kept = new Set(pairYears(D, k))
  const omitted = f.years.filter(
    (y, i) => !kept.has(y) && (f.gav[i] != null || bvTotal(D, k, y) != null),
  )
  return (
    <>
      {omitted.length > 0 && (
        <p className="mb-2 text-[11px] leading-relaxed text-muted">
          {omitted.join(', ')} omitted — only one of fair value / book value reported for that year.
        </p>
      )}
      <div className="relative h-[260px]">
        <canvas ref={canvasRef} />
      </div>
    </>
  )
}

function build(D: ReitData, k: ReitKey): ChartConfiguration {
  const f = D.fin[k]
  const yrs = pairYears(D, k)
  const fv = yrs.map((y) => f.gav[f.years.indexOf(y)])
  const b = yrs.map((y) => bvTotal(D, k, y))
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
