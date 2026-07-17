/**
 * Chart 3d — lease expiries & renewals. Two views behind a toggle:
 *  - history: per-FY leasing activity — area expired vs renewed/re-leased vs
 *    newly leased (msf), grouped bars.
 *  - ladder: latest-disclosed forward lease-expiry schedule (unit varies by
 *    issuer — % of leased area / % of GLA / msf / % of rent).
 * Data from lease.json (extracted from issuer decks & annual reports with
 * per-value page citations; see the audit addendum).
 */
import { useState } from 'react'
import type { Lease, LeaseReit, ReitKey } from '../../types/data'
import { baseOptions, EXPORT_STATE, labelFont, haloText } from '../../lib/chartSetup'
import { LabelPlacer } from '../../lib/barValueLabels'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'

type View = 'history' | 'ladder'

const LADDER_UNIT: Record<string, string> = {
  pct_leased_area: '% of leased area',
  pct_gla: '% of GLA',
  msf: 'msf',
  pct_rent: '% of gross rent',
}

const EMPTY: LeaseReit = { wale: [], occ_committed: [], occ_inplace: [], activity: [], ladder: null, gaps: [] }

export function Chart3dLeasing({ L, k }: { L: Lease; k: ReitKey }) {
  const r = L.reits[k] ?? EMPTY
  const hasHistory = r.activity.some((a) => a.expired_msf != null || a.renewed_msf != null || a.new_msf != null)
  const hasLadder = !!r.ladder?.buckets.length
  const [view, setView] = useState<View>('history')
  const [lastK, setLastK] = useState(k)
  if (lastK !== k) {
    setLastK(k)
    setView('history')
  }
  const eff: View = view === 'history' && !hasHistory && hasLadder ? 'ladder' : view
  const { canvasRef } = useChartCanvas(() => build(r, eff), [L, k, eff])

  if (!hasHistory && !hasLadder)
    return (
      <div className="flex h-[240px] items-center justify-center text-[12.5px] text-subtle">
        No leasing-activity or expiry-schedule disclosure available.
      </div>
    )

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        {hasHistory && hasLadder ? (
          <button
            onClick={() => setView(eff === 'history' ? 'ladder' : 'history')}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            {eff === 'history' ? 'switch to expiry schedule' : 'switch to activity history'}
          </button>
        ) : (
          <span />
        )}
        {eff === 'ladder' && r.ladder && <span className="text-[10.5px] text-subtle">as of {r.ladder.asof}</span>}
      </div>
      <div className="relative h-[240px]">
        <canvas ref={canvasRef} />
      </div>
      {r.gaps.length > 0 && eff === 'history' && (
        <p className="mt-1.5 text-[10.5px] text-subtle">Not disclosed: {r.gaps.join('; ')}.</p>
      )}
    </>
  )
}

/** Export-only value labels above each bar, one shared placer. */
const exportValueLabels: Plugin = {
  id: 'leasingExportLabels',
  afterDatasetsDraw(ch) {
    if (!EXPORT_STATE.active) return
    const ctx = ch.ctx
    const fontPx = Math.round(10 * EXPORT_STATE.fontScale)
    const placer = new LabelPlacer()
    ctx.save()
    ctx.font = labelFont()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ch.data.datasets.forEach((ds, di) => {
      const meta = ch.getDatasetMeta(di)
      if (meta.hidden || !ch.isDatasetVisible(di)) return
      meta.data.forEach((el, i) => {
        const v = ds.data[i]
        if (typeof v !== 'number') return
        const p = el as unknown as { x: number; y: number }
        const text = v.toFixed(1)
        const tw = ctx.measureText(text).width
        const top = placer.place(p.x - tw / 2, p.y - 4 - fontPx, tw, fontPx, -1)
        haloText(ctx, text, p.x, top, Chart.defaults.color as string)
      })
    })
    ctx.restore()
  },
}

function build(r: LeaseReit, view: View): ChartConfiguration {
  if (view === 'ladder' && r.ladder) {
    const lad = r.ladder
    const unit = LADDER_UNIT[lad.unit] || lad.unit
    return {
      type: 'bar',
      plugins: [exportValueLabels],
      data: {
        labels: lad.buckets.map((b) => b.fy.replace('20', '')),
        datasets: [
          {
            label: `Area expiring (${unit})`,
            data: lad.buckets.map((b) => b.v),
            backgroundColor: 'rgba(248,113,113,.7)',
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        ...baseOptions(),
        scales: {
          x: { grid: { display: false } },
          y: { title: { display: true, text: unit }, beginAtZero: true, grace: '10%' },
        },
        plugins: {
          ...baseOptions().plugins,
          barValueLabels: { display: false }, // exportValueLabels owns all labels here
        },
      },
    }
  }

  const act = r.activity.filter((a) => a.expired_msf != null || a.renewed_msf != null || a.new_msf != null)
  const labels = act.map((a) => a.fy.replace('20', ''))
  const hasNew = act.some((a) => a.new_msf != null)
  return {
    type: 'bar',
    plugins: [exportValueLabels],
    data: {
      labels,
      datasets: [
        {
          label: 'Expiries (msf)',
          data: act.map((a) => a.expired_msf),
          backgroundColor: 'rgba(248,113,113,.7)',
          maxBarThickness: 30,
        },
        {
          label: 'Renewed / re-leased (msf)',
          data: act.map((a) => a.renewed_msf),
          backgroundColor: 'rgba(52,211,153,.75)',
          maxBarThickness: 30,
        },
        ...(hasNew
          ? [
              {
                label: 'New leasing (msf)',
                data: act.map((a) => a.new_msf),
                backgroundColor: 'rgba(96,165,250,.7)',
                maxBarThickness: 30,
              },
            ]
          : []),
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { grid: { display: false } },
        y: { title: { display: true, text: 'msf' }, beginAtZero: true, grace: '10%' },
      },
      plugins: {
        ...baseOptions().plugins,
        barValueLabels: { display: false }, // exportValueLabels owns all labels here
        tooltip: {
          callbacks: {
            label: (it) => (it.parsed.y == null ? '' : `${it.dataset.label}: ${it.parsed.y.toFixed(2)} msf`),
            footer: (items) => {
              const src = act[items[0]?.dataIndex]?.src
              return src ? `Source: ${src}` : ''
            },
          },
        },
      },
    },
  }
}
