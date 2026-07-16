import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { useDataset } from '../lib/useDataset'
import { setupCharts } from '../lib/chartSetup'
import { makeBenchCtx } from '../lib/bench'
import { invitCloses, invitHasData, buildInvitSecModal, combinedReitYieldFY26 } from '../lib/invit'
import { InvitSnapshotCard } from '../components/invit/InvitSnapshotCard'
import {
  InvitPriceChart,
  InvitNavChart,
  InvitPNavChart,
  InvitRebasedChart,
  InvitYieldChart,
  InvitEvChart,
} from '../components/invit/InvitCharts'
import { SecurityModal, type SecModalData } from '../components/charts/SecurityModal'

setupCharts()

export function InvitsPage() {
  const [modal, setModal] = useState<SecModalData | null>(null)

  const bench = useDataset('bench')
  const benchLive = useDataset('bench-live')
  const priceHist = useDataset('price-history')
  const invit = useDataset('invit')
  const reit = useDataset('reit-data')

  const B = bench.data
  const L = benchLive.data
  const IV = invit.data
  const D = reit.data

  const H = priceHist.data
  const ctx = useMemo(() => (B ? makeBenchCtx(B, L, H) : null), [B, L, H])
  const reitYield = useMemo(() => (D ? combinedReitYieldFY26(D) : null), [D])

  if (bench.error || invit.error) {
    return (
      <>
        <PageHeader title="Indian InvITs" subtitle="Highways & power-transmission infrastructure trusts." />
        <Card title="Failed to load data">
          <p className="text-[13px] text-neg">{(bench.error || invit.error)?.message}</p>
        </Card>
      </>
    )
  }

  if (!ctx || !IV) {
    return (
      <>
        <PageHeader title="Indian InvITs" subtitle="Highways & power-transmission infrastructure trusts." />
        <Card title="Loading…">
          <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      </>
    )
  }

  const trusts = IV.trusts
  const hasData = invitHasData(ctx, trusts)
  const asof = 'NHIT · Raajmarg · PGInvIT · fundamentals as of ' + IV.asof + (ctx.liveAsof ? ' · prices to ' + ctx.liveAsof : '')
  // Stamped under the title in exported SVGs (live price charts lose the date otherwise).
  const exportAsof = ctx.liveAsof ? 'Prices to ' + ctx.liveAsof + ' · NSE' : 'Fundamentals as of ' + IV.asof

  return (
    <>
      <PageHeader title="Indian InvITs — Highways & Power Transmission" subtitle={asof} />

      {!hasData && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-[12px] text-warn">
          No InvIT price history loaded yet — hit <b>⟳ Refresh data</b> in the top nav to pull up to ~400 trading days of
          NHIT / RIIT / PGINVIT prices from NSE. Snapshot fundamentals below are pre-loaded.
        </div>
      )}

      {/* Snapshot cards */}
      <Card
        className="mb-4"
        title="Snapshot of listed InvITs tracked"
        note="Government-sponsored infrastructure trusts — NHAI's two road InvITs and PowerGrid's transmission InvIT · click a card for the full price chart + metrics"
        exportable="panel"
        exportName="invits-snapshot"
        exportAsof={exportAsof}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {trusts.map((t) => (
            <InvitSnapshotCard
              key={t.key}
              trust={t}
              closes={invitCloses(ctx, t.key)}
              onClick={() => setModal(buildInvitSecModal(ctx, t))}
            />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          className="lg:col-span-2"
          title="Unit price — NHIT vs RIIT vs PGInvIT"
          note="Daily closes from NSE (populated by Refresh) · wheel to zoom, double-click resets"
          exportable="chart"
          exportName="invits-unit-price"
          exportAsof={exportAsof}
        >
          {hasData ? (
            <InvitPriceChart ctx={ctx} trusts={trusts} />
          ) : (
            <EmptyChart height={360} />
          )}
        </Card>

        <Card
          className="lg:col-span-2"
          title="Unit price vs NAV per unit"
          note="Solid = daily close (NSE) · dashed steps = independent-valuation NAV/unit (NHIT quarterly per its Feb-2026 presentation; PGInvIT FY-end fair-value NAV per its annual reports; RIIT ₹100 issue reference — first valuation pending)"
          exportable="chart"
          exportName="invits-price-vs-nav"
          exportAsof={exportAsof}
        >
          <InvitNavChart ctx={ctx} trusts={trusts} />
        </Card>

        <Card
          title="Price to NAV (latest)"
          note="Last close ÷ latest disclosed NAV/unit · dashed guide = 1.0× parity — NHIT trades above NAV, PGInvIT near it"
          exportable="chart"
          exportName="invits-price-to-nav"
          exportAsof={exportAsof}
        >
          <InvitPNavChart ctx={ctx} trusts={trusts} />
        </Card>

        <Card title="InvITs vs NIFTY 50 vs FD — rebased to 100" exportable="chart" exportName="invits-rebased" exportAsof={exportAsof}>
          {hasData ? <InvitRebasedChart ctx={ctx} trusts={trusts} /> : <EmptyChart height={320} />}
        </Card>

        <Card
          title="Trailing cash yield comparison"
          note="InvIT DPU ÷ price vs Indian REITs combined distribution yield (FY26) vs SBI 1-yr FD & a flat 7% p.a. FD — InvITs are return-OF-capital heavy: yields are not directly comparable to a coupon"
          exportable="chart"
          exportName="invits-cash-yield"
          exportAsof={exportAsof}
        >
          <InvitYieldChart ctx={ctx} trusts={trusts} reitYield={reitYield} />
        </Card>

        <Card
          title="Enterprise value (₹ cr)"
          note="Latest disclosed valuations — NHIT's FY26 valuation ₹56,988 cr dwarfs the newer vehicles"
          exportable="chart"
          exportName="invits-enterprise-value"
          exportAsof={'Valuations as of ' + IV.asof}
        >
          <InvitEvChart trusts={trusts} />
        </Card>
      </div>

      <SecurityModal data={modal} onClose={() => setModal(null)} />
    </>
  )
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-border text-[12px] text-subtle"
      style={{ height }}
    >
      No price history yet — hit ⟳ Refresh data in the top nav to populate this chart.
    </div>
  )
}

