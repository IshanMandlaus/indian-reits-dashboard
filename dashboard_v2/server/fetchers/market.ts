/**
 * Benchmark + REIT/InvIT market data → `bench-live.json`
 * `{asof, sensex, updates, turnover_updates, adtv_units, adtv_detail}`.
 * Port of `dashboard/refresh_market.py`.
 *
 * Per series the cascade is: Yahoo `chartSeries` over a candidate symbol list
 * (keep the richest, stop once ≥5 rows) → NSE fallback (`indicesHistory` for
 * indices, `securityArchives?series=ALL` for REIT/InvIT units) → BSE
 * `GetSensexHistoricalData` for SENSEX only.
 *
 * ADTV = 30-day average traded VOLUME summed across BOTH exchanges a name lists
 * on (`.NS` + `.BO`) — that NSE+BSE sum is the true daily liquidity; the per-leg
 * split is kept in `adtv_detail`.
 *
 * `turnover_updates` is still written for shape parity even though `src/lib/bench.ts`
 * intentionally ignores it (it would collapse the workbook-basis MA lines). Do NOT
 * change `bench.ts`.
 */
import { readJson, writeJsonAtomic } from '../lib/io.ts'
import { createNseSession, NSE_UA } from '../lib/nse.ts'
import type { NseSession } from '../lib/nse.ts'
import { avgVolume, chartSeries, yearsAgo } from '../lib/yahoo.ts'
import type { FetchResult } from '../lib/types.ts'
import { nowStamp } from '../lib/types.ts'

type Kind = 'index' | 'reit'
interface Cfg { yahoo: string | string[]; nse: string | null; kind: Kind }

// security name (bench.json) -> { yahoo, nse (symbol or index name), kind }
const SERIES: Record<string, Cfg> = {
  'NIFTY 50': { yahoo: '^NSEI', nse: 'NIFTY 50', kind: 'index' },
  'NIFTY REALTY': { yahoo: '^CNXREALTY', nse: 'NIFTY REALTY', kind: 'index' },
  SENSEX: { yahoo: '^BSESN', nse: null, kind: 'index' },
  'Embassy REIT': { yahoo: 'EMBASSY.NS', nse: 'EMBASSY', kind: 'reit' },
  'Mindspace REIT': { yahoo: 'MINDSPACE.NS', nse: 'MINDSPACE', kind: 'reit' },
  'Brookfield REIT': { yahoo: 'BIRET.NS', nse: 'BIRET', kind: 'reit' },
  'Nexus Select Trust': { yahoo: 'NXST.NS', nse: 'NXST', kind: 'reit' },
  // newer listings: Yahoo's NSE feed lacks them; its BSE feed uses NAME.BO symbols
  'Knowledge Realty Trust': { yahoo: ['KRT.BO', 'KRT.NS'], nse: 'KRT', kind: 'reit' },
  'Bagmane REIT': { yahoo: ['BAGMANE.BO', 'BAGMANE.NS'], nse: 'BAGMANE', kind: 'reit' },
  // page 3 — InvITs (treated like listed securities on NSE)
  'NHIT InvIT': { yahoo: ['NHIT.BO', 'NHIT.NS'], nse: 'NHIT', kind: 'reit' },
  'Raajmarg InvIT': { yahoo: ['RIIT.BO', 'RIIT.NS'], nse: 'RIIT', kind: 'reit' },
  PGInvIT: { yahoo: 'PGINVIT.NS', nse: 'PGINVIT', kind: 'reit' },
}

// Yahoo symbols to sum for 30-day average traded VOLUME (units): NSE + BSE legs.
// ADTV is a volume measure, so we count units traded on BOTH exchanges a name lists on.
const ADTV_SYMBOLS: Record<string, string[]> = {
  'Embassy REIT': ['EMBASSY.NS', 'EMBASSY.BO'],
  'Mindspace REIT': ['MINDSPACE.NS', 'MINDSPACE.BO'],
  'Brookfield REIT': ['BIRET.NS', 'BIRET.BO'],
  'Nexus Select Trust': ['NXST.NS', 'NXST.BO'],
  'Knowledge Realty Trust': ['KRT.NS', 'KRT.BO'],
  'Bagmane REIT': ['BAGMANE.NS', 'BAGMANE.BO'],
  'NHIT InvIT': ['NHIT.NS', 'NHIT.BO'],
  'Raajmarg InvIT': ['RIIT.NS', 'RIIT.BO'],
  PGInvIT: ['PGINVIT.NS', 'PGINVIT.BO'],
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const round2 = (n: number) => Math.round(n * 100) / 100
type PxTo = { px: Record<string, number>; to: Record<string, number> }
const nKeys = (o: Record<string, unknown>) => Object.keys(o).length

/** period1 for a series: SENSEX → 6y, index → 1y, reit/invit → 2018-01-01. */
function period1For(sec: string, kind: Kind): Date | string {
  if (sec === 'SENSEX') return yearsAgo(6)
  if (kind === 'reit') return '2018-01-01'
  return yearsAgo(1)
}

// ---- NSE fallbacks (indices + securityArchives) ----

const pad = (n: number) => String(n).padStart(2, '0')
const ddmmyyyy = (d: Date) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`

/** 88-day [from,to] windows (DD-MM-YYYY) spanning the last `daysBack` days. */
function chunks(daysBack: number): [string, string][] {
  const end = new Date()
  const out: [string, string][] = []
  let cur = new Date(end.getTime() - daysBack * 86_400_000)
  while (cur < end) {
    const nxt = new Date(Math.min(cur.getTime() + 88 * 86_400_000, end.getTime()))
    out.push([ddmmyyyy(cur), ddmmyyyy(nxt)])
    cur = new Date(nxt.getTime() + 86_400_000)
  }
  return out
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

/** 'DD-Mon-YYYY' → 'YYYY-MM-DD'; falls back to the leading 10 chars. */
function normNseDate(s: string): string {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(s.trim())
  if (m) {
    const mm = MONTHS[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()]
    if (mm) return `${m[3]}-${mm}-${m[1]}`
  }
  return s.slice(0, 10)
}

async function nseIndexHistory(s: NseSession, indexName: string, daysBack = 400): Promise<PxTo> {
  const px: Record<string, number> = {}
  for (const [f, t] of chunks(daysBack)) {
    const url =
      'https://www.nseindia.com/api/historical/indicesHistory' +
      `?indexType=${encodeURIComponent(indexName)}&from=${f}&to=${t}`
    const j = await s.getJson<{ data?: { indexCloseOnlineRecords?: Array<Record<string, unknown>> } }>(url)
    const recs = j?.data?.indexCloseOnlineRecords ?? []
    for (const rec of recs) {
      const d = String(rec.EOD_TIMESTAMP ?? '').slice(0, 10)
      const v = rec.EOD_CLOSE_INDEX_VAL
      if (d && v != null && Number.isFinite(Number(v))) px[d] = round2(Number(v))
    }
    await sleep(700)
  }
  return { px, to: {} }
}

async function nseReitHistory(s: NseSession, symbol: string, daysBack = 400): Promise<PxTo> {
  const px: Record<string, number> = {}
  const to: Record<string, number> = {}
  for (const [f, t] of chunks(daysBack)) {
    const url =
      'https://www.nseindia.com/api/historical/securityArchives' +
      `?from=${f}&to=${t}&symbol=${encodeURIComponent(symbol)}` +
      '&dataType=priceVolumeDeliverable&series=ALL'
    const j = await s.getJson<{ data?: Array<Record<string, unknown>> }>(url)
    for (const rec of j?.data ?? []) {
      const d = normNseDate(String(rec.mTIMESTAMP ?? rec.CH_TIMESTAMP ?? ''))
      const c = rec.CH_CLOSING_PRICE
      const tv = rec.CH_TOT_TRADED_VAL
      if (d && c != null && Number.isFinite(Number(c))) {
        px[d] = round2(Number(c))
        if (tv != null && Number.isFinite(Number(tv))) to[d] = round2(Number(tv) / 1e7)
      }
    }
    await sleep(700)
  }
  return { px, to }
}

// ---- BSE fallback for SENSEX ----
async function bseSensex(): Promise<PxTo> {
  const res = await fetch(
    'https://api.bseindia.com/BseIndiaAPI/api/GetSensexHistoricalData/w?period=5Y',
    { headers: { 'User-Agent': NSE_UA, Referer: 'https://www.bseindia.com/' } },
  )
  if (!res.ok) throw new Error(`BSE sensex HTTP ${res.status}`)
  const arr = (await res.json()) as Array<Record<string, unknown>>
  const px: Record<string, number> = {}
  if (Array.isArray(arr)) {
    for (const rec of arr) {
      const d = String(rec.dtTm ?? '').slice(0, 10)
      const v = rec.vale1 ?? rec.close
      if (d && v != null && Number.isFinite(Number(v))) px[d] = round2(Number(v))
    }
  }
  if (!nKeys(px)) throw new Error('BSE sensex returned no rows')
  return { px, to: {} }
}

export async function fetchMarket(dataDir: string): Promise<FetchResult> {
  const now = nowStamp()
  const live = {
    asof: now,
    sensex: {} as Record<string, number>,
    updates: {} as Record<string, Record<string, number>>,
    turnover_updates: {} as Record<string, Record<string, number>>,
    adtv_units: {} as Record<string, number>,
    adtv_detail: {} as Record<string, Record<string, number>>,
  }

  let ns: NseSession | null = null
  let nseBlocked = false
  const ensureNse = async (): Promise<NseSession | null> => {
    if (nseBlocked) return null
    if (!ns) {
      try {
        ns = await createNseSession(['https://www.nseindia.com/report-detail/eq_security'])
        ns.referer = 'https://www.nseindia.com/report-detail/eq_security'
      } catch {
        nseBlocked = true
        return null
      }
    }
    return ns
  }

  for (const [sec, cfg] of Object.entries(SERIES)) {
    let px: Record<string, number> = {}
    let to: Record<string, number> = {}
    const p1 = period1For(sec, cfg.kind)

    // 1. Yahoo — try each candidate, keep the richest, stop once we have enough.
    const cands = Array.isArray(cfg.yahoo) ? cfg.yahoo : [cfg.yahoo]
    for (const sym of cands) {
      try {
        const r = await chartSeries(sym, p1)
        if (nKeys(r.px) > nKeys(px)) {
          px = r.px
          to = r.to
        }
        if (nKeys(px) >= 5) break
      } catch {
        /* try next candidate / fallback */
      }
    }

    // 2. NSE fallback for thin/failed series.
    if (nKeys(px) < 5 && cfg.nse) {
      const s = await ensureNse()
      if (s) {
        try {
          const r = cfg.kind === 'index' ? await nseIndexHistory(s, cfg.nse) : await nseReitHistory(s, cfg.nse)
          if (nKeys(r.px) > nKeys(px)) {
            px = r.px
            to = r.to
          }
        } catch {
          nseBlocked = true
        }
      }
    }

    // 3. BSE fallback for SENSEX only.
    if (!nKeys(px) && sec === 'SENSEX') {
      try {
        const r = await bseSensex()
        px = r.px
        to = r.to
      } catch {
        /* leave empty */
      }
    }

    if (nKeys(px)) {
      if (sec === 'SENSEX') {
        live.sensex = px
      } else {
        live.updates[sec] = px
        if (nKeys(to)) live.turnover_updates[sec] = to
      }
    }
    await sleep(1000)
  }

  // ---- ADTV pass: 30-day average traded VOLUME (units), NSE + BSE summed ----
  for (const [sec, syms] of Object.entries(ADTV_SYMBOLS)) {
    const detail: Record<string, number> = {}
    let total = 0
    for (const sym of syms) {
      let v: number | null = null
      try {
        v = await avgVolume(sym)
      } catch {
        v = null
      }
      if (v) {
        detail[sym.endsWith('.BO') ? 'BSE' : 'NSE'] = v
        total += v
      }
    }
    if (total) {
      live.adtv_units[sec] = total
      live.adtv_detail[sec] = detail
    }
    await sleep(500)
  }

  const seriesCount = nKeys(live.updates) + (nKeys(live.sensex) ? 1 : 0)
  if (seriesCount === 0 && !nKeys(live.adtv_units)) {
    return { source: 'market', ok: false, asof: null, count: 0, error: 'no series from Yahoo/NSE/BSE' }
  }

  // Never let a thin fetch REDUCE coverage. Thin names (e.g. NHIT/RIIT) can return
  // only a day or two from Yahoo on a given run; unioning each series with the
  // cached bench-live (fresh values win on shared dates) means the live history only
  // ever grows across refreshes instead of getting clobbered back to a single point.
  type Live = typeof live
  const cached = await readJson<Live>(dataDir, 'bench-live')
  if (cached) {
    live.sensex = { ...(cached.sensex ?? {}), ...live.sensex }
    for (const [k, ser] of Object.entries(cached.updates ?? {})) {
      live.updates[k] = { ...ser, ...(live.updates[k] ?? {}) }
    }
    for (const [k, ser] of Object.entries(cached.turnover_updates ?? {})) {
      live.turnover_updates[k] = { ...ser, ...(live.turnover_updates[k] ?? {}) }
    }
    for (const [k, v] of Object.entries(cached.adtv_units ?? {})) {
      if (live.adtv_units[k] == null) {
        live.adtv_units[k] = v
        if (cached.adtv_detail?.[k]) live.adtv_detail[k] = cached.adtv_detail[k]
      }
    }
  }

  await writeJsonAtomic(dataDir, 'bench-live', live)
  return { source: 'market', ok: true, asof: now, count: seriesCount }
}
