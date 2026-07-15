/**
 * Chart 6b — debt & leverage profile. The debt leg of the capital structure on
 * its own (gross debt ₹cr, year by year, no equity), with the two leverage
 * metrics the bars can't show — LTV and cost of financing (weighted-avg cost of
 * debt) — drawn above each bar. Both come from Indian_REITs_Key_Financials_FILLED
 * (fin.ltv / fin.cost_debt). Companion to Chart 6 (the debt-vs-equity split).
 */
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions, EXPORT_STATE, labelFont } from '../../lib/chartSetup'
import { fmtCrLabel } from '../../lib/barValueLabels'
import { inr } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { Chart, type ChartConfiguration, type Plugin } from 'chart.js'

const asPct = (v: number | null | undefined, dec = 1) => (v == null ? null : (100 * v).toFixed(dec) + '%')

export function Chart6bDebt({ D, k }: { D: ReitData; k: ReitKey }) {
  const { canvasRef } = useChartCanvas(() => build(D, k), [D, k])
  return (
    <>
      <p className="mb-2 text-[11px] leading-relaxed text-muted">
        Gross debt per fiscal year (consolidated). Above each bar:{' '}
        <span className="font-medium text-[color:var(--color-gold,#d9c48a)]">LTV</span> (net debt ÷ GAV) and{' '}
        <span className="font-medium text-[color:var(--color-info,#60a5fa)]">cost of financing</span> (weighted-avg
        cost of debt). Blank where the REIT did not disclose the metric that year.
      </p>
      <div className="relative h-[240px]">
        <canvas ref={canvasRef} />
      </div>
    </>
  )
}

/**
 * Always-on plugin: stacks LTV (top) and cost-of-financing above each debt bar.
 * On the SVG export it also drops the ₹cr debt value in as the bottom row (the
 * closest to the bar) and re-inks everything black for print.
 */
const leverageLabels: Plugin = {
  id: 'leverageLabels',
  afterDatasetsDraw(ch) {
    const opts = ch.config.options?.plugins as
      | { leverageLabels?: { ltv: (number | null)[]; cost: (number | null)[]; debt: (number | null)[] } }
      | undefined
    const cfg = opts?.leverageLabels
    if (!cfg) return
    const meta = ch.getDatasetMeta(0)
    const ctx = ch.ctx
    const exp = EXPORT_STATE.active
    const fontPx = Math.round(10 * (exp ? EXPORT_STATE.fontScale : 1))
    const lineH = fontPx + 3
    const ink = Chart.defaults.color as string // black while the export re-theme is active
    const gold = exp ? ink : CHART.gold
    const blue = exp ? ink : CHART.info
    ctx.save()
    ctx.font = labelFont()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    meta.data.forEach((el, i) => {
      const rows: [string, string][] = []
      const ltv = asPct(cfg.ltv[i])
      const cost = asPct(cfg.cost[i], 2)
      if (ltv) rows.push([`LTV ${ltv}`, gold])
      if (cost) rows.push([`COF ${cost}`, blue])
      // export only: debt magnitude as the bottom row (screen keeps axis + tooltip)
      if (exp && cfg.debt[i] != null) rows.push([fmtCrLabel(cfg.debt[i]!), ink])
      if (!rows.length) return
      const bar = el as unknown as { x: number; y: number }
      const cx = Math.min(Math.max(bar.x, 26), ch.width - 26)
      // stack upward from the bar top: last row sits closest to the bar
      rows.forEach(([text, color], r) => {
        ctx.fillStyle = color
        ctx.fillText(text, cx, bar.y - 5 - (rows.length - 1 - r) * lineH)
      })
    })
    ctx.restore()
  },
}

function build(D: ReitData, k: ReitKey): ChartConfiguration {
  const f = D.fin[k]
  const idx = f.years.map((_, i) => i).filter((i) => f.gross_debt[i] != null)
  const labels = idx.map((i) => f.years[i].replace('20', ''))
  const debt = idx.map((i) => f.gross_debt[i])
  const ltv = idx.map((i) => f.ltv[i])
  const cost = idx.map((i) => f.cost_debt[i])

  return {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Gross debt', data: debt, backgroundColor: CHART.red, maxBarThickness: 56 }],
    },
    // register the leverage-label plugin for this chart only
    plugins: [leverageLabels],
    options: {
      ...baseOptions(),
      layout: { padding: { top: 24 } }, // headroom for the two label rows
      scales: {
        x: { grid: { display: false } },
        // grace keeps the tallest bar clear of the labels stacked above it
        y: { beginAtZero: true, grace: '22%', title: { display: true, text: '₹ crore' } },
      },
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        barValueLabels: { display: false }, // our leverageLabels plugin owns the bar-top stack
        // consumed by the leverageLabels plugin above (per-index metric arrays)
        // @ts-expect-error custom plugin option, not in Chart.js typings
        leverageLabels: { ltv, cost, debt },
        tooltip: {
          callbacks: {
            label: (it) => 'Gross debt: ' + inr(it.parsed.y) + ' cr',
            afterBody: (its) => {
              const i = its[0].dataIndex
              const l = asPct(ltv[i])
              const c = asPct(cost[i], 2)
              const bits: string[] = []
              if (l) bits.push('LTV (net debt / GAV): ' + l)
              if (c) bits.push('Cost of financing: ' + c)
              return bits
            },
          },
        },
      },
    },
  }
}
