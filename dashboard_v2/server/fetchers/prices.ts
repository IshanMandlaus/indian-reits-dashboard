/**
 * Live REIT prices → `live-prices.json` `{key:{price,asof,src}, _asof}`.
 * Port of `dashboard/refresh_prices.py`: NSE `quote-equity` first, BSE
 * `StockReachGraph` fallback. Writes only if at least one REIT resolved.
 */
import { writeJsonAtomic } from '../lib/io.ts'
import { NSE_UA } from '../lib/nse.ts'
import type { NseSession } from '../lib/nse.ts'
import type { FetchResult } from '../lib/types.ts'
import { nowStamp } from '../lib/types.ts'

// BSE scrip codes verified Jul 2026 (KRT 544481, Bagmane 544758).
const REITS: Record<string, { nse: string; bse: string }> = {
  embassy: { nse: 'EMBASSY', bse: '542602' },
  mindspace: { nse: 'MINDSPACE', bse: '543217' },
  brookfield: { nse: 'BIRET', bse: '543261' },
  nexus: { nse: 'NXST', bse: '543913' },
  krt: { nse: 'KRT', bse: '544481' },
  bagmane: { nse: 'BAGMANE', bse: '544758' },
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const round2 = (n: number) => Math.round(n * 100) / 100

async function nseQuote(s: NseSession, symbol: string): Promise<number | null> {
  const j = await s.getJson<{ priceInfo?: { lastPrice?: number } }>(
    `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`,
  )
  const p = j?.priceInfo?.lastPrice
  return p != null && Number.isFinite(p) ? Number(p) : null
}

async function bseQuote(scrip: string): Promise<number | null> {
  const url =
    'https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w' +
    `?scripcode=${scrip}&flag=0&fromdate=&todate=&seriesid=`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': NSE_UA, Referer: 'https://www.bseindia.com/' },
    })
    if (!res.ok) return null
    const j = (await res.json()) as { CurrVal?: string | number; PrevClose?: string | number }
    const p = j.CurrVal ?? j.PrevClose
    return p != null && p !== '' && Number.isFinite(Number(p)) ? Number(p) : null
  } catch {
    return null
  }
}

export async function fetchPrices(dataDir: string, s: NseSession | null): Promise<FetchResult> {
  const now = nowStamp()
  const out: Record<string, unknown> = {}
  let count = 0
  for (const [key, ids] of Object.entries(REITS)) {
    let price: number | null = null
    let src: string | null = null
    if (s) {
      price = await nseQuote(s, ids.nse).catch(() => null)
      if (price != null) src = 'NSE'
      await sleep(800)
    }
    if (price == null) {
      price = await bseQuote(ids.bse)
      if (price != null) src = 'BSE'
    }
    if (price != null) {
      out[key] = { price: round2(price), asof: now, src }
      count++
    }
  }
  if (count === 0) {
    return { source: 'prices', ok: false, asof: null, count: 0, error: 'no prices from NSE or BSE' }
  }
  out._asof = now
  await writeJsonAtomic(dataDir, 'live-prices', out)
  return { source: 'prices', ok: true, asof: now, count }
}
