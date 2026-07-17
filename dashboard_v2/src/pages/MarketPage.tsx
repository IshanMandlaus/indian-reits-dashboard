import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { useDataset } from '../lib/useDataset'
import { setupCharts } from '../lib/chartSetup'
import { makeBenchCtx, buildSnapRows, buildReitSecModal } from '../lib/bench'
import { SnapshotCard } from '../components/market/SnapshotCard'
import { KeyFinancialsTable } from '../components/market/KeyFinancialsTable'
import { BenchLevels, BenchRebased, BenchVets } from '../components/market/BenchmarkCharts'
import { AreaChart } from '../components/market/AreaChart'
import { VolumeCharts } from '../components/market/VolumeCharts'
import { DistributionChart } from '../components/market/DistributionChart'
import { BenchmarkYieldChart } from '../components/market/BenchmarkYieldChart'
import { SecurityModal, type SecModalData } from '../components/charts/SecurityModal'
import { Chart8PbPeers } from '../components/domestic/Chart8PbPeers'
import { PbAllChart } from '../components/market/PbAllChart'

setupCharts()

const WINDOWS: [string, number][] = [
  ['1Y', 1],
  ['3Y', 3],
  ['5Y', 5],
  ['Max', 99],
]

export function MarketPage() {
  const [years, setYears] = useState(3)
  const [modal, setModal] = useState<SecModalData | null>(null)

  const bench = useDataset('bench')
  const benchLive = useDataset('bench-live')
  const priceHist = useDataset('price-history')
  const reit = useDataset('reit-data')
  const prices = useDataset('live-prices')
  const indexYields = useDataset('index-yields')
  const keyfin = useDataset('keyfin')

  const B = bench.data
  const L = benchLive.data
  const D = reit.data
  const LIVE = prices.data
  const IY = indexYields.data

  const H = priceHist.data
  const ctx = useMemo(() => (B ? makeBenchCtx(B, L, H) : null), [B, L, H])
  const snapRows = useMemo(() => (ctx && D ? buildSnapRows(ctx, D, LIVE) : []), [ctx, D, LIVE])

  if (bench.error || reit.error) {
    return (
      <>
        <PageHeader title="Market & Benchmarks" subtitle="Cross-REIT comparison and benchmark performance." />
        <Card title="Failed to load data">
          <p className="text-[13px] text-neg">{(bench.error || reit.error)?.message}</p>
        </Card>
      </>
    )
  }

  if (!ctx || !D) {
    return (
      <>
        <PageHeader title="Market & Benchmarks" subtitle="Cross-REIT comparison and benchmark performance." />
        <Card title="Loading…">
          <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      </>
    )
  }

  const asof =
    'Prices to ' + ctx.asof + (LIVE?._asof ? ' · live quotes ' + LIVE._asof : '') + ' · sources: NSE/BSE + live refresh'
  // Stamped under the title in exported SVGs (live price charts lose the date otherwise).
  const exportAsof = 'Prices to ' + ctx.asof + ' · NSE/BSE'

  return (
    <>
      <PageHeader title="Market & Benchmarks" subtitle={asof} />

      {/* Exhibit 1 — snapshot cards */}
      <Card
        className="mb-4"
        title="Snapshot of REITs in India"
        note="Ordered by market cap · click a card for the full price chart + NSE/BSE metrics"
        exportable="panel"
        exportName="market-snapshot"
        exportAsof={exportAsof}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapRows.map((row) => (
            <SnapshotCard
              key={row.key}
              row={row}
              onClick={() => setModal(buildReitSecModal(ctx, D, LIVE, row.security))}
            />
          ))}
        </div>
      </Card>

      {/* Exhibit 1b — FY2026 key-financials comparison table */}
      {keyfin.data && (
        <Card
          className="mb-4"
          title={`REIT key financials — ${keyfin.data.fy} comparison`}
          note="From the key-financials workbook (consolidated basis, INR crore) · values page-cited in the audit citations"
          exportable="panel"
          exportName="market-keyfin-fy2026"
          exportAsof={`${keyfin.data.fy} · ${keyfin.data.basis.toLowerCase()} · ₹ cr`}
        >
          <KeyFinancialsTable KF={keyfin.data} />
        </Card>
      )}

      {/* Shared benchmark window */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-muted">Time window:</span>
        {WINDOWS.map(([lbl, v]) => (
          <button
            key={lbl}
            onClick={() => setYears(v)}
            className={[
              'rounded-md px-3 py-1 text-[12px] font-medium transition',
              years === v ? 'bg-accent/15 text-accent' : 'text-subtle hover:text-ink',
            ].join(' ')}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          className="lg:col-span-2"
          title="Listed REITs (combined) vs NIFTY REALTY — price levels"
          note="Combined = sum of unit prices of all listed REITs (basket grows at each IPO: KRT Aug-25, Bagmane May-26)"
          exportable="chart"
          exportName="market-levels"
          exportAsof={exportAsof}
        >
          <BenchLevels ctx={ctx} years={years} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="Relative performance — rebased to 100"
          note="Listed REITs (combined, growing basket) vs NIFTY 50 · SENSEX · NIFTY REALTY · SBI 1-yr FD (stepped) · a flat 7% p.a. FD · GoI 10Y G-Sec. SENSEX appears after the first live refresh."
          exportable="chart"
          exportName="market-rebased"
          exportAsof={exportAsof}
        >
          <BenchRebased ctx={ctx} years={years} />
        </Card>

        <Card
          title="Veterans only vs NIFTY 50 — rebased"
          note="Embassy + Mindspace + Brookfield + Nexus (KRT & Bagmane excluded owing to IPO recency)"
          exportable="chart"
          exportName="market-veterans"
          exportAsof={exportAsof}
        >
          <BenchVets ctx={ctx} years={years} />
        </Card>

        <Card title="Total area breakdown (msf)" note="Completed vs under construction vs future development · UC for Embassy, Mindspace & Brookfield per last disclosed split" exportable="chart" exportName="market-development-pipeline">
          <AreaChart ctx={ctx} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="Trading volume trajectory — turnover rebased to 100 (Jun 30, 2025 = 100)"
          note="REITs basket = Embassy + Mindspace + Brookfield + Nexus daily traded turnover · ▲ 24-Feb-26: Embassy block deal — PPFAS bought ~5.63 cr units (~6%) at ₹420 from exiting Capital Group funds"
          exportable="chart"
          exportName="market-turnover"
          exportAsof={B ? 'Turnover data to ' + B.asof + ' (workbook basis)' : null}
        >
          <VolumeCharts ctx={ctx} years={years} />
        </Card>

        <Card
          className="lg:col-span-2"
          title="P/B Ratio — Price to NAV per Unit, all REITs"
          note="Traded price ÷ latest reported NAV per unit · dashed line = parity (1.0×) · each line starts at that REIT's first reported NAV (Nexus Apr 2024, KRT Apr 2026)"
          exportable="chart"
          exportName="market-pb-all-reits"
          exportAsof={LIVE?._asof ? `Live prices as of ${LIVE._asof} · NSE/BSE` : null}
        >
          <PbAllChart D={D} LIVE={LIVE} years={years} H={H} />
        </Card>

        <Card
          title="Distributions vs FD"
          note="Total distributions paid per FY (₹ cr, stacked) · combined trailing distribution yield vs SBI 1-yr FD rate and a flat 7% p.a. FD"
          exportable="chart"
          exportName="market-distributions"
        >
          <DistributionChart ctx={ctx} D={D} />
        </Card>

        <Card
          title="Distribution yield vs index dividend yields"
          note="Combined REIT basket trailing distribution yield per FY (bars) vs Nifty 50 and Nifty Realty dividend yields at FY-end · Latest = live prices / last NSE print · Source: niftyindices.com P/E, P/B & div-yield data"
          exportable="chart"
          exportName="market-yield-vs-indices"
          exportAsof={IY?.asof ? `Index yields as of ${IY.asof} · niftyindices.com` : null}
        >
          <BenchmarkYieldChart ctx={ctx} D={D} LIVE={LIVE} IY={IY} />
        </Card>

        <Card
          title="P/B across REITs (latest)"
          note="Latest price ÷ latest reported NAV per unit for all six listed REITs · dashed line = parity (1.0×)"
          exportable="chart"
          exportName="market-pb-peers"
          exportAsof={LIVE?._asof ? `Live prices as of ${LIVE._asof} · NSE/BSE` : null}
        >
          <Chart8PbPeers D={D} LIVE={LIVE} H={H} />
        </Card>
      </div>

      <SecurityModal data={modal} onClose={() => setModal(null)} />
    </>
  )
}
