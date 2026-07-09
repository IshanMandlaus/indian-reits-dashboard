/**
 * Country pie with a per-country slice drilldown (v1 c_mcap / c_aum). Clicking a
 * country slice drills into its breakdown; a "← Back" control returns.
 *
 * Slice hit-testing goes through `chart.getElementsAtEventForMode` on a real DOM
 * click rather than Chart.js `options.onClick`, which the domestic §6 drilldown
 * found fires unreliably in this setup.
 */
import { useState } from 'react'
import type { ChartConfiguration, TooltipItem } from 'chart.js'
import { useChartCanvas } from '../charts/useChartCanvas'
import { fmtUSD, type Drill, type PieSlice } from '../../lib/global'

export function PieDrilldown({
  slices,
  worldTotal,
  tooltipSuffix,
  drill,
}: {
  slices: (PieSlice & { key: string })[]
  worldTotal: number
  /** Extra text after "$X bn" in the country-level tooltip, e.g. " gross assets". */
  tooltipSuffix?: string
  drill: (key: string) => Drill
}) {
  const [drillKey, setDrillKey] = useState<string | null>(null)
  const view = drillKey ? drill(drillKey) : null

  const { canvasRef, chartRef } = useChartCanvas(
    () => (view ? buildPie(view.slices, view.total, view.title, '') : buildPie(slices, worldTotal, null, tooltipSuffix || '')),
    [slices, drillKey],
  )

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drillKey) return
    const els = chartRef.current?.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, false)
    if (els && els.length) setDrillKey(slices[els[0].index].key)
  }

  return (
    <>
      <div className="mb-1 h-5">
        {drillKey && (
          <button
            onClick={() => setDrillKey(null)}
            className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
          >
            ← Back to countries
          </button>
        )}
      </div>
      <div className="relative h-[330px]">
        <canvas
          ref={canvasRef}
          onClick={onClick}
          className={drillKey ? '' : 'cursor-pointer'}
        />
      </div>
    </>
  )
}

function buildPie(slices: PieSlice[], total: number, title: string | null, suffix: string): ChartConfiguration {
  return {
    type: 'pie',
    data: {
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => s.color),
          borderColor: '#0a0e14',
          borderWidth: 2,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 10.5 } } },
        title: title
          ? { display: true, text: title, color: '#e8eef4', font: { size: 12, weight: 600 } }
          : { display: false },
        tooltip: {
          callbacks: {
            label: (c: TooltipItem<'pie'>) => {
              const v = c.parsed
              return ` $${fmtUSD(v, 0)} bn${suffix} (${((v / total) * 100).toFixed(1)}%)`
            },
          },
        },
      },
    },
  }
}
