/**
 * Tree-shaken ECharts core for the Portfolio Map page only. Registers just the
 * charts/components the map uses (keeps the lazy /map chunk lean) and loads the
 * India district GeoJSON once, registering it as the 'india' map.
 */
import * as echarts from 'echarts/core'
import { MapChart, EffectScatterChart } from 'echarts/charts'
import {
  GeoComponent,
  VisualMapComponent,
  TooltipComponent,
  ToolboxComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false
function register() {
  if (registered) return
  registered = true
  echarts.use([
    MapChart,
    EffectScatterChart,
    GeoComponent,
    VisualMapComponent,
    TooltipComponent,
    ToolboxComponent,
    TitleComponent,
    CanvasRenderer,
  ])
}

export interface IndiaFeature {
  properties: { name: string; st: string; district: string }
}

let mapPromise: Promise<IndiaFeature[]> | null = null

/** Load + register the India GeoJSON once; resolves with its features (for state mapping). */
export function ensureIndiaMap(): Promise<IndiaFeature[]> {
  register()
  if (mapPromise) return mapPromise
  mapPromise = fetch(import.meta.env.BASE_URL + 'geo/india-districts.json')
    .then((r) => r.json())
    .then((geo: { features: IndiaFeature[] }) => {
      echarts.registerMap('india', geo as never)
      return geo.features
    })
  return mapPromise
}

export { echarts }
