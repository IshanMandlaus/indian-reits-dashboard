/**
 * Section 7 — SPV / asset table. Groups assets by holding entity (SPV), shows
 * value + % of portfolio FV and the annexure page count, and opens the annexure
 * modal on row click. Ported from v1 spvTable().
 */
import type { ReitData, ReitKey, ReitSpv, Annexures } from '../../types/data'
import { inr } from '../../lib/format'

interface Group {
  spv: string
  assets: (ReitSpv & { _i: number })[]
}

export function SpvTable({
  D,
  k,
  annexures,
  onOpen,
}: {
  D: ReitData
  k: ReitKey
  annexures: Annexures | null
  onOpen: (asset: ReitSpv) => void
}) {
  const rows = D.spv[k] || []
  const tot = rows.reduce((s, a) => s + (a.value_cr || 0), 0)

  const groups: Group[] = []
  rows.forEach((a, i) => {
    const key = (a.spv || '–').trim()
    let g = groups.find((x) => x.spv === key)
    if (!g) {
      g = { spv: key, assets: [] }
      groups.push(g)
    }
    g.assets.push({ ...a, _i: i })
  })

  const pageCount = (asset: string) => annexures?.[k]?.[asset]?.length || 0

  // GAV vs asset-list total sanity check
  const f = D.fin[k]
  let gav: number | null = null
  f.years.forEach((_, i) => {
    if (f.gav[i] != null) gav = f.gav[i]
  })
  const mismatch = gav && Math.abs(tot - gav) / gav > 0.05

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px] tnum">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-subtle">
            <th className="py-2 pr-3 font-medium">SPV / holding entity</th>
            <th className="py-2 pr-3 font-medium">Asset</th>
            <th className="py-2 pr-3 font-medium">Type · City</th>
            <th className="py-2 pr-3 text-right font-medium">Leasable msf</th>
            <th className="py-2 pr-3 text-right font-medium">Value (NPV, ₹ cr)</th>
            <th className="py-2 pr-3 text-right font-medium">% of FV</th>
            <th className="py-2 text-right font-medium">Annexure</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const gv = g.assets.reduce((s, a) => s + (a.value_cr || 0), 0)
            return g.assets.map((a, j) => (
              <tr
                key={a._i}
                onClick={() => onOpen(rows[a._i])}
                className="cursor-pointer border-b border-border-soft text-ink transition-colors hover:bg-surface-2/60"
              >
                {j === 0 && (
                  <td rowSpan={g.assets.length} className="py-2 pr-3 align-top border-r border-border-soft">
                    <span className="font-semibold text-ink" title={g.spv}>
                      {g.spv}
                    </span>
                    {g.assets.length > 1 && (
                      <div className="mt-0.5 text-[10.5px] text-subtle">
                        {g.assets.length} assets · {inr(gv)} cr · {((100 * gv) / tot).toFixed(1)}%
                      </div>
                    )}
                  </td>
                )}
                <td className="py-2 pr-3 font-medium" title={a.asset}>
                  {a.asset}
                </td>
                <td className="py-2 pr-3 text-muted">
                  {a.type || ''} · {a.city || ''}
                </td>
                <td className="py-2 pr-3 text-right">{a.leasable_msf != null ? (+a.leasable_msf).toFixed(1) : '–'}</td>
                <td className="py-2 pr-3 text-right">{a.value_cr != null ? inr(a.value_cr) : '–'}</td>
                <td className="py-2 pr-3 text-right">{a.value_cr != null ? ((100 * a.value_cr) / tot).toFixed(2) + '%' : '–'}</td>
                <td className="py-2 text-right text-accent">{pageCount(a.asset) ? pageCount(a.asset) + ' pages ↗' : '–'}</td>
              </tr>
            ))
          })}
          <tr className="border-t border-border font-semibold text-ink">
            <td colSpan={4} className="py-2 pr-3">
              Total
            </td>
            <td className="py-2 pr-3 text-right">{inr(tot)}</td>
            <td className="py-2 pr-3 text-right">100.00%</td>
            <td />
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-subtle">
        NPV = valuer market value (DCF). Click an asset row to open the valuation-report pages for that asset.
      </p>
      {mismatch && (
        <p className="mt-1 text-[11px] text-gold">
          ⚠ Asset-list total ({inr(tot)} cr) differs from headline GAV ({inr(gav)} cr) — tracker may be missing recent
          acquisitions or uses an earlier valuation date.
        </p>
      )}
    </div>
  )
}
