import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ChartPlaceholder } from '../components/ui/ChartPlaceholder'

const REITS = [
  { key: 'embassy', label: 'Embassy' },
  { key: 'mindspace', label: 'Mindspace' },
  { key: 'brookfield', label: 'Brookfield' },
  { key: 'nexus', label: 'Nexus' },
  { key: 'krt', label: 'Knowledge (KRT)' },
  { key: 'bagmane', label: 'Bagmane' },
]

export function DomesticReitsPage() {
  const [active, setActive] = useState('embassy')

  return (
    <>
      <PageHeader
        title="Domestic REITs"
        subtitle="Per-REIT deep dive — price vs NAV, distributions, AUM, capital structure, portfolio assets and trust structure."
        actions={
          <button className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-bg transition hover:bg-accent-strong">
            ⟳ Refresh live prices
          </button>
        }
      />

      {/* REIT selector */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {REITS.map((r) => (
          <button
            key={r.key}
            onClick={() => setActive(r.key)}
            className={[
              'rounded-lg px-3.5 py-2 text-[13px] font-medium transition',
              active === r.key
                ? 'bg-surface-2 text-ink ring-1 ring-border'
                : 'text-muted hover:bg-surface/60 hover:text-ink',
            ].join(' ')}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI header */}
      <Card className="mb-4" bodyClassName="flex flex-wrap items-center gap-x-10 gap-y-4">
        <div>
          <div className="text-[15px] font-semibold text-ink">Embassy Office Parks REIT</div>
          <div className="text-[11.5px] text-muted">NSE: EMBASSY · BSE: 542602 · Listed Apr 2019</div>
        </div>
        <Kpi label="live price" value="₹369.92" />
        <Kpi label="latest NAV / unit" value="₹411.30" />
        <Badge tone="neg">−10.1% vs NAV</Badge>
      </Card>

      {/* Bento grid of the 9 sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2" title="1 · Price vs NAV & Distributions" note="Traded price against reported NAV/unit; bars = distribution per unit.">
          <ChartPlaceholder height={300} label="Price vs NAV" />
        </Card>
        <Card className="lg:col-span-2" title="2 · New Issuances vs NAV" note="Fair value/unit vs book value/unit with issuance & block-deal markers.">
          <ChartPlaceholder height={280} label="Issuances vs NAV" />
        </Card>
        <Card title="3 · AUM — Fair Value vs Book Value">
          <ChartPlaceholder label="AUM FV vs BV" />
        </Card>
        <Card title="4 · NDCF vs Revenue">
          <ChartPlaceholder label="NDCF vs Revenue" />
        </Card>
        <Card title="5 · Distribution Yield on AUM">
          <ChartPlaceholder label="Distribution yield" />
        </Card>
        <Card title="6 · Capital Structure">
          <ChartPlaceholder label="Debt vs equity" />
        </Card>
        <Card className="lg:col-span-2" title="7 · SPVs & Assets — value share of portfolio" note="Click any row to open the full valuation-report annexure.">
          <ChartPlaceholder height={220} label="SPV / asset table" />
        </Card>
        <Card className="lg:col-span-2" title="8 · REIT Structure">
          <ChartPlaceholder height={260} label="Structure diagram" />
        </Card>
        <Card className="lg:col-span-2" title="9 · Reports & Filings">
          <ChartPlaceholder height={120} label="PDF links" />
        </Card>
      </div>
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
