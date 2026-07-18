/**
 * Per-country panels (v1 cgrid): each country's headline note plus a table of its
 * top listed REITs with live price, market cap and share of the country market.
 * Clicking a row opens the full <SecurityModal>.
 */
import type { Global, GlobalLive } from '../../types/data'
import { countryRows, fmtUSD } from '../../lib/global'

export function CountryPanels({
  G,
  LIVE,
  onOpen,
}: {
  G: Global
  LIVE: GlobalLive | null
  onOpen: (ckey: string, ri: number) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {G.countries.map((c) => {
        const rows = countryRows(G, LIVE, c.key)
        return (
          <div key={c.key} className="rounded-[var(--radius-card)] border border-border bg-surface-2 px-3.5 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold text-ink">
                {c.flag} {c.name}
              </span>
              <span className="text-[11px] text-muted">{c.count}</span>
            </div>
            <p className="mb-2 mt-1 text-[11.5px] leading-relaxed text-muted">{c.note}</p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-border py-1.5 pr-2 text-left font-semibold">REIT</th>
                  <th className="border-b border-border py-1.5 px-1 text-right font-semibold">Last price</th>
                  <th className="border-b border-border py-1.5 px-1 text-right font-semibold">Mkt cap</th>
                  <th className="border-b border-border py-1.5 pl-1 text-right font-semibold">% mkt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.ri}
                    onClick={() => onOpen(c.key, r.ri)}
                    className="cursor-pointer transition hover:bg-accent/[0.07]"
                  >
                    <td className="border-b border-border-soft py-1.5 pr-2 align-top">
                      <div className="text-ink">{r.name}</div>
                      <div className="text-[10px] text-subtle">
                        {r.ticker} · {r.sector}
                        {r.sponsor ? ' · ' + r.sponsor : ''}
                      </div>
                    </td>
                    <td className="border-b border-border-soft py-1.5 px-1 text-right align-top whitespace-nowrap tnum text-ink">
                      {r.price != null ? fmtUSD(r.price) + ' ' + (r.ccy || '') : '–'}
                      {r.live && <span className="ml-0.5 text-[9px] text-pos">●</span>}
                    </td>
                    <td className="border-b border-border-soft py-1.5 px-1 text-right align-top whitespace-nowrap tnum text-muted">
                      {r.mcapBn != null ? '$' + fmtUSD(r.mcapBn, 1) + ' bn' : '–'}
                    </td>
                    <td className="border-b border-border-soft py-1.5 pl-1 text-right align-top whitespace-nowrap tnum text-muted">
                      {r.pctOfMkt != null ? r.pctOfMkt.toFixed(1) + '%' : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
