/**
 * Combined REIT basket trailing distribution yield (bars) vs Nifty 50 and
 * Nifty Realty dividend yields (lines), per FY-end plus a live "Latest"
 * category (basket = latest-FY distributions ÷ current market cap; indices =
 * last niftyindices print). Single % axis, category x, no zoom.
 */
import type { ChartConfiguration } from 'chart.js'
import type { IndexYields, LivePrices, ReitData } from '../../types/data'
import { type BenchCtx, basketDistYield, basketDistYieldLatest } from '../../lib/bench'
import { CHART } from '../../lib/chartSetup'
import { useChartCanvas } from '../charts/useChartCanvas'

const FYS = ['FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025', 'FY2026']

interface Props {
  ctx: BenchCtx
  D: ReitData
  LIVE: LivePrices | null
  IY: IndexYields | null
}

export function BenchmarkYieldChart({ ctx, D, LIVE, IY }: Props) {
  const { canvasRef } = useChartCanvas(() => build(ctx, D, LIVE, IY), [ctx, D, LIVE, IY])
  return (
    <div className="relative h-[320px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

function indexLine(IY: IndexYields | null, name: string): (number | null)[] {
  const s = IY?.yields?.[name]
  return [...FYS.map((fy) => s?.fy?.[fy]?.dy ?? null), s?.latest?.dy ?? null]
}

function build(ctx: BenchCtx, D: ReitData, LIVE: LivePrices | null, IY: IndexYields | null): ChartConfiguration {
  const basket = [...FYS.map((fy) => basketDistYield(D, fy)), basketDistYieldLatest(ctx, D, LIVE)]
  return {
    type: 'bar',
    data: {
      labels: [...FYS, 'Latest'],
      datasets: [
        {
          type: 'bar',
          label: 'REIT basket distribution yield %',
          data: basket,
          backgroundColor: CHART.acc,
          maxBarThickness: 42,
          order: 5,
        },
        {
          type: 'line',
          label: 'Nifty 50 dividend yield %',
          data: indexLine(IY, 'NIFTY 50'),
          borderColor: CHART.info,
          backgroundColor: CHART.info,
          borderWidth: 2,
          pointRadius: 3,
          order: 0,
        },
        {
          type: 'line',
          label: 'Nifty Realty dividend yield %',
          data: indexLine(IY, 'NIFTY REALTY'),
          borderColor: '#fbbf24',
          backgroundColor: '#fbbf24',
          borderWidth: 2,
          pointRadius: 3.5,
          pointStyle: 'rectRot',
          order: 0,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 12 } },
        barValueLabels: { format: (v) => v.toFixed(1) + '%' }, // export-only value above each bar
      },
      scales: {
        x: { grid: { display: false } },
        y: { min: 0, title: { display: true, text: '%' } },
      },
    },
  }
}
