import { useRef } from 'react'
import { Card } from '../ui/Card'
import { exportPanelSvg } from '../../lib/svgExport'
import { REIT_SHORT } from '../../lib/reit'
import type { Holdings, HoldingQuarter, QuarterDetail, ReitKey } from '../../types/data'

/**
 * Unit-holding (shareholding) pattern for the selected REIT, from NSE's
 * quarterly filing (`holdings.json`, seed until the first live refresh).
 *
 * Quarters enriched from the filing's XBRL (`detail`) get the full breakdown:
 * one stacked-bar segment per sponsor group (KRT: Blackstone + Sattva), then
 * Institutions and Non-institutions; below, the named sponsor entities, the
 * public category split, and the top-5 public unitholders. Quarters without
 * `detail` (pre-XBRL holdings.json) fall back to the Sponsor-vs-Public split.
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
  const detail = latest?.detail
  const segments = latest ? mainSegments(latest) : []
  const snapRef = useRef<HTMLDivElement>(null)
  const trendRef = useRef<HTMLDivElement>(null)

  const note = latest
    ? `Sponsor & Sponsor Group vs Public unitholders (NSE filing) · as of ${latest.label}`
    : 'Sponsor & Sponsor Group vs Public unitholders (NSE filing)'

  // Two separate print-size exports instead of one page-tall panel raster:
  // pasted into Word, the combined card shrank to fit the page and the text
  // went sub-legible. Each half exports with its own title/frame/footnote.
  const exportSnapshot = () => {
    if (!snapRef.current) return
    exportPanelSvg(snapRef.current, `${k}-unitholding-pattern`, {
      title: `${REIT_SHORT[k]} — Unitholding pattern`,
      note,
    }).catch(() => {})
  }
  const exportTrend = () => {
    if (!trendRef.current) return
    exportPanelSvg(trendRef.current, `${k}-unitholding-trend`, {
      title: `${REIT_SHORT[k]} — Ownership trend`,
      // the grey-band caveat renders inside the section itself — don't repeat it here
      note: 'Sponsor / institutions / non-institutions, % of units outstanding, per NSE quarterly unitholding filing.',
    }).catch(() => {})
  }
  const exportBtnCls =
    'shrink-0 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-subtle transition hover:border-accent hover:text-accent'

  return (
    <Card
      className="mb-4"
      title="Unitholding pattern"
      note={note}
      actions={
        <>
          {seed && (
            <span
              title="Last-known filings. Hit ⟳ Refresh data in the top nav to pull live NSE data + the full trend."
              className="rounded-md border border-border px-2 py-1 text-[10.5px] font-medium text-subtle"
            >
              seed
            </span>
          )}
          {latest && (
            <button onClick={exportSnapshot} title="Download the pattern snapshot as SVG (white background)" className={exportBtnCls}>
              ↓ SVG · pattern
            </button>
          )}
          {quarters.length > 1 && (
            <button onClick={exportTrend} title="Download the ownership trend as SVG (white background)" className={exportBtnCls}>
              ↓ SVG · trend
            </button>
          )}
        </>
      }
    >
      {!latest ? (
        <p className="py-3 text-[12.5px] text-muted">
          No unitholding filing loaded yet for this REIT — hit ⟳ Refresh data in the top nav to pull it.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div ref={snapRef} className="flex flex-col gap-4">
            <SplitBar segments={segments} />

            <div className="flex flex-wrap gap-x-10 gap-y-3">
              {segments.map((s) => (
                <Figure key={s.label} label={s.label} value={s.pct} swatch={s.swatch} />
              ))}
            </div>

            {detail && <DetailSection detail={detail} sponsorTotal={latest.sponsor} />}
          </div>

          {quarters.length > 1 && (
            <div ref={trendRef}>
              <Trend quarters={quarters} />
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

interface Segment {
  label: string
  pct: number
  cls: string // bar fill class
  swatch: string // solid legend-swatch class
}

// Sponsor groups wear teal then gold (a rare 3rd group violet); Institutions
// blue, Non-institutions amber. Fixed assignment — a group keeps its colour
// across quarters because groups arrive sorted desc and the sort is stable
// within a REIT's filings.
const GROUP_STYLES = [
  { cls: 'bg-accent/85', swatch: 'bg-accent' },
  { cls: 'bg-gold/85', swatch: 'bg-gold' },
  { cls: 'bg-violet/80', swatch: 'bg-violet' },
]
const INST_STYLE = { cls: 'bg-info/80', swatch: 'bg-info' }
const NONINST_STYLE = { cls: 'bg-warn/75', swatch: 'bg-warn' }
const PUBLIC_STYLE = { cls: 'bg-info/80', swatch: 'bg-info' }

/** Bar/legend segments for a quarter: per-group + inst/non-inst when detailed. */
function mainSegments(q: HoldingQuarter): Segment[] {
  const d = q.detail
  if (!d) {
    return [
      { label: 'Sponsor & Sponsor Group', pct: q.sponsor, ...GROUP_STYLES[0] },
      { label: 'Public unitholders', pct: q.public, ...PUBLIC_STYLE },
    ]
  }
  const groups = d.groups?.length
    ? d.groups
    : [{ label: 'Sponsor & Sponsor Group', pct: q.sponsor }]
  const segs: Segment[] = groups.map((g, i) => ({
    label: `${g.label} (sponsor)`,
    pct: g.pct,
    ...GROUP_STYLES[Math.min(i, GROUP_STYLES.length - 1)],
  }))
  segs.push({ label: 'Institutions', pct: d.inst, ...INST_STYLE })
  segs.push({ label: 'Non-institutions', pct: d.noninst, ...NONINST_STYLE })
  return segs.filter((s) => s.pct > 0)
}

/** One-line horizontal stacked bar with a 2px gap between segments. */
function SplitBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((t, s) => t + s.pct, 0) || 100
  return (
    <div
      className="flex h-7 w-full gap-[2px] overflow-hidden rounded-md ring-1 ring-border/60"
      role="img"
      aria-label={segments.map((s) => `${s.label} ${fmtPct(s.pct)}`).join(', ')}
    >
      {segments.map((s) => (
        <div
          key={s.label}
          title={`${s.label} · ${fmtPct(s.pct)}`}
          className={`flex items-center justify-center px-1 text-[11px] font-semibold text-bg tnum ${s.cls}`}
          style={{ width: `${(s.pct / total) * 100}%` }}
        >
          {s.pct >= 12 ? fmtPct(s.pct) : ''}
        </div>
      ))}
    </div>
  )
}

function Figure({ label, value, swatch }: { label: string; value: number; swatch: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${swatch}`} />
      <div className="flex flex-col">
        <span className="text-[16px] font-semibold text-ink tnum">{fmtPct(value)}</span>
        <span className="text-[11px] text-muted">{label}</span>
      </div>
    </div>
  )
}

/** Sponsor entities + public breakdown + top-5 public unitholders. */
function DetailSection({ detail, sponsorTotal }: { detail: QuarterDetail; sponsorTotal: number }) {
  return (
    <div className="grid gap-x-10 gap-y-4 border-t border-border/60 pt-3 sm:grid-cols-2">
      <SponsorEntities detail={detail} sponsorTotal={sponsorTotal} />
      <div className="flex flex-col gap-4">
        <PublicBreakdown cats={detail.cats} inst={detail.inst} noninst={detail.noninst} />
        {detail.top && detail.top.length > 0 && <TopHolders top={detail.top} />}
      </div>
    </div>
  )
}

const MAX_ENTITY_ROWS = 6

function SponsorEntities({
  detail,
  sponsorTotal,
}: {
  detail: QuarterDetail
  sponsorTotal: number
}) {
  const entities = detail.sponsors ?? []
  const shown = entities.slice(0, MAX_ENTITY_ROWS)
  const rest = entities.slice(MAX_ENTITY_ROWS)
  const restPct = Math.round(rest.reduce((t, e) => t + e.pct, 0) * 100) / 100
  const rows: { name: string; pct: number }[] = entities.length
    ? [...shown, ...(rest.length ? [{ name: `${rest.length} smaller entities`, pct: restPct }] : [])]
    : // Filed without entity names (Mindspace) — show the group rollup instead.
      (detail.groups ?? [{ label: 'Sponsor & Sponsor Group', pct: sponsorTotal }]).map((g) => ({
        name: g.label,
        pct: g.pct,
      }))
  const max = Math.max(...rows.map((r) => r.pct), 1)
  return (
    <div>
      <SectionLabel>Sponsor & sponsor group entities</SectionLabel>
      <div className="flex flex-col gap-1.5">
        {/* index in the key: filings can repeat an entity name */}
        {rows.map((r, i) => (
          <MiniBarRow key={`${r.name}-${i}`} name={r.name} pct={r.pct} max={max} cls="bg-accent/70" />
        ))}
      </div>
      {!entities.length && (
        <p className="mt-2 text-[10.5px] text-subtle">
          Individual entities filed unnamed in the NSE pattern for this REIT.
        </p>
      )}
    </div>
  )
}

const CAT_ROWS: [keyof QuarterDetail['cats'], string][] = [
  ['mf', 'Mutual funds'],
  ['fpi', 'Foreign portfolio investors'],
  ['ins', 'Insurance companies'],
  ['pf', 'Pension / provident funds'],
  ['banks', 'Banks / financial institutions'],
  ['inst_other', 'Other institutions'],
  ['retail', 'Individuals (retail & HNI)'],
  ['corp', 'Body corporates'],
  ['nri', 'NRIs'],
  ['trusts', 'Trusts'],
  ['noninst_other', 'Other non-institutional'],
]
const INST_KEYS = new Set(['mf', 'fpi', 'ins', 'pf', 'banks', 'inst_other'])

function PublicBreakdown({
  cats,
  inst,
  noninst,
}: {
  cats: QuarterDetail['cats']
  inst: number
  noninst: number
}) {
  const rows = CAT_ROWS.filter(([key]) => cats[key] > 0)
  const max = Math.max(...rows.map(([key]) => cats[key]), 1)
  return (
    <div>
      <SectionLabel>
        Public breakdown — institutions {fmtPct(inst)} · non-institutions {fmtPct(noninst)}
      </SectionLabel>
      <div className="flex flex-col gap-1.5">
        {rows.map(([key, label]) => (
          <MiniBarRow
            key={key}
            name={label}
            pct={cats[key]}
            max={max}
            cls={INST_KEYS.has(key) ? 'bg-info/70' : 'bg-warn/60'}
          />
        ))}
      </div>
    </div>
  )
}

function TopHolders({ top }: { top: { name: string; pct: number }[] }) {
  return (
    <div>
      <SectionLabel>Largest public unitholders (as filed)</SectionLabel>
      <div className="flex flex-col gap-1">
        {top.map((t) => (
          <div key={t.name} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[11.5px] text-muted" title={t.name}>
              {t.name}
            </span>
            <span className="shrink-0 text-[11.5px] font-medium text-ink tnum">
              {fmtPct(t.pct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Label + right-aligned value + thin proportional bar underneath the text row. */
function MiniBarRow({
  name,
  pct,
  max,
  cls,
}: {
  name: string
  pct: number
  max: number
  cls: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[11.5px] text-muted" title={name}>
          {name}
        </span>
        <span className="shrink-0 text-[11.5px] font-medium text-ink tnum">{fmtPct(pct)}</span>
      </div>
      <div className="mt-0.5 h-1 w-full rounded-full bg-surface-3">
        <div className={`h-1 rounded-full ${cls}`} style={{ width: `${(pct / max) * 100}%` }} />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
      {children}
    </div>
  )
}

/**
 * QoQ ownership trend — inline-SVG stacked area (sponsor / institutions /
 * non-institutions, summing to 100% of units outstanding), date-proportional
 * x-axis. Inline SVG (not Chart.js) on purpose: the card's `panel` export
 * rasterises the DOM through a foreignObject, which serialises SVG but not
 * canvas content. Quarters without XBRL `detail` show their public share as a
 * neutral "split not filed" band, so the sponsor history still runs unbroken.
 */
function Trend({ quarters }: { quarters: HoldingQuarter[] }) {
  const cols = [...quarters].reverse() // oldest → newest, left → right
  const W = 1000
  const H = 210
  const PAD = { l: 38, r: 172, t: 10, b: 24 }
  const t0 = Date.parse(cols[0].date)
  const t1 = Date.parse(cols[cols.length - 1].date)
  const x = (date: string) => PAD.l + ((Date.parse(date) - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b)

  // Band values per quarter, bottom → top of the stack.
  const bands = [
    { label: 'Sponsor', fill: 'fill-accent/80', swatch: 'fill-accent', vals: cols.map((q) => q.sponsor) },
    { label: 'Institutions', fill: 'fill-info/70', swatch: 'fill-info', vals: cols.map((q) => q.detail?.inst ?? 0) },
    { label: 'Non-institutions', fill: 'fill-warn/60', swatch: 'fill-warn', vals: cols.map((q) => q.detail?.noninst ?? 0) },
    { label: 'Public — split not filed', fill: 'fill-subtle/25', swatch: 'fill-subtle', vals: cols.map((q) => (q.detail ? 0 : q.public)) },
  ].filter((b) => b.vals.some((v) => v > 0))

  // cumulative tops: cum[k][i] = stacked height after band k at quarter i
  const zero = cols.map(() => 0)
  const cum: number[][] = [zero]
  bands.forEach((b, k) => cum.push(cols.map((_, i) => cum[k][i] + b.vals[i])))

  const bandPath = (k: number): string => {
    const top = cols.map((q, i) => `${x(q.date).toFixed(1)},${y(cum[k + 1][i]).toFixed(1)}`)
    const bottom = cols.map((q, i) => `${x(q.date).toFixed(1)},${y(cum[k][i]).toFixed(1)}`).reverse()
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }

  // right-edge labels at each band's latest midpoint, nudged apart on collision
  const LABEL_GAP = 15
  const last = cols.length - 1
  const ends = bands
    .map((b, k) => ({
      b,
      v: b.vals[last],
      ly: y((cum[k][last] + cum[k + 1][last]) / 2),
    }))
    .filter((e) => e.v > 0)
    .sort((a, b) => a.ly - b.ly)
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].ly - ends[i - 1].ly < LABEL_GAP) ends[i].ly = ends[i - 1].ly + LABEL_GAP
  }

  const tickStep = Math.max(1, Math.ceil(cols.length / 7))
  const lastX = x(cols[cols.length - 1].date)
  // keep the newest filing's tick; drop earlier ticks that would collide with it
  const xTicks = cols.filter(
    (q, i) =>
      i === cols.length - 1 || (i % tickStep === 0 && lastX - x(q.date) > 70),
  )
  const hasUnsplit = bands.some((b) => b.label.startsWith('Public'))
  const halfGap = cols.length > 1 ? (x(cols[1].date) - x(cols[0].date)) / 2 : 8

  return (
    <div className="border-t border-border/60 pt-3">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
        Ownership trend — % of units outstanding, by filing
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label="Stacked area of sponsor, institutions and non-institutions share over filed quarters">
        {bands.map((b, k) => (
          <path key={b.label} d={bandPath(k)} className={b.fill} />
        ))}
        {[25, 50, 75].map((v) => (
          <line key={v} x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)}
            className="stroke-border/50" strokeWidth="1" />
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <text key={v} x={PAD.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize="10" className="fill-subtle tnum">
            {v}
          </text>
        ))}
        {xTicks.map((q) => (
          <text key={q.date} x={x(q.date)} y={H - 7} textAnchor="middle" fontSize="10" className="fill-subtle">
            {q.label}
          </text>
        ))}
        {/* sponsor top edge, crisp over the fills */}
        <path
          d={`M${cols.map((q, i) => `${x(q.date).toFixed(1)},${y(cum[1][i]).toFixed(1)}`).join('L')}`}
          fill="none" strokeWidth="2" strokeLinejoin="round" className="stroke-accent" />
        {/* invisible per-quarter hover columns with a full tooltip */}
        {cols.map((q, i) => (
          <rect key={`${q.date}-${i}`} x={x(q.date) - halfGap} y={PAD.t}
            width={halfGap * 2} height={H - PAD.t - PAD.b} fill="transparent">
            <title>
              {q.detail
                ? `${q.label} · Sponsor ${fmtPct(q.sponsor)} · Institutions ${fmtPct(q.detail.inst)} · Non-institutions ${fmtPct(q.detail.noninst)}`
                : `${q.label} · Sponsor ${fmtPct(q.sponsor)} · Public ${fmtPct(q.public)} (split not filed)`}
            </title>
          </rect>
        ))}
        {ends.map(({ b, v, ly }) => (
          <text key={b.label} x={W - PAD.r + 10} y={ly + 3.5} fontSize="11" className="fill-muted">
            <tspan className={`${b.swatch} font-semibold tnum`}>{fmtPct(v)}</tspan> {b.label}
          </text>
        ))}
      </svg>
      {hasUnsplit && (
        <p className="mt-1 text-[10.5px] text-subtle">
          Grey band: quarters where the filing did not split public holders into institutions / non-institutions.
        </p>
      )}
    </div>
  )
}

function fmtPct(v: number): string {
  return v.toFixed(2) + '%'
}
