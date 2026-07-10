/**
 * Landing hero for the Global page (the app's "/" route): the interactive 3D
 * REIT globe, centered and boundless — no card chrome, no headline copy; just
 * the globe with a one-line data/interaction note beneath it.
 *
 * Owns the React.lazy import of ReitGlobe so three.js/globe.gl stay in their
 * own async chunk (only fetched on /).
 */
import { lazy, Suspense } from 'react'
import type { GlobePoint } from '../../lib/globe'

const ReitGlobe = lazy(() =>
  import('./ReitGlobe').then((m) => ({ default: m.ReitGlobe })),
)

// Shared by the globe and its Suspense fallback so swapping them causes no layout shift.
const GLOBE_H = 'h-[380px] sm:h-[480px] lg:h-[600px]'

interface Props {
  points: GlobePoint[]
  liveAsof: string | null
  estAsof: string | null
  onPick: (ckey: string, ri: number) => void
}

export function GlobeHero({ points, liveAsof, estAsof, onPick }: Props) {
  // -mt-6 cancels <main>'s py-6 top padding so the globe starts right under the nav.
  return (
    <section className="-mt-6 mb-3">
      <Suspense fallback={<div className={`${GLOBE_H} w-full animate-pulse rounded-lg bg-surface-2`} />}>
        <ReitGlobe points={points} onPick={onPick} className={GLOBE_H} />
      </Suspense>
      <p className="mt-2 text-center text-[11.5px] text-subtle">
        {liveAsof
          ? 'Live quotes as of ' +
            liveAsof +
            ' (Yahoo Finance) · drag to spin, scroll to zoom, click a marker for the full chart and metrics'
          : 'Estimates as of ' +
            (estAsof ?? '—') +
            ' · hit ⟳ Refresh data for live prices · drag to spin, scroll to zoom, click a marker for detail'}
      </p>
    </section>
  )
}
