/**
 * Per-REIT unit-holding pattern → `holdings.json`
 * `{key:{symbol,quarters:[{date,label,sponsor,public,emp,detail?}]}, _asof}`.
 *
 * Port of the working `dashboard/refresh_holdings.py`. For a REIT, NSE's
 * "unit-holding pattern" filing is Sponsor & Sponsor Group vs Public, disclosed
 * quarterly, at:
 *   GET /api/corporate-unit-holdings-master?index=reits&symbol=<SYM>&issuer=<full name>
 * The equities `corporate-share-holdings-master` endpoint is empty for REITs — this
 * REITs-segment endpoint (with the exact issuer name) is the one that returns data.
 *
 * Each master row also links the filing's XBRL (`xbrlFilePath` on
 * nsearchives.nseindia.com — plain fetch, no cookie session needed). That file
 * carries the full breakdown — sponsor-group entities with per-entity stakes,
 * institutions/non-institutions categories, top-5 public unitholders — parsed by
 * `lib/uhpXbrl.ts` into each quarter's optional `detail`. XBRLs are immutable
 * per ndsID and cached under `server/.cache/uhp/`, so only new filings hit the
 * network on later refreshes. Writes only if at least one REIT resolved.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeJsonAtomic } from '../lib/io.ts'
import type { NseSession } from '../lib/nse.ts'
import { NSE_UA } from '../lib/nse.ts'
import type { FetchResult } from '../lib/types.ts'
import { nowStamp } from '../lib/types.ts'
import { parseUhpXbrl, type SponsorGroupLabels } from '../lib/uhpXbrl.ts'
import type { QuarterDetail } from '../../src/types/data.ts'

// (trading symbol, full issuer name exactly as NSE lists it).
const REITS: Record<string, [string, string]> = {
  embassy: ['EMBASSY', 'Embassy Office Parks REIT'],
  mindspace: ['MINDSPACE', 'Mindspace Business Parks REIT'],
  brookfield: ['BIRET', 'Brookfield India Real Estate Trust'],
  nexus: ['NXST', 'Nexus Select Trust'],
  krt: ['KRT', 'Knowledge Realty Trust'],
  bagmane: ['BAGMANE', 'Bagmane Prime Office REIT'],
}

// Sponsor-group label per Indian/Foreign side of the filing's sponsor category
// (each side maps 1:1 to a sponsor group for every listed REIT; 0% sides are
// dropped by the parser, so Embassy's post-exit quarters show one group).
const SPONSOR_GROUPS: Record<string, SponsorGroupLabels> = {
  embassy: { indian: 'Embassy Sponsor', foreign: 'Blackstone' },
  mindspace: { indian: 'K Raheja Corp group' },
  brookfield: { foreign: 'Brookfield' },
  nexus: { foreign: 'Blackstone' },
  krt: { indian: 'Sattva group', foreign: 'Blackstone' },
  bagmane: { indian: 'Bagmane group' },
}

const CACHE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'uhp')

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

interface Quarter {
  date: string
  label: string
  sponsor: number
  public: number
  emp: number
  detail?: QuarterDetail
}

/** XBRL for ndsID from disk cache, else nsearchives (immutable → cache forever). */
async function loadXbrl(ndsID: string, url: string): Promise<string | null> {
  const cached = path.join(CACHE_DIR, `${ndsID}.xml`)
  try {
    return await fs.readFile(cached, 'utf8')
  } catch {
    /* cache miss */
  }
  try {
    const res = await timedXbrlFetch(url)
    if (!res.ok) return null
    const xml = await res.text()
    if (!xml.includes('<in-capmkt:')) return null
    await fs.mkdir(CACHE_DIR, { recursive: true })
    await fs.writeFile(cached, xml, 'utf8')
    await sleep(400) // pace archive requests; cache hits skip this entirely
    return xml
  } catch {
    return null
  }
}

async function timedXbrlFetch(url: string): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), 15_000)
  try {
    return await fetch(url, { headers: { 'User-Agent': NSE_UA }, signal: ac.signal })
  } finally {
    clearTimeout(t)
  }
}

async function nseHoldings(
  s: NseSession,
  symbol: string,
  issuer: string,
  groupLabels: SponsorGroupLabels,
): Promise<Quarter[]> {
  const quoteUrl = `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`
  // Visit the symbol's quote page first so the API call carries a symbol-scoped Referer.
  await s.get(quoteUrl).catch(() => undefined)
  await sleep(400)
  const url =
    'https://www.nseindia.com/api/corporate-unit-holdings-master' +
    `?index=reits&symbol=${encodeURIComponent(symbol)}&issuer=${encodeURIComponent(issuer)}`
  const payload = await s.getJson(url, { referer: quoteUrl })
  const rows = extractRows(payload)
  const quarters: (Quarter & { _xbrl?: [string, string] })[] = []
  for (const row of rows) {
    const [iso, label] = parseDate(String(firstKey(row, DATE_KEYS) ?? ''))
    const sponsor = num(firstKey(row, SPONSOR_KEYS))
    const pub = num(firstKey(row, PUBLIC_KEYS))
    if (iso == null || label == null || sponsor == null || pub == null) continue
    const ndsID = String(row.ndsID ?? '')
    const xbrl = String(row.xbrlFilePath ?? '')
    quarters.push({
      date: iso,
      label,
      sponsor,
      public: pub,
      emp: num(firstKey(row, EMP_KEYS)) ?? 0,
      _xbrl: ndsID && xbrl.startsWith('https://') ? [ndsID, xbrl] : undefined,
    })
  }
  // Newest first, FULL history (no cap — the panel shows every filed quarter).
  // De-duplicate by label (month + year): NSE re-files a revised pattern for the
  // same quarter, and newest-first order means the latest revision wins; a genuine
  // mid-quarter event filing (e.g. "May 2026" after an offering) has its own label
  // and is kept.
  quarters.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const seen = new Set<string>()
  const deduped: (Quarter & { _xbrl?: [string, string] })[] = []
  for (const q of quarters) {
    if (seen.has(q.label)) continue
    seen.add(q.label)
    deduped.push(q)
  }
  // Enrich each kept quarter from its filing's XBRL; failures just leave the
  // quarter without `detail` (the panel falls back to the 2-way split).
  for (const q of deduped) {
    if (!q._xbrl) continue
    const xml = await loadXbrl(q._xbrl[0], q._xbrl[1])
    if (xml) {
      const detail = parseUhpXbrl(xml, groupLabels)
      if (detail) q.detail = detail
    }
    delete q._xbrl
  }
  return deduped.map(({ _xbrl: _drop, ...q }) => q)
}

export async function fetchHoldings(dataDir: string, s: NseSession | null): Promise<FetchResult> {
  const now = nowStamp()
  if (!s) {
    return { source: 'holdings', ok: false, asof: null, count: 0, error: 'no NSE session' }
  }
  const out: Record<string, unknown> = {}
  let count = 0
  for (const [key, [sym, issuer]] of Object.entries(REITS)) {
    const quarters = await nseHoldings(s, sym, issuer, SPONSOR_GROUPS[key] ?? {}).catch(
      () => [] as Quarter[],
    )
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
