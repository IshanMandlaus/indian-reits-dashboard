import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useDataset } from '../lib/useDataset'
import { setupCharts } from '../lib/chartSetup'
import { REIT_KEYS, REIT_SHORT, lastPrice, navAt } from '../lib/reit'
import { inr, pct } from '../lib/format'
import type { ReitKey, ReitSpv } from '../types/data'
import { Chart1PriceNav } from '../components/domestic/Chart1PriceNav'
import { Chart2Issuances } from '../components/domestic/Chart2Issuances'
import { Chart3FvBv } from '../components/domestic/Chart3FvBv'
import { Chart4Ndcf } from '../components/domestic/Chart4Ndcf'
import { Chart5Yield } from '../components/domestic/Chart5Yield'
import { Chart6Capital } from '../components/domestic/Chart6Capital'
import { Chart3cAumMsf } from '../components/domestic/Chart3cAumMsf'
import { Chart3cOccWale } from '../components/domestic/Chart3cOccWale'
import { Chart3dLeasing } from '../components/domestic/Chart3dLeasing'
import { Chart4bDistributions } from '../components/domestic/Chart4bDistributions'
import { Chart6bDebt } from '../components/domestic/Chart6bDebt'
import { Chart7Pb } from '../components/domestic/Chart7Pb'
import { Chart8PbPeers } from '../components/domestic/Chart8PbPeers'
import { SpvTable } from '../components/domestic/SpvTable'
import { Structure } from '../components/domestic/Structure'
import { LinksSection } from '../components/domestic/LinksSection'
import { AnnexModal } from '../components/domestic/AnnexModal'
import { UnitholdingPanel } from '../components/domestic/UnitholdingPanel'

setupCharts()

export function DomesticReitsPage() {
  const [active, setActive] = useState<ReitKey>('embassy')
  const [annexAsset, setAnnexAsset] = useState<ReitSpv | null>(null)

  const reit = useDataset('reit-data')
  const prices = useDataset('live-prices')
  const priceHist = useDataset('price-history')
  const volHist = useDataset('volume-history')
  const lease = useDataset('lease')
  const valHy = useDataset('val-hy')
  const blocksLive = useDataset('blocks-live')
  const structures = useDataset('structures')
  const links = useDataset('links')
  const annexures = useDataset('annexures')
  const holdings = useDataset('holdings')

  const D = reit.data
  const LIVE = prices.data
  const k = active

  if (reit.error) {
    return (
      <>
        <PageHeader title="Domestic REITs" subtitle="Per-REIT deep dive." />
        <Card title="Failed to load data">
          <p className="text-[13px] text-neg">{reit.error.message}</p>
        </Card>
      </>
    )
  }

  if (!D) {
    return (
      <>
        <PageHeader title="Domestic REITs" subtitle="Per-REIT deep dive." />
        <Card title="Loading…">
          <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      </>
    )
  }

  const m = D.meta[k]
  const lp = lastPrice(D, LIVE, k, priceHist.data)
  const nav = navAt(D, k, Date.now())
  const pd = lp.price && nav ? lp.price / nav - 1 : null

  return (
    <>
      <PageHeader
        title="Domestic REITs"
        subtitle="Per-REIT deep dive — price vs NAV, distributions, AUM, capital structure, portfolio assets and trust structure."
        actions={
          LIVE?._asof ? (
            <span className="text-[11.5px] text-subtle">Live prices: {LIVE._asof}</span>
          ) : undefined
        }
      />

      {/* REIT selector */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {REIT_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={[
              'rounded-lg px-3.5 py-2 text-[13px] font-medium transition',
              active === key
                ? 'bg-surface-2 text-ink ring-1 ring-border'
                : 'text-muted hover:bg-surface/60 hover:text-ink',
            ].join(' ')}
          >
            {REIT_SHORT[key]}
          </button>
        ))}
      </div>

      {/* KPI header */}
      <Card className="mb-4" bodyClassName="flex flex-wrap items-center gap-x-10 gap-y-4">
        <div>
          <div className="text-[15px] font-semibold text-ink">{m.name}</div>
          <div className="text-[11.5px] text-muted">
            NSE: {m.nse} · BSE: {m.bse} · Listed {m.listed} · Sponsor: {m.sponsor}
          </div>
        </div>
        <Kpi label={`${lp.live ? 'live price' : 'price'} (${lp.asof})`} value={inr(lp.price, 2)} />
        <Kpi label="latest reported NAV / unit" value={inr(nav, 2)} />
        {pd != null && <Badge tone={pd >= 0 ? 'pos' : 'neg'}>{pct(pd)} vs NAV</Badge>}
      </Card>

      {/* Unit-holding pattern (Sponsor vs Public) for the selected REIT */}
      <UnitholdingPanel holdings={holdings.data} k={k} />

      {/* Bento grid of the 11 sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          className="lg:col-span-2"
          title="1 · Price vs NAV & Trading Volume"
          note="Traded price against reported NAV per unit; bars = combined NSE + BSE daily traded volume (regular market)."
          exportable="chart"
          exportName={`${k}-1-price-vs-nav`}
          exportAsof={lp.price ? `${lp.live ? 'Live price' : 'Price'} as of ${lp.asof} · NSE/BSE` : null}
        >
          <Chart1PriceNav D={D} k={k} LIVE={LIVE} H={priceHist.data} V={volHist.data} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="2 · New Issuances vs NAV"
          note="NAV/unit (gold) with issuance (diamonds) & block-deal (triangles) markers, plus fair value/unit vs dashed book value/unit — the shaded gap is the accretion signal."
          exportable="chart"
          exportName={`${k}-2-issuances`}
        >
          <Chart2Issuances D={D} k={k} valHy={valHy.data} blocksLive={blocksLive.data} />
        </Card>

        <Card title="3 · AUM — Fair Value vs Book Value" note="FV = valuer GAV; BV = investment property + IPUD + PP&E + CWIP." exportable="chart" exportName={`${k}-3-fair-vs-book`}>
          <Chart3FvBv D={D} k={k} />
        </Card>

        <Card
          title="3b · AUM & Leasable Area"
          note="AUM / GAV (bars, ₹ cr) with total leasable and operational area (lines, msf, right axis) per fiscal year."
          exportable="chart"
          exportName={`${k}-3b-aum-msf`}
        >
          <Chart3cAumMsf D={D} k={k} />
        </Card>

        {lease.data && (
          <Card
            title="3c · Occupancy & WALE"
            note="Committed and in-place occupancy (%, left) with weighted-average lease expiry (yrs, right) per fiscal year."
            exportable="chart"
            exportName={`${k}-3c-occupancy-wale`}
          >
            <Chart3cOccWale L={lease.data} k={k} />
          </Card>
        )}

        {lease.data && (
          <Card
            title="3d · Lease Expiries & Renewals"
            note="Per-FY leased area expired vs renewed/re-leased (msf), with the latest forward lease-expiry schedule behind the toggle."
            exportable="chart"
            exportName={`${k}-3d-lease-expiries`}
          >
            <Chart3dLeasing L={lease.data} k={k} />
          </Card>
        )}

        <Card title="4 · NDCF vs Revenue" exportable="chart" exportName={`${k}-4-ndcf`}>
          <Chart4Ndcf D={D} k={k} />
        </Card>

        <Card
          title="4b · Distributions & DPU by FY"
          note="Total distribution paid (bars, ₹ cr) with distribution per unit (line, ₹/unit, right axis) per fiscal year."
          exportable="chart"
          exportName={`${k}-4b-distributions`}
        >
          <Chart4bDistributions D={D} k={k} />
        </Card>

        <Card title="5 · Distribution Yield on AUM (NDCF / GAV)" exportable="chart" exportName={`${k}-5-cash-yield`}>
          <Chart5Yield D={D} k={k} />
        </Card>

        <Card title="6 · Capital Structure (consolidated)" note="Latest FY debt vs unitholders’ equity — click the chart for the year-by-year split." exportable="chart" exportName={`${k}-6-capital-structure`}>
          <Chart6Capital D={D} k={k} />
        </Card>

        <Card
          title="6b · Debt & Leverage Profile"
          note="Gross debt per fiscal year on its own (the debt leg of chart 6), with LTV and cost of financing shown above each bar."
          exportable="chart"
          exportName={`${k}-6b-debt-leverage`}
        >
          <Chart6bDebt D={D} k={k} />
        </Card>

        <Card
          title="7 · P/B Ratio — Price to NAV per Unit"
          note="Traded price ÷ latest reported NAV per unit — above the dashed 1.0× line = premium to NAV, below = discount."
          exportable="chart"
          exportName={`${k}-7-pb-ratio`}
          exportAsof={lp.price ? `${lp.live ? 'Live price' : 'Price'} as of ${lp.asof} · NSE/BSE` : null}
        >
          <Chart7Pb D={D} k={k} LIVE={LIVE} H={priceHist.data} />
        </Card>

        <Card
          title="8 · P/B Across REITs (latest)"
          note="Latest price ÷ latest reported NAV per unit for all six listed REITs; the selected REIT is highlighted."
          exportable="chart"
          exportName={`${k}-8-pb-peers`}
          exportAsof={LIVE?._asof ? `Live prices as of ${LIVE._asof} · NSE/BSE` : null}
        >
          <Chart8PbPeers D={D} k={k} LIVE={LIVE} H={priceHist.data} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="9 · SPVs & Assets — value share of portfolio"
          note="Click any row to open the full annexure (valuation-report pages) for that asset."
        >
          <SpvTable D={D} k={k} annexures={annexures.data} onOpen={setAnnexAsset} />
        </Card>

        <Card className="lg:col-span-2" title="10 · REIT Structure">
          <Structure D={D} k={k} structures={structures.data} />
        </Card>

        <Card className="lg:col-span-2" title="11 · Reports & Filings — direct PDF links">
          <LinksSection k={k} links={links.data} />
        </Card>
      </div>

      <AnnexModal
        k={k}
        asset={annexAsset}
        annexures={annexures.data}
        links={links.data}
        onClose={() => setAnnexAsset(null)}
      />
    </>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[16px] font-semibold text-ink tnum">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  )
}

