/**
 * TypeScript shapes for the v1 → JSON data layer (see scripts/convert-data.mjs).
 * Types are derived from the actual converted JSON in public/data, not guesses.
 * Parallel arrays inside `ReitFin` are indexed by fiscal year (`years`).
 */

/** The six domestic REITs, keyed consistently across every dataset. */
export type ReitKey = 'embassy' | 'mindspace' | 'brookfield' | 'nexus' | 'krt' | 'bagmane'

/** A generic `{ [reitKey]: T }` record. Not every dataset has all six keys. */
export type ByReit<T> = Partial<Record<ReitKey, T>>

/** A time series as `[isoDate, value]` tuples. */
export type DatePoint = [string, number]

/** A time series as a `{ isoDate: value }` map. */
export type DateMap = Record<string, number>

// ─── data.js → REIT_DATA ────────────────────────────────────────────────────

export interface ReitQuarter {
  per: string // "2019-06"
  q: string // "Q1FY20"
  ndcf: number | null
  dpu: number | null
  rev: number | null
  nav: number | null
  assets_fv: number | null
  rev_rent: number | null
  rev_maint: number | null
  rev_ops: number | null
  pat: number | null
}

/** Parallel arrays indexed by `years`; nulls where a year has no data. */
export interface ReitFin {
  years: string[] // ["FY2019", …]
  revenue: (number | null)[]
  ndcf: (number | null)[]
  dist_total: (number | null)[]
  dpu: (number | null)[]
  gav: (number | null)[]
  gross_debt: (number | null)[]
  cash: (number | null)[]
  networth: (number | null)[]
  nav: (number | null)[]
  units_mn: (number | null)[]
  price_eoy: (number | null)[]
  rev_rental: (number | null)[]
  rev_maint: (number | null)[]
  q: ReitQuarter[]
}

export interface ReitBookValue {
  inv_prop: number
  ipud: number
  ppe: number
  cwip: number
  goodwill: number
  total_assets: number
}

export interface ReitIssuance {
  date: string // "2019-04"
  type: string // "IPO" | "QIP" | …
  units_mn: number
  price: number
  proceeds_cr: number
  note: string
}

export interface ReitBlock {
  date: string
  seller: string
  units_mn: number
  price: number
  note: string
}

export interface ReitSpv {
  spv: string
  asset: string
  type: string
  city: string
  leasable_msf: number
  completed_msf: number
  occ: number
  mkt_rent: number
  inplace_rent: number
  wale: number
  cap_rate: number
  disc_rate: number
  value_cr: number
  val_psf: number
  notes: string
}

export interface ReitMeta {
  name: string
  nse: string
  bse: string
  listed: string
  sponsor: string
}

export interface ReitData {
  fin: Record<ReitKey, ReitFin>
  bv: ByReit<Record<string, ReitBookValue>> // { key: { "FY2019": {…} } }
  issuances: ByReit<ReitIssuance[]>
  prices: ByReit<DatePoint[]>
  blocks: ByReit<ReitBlock[]>
  spv: ByReit<ReitSpv[]>
  meta: Record<ReitKey, ReitMeta>
  built: string // ISO date the workbook was built
  notes: Record<string, string>
}

// ─── prices.js → LIVE_PRICES ────────────────────────────────────────────────

export interface LivePrice {
  price: number
  asof: string // "09 Jul 2026 10:42"
  src: string // "BSE" | "NSE"
}

export type LivePrices = ByReit<LivePrice> & { _asof: string }

// ─── structures.js → REIT_STRUCTURES ────────────────────────────────────────

export interface StructureSponsor {
  name: string
  stake?: string
  exited?: string
  exit_note?: string
}

export interface StructureSpv {
  name: string
  stake: number // percent the REIT holds in this SPV
  via?: string
  assets: string[]
}

export interface ReitStructure {
  sponsors: StructureSponsor[]
  public_stake: string
  trustee: string
  manager: string
  notes?: string
  spvs: StructureSpv[]
}

export type ReitStructures = ByReit<ReitStructure>

// ─── annexures.js → ANNEXURES ───────────────────────────────────────────────
/** { reitKey: { assetName: pageNumbers[] } } → img/annex/<key>/p<n>.jpg */
export type Annexures = ByReit<Record<string, number[]>>

// ─── annex_images.js → ANNEX_IMAGES (Embassy-only cropped tables) ────────────
export interface AnnexImage {
  page: number
  src: string // "img/annex/embassy_tbl/p389.png"
  cap: string
}
export type AnnexImages = ByReit<Record<string, AnnexImage[]>>

// ─── annexdata.js → ANNEXDATA (parsed valuation text/tables) ─────────────────
/** Parsed block: "pg" page marker · "h" heading · "p" paragraph · "tbl" table. */
export type AnnexBlock =
  | { t: 'pg'; x: number }
  | { t: 'h'; x: string }
  | { t: 'p'; x: string }
  | { t: 'tbl'; rows: string[][] }
export type AnnexData = ByReit<Record<string, AnnexBlock[]>>

// ─── links.js → REIT_LINKS ──────────────────────────────────────────────────
export interface ReitLink {
  label: string
  url: string
  latest?: boolean
  type: string
}
export type ReitLinks = ByReit<ReitLink[]>

// ─── val_hy.js → REIT_VAL_HY (half-yearly GAV) ──────────────────────────────
export interface ValHyPoint {
  d: string // "2020-03-31"
  gav: number
  tv?: number
}
export type ReitValHy = ByReit<ValHyPoint[]>

// ─── blocks_live.js → BLOCKS_LIVE ───────────────────────────────────────────
export interface BlocksLive {
  asof: string
  blocks: Record<ReitKey, ReitBlock[]>
}

// ─── bench.js → BENCH ───────────────────────────────────────────────────────

export interface BenchOverview {
  security: string
  name: string
  ipo: string
  mcap_cr: number
  area_msf: number
  completed_msf: number
  uc_msf: number
  sponsor: string
  stake: string
  cagr: number
  occupancy: number
}

export interface BenchMetric {
  security: string
  price: number
  nav: number
  prem_disc: number
  fy27_ndcf: number
  fy27_yield: number
}

export interface Bench {
  asof: string
  prices: Record<string, DateMap> // { "Embassy REIT": { "2026-05-14": 103.54 } }
  turnover_cr: Record<string, DateMap>
  overview: BenchOverview[]
  metrics: BenchMetric[]
  fd_steps: [string, number][] // [isoDate, count]
  veterans: string[]
}

// ─── bench_live.js → BENCH_LIVE ─────────────────────────────────────────────
export interface BenchLive {
  asof: string
  sensex: DateMap
  updates: Record<string, DateMap> // latest price series per security (incl. InvITs)
  turnover_updates: Record<string, DateMap>
  adtv_units: Record<string, number>
  adtv_detail: Record<string, { NSE: number; BSE: number }>
}

// ─── invit_data.js → INVIT ──────────────────────────────────────────────────
export interface InvitTrust {
  key: string
  name: string
  nse: string
  sponsor: string
  sector: string
  listed: string
  assets: string
  ev_cr: number
  nav: number
  last_dpu: string
  dpu_fy26: number
  px_ref: number
  note: string
  color: string
}
export interface Invit {
  asof: string
  trusts: InvitTrust[]
}

// ─── global_data.js → GLOBAL ────────────────────────────────────────────────
export interface GlobalCountry {
  key: string // "us" | "jp" | "au" | "sg" | "hk" | "cn" | "in"
  name: string
  flag: string
  mcap: number // US$ bn listed REIT market cap
  aum: number // US$ bn gross real-estate AUM
  count: string
  note: string
}
/** [name, ticker, sector, mcap|null, manager] */
export type GlobalTopReit = [string, string, string, number | null, string]
/** [name, Yahoo ticker, sector (matches sector_breakdown label), seed mcap US$ bn] */
export type GlobalSectorReit = [string, string, string, number]
export interface GlobalCase {
  tag: string
  title: string
  body: string
}
export interface GlobalTemasek {
  title: string
  facts: [string, string][]
  world: string
  india: string
}
export interface Global {
  asof: string
  countries: GlobalCountry[]
  top5: Record<string, GlobalTopReit[]>
  mcap_breakdown: Record<string, [string, number][]> // { country: [name, mcap$bn][] }
  sector_breakdown: Record<string, [string, number][]> // { country: [sector, aum$bn][] }
  sector_reits?: Record<string, GlobalSectorReit[]> // { country: [name, ticker, sector, seed$bn][] }
  cases: GlobalCase[]
  temasek: GlobalTemasek
}

// ─── global_live.js → GLOBAL_LIVE ───────────────────────────────────────────
export interface GlobalQuote {
  price: number
  ccy: string
  mcap: number
}
export interface GlobalLive {
  asof: string
  quotes: Record<string, GlobalQuote> // keyed by ticker, e.g. "0435.HK"
  hist: Record<string, DateMap>
}

// ─── holdings.js → HOLDINGS ─────────────────────────────────────────────────
// Unit-holding (shareholding) pattern per REIT: Sponsor & Sponsor Group vs
// Public, one entry per quarterly filing (most-recent-first).
export interface HoldingQuarter {
  date: string // ISO as-on date, e.g. "2026-03-31"
  label: string // display quarter, e.g. "Mar 2026"
  sponsor: number // Sponsor & Sponsor Group %
  public: number // Public %
  emp: number // Employee-trust % (0 for all current REITs)
}
export interface ReitHolding {
  symbol: string // NSE symbol, e.g. "EMBASSY"
  quarters: HoldingQuarter[]
}
export type Holdings = ByReit<ReitHolding> & {
  _asof: string
  _seed?: boolean // true while showing seed data, before the first live refresh
}
