/**
 * Chart 3b — AUM vs leasable area, year by year. Bars = GAV/AUM (₹cr, left
 * axis); lines = total leasable area and operational/completed area (msf,
 * right axis). AUM from fin.gav; msf series extracted from
 * Indian_REITs_Key_Financials_FILLED (fin.msf_total / fin.msf_op).
 */
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions, EXPORT_STATE, labelFont, haloText } from '../../lib/chartSetup'
import { fmtCrLabel, LabelPlacer } from '../../lib/barValueLabels'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'

export function Chart3cAumMsf({ D, k }: { D: ReitData; k: ReitKey }) {
  const { canvasRef } = useChartCanvas(() => build(D, k), [D, k])
  return (
    <div className="relative h-[240px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

/**
 * Export-only value labels for ALL series here — AUM bars and both msf lines —
 * drawn by one plugin so a single LabelPlacer sees every label and none overlap
 * (the global bar plugin is opted out; two independent placers can't avoid each
 * other, verified on Embassy: "52.5" over "69.9k cr" at FY26).
 * Line points get their msf value (total above the point, operational below);
 * bars get the ₹cr value above the bar top.
 */
const exportValueLabels: Plugin = {
  id: 'exportValueLabels',
  afterDatasetsDraw(ch) {
    if (!EXPORT_STATE.active) return
    const ctx = ch.ctx
    const fontPx = Math.round(10 * EXPORT_STATE.fontScale)
    const placer = new LabelPlacer()
    ctx.save()
    ctx.font = labelFont()
    ctx.fillStyle = Chart.defaults.color as string // black under the export re-theme
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const draw = (text: string, x: number, prefTop: number, dir: -1 | 1) => {
      const tw = ctx.measureText(text).width
      const cx = Math.min(Math.max(x, tw / 2 + 1), ch.width - tw / 2 - 1)
      const top = placer.place(cx - tw / 2, prefTop, tw, fontPx, dir)
      haloText(ctx, text, cx, top, Chart.defaults.color as string)
    }
    // line labels first — they hug their points; the bar label then steps
    // around them if the line passes near the bar top
    ch.data.datasets.forEach((ds, di) => {
      const meta = ch.getDatasetMeta(di)
      if (meta.type !== 'line' || meta.hidden || !ch.isDatasetVisible(di)) return
      // total line labels above the point, operational line below — keeps the
      // two rows apart even where the series overlap
      const dir: -1 | 1 = di === 1 ? -1 : 1
      meta.data.forEach((el, i) => {
        const v = ds.data[i]
        if (typeof v !== 'number') return
        const p = el as unknown as { x: number; y: number }
        draw(v.toFixed(1), p.x, dir === -1 ? p.y - 6 - fontPx : p.y + 6, dir)
      })
    })
    ch.data.datasets.forEach((ds, di) => {
      const meta = ch.getDatasetMeta(di)
      if (meta.type !== 'bar' || meta.hidden || !ch.isDatasetVisible(di)) return
      meta.data.forEach((el, i) => {
        const v = ds.data[i]
        if (typeof v !== 'number') return
        const p = el as unknown as { x: number; y: number }
        draw(fmtCrLabel(v), p.x, p.y - 4 - fontPx, -1)
      })
    })
    ctx.restore()
  },
}

function build(D: ReitData, k: ReitKey): ChartConfiguration {
  const f = D.fin[k]
  const idx = f.years
    .map((_, i) => i)
    .filter((i) => f.gav[i] != null || f.msf_total[i] != null)
  const labels = idx.map((i) => f.years[i].replace('20', ''))
  const gav = idx.map((i) => f.gav[i])
  const total = idx.map((i) => f.msf_total[i])
  const op = idx.map((i) => f.msf_op[i])

  return {
    type: 'bar',
    plugins: [exportValueLabels], // export-only values on bars + line points (one placer)
    data: {
      labels,
      datasets: [
        {
          label: 'AUM / GAV (₹ cr)',
          data: gav,
          backgroundColor: 'rgba(45,212,191,.75)',
          yAxisID: 'y',
          order: 2,
          maxBarThickness: 56,
        },
        {
          type: 'line',
          label: 'Total leasable area (msf)',
          data: total,
          borderColor: CHART.gold,
          backgroundColor: CHART.gold,
          yAxisID: 'y1',
          order: 1,
          tension: 0.3,
          spanGaps: true,
          pointRadius: 3,
        },
        {
          type: 'line',
          label: 'Operational area (msf)',
          data: op,
          borderColor: CHART.violet,
          backgroundColor: CHART.violet,
          borderDash: [5, 4],
          yAxisID: 'y1',
          order: 1,
          tension: 0.3,
          spanGaps: true,
          pointRadius: 3,
        },
      ],
    },
    options: {
      ...baseOptions(),
      layout: { padding: { top: 12 } }, // headroom for export labels above top-most points
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grace: '12%', title: { display: true, text: '₹ crore (AUM)' } },
        y1: {
          beginAtZero: true,
          grace: '12%',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'msf' },
        },
      },
      plugins: {
        ...baseOptions().plugins,
        barValueLabels: { display: false }, // exportValueLabels owns all labels here
        tooltip: {
          callbacks: {
            label: (it) =>
              it.dataset.yAxisID === 'y'
                ? ' AUM: ' + inr(it.parsed.y) + ' cr'
                : ' ' + it.dataset.label + ': ' + it.parsed.y + ' msf',
          },
        },
      },
    },
  }
}
