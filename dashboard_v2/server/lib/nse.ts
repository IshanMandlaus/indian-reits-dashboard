/**
 * Cookie-primed NSE fetch session, ported from the Python `nse_session()` flow
 * used across `refresh_prices.py` / `refresh_holdings.py` / `refresh_market.py`.
 *
 * NSE's JSON APIs reject requests that don't carry the cookies its pages set, so
 * we GET the homepage (and any section-specific warm-up page) first, capture the
 * `Set-Cookie` headers into a jar with `Headers.getSetCookie()` (Node 18+/23 here),
 * and replay `Cookie` + a section/symbol `Referer` on every API call. Each response
 * may set more cookies — we merge those back into the jar as we go.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface NseSession {
  /** GET a URL, replaying cookies + the given (or default) Referer; merges new cookies. */
  get(url: string, opts?: { referer?: string; timeoutMs?: number }): Promise<Response>
  /** GET + parse JSON; returns `null` on any error or non-JSON body. */
  getJson<T = unknown>(url: string, opts?: { referer?: string; timeoutMs?: number }): Promise<T | null>
  /** Current default Referer sent with requests (mutable — some flows update it). */
  referer: string
}

/** Parse the `name=value` pair out of each Set-Cookie header and merge into `jar`. */
function mergeCookies(jar: Map<string, string>, res: Response): void {
  // getSetCookie() returns each Set-Cookie header line intact (Node 19.7+/undici).
  const setCookies =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : []
  for (const line of setCookies) {
    const pair = line.split(';', 1)[0]
    const eq = pair.indexOf('=')
    if (eq > 0) {
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (name) jar.set(name, value)
    }
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

async function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ac.signal })
  } finally {
    clearTimeout(t)
  }
}

/**
 * Prime a session against NSE. `warmups` are extra pages to hit after the homepage
 * (e.g. the unit-holding listing page) so the target API's cookies are in scope.
 */
export async function createNseSession(warmups: string[] = []): Promise<NseSession> {
  const jar = new Map<string, string>()
  const base = 'https://www.nseindia.com'
  let referer = `${base}/`

  const baseHeaders = () => ({
    'User-Agent': UA,
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  })

  const rawGet = async (url: string, ref: string, timeoutMs: number): Promise<Response> => {
    const headers: Record<string, string> = { ...baseHeaders(), Referer: ref }
    const cookie = cookieHeader(jar)
    if (cookie) headers.Cookie = cookie
    const res = await timedFetch(url, { headers, redirect: 'follow' }, timeoutMs)
    mergeCookies(jar, res)
    return res
  }

  // Prime: homepage sets the core cookies.
  try {
    await rawGet(base, referer, 10_000)
    await sleep(800)
  } catch {
    /* keep going — the API may still answer, or a fallback source covers it */
  }
  for (const w of warmups) {
    try {
      await rawGet(w, referer, 10_000)
      await sleep(600)
    } catch {
      /* non-fatal */
    }
  }

  const session: NseSession = {
    get referer() {
      return referer
    },
    set referer(v: string) {
      referer = v
    },
    async get(url, o) {
      return rawGet(url, o?.referer ?? referer, o?.timeoutMs ?? 12_000)
    },
    async getJson<T>(url: string, o?: { referer?: string; timeoutMs?: number }) {
      try {
        const res = await rawGet(url, o?.referer ?? referer, o?.timeoutMs ?? 12_000)
        if (!res.ok) return null
        const text = await res.text()
        return JSON.parse(text) as T
      } catch {
        return null
      }
    },
  }
  return session
}

export { UA as NSE_UA }
