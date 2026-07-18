/**
 * Geographic layer for the Portfolio Map page.
 *
 * Turns `reit-data.spv[key]` (per-asset SPV rows) into a flat, map-ready list of
 * assets with [lng, lat] coordinates, plus city/state aggregations for the
 * choropleth base. Coordinates come from a curated `CITY_COORDS` lookup (public
 * knowledge); marquee office parks get true micro-market coords via
 * `ASSET_OVERRIDES`, everything else fans out from its city centroid with a
 * deterministic golden-angle spiral so pins never stack.
 */
import type { ReitData, ReitKey, ReitSpv } from '../types/data'
import { REIT_KEYS, REIT_SHORT } from './reit'

export { REIT_KEYS, REIT_SHORT }

/** One distinct colour per REIT (refined-dark palette). */
export const REIT_COLOR: Record<ReitKey, string> = {
  embassy: '#2dd4bf', // teal
  mindspace: '#d9c48a', // gold
  brookfield: '#60a5fa', // blue
  nexus: '#a78bfa', // violet
  krt: '#34d399', // green
  bagmane: '#fbbf24', // amber
}

/** Asset type → display group used by the type filter. */
export const ASSET_TYPES = ['Office', 'Retail', 'Hotel', 'Solar', 'Other'] as const
export type AssetType = (typeof ASSET_TYPES)[number]

// ─── city coordinates [lng, lat] ────────────────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  Bengaluru: [77.5946, 12.9716],
  Mumbai: [72.8777, 19.076],
  'Navi Mumbai': [73.0297, 19.033],
  Pune: [73.8567, 18.5204],
  Hyderabad: [78.4867, 17.385],
  Chennai: [80.2707, 13.0827],
  Noida: [77.391, 28.5355],
  'New Delhi': [77.209, 28.6139],
  Gurugram: [77.0266, 28.4595],
  Kolkata: [88.3639, 22.5726],
  Ahmedabad: [72.5714, 23.0225],
  'GIFT City': [72.6841, 23.16],
  Chandigarh: [76.7794, 30.7333],
  Ludhiana: [75.8573, 30.901],
  Amritsar: [74.8723, 31.634],
  Bhubaneswar: [85.8245, 20.2961],
  Udaipur: [73.7125, 24.5854],
  Mangaluru: [74.856, 12.9141],
  Mysuru: [76.6394, 12.2958],
  Indore: [75.8577, 22.7196],
  Vijayapura: [75.71, 16.8302],
  Ballari: [76.9214, 15.1394],
  Chitradurga: [76.398, 14.2251],
  Dhule: [74.7749, 20.9042],
  Karnataka: [75.7139, 15.3173],
}

/** Canonical city → state name (must match the GeoJSON `st` property). */
const CITY_TO_STATE: Record<string, string> = {
  Bengaluru: 'Karnataka',
  Mangaluru: 'Karnataka',
  Mysuru: 'Karnataka',
  Ballari: 'Karnataka',
  Chitradurga: 'Karnataka',
  Vijayapura: 'Karnataka',
  Karnataka: 'Karnataka',
  Mumbai: 'Maharashtra',
  'Navi Mumbai': 'Maharashtra',
  Pune: 'Maharashtra',
  Dhule: 'Maharashtra',
  Hyderabad: 'Telangana',
  Chennai: 'Tamil Nadu',
  Noida: 'Uttar Pradesh',
  Gurugram: 'Haryana',
  'New Delhi': 'Delhi',
  Kolkata: 'West Bengal',
  Ahmedabad: 'Gujarat',
  'GIFT City': 'Gujarat',
  Chandigarh: 'Chandigarh',
  Ludhiana: 'Punjab',
  Amritsar: 'Punjab',
  Bhubaneswar: 'Odisha',
  Udaipur: 'Rajasthan',
  Indore: 'Madhya Pradesh',
}

/** Messy raw `city` labels in the data → canonical city key. */
const CITY_ALIASES: Record<string, string> = {
  'Bellary District, Karnataka': 'Ballari',
  'GIFT City, Ahmedabad': 'GIFT City',
  'Karnataka (Chikkodi, Sedam, Yadgir, Chitradurga)': 'Karnataka',
  'Dhule, Maharashtra': 'Dhule',
  'Chitradurga, Karnataka': 'Chitradurga',
}

/** Resolve a raw `city` string to a canonical city key in CITY_COORDS. */
export function canonCity(raw: string | null | undefined): string {
  const s = (raw || '').trim()
  if (!s) return ''
  if (CITY_ALIASES[s]) return CITY_ALIASES[s]
  if (CITY_COORDS[s]) return s
  const head = s.split(/[,(]/)[0].trim()
  if (CITY_COORDS[head]) return head
  return head || s
}

/**
 * Marquee assets pinned at true micro-market coords [lng, lat]. Matched by a
 * keyword contained in the asset name; only applied to non-solar assets so the
 * "One BKC Solar" (Dhule) row can't grab the Mumbai-BKC "One BKC" pin.
 */
const ASSET_OVERRIDES: [string, [number, number]][] = [
  ['Manyata', [77.62, 13.043]],
  ['TechVillage', [77.678, 12.935]],
  ['GolfLinks', [77.64, 12.96]],
  ['Ecoworld', [77.677, 12.925]],
  ['World Technology Centre', [77.698, 13.013]],
  ['Constellation', [77.696, 12.986]],
  ['Bagmane Tech Park', [77.665, 12.99]],
  ['Cessna', [77.687, 12.933]],
  ['Madhapur', [78.386, 17.448]],
  ['Knowledge City', [78.376, 17.434]],
  ['Airoli East', [72.999, 19.156]],
  ['Airoli West', [72.993, 19.16]],
  ['One BKC', [72.868, 19.067]],
  ['Gera Commerzone', [73.943, 18.551]],
  ['Candor Techspace G2', [77.068, 28.504]],
  ['Citywalk', [77.219, 28.528]],
]

function overrideCoord(asset: string, type: string): [number, number] | null {
  if (type === 'Solar' || type === 'Other') return null
  for (const [kw, c] of ASSET_OVERRIDES) if (asset.includes(kw)) return c
  return null
}

/** Deterministic golden-angle spiral offset for the n-th asset in a city. */
function jitter(base: [number, number], n: number): [number, number] {
  if (n === 0) return base
  const golden = 2.399963 // ~137.5° in radians
  const a = n * golden
  const r = 0.028 * Math.sqrt(n) // degrees (~3 km × √n)
  return [base[0] + r * Math.cos(a), base[1] + r * Math.sin(a)]
}

// ─── the map-ready asset model ──────────────────────────────────────────────
export interface MapAsset {
  id: string // `${reit}:${index}` — stable key
  reit: ReitKey
  reitLabel: string
  color: string
  asset: string
  spvName: string
  city: string // raw label
  cityCanon: string
  state: string
  type: AssetType
  leasable: number | null
  completed: number | null
  occ: number | null
  inplaceRent: number | null
  mktRent: number | null
  wale: number | null
  capRate: number | null
  valueCr: number | null
  valPsf: number | null
  notes: string
  lng: number
  lat: number
  raw: ReitSpv // original row — for AnnexModal
}

function typeOf(t: string | null | undefined): AssetType {
  const s = (t || '').trim()
  return (ASSET_TYPES as readonly string[]).includes(s) ? (s as AssetType) : 'Other'
}

/** Flatten every REIT's SPV rows into map-ready assets with coordinates. */
export function assetsFromReitData(D: ReitData): MapAsset[] {
  const out: MapAsset[] = []
  const cityCount: Record<string, number> = {} // running spiral index per city

  for (const reit of REIT_KEYS) {
    const rows = D.spv[reit] || []
    rows.forEach((a, i) => {
      const cityCanon = canonCity(a.city)
      const base = CITY_COORDS[cityCanon]
      const type = typeOf(a.type)
      let lng: number
      let lat: number
      const ov = overrideCoord(a.asset || '', type)
      if (ov) {
        ;[lng, lat] = ov
      } else if (base) {
        const n = cityCount[cityCanon] || 0
        cityCount[cityCanon] = n + 1
        ;[lng, lat] = jitter(base, n)
      } else {
        // Unknown city — drop to India centroid so it's still listed, not lost.
        ;[lng, lat] = [79, 22]
      }
      out.push({
        id: `${reit}:${i}`,
        reit,
        reitLabel: REIT_SHORT[reit],
        color: REIT_COLOR[reit],
        asset: a.asset || '—',
        spvName: a.spv || '',
        city: a.city || '',
        cityCanon,
        state: CITY_TO_STATE[cityCanon] || '',
        type,
        leasable: num(a.leasable_msf),
        completed: num(a.completed_msf),
        occ: num(a.occ),
        inplaceRent: num(a.inplace_rent),
        mktRent: num(a.mkt_rent),
        wale: num(a.wale),
        capRate: num(a.cap_rate),
        valueCr: num(a.value_cr),
        valPsf: num(a.val_psf),
        notes: a.notes || '',
        lng,
        lat,
        raw: a,
      })
    })
  }
  return out
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && !Number.isNaN(v) ? v : null

// ─── aggregations ───────────────────────────────────────────────────────────
export interface Agg {
  count: number
  leasable: number
  completed: number
  value: number
  occ: number | null // leasable-weighted
}

function aggregate(assets: MapAsset[]): Agg {
  let leasable = 0
  let completed = 0
  let value = 0
  let occNum = 0
  let occDen = 0
  for (const a of assets) {
    leasable += a.leasable || 0
    completed += a.completed || 0
    value += a.valueCr || 0
    if (a.occ != null && a.leasable != null) {
      occNum += a.occ * a.leasable
      occDen += a.leasable
    }
  }
  return { count: assets.length, leasable, completed, value, occ: occDen ? occNum / occDen : null }
}

export const totals = aggregate

/** Aggregate assets by canonical city (for the "Cities" view + list). */
export function aggregateByCity(assets: MapAsset[]): (Agg & { city: string; lng: number; lat: number })[] {
  const by: Record<string, MapAsset[]> = {}
  for (const a of assets) (by[a.cityCanon || '—'] ||= []).push(a)
  return Object.entries(by).map(([city, list]) => {
    const c = CITY_COORDS[city] || [79, 22]
    return { city, lng: c[0], lat: c[1], ...aggregate(list) }
  })
}

/** Aggregate a numeric metric by state (for the choropleth). */
export function aggregateByState(assets: MapAsset[], metric: 'leasable' | 'value' | 'count'): Record<string, number> {
  const by: Record<string, number> = {}
  for (const a of assets) {
    if (!a.state) continue
    const add = metric === 'count' ? 1 : metric === 'value' ? a.valueCr || 0 : a.leasable || 0
    by[a.state] = (by[a.state] || 0) + add
  }
  return by
}
