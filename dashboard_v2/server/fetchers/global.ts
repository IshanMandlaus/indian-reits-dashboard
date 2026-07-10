/**
 * Global REIT quotes + 5y history → `global-live.json` `{asof,quotes,hist}`.
 * Port of `dashboard/refresh_global.py`. The ticker set is derived from
 * `global.json` the same way `src/lib/global.ts` `rowSym` does: for each `top5`
 * row, the quote symbol is element [3] if it's a string, else element [1].
 * Per-ticker try/catch — C-REIT `.SS/.SZ` tickers may 404 on Yahoo and are skipped.
 * Writes only if at least one quote resolved.
 */
import { readJson, writeJsonAtomic } from '../lib/io.ts'
import { chartSeries, quoteOne, yearsAgo } from '../lib/yahoo.ts'
import type { FetchResult } from '../lib/types.ts'
import { nowStamp } from '../lib/types.ts'

type Top5Row = [string, string, string, string | null, string]
type SectorReit = [string, string, string, number]
interface GlobalData {
  top5: Record<string, Top5Row[]>
  sector_reits?: Record<string, SectorReit[]>
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** The top-5 quote symbols (matches rowSym in the app) — these also get 5y history. */
function top5Tickers(g: GlobalData): Set<string> {
  const set = new Set<string>()
  for (const rows of Object.values(g.top5 ?? {})) {
    for (const row of rows) {
      const sym = typeof row[3] === 'string' ? row[3] : row[1]
      if (sym) set.add(sym)
    }
  }
  return set
}

/** Every ticker needing a live quote: top-5 rows + the per-sector REIT roster. */
function tickersFrom(g: GlobalData): string[] {
  const set = top5Tickers(g)
  for (const rows of Object.values(g.sector_reits ?? {})) {
    for (const row of rows) if (row[1]) set.add(row[1])
  }
  return Array.from(set).sort()
}

export async function fetchGlobal(dataDir: string): Promise<FetchResult> {
  const now = nowStamp()
  const g = await readJson<GlobalData>(dataDir, 'global')
  if (!g || !g.top5) {
    return { source: 'global', ok: false, asof: null, count: 0, error: 'global.json missing/invalid' }
  }
  const quotes: Record<string, unknown> = {}
  const hist: Record<string, Record<string, number>> = {}
  let count = 0
  const histSet = top5Tickers(g) // 5y history only for the top-5 (drives the click-through chart)
  for (const tk of tickersFrom(g)) {
    try {
      const q = await quoteOne(tk)
      if (q.price != null) {
        quotes[tk] = { price: q.price, ccy: q.ccy, mcap: q.mcap }
        count++
      }
    } catch {
      /* skip this ticker */
    }
    if (histSet.has(tk)) {
      try {
        const { px } = await chartSeries(tk, yearsAgo(5))
        if (Object.keys(px).length) hist[tk] = px
      } catch {
        /* skip history for this ticker */
      }
    }
    await sleep(300)
  }
  if (count === 0) {
    return { source: 'global', ok: false, asof: null, count: 0, error: 'no quotes from Yahoo' }
  }

  // Union each ticker's history with the cached file (fresh wins on shared dates) so a
  // thin fetch never shrinks a ticker's click-through chart. Quotes stay point-in-time.
  const cached = await readJson<{ hist?: Record<string, Record<string, number>> }>(dataDir, 'global-live')
  if (cached?.hist) {
    for (const [tk, ser] of Object.entries(cached.hist)) {
      hist[tk] = { ...ser, ...(hist[tk] ?? {}) }
    }
  }

  await writeJsonAtomic(dataDir, 'global-live', { asof: now, quotes, hist })
  return { source: 'global', ok: true, asof: now, count }
}
