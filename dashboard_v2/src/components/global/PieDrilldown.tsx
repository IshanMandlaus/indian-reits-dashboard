/**
 * Country pie with multi-level slice drilldown (v1 c_mcap / c_aum, extended). Clicking
 * a drillable slice pushes a level; the AUM pie now goes country → sector → REITs, the
 * mcap pie stays country → REITs. A "← Back" control pops one level.
 *
 * A slice is drillable when it carries a `key` AND `drill(path)` returns a view for the
 * resulting path. Slice hit-testing goes through `chart.getElementsAtEventForMode` on a
 * real DOM click rather than Chart.js `options.onClick`, which the domestic §6 drilldown
 * found fires unreliably in this setup.
 */
import { useState } from 'react'
import type { ChartConfiguration, TooltipItem } from 'chart.js'
import { useChartCanvas } from '../charts/useChartCanvas'
import { fmtUSD, type Drill, type DrillSlice } from '../../lib/global'

export function PieDrilldown({
  slices,
  worldTotal,
  tooltipSuffix,
  drill,
}: {
  slices: (DrillSlice & { key: string })[]
  worldTotal: number
  /** Extra text after "$X bn" in the country-level tooltip, e.g. " gross assets". */
  tooltipSuffix?: string
  /** Resolve the view at a click path (e.g. ["us"] or ["us","Retail"]); null = leaf. */
  drill: (path: string[]) => Drill | null
}) {
  const [path, setPath] = useState<string[]>([])
  const view: Drill | null = path.length ? drill(path) : null
  const current: DrillSlice[] = view ? view.slices : slices
  const total = view ? view.total : worldTotal

  const { canvasRef, chartRef } = useChartCanvas(
    () => buildPie(current, total, view ? view.title : null, view ? '' : tooltipSuffix || ''),
    [slices, path.join('/')],
  )

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const els = chartRef.current?.getElementsAtEventForMode(e.nativeEvent, 'nearest', { intersect: true }, false)
    if (!els || !els.length) return
    const slice = current[els[0].index]
    if (!slice?.key) return
    const next = [...path, slice.key]
    if (drill(next)) setPath(next) // only descend if the next level exists
  }

  const canDrill = current.some((s) => s.key)

  return (
    <>
      <div className="mb-1 flex h-5 items-center gap-2">
        {path.length > 0 && (
          <button
            onClick={() => setPath(path.slice(0, -1))}
            className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
          >
            ← Back
          </button>
        )}
        {path.length > 1 && (
          <button
            onClick={() => setPath([])}
            className="text-[12px] font-semibold text-subtle underline-offset-2 hover:underline"
          >
            countries
          </button>
        )}
      </div>
      <div className="relative h-[330px]">
        <canvas ref={canvasRef} onClick={onClick} className={canDrill ? 'cursor-pointer' : ''} />
      </div>
    </>
  )
}

function buildPie(slices: DrillSlice[], total: number, title: string | null, suffix: string): ChartConfiguration {
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
