/** Slide-over detail panel for one asset, with an "Open valuation annexure" action. */
import { useEffect } from 'react'
import { inr } from '../../lib/format'
import type { MapAsset } from '../../lib/geo'

interface Props {
  asset: MapAsset | null
  annexPages: number
  onClose: () => void
  onOpenAnnexure: (a: MapAsset) => void
}

export function AssetDrawer({ asset, annexPages, onClose, onOpenAnnexure }: Props) {
  useEffect(() => {
    if (!asset) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [asset, onClose])

  if (!asset) return null
  const a = asset

  const stats: [string, string | null][] = [
    ['Type', a.type],
    ['City', a.city],
    ['Leasable area', a.leasable != null ? a.leasable.toFixed(2) + ' msf' : null],
    ['Completed area', a.completed != null ? a.completed.toFixed(2) + ' msf' : null],
    ['Committed occupancy', a.occ != null ? (100 * a.occ).toFixed(0) + '%' : null],
    ['In-place rent', a.inplaceRent != null ? '₹' + a.inplaceRent + '/sf/mo' : null],
    ['Market rent', a.mktRent != null ? '₹' + a.mktRent + '/sf/mo' : null],
    [
      'Mark-to-market',
      a.inplaceRent != null && a.mktRent != null && a.inplaceRent > 0
        ? '+' + (100 * (a.mktRent / a.inplaceRent - 1)).toFixed(0) + '%'
        : null,
    ],
    ['WALE', a.wale != null ? a.wale + ' yrs' : null],
    ['Cap rate', a.capRate != null ? (100 * a.capRate).toFixed(2) + '%' : null],
    ['Market value', a.valueCr != null ? inr(a.valueCr) + ' cr' : null],
    ['Value / sf', a.valPsf != null ? inr(a.valPsf) : null],
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface shadow-[var(--shadow-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.05em]" style={{ color: a.color }}>
              {a.reitLabel}
            </div>
            <h3 className="mt-0.5 text-[16px] font-semibold text-ink">{a.asset}</h3>
            {a.spvName && <div className="mt-0.5 text-[11.5px] text-muted">{a.spvName}</div>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-[18px] leading-none text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3 px-5 py-4">
          {stats
            .filter(([, v]) => v != null)
            .map(([l, v]) => (
              <div key={l}>
                <div className="text-[10.5px] uppercase tracking-wide text-subtle">{l}</div>
                <div className="text-[13.5px] font-semibold text-ink tnum">{v}</div>
              </div>
            ))}
        </div>

        {a.notes && (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-1 text-[10.5px] uppercase tracking-wide text-subtle">Notes</div>
            <p className="text-[12.5px] leading-relaxed text-muted">{a.notes}</p>
          </div>
        )}

        <div className="border-t border-border px-5 py-4">
          <button
            onClick={() => onOpenAnnexure(a)}
            disabled={!annexPages}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-bg transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            {annexPages ? `Open valuation annexure (${annexPages} pages) ↗` : 'No annexure for this asset'}
          </button>
        </div>
      </div>
    </div>
  )
}
