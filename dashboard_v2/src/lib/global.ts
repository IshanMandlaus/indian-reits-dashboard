/**
 * Global REIT-markets domain helpers, ported from v1 `global.html`.
 * Country-level market-cap / AUM pies with per-country drilldowns (top REITs by
 * market cap · AUM by sector), the country panels with live Yahoo quotes, and the
 * per-REIT <SecurityModal> config. Live quotes + price history come from
 * `global-live.json`, keyed by ticker.
 */
import type { Global, GlobalLive, GlobalQuote } from '../types/data'
import type { SecModalData, StatPair } from '../components/charts/SecurityModal'

/** Country-slice palette (refined-dark) and the extended drilldown palette. */
export const COLS = ['#2dd4bf', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#c39bd3', '#34d399']
export const BREAKCOLS = COLS.concat([
  '#5a6b80', '#d98f9c', '#8fd9c4', '#c9a0dc', '#ffb454', '#7cd992', '#e0e07a', '#b0b0b0',
])

export const fmtUSD = (v: number | null | undefined, d = 2): string =>
  v == null ? '–' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d })

/** The quote/history symbol for a top-5 row (element [3] overrides the ticker). */
export function rowSym(G: Global, ckey: string, ri: number): string {
  const row = G.top5[ckey][ri]
  return typeof row[3] === 'string' ? row[3] : row[1]
}

export interface PieSlice {
  label: string
  value: number
  color: string
}

/** Country-level slices for a pie, valued by market cap or AUM. */
export function countrySlices(G: Global, metric: 'mcap' | 'aum'): (PieSlice & { key: string })[] {
  return G.countries.map((c, i) => ({
    key: c.key,
    label: `${c.flag} ${c.name}`,
    value: c[metric],
    color: COLS[i % COLS.length],
  }))
}

/** A pie slice that can be drilled one level deeper (its `key` identifies the child view). */
export type DrillSlice = PieSlice & { key?: string }

export interface Drill {
  title: string
  slices: DrillSlice[]
  total: number
}

/** Market-cap drilldown for a country: its top listed REITs + an "Others" remainder. */
export function mcapDrill(G: Global, ckey: string): Drill {
  const c = G.countries.find((x) => x.key === ckey)!
  const bd = (G.mcap_breakdown[ckey] || []).slice()
  const sum = bd.reduce((a, [, v]) => a + v, 0)
  const others = Math.max(0, c.mcap - sum)
  const slices: PieSlice[] = bd.map(([label, value], i) => ({
    label,
    value,
    color: BREAKCOLS[i % BREAKCOLS.length],
  }))
  if (others > 0) {
    slices.push({ label: 'Others (smaller listed REITs)', value: others, color: BREAKCOLS[slices.length % BREAKCOLS.length] })
  }
  return { title: `${c.flag} ${c.name} — top listed REITs by market cap`, slices, total: c.mcap }
}

/** AUM drilldown for a country: gross assets by sector. Each sector slice is itself
 *  drillable (→ the listed REITs in that sector) when we have a roster for it. */
export function sectorDrill(G: Global, ckey: string): Drill {
  const c = G.countries.find((x) => x.key === ckey)!
  const bd = G.sector_breakdown[ckey] || []
  const roster = G.sector_reits?.[ckey] || []
  const drillable = new Set(roster.map((r) => r[2]))
  const slices: DrillSlice[] = bd.map(([label, value], i) => ({
    label,
    value,
    color: BREAKCOLS[i % BREAKCOLS.length],
    key: drillable.has(label) ? label : undefined,
  }))
  const total = bd.reduce((a, [, v]) => a + v, 0) || 1
  return { title: `${c.flag} ${c.name} — AUM by sector`, slices, total }
}

const median = (xs: number[]): number => {
  const s = xs.slice().sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/**
 * Third-level AUM drilldown: a country's listed REITs within one sector, sized by
 * *estimated* AUM share. The sector's gross AUM is split across the roster REITs in
 * proportion to their live market cap (from `global-live.json`), so the pie total
 * equals the parent sector slice. Yahoo mcap is in local currency while the seeds are
 * US$ bn, so we never mix scales: an implied FX (median live/seed over names that have
 * a live quote) rebases the seed-only names into the same basis; pre-refresh, or when a
 * sector has no live quotes at all, every weight falls back to the US$ seed. Shows the
 * top 10 REITs individually + an "Others" slice for the remainder. Returns null if the
 * country has no roster for this sector.
 */
export function sectorReitDrill(
  G: Global,
  LIVE: GlobalLive | null,
  ckey: string,
  sector: string,
): Drill | null {
  const c = G.countries.find((x) => x.key === ckey)
  const roster = (G.sector_reits?.[ckey] || []).filter((r) => r[2] === sector)
  if (!c || !roster.length) return null

  const sect = (G.sector_breakdown[ckey] || []).find((s) => s[0] === sector)
  const sectorAum = sect ? sect[1] : roster.reduce((a, r) => a + r[3], 0)

  // Live market cap in local-currency $bn where we have a quote, else null.
  const rows = roster.map(([name, ticker, , seed]) => {
    const q = LIVE?.quotes?.[ticker]
    const liveBn = q?.mcap != null ? q.mcap / 1e9 : null
    return { name, seed, liveBn }
  })
  const ratios = rows.filter((r) => r.liveBn != null && r.seed > 0).map((r) => r.liveBn! / r.seed)
  const fx = ratios.length ? median(ratios) : null

  const weighted = rows.map((r) => ({
    name: r.name,
    live: r.liveBn != null,
    weight: r.liveBn != null ? r.liveBn : fx != null ? r.seed * fx : r.seed,
  }))
  const wsum = weighted.reduce((a, r) => a + r.weight, 0) || 1
  const alloc = weighted
    .map((r) => ({ label: r.name, value: (sectorAum * r.weight) / wsum, live: r.live }))
    .sort((a, b) => b.value - a.value)

  const TOP = 10
  const head = alloc.slice(0, TOP)
  const tail = alloc.slice(TOP)
  const slices: DrillSlice[] = head.map((r, i) => ({
    label: r.label,
    value: r.value,
    color: BREAKCOLS[i % BREAKCOLS.length],
  }))
  if (tail.length) {
    const otherVal = tail.reduce((a, r) => a + r.value, 0)
    slices.push({
      label: `Others (${tail.length} smaller REIT${tail.length > 1 ? 's' : ''})`,
      value: otherVal,
      color: BREAKCOLS[slices.length % BREAKCOLS.length],
    })
  }
  const anyLive = weighted.some((r) => r.live)
  return {
    title: `${c.flag} ${c.name} · ${sector} — est. AUM by REIT${anyLive ? '' : ' (seed est.)'}`,
    slices,
    total: sectorAum,
  }
}

/**
 * A row's share of its country's listed-REIT market cap — live USD market cap when
 * available, else the seeded mcap_breakdown estimate. Ported from v1.
 */
export function pctOfCountryMcap(G: Global, ckey: string, ri: number, q?: GlobalQuote): number | null {
  const c = G.countries.find((x) => x.key === ckey)
  if (!c || !c.mcap) return null
  let valBn: number | null = null
  if (q && q.mcap && q.ccy === 'USD') valBn = q.mcap / 1e9
  if (valBn == null) {
    const bd = G.mcap_breakdown[ckey]
    if (bd && bd[ri]) valBn = bd[ri][1]
  }
  if (valBn == null) return null
  return (valBn / c.mcap) * 100
}

export interface CountryRow {
  ri: number
  name: string
  ticker: string
  sector: string
  sponsor: string
  price: number | null
  ccy: string | null
  mcapBn: number | null
  pctOfMkt: number | null
  live: boolean
}

/** The top-5 REIT rows for one country, with live quotes merged in. */
export function countryRows(G: Global, LIVE: GlobalLive | null, ckey: string): CountryRow[] {
  return (G.top5[ckey] || []).map(([name, ticker, sector, , sponsor], ri) => {
    const q = LIVE?.quotes?.[rowSym(G, ckey, ri)]
    return {
      ri,
      name,
      ticker,
      sector,
      sponsor,
      price: q?.price ?? null,
      ccy: q?.ccy ?? null,
      mcapBn: q?.mcap != null ? q.mcap / 1e9 : null,
      pctOfMkt: pctOfCountryMcap(G, ckey, ri, q),
      live: !!q,
    }
  })
}

/** Build the <SecurityModal> config for a country's REIT (ported from v1 `openGlobal`). */
export function buildGlobalSecModal(G: Global, LIVE: GlobalLive | null, ckey: string, ri: number): SecModalData {
  const c = G.countries.find((x) => x.key === ckey)!
  const [name, , sector, , sponsor] = G.top5[ckey][ri]
  const sym = rowSym(G, ckey, ri)
  const q = LIVE?.quotes?.[sym]
  const series = (LIVE?.hist?.[sym]) || {}
  const dates = Object.keys(series).sort()
  const vals = dates.map((d) => series[d])
  const hi = vals.length ? Math.max(...vals) : null
  const lo = vals.length ? Math.min(...vals) : null
  const lastHist = vals.length ? vals[vals.length - 1] : null
  const chg1y = vals.length > 1 ? ((q?.price ?? lastHist ?? vals[0]) / vals[0] - 1) * 100 : null
  const pct = pctOfCountryMcap(G, ckey, ri, q)

  const mkt: StatPair[] = [
    ['Market cap', q?.mcap != null ? '$' + fmtUSD(q.mcap / 1e9, 1) + ' bn' : null],
    ['% of country mkt cap', pct != null ? pct.toFixed(1) + '% of ' + c.name : null],
    ['Sector / type', sector],
    ['1Y change', chg1y != null ? (chg1y >= 0 ? '+' : '') + chg1y.toFixed(1) + '%' : null],
    ['52-wk high', hi != null ? fmtUSD(hi) + ' ' + (q?.ccy || '') : null],
    ['52-wk low', lo != null ? fmtUSD(lo) + ' ' + (q?.ccy || '') : null],
  ]
  const profile: StatPair[] = [
    ['Country', c.flag + ' ' + c.name],
    ['Sponsor / manager', sponsor || null],
    ['Market context', c.note],
  ]

  return {
    title: name,
    codes: sym + ' · ' + c.flag + ' ' + c.name,
    ccy: q?.ccy ?? null,
    series,
    livePrice: q?.price ?? null,
    liveTag: q ? 'live · ' + (LIVE?.asof || '') : '',
    mkt,
    profile,
    profileTitle: 'Market profile',
  }
}
