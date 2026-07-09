/**
 * Chart 6 — capital structure. Doughnut of latest-FY debt vs equity; click the
 * chart to drill into the year-by-year debt/equity split, "back" returns to the
 * pie. Ported from v1 chart6().
 */
import { useState } from 'react'
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions } from '../../lib/chartSetup'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import type { ChartConfiguration } from 'chart.js'

export function Chart6Capital({ D, k }: { D: ReitData; k: ReitKey }) {
  const [view, setView] = useState<'pie' | 'bars'>('pie')
  // Reset to pie whenever the REIT changes.
  const [lastK, setLastK] = useState(k)
  if (lastK !== k) {
    setLastK(k)
    setView('pie')
  }
  const { canvasRef } = useChartCanvas(() => build(D, k, view, () => setView('bars')), [D, k, view])

  return (
    <>
      <div className="mb-2 flex h-6 items-center justify-between">
        {view === 'pie' ? (
          <span className="text-[10.5px] text-subtle">click the chart for the year-by-year split →</span>
        ) : (
          <span />
        )}
        {view === 'bars' && (
          <button
            onClick={() => setView('pie')}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            ← back to pie
          </button>
        )}
      </div>
      {/* Container-level click drives the pie→bars drilldown (more reliable and
          accessible than relying on Chart.js's canvas onClick). */}
      <div
        className={'relative h-[240px]' + (view === 'pie' ? ' cursor-pointer' : '')}
        onClick={view === 'pie' ? () => setView('bars') : undefined}
        role={view === 'pie' ? 'button' : undefined}
        tabIndex={view === 'pie' ? 0 : undefined}
        onKeyDown={view === 'pie' ? (e) => (e.key === 'Enter' || e.key === ' ') && setView('bars') : undefined}
        title={view === 'pie' ? 'Click for the year-by-year debt/equity split' : undefined}
      >
        <canvas ref={canvasRef} />
      </div>
    </>
  )
}

function build(D: ReitData, k: ReitKey, view: 'pie' | 'bars', drill: () => void): ChartConfiguration {
  const f = D.fin[k]
  let li = -1
  f.years.forEach((_, i) => {
    if (f.gross_debt[i] != null && f.networth[i] != null) li = i
  })

  if (view === 'pie') {
    const d = f.gross_debt[li]!
    const e = f.networth[li]!
    const t = d + e
    return {
      type: 'doughnut',
      data: {
        labels: [`Debt ${((100 * d) / t).toFixed(1)}%`, `Equity (net worth) ${((100 * e) / t).toFixed(1)}%`],
        datasets: [{ data: [d, e], backgroundColor: [CHART.red, CHART.acc], borderColor: '#111721', borderWidth: 3 }],
      },
      options: {
        maintainAspectRatio: false,
        onClick: () => drill(),
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: f.years[li] + ' — total capital ' + inr(t) + ' cr' },
          tooltip: { callbacks: { label: (it) => ' ' + inr(it.parsed as number) + ' cr' } },
        },
      },
    }
  }

  const yrs = f.years.filter((_, i) => f.gross_debt[i] != null && f.networth[i] != null)
  const dd = yrs.map((y) => {
    const i = f.years.indexOf(y)
    return +((100 * f.gross_debt[i]!) / (f.gross_debt[i]! + f.networth[i]!)).toFixed(1)
  })
  const ee = dd.map((v) => +(100 - v).toFixed(1))
  return {
    type: 'bar',
    data: {
      labels: yrs.map((y) => y.replace('20', '')),
      datasets: [
        { label: 'Debt % of capital', data: dd, backgroundColor: CHART.red, stack: 's' },
        { label: 'Equity % of capital', data: ee, backgroundColor: CHART.acc, stack: 's' },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, max: 100, title: { display: true, text: '%' } },
      },
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          callbacks: {
            label: (it) => {
              const i = f.years.indexOf(yrs[it.dataIndex])
              const abs = it.dataset.label!.startsWith('Debt') ? f.gross_debt[i] : f.networth[i]
              return it.dataset.label + ': ' + it.parsed.y + '% (' + inr(abs) + ' cr)'
            },
          },
        },
      },
    },
  }
}
