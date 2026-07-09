/**
 * Section 8 — how the trust holds its assets. Embassy uses a static PNG
 * (special-cased in v1); every other REIT renders a native 3-level diagram
 * (unitholders → trust → SPVs). Ported from v1 structure().
 */
import type { ReitData, ReitKey, ReitStructures } from '../../types/data'

export function Structure({ D, k, structures }: { D: ReitData; k: ReitKey; structures: ReitStructures | null }) {
  if (k === 'embassy') {
    return (
      <div>
        <img
          src={`${import.meta.env.BASE_URL}img/structure_embassy.png`}
          alt="Embassy Office Parks REIT structure"
          className="block h-auto w-full rounded-lg"
        />
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
          <b className="text-ink">Notes.</b> Blackstone (former sponsor) fully exited in Dec 2023; Embassy Group
          (sponsor) holds 8% of units and the public holds 92%. SPVs are held 100% by the REIT via equity + shareholder
          debt unless a badge shows otherwise: GLSP (GolfLinks Software Park) is a 50:50 JV, and MPPL holds 80% of Embassy
          Energy (EEPL) with the REIT holding the other 20% directly.
        </p>
      </div>
    )
  }

  const s = structures?.[k]
  if (!s) return <div className="text-[12px] text-subtle">No structure data.</div>

  const CapRule = ({ label }: { label: string }) => (
    <div className="mb-3 mt-4 flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
  const Connector = ({ label }: { label?: string }) => (
    <div className="flex flex-col items-center py-1 text-subtle">
      <span className="h-4 w-px bg-border" />
      <span className="-mt-1 text-[10px]">▼</span>
      {label && <span className="mt-0.5 text-[10.5px] text-subtle">{label}</span>}
    </div>
  )

  return (
    <div className="text-[12px]">
      <CapRule label="Level 1 · Unitholders" />
      <div className="flex flex-wrap gap-2.5">
        {s.sponsors.map((x, i) => (
          <div
            key={i}
            className={[
              'flex-1 rounded-lg border p-2.5',
              x.exited ? 'border-border-soft bg-surface/40 opacity-70' : 'border-border bg-surface-2',
            ].join(' ')}
          >
            <div className="text-[10px] uppercase tracking-wide text-subtle">
              {x.exited ? 'Former sponsor' : 'Sponsor'}
            </div>
            <div className="font-medium text-ink">{x.name}</div>
            {x.exited ? (
              <>
                <span className="mt-1 inline-block rounded bg-neg/12 px-1.5 py-0.5 text-[10px] font-semibold text-neg">
                  exited {x.exited}
                </span>
                {x.exit_note && <div className="mt-1 text-[10.5px] text-subtle">{x.exit_note}</div>}
              </>
            ) : (
              <span className="mt-1 inline-block text-[10.5px] text-muted">holds {x.stake} of units</span>
            )}
          </div>
        ))}
        <div className="flex-1 rounded-lg border border-border bg-surface-2 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-subtle">Public</div>
          <div className="font-medium text-ink">Unitholders</div>
          {s.public_stake && <span className="mt-1 inline-block text-[10.5px] text-muted">hold {s.public_stake} of units</span>}
        </div>
      </div>

      <Connector label="unitholding in the trust" />
      <CapRule label="Level 2 · The Trust" />
      <div className="flex flex-wrap items-stretch justify-center gap-2.5">
        <div className="flex-1 rounded-lg border border-border bg-surface-2 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-subtle">Trustee</div>
          {s.trustee}
          <div className="mt-1 text-[10.5px] text-subtle">acts on behalf of unitholders</div>
        </div>
        <div className="flex items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-center font-semibold text-ink">
          {D.meta[k].name}
        </div>
        <div className="flex-1 rounded-lg border border-border bg-surface-2 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-subtle">Manager</div>
          {s.manager}
          <div className="mt-1 text-[10.5px] text-subtle">management services to trust &amp; SPVs</div>
        </div>
      </div>

      <Connector label="equity + shareholder debt — 100% unless badged" />
      <CapRule label="Level 3 · Asset SPVs / Holdcos" />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {s.spvs.map((v, i) => (
          <div
            key={i}
            className={[
              'rounded-lg border p-2.5',
              v.stake < 100 ? 'border-warn/40 bg-warn/5' : 'border-border bg-surface-2',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-ink">{v.name}</span>
              <span
                className={[
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tnum',
                  v.stake < 100 ? 'bg-warn/12 text-warn' : 'bg-accent/12 text-accent',
                ].join(' ')}
              >
                {v.stake}%
              </span>
            </div>
            {v.via && <div className="mt-0.5 text-[10.5px] text-subtle">{v.via}</div>}
            <div className="mt-1 text-[10.5px] text-muted">{v.assets.join(' · ')}</div>
          </div>
        ))}
      </div>
      {s.notes && <p className="mt-3 text-[11px] leading-relaxed text-muted">{s.notes}</p>}
    </div>
  )
}
