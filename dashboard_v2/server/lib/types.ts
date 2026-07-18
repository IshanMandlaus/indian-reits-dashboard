/** Per-source outcome returned by every fetcher and surfaced in the API response. */
export interface FetchResult {
  source: 'prices' | 'holdings' | 'market' | 'global' | 'index-yields'
  ok: boolean
  asof: string | null
  count: number
  error?: string
}

/** `DD Mon YYYY HH:MM` timestamp, matching the Python `strftime('%d %b %Y %H:%M')`. */
export function nowStamp(): string {
  const d = new Date()
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())} ${mon} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
