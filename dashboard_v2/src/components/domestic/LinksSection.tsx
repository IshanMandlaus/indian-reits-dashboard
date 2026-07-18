/**
 * Section 9 — filings & valuation reports, grouped by type. "LATEST" tags the
 * most recent of its kind. Ported from v1 linksSection().
 */
import type { ReitKey, ReitLinks, ReitLink } from '../../types/data'

export function LinksSection({ k, links }: { k: ReitKey; links: ReitLinks | null }) {
  const ls = links?.[k] || []
  if (!ls.length) return <div className="text-[12px] text-subtle">No links collected yet.</div>

  const groups: Record<string, ReitLink[]> = {}
  ls.forEach((l) => {
    ;(groups[l.type] = groups[l.type] || []).push(l)
  })

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(groups).map(([g, items]) => (
        <div key={g}>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">{g}s</div>
          <div className="flex flex-wrap gap-2">
            {items.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-ink transition hover:border-accent/50 hover:text-accent"
              >
                📄 {l.label}
                {l.latest && (
                  <span className="rounded bg-pos/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-pos">latest</span>
                )}
              </a>
            ))}
          </div>
        </div>
      ))}
      {k === 'krt' && (
        <p className="text-[11px] text-subtle">
          KRT’s first annual report (FY26) has no stable direct URL yet — its site renders documents via JavaScript.
        </p>
      )}
      {k === 'bagmane' && (
        <p className="text-[11px] text-subtle">
          Bagmane listed 26 May 2026 — first earnings presentation/annual report not yet published.
        </p>
      )}
    </div>
  )
}
