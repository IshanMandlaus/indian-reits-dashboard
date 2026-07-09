import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useDataset } from '../lib/useDataset'
import { setupCharts } from '../lib/chartSetup'
import { REIT_KEYS, REIT_SHORT, buildInsights, lastPrice, navAt } from '../lib/reit'
import { inr, pct } from '../lib/format'
import type { ReitKey, ReitSpv } from '../types/data'
import { Chart1PriceNav } from '../components/domestic/Chart1PriceNav'
import { Chart2Issuances } from '../components/domestic/Chart2Issuances'
import { Chart3FvBv } from '../components/domestic/Chart3FvBv'
import { Chart4Ndcf } from '../components/domestic/Chart4Ndcf'
import { Chart5Yield } from '../components/domestic/Chart5Yield'
import { Chart6Capital } from '../components/domestic/Chart6Capital'
import { SpvTable } from '../components/domestic/SpvTable'
import { Structure } from '../components/domestic/Structure'
import { LinksSection } from '../components/domestic/LinksSection'
import { AnnexModal } from '../components/domestic/AnnexModal'

setupCharts()

/** Renders an insight line (may contain <b>) from buildInsights. */
function Insight({ html }: { html: string }) {
  return (
    <p
      className="mb-3 text-[12.5px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-ink"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function DomesticReitsPage() {
  const [active, setActive] = useState<ReitKey>('embassy')
  const [annexAsset, setAnnexAsset] = useState<ReitSpv | null>(null)

  const reit = useDataset('reit-data')
  const prices = useDataset('live-prices')
  const valHy = useDataset('val-hy')
  const blocksLive = useDataset('blocks-live')
  const structures = useDataset('structures')
  const links = useDataset('links')
  const annexures = useDataset('annexures')

  const D = reit.data
  const LIVE = prices.data
  const k = active

  const insights = useMemo(() => (D ? buildInsights(D, LIVE, k) : null), [D, LIVE, k])

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

  if (!D || !insights) {
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
  const lp = lastPrice(D, LIVE, k)
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

      {/* Bento grid of the 9 sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          className="lg:col-span-2"
          title="1 · Price orbits NAV — the premium/discount is the signal"
          note="Traded price (NSE/BSE) against reported NAV per unit; bars = distribution per unit."
          exportable="chart"
          exportName={`${k}-1-price-vs-nav`}
        >
          <Insight html={insights.c1} />
          <Chart1PriceNav D={D} k={k} LIVE={LIVE} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="2 · Assets enter at cost and mark up above book"
          note="NAV/unit (gold) with issuance (diamonds) & block-deal (triangles) markers, plus fair value/unit vs dashed book value/unit — the shaded gap is the accretion signal."
          exportable="chart"
          exportName={`${k}-2-issuances`}
        >
          <Insight html={insights.c2} />
          <Chart2Issuances D={D} k={k} valHy={valHy.data} blocksLive={blocksLive.data} />
        </Card>

        <Card title="3 · Fair value keeps pulling ahead of book" note="FV = valuer GAV; BV = investment property + IPUD + PP&E + CWIP." exportable="chart" exportName={`${k}-3-fair-vs-book`}>
          <Insight html={insights.c3} />
          <Chart3FvBv D={D} k={k} />
        </Card>

        <Card title="4 · Distributable cash grows with the top line" exportable="chart" exportName={`${k}-4-ndcf`}>
          <Insight html={insights.c4} />
          <Chart4Ndcf D={D} k={k} />
        </Card>

        <Card title="5 · The cash return the assets throw off (NDCF ÷ GAV)" exportable="chart" exportName={`${k}-5-cash-yield`}>
          <Insight html={insights.c5} />
          <Chart5Yield D={D} k={k} />
        </Card>

        <Card title="6 · Low leverage by design — equity carries the stack" note="Latest FY debt vs unitholders’ equity — click the chart for the year-by-year split." exportable="chart" exportName={`${k}-6-capital-structure`}>
          <Insight html={insights.c6} />
          <Chart6Capital D={D} k={k} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="7 · A handful of assets carry most of the value"
          note="Click any row to open the full annexure (valuation-report pages) for that asset."
        >
          <Insight html={insights.c7} />
          <SpvTable D={D} k={k} annexures={annexures.data} onOpen={setAnnexAsset} />
        </Card>

        <Card className="lg:col-span-2" title="8 · One trust, many SPVs — how the assets are held">
          <Structure D={D} k={k} structures={structures.data} />
        </Card>

        <Card className="lg:col-span-2" title="9 · Straight to the source — filings & valuation reports">
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
