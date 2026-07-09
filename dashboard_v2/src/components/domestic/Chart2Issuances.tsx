/**
 * Chart 2 — accretion story: NAV/unit with issuance (diamonds) & block-deal
 * (triangles) markers, plus fair-value/unit vs book-value/unit lines and the
 * shaded gap between them. Embassy adds a TechVillage single-asset FV vs cost
 * overlay on a 2nd axis. Ported from v1 chart2().
 */
import type { ReitData, ReitKey, ReitValHy, BlocksLive } from '../../types/data'
import { CHART, baseOptions, zoomOptions, rescaleY, type ChartWithRange, type RangeConfig } from '../../lib/chartSetup'
import { navSteps, navAt, fyTs, fmtM, fmtDay } from '../../lib/reit'
import { inr, pct } from '../../lib/format'
import { useChartCanvas } from '../charts/useChartCanvas'
import { RangeBar } from '../charts/RangeBar'
import type { ChartConfiguration, Plugin } from 'chart.js'

const DAY = 864e5

export function Chart2Issuances({
  D,
  k,
  valHy,
  blocksLive,
}: {
  D: ReitData
  k: ReitKey
  valHy: ReitValHy | null
  blocksLive: BlocksLive | null
}) {
  const { canvasRef, chartRef } = useChartCanvas(() => build(D, k, valHy, blocksLive), [D, k, valHy, blocksLive])
  return (
    <>
      <div className="mb-2 flex justify-end">
        <RangeBar key={k} chartRef={chartRef} />
      </div>
      <div className="relative h-[320px]" onDoubleClick={() => resetZoom(chartRef.current)}>
        <canvas ref={canvasRef} />
      </div>
      <p className="mt-1.5 text-[10.5px] text-subtle">scroll = zoom · double-click = reset</p>
    </>
  )
}

function resetZoom(ch: ChartWithRange | null) {
  if (!ch) return
  ch.resetZoom?.()
  const x = ch.options.scales!.x as { min?: number; max?: number }
  x.min = ch._xmin
  x.max = ch._xmax
  rescaleY(ch)
  ch.update()
}

function build(
  D: ReitData,
  k: ReitKey,
  valHy: ReitValHy | null,
  blocksLive: BlocksLive | null,
): ChartConfiguration {
  const nav = navSteps(D, k).map((p) => ({ x: p.ts, y: p.nav }))
  const iss = (D.issuances[k] || []).map((e) => {
    const ts = new Date(e.date + '-15').getTime()
    const n = navAt(D, k, ts)
    return { x: ts, y: e.price, e, pd: n ? e.price / n - 1 : null, nav: n }
  })

  // merge curated blocks with live NSE/BSE block+bulk deals
  const curatedBlk = D.blocks[k] || []
  const liveBlk = blocksLive?.blocks?.[k] || []
  const seenBlk = new Set(curatedBlk.map((e) => e.date.slice(0, 7) + ':' + Math.round(e.units_mn || 0)))
  const allBlk = curatedBlk.concat(liveBlk.filter((e) => !seenBlk.has(e.date.slice(0, 7) + ':' + Math.round(e.units_mn || 0))))
  const blk = allBlk.map((e) => {
    const ts = new Date(e.date.length > 7 ? e.date : e.date + '-15').getTime()
    const n = navAt(D, k, ts)
    return { x: ts, y: e.price, b: e, pd: n ? e.price / n - 1 : null, nav: n }
  })

  const f2 = D.fin[k]
  const bvd = D.bv[k] || {}
  const unitsAtDate = (ts: number): number | null => {
    const dt = new Date(ts)
    const yy = dt.getMonth() >= 3 ? dt.getFullYear() + 1 : dt.getFullYear()
    let i = f2.years.indexOf('FY' + yy)
    if (i < 0) i = f2.years.length - 1
    for (let j = i; j >= 0; j--) if (f2.units_mn[j] != null) return f2.units_mn[j]
    for (let j = i + 1; j < f2.years.length; j++) if (f2.units_mn[j] != null) return f2.units_mn[j]
    return null
  }
  const HY = valHy?.[k] || null
  let fvpu: { x: number; y: number }[] = []
  if (HY && HY.length) {
    fvpu = HY.map((v) => {
      const ts = new Date(v.d).getTime()
      const u = unitsAtDate(ts)
      return u ? { x: ts, y: +((v.gav * 10) / u).toFixed(1) } : null
    }).filter((p): p is { x: number; y: number } => p != null)
  } else {
    f2.years.forEach((y, i) => {
      const u = f2.units_mn[i]
      if (u && f2.gav[i] != null) fvpu.push({ x: fyTs(y), y: +((f2.gav[i]! * 10) / u).toFixed(1) })
    })
  }
  const bvpu: { x: number; y: number }[] = []
  f2.years.forEach((y, i) => {
    const u = f2.units_mn[i]
    if (!u) return
    const r = bvd[y]
    if (r) {
      const t = (r.inv_prop || 0) + (r.ipud || 0) + (r.ppe || 0) + (r.cwip || 0)
      if (t) bvpu.push({ x: fyTs(y), y: +((t * 10) / u).toFixed(1) })
    }
  })

  // Embassy only: TechVillage single-asset accretion (FV ₹cr vs Dec-2020 cost)
  const etvHY = (HY || []).filter((v) => v.tv != null)
  const etvCost = 9782
  const etvAcqTs = new Date('2020-12-15').getTime()
  const etvFV = etvHY.length
    ? [{ x: etvAcqTs, y: etvCost }].concat(etvHY.map((v) => ({ x: new Date(v.d).getTime(), y: v.tv! })))
    : []
  const etvCostLine = etvFV.length ? [{ x: etvAcqTs, y: etvCost }, { x: etvFV[etvFV.length - 1].x, y: etvCost }] : []

  const pts = [...nav.map((p) => p.x), ...iss.map((p) => p.x), ...blk.map((p) => p.x), ...fvpu.map((p) => p.x)]
  const xmin = Math.min(...pts) - 90 * DAY
  const xmax = Math.max(...pts) + 120 * DAY

  const labelPlugin: Plugin = {
    id: 'markerLabels',
    afterDatasetsDraw(ch) {
      const ctx = ch.ctx
      ctx.save()
      ctx.font = '600 10px sans-serif'
      ctx.textAlign = 'center'
      ch.getDatasetMeta(1).data.forEach((el, i) => {
        const p = iss[i]
        if (p && p.pd != null) {
          ctx.fillStyle = p.pd >= 0 ? CHART.grn : CHART.red
          ctx.fillText(pct(p.pd), el.x, el.y - 12)
        }
      })
      ch.getDatasetMeta(2).data.forEach((el, i) => {
        const p = blk[i]
        if (p && p.pd != null) {
          ctx.fillStyle = 'rgba(96,165,250,.9)'
          ctx.fillText(pct(p.pd), el.x, el.y - 11)
        }
      })
      ctx.restore()
    },
  }

  const cfg: RangeConfig = {
    type: 'line',
    data: {
      datasets: [
        { type: 'line', label: 'NAV / unit', data: nav, borderColor: CHART.gold, borderWidth: 2, stepped: 'before', pointRadius: 3, pointBackgroundColor: CHART.gold, order: 2 },
        { type: 'scatter', label: 'Issuance @ issue price', data: iss, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'rectRot', order: 1, pointBackgroundColor: iss.map((p) => (p.pd == null ? '#888' : p.pd >= 0 ? CHART.grn : CHART.red)) },
        { type: 'scatter', label: 'Block deal (secondary, no new units)', data: blk, pointRadius: 6, pointHoverRadius: 8, pointStyle: 'triangle', order: 1, pointBackgroundColor: 'rgba(96,165,250,.9)', pointBorderColor: 'rgba(96,165,250,.9)' },
        { type: 'line', label: 'Book value / unit (acquisition cost)', data: bvpu, borderColor: CHART.bookGrid, borderWidth: 1.5, borderDash: [5, 4], stepped: 'before', pointRadius: 0, order: 4 },
        { type: 'line', label: 'Fair value / unit (GAV)', data: fvpu, borderColor: CHART.acc, borderWidth: 1.6, stepped: 'before', pointRadius: 0, fill: 3, backgroundColor: 'rgba(45,212,191,.13)', order: 4 },
        ...(etvFV.length
          ? [
              { type: 'line' as const, label: 'Embassy TechVillage — fair value (₹cr)', data: etvFV, borderColor: '#e8a86a', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#e8a86a', yAxisID: 'y2', order: 3 },
              { type: 'line' as const, label: 'TechVillage acquisition cost (Dec-2020)', data: etvCostLine, borderColor: '#e8a86a', borderDash: [4, 4], borderWidth: 1.2, pointRadius: 0, yAxisID: 'y2', order: 3 },
            ]
          : []),
      ],
    },
    options: {
      ...baseOptions(),
      scales: {
        x: { type: 'linear', min: xmin, max: xmax, ticks: { callback: (v) => fmtM(v as number), maxTicksLimit: 10 }, grid: { display: false } },
        y: { title: { display: true, text: '₹ / unit' }, grace: '12%' },
        ...(etvFV.length
          ? { y2: { position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'TechVillage FV (₹ cr)' }, grace: '10%' } }
          : {}),
      },
      plugins: {
        ...baseOptions().plugins,
        zoom: zoomOptions(),
        tooltip: {
          callbacks: {
            title: (it) => fmtDay(it[0].parsed.x as number),
            label: (it) => {
              const raw = it.raw as { b?: (typeof blk)[number]['b']; e?: (typeof iss)[number]['e']; pd?: number | null; nav?: number | null }
              if (raw.b) {
                const b = raw.b
                return [
                  'Block deal @ ' + inr(b.price, 2) + ' — ' + b.seller,
                  b.units_mn + ' mn units (secondary sale, no new units)',
                  raw.pd != null ? 'vs NAV ' + inr(raw.nav, 2) + ' → ' + pct(raw.pd) + (raw.pd >= 0 ? ' premium' : ' discount') : '',
                  b.note,
                ]
              }
              const p = raw.e
              if (!p)
                return (
                  it.dataset.label +
                  ': ' +
                  inr(it.parsed.y, 2) +
                  ((it.datasetIndex === 3 || it.datasetIndex === 4) && bvpu.length && fvpu.length
                    ? ' · FV/BV premium ' + pct(fvpu[fvpu.length - 1].y / bvpu[bvpu.length - 1].y - 1)
                    : '')
                )
              return [
                p.type + ' @ ' + inr(p.price, 2),
                p.units_mn + ' mn units · ' + inr(p.proceeds_cr) + ' cr',
                raw.pd != null ? 'vs NAV ' + inr(raw.nav, 2) + ' → ' + pct(raw.pd) + (raw.pd >= 0 ? ' premium' : ' discount') : '',
                p.note,
              ]
            },
          },
        },
      },
    },
    plugins: [labelPlugin],
  }
  cfg._xmin = xmin
  cfg._xmax = xmax
  return cfg
}
