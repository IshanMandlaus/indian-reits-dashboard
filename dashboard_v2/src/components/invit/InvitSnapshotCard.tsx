/**
 * One InvIT snapshot card (v1 exhibit): enterprise value, live/last price with
 * change over the loaded history, a gradient sparkline, and trust facts. Clicking
 * opens the full <SecurityModal>. Mirrors the Market SnapshotCard shape.
 */
import { Sparkline } from '../charts/Sparkline'
import type { InvitTrust } from '../../types/data'

const inr = (v: number | null | undefined, d = 2): string =>
  v == null ? '–' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d })

export function InvitSnapshotCard({
  trust,
  closes,
  onClick,
}: {
  trust: InvitTrust
  closes: number[]
  onClick: () => void
}) {
  const hasSpark = closes.length >= 2
  const lastP = hasSpark ? closes[closes.length - 1] : trust.px_ref
  const chg = hasSpark ? (closes[closes.length - 1] / closes[0] - 1) * 100 : null
  const yld = trust.dpu_fy26 && lastP ? ((trust.dpu_fy26 / lastP) * 100).toFixed(1) + '%' : null

  return (
    <button
      onClick={onClick}
      style={{ borderTopColor: trust.color }}
      className="flex flex-col rounded-[var(--radius-card)] border border-border border-t-[3px] bg-surface-2 px-4 py-3.5 text-left transition hover:border-accent"
    >
      <div className="text-[14.5px] font-bold leading-tight text-ink">{trust.name}</div>
      <div className="mt-1.5 text-[17px] font-bold text-gold tnum">EV ₹{inr(trust.ev_cr, 0)} cr</div>

      <div className="mt-0.5 mb-0.5 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink tnum">₹{inr(lastP)}</span>
        {chg != null && (
          <span className={'text-[11.5px] font-semibold ' + (chg >= 0 ? 'text-pos' : 'text-neg')}>
            {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(1)}%
          </span>
        )}
      </div>

      {hasSpark ? (
        <Sparkline points={closes} className="my-1.5" />
      ) : (
        <div className="my-1.5 flex h-[46px] items-center text-[11px] text-subtle">
          No price history — hit ⟳ Refresh
        </div>
      )}

      <dl className="mt-1 space-y-1 text-[12px]">
        <Row l="Sponsor" v={trust.sponsor} right />
        <Row l="Sector" v={trust.sector} right />
        <Row l="Assets" v={trust.assets} right />
        <Row l="NAV / unit" v={'₹' + inr(trust.nav)} />
        <Row l="FY26 DPU · yield" v={trust.dpu_fy26 ? '₹' + trust.dpu_fy26 + ' · ' + yld : '–'} />
        <Row l="Last distribution" v={trust.last_dpu} right />
        <Row l="Listed · NSE" v={trust.listed + ' · ' + trust.nse} />
      </dl>

      <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{trust.note}</p>
    </button>
  )
}

function Row({ l, v, right }: { l: string; v: string; right?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted">{l}</dt>
      <dd className={'text-ink ' + (right ? 'max-w-[62%] text-right' : '')}>{v}</dd>
    </div>
  )
}
