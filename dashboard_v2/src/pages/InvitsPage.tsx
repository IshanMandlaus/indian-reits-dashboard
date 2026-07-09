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
  const invit = useDataset('invit')
  const reit = useDataset('reit-data')

  const B = bench.data
  const L = benchLive.data
  const IV = invit.data
  const D = reit.data

  const ctx = useMemo(() => (B ? makeBenchCtx(B, L) : null), [B, L])
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

  return (
    <>
      <PageHeader
        title="Indian InvITs — Highways & Power Transmission"
        subtitle={asof}
        actions={<RefreshButton />}
      />

      {!hasData && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-[12px] text-warn">
          No InvIT price history loaded yet — hit <b>⟳ Refresh live</b> (with{' '}
          <code className="rounded bg-surface-2 px-1">python3 serve.py</code> running) to pull up to ~400 trading days of
          NHIT / RIIT / PGINVIT prices from NSE. Snapshot fundamentals below are pre-loaded.
        </div>
      )}

      {/* Snapshot cards */}
      <Card
        className="mb-4"
        title="The three listed InvITs at a glance"
        note="Government-sponsored infrastructure trusts — NHAI's two road InvITs and PowerGrid's transmission InvIT · click a card for the full price chart + metrics"
        exportable="panel"
        exportName="invits-snapshot"
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
          title="Range-bound prices — InvITs trade on yield, not growth"
          note="Daily closes from NSE (populated by Refresh) · wheel to zoom, double-click resets"
          exportable="chart"
          exportName="invits-unit-price"
        >
          {hasData ? (
            <InvitPriceChart ctx={ctx} trusts={trusts} />
          ) : (
            <EmptyChart height={360} />
          )}
        </Card>

        <Card title="InvITs behave like bonds — steady against the market" exportable="chart" exportName="invits-rebased">
          {hasData ? <InvitRebasedChart ctx={ctx} trusts={trusts} /> : <EmptyChart height={320} />}
        </Card>

        <Card
          title="InvITs out-yield REITs, FDs and G-secs"
          note="InvIT DPU ÷ price vs Indian REITs combined distribution yield (FY26) vs SBI 1-yr FD & a flat 7% p.a. FD — InvITs are return-OF-capital heavy: yields are not directly comparable to a coupon"
          exportable="chart"
          exportName="invits-cash-yield"
        >
          <InvitYieldChart ctx={ctx} trusts={trusts} reitYield={reitYield} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="NHIT dwarfs the newer trusts by enterprise value"
          note="Latest disclosed valuations — NHIT's FY26 valuation ₹56,988 cr dwarfs the newer vehicles"
          exportable="chart"
          exportName="invits-enterprise-value"
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
      No price history yet — run ⟳ Refresh (with serve.py) to populate this chart.
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
      const r = await fetch('/refresh-market', { method: 'POST' })
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
      {busy ? 'Refreshing…' : failed ? '⟳ Refresh failed — run serve.py' : '⟳ Refresh live (NSE)'}
    </button>
  )
}
