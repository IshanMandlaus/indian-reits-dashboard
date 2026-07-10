/**
 * Interactive 3D globe of the world's big listed-REIT players, drawn with globe.gl
 * (three.js) on a raw <div> ref — the same imperative idiom the Portfolio Map uses for
 * ECharts (`IndiaMap.tsx`), which is why we use the framework-agnostic `globe.gl` and
 * not `react-globe.gl` (avoids React-19 peer-dep friction).
 *
 * On-brand look: a dark globe whose landmasses are a teal HEX-GRID (globe.gl
 * `hexPolygons`, no photographic texture), a teal atmosphere glow, and a transparent
 * background so the card's radial teal backdrop shows through. Each player is a
 * market-cap-sized point with a pulsing ring; hovering shows a live-quote label and
 * clicking opens the same <SecurityModal> the country-panel rows use.
 *
 * globe.gl is lazy-loaded by GlobalPage (React.lazy), so three.js lands in its own
 * async chunk and never touches the other routes' bundles.
 */
import { useEffect, useRef } from 'react'
import Globe, { type GlobeInstance } from 'globe.gl'
import { Color, MeshPhongMaterial } from 'three'
import type { GlobePoint } from '../../lib/globe'
import { pointPriceLabel } from '../../lib/globe'

interface Props {
  points: GlobePoint[]
  onPick: (ckey: string, ri: number) => void
}

const ACCENT = '#2dd4bf'

// Each continent gets its own on-brand palette family (dark → bright); a country picks a
// shade within its continent's family by name-hash, so the honeycomb reads with per-country
// texture AND groups the world by region. Teal stays the hero (Asia — the dashboard's home).
const CONTINENT_PALETTES: Record<string, string[]> = {
  Asia: ['#0f4a44', '#177f74', '#1ba396', '#2dd4bf', '#5fe6d3'], // teal (hero)
  'North America': ['#173a5e', '#1e5aa0', '#3b82f6', '#60a5fa', '#93c5fd'], // blue
  Europe: ['#3b2f66', '#6d4fb0', '#8b5cf6', '#a78bfa', '#c4b5fd'], // violet
  'South America': ['#14532d', '#15803d', '#22c55e', '#34d399', '#6ee7b7'], // green
  Africa: ['#5c4611', '#a87d1e', '#e0a92e', '#fbbf24', '#fcd34d'], // amber/gold
  Oceania: ['#5b1f2a', '#a8324a', '#e5566f', '#f87171', '#fca5a5'], // rose/coral
}
const DEFAULT_PALETTE = ['#2a3543', '#3a4a5c', '#4d6070', '#61707f'] // Antarctica / open ocean / unknown

/** Load the world-countries GeoJSON once (fetched, not bundled) for the hex landmasses. */
let worldPromise: Promise<{ features: object[] }> | null = null
function ensureWorld(): Promise<{ features: object[] }> {
  if (!worldPromise) {
    worldPromise = fetch(import.meta.env.BASE_URL + 'geo/world-countries.geojson').then((r) => r.json())
  }
  return worldPromise
}

/** Per-country hex colour: pick the country's continent palette, then a shade by name-hash. */
function hexColor(feat: object): string {
  const props = (feat as { properties?: { CONTINENT?: string; ADMIN?: string; NAME?: string } }).properties
  const pal = CONTINENT_PALETTES[props?.CONTINENT ?? ''] ?? DEFAULT_PALETTE
  const name = String(props?.ADMIN ?? props?.NAME ?? '')
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return pal[h % pal.length]
}

export function ReitGlobe({ points, onPick }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  // Live refs so imperative globe callbacks never read stale props.
  const pointsRef = useRef<GlobePoint[]>(points)
  const onPickRef = useRef(onPick)
  pointsRef.current = points
  onPickRef.current = onPick

  // Init once.
  useEffect(() => {
    let disposed = false
    const el = elRef.current
    if (!el) return

    const initWhenSized = () => {
      const node = elRef.current
      if (disposed || !node) return
      if (!node.clientWidth || !node.clientHeight) {
        requestAnimationFrame(initWhenSized) // wait for layout (lazy mount → 0-width)
        return
      }
      const g = new Globe(node, {
        animateIn: true,
        rendererConfig: { preserveDrawingBuffer: true, antialias: true },
      })
      globeRef.current = g

      g.backgroundColor('#0a0e14') // --color-bg: deep space, darker than the card — globe reads as inset
        .showAtmosphere(true)
        .atmosphereColor(ACCENT)
        .atmosphereAltitude(0.26)
        .width(node.clientWidth)
        .height(node.clientHeight)

      // Replace globe.gl's default (transparent, no-texture) shader sphere with a solid,
      // lit dark-teal ocean so the brighter teal hex landmasses read as glowing on top.
      g.globeMaterial(
        new MeshPhongMaterial({
          color: new Color('#0b1a28'),
          emissive: new Color('#0a2c2a'),
          emissiveIntensity: 0.45,
          shininess: 8,
        }),
      )

      // Landmasses as a teal hex grid (no photographic texture → on-brand dark look).
      ensureWorld().then((geo) => {
        if (disposed || !globeRef.current) return
        globeRef.current
          .hexPolygonsData(geo.features)
          .hexPolygonResolution(3)
          .hexPolygonMargin(0.28)
          .hexPolygonAltitude(0.008)
          .hexPolygonUseDots(false)
          .hexPolygonColor((d: object) => hexColor(d))
      })

      // Points: market-cap-sized glowing dots that lift off the surface.
      g.pointsData([])
        .pointLat((d) => (d as GlobePoint).lat)
        .pointLng((d) => (d as GlobePoint).lng)
        .pointColor((d) => (d as GlobePoint).color)
        .pointAltitude((d) => 0.04 + 0.24 * (d as GlobePoint).size)
        .pointRadius((d) => 0.24 + 0.6 * (d as GlobePoint).size)
        .pointsMerge(false)
        .pointResolution(8)
        .pointLabel((d) => labelHtml(d as GlobePoint))
        .onPointHover((pt) => {
          const c = g.controls()
          c.autoRotate = !pt // pause spin while inspecting a marker
          if (elRef.current) elRef.current.style.cursor = pt ? 'pointer' : 'grab'
        })
        .onPointClick((pt) => {
          const p = pt as GlobePoint
          onPickRef.current(p.ckey, p.ri)
        })

      // Pulsing rings under each marker — the "sexy" ripple, colour-matched per country.
      g.ringsData([])
        .ringLat((d) => (d as GlobePoint).lat)
        .ringLng((d) => (d as GlobePoint).lng)
        .ringColor((d: object) => {
          const col = (d as GlobePoint).color
          return (t: number) => col + alphaHex(1 - t)
        })
        .ringMaxRadius((d) => 2 + 5 * (d as GlobePoint).size)
        .ringPropagationSpeed(1.6)
        .ringRepeatPeriod((d) => 1400 - 500 * (d as GlobePoint).size)

      // Auto-rotate, framed on a lively 3/4 view.
      const controls = g.controls()
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.55
      controls.enableZoom = true
      controls.minDistance = 180
      controls.maxDistance = 600
      g.pointOfView({ lat: 20, lng: 60, altitude: 2.4 }, 0)

      if (elRef.current) elRef.current.style.cursor = 'grab'
      applyData() // push whatever points arrived before init finished
    }

    initWhenSized()

    const resize = () => {
      const g = globeRef.current
      const node = elRef.current
      if (g && node) g.width(node.clientWidth).height(node.clientHeight)
    }
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    if (el) ro.observe(el)

    return () => {
      disposed = true
      window.removeEventListener('resize', resize)
      ro.disconnect()
      globeRef.current?._destructor()
      globeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push new point data whenever it changes (e.g. after a live refresh reload).
  useEffect(() => {
    applyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  function applyData() {
    const g = globeRef.current
    if (!g) return
    g.pointsData(pointsRef.current)
    g.ringsData(pointsRef.current)
  }

  return (
    <div
      className="relative h-[560px] w-full overflow-hidden rounded-lg"
      style={{ background: 'radial-gradient(120% 90% at 50% 45%, rgba(45,212,191,0.12), rgba(45,212,191,0) 62%)' }}
    >
      <div ref={elRef} className="h-full w-full" />
    </div>
  )
}

/** 0..1 → 2-digit hex alpha suffix, for the fading ring gradient. */
function alphaHex(v: number): string {
  const a = Math.max(0, Math.min(255, Math.round(v * 255)))
  return a.toString(16).padStart(2, '0')
}

/** Rich hover label (globe.gl renders the returned HTML string in a tooltip). */
function labelHtml(p: GlobePoint): string {
  const price = pointPriceLabel(p)
  const mcap = p.mcapBn != null ? '$' + p.mcapBn.toFixed(1) + ' bn mkt cap' : ''
  return `
    <div style="background:#111721;border:1px solid #232d3b;border-radius:10px;padding:8px 11px;
      box-shadow:0 8px 30px rgba(0,0,0,.55);font-family:Inter,system-ui,sans-serif;min-width:160px">
      <div style="font-weight:700;color:#e8eef4;font-size:13px">${escapeHtml(p.name)}</div>
      <div style="color:${p.color};font-size:11px;margin-bottom:5px">
        ${p.flag} ${escapeHtml(p.country)} · ${escapeHtml(p.sector)}
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;font-size:12px">
        <span style="color:#93a1b3">${escapeHtml(p.ticker)}</span>
        <span style="color:#e8eef4;font-weight:600">${escapeHtml(price)}${
          p.live ? ' <span style="color:#34d399;font-size:9px">●</span>' : ''
        }</span>
      </div>
      ${mcap ? `<div style="color:#93a1b3;font-size:11px;margin-top:2px">${mcap}</div>` : ''}
      <div style="color:#61707f;font-size:10px;margin-top:5px">click for full chart + metrics</div>
    </div>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
