/**
 * Chart 4b — distributions by fiscal year. Bars = total distribution paid
 * (₹ cr, left axis, fin.dist_total); line = distribution per unit
 * (₹/unit, right axis, fin.dpu).
 */
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions, EXPORT_STATE, labelFont, haloText } from '../../lib/chartSetup'
import { seriesInk } from '../../lib/svgExport'
import { fmtCrLabel, LabelPlacer } from '../../lib/barValueLabels'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'

export function Chart4bDistributions({ D, k }: { D: ReitData; k: ReitKey }) {
  const f = D.fin[k]
  const has = f.years.some((_, i) => (f.dist_total[i] || 0) > 0 || (f.dpu[i] || 0) > 0)
  const { canvasRef } = useChartCanvas(() => build(D, k), [D, k])
  if (!has)
    return (
      <div className="flex h-[240px] items-center justify-center text-[12.5px] text-subtle">
        No distributions yet (listed {D.meta[k].listed}).
      </div>
    )
  return (
    <div className="relative h-[240px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

/** Export-only value labels — ₹cr above bars, DPU at line points, one placer. */
const exportValueLabels: Plugin = {
  id: 'distExportLabels',
  afterDatasetsDraw(ch) {
    if (!EXPORT_STATE.active) return
    const ctx = ch.ctx
    const fontPx = Math.round(10 * EXPORT_STATE.fontScale)
    const placer = new LabelPlacer()
    ctx.save()
    ctx.font = labelFont()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const draw = (text: string, x: number, prefTop: number, dir: -1 | 1, color?: string) => {
      const tw = ctx.measureText(text).width
      const cx = Math.min(Math.max(x, tw / 2 + 1), ch.width - tw / 2 - 1)
      const top = placer.place(cx - tw / 2, prefTop, tw, fontPx, dir)
      haloText(ctx, text, cx, top, color ?? (Chart.defaults.color as string))
    }
    // DPU line first (hugs its points), bars step around it. DPU labels keep
    // the line's series colour (print-legible shade) so they read as the line's.
    ch.data.datasets.forEach((ds, di) => {
      const meta = ch.getDatasetMeta(di)
      if (meta.type !== 'line' || meta.hidden || !ch.isDatasetVisible(di)) return
      meta.data.forEach((el, i) => {
        const v = ds.data[i]
        if (typeof v !== 'number') return
        const p = el as unknown as { x: number; y: number }
        draw(v.toFixed(2), p.x, p.y - 6 - fontPx, -1, seriesInk(CHART.gold))
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
  const idx = f.years.map((_, i) => i).filter((i) => f.dist_total[i] != null || f.dpu[i] != null)
  const labels = idx.map((i) => f.years[i].replace('20', ''))

  return {
    type: 'bar',
    plugins: [exportValueLabels],
    data: {
      labels,
      datasets: [
        {
          label: 'Total distribution (₹ cr)',
          data: idx.map((i) => f.dist_total[i]),
          backgroundColor: 'rgba(45,212,191,.75)',
          yAxisID: 'y',
          order: 2,
          maxBarThickness: 56,
        },
        {
          type: 'line',
          label: 'DPU (₹/unit)',
          data: idx.map((i) => f.dpu[i]),
          borderColor: CHART.gold,
          backgroundColor: CHART.gold,
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
      scales: {
        x: { grid: { display: false } },
        y: { title: { display: true, text: '₹ cr' }, beginAtZero: true, grace: '10%' },
        y1: { position: 'right', title: { display: true, text: 'DPU ₹/unit' }, grid: { display: false }, beginAtZero: true, grace: '25%' },
      },
      plugins: {
        ...baseOptions().plugins,
        barValueLabels: { display: false }, // exportValueLabels owns all labels here
        tooltip: {
          callbacks: {
            label: (it) =>
              it.parsed.y == null
                ? ''
                : it.dataset.label?.startsWith('DPU')
                  ? `DPU: ${inr(it.parsed.y, 2)}`
                  : `Distribution: ${inr(it.parsed.y)} cr`,
          },
        },
      },
    },
  }
}
