/**
 * Central Chart.js configuration for the v2 dashboard.
 *
 * react-chartjs-2 does not auto-register controllers/elements, so we register
 * everything the domestic page uses once, here, plus the zoom/pan plugin.
 * Also sets dark-theme defaults and exports the shared palette (mapped to the
 * refined-dark tokens) and the base/zoom/rescale helpers ported from v1.
 */
import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  PieController,
  ScatterController,
  LineElement,
  PointElement,
  BarElement,
  ArcElement,
  LinearScale,
  LogarithmicScale,
  CategoryScale,
  Tooltip,
  Legend,
  Title,
  Filler,
  type ChartOptions,
  type ChartConfiguration,
  type Chart as ChartInstance,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { barValueLabels } from './barValueLabels'

let registered = false

/**
 * Live flags for the SVG-export capture window (svgExport.ts flips them around
 * the synchronous capture). Draw-time canvas plugins read these so export-only
 * decorations (bar value labels) and print-size fonts apply without touching
 * the on-screen dark theme.
 */
export const EXPORT_STATE = { active: false, fontScale: 1 }

/** Canvas font for plugin-drawn labels — scales up during the SVG export capture. */
export function labelFont(): string {
  return `600 ${Math.round(10 * EXPORT_STATE.fontScale)}px sans-serif`
}

/**
 * Draw a value label with a background-coloured halo so the number stays legible
 * where it crosses a line, bar edge, or marker. Halo = plot background: pure
 * black on the dark screen theme, white under the export re-theme. Respects the
 * caller's font / textAlign / textBaseline; sets the fill to `color`.
 */
export function haloText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.strokeStyle = EXPORT_STATE.active ? '#ffffff' : '#000000'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

/** Register Chart.js pieces + zoom plugin and set dark defaults (idempotent). */
export function setupCharts(): void {
  if (registered) return
  registered = true
  Chart.register(
    LineController,
    BarController,
    DoughnutController,
    PieController,
    ScatterController,
    LineElement,
    PointElement,
    BarElement,
    ArcElement,
    LinearScale,
  LogarithmicScale,
    CategoryScale,
    Tooltip,
    Legend,
    Title,
    Filler,
    zoomPlugin,
    barValueLabels,
  )
  Chart.defaults.color = CHART.mut
  Chart.defaults.borderColor = CHART.grid
  Chart.defaults.font.family =
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
  Chart.defaults.maintainAspectRatio = false
}

/** Chart series palette — refined-dark tokens (see index.css @theme). */
export const CHART = {
  acc: '#2dd4bf', // teal accent — price / fair value
  gold: '#d9c48a', // NAV / yield line
  grn: '#34d399', // NDCF / premium
  red: '#f87171', // debt / discount
  info: '#60a5fa', // DPU / blocks / PAT
  violet: '#a78bfa',
  mut: '#93a1b3', // muted text / ticks
  grid: 'rgba(28, 36, 49, 0.6)', // --color-border at low alpha
  bookGrid: '#8fa0b8', // book-value dashed line
} as const

/** Shared base options — legend at bottom, nearest-point interaction. */
export function baseOptions(): ChartOptions {
  return {
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 14,
          // Dashed-line series get a solid legend swatch — a [5,4] dash stroked
          // around a 12px filled box renders as a jagged blob.
          generateLabels: (chart) =>
            Chart.defaults.plugins.legend.labels.generateLabels(chart).map((it) => ({ ...it, lineDash: [] })),
        },
      },
    },
  }
}

/**
 * Fit the primary y-axis to the data visible in the current x window, killing
 * dead vertical space after a range/zoom change. Ported from v1 `rescaleY`.
 * Reads `_xmin/_xmax` stashed on the chart instance.
 */
export function rescaleY(ch: ChartInstance): void {
  const x = ch.options.scales?.x as { min?: number; max?: number } | undefined
  const xmin = (ch as ChartWithRange)._xmin
  const xmax = (ch as ChartWithRange)._xmax
  const lo = x?.min ?? xmin
  const hi = x?.max ?? xmax
  if (lo == null || hi == null) return
  let mn = Infinity
  let mx = -Infinity
  ch.data.datasets.forEach((d) => {
    const yid = (d as { yAxisID?: string }).yAxisID
    if (yid && yid !== 'y') return
    ;(d.data as unknown[]).forEach((p) => {
      if (p && typeof p === 'object') {
        const pt = p as { x?: number; y?: number }
        if (pt.x != null && pt.y != null && pt.x >= lo && pt.x <= hi) {
          if (pt.y < mn) mn = pt.y
          if (pt.y > mx) mx = pt.y
        }
      }
    })
  })
  const yScale = ch.options.scales?.y as { min?: number; max?: number } | undefined
  if (!yScale) return
  if (mn === Infinity) {
    delete yScale.min
    delete yScale.max
    return
  }
  const pad = Math.max((mx - mn) * 0.09, (mx || 1) * 0.02)
  yScale.min = Math.max(0, mn - pad)
  yScale.max = mx + pad
}

/** Zoom/pan plugin options for time-axis charts (ported from v1 `zoomOpts`). */
export function zoomOptions() {
  return {
    zoom: {
      wheel: { enabled: true, modifierKey: null as never },
      pinch: { enabled: true },
      drag: {
        enabled: true,
        modifierKey: 'shift' as const,
        backgroundColor: 'rgba(45,212,191,.18)',
      },
      mode: 'x' as const,
      onZoomComplete: ({ chart }: { chart: ChartInstance }) => {
        if ((chart as ChartWithRange)._xmin !== undefined) {
          rescaleY(chart)
          chart.update('none')
        }
      },
    },
    pan: {
      enabled: true,
      mode: 'x' as const,
      modifierKey: 'ctrl' as const,
      onPanComplete: ({ chart }: { chart: ChartInstance }) => {
        if ((chart as ChartWithRange)._xmin !== undefined) {
          rescaleY(chart)
          chart.update('none')
        }
      },
    },
    limits: { x: { min: 'original' as const, max: 'original' as const } },
  }
}

/** A Chart instance carrying the original x-range for range-bar rescaling. */
export type ChartWithRange = ChartInstance & { _xmin?: number; _xmax?: number }

/** A chart config carrying the original x-range (charts 1 & 2 stash it here). */
export type RangeConfig = ChartConfiguration & { _xmin?: number; _xmax?: number }
