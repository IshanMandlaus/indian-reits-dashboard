import { Card } from '../ui/Card'
import type { Holdings, HoldingQuarter, ReitKey } from '../../types/data'

/**
 * Unit-holding (shareholding) pattern for the selected REIT — Sponsor & Sponsor
 * Group vs Public, from NSE's quarterly filing. Shows the latest split as a
 * stacked bar + figures, and a quarter-over-quarter trend when ≥2 quarters are
 * available. Data comes from `holdings.json` (seed until the first live refresh).
 */
export function UnitholdingPanel({
  holdings,
  k,
}: {
  holdings: Holdings | null | undefined
  k: ReitKey
}) {
  const rec = holdings?.[k]
  const quarters = rec?.quarters ?? []
  const latest = quarters[0]
  const seed = holdings?._seed === true

  const note = latest
    ? `Sponsor & Sponsor Group vs Public unitholders (NSE filing) · as of ${latest.label}`
    : 'Sponsor & Sponsor Group vs Public unitholders (NSE filing)'

  return (
    <Card
      className="mb-4"
      title="Unitholding pattern"
      note={note}
      exportable="panel"
      exportName={`${k}-unitholding-pattern`}
      actions={
        seed ? (
          <span
            title="Last-known filings. Hit ⟳ Refresh data in the top nav to pull live NSE data + the full trend."
            className="rounded-md border border-border px-2 py-1 text-[10.5px] font-medium text-subtle"
          >
            seed
          </span>
        ) : undefined
      }
    >
      {!latest ? (
        <p className="py-3 text-[12.5px] text-muted">
          No unitholding filing loaded yet for this REIT — hit ⟳ Refresh data in the top nav to pull it.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <SplitBar sponsor={latest.sponsor} pub={latest.public} />

          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Figure label="Sponsor & Sponsor Group" value={latest.sponsor} tone="sponsor" />
            <Figure label="Public unitholders" value={latest.public} tone="public" />
          </div>

          {quarters.length > 1 && <Trend quarters={quarters} />}
        </div>
      )}
    </Card>
  )
}

/** One-line horizontal stacked bar: sponsor (teal) | public (blue). */
function SplitBar({ sponsor, pub }: { sponsor: number; pub: number }) {
  const total = sponsor + pub || 100
  const sPct = (sponsor / total) * 100
  return (
    <div
      className="flex h-7 w-full overflow-hidden rounded-md ring-1 ring-border/60"
      role="img"
      aria-label={`Sponsor ${sponsor}%, Public ${pub}%`}
    >
      <div
        className="flex items-center justify-start bg-accent/85 px-2 text-[11px] font-semibold text-bg tnum"
        style={{ width: `${sPct}%` }}
      >
        {sponsor >= 12 ? `${fmtPct(sponsor)}` : ''}
      </div>
      <div
        className="flex items-center justify-end bg-info/80 px-2 text-[11px] font-semibold text-bg tnum"
        style={{ width: `${100 - sPct}%` }}
      >
        {pub >= 12 ? `${fmtPct(pub)}` : ''}
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'sponsor' | 'public'
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={
          'h-2.5 w-2.5 shrink-0 rounded-sm ' + (tone === 'sponsor' ? 'bg-accent' : 'bg-info')
        }
      />
      <div className="flex flex-col">
        <span className="text-[16px] font-semibold text-ink tnum">{fmtPct(value)}</span>
        <span className="text-[11px] text-muted">{label}</span>
      </div>
    </div>
  )
}

/** Small-multiples QoQ trend: one thin stacked column per quarter (oldest → newest). */
function Trend({ quarters }: { quarters: HoldingQuarter[] }) {
  const cols = [...quarters].reverse() // oldest → newest, left → right
  return (
    <div className="border-t border-border/60 pt-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
        Sponsor share — quarter over quarter
      </div>
      {/* wraps: with the full filing history (~28 quarters for Embassy) one row would
          overflow — and a scroll container would clip the panel's SVG export */}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
        {cols.map((q, i) => (
          // NSE can return two filings for the same quarter → labels alone collide
          <div key={`${q.date}-${i}`} className="flex w-12 flex-col items-center gap-1">
            <span className="text-[10.5px] font-semibold text-ink tnum">{fmtPct(q.sponsor)}</span>
            <div
              className="flex h-16 w-full flex-col-reverse overflow-hidden rounded ring-1 ring-border/50"
              title={`Sponsor ${q.sponsor}% · Public ${q.public}%`}
            >
              <div className="w-full bg-accent/85" style={{ height: `${q.sponsor}%` }} />
              <div className="w-full bg-info/70" style={{ height: `${q.public}%` }} />
            </div>
            <span className="text-[10px] text-muted">{q.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function fmtPct(v: number): string {
  return v.toFixed(2) + '%'
}
