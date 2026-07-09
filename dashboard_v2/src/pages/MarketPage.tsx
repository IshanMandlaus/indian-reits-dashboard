import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ChartPlaceholder } from '../components/ui/ChartPlaceholder'

export function MarketPage() {
  return (
    <>
      <PageHeader
        title="Market & Benchmarks"
        subtitle="Cross-REIT comparison and benchmark performance vs NIFTY, SENSEX, FDs and G-Secs."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {['Embassy', 'Mindspace', 'Brookfield', 'Nexus', 'KRT', 'Bagmane'].map((n) => (
          <Card key={n} bodyClassName="!px-4">
            <div className="text-[13px] font-semibold text-ink">{n}</div>
            <div className="mt-1 text-[11px] text-muted">snapshot card</div>
            <ChartPlaceholder height={44} label="spark" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2" title="Listed REITs (combined) vs NIFTY REALTY">
          <ChartPlaceholder height={300} label="Price levels" />
        </Card>
        <Card title="Relative performance — rebased to 100">
          <ChartPlaceholder label="Rebased" />
        </Card>
        <Card title="Veterans only vs NIFTY 50">
          <ChartPlaceholder label="Veterans" />
        </Card>
        <Card title="Total area breakdown (msf)">
          <ChartPlaceholder label="Area" />
        </Card>
        <Card title="Trading volume trajectory">
          <ChartPlaceholder label="Volume" />
        </Card>
        <Card className="lg:col-span-2" title="Distributions vs FD">
          <ChartPlaceholder label="Distributions" />
        </Card>
      </div>
    </>
  )
}
