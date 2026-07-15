/**
 * Chart 8 — current P/B (latest price ÷ latest reported NAV per unit) across
 * all six listed REITs, horizontal bars with a dashed guide at 1.0× parity.
 * Pass `k` to highlight that REIT (Domestic page); omit it for uniform bars
 * (Market page).
 */
import type { ReitData, ReitKey, LivePrices } from '../../types/data'
import { CHART, baseOptions, labelFont } from '../../lib/chartSetup'
import { REIT_KEYS, REIT_SHORT, lastPrice, navAtStrict } from '../../lib/reit'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'

export function Chart8PbPeers({
  D,
  k = null,
  LIVE,
}: {
  D: ReitData
  k?: ReitKey | null
  LIVE: LivePrices | null
}) {
  const { canvasRef } = useChartCanvas(() => build(D, k, LIVE), [D, k, LIVE])
  return (
    <div className="relative h-[240px]">
      <canvas ref={canvasRef} />
    </div>
  )
}

interface PeerRow {
  key: ReitKey
  pb: number
  price: number | null
  nav: number | null
}

function build(D: ReitData, k: ReitKey | null, LIVE: LivePrices | null): ChartConfiguration {
  const rows: PeerRow[] = REIT_KEYS.flatMap((key) => {
    const lp = lastPrice(D, LIVE, key)
    const nav = navAtStrict(D, key, Date.now())
    return lp.price && nav ? [{ key, pb: lp.price / nav, price: lp.price, nav }] : []
  })

  const labelPlugin: Plugin = {
    id: 'pbPeerLabels',
    afterDatasetsDraw(ch) {
      const ctx = ch.ctx
      const mt = ch.getDatasetMeta(0)
      ctx.save()
      ctx.font = labelFont() // scales up during the SVG export capture
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      mt.data.forEach((el, i) => {
        // defaults.color === CHART.mut normally, but flips to black ink while the
        // SVG export's light re-theme is active — hardcoding CHART.mut exported grey
        ctx.fillStyle = k && rows[i].key === k ? CHART.acc : (Chart.defaults.color as string)
        ctx.fillText(rows[i].pb.toFixed(2) + '×', el.x + 6, el.y)
      })
      ctx.restore()
    },
  }
  const parityPlugin: Plugin = {
    id: 'pbPeerParity',
    beforeDatasetsDraw(ch) {
      const xs = ch.scales.x
      if (!xs) return
      const px = xs.getPixelForValue(1)
      if (px < xs.left || px > xs.right) return
      const ctx = ch.ctx
      ctx.save()
      ctx.strokeStyle = CHART.bookGrid
      ctx.setLineDash([5, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, ch.chartArea.top)
      ctx.lineTo(px, ch.chartArea.bottom)
      ctx.stroke()
      ctx.restore()
    },
  }

  return {
    type: 'bar',
    data: {
      labels: rows.map((r) => REIT_SHORT[r.key]),
      datasets: [
        {
          label: 'P/B (latest price ÷ latest NAV)',
          data: rows.map((r) => r.pb),
          backgroundColor: rows.map((r) =>
            k ? (r.key === k ? CHART.acc : 'rgba(147,160,184,.55)') : CHART.acc,
          ),
        },
      ],
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, grace: '12%', ticks: { callback: (v) => (+v).toFixed(1) + '×' }, grid: { display: false } },
        y: { grid: { display: false } },
      },
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        barValueLabels: { display: false }, // draws its own P/B labels (labelPlugin)
        tooltip: {
          callbacks: {
            label: (it) => {
              const r = rows[it.dataIndex]
              return ['P/B: ' + r.pb.toFixed(2) + '×', 'price ' + inr(r.price, 2) + ' ÷ NAV ' + inr(r.nav, 2)]
            },
          },
        },
      },
    },
    plugins: [labelPlugin, parityPlugin],
  }
}
