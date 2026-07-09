/**
 * Orchestrates the four ported fetchers for one `POST /api/refresh`.
 *
 * Two lanes run concurrently (`Promise.allSettled`):
 *   - NSE lane   — one primed cookie session, sequential: prices → holdings.
 *   - Yahoo lane — sequential: market → global (market may spin up its own NSE
 *                  session for its fallback path).
 * Each fetcher is individually try/caught and writes its JSON only if it got
 * data, so one failing source leaves its cached file intact.
 */
import { createNseSession } from './lib/nse.ts'
import type { FetchResult } from './lib/types.ts'
import { fetchPrices } from './fetchers/prices.ts'
import { fetchHoldings } from './fetchers/holdings.ts'
import { fetchMarket } from './fetchers/market.ts'
import { fetchGlobal } from './fetchers/global.ts'

async function guard(source: FetchResult['source'], fn: () => Promise<FetchResult>): Promise<FetchResult> {
  try {
    return await fn()
  } catch (e) {
    return { source, ok: false, asof: null, count: 0, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function runAll(dataDir: string): Promise<FetchResult[]> {
  const nseLane = async (): Promise<FetchResult[]> => {
    // One shared, cookie-primed session (with the unit-holding listing warm-up).
    let s = null
    try {
      s = await createNseSession([
        'https://www.nseindia.com/companies-listing/corporate-filings-unitholding-pattern',
      ])
    } catch {
      s = null
    }
    const prices = await guard('prices', () => fetchPrices(dataDir, s))
    const holdings = await guard('holdings', () => fetchHoldings(dataDir, s))
    return [prices, holdings]
  }

  const yahooLane = async (): Promise<FetchResult[]> => {
    const market = await guard('market', () => fetchMarket(dataDir))
    const global = await guard('global', () => fetchGlobal(dataDir))
    return [market, global]
  }

  const settled = await Promise.allSettled([nseLane(), yahooLane()])
  const results: FetchResult[] = []
  for (const s of settled) {
    if (s.status === 'fulfilled') results.push(...s.value)
  }
  // Stable order for the UI: prices, holdings, market, global.
  const order: Record<FetchResult['source'], number> = { prices: 0, holdings: 1, market: 2, global: 3 }
  results.sort((a, b) => order[a.source] - order[b.source])
  return results
}
