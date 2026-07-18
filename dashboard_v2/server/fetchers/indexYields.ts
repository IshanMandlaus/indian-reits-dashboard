/**
 * Nifty index dividend yields → `index-yields.json`
 * `{asof, yields: {<index>: {fy: {FY2020: {date, dy}, …}, latest: {date, dy}}}}`.
 *
 * Source: niftyindices.com "P/E, P/B & Div Yield" historical report —
 * `POST /BackPage/getpepbHistoricaldataDBtoString` with a string-wrapped JSON
 * payload (`{cinfo: "{'name':…,'startDate':…,'endDate':…,'indexName':…}"}`,
 * dates `DD-Mon-YYYY`). The server caps each request at a 1-year range and
 * returns daily rows `{pe, pb, divYield, DATE: "31 Mar 2020"}`; `divYield`
 * can arrive without a leading zero (".33").
 *
 * FY-end yields never change once printed, so windows already present in the
 * cached JSON are skipped — a steady-state refresh makes only the two "latest"
 * requests. Cached data is only ever extended, never reduced.
 */
import { readJson, writeJsonAtomic } from '../lib/io.ts'
import { NSE_UA } from '../lib/nse.ts'
import type { FetchResult } from '../lib/types.ts'
import { nowStamp } from '../lib/types.ts'

const INDICES = ['NIFTY 50', 'NIFTY REALTY']
const FYS = ['FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025', 'FY2026']

interface YieldPoint { date: string; dy: number }
interface IndexYieldSeries { fy: Record<string, YieldPoint>; latest: YieldPoint | null }
interface IndexYieldsFile { asof: string; yields: Record<string, IndexYieldSeries> }

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MON_NUM: Record<string, string> = Object.fromEntries(MON.map((m, i) => [m, String(i + 1).padStart(2, '0')]))

/** Date → `DD-Mon-YYYY` (request format). */
const ddMonYyyy = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${MON[d.getMonth()]}-${d.getFullYear()}`

/** `"31 Mar 2020"` → `"2020-03-31"`; null if unparseable. */
function isoDate(s: string): string | null {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(s.trim())
  if (!m) return null
  const mm = MON_NUM[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()]
  return mm ? `${m[3]}-${mm}-${m[1].padStart(2, '0')}` : null
}

/** One report window; returns points sorted ascending by date. */
async function pepbWindow(index: string, start: string, end: string): Promise<YieldPoint[]> {
  const cinfo = `{'name':'${index}','startDate':'${start}','endDate':'${end}','indexName':'${index}'}`
  const res = await fetch('https://www.niftyindices.com/BackPage/getpepbHistoricaldataDBtoString', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': NSE_UA,
      Referer: 'https://www.niftyindices.com/reports/historical-data',
    },
    body: JSON.stringify({ cinfo }),
  })
  if (!res.ok) throw new Error(`niftyindices HTTP ${res.status}`)
  const rows = (await res.json()) as Array<Record<string, unknown>>
  const out: YieldPoint[] = []
  if (Array.isArray(rows)) {
    for (const r of rows) {
      const date = isoDate(String(r.DATE ?? ''))
      const dy = parseFloat(String(r.divYield ?? ''))
      if (date && Number.isFinite(dy)) out.push({ date, dy })
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function fetchIndexYields(dataDir: string): Promise<FetchResult> {
  const now = nowStamp()
  const cached = await readJson<IndexYieldsFile>(dataDir, 'index-yields')
  const yields: Record<string, IndexYieldSeries> = {}
  for (const idx of INDICES) {
    yields[idx] = {
      fy: { ...(cached?.yields?.[idx]?.fy ?? {}) },
      latest: cached?.yields?.[idx]?.latest ?? null,
    }
  }

  let fetched = 0
  let firstErr: string | null = null
  const attempt = async (idx: string, start: string, end: string): Promise<YieldPoint[]> => {
    try {
      const pts = await pepbWindow(idx, start, end)
      if (pts.length) fetched++
      return pts
    } catch (e) {
      firstErr ??= e instanceof Error ? e.message : String(e)
      return []
    } finally {
      await sleep(700)
    }
  }

  for (const idx of INDICES) {
    // FY-end points: last trading day ≤ 31 Mar, from a small window around it.
    for (const fy of FYS) {
      if (yields[idx].fy[fy]) continue // printed history never changes
      const y = Number('20' + fy.slice(4))
      const pts = await attempt(idx, `25-Mar-${y}`, `05-Apr-${y}`)
      const eod = pts.filter((p) => p.date <= `${y}-03-31`).pop()
      if (eod) yields[idx].fy[fy] = eod
    }
    // Latest print: trailing two weeks, newest row wins.
    const end = new Date()
    const start = new Date(end.getTime() - 14 * 864e5)
    const pts = await attempt(idx, ddMonYyyy(start), ddMonYyyy(end))
    const last = pts[pts.length - 1]
    if (last) yields[idx].latest = last
  }

  if (!fetched) {
    return { source: 'index-yields', ok: false, asof: null, count: 0, error: firstErr ?? 'no data from niftyindices' }
  }

  const count = INDICES.reduce((n, idx) => n + Object.keys(yields[idx].fy).length + (yields[idx].latest ? 1 : 0), 0)
  await writeJsonAtomic(dataDir, 'index-yields', { asof: now, yields } satisfies IndexYieldsFile)
  return { source: 'index-yields', ok: true, asof: now, count }
}
