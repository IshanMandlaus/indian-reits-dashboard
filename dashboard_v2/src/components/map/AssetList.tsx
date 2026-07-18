/** Sortable list of the filtered assets, hover-synced with the map. */
import { useState } from 'react'
import { inr } from '../../lib/format'
import type { MapAsset } from '../../lib/geo'

type Key = 'asset' | 'city' | 'leasable' | 'occ' | 'valueCr'

interface Props {
  assets: MapAsset[]
  hoverId: string | null
  onHover: (id: string | null) => void
  onPick: (a: MapAsset) => void
}

export function AssetList({ assets, hoverId, onHover, onPick }: Props) {
  const [key, setKey] = useState<Key>('valueCr')
  const [asc, setAsc] = useState(false)

  const sorted = [...assets].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    let d: number
    if (typeof av === 'string' || typeof bv === 'string') d = String(av).localeCompare(String(bv))
    else d = ((av as number) ?? -Infinity) - ((bv as number) ?? -Infinity)
    return asc ? d : -d
  })

  const sort = (k: Key) => {
    if (k === key) setAsc(!asc)
    else {
      setKey(k)
      setAsc(k === 'asset' || k === 'city')
    }
  }
  const arrow = (k: Key) => (k === key ? (asc ? ' ↑' : ' ↓') : '')

  const Th = ({ k, label, right }: { k: Key; label: string; right?: boolean }) => (
    <th
      onClick={() => sort(k)}
      className={['cursor-pointer py-2 font-medium hover:text-ink', right ? 'text-right pr-3' : 'pr-3'].join(' ')}
    >
      {label}
      {arrow(k)}
    </th>
  )

  return (
    <div className="max-h-[560px] overflow-y-auto" onMouseLeave={() => onHover(null)}>
      <table className="w-full border-collapse text-[12px] tnum">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-border text-left text-[10.5px] uppercase tracking-wide text-subtle">
            <Th k="asset" label="Asset" />
            <Th k="city" label="City" />
            <Th k="leasable" label="msf" right />
            <Th k="occ" label="Occ" right />
            <Th k="valueCr" label="₹ cr" right />
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr
              key={a.id}
              onMouseEnter={() => onHover(a.id)}
              onClick={() => onPick(a)}
              className={[
                'cursor-pointer border-b border-border-soft transition-colors',
                hoverId === a.id ? 'bg-surface-2' : 'hover:bg-surface-2/50',
              ].join(' ')}
            >
              <td className="py-1.5 pr-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                  <span className="font-medium text-ink" title={`${a.asset} · ${a.reitLabel}`}>
                    {a.asset}
                  </span>
                </div>
              </td>
              <td className="py-1.5 pr-3 text-muted">{a.city}</td>
              <td className="py-1.5 pr-3 text-right text-ink">{a.leasable != null ? a.leasable.toFixed(1) : '–'}</td>
              <td className="py-1.5 pr-3 text-right text-ink">{a.occ != null ? Math.round(a.occ * 100) + '%' : '–'}</td>
              <td className="py-1.5 pr-3 text-right text-ink">{a.valueCr != null ? inr(a.valueCr) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
