/**
 * Domestic-REIT domain helpers, ported from v1 `dashboard.html`.
 * Date/NAV maths, last-price resolution, and the per-REIT/per-chart insight
 * lines — all computed from a REIT's own numbers so each reads differently.
 */
import type { ReitData, ReitKey, LivePrices } from '../types/data'
import { inr } from './format'

export const REIT_KEYS: ReitKey[] = ['embassy', 'mindspace', 'brookfield', 'nexus', 'krt', 'bagmane']

export const REIT_SHORT: Record<ReitKey, string> = {
  embassy: 'Embassy',
  mindspace: 'Mindspace',
  brookfield: 'Brookfield',
  nexus: 'Nexus',
  krt: 'Knowledge (KRT)',
  bagmane: 'Bagmane',
}

/** Source valuation-report label per REIT (shown in the annexure modal). */
export const VALREP: Record<ReitKey, string> = {
  embassy: 'Embassy full valuation report, Mar 2026 (iVAS)',
  mindspace: 'Mindspace detailed valuation report, Q4 FY26 (KVPL)',
  brookfield: 'Brookfield summary valuation report, Mar 2026',
  nexus: 'Nexus detailed valuation report, Q4 FY26 (C&W)',
  krt: 'KRT detailed valuation report, Mar 2026 (iVAS)',
  bagmane: 'Bagmane valuation report (IPO, values as at Dec 2025)',
}

const DAY = 864e5

// ─── date helpers ───────────────────────────────────────────────────────────
/** Indian FY label → 31 Mar of that FY (e.g. "FY2022" → 31 Mar 2022). */
export const fyTs = (fy: string): number => new Date(+fy.slice(2, 6), 2, 31).getTime()
export const dTs = (d: string): number => new Date(d).getTime()
/** Quarterly period "2022-09" → ~quarter end (28th of the month). */
export const perTs = (per: string): number =>
  new Date(+per.slice(0, 4), +per.slice(5, 7) - 1, 28).getTime()
export const fmtM = (ts: number): string =>
  new Date(ts).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

// ─── NAV / price ────────────────────────────────────────────────────────────
export interface NavPoint {
  ts: number
  nav: number
}

/** Stepped NAV/unit series: FY NAVs plus any distinct quarterly NAV marks. */
export function navSteps(D: ReitData, k: ReitKey): NavPoint[] {
  const f = D.fin[k]
  const pts: NavPoint[] = f.years
    .map((y, i) => ({ ts: fyTs(y), nav: f.nav[i] }))
    .filter((p): p is NavPoint => p.nav != null)
  ;(f.q || []).forEach((x) => {
    if (x.nav != null && !pts.some((p) => Math.abs(p.ts - perTs(x.per)) < 40 * DAY)) {
      pts.push({ ts: perTs(x.per), nav: x.nav })
    }
  })
  return pts.sort((a, b) => a.ts - b.ts)
}

/** Latest reported NAV/unit at or before `ts`. */
export function navAt(D: ReitData, k: ReitKey, ts: number): number | null {
  const s = navSteps(D, k)
  if (!s.length) return null
  let last: number | null = null
  for (const p of s) if (p.ts <= ts) last = p.nav
  return last != null ? last : s[0].nav
}

export interface LastPrice {
  price: number | null
  asof: string
  live: boolean
}

/** Live price if available, else the last historical close. */
export function lastPrice(D: ReitData, LIVE: LivePrices | null, k: ReitKey): LastPrice {
  const lv = LIVE?.[k]
  if (lv && lv.price) return { price: lv.price, asof: lv.asof || 'live', live: true }
  const p = D.prices[k]
  if (p && p.length) return { price: p[p.length - 1][1], asof: p[p.length - 1][0], live: false }
  return { price: null, asof: '', live: false }
}

// ─── insights ───────────────────────────────────────────────────────────────
/** HTML strings (with <b>) keyed by chart id; rendered via dangerouslySetInnerHTML. */
export interface Insights {
  c1: string
  c2: string
  c3: string
  c4: string
  c5: string
  c6: string
  c7: string
}

const lastNN = (a: (number | null)[]): [number, number | null] => {
  for (let i = (a || []).length - 1; i >= 0; i--) if (a[i] != null) return [i, a[i]]
  return [-1, null]
}
const firstNN = (a: (number | null)[]): [number, number | null] => {
  for (let i = 0; i < (a || []).length; i++) if (a[i] != null) return [i, a[i]]
  return [-1, null]
}
/** Magnitude-only percent (no sign). */
const ap = (x: number | null, d = 0): string =>
  x == null ? '–' : (Math.abs(x) * 100).toFixed(d) + '%'
const cagr = (a: number | null, b: number | null, n: number): number | null =>
  a != null && b != null && a > 0 && b > 0 && n > 0 ? Math.pow(b / a, 1 / n) - 1 : null

/** Compute the seven insight lines for a REIT — faithful port of v1 buildInsights. */
export function buildInsights(D: ReitData, LIVE: LivePrices | null, k: ReitKey): Insights {
  const f = D.fin[k]
  const m = D.meta[k]
  const nm = m.name.replace(/ REIT$/, '').replace(/ Office Parks/, '').trim()
  const lp = lastPrice(D, LIVE, k)
  const nav = navAt(D, k, Date.now())
  const pd = lp.price && nav ? lp.price / nav - 1 : null
  const [gi, gav] = lastNN(f.gav)
  const units = gi >= 0 ? f.units_mn[gi] : null
  const [, ndcf] = lastNN(f.ndcf)
  const yld = ndcf && gav ? ndcf / gav : null
  const [, debt] = lastNN(f.gross_debt)
  const [, nw] = lastNN(f.networth)
  const ltv = debt && gav ? debt / gav : null
  const eqShare = debt != null && nw != null ? nw / (nw + debt) : null
  const [dfi, dpu0] = firstNN(f.dpu)
  const [dli, dpu1] = lastNN(f.dpu)
  const dpuCagr = cagr(dpu0, dpu1, dli - dfi)
  const [rfi, rev0] = firstNN(f.revenue)
  const [rli, rev1] = lastNN(f.revenue)
  const revCagr = cagr(rev0, rev1, rli - rfi)
  const conv = ndcf && rev1 ? ndcf / rev1 : null
  const [gfi, gav0] = firstNN(f.gav)
  const gavCagr = cagr(gav0, gav, gi - gfi)
  const bv = D.bv[k] || {}
  const yy = gi >= 0 ? f.years[gi] : null
  const r = yy ? bv[yy] : null
  const bookTot = r ? (r.inv_prop || 0) + (r.ipud || 0) + (r.ppe || 0) + (r.cwip || 0) : null
  const bvpu = bookTot && units ? (bookTot * 10) / units : null
  const fvpu = gav && units ? (gav * 10) / units : null
  const fvbv = bvpu && fvpu ? fvpu / bvpu - 1 : null
  const spv = (D.spv[k] || []).slice().sort((a, b) => (b.value_cr || 0) - (a.value_cr || 0))
  const tot = spv.reduce((s, x) => s + (x.value_cr || 0), 0)
  const top1 = tot ? (spv[0].value_cr || 0) / tot : null
  const top3 = tot
    ? ((spv[0]?.value_cr || 0) + (spv[1]?.value_cr || 0) + (spv[2]?.value_cr || 0)) / tot
    : null

  const dpuWord =
    dpuCagr == null
      ? null
      : dpuCagr >= 0.08
        ? `DPU has compounded <b>${ap(dpuCagr)}/yr</b> since listing`
        : dpuCagr >= 0.02
          ? `DPU has grown <b>${ap(dpuCagr)}/yr</b>`
          : dpuCagr >= -0.005
            ? `DPU has been <b>broadly flat</b> (${ap(dpuCagr)}/yr)`
            : `DPU has edged <b>down ${ap(dpuCagr)}/yr</b>`
  const revWord =
    revCagr == null
      ? 'grown'
      : revCagr >= 0.15
        ? `compounded <b>${ap(revCagr)}/yr</b>`
        : `grown <b>${ap(revCagr)}/yr</b>`
  const gearWord =
    ltv == null
      ? ''
      : ltv < 0.15
        ? 'very conservatively geared'
        : ltv < 0.25
          ? 'conservatively geared'
          : ltv < 0.35
            ? 'moderately geared'
            : 'more geared than peers'

  return {
    c1:
      pd == null
        ? `${nm}’s traded price against its ₹${nav ? inr(nav, 0) : '—'} reported NAV.`
        : `At ${inr(lp.price, 0)} the units trade at a <b>${ap(pd, 1)} ${pd >= 0 ? 'premium' : 'discount'}</b> to the ${inr(nav, 0)} NAV — ${pd >= 0 ? 'the market is paying up for the assets' : 'the market marks them below the appraiser’s value'}${dpuWord ? `. ${dpuWord}` : ''}.`,
    c2:
      fvbv == null
        ? `Issuance and block-deal prints marked against the NAV line for ${nm}.`
        : fvbv > 1.5
          ? `Book value/unit sits <b>far below</b> appraised value — much of ${nm}’s base is development or newly-formed stock still carried near cost, so the headline gap overstates realised accretion.`
          : `Assets carry a <b>${ap(fvbv)} embedded revaluation gain</b> over book: they enter at cost and mark up over time, so the shaded gap — not the unit price — is the accretion signal.`,
    c3:
      gav == null
        ? `Appraised GAV versus real-estate assets carried on the balance sheet.`
        : `Fair value has reached <b>${inr(gav)} cr</b>${bookTot ? `, ${ap(fvbv)} above the ${inr(bookTot)} cr book` : ''}${gavCagr ? `; GAV has grown <b>${ap(gavCagr)}/yr</b>` : ''}.`,
    c4:
      rev1 == null
        ? `Revenue against distributable cash for ${nm}.`
        : `Top line has ${revWord} to <b>${inr(rev1)} cr</b>${ndcf ? `, converting <b>${ap(conv)}</b> into ${inr(ndcf)} cr of distributable cash` : ''}.`,
    c5:
      yld == null
        ? `Cash yield fills in once quarterly NDCF is loaded for ${nm}.`
        : `The portfolio throws off a <b>${ap(yld, 1)}</b> cash yield on GAV (asset-level NDCF÷GAV; distribution yield on the traded price runs higher).`,
    c6:
      ltv == null
        ? `Debt versus unitholders’ equity in the capital stack.`
        : `Debt is <b>${ap(ltv)} of GAV</b> with equity ${eqShare != null ? `<b>${ap(eqShare)}</b> of the stack` : 'carrying the rest'} — ${gearWord}, ${ltv < 0.49 ? 'inside' : 'against'} the 49% SEBI ceiling.`,
    c7:
      top1 == null
        ? `Asset-by-asset value for ${nm}.`
        : `<b>${spv[0].asset}</b> alone is <b>${ap(top1)}</b> of portfolio value; the top three assets are <b>${ap(top3)}</b>, spread across ${spv.length} holdings — ${top3 != null && top3 >= 0.6 ? 'a concentrated book' : top3 != null && top3 >= 0.45 ? 'a moderately spread book' : 'a well-diversified book'}.`,
  }
}
