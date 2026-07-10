/**
 * Coordinate + point layer for the interactive 3D REIT globe on the Global page.
 * Places each of the world's big listed-REIT players (the `top5` per country) at
 * its HQ city and merges in the live Yahoo quote from `global-live.json`. The globe
 * itself is drawn with globe.gl in `components/global/ReitGlobe.tsx`; this module is
 * the pure data prep (mirrors the geo/aggregation split used by the Portfolio Map's
 * `src/lib/geo.ts`).
 */
import type { Global, GlobalLive } from '../types/data'
import { COLS, rowSym, fmtUSD } from './global'

/** HQ city coords `[lat, lng]` per quote ticker (matches `rowSym`). Co-located tickers
 *  in one financial hub get fanned out by `jitter` below so their pins don't stack. */
const HQ: Record<string, [number, number]> = {
  // United States — spread across each REIT's real HQ city
  PLD: [37.7749, -122.4194], // Prologis — San Francisco
  AMT: [42.3601, -71.0589], // American Tower — Boston
  EQIX: [37.4848, -122.2281], // Equinix — Redwood City
  WELL: [41.6528, -83.5379], // Welltower — Toledo, OH
  SPG: [39.7684, -86.1581], // Simon Property — Indianapolis
  // Japan — all Tokyo
  '8951.T': [35.6762, 139.6503],
  '8952.T': [35.6762, 139.6503],
  '3283.T': [35.6762, 139.6503],
  '3281.T': [35.6762, 139.6503],
  '8953.T': [35.6762, 139.6503],
  // Australia — all Sydney
  'GMG.AX': [-33.8688, 151.2093],
  'SCG.AX': [-33.8688, 151.2093],
  'SGP.AX': [-33.8688, 151.2093],
  'DXS.AX': [-33.8688, 151.2093],
  'MGR.AX': [-33.8688, 151.2093],
  // Singapore — all Singapore
  'C38U.SI': [1.2897, 103.8501],
  'A17U.SI': [1.2897, 103.8501],
  'M44U.SI': [1.2897, 103.8501],
  'ME8U.SI': [1.2897, 103.8501],
  'N2IU.SI': [1.2897, 103.8501],
  // Hong Kong — all Hong Kong
  '0823.HK': [22.3193, 114.1694],
  '2778.HK': [22.3193, 114.1694],
  '0778.HK': [22.3193, 114.1694],
  '0435.HK': [22.3193, 114.1694],
  '0808.HK': [22.3193, 114.1694],
  // China C-REITs — sponsor's home city
  '180101.SZ': [22.5431, 114.0579], // China Merchants Shekou — Shenzhen
  '508056.SS': [31.2304, 121.4737], // CICC GLP Warehouse — Shanghai
  '180201.SZ': [23.1291, 113.2644], // Ping An Guangzhou Guanghe — Guangzhou
  '508099.SS': [39.9042, 116.4074], // CCB Zhongguancun — Beijing
  '508091.SS': [31.2304, 121.4737], // CapitaLand Commercial C-REIT — Shanghai
  // India
  'KRT.BO': [19.076, 72.8777], // Knowledge Realty Trust — Mumbai
  'EMBASSY.NS': [12.9716, 77.5946], // Embassy — Bengaluru
  'BAGMANE.BO': [12.9716, 77.5946], // Bagmane — Bengaluru
  'MINDSPACE.NS': [19.076, 72.8777], // Mindspace — Mumbai
  'BIRET.NS': [19.076, 72.8777], // Brookfield India — Mumbai
}

/** Golden-angle spiral jitter so co-located HQs fan out (ported from `geo.ts`). */
function jitter(base: [number, number], n: number): [number, number] {
  if (n === 0) return base
  const golden = 2.399963 // ~137.5°
  const a = n * golden
  const r = 0.9 * Math.sqrt(n) // degrees — wider than the India map: readable at globe scale
  return [base[0] + r * Math.cos(a), base[1] + r * Math.sin(a)]
}

export interface GlobePoint {
  ckey: string // country key, for buildGlobalSecModal(G, LIVE, ckey, ri)
  ri: number // row index within the country's top5
  lat: number
  lng: number
  name: string
  ticker: string
  sector: string
  country: string
  flag: string
  color: string // country palette colour
  price: number | null
  ccy: string | null
  mcapBn: number | null
  live: boolean
  /** 0..1 normalised size driver (√ market cap), for marker radius/altitude + rings. */
  size: number
}

/**
 * One globe point per top-5 REIT across every country, HQ-located, live-quote-merged.
 * Marker size scales with √(market cap) so the mega-caps (Prologis, American Tower,
 * Equinix…) read biggest. Points with no HQ coord are skipped (shouldn't happen for the
 * seeded 35).
 */
export function buildGlobePoints(G: Global, LIVE: GlobalLive | null): GlobePoint[] {
  const raw: (Omit<GlobePoint, 'size'> & { mcapRaw: number })[] = []
  const seen: Record<string, number> = {} // HQ coord key → how many already placed there

  G.countries.forEach((c, ci) => {
    const rows = G.top5[c.key] || []
    rows.forEach((row, ri) => {
      const [name, ticker, sector] = row
      const sym = rowSym(G, c.key, ri)
      const base = HQ[sym]
      if (!base) return
      const key = base[0] + ',' + base[1]
      const n = seen[key] || 0
      seen[key] = n + 1
      const [lat, lng] = jitter(base, n)

      const q = LIVE?.quotes?.[sym]
      const mcapBn = q?.mcap != null ? q.mcap / 1e9 : null
      // For size we want a comparable magnitude even when a quote's mcap is in local
      // currency — fall back to the seeded USD estimate in mcap_breakdown when present.
      const seededBn = G.mcap_breakdown[c.key]?.[ri]?.[1] ?? null
      const mcapRaw = (q?.ccy === 'USD' && mcapBn != null ? mcapBn : seededBn) ?? mcapBn ?? 1

      raw.push({
        ckey: c.key,
        ri,
        lat,
        lng,
        name,
        ticker,
        sector,
        country: c.name,
        flag: c.flag,
        color: COLS[ci % COLS.length],
        price: q?.price ?? null,
        ccy: q?.ccy ?? null,
        mcapBn,
        live: !!q,
        mcapRaw,
      })
    })
  })

  const maxRoot = Math.max(1, ...raw.map((p) => Math.sqrt(Math.max(0, p.mcapRaw))))
  return raw.map(({ mcapRaw, ...p }) => ({
    ...p,
    size: Math.sqrt(Math.max(0, mcapRaw)) / maxRoot,
  }))
}

/** Live-price display string for a point's tooltip (local currency), or an empty state. */
export function pointPriceLabel(p: GlobePoint): string {
  if (p.price == null) return 'price pending — hit ⟳ Refresh data'
  return fmtUSD(p.price) + (p.ccy ? ' ' + p.ccy : '')
}
