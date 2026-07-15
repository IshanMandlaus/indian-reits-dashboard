/**
 * Export-only value labels for bar charts. Registered globally (see setupCharts)
 * but draws ONLY while the SVG export capture is active (`EXPORT_STATE.active`) —
 * the on-screen dark theme stays clean. Grouped bars get their value above each
 * bar (beside, for horizontal bars); stacked bars get one label per stack — the
 * total — above the top segment. Only category-axis bars are labelled, which
 * skips the thin time-axis DPU bars in Chart 1 automatically.
 *
 * Currently OPT-IN per chart via `options.plugins.barValueLabels.display`
 * (pilot rollout); ink and font are resolved at draw time so the export's black
 * ink and print font scale apply (same pattern as Chart 8's P/B labels).
 */
import { Chart, CategoryScale, type Plugin, type ChartType } from 'chart.js'
import { EXPORT_STATE, labelFont } from './chartSetup'

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends ChartType> {
    barValueLabels?: {
      /** Default ON for category-axis bar charts — set false to opt a chart out. */
      display?: boolean
      /** Custom value formatter (defaults to compact en-IN grouping). */
      format?: (v: number) => string
    }
  }
}

/** Default formatter: en-IN grouping, decimals only where they matter. */
function fmtValue(v: number): string {
  const a = Math.abs(v)
  const dec = a >= 100 ? 0 : a >= 10 ? 1 : 2
  return v.toLocaleString('en-IN', { maximumFractionDigits: dec })
}

/** Compact fallback when the full number is wider than its bar (grouped 5-digit
 * ₹cr values collide between neighbouring bars — verified on Chart 3). */
function fmtCompact(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e5) return (v / 1e5).toFixed(1) + 'L'
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return fmtValue(v)
}

/** ₹ crore label: thousands as "31.6k cr", smaller values as "842 cr". */
export function fmtCrLabel(v: number): string {
  return Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k cr' : Math.round(v) + ' cr'
}

/**
 * Would the export draw value labels on this chart? True when the chart has a
 * bar dataset on a category index axis and hasn't opted out. Shared with
 * svgExport's `labelHeadroom` so axis grace is only added where labels appear.
 */
export function chartHasBarLabels(ch: Chart): boolean {
  // plain config, not ch.options — the proxy calls scriptable plugin options on access
  if (ch.config.options?.plugins?.barValueLabels?.display === false) return false
  return ch.data.datasets.some((_, di) => {
    const meta = ch.getDatasetMeta(di)
    return meta.type === 'bar' && meta.iScale instanceof CategoryScale
  })
}

type BarEl = { x: number; y: number; width?: number; height?: number }

type Rect = { left: number; top: number; w: number; h: number }
const intersects = (a: Rect, b: Rect): boolean =>
  a.left < b.left + b.w && b.left < a.left + a.w && a.top < b.top + b.h && b.top < a.top + a.h

/**
 * Collision-aware label placement: each label tries its preferred spot, then
 * steps away (dir −1 = up, +1 = down) in line-height increments until it clears
 * every previously placed label, then records its rect. Deterministic — no
 * per-chart tuning. Shared by the bar-value plugin and chart-local marker
 * plugins (Chart 2's issuance/block %s).
 */
export class LabelPlacer {
  private rects: Rect[] = []
  /** Returns the adjusted top for a `w`×`h` label preferring `top`, and records it. */
  place(left: number, top: number, w: number, h: number, dir: -1 | 1, maxSteps = 4): number {
    const step = (h + 2) * dir
    let t = top
    for (let i = 0; i < maxSteps; i++) {
      const r = { left, top: t, w, h }
      if (!this.rects.some((o) => intersects(o, r))) break
      t += step
    }
    this.rects.push({ left, top: t, w, h })
    return t
  }
}

export const barValueLabels: Plugin = {
  id: 'barValueLabels',
  afterDatasetsDraw(ch) {
    if (!EXPORT_STATE.active) return
    // read from the PLAIN config, not ch.options: the resolved-options proxy
    // treats `format` as scriptable and CALLS it with a context object on access
    const opts = ch.config.options?.plugins?.barValueLabels
    if (opts?.display === false) return // default ON for category-axis bar charts
    const fmt = opts?.format ?? fmtValue
    const horizontal = (ch.options as { indexAxis?: string }).indexAxis === 'y'

    // one label per bar; for stacked datasets, one label per (stack, index) —
    // the running total, positioned on the outermost segment drawn so far
    type Slot = { el: BarEl; value: number }
    const labels = new Map<string, Slot>()
    ch.data.datasets.forEach((ds, di) => {
      const meta = ch.getDatasetMeta(di)
      if (meta.type !== 'bar' || meta.hidden || !ch.isDatasetVisible(di)) return
      if (!(meta.iScale instanceof CategoryScale)) return
      const stack = (ds as { stack?: string }).stack
      meta.data.forEach((el, i) => {
        const raw = ds.data[i]
        const v = typeof raw === 'number' ? raw : null
        if (v == null || Number.isNaN(v)) return
        const key = stack ? `s:${stack}:${i}` : `d:${di}:${i}`
        const prev = labels.get(key)
        labels.set(key, { el: el as unknown as BarEl, value: (prev?.value ?? 0) + v })
      })
    })
    if (!labels.size) return

    const ctx = ch.ctx
    const area = ch.chartArea
    ctx.save()
    ctx.font = labelFont()
    // draw-time read: flips to black ink while the export re-theme is active
    ctx.fillStyle = Chart.defaults.color as string
    const pad = 4
    const fontPx = Math.round(10 * EXPORT_STATE.fontScale)
    const placer = new LabelPlacer()
    for (const { el, value } of labels.values()) {
      let text = fmt(value)
      // a label wider than its bar slot collides with the neighbouring bar's —
      // fall back to the compact form (only when using the default formatter)
      if (!horizontal && !opts?.format && el.width && ctx.measureText(text).width > el.width + 6) {
        text = fmtCompact(value)
      }
      const tw = ctx.measureText(text).width
      if (horizontal) {
        ctx.textBaseline = 'middle'
        // beside the bar end; flip inside when it would clip the chart's right edge
        const fitsOutside = el.x + pad + tw <= area.right
        ctx.textAlign = fitsOutside ? 'left' : 'right'
        const left = fitsOutside ? el.x + pad : el.x - pad - tw
        const top = placer.place(left, el.y - fontPx / 2, tw, fontPx, -1)
        ctx.fillText(text, fitsOutside ? el.x + pad : el.x - pad, top + fontPx / 2)
      } else {
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        // keep the label inside the canvas — an edge bar's centred text otherwise
        // clips at the right border (verified: FY26 "38.2k cr")
        const cx = Math.min(Math.max(el.x, tw / 2 + 1), ch.width - tw / 2 - 1)
        // above the bar top, stepping up past earlier labels; the export applies
        // scale grace so there's headroom — clamp to the plot top as a last resort
        const top = placer.place(cx - tw / 2, el.y - pad - fontPx, tw, fontPx, -1)
        ctx.fillText(text, cx, Math.max(top, area.top - fontPx) + fontPx)
      }
    }
    ctx.restore()
  },
}
