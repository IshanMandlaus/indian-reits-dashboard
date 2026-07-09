/**
 * Chart 4 — distributable cash vs top line. FY mode: stacked rental+maintenance
 * income vs NDCF. Quarterly mode (when quarterly filings exist): revenue from
 * operations · PAT · NDCF per quarter. Ported from v1 chart4()/drawC4().
 */
import { useState } from 'react'
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions } from '../../lib/chartSetup'
import { inr } from '../../lib/format'
import { useChartCanvas } from './useChartCanvas'
import type { ChartConfiguration } from 'chart.js'

export function Chart4Ndcf({ D, k }: { D: ReitData; k: ReitKey }) {
  const f = D.fin[k]
  const hasQ = (f.q || []).some((x) => x.ndcf != null || x.rev != null)
  const [mode, setMode] = useState<'fy' | 'q'>('fy')
  const eff = hasQ ? mode : 'fy'
  const { canvasRef } = useChartCanvas(() => build(D, k, eff), [D, k, eff])

  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-muted">{note(D, k, eff)}</p>
        {hasQ && (
          <button
            onClick={() => setMode(mode === 'fy' ? 'q' : 'fy')}
            className="shrink-0 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            {mode === 'fy' ? 'switch to quarterly' : 'switch to FY'}
          </button>
        )}
      </div>
      <div className="relative h-[240px]">
        <canvas ref={canvasRef} />
      </div>
    </>
  )
}

function note(D: ReitData, k: ReitKey, mode: 'fy' | 'q'): string {
  const f = D.fin[k]
  if (mode === 'q') {
    const qs = (f.q || []).filter((x) => x.ndcf != null || x.rev_ops != null || x.rev != null || x.pat != null)
    const patMissing = qs.some((x) => x.pat == null)
    return (
      'Quarterly: revenue from operations · PAT (profit after tax) · NDCF per quarter, consolidated' +
      (patMissing ? ' — some PAT bars blank where the filing was a scan' : '') +
      '.'
    )
  }
  const rr = f.rev_rental || []
  const rm = f.rev_maint || []
  const ix = (y: string) => f.years.indexOf(y)
  const hasRev = (y: string) => rr[ix(y)] != null || rm[ix(y)] != null
  const dropped = f.years.filter((y, i) => f.ndcf[i] != null && !hasRev(y))
  return (
    'FY: rental + maintenance income (FS revenue note) vs NDCF. Toggle for quarterly (revenue from ops + PAT).' +
    (dropped.length ? ' ' + dropped.join(', ') + ' omitted — annual revenue breakdown not yet available in filings.' : '')
  )
}

function build(D: ReitData, k: ReitKey, mode: 'fy' | 'q'): ChartConfiguration {
  const f = D.fin[k]
  if (mode === 'q' && (f.q || []).length) {
    const qs = f.q.filter((x) => x.ndcf != null || x.rev_ops != null || x.rev != null || x.pat != null)
    return {
      type: 'bar',
      data: {
        labels: qs.map((x) => x.q),
        datasets: [
          { label: 'Revenue from operations (qtr)', data: qs.map((x) => x.rev_ops ?? x.rev), backgroundColor: 'rgba(45,181,181,.85)' },
          { label: 'PAT — profit after tax (qtr)', data: qs.map((x) => x.pat), backgroundColor: 'rgba(96,165,250,.85)' },
          { label: 'NDCF (qtr)', data: qs.map((x) => x.ndcf), backgroundColor: CHART.grn },
        ],
      },
      options: {
        ...baseOptions(),
        scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 14 } }, y: { title: { display: true, text: '₹ crore' } } },
        plugins: {
          ...baseOptions().plugins,
          tooltip: {
            callbacks: {
              label: (it) => (it.parsed.y != null ? it.dataset.label + ': ' + inr(it.parsed.y) + ' cr' : ''),
              footer: (its) => {
                const x = qs[its[0].dataIndex]
                const bits: string[] = []
                if (x.pat == null) bits.push('PAT not extractable from this quarter’s filing (scanned)')
                else if (x.pat < 0) bits.push('note: PAT negative — one-off deferred-tax / MAT charge this quarter')
                if (x.rev_ops == null && x.rev != null) bits.push('revenue = stored quarterly total')
                return bits.join('\n')
              },
            },
          },
        },
      },
    }
  }
  const rr = f.rev_rental || []
  const rm = f.rev_maint || []
  const ix = (y: string) => f.years.indexOf(y)
  const hasRev = (y: string) => rr[ix(y)] != null || rm[ix(y)] != null
  const yrs = f.years.filter((y) => hasRev(y))
  return {
    type: 'bar',
    data: {
      labels: yrs.map((y) => y.replace('20', '')),
      datasets: [
        { label: 'Rental income', data: yrs.map((y) => rr[ix(y)]), backgroundColor: 'rgba(45,181,181,.8)', stack: 'rev' },
        { label: 'Maintenance income', data: yrs.map((y) => rm[ix(y)]), backgroundColor: 'rgba(45,181,181,.35)', stack: 'rev' },
        { label: 'NDCF', data: yrs.map((y) => f.ndcf[ix(y)]), backgroundColor: CHART.grn, stack: 'ndcf' },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, title: { display: true, text: '₹ crore' } },
      },
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          callbacks: {
            label: (it) => it.dataset.label + ': ' + inr(it.parsed.y) + ' cr',
            footer: (its) => {
              const y = yrs[its[0].dataIndex]
              const i = ix(y)
              return rr[i] != null && rm[i] != null ? 'Rental+Maint total: ' + inr((rr[i] || 0) + (rm[i] || 0)) + ' cr' : ''
            },
          },
        },
      },
    },
  }
}
