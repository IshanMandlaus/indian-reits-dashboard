/**
 * Unified NSE-style security modal — one component replacing v1's duplicated
 * `secmodal.js` (InvITs / Global) and the page-2 `#smodal` (Market). Fully
 * config-driven: the caller computes a `SecModalData` (price series + metric /
 * profile pairs) and this renders the header, big price + day change, range
 * buttons (1M…Max), a gradient price line, and the two stat grids.
 */
import { useEffect, useState } from 'react'
import type { ChartConfiguration, ScriptableContext } from 'chart.js'
import type { DateMap } from '../../types/data'
import { useChartCanvas } from './useChartCanvas'
import { zoomOptions } from '../../lib/chartSetup'

/** A `[label, value]` stat pair; null/empty values are dropped. */
export type StatPair = [string, string | number | null | undefined]

export interface SecModalData {
  title: string
  codes?: string
  ccy?: string | null
  series: DateMap // { "YYYY-MM-DD": close }
  livePrice?: number | null
  liveTag?: string
  mkt: StatPair[]
  profile: StatPair[]
  profileTitle?: string
}

const RANGES: [string, number][] = [
  ['1M', 31],
  ['3M', 92],
  ['6M', 184],
  ['1Y', 366],
  ['3Y', 1097],
  ['5Y', 1828],
  ['Max', 99999],
]

const CCY_SYM: Record<string, string> = {
  USD: '$', INR: '₹', JPY: '¥', HKD: 'HK$', CNY: '¥', SGD: 'S$', AUD: 'A$',
}
const sym = (c?: string | null) => (c ? CCY_SYM[c] || c + ' ' : '')
const fmt = (v: number | null | undefined, d = 2) =>
  v == null ? '–' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d })

export function SecurityModal({ data, onClose }: { data: SecModalData | null; onClose: () => void }) {
  const [daysBack, setDaysBack] = useState(366)

  // Reset to the 1Y window each time a new security opens.
  useEffect(() => {
    if (data) setDaysBack(366)
  }, [data])

  // Close on Escape.
  useEffect(() => {
    if (!data) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [data, onClose])

  if (!data) return null

  const dates = Object.keys(data.series).sort()
  const lastHist = dates.length ? data.series[dates[dates.length - 1]] : null
  const lastP = data.livePrice ?? lastHist
  const prevP = dates.length > 1 ? data.series[dates[dates.length - (data.livePrice ? 1 : 2)]] : null
  const chg = prevP && lastP ? (lastP / prevP - 1) * 100 : null
  const hasHistory = dates.length >= 2

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-5xl rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-ink">
              {data.title} {data.codes && <span className="text-[12px] font-normal text-muted">{data.codes}</span>}
            </h3>
            <div className="mt-1 text-[22px] font-bold text-ink tnum">
              {lastP != null ? sym(data.ccy) + fmt(lastP) : '–'}
              {data.liveTag && <span className="ml-2 text-[11px] font-normal text-muted">{data.liveTag}</span>}
              {chg != null && (
                <span className={'ml-2 text-[13px] ' + (chg >= 0 ? 'text-pos' : 'text-neg')}>
                  {chg >= 0 ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-[18px] leading-none text-muted transition hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* range buttons + chart */}
        <div className="px-6 py-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {RANGES.map(([lbl, d]) => (
              <button
                key={lbl}
                onClick={() => setDaysBack(d)}
                className={[
                  'rounded-md px-3 py-1 text-[12px] font-medium transition',
                  daysBack === d ? 'bg-accent/15 text-accent' : 'text-subtle hover:text-ink',
                ].join(' ')}
              >
                {lbl}
              </button>
            ))}
          </div>
          {hasHistory ? (
            <SecChart series={data.series} livePrice={data.livePrice} ccy={data.ccy} daysBack={daysBack} />
          ) : (
            <div className="py-12 text-center text-[13px] text-subtle">
              No price history yet — run ⟳ Refresh (with serve.py) to pull it.
            </div>
          )}
        </div>

        {/* stat grids */}
        <div className="border-t border-border px-6 py-4">
          <StatGrid title="Market metrics" pairs={data.mkt} />
          {data.profile.length > 0 && (
            <div className="mt-4">
              <StatGrid title={data.profileTitle || 'Profile'} pairs={data.profile} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SecChart({
  series,
  livePrice,
  ccy,
  daysBack,
}: {
  series: DateMap
  livePrice?: number | null
  ccy?: string | null
  daysBack: number
}) {
  const { canvasRef, chartRef } = useChartCanvas(
    () => buildSecChart(series, livePrice, ccy, daysBack),
    [series, livePrice, ccy, daysBack],
  )
  return (
    <div className="relative h-[380px]" onDoubleClick={() => chartRef.current?.resetZoom?.()}>
      <canvas ref={canvasRef} />
    </div>
  )
}

function buildSecChart(
  series: DateMap,
  livePrice: number | null | undefined,
  ccy: string | null | undefined,
  daysBack: number,
): ChartConfiguration {
  const dates = Object.keys(series).sort()
  const cut = new Date(dates[dates.length - 1])
  cut.setDate(cut.getDate() - daysBack)
  const cutS = cut.toISOString().slice(0, 10)
  const dd = dates.filter((d) => d >= cutS)
  const vals = dd.map((d) => series[d])
  const labels = [...dd]
  if (livePrice) {
    labels.push('live')
    vals.push(livePrice)
  }
  const up = vals[vals.length - 1] >= vals[0]
  const col = up ? '#34d399' : '#f87171'
  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          data: vals,
          borderColor: col,
          borderWidth: 1.8,
          pointRadius: 0,
          fill: true,
          backgroundColor: (c: ScriptableContext<'line'>) => {
            const { ctx, chartArea } = c.chart
            if (!chartArea) return col + '22'
            const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
            g.addColorStop(0, col + '33')
            g.addColorStop(1, col + '00')
            return g
          },
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, zoom: zoomOptions() },
      scales: {
        x: { ticks: { maxTicksLimit: 12 } },
        y: { title: { display: true, text: sym(ccy).trim() + ' / unit' } },
      },
    },
  }
}

function StatGrid({ title, pairs }: { title: string; pairs: StatPair[] }) {
  const rows = pairs.filter(([, v]) => v != null && v !== '')
  if (!rows.length) return null
  return (
    <>
      <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.06em] text-accent">{title}</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
        {rows.map(([l, v]) => (
          <div key={l} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
            <div className="text-[10.5px] uppercase tracking-[0.04em] text-subtle">{l}</div>
            <div className="mt-0.5 text-[14.5px] font-semibold text-ink tnum">{v}</div>
          </div>
        ))}
      </div>
    </>
  )
}
