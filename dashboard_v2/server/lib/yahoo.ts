/**
 * Thin wrapper over `yahoo-finance2` — the maintained Node equivalent of the
 * Python `yfinance` path the v1 refresh scripts used. It handles Yahoo's
 * cookie+crumb+retry internally.
 *
 *   chartSeries(symbol, period1) → { px:{date:close}, to:{date: volume*close/1e7} }
 *   quoteOne(symbol)             → { price, ccy, mcap }
 *   avgVolume(symbol, days)      → 30-day average traded volume (units)
 *
 * `validateResult:false` on every call so Yahoo schema drift degrades to a soft
 * miss instead of throwing; notices/version-check are silenced.
 */
import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
  validation: { logErrors: false },
  versionCheck: false,
})

const NO_VALIDATE = { validateResult: false } as const

// `chart()` with validateResult:false returns `unknown`; this is the subset we read.
interface ChartQuote {
  date: Date | string | number
  close: number | null
  volume: number | null
}
interface ChartResult {
  quotes?: ChartQuote[]
}

/** Format a Date as `YYYY-MM-DD` in UTC (matches the Python `strftime('%Y-%m-%d')`). */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** now − `years` years, as a Date (for `period1`). */
export function yearsAgo(years: number): Date {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d
}

/** now − `days` days, as a Date. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

export interface Series {
  px: Record<string, number>
  to: Record<string, number>
}

/**
 * Daily closes + (≈turnover in ₹cr) for one Yahoo symbol from `period1` to today.
 * Skips rows with a null close (Yahoo's partial current-day bar).
 */
export async function chartSeries(symbol: string, period1: Date | string): Promise<Series> {
  const res = (await yf.chart(symbol, { period1, interval: '1d' }, NO_VALIDATE)) as ChartResult
  const px: Record<string, number> = {}
  const to: Record<string, number> = {}
  for (const q of res.quotes ?? []) {
    const c = q.close
    if (c == null || !Number.isFinite(c)) continue
    const day = isoDay(q.date instanceof Date ? q.date : new Date(q.date))
    px[day] = round2(c)
    const v = q.volume
    if (v != null && Number.isFinite(v) && v > 0) {
      to[day] = round2((v * c) / 1e7)
    }
  }
  return { px, to }
}

export interface Quote {
  price: number | null
  ccy: string | null
  mcap: number | null
}

/** Latest price / currency / market cap for one symbol. */
export async function quoteOne(symbol: string): Promise<Quote> {
  const q = await yf.quote(symbol, {}, NO_VALIDATE)
  const price = q?.regularMarketPrice
  return {
    price: price != null && Number.isFinite(price) ? round2(price) : null,
    ccy: q?.currency ?? null,
    mcap: q?.marketCap != null && Number.isFinite(q.marketCap) ? q.marketCap : null,
  }
}

/**
 * 30-day average traded VOLUME (units) for one symbol, computed from ~3 months of
 * daily history (mirrors the Python `yf_avg_volume`). `null` if no usable rows.
 */
export async function avgVolume(symbol: string, days = 30): Promise<number | null> {
  const res = (await yf.chart(symbol, { period1: daysAgo(95), interval: '1d' }, NO_VALIDATE)) as ChartResult
  const vols = (res.quotes ?? [])
    .map((q) => q.volume)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
    .slice(-days)
  if (!vols.length) return null
  return Math.round(vols.reduce((a, b) => a + b, 0) / vols.length)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
