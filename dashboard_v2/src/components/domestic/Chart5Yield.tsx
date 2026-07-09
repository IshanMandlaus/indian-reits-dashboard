/**
 * Chart 5 — cash return the assets throw off (NDCF ÷ GAV). Quarterly mode
 * annualises (4× quarterly NDCF ÷ interpolated GAV); FY mode plots annual
 * NDCF/GAV with value labels. Ported from v1 chart5()/drawC5().
 */
import { useState } from 'react'
import type { ReitData, ReitKey } from '../../types/data'
import { CHART, baseOptions } from '../../lib/chartSetup'
import { inr } from '../../lib/format'
import { perTs, fyTs } from '../../lib/reit'
import { useChartCanvas } from '../charts/useChartCanvas'
import type { ChartConfiguration, Plugin } from 'chart.js'

const DAY = 864e5

export function Chart5Yield({ D, k }: { D: ReitData; k: ReitKey }) {
  const f = D.fin[k]
  const hasQ = (f.q || []).some((x) => x.ndcf != null)
  const [mode, setMode] = useState<'q' | 'fy'>('q')
  const eff = hasQ ? mode : 'fy'
  const { canvasRef } = useChartCanvas(() => build(D, k, eff), [D, k, eff])

  return (
    <>
      {hasQ && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={() => setMode(mode === 'q' ? 'fy' : 'q')}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted transition hover:text-ink"
          >
            {mode === 'q' ? 'switch to FY' : 'switch to quarterly'}
          </button>
        </div>
      )}
      <div className="relative h-[240px]">
        <canvas ref={canvasRef} />
      </div>
    </>
  )
}

function build(D: ReitData, k: ReitKey, mode: 'q' | 'fy'): ChartConfiguration {
  const f = D.fin[k]
  const hasQ = (f.q || []).some((x) => x.ndcf != null)

  if (mode === 'q' && hasQ) {
    const gpts = f.years.map((y, i) => ({ ts: fyTs(y), v: f.gav[i] })).filter((p) => p.v != null) as { ts: number; v: number }[]
    f.q.forEach((x) => {
      if (x.assets_fv != null) gpts.push({ ts: perTs(x.per), v: x.assets_fv })
    })
    gpts.sort((a, b) => a.ts - b.ts)
    const gavAt = (ts: number): number | null => {
      let v: number | null = null
      for (const p of gpts) if (p.ts <= ts + 15 * DAY) v = p.v
      return v || (gpts[0] && gpts[0].v)
    }
    const qs = f.q.filter((x) => x.ndcf != null)
    const yl = qs.map((x) => {
      const g = gavAt(perTs(x.per))
      return g ? +((400 * x.ndcf!) / g).toFixed(2) : null
    })
    return {
      type: 'line',
      data: {
        labels: qs.map((x) => x.q),
        datasets: [
          { label: 'Annualised NDCF / GAV % (quarterly)', data: yl, borderColor: CHART.gold, backgroundColor: 'rgba(217,196,138,.12)', fill: true, pointRadius: 3, pointBackgroundColor: CHART.gold },
        ],
      },
      options: {
        ...baseOptions(),
        scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 14 } }, y: { title: { display: true, text: '%' }, grace: '15%' } },
        plugins: {
          ...baseOptions().plugins,
          tooltip: {
            callbacks: {
              label: (it) => {
                const x = qs[it.dataIndex]
                return ['Annualised yield: ' + it.parsed.y + '%', 'NDCF ' + inr(x.ndcf) + ' cr ×4 / GAV ' + inr(gavAt(perTs(x.per))) + ' cr']
              },
            },
          },
        },
      },
    }
  }

  const yrs = f.years.filter((_, i) => f.ndcf[i] != null && f.gav[i])
  const yl = yrs.map((y) => {
    const i = f.years.indexOf(y)
    return +((100 * f.ndcf[i]!) / f.gav[i]!).toFixed(2)
  })
  const labelPlugin: Plugin = {
    id: 'yieldLabels',
    afterDatasetsDraw(ch) {
      const ctx = ch.ctx
      const mt = ch.getDatasetMeta(0)
      ctx.save()
      ctx.font = '600 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = CHART.gold
      mt.data.forEach((el, i) => ctx.fillText(yl[i] + '%', el.x, el.y - 10))
      ctx.restore()
    },
  }
  return {
    type: 'line',
    data: {
      labels: yrs.map((y) => y.replace('20', '')),
      datasets: [
        { label: 'NDCF / GAV % (FY)', data: yl, borderColor: CHART.gold, backgroundColor: 'rgba(217,196,138,.12)', fill: true, pointRadius: 4, pointBackgroundColor: CHART.gold },
      ],
    },
    options: {
      ...baseOptions(),
      scales: { x: { grid: { display: false } }, y: { title: { display: true, text: '%' }, grace: '15%' } },
      plugins: {
        ...baseOptions().plugins,
        tooltip: { callbacks: { label: (it) => it.parsed.y + '%' } },
      },
    },
    plugins: [labelPlugin],
  }
}
