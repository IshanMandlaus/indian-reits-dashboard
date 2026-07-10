import { useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { useDataset } from '../lib/useDataset'
import { setupCharts } from '../lib/chartSetup'
import { countrySlices, mcapDrill, sectorDrill, sectorReitDrill, buildGlobalSecModal } from '../lib/global'
import { buildGlobePoints } from '../lib/globe'
import { GlobeHero } from '../components/global/GlobeHero'
import { PieDrilldown } from '../components/global/PieDrilldown'
import { CountryPanels } from '../components/global/CountryPanels'
import { SecurityModal, type SecModalData } from '../components/charts/SecurityModal'

setupCharts()

export function GlobalPage() {
  const [modal, setModal] = useState<SecModalData | null>(null)

  const global = useDataset('global')
  const globalLive = useDataset('global-live')

  const G = global.data
  const LIVE = globalLive.data

  const mcapSlices = useMemo(() => (G ? countrySlices(G, 'mcap') : []), [G])
  const aumSlices = useMemo(() => (G ? countrySlices(G, 'aum') : []), [G])
  const globePoints = useMemo(() => (G ? buildGlobePoints(G, LIVE) : []), [G, LIVE])

  const mcapWorld = G ? G.countries.reduce((a, c) => a + c.mcap, 0) : 0
  const aumWorld = G ? G.countries.reduce((a, c) => a + c.aum, 0) : 0
  // Stamped under the title in exported SVGs (live-quote charts lose the date otherwise).
  const exportAsof = LIVE?.asof
    ? 'Live quotes as of ' + LIVE.asof + ' (Yahoo Finance) · estimates as of ' + (G?.asof ?? '—')
    : 'Estimates as of ' + (G?.asof ?? '—')

  // Hero mounts unconditionally (points=[] while loading) so the globe never
  // re-initialises when data arrives; only the cards section below swaps state.
  return (
    <>
      <GlobeHero
        points={globePoints}
        liveAsof={LIVE?.asof ?? null}
        estAsof={G?.asof ?? null}
        onPick={(ckey, ri) => {
          if (G) setModal(buildGlobalSecModal(G, LIVE, ckey, ri))
        }}
      />

      {global.error ? (
        <Card className="relative z-10" title="Failed to load data">
          <p className="text-[13px] text-neg">{global.error.message}</p>
        </Card>
      ) : !G ? (
        <Card className="relative z-10" title="Loading…">
          <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      ) : (
        // relative z-10: paint above the hero globe's canvas, which bleeds down behind this grid
        <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title="Listed REIT market capitalisation by country"
            note="US$ bn listed-REIT market cap — click a country slice to drill into its top listed REITs by market cap."
            exportable="chart"
            exportName="global-mcap-by-country"
            exportAsof={exportAsof}
          >
            <PieDrilldown
              slices={mcapSlices}
              worldTotal={mcapWorld}
              drill={(path) => (path.length === 1 ? mcapDrill(G, path[0]) : null)}
            />
          </Card>

          <Card
            title="Real-estate AUM (gross assets) by country"
            note="US$ bn gross real-estate AUM (US included — click its legend swatch to hide/show) — click a country → its AUM by sector → a sector to see the listed REITs in it (estimated AUM share, live market cap)."
            exportable="chart"
            exportName="global-aum-by-country"
            exportAsof={exportAsof}
          >
            <PieDrilldown
              slices={aumSlices}
              worldTotal={aumWorld}
              tooltipSuffix=" gross assets"
              drill={(path) =>
                path.length === 1
                  ? sectorDrill(G, path[0])
                  : path.length === 2
                    ? sectorReitDrill(G, LIVE, path[0], path[1])
                    : null
              }
            />
          </Card>

          <Card
            className="lg:col-span-2"
            title="Country panels — top 5 listed REITs each (live quotes)"
            exportable="panel"
            exportName="global-market-leaders"
            exportAsof={exportAsof}
            note={
              LIVE?.asof
                ? 'Live quotes as of ' + LIVE.asof + ' (Yahoo Finance) · local currency · click a row for the full chart + metrics'
                : 'Hit ⟳ Refresh data in the top nav to pull live prices from Yahoo Finance · local currency per unit/share'
            }
          >
            <CountryPanels G={G} LIVE={LIVE} onOpen={(ckey, ri) => setModal(buildGlobalSecModal(G, LIVE, ckey, ri))} />
          </Card>
        </div>
      )}

      <SecurityModal data={modal} onClose={() => setModal(null)} />
    </>
  )
}
