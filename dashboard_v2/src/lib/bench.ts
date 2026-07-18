/**
 * Market & Benchmarks domain helpers, ported from v1 `market.html`.
 * Merges the live refresh into the seeded benchmark series, builds a
 * forward-filled trading calendar, and derives the combined-basket / rebased /
 * FD / G-Sec index series, the snapshot rows + sparklines, and the security-modal
 * config for a REIT. All series are emitted as `{x,y}` points on a linear time
 * axis so they can feed the reusable <TimeSeriesChart>.
 */
import type { Bench, BenchLive, BenchOverview, BenchMetric, DateMap, LivePrices, PriceHistory, ReitData, ReitKey } from '../types/data'
import type { SecModalData, StatPair } from '../components/charts/SecurityModal'

const DAY = 864e5
const dTs = (d: string): number => new Date(d).getTime()

/** Security name → reit key (the 6 domestic REITs, in bench.js naming). */
export const KEY: Record<string, ReitKey> = {
  'Embassy REIT': 'embassy',
  'Mindspace REIT': 'mindspace',
  'Brookfield REIT': 'brookfield',
  'Nexus Select Trust': 'nexus',
  'Knowledge Realty Trust': 'krt',
  'Bagmane REIT': 'bagmane',
}
export const REIT_SECS = Object.keys(KEY)

/** Per-REIT series colour (refined-dark palette). */
export const PALETTE: Record<string, string> = {
  'Embassy REIT': '#2dd4bf',
  'Mindspace REIT': '#60a5fa',
  'Brookfield REIT': '#fbbf24',
  'Nexus Select Trust': '#a78bfa',
  'Knowledge Realty Trust': '#34d399',
  'Bagmane REIT': '#f472b6',
}

/** Canonical full names for the snapshot header. */
const FULLNAME: Record<string, string> = {
  'Embassy REIT': 'Embassy Office Parks REIT',
  'Mindspace REIT': 'Mindspace Business Parks REIT',
  'Brookfield REIT': 'Brookfield India Real Estate Trust',
  'Nexus Select Trust': 'Nexus Select Trust',
  'Knowledge Realty Trust': 'Knowledge Realty Trust',
  'Bagmane REIT': 'Bagmane Prime Office REIT',
}
/** Short labels for the stacked-area / distribution charts. */
export const SHORTNM: Record<string, string> = {
  'Embassy REIT': 'Embassy',
  'Mindspace REIT': 'Mindspace',
  'Brookfield REIT': 'Brookfield',
  'Nexus Select Trust': 'Nexus',
  'Knowledge Realty Trust': 'KRT',
  'Bagmane REIT': 'Bagmane',
}

/** Government of India 10-year G-Sec — indicative accrual index from stepped yields. */
const GSEC_STEPS: [string, number][] = [
  ['2020-07-01', 5.85], ['2021-01-01', 5.95], ['2021-07-01', 6.2], ['2022-01-01', 6.55],
  ['2022-06-01', 7.45], ['2022-11-01', 7.3], ['2023-09-01', 7.2], ['2024-07-01', 6.95],
  ['2025-01-01', 6.8], ['2025-07-01', 6.3], ['2026-01-01', 6.5],
]

export interface Pt {
  x: number
  y: number
}

export interface BenchCtx {
  CAL: string[]
  prices: Record<string, DateMap> // merged raw (live applied)
  FF: Record<string, DateMap> // forward-filled over CAL
  turnover: Record<string, DateMap> // merged raw
  fdSteps: [string, number][]
  veterans: string[]
  overview: BenchOverview[]
  metrics: BenchMetric[]
  adtvUnits: Record<string, number>
  hasSensex: boolean
  asof: string
  liveAsof: string | null
}

/** Merge the live refresh into the seeded series and build the forward-filled calendar. */
export function makeBenchCtx(B: Bench, L: BenchLive | null, H?: PriceHistory | null): BenchCtx {
  const prices: Record<string, DateMap> = {}
  for (const [s, m] of Object.entries(B.prices)) prices[s] = { ...m }
  const turnover: Record<string, DateMap> = {}
  for (const [s, m] of Object.entries(B.turnover_cr)) turnover[s] = { ...m }
  if (L) {
    // Live PRICE updates are scale-consistent with the seeded series (they extend
    // the tail with same-unit NSE/BSE closes) — merge them so the price charts stay
    // current. SENSEX arrives live-only.
    for (const [s, upd] of Object.entries(L.updates || {})) prices[s] = { ...(prices[s] || {}), ...upd }
    if (L.sensex && Object.keys(L.sensex).length) prices['SENSEX'] = { ...(prices['SENSEX'] || {}), ...L.sensex }
    // NOTE: live turnover_updates are intentionally NOT merged. The live turnover
    // source is inconsistent with the workbook turnover used for the VOL INDEX:
    //  • index turnover is on a different scale (e.g. NIFTY 50 seeded ≈ 20,549 ₹cr
    //    vs live ≈ 609), and
    //  • REIT turnover is re-pulled back to 2019, which would move the rebase base
    //    off 2025-06-30.
    // Merging it (as v1 did) is exactly what corrupts the rebased turnover + moving
    // average. Re-enable per-security once the refresh pipeline (Phase D) emits
    // turnover on the same basis as the workbook.
  }
  // The CSV close-price seed ("Historical Close Prices/") is the source of
  // truth wherever it has a date — it both extends history back to listing
  // (e.g. Embassy 2019) and overrides workbook/live values on overlap. Live
  // updates still extend the tail beyond its asof date.
  if (H) for (const [s, m] of Object.entries(H.secs || {})) prices[s] = { ...(prices[s] || {}), ...m }
  const CAL = Object.keys(prices['NIFTY 50'] || {}).sort()
  const FF: Record<string, DateMap> = {}
  for (const s of Object.keys(prices)) FF[s] = ffill(prices[s], CAL)
  return {
    CAL,
    prices,
    FF,
    turnover,
    fdSteps: B.fd_steps,
    veterans: B.veterans,
    overview: B.overview,
    metrics: B.metrics,
    adtvUnits: L?.adtv_units || {},
    hasSensex: !!prices['SENSEX'],
    asof: L?.asof || B.asof,
    liveAsof: L?.asof || null,
  }
}

function ffill(src: DateMap, CAL: string[]): DateMap {
  const out: DateMap = {}
  let last: number | null = null
  let started = false
  for (const d of CAL) {
    if (src[d] != null) {
      last = src[d]
      started = true
    }
    if (started && last != null) out[d] = last
  }
  return out
}

/** Window start date for a range: years<99 → that many years back, else the earliest. */
export function startFrom(CAL: string[], years: number): string {
  if (!CAL.length) return ''
  if (years >= 99) return CAL[0]
  const last = new Date(CAL[CAL.length - 1])
  last.setFullYear(last.getFullYear() - years)
  const t = last.toISOString().slice(0, 10)
  return CAL.find((d) => d >= t) || CAL[0]
}

function combinedAt(FF: Record<string, DateMap>, d: string, basket: string[]): number | null {
  let t = 0
  let n = 0
  for (const s of basket) {
    const v = FF[s]?.[d]
    if (v != null) {
      t += v
      n++
    }
  }
  return n ? t : null
}

/** Absolute forward-filled series for one security, from `from`, as `{x,y}` points. */
export function secPts(ctx: BenchCtx, sec: string, from: string): Pt[] {
  return ptsFrom(ctx.CAL, from, (d) => ctx.FF[sec]?.[d] ?? null)
}

/** Absolute combined-basket series (sum of unit prices), from `from`. */
export function combinedPts(ctx: BenchCtx, basket: string[], from: string): Pt[] {
  return ptsFrom(ctx.CAL, from, (d) => combinedAt(ctx.FF, d, basket))
}

/** Rebase a point series to 100 at its first value. */
export function rebase(pts: Pt[]): Pt[] {
  const base = pts.find((p) => p.y != null)?.y
  if (!base) return pts
  return pts.map((p) => ({ x: p.x, y: (p.y / base) * 100 }))
}

/** SBI 1-yr FD index (stepped rates), compounded over trading dates from `from`. */
export function fdPts(ctx: BenchCtx, from: string): Pt[] {
  return accrualPts(ctx.CAL, from, rateStep(ctx.fdSteps))
}
/** Flat-rate FD index (e.g. 7% p.a.). */
export function fdFlatPts(ctx: BenchCtx, from: string, rate: number): Pt[] {
  return accrualPts(ctx.CAL, from, () => rate)
}
/** GoI 10Y G-Sec indicative accrual index. */
export function gsecPts(ctx: BenchCtx, from: string): Pt[] {
  return accrualPts(ctx.CAL, from, rateStep(GSEC_STEPS))
}

function rateStep(steps: [string, number][]) {
  return (d: string): number => {
    let r = steps[0][1]
    for (const [sd, sr] of steps) {
      if (sd <= d) r = sr
      else break
    }
    return r
  }
}

function accrualPts(CAL: string[], from: string, rateAt: (d: string) => number): Pt[] {
  const dates = CAL.filter((d) => d >= from)
  let idx = 100
  let prev: string | null = null
  const out: Pt[] = []
  for (const d of dates) {
    if (prev) {
      const gap = (dTs(d) - dTs(prev)) / DAY
      idx *= Math.pow(1 + rateAt(d) / 100, gap / 365)
    }
    out.push({ x: dTs(d), y: idx })
    prev = d
  }
  return out
}

function ptsFrom(CAL: string[], from: string, valAt: (d: string) => number | null): Pt[] {
  const out: Pt[] = []
  for (const d of CAL) {
    if (d < from) continue
    const v = valAt(d)
    if (v != null) out.push({ x: dTs(d), y: v })
  }
  return out
}

// ─── turnover / VOL INDEX (Exhibit 6) ────────────────────────────────────────

/** The turnover trading calendar (own calendar — turnover dates can differ from prices). */
export function turnoverCal(ctx: BenchCtx): string[] {
  return Object.keys(ctx.turnover['NIFTY 50'] || {}).sort()
}

type NArr = (number | null)[]

/** Rebase a date-aligned array to 100 at its first positive value (the window start). */
function rebaseArr(a: NArr): NArr {
  const base = a.find((v) => v != null && v > 0)
  if (!base) return a
  return a.map((v) => (v != null ? (v / base) * 100 : null))
}
/** 20-trading-day trailing moving average, skipping nulls (partial window at the start). */
function movingAvg(a: NArr, win = 20): NArr {
  return a.map((_, i) => {
    const w = a.slice(Math.max(0, i - (win - 1)), i + 1).filter((v): v is number => v != null)
    return w.length ? w.reduce((x, y) => x + y, 0) / w.length : null
  })
}
function arrToPts(dates: string[], a: NArr): Pt[] {
  const out: Pt[] = []
  dates.forEach((d, i) => {
    if (a[i] != null) out.push({ x: dTs(d), y: a[i] as number })
  })
  return out
}

export interface VolumeData {
  rawBasket: Pt[]
  rawN50: Pt[]
  rawNRE: Pt[]
  maBasket: Pt[]
  maN50: Pt[]
  maNRE: Pt[]
  blockPt: Pt[] // Embassy block-deal marker (empty if outside the window)
}

/**
 * VOL INDEX + 20-day moving average for the veterans turnover basket vs NIFTY 50 /
 * NIFTY REALTY, computed over the window starting at `from`. The rebase re-anchors
 * to the window start (Tableau table-calc behaviour), so changing the window
 * recomputes both the index and its moving average.
 */
export function volumeSeries(ctx: BenchCtx, from: string): VolumeData | null {
  const cal = turnoverCal(ctx).filter((d) => d >= from)
  if (cal.length < 2) return null
  const basket = cal.map((d) => {
    let t = 0
    let n = 0
    for (const s of ctx.veterans) {
      const v = ctx.turnover[s]?.[d]
      if (v != null) {
        t += v
        n++
      }
    }
    return n ? t : null
  })
  const n50 = cal.map((d) => ctx.turnover['NIFTY 50']?.[d] ?? null)
  const nre = cal.map((d) => ctx.turnover['NIFTY REALTY']?.[d] ?? null)
  const rbB = rebaseArr(basket)
  const rb50 = rebaseArr(n50)
  const rbRE = rebaseArr(nre)
  const bi = cal.indexOf('2026-02-24')
  return {
    rawBasket: arrToPts(cal, rbB),
    rawN50: arrToPts(cal, rb50),
    rawNRE: arrToPts(cal, rbRE),
    maBasket: arrToPts(cal, movingAvg(rbB)),
    maN50: arrToPts(cal, movingAvg(rb50)),
    maNRE: arrToPts(cal, movingAvg(rbRE)),
    blockPt: bi >= 0 && rbB[bi] != null ? [{ x: dTs('2026-02-24'), y: rbB[bi] as number }] : [],
  }
}

// ─── snapshot cards ─────────────────────────────────────────────────────────

export interface SnapRow {
  security: string
  key: ReitKey
  name: string
  color: string
  mcap: number
  areaMsf: number
  stake: string
  sponsor: string
  occupancy: number | null
  cagr: number | null
  ipoYear: string | null
  lastPrice: number | null
  live: boolean
  chg1yPct: number | null
  spark: number[]
}

/** Last non-null value in a parallel array. */
function lastNN(a: (number | null)[]): number | null {
  for (let i = (a || []).length - 1; i >= 0; i--) if (a[i] != null) return a[i]
  return null
}

// ─── combined-basket distribution yield ──────────────────────────────────────

/** Combined-basket trailing distribution yield for one FY (%): Σ distributions ÷ Σ FY-end market cap. */
export function basketDistYield(D: ReitData, fy: string): number | null {
  let dist = 0
  let mcap = 0
  for (const sec of REIT_SECS) {
    const f = D.fin[KEY[sec]]
    const i = f.years.indexOf(fy)
    if (i < 0) continue
    const dt = f.dist_total[i]
    const px = f.price_eoy[i]
    const un = f.units_mn[i]
    if (dt != null && px != null && un != null) {
      dist += dt
      mcap += (px * un) / 10
    }
  }
  return mcap ? +((dist / mcap) * 100).toFixed(2) : null
}

/** Combined-basket trailing yield at today's prices (%): Σ latest-FY distributions ÷ Σ current market cap. */
export function basketDistYieldLatest(ctx: BenchCtx, D: ReitData, LIVE: LivePrices | null, fy = 'FY2026'): number | null {
  let dist = 0
  let mcap = 0
  for (const sec of REIT_SECS) {
    const key = KEY[sec]
    const f = D.fin[key]
    const i = f.years.indexOf(fy)
    if (i < 0) continue
    const dt = f.dist_total[i]
    const src = ctx.prices[sec] || {}
    const dates = Object.keys(src).sort()
    const lastP = LIVE?.[key]?.price ?? (dates.length ? src[dates[dates.length - 1]] : null)
    const un = lastNN(f.units_mn)
    if (dt != null && lastP != null && un != null) {
      dist += dt
      mcap += (lastP * un) / 10
    }
  }
  return mcap ? +((dist / mcap) * 100).toFixed(2) : null
}

/** Build the snapshot rows, ordered by (live-adjusted) market cap, each with a 1Y sparkline. */
export function buildSnapRows(ctx: BenchCtx, D: ReitData, LIVE: LivePrices | null): SnapRow[] {
  const rows = ctx.overview.map((r): SnapRow => {
    const key = KEY[r.security]
    const f = D.fin[key]
    const units = f ? lastNN(f.units_mn) : null
    const lv = LIVE?.[key]
    const liveMcap = lv && lv.price && units ? Math.round((lv.price * units) / 10) : null
    const mcap = liveMcap ?? r.mcap_cr
    // 1Y sparkline from the merged raw series + today's live quote
    const src = ctx.prices[r.security] || {}
    const dates = Object.keys(src).sort()
    let spark: number[] = []
    let lastPrice: number | null = null
    let chg1yPct: number | null = null
    let live = false
    if (dates.length) {
      const cut = new Date(dates[dates.length - 1])
      cut.setFullYear(cut.getFullYear() - 1)
      const cutS = cut.toISOString().slice(0, 10)
      spark = dates.filter((d) => d >= cutS).map((d) => src[d])
      if (lv && lv.price) {
        spark = spark.concat([lv.price])
        live = true
      }
      if (spark.length >= 2) {
        lastPrice = spark[spark.length - 1]
        chg1yPct = (lastPrice / spark[0] - 1) * 100
      } else {
        lastPrice = lv?.price ?? src[dates[dates.length - 1]]
      }
    }
    return {
      security: r.security,
      key,
      name: FULLNAME[r.security] || r.name,
      color: PALETTE[r.security] || '#93a1b3',
      mcap,
      areaMsf: r.area_msf,
      stake: r.stake,
      sponsor: r.sponsor,
      occupancy: r.occupancy ?? null,
      cagr: r.cagr ?? null,
      ipoYear: r.ipo ? r.ipo.slice(0, 4) : null,
      lastPrice,
      live,
      chg1yPct,
      spark,
    }
  })
  return rows.sort((a, b) => b.mcap - a.mcap)
}

// ─── security modal config for a domestic REIT (page-2 #smodal) ──────────────

const inUS = (v: number | null | undefined, d = 2): string =>
  v == null ? '–' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d })

/** Build the <SecurityModal> config for a domestic REIT, ported from v1 openSnap. */
export function buildReitSecModal(
  ctx: BenchCtx,
  D: ReitData,
  LIVE: LivePrices | null,
  sec: string,
): SecModalData {
  const key = KEY[sec]
  const f = D.fin[key]
  const meta = D.meta[key]
  const ov = ctx.overview.find((o) => o.security === sec)
  const met = ctx.metrics.find((m) => m.security === sec)
  const src = ctx.prices[sec] || {}
  const dates = Object.keys(src).sort()
  const lastD = dates[dates.length - 1]
  const lv = LIVE?.[key]
  const liveP = lv && lv.price ? lv.price : null
  const lastP = liveP ?? src[lastD]
  const units = lastNN(f.units_mn)
  const mcap = units && lastP ? (lastP * units) / 10 : null

  // 52-week high/low from the trailing year
  const cut = new Date(lastD)
  cut.setFullYear(cut.getFullYear() - 1)
  const yr = dates.filter((d) => d >= cut.toISOString().slice(0, 10)).map((d) => src[d])
  const hi52 = yr.length ? Math.max(...yr) : null
  const lo52 = yr.length ? Math.min(...yr) : null

  // ADTV 30d — traded units, from the live refresh, else derived from turnover ÷ price
  let adtvUnits: number | null = ctx.adtvUnits[sec] ?? null
  let adtvSrc = 'NSE+BSE'
  if (adtvUnits == null) {
    const tks = Object.keys(ctx.turnover[sec] || {}).sort().slice(-30)
    const us = tks
      .map((d) => {
        const t = ctx.turnover[sec][d]
        const p = ctx.FF[sec]?.[d]
        return t != null && p ? (t * 1e7) / p : null
      })
      .filter((v): v is number => v != null)
    if (us.length) {
      adtvUnits = us.reduce((a, b) => a + b, 0) / us.length
      adtvSrc = 'approx · Refresh for NSE+BSE'
    }
  }

  // yields & multiples (FY2026)
  const yi = f.years.indexOf('FY2026')
  const dist26 = yi >= 0 ? f.dist_total[yi] : null
  const ndcf26 = yi >= 0 ? f.ndcf[yi] : null
  const nav26 = yi >= 0 ? f.nav[yi] : null
  const distYield = dist26 && mcap ? (dist26 / mcap) * 100 : null
  const pNdcf = ndcf26 && mcap ? mcap / ndcf26 : null
  const navPD = nav26 && lastP ? (lastP / nav26 - 1) * 100 : met?.prem_disc != null ? met.prem_disc * 100 : null

  const mkt: StatPair[] = [
    ['Market cap', '₹' + inUS(mcap, 0) + ' cr'],
    ['Units outstanding', inUS(units, 1) + ' mn'],
    ['52-wk high', hi52 != null ? '₹' + inUS(hi52) : null],
    ['52-wk low', lo52 != null ? '₹' + inUS(lo52) : null],
    ['ADTV (30d)', adtvUnits != null ? inUS(adtvUnits / 1e5, 1) + ' lakh units (' + adtvSrc + ')' : null],
    ['Distribution yield (FY26)', distYield != null ? distYield.toFixed(2) + '%' : null],
    ['P / NDCF (FY26)', pNdcf != null ? pNdcf.toFixed(1) + '×' : null],
    ['NAV / unit', nav26 ? '₹' + inUS(nav26) : met?.nav ? '₹' + inUS(met.nav) : null],
    ['Premium/(disc.) to NAV', navPD != null ? navPD.toFixed(1) + '%' : null],
    ['FY27 fwd yield', met?.fy27_yield != null ? (met.fy27_yield * 100).toFixed(1) + '%' : null],
  ]
  const profile: StatPair[] = ov
    ? [
        ['Sponsor', ov.sponsor],
        ['Sponsor stake', ov.stake],
        ['Total area', ov.area_msf + ' msf'],
        ['Completed', ov.completed_msf + ' msf'],
        ['U/C + future dev', ov.uc_msf + ' msf'],
        ['Committed occupancy', ov.occupancy != null ? Math.round(ov.occupancy * 100) + '%' : null],
        ['Return since IPO (CAGR)', ov.cagr != null ? Math.round(ov.cagr * 100) + '%' : null],
        ['IPO', ov.ipo],
      ]
    : []

  return {
    title: meta ? meta.name : sec,
    codes: meta ? `NSE: ${meta.nse} · BSE: ${meta.bse} · listed ${meta.listed}` : '',
    ccy: 'INR',
    series: src,
    livePrice: liveP,
    liveTag: liveP ? 'live' + (LIVE?._asof ? ' · ' + LIVE._asof : '') : '',
    mkt,
    profile,
    profileTitle: 'Trust profile',
  }
}
