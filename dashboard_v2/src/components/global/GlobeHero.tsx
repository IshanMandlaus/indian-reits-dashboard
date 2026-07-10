/**
 * Landing hero for the Global page (the app's "/" route): a full-viewport,
 * pinned 3D REIT globe. On a fresh load the globe fills the viewport (minus the
 * nav) with the first card row peeking at the bottom; the section is sticky, so
 * scrolling brings the cards up OVER the globe while a scroll-scrubbed transform
 * recedes it (scale + dim, fully reversible); past the overlap it simply stays
 * pinned behind the scrolling content (which paints above via `relative z-10`).
 *
 * Owns the React.lazy import of ReitGlobe so three.js/globe.gl stay in their
 * own async chunk (only fetched on /).
 */
import { lazy, Suspense, useEffect, useRef } from 'react'
import type { GlobePoint } from '../../lib/globe'

const ReitGlobe = lazy(() =>
  import('./ReitGlobe').then((m) => ({ default: m.ReitGlobe })),
)

// Scroll-scrub targets at full overlap (p = 1): tune the feel here.
const SCRUB_SCALE = 0.12 // scale 1 → 0.88
const SCRUB_FADE = 0.55 // opacity 1 → 0.45

interface Props {
  points: GlobePoint[]
  liveAsof: string | null
  estAsof: string | null
  onPick: (ckey: string, ri: number) => void
}

export function GlobeHero({ points, liveAsof, estAsof, onPick }: Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const fxRef = useRef<HTMLDivElement>(null)

  // Scrub the globe's recede in lockstep with scroll: p = 0 at rest, 1 once the
  // cards have fully risen over the hero (they travel its height). rAF-throttled,
  // passive, and run once on mount so back-navigation restores the right state.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const fx = fxRef.current
        const section = sectionRef.current
        const range = section?.clientHeight
        if (!fx || !section || !range) return
        const p = Math.min(1, Math.max(0, window.scrollY / range))
        fx.style.transform = `scale(${1 - SCRUB_SCALE * p})`
        fx.style.opacity = String(1 - SCRUB_FADE * p)
        // The globe is interactive ONLY at the rest state (page at top, cards at
        // their peek spot). Once scrolled, its canvas bleeds behind the cards and
        // would hijack wheel/drag from the gaps between them — so switch the whole
        // pinned hero off for pointers until the user scrolls back up.
        section.style.pointerEvents = p > 0.02 ? 'none' : ''
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Heights: 61px = sticky nav (AppShell header py-3 + content + border); the
  // section pins right below it. 177px = nav + ~116px of card row peeking at the
  // bottom of a fresh load. -mt-6 cancels <main>'s top padding.
  return (
    <section
      ref={sectionRef}
      className="sticky top-[61px] z-0 -mt-6 mb-3 flex h-[calc(100svh-177px)] min-h-[420px] flex-col"
    >
      <div ref={fxRef} className="flex min-h-0 flex-1 flex-col will-change-transform">
        <Suspense fallback={<div className="min-h-0 flex-1 animate-pulse rounded-lg bg-surface-2" />}>
          <ReitGlobe points={points} onPick={onPick} className="min-h-0 flex-1" canvasClassName="h-[175%]" />
        </Suspense>
        <p className="relative z-10 mt-2 text-center text-[11.5px] text-subtle">
          {liveAsof
            ? 'Live quotes as of ' +
              liveAsof +
              ' (Yahoo Finance) · drag to spin, scroll to zoom, click a marker for the full chart and metrics'
            : 'Estimates as of ' +
              (estAsof ?? '—') +
              ' · hit ⟳ Refresh data for live prices · drag to spin, scroll to zoom, click a marker for detail'}
        </p>
      </div>
    </section>
  )
}
