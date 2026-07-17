/**
 * Chart 3c — occupancy & WALE by fiscal year. Lines = committed occupancy
 * (solid) and in-place/physical occupancy (dashed) on the left % axis;
 * WALE (years) on the right axis. Data from lease.json (workbook rows 45-47,
 * page-cited in the audit citations).
 */
import type { Lease, ReitKey } from '../../types/data'
import { CHART, baseOptions, EXPORT_STATE, labelFont, haloText } from '../../lib/chartSetup'
import { LabelPlacer } from '../../lib/barValueLabels'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'

export function Chart3cOccWale({ L, k }: { L: Lease; k: ReitKey }) {
  const { canvasRef } = useChartCanvas(() => build(L, k), [L, k])
  if (!L.reits[k])
    return (
      <div className="flex h-[240px] items-center justify-center text-[12.5px] text-subtle">
        No occupancy / WALE disclosure available.
      </div>
    )
  return (
    <>
      <div className="relative h-[240px]">
        <canvas ref={canvasRef} />
      </div>
      {L.reits[k].occ_note && <p className="mt-1.5 text-[10.5px] text-subtle">{L.reits[k].occ_note}.</p>}
    </>
  )
}

/** Export-only value labels on every line point, one shared placer. */
const exportValueLabels: Plugin = {
  id: 'occWaleExportLabels',
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
      // occupancy series label above the point, WALE below — keeps rows apart
      const dir: -1 | 1 = di === 2 ? 1 : -1
      const isPct = di !== 2
      meta.data.forEach((el, i) => {
        const v = ds.data[i]
        if (typeof v !== 'number') return
        const p = el as unknown as { x: number; y: number }
        const text = isPct ? v.toFixed(1) + '%' : v.toFixed(1)
        const tw = ctx.measureText(text).width
        const top = placer.place(p.x - tw / 2, dir === -1 ? p.y - 6 - fontPx : p.y + 6, tw, fontPx, dir)
        haloText(ctx, text, p.x, top, Chart.defaults.color as string)
      })
    })
    ctx.restore()
  },
}

const EMPTY = { wale: [], occ_committed: [], occ_inplace: [], activity: [], ladder: null, gaps: [] }

function build(L: Lease, k: ReitKey): ChartConfiguration {
  const r = L.reits[k] ?? EMPTY
  // Trim to years where anything is disclosed.
  const idx = L.years.map((_, i) => i).filter((i) => r.wale[i] != null || r.occ_committed[i] != null || r.occ_inplace[i] != null)
  const labels = idx.map((i) => L.years[i].replace('20', ''))
  const toPct = (a: (number | null)[]) => idx.map((i) => (a[i] == null ? null : 100 * (a[i] as number)))

  return {
    type: 'line',
    plugins: [exportValueLabels],
    data: {
      labels,
      datasets: [
        {
          label: 'Committed occupancy (%)',
          data: toPct(r.occ_committed),
          borderColor: CHART.acc,
          backgroundColor: CHART.acc,
          yAxisID: 'y',
          spanGaps: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'In-place occupancy (%)',
          data: toPct(r.occ_inplace),
          borderColor: CHART.violet,
          backgroundColor: CHART.violet,
          borderDash: [5, 4],
          yAxisID: 'y',
          spanGaps: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'WALE (yrs)',
          data: idx.map((i) => r.wale[i]),
          borderColor: CHART.gold,
          backgroundColor: CHART.gold,
          yAxisID: 'y1',
          spanGaps: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { grid: { display: false } },
        y: { title: { display: true, text: 'Occupancy %' }, grace: '8%' },
        y1: { position: 'right', title: { display: true, text: 'WALE (yrs)' }, grid: { display: false }, grace: '15%' },
      },
      plugins: {
        ...baseOptions().plugins,
        tooltip: {
          callbacks: {
            label: (it) => {
              const v = it.parsed.y
              if (v == null) return ''
              return it.dataset.label?.startsWith('WALE') ? `WALE: ${v.toFixed(1)} yrs` : `${it.dataset.label}: ${v.toFixed(1)}%`
            },
          },
        },
      },
    },
  }
}
