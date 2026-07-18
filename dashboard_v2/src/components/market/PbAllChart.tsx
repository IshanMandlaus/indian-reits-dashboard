/**
 * P/B ratio (traded price ÷ latest reported NAV per unit) for all six REITs on
 * one time axis, with a dashed 1.0× parity line. Follows the page's shared
 * benchmark window (`years`); per the complete-pairs rule each line starts at
 * that REIT's first reported NAV (Nexus Apr 2024, KRT Apr 2026).
 */
import type { ChartConfiguration } from 'chart.js'
import type { ReitData, LivePrices, PriceHistory } from '../../types/data'
import { baseOptions, zoomOptions, CHART, type RangeConfig } from '../../lib/chartSetup'
import { REIT_KEYS, REIT_SHORT, pbSeries, fmtM, fmtDay } from '../../lib/reit'
import { REIT_COLOR } from '../../lib/geo'
import { TimeSeriesChart, ZOOM_HINT } from '../charts/TimeSeriesChart'

const DAY = 864e5

export function PbAllChart({
  D,
  LIVE,
  years,
  H,
}: {
  D: ReitData
  LIVE: LivePrices | null
  years: number
  H: PriceHistory | null
}) {
  return (
    <TimeSeriesChart
      deps={[D, LIVE, years, H]}
      height={340}
      caption={ZOOM_HINT}
      build={() => build(D, LIVE, years, H)}
    />
  )
}

function build(D: ReitData, LIVE: LivePrices | null, years: number, H: PriceHistory | null): ChartConfiguration {
  const from = years >= 99 ? -Infinity : Date.now() - years * 365.25 * DAY
  const series = REIT_KEYS.map((k) => ({
    k,
    pts: pbSeries(D, k, LIVE, H).filter((p) => p.x >= from),
  })).filter((s) => s.pts.length > 0)

  const xs = series.flatMap((s) => s.pts.map((p) => p.x))
  const xmin = xs.length ? Math.min(...xs) : 0
  const xmax = xs.length ? Math.max(...xs) : 0

  const cfg: RangeConfig = {
    type: 'line',
    data: {
      datasets: [
        ...series.map((s) => ({
          label: REIT_SHORT[s.k],
          data: s.pts,
          borderColor: REIT_COLOR[s.k],
          borderWidth: 1.6,
          pointRadius: 0,
        })),
        {
          label: 'Parity (1.0×)',
          data: [
            { x: xmin, y: 1 },
            { x: xmax, y: 1 },
          ],
          borderColor: CHART.bookGrid,
          borderWidth: 1,
          borderDash: [5, 4],
          pointRadius: 0,
        },
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: {
          type: 'linear',
          min: xmin,
          max: xmax,
          ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 14 },
          grid: { display: false },
        },
        y: { title: { display: true, text: 'P/B (×)' }, grace: '5%', ticks: { callback: (v) => (+v).toFixed(2) + '×' } },
      },
      plugins: {
        ...baseOptions().plugins,
        zoom: zoomOptions(),
        tooltip: {
          filter: (it) => it.dataset.label !== 'Parity (1.0×)',
          callbacks: {
            title: (it) => (it[0] ? fmtDay(it[0].parsed.x as number) : ''),
            label: (it) => it.dataset.label + ': ' + (it.parsed.y as number).toFixed(2) + '×',
          },
        },
      },
    },
  }
  cfg._xmin = xmin
  cfg._xmax = xmax
  return cfg
}
