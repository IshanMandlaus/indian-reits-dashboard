/**
 * One REIT snapshot card (v1 exhibit 1): market cap, live/last price with 1Y
 * change, a gradient sparkline, and key portfolio facts. Clicking opens the
 * full <SecurityModal> for that REIT.
 */
import { Sparkline } from '../charts/Sparkline'
import type { SnapRow } from '../../lib/bench'

const inr = (v: number | null, d = 0) =>
  v == null ? '–' : v.toLocaleString('en-IN', { maximumFractionDigits: d })

export function SnapshotCard({ row, onClick }: { row: SnapRow; onClick: () => void }) {
  const chg = row.chg1yPct
  return (
    <button
      onClick={onClick}
      style={{ borderTopColor: row.color }}
      className="flex flex-col rounded-[var(--radius-card)] border border-border border-t-[3px] bg-surface-2 px-4 py-3.5 text-left transition hover:border-accent"
    >
      <div className="text-[15px] font-bold leading-tight text-ink">{row.name}</div>
      <div className="mt-1.5 text-[18px] font-bold text-gold tnum">₹{inr(row.mcap)} cr</div>

      <div className="mt-0.5 mb-0.5 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink tnum">
          ₹{inr(row.lastPrice, 2)}
          {row.live && <span className="ml-1 text-[10px] font-normal text-subtle">live</span>}
        </span>
        {chg != null && (
          <span className={'text-[11.5px] font-semibold ' + (chg >= 0 ? 'text-pos' : 'text-neg')}>
            {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(1)}% 1Y
          </span>
        )}
      </div>

      <Sparkline points={row.spark} className="my-1.5" />

      <dl className="mt-1 space-y-1 text-[12px]">
        <Row l="Total area" v={`${row.areaMsf} msf`} />
        <Row l="Sponsor stake" v={row.stake || '–'} />
        <Row l="Sponsor" v={row.sponsor} right />
        <Row l="Committed occupancy" v={row.occupancy != null ? Math.round(row.occupancy * 100) + '%' : '–'} />
        <Row l="Return since IPO (CAGR)" v={row.cagr != null ? Math.round(row.cagr * 100) + '%' : '–'} />
        <Row l="IPO" v={row.ipoYear || '–'} />
      </dl>
    </button>
  )
}

function Row({ l, v, right }: { l: string; v: string; right?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted">{l}</dt>
      <dd className={'text-ink ' + (right ? 'max-w-[60%] text-right' : '')}>{v}</dd>
    </div>
  )
}
