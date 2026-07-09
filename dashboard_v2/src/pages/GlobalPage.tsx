import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ChartPlaceholder } from '../components/ui/ChartPlaceholder'

export function GlobalPage() {
  return (
    <>
      <PageHeader
        title="Global REIT Markets"
        subtitle="Global context — market cap and AUM by country, per-country top REITs with live quotes, and case studies."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Listed REIT market cap by country" note="Click a slice to drill into that country's top REITs.">
          <ChartPlaceholder label="Market cap pie" />
        </Card>
        <Card title="Real-estate AUM by country" note="Click a slice to drill into the sector breakdown.">
          <ChartPlaceholder label="AUM pie" />
        </Card>
        <Card className="lg:col-span-2" title="Country panels — top 5 listed REITs each (live quotes)">
          <ChartPlaceholder height={220} label="Country panels" />
        </Card>
        <Card className="lg:col-span-2" title="Case studies — government & private REITs">
          <ChartPlaceholder height={160} label="Case studies" />
        </Card>
      </div>
    </>
  )
}
