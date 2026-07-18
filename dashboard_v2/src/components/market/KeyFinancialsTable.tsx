/**
 * Market page — FY2026 key-financials comparison table across the six listed
 * REITs, reproducing the "Comparison" sheet of the key-financials workbook.
 * Rendered as DOM (exported via the Card "panel" SVG path).
 */
import type { KeyFin, KeyFinRow } from '../../types/data'

function cell(row: KeyFinRow, v: number | null, dashZero: boolean): string {
  if (v == null || (dashZero && v === 0)) return '—'
  switch (row.fmt) {
    case 'cr':
      return v.toLocaleString('en-IN', { maximumFractionDigits: 0 })
    case 'pct':
      return (100 * v).toFixed(1) + '%'
    case 'inr2':
      return v.toFixed(2)
    case 'num1':
      return v.toFixed(1)
  }
}

export function KeyFinancialsTable({ KF }: { KF: KeyFin }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px] tnum">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-wide text-subtle">
            <th className="py-2 pr-3 text-left font-medium">Metric</th>
            <th className="py-2 pr-3 text-left font-medium">Unit</th>
            {KF.cols.map((c) => (
              <th key={c} className="py-2 pl-3 text-right font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {KF.rows.map((r) => {
            const dashZero = KF.dash_zero.includes(r.metric)
            return (
              <tr key={r.metric} className="border-b border-border-soft text-ink transition-colors hover:bg-surface-2/60">
                <td className="py-1.5 pr-3 font-medium">{r.metric}</td>
                <td className="whitespace-nowrap py-1.5 pr-3 text-subtle">{r.unit}</td>
                {r.v.map((v, i) => (
                  <td key={i} className="py-1.5 pl-3 text-right">
                    {cell(r, v, dashZero)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="mt-2 space-y-0.5">
        {KF.footnotes.map((fn) => (
          <p key={fn} className="text-[10.5px] text-subtle">
            {fn}
          </p>
        ))}
      </div>
    </div>
  )
}
