import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { useDataset } from '../lib/useDataset'
import { setupCharts } from '../lib/chartSetup'
import { countrySlices, mcapDrill, sectorDrill, buildGlobalSecModal } from '../lib/global'
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

  if (global.error) {
    return (
      <>
        <PageHeader title="Global REIT Markets" subtitle="Global context for the Indian REIT market." />
        <Card title="Failed to load data">
          <p className="text-[13px] text-neg">{global.error.message}</p>
        </Card>
      </>
    )
  }

  if (!G) {
    return (
      <>
        <PageHeader title="Global REIT Markets" subtitle="Global context for the Indian REIT market." />
        <Card title="Loading…">
          <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      </>
    )
  }

  const mcapWorld = G.countries.reduce((a, c) => a + c.mcap, 0)
  const aumWorld = G.countries.reduce((a, c) => a + c.aum, 0)
  const asof =
    'US · Japan · Australia · Singapore · Hong Kong · China · India' +
    (LIVE?.asof ? ' · live quotes ' + LIVE.asof + ' (Yahoo Finance)' : ' · estimates in global_data')

  return (
    <>
      <PageHeader title="Global REIT Markets" subtitle={asof} actions={<RefreshButton />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Listed REIT market capitalisation by country"
          note="US$ bn listed-REIT market cap — click a country slice to drill into its top listed REITs by market cap."
          exportable="chart"
          exportName="global-mcap-by-country"
        >
          <PieDrilldown slices={mcapSlices} worldTotal={mcapWorld} drill={(k) => mcapDrill(G, k)} />
        </Card>

        <Card
          title="Real-estate AUM (gross assets) by country"
          note="US$ bn gross real-estate AUM (US included — click its legend swatch to hide/show) — click a country slice to drill into its AUM by sector."
          exportable="chart"
          exportName="global-aum-by-country"
        >
          <PieDrilldown
            slices={aumSlices}
            worldTotal={aumWorld}
            tooltipSuffix=" gross assets"
            drill={(k) => sectorDrill(G, k)}
          />
        </Card>

        <Card
          className="lg:col-span-2"
          title="Country panels — top 5 listed REITs each (live quotes)"
          exportable="panel"
          exportName="global-market-leaders"
          note={
            LIVE?.asof
              ? 'Live quotes as of ' + LIVE.asof + ' (Yahoo Finance) · local currency · click a row for the full chart + metrics'
              : 'Hit ⟳ Refresh (with serve.py running) to pull live prices from Yahoo Finance · local currency per unit/share'
          }
        >
          <CountryPanels G={G} LIVE={LIVE} onOpen={(ckey, ri) => setModal(buildGlobalSecModal(G, LIVE, ckey, ri))} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="Case studies — government REITs & private REITs"
          note="Renting to the state, private NAV-priced vehicles, and state-directed listings"
        >
          <div className="space-y-2.5">
            {G.cases.map((c) => (
              <div key={c.title} className="rounded-lg border-l-[3px] border-accent bg-surface-2 px-4 py-3">
                <div className="text-[10.5px] font-bold tracking-[0.05em] text-accent">{c.tag}</div>
                <div className="mb-1 mt-0.5 text-[14.5px] font-bold text-ink">{c.title}</div>
                <p className="text-[12.5px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <TemasekPanel t={G.temasek} />
        </Card>
      </div>

      <SecurityModal data={modal} onClose={() => setModal(null)} />
    </>
  )
}

function TemasekPanel({ t }: { t: import('../types/data').GlobalTemasek }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-accent/60 bg-gradient-to-br from-accent/10 to-info/[0.06] px-5 py-4">
      <div className="text-[10.5px] font-bold tracking-[0.05em] text-accent">CASE STUDY · SINGAPORE</div>
      <div className="mt-0.5 text-[17px] font-bold text-ink">{t.title}</div>
      <div className="my-3 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
        {t.facts.map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-subtle">{l}</div>
            <div className="mt-0.5 text-[13px] font-semibold text-ink">{v}</div>
          </div>
        ))}
      </div>
      <h4 className="mb-1 mt-3 text-[13px] font-semibold text-gold">Around the world</h4>
      <p className="text-[12.5px] leading-relaxed text-muted">{t.world}</p>
      <h4 className="mb-1 mt-3 text-[13px] font-semibold text-gold">In India</h4>
      <p className="text-[12.5px] leading-relaxed text-muted">{t.india}</p>
    </div>
  )
}

function RefreshButton() {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const refresh = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const r = await fetch('/refresh-global', { method: 'POST' })
      const j = await r.json()
      if (j.error) throw new Error(j.error)
      location.reload()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }
  return (
    <button
      onClick={refresh}
      disabled={busy}
      className="rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-bg transition hover:bg-accent-strong disabled:opacity-50"
    >
      {busy ? 'Refreshing…' : failed ? '⟳ Refresh failed — run serve.py' : '⟳ Refresh live quotes (Yahoo)'}
    </button>
  )
}
