/**
 * Domestic-REIT domain helpers, ported from v1 `dashboard.html`.
 * Date/NAV maths and last-price resolution.
 */
import type { ReitData, ReitKey, LivePrices } from '../types/data'

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
