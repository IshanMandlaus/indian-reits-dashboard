import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { ChartPlaceholder } from '../components/ui/ChartPlaceholder'

export function InvitsPage() {
  return (
    <>
      <PageHeader
        title="InvITs"
        subtitle="Snapshot and benchmark comparison for government-sponsored InvITs — NHIT, Raajmarg (RIIT) and PGInvIT."
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {['NHIT', 'Raajmarg (RIIT)', 'PGInvIT'].map((n) => (
          <Card key={n} bodyClassName="!px-4">
            <div className="text-[13px] font-semibold text-ink">{n}</div>
            <div className="mt-1 text-[11px] text-muted">snapshot card</div>
            <ChartPlaceholder height={44} label="spark" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2" title="Unit price — NHIT vs RIIT vs PGInvIT">
          <ChartPlaceholder height={300} label="Unit price" />
        </Card>
        <Card title="InvITs vs NIFTY 50 vs FD — rebased to 100">
          <ChartPlaceholder label="Rebased" />
        </Card>
        <Card title="Trailing cash yield comparison">
          <ChartPlaceholder label="Cash yield" />
        </Card>
        <Card className="lg:col-span-2" title="Enterprise value (₹ cr)">
          <ChartPlaceholder height={160} label="EV" />
        </Card>
      </div>
    </>
  )
}
