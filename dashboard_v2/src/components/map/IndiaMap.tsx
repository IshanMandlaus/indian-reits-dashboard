/**
 * The interactive India map: a district-level choropleth base (coloured by each
 * state's aggregate REIT footprint) with animated effectScatter pins per asset
 * (or per city in "Cities" view). Roam (zoom/pan), rich tooltips, image export,
 * and two-way hover highlight with the asset list. Pure ECharts on a div ref.
 */
import { useEffect, useRef } from 'react'
import { ensureIndiaMap, echarts, type IndiaFeature } from '../../lib/echartsSetup'
import {
  aggregateByCity,
  aggregateByState,
  type MapAsset,
  type Agg,
} from '../../lib/geo'
import { inr } from '../../lib/format'

export type SizeMetric = 'leasable' | 'completed' | 'value'
export type ColorMode = 'reit' | 'occ' | 'rent'
export type StateMetric = 'leasable' | 'value' | 'count'
export type ViewMode = 'assets' | 'cities'

type CityAgg = Agg & { city: string; lng: number; lat: number }

interface Props {
  assets: MapAsset[] // already filtered by REIT + type
  view: ViewMode
  sizeMetric: SizeMetric
  colorMode: ColorMode
  stateMetric: StateMetric
  hoverId: string | null
  onHover: (id: string | null) => void
  onPick: (a: MapAsset) => void
}

const P = {
  ink: '#e8eef4',
  muted: '#93a1b3',
  subtle: '#61707f',
  surface: '#0c1117',
  border: '#1c2431',
  accent: '#2dd4bf',
  bg: '#000000',
}

const STATE_LABEL: Record<StateMetric, string> = {
  leasable: 'leasable area (msf)',
  value: 'portfolio value (₹ cr)',
  count: 'asset count',
}

/** Asset type → ECharts symbol + its legend glyph. */
const SYMBOL_BY_TYPE: Record<string, string> = {
  Office: 'circle',
  Retail: 'diamond',
  Hotel: 'triangle',
  Solar: 'rect',
  Other: 'roundRect',
}
const TYPE_GLYPH: [string, string][] = [
  ['Office', '●'],
  ['Retail', '◆'],
  ['Hotel', '▲'],
  ['Solar', '■'],
  ['Other', '▢'],
]

const sizeVal = (a: MapAsset, m: SizeMetric): number =>
  (m === 'value' ? a.valueCr : m === 'completed' ? a.completed : a.leasable) || 0
const citySizeVal = (c: CityAgg, m: SizeMetric): number =>
  m === 'value' ? c.value : m === 'completed' ? c.completed : c.leasable

export function IndiaMap({ assets, view, sizeMetric, colorMode, stateMetric, hoverId, onHover, onPick }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const featRef = useRef<IndiaFeature[] | null>(null)
  const roamRef = useRef<{ center?: number[]; zoom?: number }>({})
  // Live snapshot for event handlers (avoids stale closures).
  const liveRef = useRef<{ view: ViewMode; assets: MapAsset[]; cities: CityAgg[] }>({
    view,
    assets,
    cities: [],
  })

  // Init once.
  useEffect(() => {
    let disposed = false
    const initWhenSized = (features: IndiaFeature[]) => {
      const el = elRef.current
      if (disposed || !el) return
      if (!el.clientWidth || !el.clientHeight) {
        requestAnimationFrame(() => initWhenSized(features)) // wait for layout — avoids 0-size warning
        return
      }
      featRef.current = features
      const chart = echarts.init(el, undefined, { renderer: 'canvas' })
      chartRef.current = chart

      chart.on('georoam', () => {
        const opt = chart.getOption() as { geo?: { center?: number[]; zoom?: number }[] }
        const g = opt.geo?.[0]
        if (g) roamRef.current = { center: g.center, zoom: g.zoom }
      })
      chart.on('mouseover', { seriesIndex: 1 }, (p) => {
        const id = (p as { data?: { id?: string } }).data?.id
        if (liveRef.current.view === 'assets' && id) onHover(id)
      })
      chart.on('mouseout', { seriesIndex: 1 }, () => onHover(null))
      chart.on('click', { seriesIndex: 1 }, (p) => {
        if (liveRef.current.view !== 'assets') return
        const id = (p as { data?: { id?: string } }).data?.id
        const a = liveRef.current.assets.find((x) => x.id === id)
        if (a) onPick(a)
      })

      build()
    }
    ensureIndiaMap().then(initWhenSized)
    const onResize = () => chartRef.current?.resize()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => chartRef.current?.resize())
    if (elRef.current) ro.observe(elRef.current)
    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      chartRef.current?.dispose()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild option when inputs change.
  useEffect(() => {
    liveRef.current.view = view
    liveRef.current.assets = assets
    build()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, view, sizeMetric, colorMode, stateMetric])

  // List → map highlight.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || view !== 'assets') return
    chart.dispatchAction({ type: 'downplay', seriesIndex: 1 })
    if (hoverId) {
      const idx = assets.findIndex((a) => a.id === hoverId)
      if (idx >= 0) chart.dispatchAction({ type: 'highlight', seriesIndex: 1, dataIndex: idx })
    }
  }, [hoverId, assets, view])

  function build() {
    const chart = chartRef.current
    const features = featRef.current
    if (!chart || !features) return

    // Choropleth: colour every district by its parent state's aggregate.
    const stateAgg = aggregateByState(assets, stateMetric)
    const maxState = Math.max(1, ...Object.values(stateAgg))
    const mapData = features.map((f) => ({
      name: f.properties.name,
      value: stateAgg[f.properties.st] || 0,
      st: f.properties.st,
    }))

    const cities = aggregateByCity(assets)
    liveRef.current.cities = cities

    // Scatter points.
    let scatter: Record<string, unknown>[]
    let maxSize: number
    const pinVisualMap: Record<string, unknown>[] = []

    if (view === 'assets') {
      maxSize = Math.max(1, ...assets.map((a) => sizeVal(a, sizeMetric)))
      scatter = assets.map((a) => {
        const colorRaw = colorMode === 'rent' ? a.inplaceRent : colorMode === 'occ' ? a.occ : null
        const item: Record<string, unknown> = {
          id: a.id,
          name: a.asset,
          symbol: SYMBOL_BY_TYPE[a.type] || 'circle',
          value: [a.lng, a.lat, sizeVal(a, sizeMetric), colorRaw ?? '-'],
          _a: a,
        }
        if (colorMode === 'reit') item.itemStyle = { color: a.color, shadowColor: a.color, shadowBlur: 12 }
        return item
      })
    } else {
      maxSize = Math.max(1, ...cities.map((c) => citySizeVal(c, sizeMetric)))
      scatter = cities.map((c) => {
        const colorRaw = colorMode === 'occ' ? c.occ : null
        const item: Record<string, unknown> = {
          name: c.city,
          value: [c.lng, c.lat, citySizeVal(c, sizeMetric), colorRaw ?? '-'],
          _c: c,
        }
        if (colorMode !== 'occ') item.itemStyle = { color: P.accent, shadowColor: P.accent, shadowBlur: 14 }
        return item
      })
    }

    const gradient = (colorMode === 'occ' || (colorMode === 'rent' && view === 'assets'))
    if (gradient) {
      const dimVals = scatter
        .map((s) => (s.value as (number | string)[])[3])
        .filter((v): v is number => typeof v === 'number')
      const lo = Math.min(...dimVals)
      const hi = Math.max(...dimVals)
      pinVisualMap.push({
        type: 'continuous',
        seriesIndex: 1,
        dimension: 3,
        min: lo,
        max: hi,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        itemWidth: 12,
        itemHeight: 90,
        text: [colorMode === 'occ' ? 'high occ' : 'high rent', colorMode === 'occ' ? 'low' : 'low'],
        textStyle: { color: P.muted, fontSize: 10 },
        inRange: { color: ['#f87171', '#fbbf24', '#34d399'] },
        formatter: (v: number) => (colorMode === 'occ' ? Math.round(v * 100) + '%' : '₹' + Math.round(v)),
      })
    }

    const sizeScale = (raw: number) => (raw <= 0 ? 4 : 6 + 25 * Math.sqrt(raw / maxSize))

    chart.setOption(
      {
        backgroundColor: 'transparent',
        toolbox: {
          right: 12,
          top: 10,
          iconStyle: { borderColor: P.muted },
          emphasis: { iconStyle: { borderColor: P.accent } },
          feature: {
            saveAsImage: { title: 'Save', backgroundColor: P.bg, pixelRatio: 2, name: 'reit-portfolio-map' },
          },
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: P.surface,
          borderColor: P.border,
          borderWidth: 1,
          padding: [8, 11],
          textStyle: { color: P.ink, fontSize: 12 },
          extraCssText: 'border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.5);',
          formatter: tooltipFormatter(stateMetric),
        },
        visualMap: [
          {
            type: 'continuous',
            seriesIndex: 0,
            min: 0,
            max: maxState,
            calculable: false,
            show: false,
            inRange: { color: ['#182230', '#1c4842', '#149183', '#2dd4bf', '#7ff5e6'] },
          },
          ...pinVisualMap,
        ],
        geo: {
          map: 'india',
          roam: true,
          ...(roamRef.current.center
            ? { center: roamRef.current.center, zoom: roamRef.current.zoom }
            : { layoutCenter: ['50%', '53%'], layoutSize: '132%' }),
          scaleLimit: { min: 1, max: 12 },
          itemStyle: { areaColor: '#161f2b', borderColor: 'rgba(140,160,185,.16)', borderWidth: 0.5 },
          emphasis: { disabled: true },
          silent: true, // choropleth is drawn by the map series below; geo is just the canvas
        },
        series: [
          {
            type: 'map',
            geoIndex: 0,
            name: 'footprint',
            data: mapData,
            itemStyle: { borderColor: 'rgba(140,160,185,.18)', borderWidth: 0.5 },
            emphasis: { disabled: true },
            select: { disabled: true },
          },
          {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            geoIndex: 0,
            zlevel: 2,
            data: scatter,
            symbolSize: (val: number[]) => sizeScale(val[2]),
            showEffectOn: 'render',
            rippleEffect: { scale: 2.6, brushType: 'stroke', period: 5 },
            itemStyle: { opacity: 0.95, borderColor: 'rgba(255,255,255,.6)', borderWidth: 0.8, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.5)' },
            emphasis: {
              scale: 1.5,
              focus: 'self',
              label: {
                show: true,
                formatter: (p: { name: string }) => p.name,
                position: 'top',
                color: P.ink,
                backgroundColor: 'rgba(10,14,20,.85)',
                padding: [3, 6],
                borderRadius: 4,
                fontSize: 11,
              },
            },
          },
        ],
      },
      { replaceMerge: ['visualMap', 'series'] },
    )
  }

  return (
    <div
      className="relative h-[600px] w-full overflow-hidden rounded-lg"
      style={{ background: 'radial-gradient(115% 85% at 50% 56%, rgba(45,212,191,0.08), rgba(45,212,191,0) 60%)' }}
    >
      <div ref={elRef} className="h-full w-full" />
      {view === 'assets' && (
        <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
          {TYPE_GLYPH.map(([t, g]) => (
            <span key={t} className="inline-flex items-center gap-1">
              <span className="text-subtle">{g}</span>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function tooltipFormatter(stateMetric: StateMetric) {
  const row = (l: string, v: string) =>
    `<div style="display:flex;justify-content:space-between;gap:14px"><span style="color:${P.muted}">${l}</span><span style="color:${P.ink};font-weight:600">${v}</span></div>`
  return (p: { seriesType?: string; data?: unknown; name?: string; value?: unknown }) => {
    const d = p.data as { _a?: MapAsset; _c?: CityAgg; st?: string; value?: number } | undefined
    if (p.seriesType === 'map') {
      const v = (d?.value as number) || 0
      const label = STATE_LABEL[stateMetric]
      const val =
        stateMetric === 'value' ? inr(v) + ' cr' : stateMetric === 'count' ? v + ' assets' : v.toFixed(1) + ' msf'
      return `<div style="font-weight:700;margin-bottom:3px;color:${P.ink}">${d?.st || 'State'}</div>${
        v > 0 ? row(label, val) : `<div style="color:${P.subtle}">no listed REIT assets</div>`
      }`
    }
    if (d?._a) {
      const a = d._a
      const head = `<div style="font-weight:700;color:${P.ink}">${a.asset}</div><div style="color:${a.color};font-size:11px;margin-bottom:5px">${a.reitLabel} · ${a.type} · ${a.city}</div>`
      return (
        head +
        (a.leasable != null ? row('Leasable', a.leasable.toFixed(1) + ' msf') : '') +
        (a.occ != null ? row('Occupancy', Math.round(a.occ * 100) + '%') : '') +
        (a.inplaceRent != null ? row('In-place rent', '₹' + a.inplaceRent + '/sf/mo') : '') +
        (a.wale != null ? row('WALE', a.wale + ' yrs') : '') +
        (a.valueCr != null ? row('Value', inr(a.valueCr) + ' cr') : '')
      )
    }
    if (d?._c) {
      const c = d._c
      return (
        `<div style="font-weight:700;color:${P.ink};margin-bottom:5px">${c.city}</div>` +
        row('Assets', String(c.count)) +
        row('Leasable', c.leasable.toFixed(1) + ' msf') +
        (c.occ != null ? row('Occupancy', Math.round(c.occ * 100) + '%') : '') +
        row('Value', inr(c.value) + ' cr')
      )
    }
    return p.name || ''
  }
}
