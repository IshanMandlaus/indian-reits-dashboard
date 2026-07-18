/** Control rail for the Portfolio Map: REIT + type filters and the map toggles. */
import { REIT_KEYS, REIT_SHORT, REIT_COLOR, ASSET_TYPES, type AssetType } from '../../lib/geo'
import type { ReitKey } from '../../types/data'
import type { SizeMetric, ColorMode, StateMetric, ViewMode } from './IndiaMap'

interface Props {
  reits: Set<ReitKey>
  toggleReit: (k: ReitKey) => void
  reitCounts: Record<string, number>
  types: Set<AssetType>
  toggleType: (t: AssetType) => void
  typeCounts: Record<string, number>
  size: SizeMetric
  setSize: (s: SizeMetric) => void
  color: ColorMode
  setColor: (c: ColorMode) => void
  state: StateMetric
  setState: (s: StateMetric) => void
  view: ViewMode
  setView: (v: ViewMode) => void
}

function Seg<T extends string>({ opts, value, onChange }: { opts: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {opts.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={[
            'rounded-md px-2.5 py-1 text-[11.5px] font-medium transition',
            value === v ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] uppercase tracking-[0.04em] text-subtle">{label}</span>
      {children}
    </div>
  )
}

export function MapControls(p: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* REIT chips */}
      <Field label="REITs">
        <div className="flex flex-wrap gap-1.5">
          {REIT_KEYS.map((k) => {
            const on = p.reits.has(k)
            return (
              <button
                key={k}
                onClick={() => p.toggleReit(k)}
                className={[
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition',
                  on ? 'border-border bg-surface-2 text-ink' : 'border-border-soft text-subtle opacity-55 hover:opacity-100',
                ].join(' ')}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: REIT_COLOR[k], boxShadow: on ? `0 0 6px ${REIT_COLOR[k]}` : 'none' }}
                />
                {REIT_SHORT[k]}
                <span className="tnum text-subtle">{p.reitCounts[k] || 0}</span>
              </button>
            )
          })}
        </div>
      </Field>

      {/* Type chips */}
      <Field label="Asset type">
        <div className="flex flex-wrap gap-1.5">
          {ASSET_TYPES.map((t) => {
            const on = p.types.has(t)
            const n = p.typeCounts[t] || 0
            if (!n && !on) return null
            return (
              <button
                key={t}
                onClick={() => p.toggleType(t)}
                className={[
                  'rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition',
                  on ? 'border-border bg-surface-2 text-ink' : 'border-border-soft text-subtle opacity-55 hover:opacity-100',
                ].join(' ')}
              >
                {t} <span className="tnum text-subtle">{n}</span>
              </button>
            )
          })}
        </div>
      </Field>

      <div className="flex flex-wrap gap-x-6 gap-y-4">
        <Field label="View">
          <Seg opts={[['assets', 'Assets'], ['cities', 'Cities']]} value={p.view} onChange={p.setView} />
        </Field>
        <Field label="Bubble size">
          <Seg
            opts={[['leasable', 'Leasable'], ['completed', 'Completed'], ['value', 'Value']]}
            value={p.size}
            onChange={p.setSize}
          />
        </Field>
        <Field label="Bubble colour">
          <Seg opts={[['reit', 'REIT'], ['occ', 'Occupancy'], ['rent', 'In-place rent']]} value={p.color} onChange={p.setColor} />
        </Field>
        <Field label="State shading">
          <Seg opts={[['leasable', 'Leasable'], ['value', 'Value'], ['count', 'Count']]} value={p.state} onChange={p.setState} />
        </Field>
      </div>
    </div>
  )
}
