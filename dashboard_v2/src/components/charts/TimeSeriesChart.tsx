/**
 * Reusable linear-time-axis chart: raw Chart.js canvas + optional range bar
 * (6M/1Y/3Y/5Y/All) + zoom/pan + y-rescale + double-click reset. Generalizes the
 * pattern the domestic charts 1 & 2 established (useChartCanvas + RangeBar +
 * rescaleY) so Market / InvITs / Global can reuse it.
 *
 * Pass a `build` closure returning a RangeConfig (linear x-axis, `{x,y}` datasets,
 * with `_xmin`/`_xmax` stashed on the config). Wheel/drag zoom is on by default;
 * enable the windowing range bar with `rangeBar`. When the window is controlled
 * externally (e.g. one shared range bar over several charts), leave `rangeBar`
 * off and recompute `build` via `deps`.
 */
import type { ReactNode } from 'react'
import type { ChartConfiguration } from 'chart.js'
import { rescaleY, type ChartWithRange } from '../../lib/chartSetup'
import { useChartCanvas } from './useChartCanvas'
import { RangeBar } from './RangeBar'

export function TimeSeriesChart({
  build,
  deps,
  height = 300,
  rangeBar = false,
  rangeResetKey,
  caption,
}: {
  build: () => ChartConfiguration
  deps: unknown[]
  height?: number
  rangeBar?: boolean
  /** Change to remount the range bar back to "All" (e.g. per active REIT/trust). */
  rangeResetKey?: string | number
  caption?: ReactNode
}) {
  const { canvasRef, chartRef } = useChartCanvas(build, deps)
  return (
    <>
      {rangeBar && (
        <div className="mb-2 flex justify-end">
          <RangeBar key={rangeResetKey} chartRef={chartRef} />
        </div>
      )}
      <div
        className="relative"
        style={{ height }}
        onDoubleClick={() => resetZoom(chartRef.current)}
      >
        <canvas ref={canvasRef} />
      </div>
      {caption && <p className="mt-1.5 text-[10.5px] text-subtle">{caption}</p>}
    </>
  )
}

/** Default help caption for a fully-interactive (zoom + pan) chart. */
export const ZOOM_HINT = 'scroll = zoom · shift-drag = box zoom · ctrl-drag = pan · double-click = reset'

function resetZoom(ch: ChartWithRange | null) {
  if (!ch) return
  ch.resetZoom?.()
  const x = ch.options.scales?.x as { min?: number; max?: number } | undefined
  if (x) {
    x.min = ch._xmin
    x.max = ch._xmax
  }
  rescaleY(ch)
  ch.update()
}
