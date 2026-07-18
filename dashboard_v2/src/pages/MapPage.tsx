/**
 * Portfolio Map — an interactive India map of every REIT asset, built entirely
 * from `reit-data.spv` (see src/lib/geo.ts). Choropleth base + animated pins,
 * live-filtered by REIT/type, with a hover-synced asset list and a detail drawer
 * that opens the existing valuation-annexure modal.
 */
import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { useDataset } from '../lib/useDataset'
import { assetsFromReitData, REIT_KEYS, ASSET_TYPES, type MapAsset, type AssetType } from '../lib/geo'
import type { ReitKey } from '../types/data'
import { IndiaMap, type SizeMetric, type ColorMode, type StateMetric, type ViewMode } from '../components/map/IndiaMap'
import { MapControls } from '../components/map/MapControls'
import { MapTotals } from '../components/map/MapTotals'
import { AssetList } from '../components/map/AssetList'
import { AssetDrawer } from '../components/map/AssetDrawer'
import { AnnexModal } from '../components/domestic/AnnexModal'

export function MapPage() {
  const reitDs = useDataset('reit-data')
  const annexures = useDataset('annexures')
  const links = useDataset('links')
  const D = reitDs.data

  const [reits, setReits] = useState<Set<ReitKey>>(() => new Set(REIT_KEYS))
  const [types, setTypes] = useState<Set<AssetType>>(() => new Set(ASSET_TYPES))
  const [size, setSize] = useState<SizeMetric>('leasable')
  const [color, setColor] = useState<ColorMode>('reit')
  const [stateMetric, setStateMetric] = useState<StateMetric>('value')
  const [view, setView] = useState<ViewMode>('assets')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [picked, setPicked] = useState<MapAsset | null>(null)
  const [annex, setAnnex] = useState<MapAsset | null>(null)

  const allAssets = useMemo(() => (D ? assetsFromReitData(D) : []), [D])
  const filtered = useMemo(
    () => allAssets.filter((a) => reits.has(a.reit) && types.has(a.type)),
    [allAssets, reits, types],
  )

  const reitCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of allAssets) if (types.has(a.type)) c[a.reit] = (c[a.reit] || 0) + 1
    return c
  }, [allAssets, types])
  const typeCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of allAssets) if (reits.has(a.reit)) c[a.type] = (c[a.type] || 0) + 1
    return c
  }, [allAssets, reits])

  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const n = new Set(set)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    return n.size ? n : set // never allow an empty selection
  }

  if (reitDs.error) {
    return (
      <>
        <PageHeader title="Portfolio Map" subtitle="Every REIT asset across India." />
        <Card title="Failed to load data">
          <p className="text-[13px] text-neg">{reitDs.error.message}</p>
        </Card>
      </>
    )
  }
  if (!D) {
    return (
      <>
        <PageHeader title="Portfolio Map" subtitle="Every REIT asset across India." />
        <Card title="Loading…">
          <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      </>
    )
  }

  const annexPages = picked ? annexures.data?.[picked.reit]?.[picked.asset]?.length || 0 : 0

  const SIZE_LBL = { leasable: 'leasable area', completed: 'completed area', value: 'portfolio value' }
  const COLOR_LBL = { reit: 'REIT', occ: 'committed occupancy', rent: 'in-place rent' }
  const SHADE_LBL = { leasable: 'leasable area', value: 'portfolio value', count: 'asset count' }
  const mapNote =
    `Bubble size = ${SIZE_LBL[size]} · colour = ${COLOR_LBL[color]} · state shade = ${SHADE_LBL[stateMetric]} · ` +
    `scroll to zoom, drag to pan, click a pin for detail`

  return (
    <>
      <PageHeader
        title="Portfolio Map"
        subtitle="Every listed-REIT asset across India, drawn from the SPV portfolio — filter by REIT and asset type, then click a pin for the full asset detail and valuation annexure."
      />

      <Card className="mb-4" bodyClassName="py-4">
        <MapControls
          reits={reits}
          toggleReit={(k) => setReits((s) => toggle(s, k))}
          reitCounts={reitCounts}
          types={types}
          toggleType={(t) => setTypes((s) => toggle(s, t))}
          typeCounts={typeCounts}
          size={size}
          setSize={setSize}
          color={color}
          setColor={setColor}
          state={stateMetric}
          setState={setStateMetric}
          view={view}
          setView={setView}
        />
      </Card>

      <Card className="mb-4" bodyClassName="py-4">
        <MapTotals assets={filtered} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="REIT assets across India" note={mapNote} bodyClassName="pt-2">
          <IndiaMap
            assets={filtered}
            view={view}
            sizeMetric={size}
            colorMode={color}
            stateMetric={stateMetric}
            hoverId={hoverId}
            onHover={setHoverId}
            onPick={setPicked}
          />
        </Card>

        <Card title="Assets in view" note="Click a row for detail · hover to locate on the map">
          <AssetList assets={filtered} hoverId={hoverId} onHover={setHoverId} onPick={setPicked} />
        </Card>
      </div>

      <AssetDrawer
        asset={picked}
        annexPages={annexPages}
        onClose={() => setPicked(null)}
        onOpenAnnexure={(a) => setAnnex(a)}
      />

      <AnnexModal
        k={annex?.reit ?? 'embassy'}
        asset={annex?.raw ?? null}
        annexures={annexures.data}
        links={links.data}
        onClose={() => setAnnex(null)}
      />
    </>
  )
}
