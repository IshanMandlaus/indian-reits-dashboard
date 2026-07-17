/**
 * InvITs domain helpers, ported from v1 `invits.html`.
 *
 * The three listed InvITs' daily price series live only in `bench-live.json`
 * (`updates` → "NHIT InvIT" / "Raajmarg InvIT" / "PGInvIT"); `bench.json` carries
 * none. `makeBenchCtx` already merges those live prices (scale-consistent) into
 * `ctx.prices` and forward-fills them over the NIFTY calendar, and exposes their
 * ADTV via `ctx.adtvUnits` — so this module reuses `BenchCtx` and never touches
 * the broken-scale live turnover. Series are emitted as `{x,y}` points for the
 * reusable <TimeSeriesChart>.
 */
import type { DateMap, InvitTrust, ReitData } from '../types/data'
import type { SecModalData, StatPair } from '../components/charts/SecurityModal'
import { type BenchCtx, type Pt, KEY, REIT_SECS } from './bench'

const dTs = (d: string): number => new Date(d).getTime()

/** InvIT key → the security name it trades under in `bench-live` updates. */
export const INVIT_SEC: Record<string, string> = {
  nhit: 'NHIT InvIT',
  riit: 'Raajmarg InvIT',
  pginvit: 'PGInvIT',
}

/** Raw merged (live-applied) daily close series for a trust. */
export function invitPx(ctx: BenchCtx, key: string): DateMap {
  return ctx.prices[INVIT_SEC[key]] || {}
}

/** Sorted close values for a trust (for the sparkline). */
export function invitCloses(ctx: BenchCtx, key: string): number[] {
  const s = invitPx(ctx, key)
  return Object.keys(s)
    .sort()
    .map((d) => s[d])
}

/** Last traded close, falling back to the trust's reference price. */
export function lastInvitPx(ctx: BenchCtx, t: InvitTrust): number {
  const s = invitPx(ctx, t.key)
  const dd = Object.keys(s).sort()
  return dd.length ? s[dd[dd.length - 1]] : t.px_ref
}

/** True once any trust has more than a single close loaded (i.e. Refresh ran). */
export function invitHasData(ctx: BenchCtx, trusts: InvitTrust[]): boolean {
  return trusts.some((t) => Object.keys(invitPx(ctx, t.key)).length > 1)
}

/** Absolute unit-price series for a trust as `{x,y}` points. */
export function invitPricePts(ctx: BenchCtx, key: string): Pt[] {
  const s = invitPx(ctx, key)
  return Object.keys(s)
    .sort()
    .map((d) => ({ x: dTs(d), y: s[d] }))
}

/** Independent-valuation NAV/unit history as `{x,y}` points (empty if not curated). */
export function invitNavPts(t: InvitTrust): Pt[] {
  return (t.nav_hist ?? []).map(([d, v]) => ({ x: dTs(d), y: v }))
}

/** Earliest listing date across the given trusts — the rebased-chart window start. */
export function invitFrom(ctx: BenchCtx, keys: string[]): string {
  let min: string | null = null
  for (const k of keys) {
    const dd = Object.keys(invitPx(ctx, k)).sort()
    if (dd.length && (!min || dd[0] < min)) min = dd[0]
  }
  return min || ctx.CAL[0] || ''
}

/** The NIFTY trading calendar restricted to the rebased-chart window. */
export function invitCal(ctx: BenchCtx, from: string): string[] {
  return ctx.CAL.filter((d) => d >= from)
}

/** One trust rebased to 100 at its OWN first close, over the window calendar. */
export function invitOwnLine(ctx: BenchCtx, key: string, cal: string[]): Pt[] {
  const sec = INVIT_SEC[key]
  const s = ctx.prices[sec] || {}
  const dd = Object.keys(s).sort()
  if (!dd.length) return []
  const base = s[dd[0]]
  const out: Pt[] = []
  for (const d of cal) {
    const v = ctx.FF[sec]?.[d]
    if (v != null && base) out.push({ x: dTs(d), y: (v / base) * 100 })
  }
  return out
}

/**
 * Equal-weight InvIT basket rebased to 100 — each trust rebased to its own first
 * close, then averaged across the trusts trading on each date (so the basket
 * grows as each trust lists). Matches v1's `basket`/`rebCommon`.
 */
export function invitBasket(ctx: BenchCtx, keys: string[], cal: string[]): Pt[] {
  const base: Record<string, number | null> = {}
  const sec: Record<string, string> = {}
  for (const k of keys) {
    sec[k] = INVIT_SEC[k]
    const dd = Object.keys(ctx.prices[sec[k]] || {}).sort()
    base[k] = dd.length ? ctx.prices[sec[k]][dd[0]] : null
  }
  const out: Pt[] = []
  for (const d of cal) {
    let sum = 0
    let n = 0
    for (const k of keys) {
      const v = ctx.FF[sec[k]]?.[d]
      const b = base[k]
      if (v != null && b) {
        sum += (v / b) * 100
        n++
      }
    }
    if (n) out.push({ x: dTs(d), y: sum / n })
  }
  return out
}

/**
 * Indian REITs combined FY26 trailing distribution yield (%), computed the same
 * way as the Market page's distribution chart (ΣFY26 distributions ÷ Σ end-of-year
 * market cap). Replaces v1's hard-coded 5.9% placeholder on the yield bar.
 */
export function combinedReitYieldFY26(D: ReitData): number | null {
  let dist = 0
  let mcap = 0
  for (const sec of REIT_SECS) {
    const f = D.fin[KEY[sec]]
    const i = f.years.indexOf('FY2026')
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

const inr = (v: number | null | undefined, d = 2): string =>
  v == null ? '–' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d })

/** Build the <SecurityModal> config for a trust (ported from v1 `openTrust`). */
export function buildInvitSecModal(ctx: BenchCtx, t: InvitTrust): SecModalData {
  const series = invitPx(ctx, t.key)
  const dates = Object.keys(series).sort()
  const lastP = dates.length ? series[dates[dates.length - 1]] : t.px_ref

  // 52-week high/low from the trailing year of closes
  let hi: number | null = null
  let lo: number | null = null
  if (dates.length) {
    const cut = new Date(dates[dates.length - 1])
    cut.setFullYear(cut.getFullYear() - 1)
    const cutS = cut.toISOString().slice(0, 10)
    const yr = dates.filter((d) => d >= cutS).map((d) => series[d])
    if (yr.length) {
      hi = Math.max(...yr)
      lo = Math.min(...yr)
    }
  }

  // ADTV 30d — traded units straight from the live refresh (bench-live adtv_units).
  const adtvUnits = ctx.adtvUnits[INVIT_SEC[t.key]] ?? null
  const yld = t.dpu_fy26 && lastP ? ((t.dpu_fy26 / lastP) * 100).toFixed(2) + '%' : null
  const pd = t.nav && lastP ? ((lastP / t.nav - 1) * 100).toFixed(1) + '%' : null

  const mkt: StatPair[] = [
    ['Enterprise value', '₹' + inr(t.ev_cr, 0) + ' cr'],
    ['NAV / unit', '₹' + inr(t.nav)],
    ['Premium/(disc.) to NAV', pd],
    ['FY26 DPU', t.dpu_fy26 ? '₹' + t.dpu_fy26 : null],
    ['Trailing cash yield', yld],
    ['Last distribution', t.last_dpu],
    ['52-wk high', hi != null ? '₹' + inr(hi) : null],
    ['52-wk low', lo != null ? '₹' + inr(lo) : null],
    ['ADTV (30d)', adtvUnits != null ? inr(adtvUnits / 1e5, 1) + ' lakh units (NSE+BSE)' : null],
  ]
  const profile: StatPair[] = [
    ['Sponsor', t.sponsor],
    ['Sector', t.sector],
    ['Assets', t.assets],
  ]

  return {
    title: t.name,
    codes: 'NSE: ' + t.nse + ' · listed ' + t.listed,
    ccy: 'INR',
    series,
    livePrice: null,
    liveTag: dates.length ? 'to ' + dates[dates.length - 1] : '',
    mkt,
    profile,
    profileTitle: 'Trust profile',
  }
}
