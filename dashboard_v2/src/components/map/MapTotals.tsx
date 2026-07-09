/** Live totals bar for the currently-filtered assets. */
import { inr } from '../../lib/format'
import { totals, type MapAsset } from '../../lib/geo'

export function MapTotals({ assets }: { assets: MapAsset[] }) {
  const t = totals(assets)
  const cities = new Set(assets.map((a) => a.cityCanon).filter(Boolean)).size
  const items: [string, string][] = [
    ['Assets', String(t.count)],
    ['Leasable area', t.leasable.toFixed(1) + ' msf'],
    ['Portfolio value', inr(t.value) + ' cr'],
    ['Weighted occupancy', t.occ != null ? Math.round(t.occ * 100) + '%' : '–'],
    ['Cities', String(cities)],
  ]
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([l, v]) => (
        <div key={l} className="flex flex-col">
          <span className="text-[17px] font-semibold text-ink tnum">{v}</span>
          <span className="text-[11px] text-muted">{l}</span>
        </div>
      ))}
    </div>
  )
}
