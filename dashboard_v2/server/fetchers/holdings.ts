/**
 * Per-REIT unit-holding pattern → `holdings.json`
 * `{key:{symbol,quarters:[{date,label,sponsor,public,emp}]}, _asof}`.
 *
 * Port of the working `dashboard/refresh_holdings.py`. For a REIT, NSE's
 * "unit-holding pattern" filing is Sponsor & Sponsor Group vs Public, disclosed
 * quarterly, at:
 *   GET /api/corporate-unit-holdings-master?index=reits&symbol=<SYM>&issuer=<full name>
 * The equities `corporate-share-holdings-master` endpoint is empty for REITs — this
 * REITs-segment endpoint (with the exact issuer name) is the one that returns data.
 * Writes only if at least one REIT resolved.
 */
import { writeJsonAtomic } from '../lib/io.ts'
import type { NseSession } from '../lib/nse.ts'
import type { FetchResult } from '../lib/types.ts'
import { nowStamp } from '../lib/types.ts'

// (trading symbol, full issuer name exactly as NSE lists it).
const REITS: Record<string, [string, string]> = {
  embassy: ['EMBASSY', 'Embassy Office Parks REIT'],
  mindspace: ['MINDSPACE', 'Mindspace Business Parks REIT'],
  brookfield: ['BIRET', 'Brookfield India Real Estate Trust'],
  nexus: ['NXST', 'Nexus Select Trust'],
  krt: ['KRT', 'Knowledge Realty Trust'],
  bagmane: ['BAGMANE', 'Bagmane Prime Office REIT'],
}

const MAX_QUARTERS = 8
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const MONTHS: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}

const SPONSOR_KEYS = ['sponsorGroupPer', 'pr_and_prgrp', 'sponsorAndSponsorGroup', 'sponsor']
const PUBLIC_KEYS = ['publicHoldingPer', 'public_val', 'public', 'publicVal']
const DATE_KEYS = ['asOnDate', 'date', 'as_on_date', 'filePeriodDate', 'submissionDate']
const EMP_KEYS = ['employeeTrusts', 'employee_trusts', 'nonPromoterNonPublic']

function num(v: unknown): number | null {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

/** '31-DEC-2025' → ['2025-12-31', 'Dec 2025']; [null, null] on failure. */
function parseDate(s: string): [string, string] | [null, null] {
  try {
    const [d, mon, y] = s.trim().toUpperCase().split('-')
    const month = MONTHS[mon.slice(0, 3)]
    if (!month) return [null, null]
    const iso = `${String(+y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(+d).padStart(2, '0')}`
    const label = `${mon.slice(0, 1)}${mon.slice(1, 3).toLowerCase()} ${+y}`
    return [iso, label]
  } catch {
    return [null, null]
  }
}

function firstKey(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] != null && row[k] !== '') return row[k]
  }
  return null
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (payload && typeof payload === 'object') {
    for (const k of ['data', 'shareHoldings', 'records', 'rows']) {
      const v = (payload as Record<string, unknown>)[k]
      if (Array.isArray(v)) return v as Record<string, unknown>[]
    }
  }
  return []
}

interface Quarter { date: string; label: string; sponsor: number; public: number; emp: number }

async function nseHoldings(s: NseSession, symbol: string, issuer: string): Promise<Quarter[]> {
  const quoteUrl = `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`
  // Visit the symbol's quote page first so the API call carries a symbol-scoped Referer.
  await s.get(quoteUrl).catch(() => undefined)
  await sleep(400)
  const url =
    'https://www.nseindia.com/api/corporate-unit-holdings-master' +
    `?index=reits&symbol=${encodeURIComponent(symbol)}&issuer=${encodeURIComponent(issuer)}`
  const payload = await s.getJson(url, { referer: quoteUrl })
  const rows = extractRows(payload)
  const quarters: Quarter[] = []
  for (const row of rows) {
    const [iso, label] = parseDate(String(firstKey(row, DATE_KEYS) ?? ''))
    const sponsor = num(firstKey(row, SPONSOR_KEYS))
    const pub = num(firstKey(row, PUBLIC_KEYS))
    if (iso == null || label == null || sponsor == null || pub == null) continue
    quarters.push({ date: iso, label, sponsor, public: pub, emp: num(firstKey(row, EMP_KEYS)) ?? 0 })
  }
  // newest first, de-duplicated by as-on date, capped.
  quarters.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const seen = new Set<string>()
  const deduped: Quarter[] = []
  for (const q of quarters) {
    if (seen.has(q.date)) continue
    seen.add(q.date)
    deduped.push(q)
  }
  return deduped.slice(0, MAX_QUARTERS)
}

export async function fetchHoldings(dataDir: string, s: NseSession | null): Promise<FetchResult> {
  const now = nowStamp()
  if (!s) {
    return { source: 'holdings', ok: false, asof: null, count: 0, error: 'no NSE session' }
  }
  const out: Record<string, unknown> = {}
  let count = 0
  for (const [key, [sym, issuer]] of Object.entries(REITS)) {
    const quarters = await nseHoldings(s, sym, issuer).catch(() => [] as Quarter[])
    if (quarters.length) {
      out[key] = { symbol: sym, quarters }
      count++
    }
    await sleep(800)
  }
  if (count === 0) {
    return { source: 'holdings', ok: false, asof: null, count: 0, error: 'no unit-holding data (NSE blocked or empty)' }
  }
  out._asof = now
  await writeJsonAtomic(dataDir, 'holdings', out)
  return { source: 'holdings', ok: true, asof: now, count }
}
