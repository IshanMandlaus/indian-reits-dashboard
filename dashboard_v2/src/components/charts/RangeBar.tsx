/**
 * 6M / 1Y / 3Y / 5Y / All range selector for the time-axis charts (1 & 2).
 * Drives the bound chart's x-window and re-fits the y-axis (ported from v1
 * `wireRangeBars`). Remount via `key={reitKey}` to reset to "All" per REIT.
 */
import { useState } from 'react'
import type { RefObject } from 'react'
import { rescaleY, type ChartWithRange } from '../../lib/chartSetup'

const RANGES = ['6M', '1Y', '3Y', '5Y', 'All'] as const
const MONTHS: Record<string, number> = { '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 }
const DAY = 864e5

export function RangeBar({ chartRef }: { chartRef: RefObject<ChartWithRange | null> }) {
  const [active, setActive] = useState<string>('All')

  const apply = (lbl: string) => {
    setActive(lbl)
    const ch = chartRef.current
    if (!ch) return
    const x = ch.options.scales!.x as { min?: number; max?: number }
    if (lbl === 'All') {
      x.min = ch._xmin
      x.max = ch._xmax
    } else {
      const months = MONTHS[lbl]
      x.max = ch._xmax
      x.min = Math.max(ch._xmin ?? -Infinity, (ch._xmax ?? 0) - months * 30.44 * DAY)
    }
    rescaleY(ch)
    ch.update()
  }

  return (
    <span className="inline-flex gap-0.5">
      {RANGES.map((lbl) => (
        <button
          key={lbl}
          onClick={() => apply(lbl)}
          className={[
            'rounded px-1.5 py-0.5 text-[10.5px] font-medium tnum transition',
            active === lbl ? 'bg-accent/15 text-accent' : 'text-subtle hover:text-ink',
          ].join(' ')}
        >
          {lbl}
        </button>
      ))}
    </span>
  )
}
