/** Indian-locale currency, e.g. ₹1,23,456. */
export function inr(v: number | null | undefined, dec = 0): string {
  if (v == null || Number.isNaN(v)) return '–'
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: dec })
}

/** Compact ₹ crore / lakh-crore for large figures. */
export function inrCr(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '–'
  if (Math.abs(v) >= 1e5) return '₹' + (v / 1e5).toFixed(2) + ' L Cr'
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' Cr'
}

/** Signed percentage from a ratio (0.152 → +15.2%). */
export function pct(v: number | null | undefined, dec = 1): string {
  if (v == null || Number.isNaN(v)) return '–'
  return (v >= 0 ? '+' : '') + (100 * v).toFixed(dec) + '%'
}

/** Signed percentage from an already-scaled percent value (15.2 → +15.2%). */
export function pctRaw(v: number | null | undefined, dec = 1): string {
  if (v == null || Number.isNaN(v)) return '–'
  return (v >= 0 ? '+' : '') + v.toFixed(dec) + '%'
}

export function fmtMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}
