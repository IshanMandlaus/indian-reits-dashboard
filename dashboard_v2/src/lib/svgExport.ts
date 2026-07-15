/**
 * Export the dashboard's charts and snapshot panels as portable `.svg` files with
 * a **white background** and a light, print-ready theme (legible when dropped into
 * Word / slides).
 *
 * Chart.js renders to a `<canvas>` (raster), so a fully-vector SVG isn't possible
 * without re-drawing every chart. Instead:
 *  • **charts** — the live Chart.js instance(s) in the node are momentarily
 *    re-coloured to a light axis theme, captured, composited onto white, and
 *    embedded as a crisp high-DPI `<image>` inside an `<svg>`. The recolour is
 *    applied + captured + restored synchronously, so nothing flickers.
 *  • **panels** — the DOM subtree (e.g. a snapshot-card grid) is cloned, re-themed
 *    to light by adding the `.svg-export-light` class (which overrides the Tailwind
 *    `--color-*` tokens; see index.css), and rasterised through a `<foreignObject>`
 *    that carries the page's own stylesheet — so the real Tailwind layout is
 *    preserved rather than reconstructed from inlined per-node styles — then wrapped
 *    as a white-background SVG `<image>`.
 *
 * Both outputs are raster-in-SVG, which renders reliably everywhere (browsers,
 * Word, Illustrator, slides) — unlike a `<foreignObject>` SVG, which Word can't
 * render.
 */
import { Chart } from 'chart.js'
import { CHART, EXPORT_STATE } from './chartSetup'
import { chartHasBarLabels } from './barValueLabels'

// Pure black ink for ALL export text (ticks, legend, title, as-of, note) — the
// previous slate/grey pair read poorly when the SVG was dropped into Word.
const LIGHT_INK = '#000000'
const LIGHT_GRID = '#e5e7eb'

/**
 * Export remap for series colours, keyed by exact `r,g,b` triplet (alpha, hex or
 * rgba(), is preserved). The dark theme's neon 300/400-tier hues wash out on the
 * white export, so each maps to a Tailwind 500–700 shade of the same family.
 */
const SERIES_LIGHT: Record<string, string> = {
  '45,212,191': '#0d9488', // teal-400 accent (price / fair value) → teal-600
  '45,181,181': '#0d9488', // revenue-bar teal → teal-600
  '127,212,200': '#0f766e', // FD @7% pale-teal guide → teal-700
  '52,211,153': '#059669', // emerald-400 (NDCF / premium) → emerald-600
  '248,113,113': '#dc2626', // red-400 (debt / discount) → red-600
  '96,165,250': '#2563eb', // blue-400 (DPU / blocks / PAT) → blue-600
  '167,139,250': '#7c3aed', // violet-400 → violet-600
  '251,191,36': '#d97706', // amber-400 (Nifty Realty) → amber-600
  '217,196,138': '#b45309', // gold (NAV / yield) → amber-700
  '147,161,179': '#475569', // muted (SBI FD line) → slate-600
  '147,160,184': '#475569',
  '143,160,184': '#64748b', // book-value dashed → slate-500
  '140,160,185': '#64748b',
  '232,238,244': '#0f172a', // near-white ink line (basket yield) → slate-900
  '232,168,106': '#ea580c', // TechVillage orange → orange-600
  '195,155,211': '#9333ea', // SENSEX lilac → purple-600
  '90,107,128': '#475569', // pie slate → slate-600
  '217,143,156': '#e11d48', // pie rose → rose-600
  '143,217,196': '#14b8a6', // pie mint → teal-500
  '201,160,220': '#a855f7', // pie lavender → purple-500
  '255,180,84': '#f97316', // pie orange → orange-500
  '124,217,146': '#16a34a', // pie green → green-600
  '224,224,122': '#ca8a04', // pie yellow → yellow-600
  '176,176,176': '#6b7280', // pie grey → gray-500
}

/** Remap one colour value (hex6/hex8/rgb/rgba string, or array of them) via SERIES_LIGHT. */
function remapColor(v: unknown): unknown {
  if (Array.isArray(v)) {
    const next = v.map(remapColor)
    return next.some((c, i) => c !== v[i]) ? next : v
  }
  if (typeof v !== 'string') return v
  const hex = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i)
  if (hex) {
    const rgb = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).join(',')
    const to = SERIES_LIGHT[rgb]
    return to ? to + (hex[2] ?? '') : v
  }
  const rgba = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/)
  if (rgba) {
    const to = SERIES_LIGHT[`${rgba[1]},${rgba[2]},${rgba[3]}`]
    if (!to) return v
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16))
    return rgba[4] !== undefined ? `rgba(${r},${g},${b},${rgba[4]})` : `rgb(${r},${g},${b})`
  }
  return v
}

/**
 * Fixed pixel ratios for the exported rasters, independent of the user's screen
 * (a 1× monitor would otherwise produce a soft export). Charts re-render their
 * canvas at 4× for the capture; panels rasterise their DOM at 3× (the foreignObject
 * pass is heavier, and panels are mostly text which stays legible at 3×).
 */
const CHART_EXPORT_DPR = 4
const PANEL_EXPORT_DPR = 3

/**
 * Print sizing for chart exports. Word inserts an SVG at its intrinsic px size
 * (96px/in) and shrinks anything wider to the ~6.5in text column — so a chart
 * captured at its on-screen size (often 900–1100px wide) prints with ~7px
 * effective fonts. Instead the capture RESIZES every chart canvas to the print
 * width itself (624px ≈ 6.5in, no downscale in Word) and bumps fonts a modest
 * 1.25× (≈11pt printed ticks). Scaling fonts alone doesn't work: 1.7× fonts in
 * a 260px-tall canvas collapse the plot area (verified — giant legend, squashed
 * bars). EXPORT_STATE carries the scale to draw-time plugins (marker/bar labels).
 */
/**
 * Print type ramp — ABSOLUTE px at print width (relative multipliers fight the
 * layout: verified over two pilot rounds). 13px at 624px width prints at ~10pt
 * in a 6.5in Word column.
 */
const EXPORT_TICK_FONT = 13 // scale ticks, axis titles, legend
const EXPORT_TITLE_FONT = 14 // chart-internal titles (frame title is separate)
const EXPORT_LABEL_SCALE = 1.2 // plugin-drawn labels: 10px → 12px (via EXPORT_STATE)
const EXPORT_LEGEND_BOX = 10 // slimmer legend swatches/padding → fewer wrapped rows
const EXPORT_LEGEND_PAD = 8
const EXPORT_WIDTH = 624
/** Export canvas height: keep the on-screen aspect, clamped to a printable band. */
const exportHeight = (w: number, h: number): number =>
  Math.max(280, Math.min(460, Math.round((h * EXPORT_WIDTH) / Math.max(w, 1))))
/**
 * Minimum plot-area height in the capture. Legends live inside the canvas and
 * wrap at the narrow print width — a 7-series legend at print font takes ~5
 * rows and squeezed the plot to a sliver (verified on Chart 2). After the first
 * print-size layout, the canvas is grown by the plot's deficit so axes, legend
 * AND a readable plot all fit. Height is the free dimension: Word only shrinks
 * width, so up to ~640px (≈6.7in) still prints on one page with title+caption.
 */
const EXPORT_MIN_PLOT = 260
const EXPORT_MAX_HEIGHT = 640

/** Optional vector-text framing around the exported image (title/as-of above, note below). */
export interface ExportMeta {
  /** Chart title, rendered as a bold header line. */
  title?: string
  /** Data as-of line (e.g. "Live prices to 10 Jul 2026 10:28"), rendered under the title. */
  asof?: string
  /** Card footnote/source text, word-wrapped below the image (footnote style). */
  note?: string
}

/**
 * Switch Chart.js to a light theme globally (dark ink for ticks / legend / titles,
 * a light grid) and return a restore fn. We touch `Chart.defaults` — a plain object
 * our configs inherit from — rather than any live chart's `options`, because
 * Chart.js proxies instance options and mutating them recurses. Series (dataset)
 * colours are user-set on each dataset, so they're untouched and keep their hues.
 */
function themeChartsLight(): () => void {
  const color = Chart.defaults.color
  const border = Chart.defaults.borderColor
  Chart.defaults.color = LIGHT_INK
  Chart.defaults.borderColor = LIGHT_GRID
  return () => {
    Chart.defaults.color = color
    Chart.defaults.borderColor = border
  }
}

type ScalesConfig = Record<string, { grid?: Record<string, unknown> }>

/**
 * Hide every gridline on the given charts for the capture (export-only declutter;
 * axis border, ticks and labels stay) and return a restore fn. Toggling
 * `Chart.defaults.scale.grid` does NOT work here — scale defaults are merged into
 * each chart's config at init, so live charts never re-read them. Instead we flip
 * `grid.display` on `chart.config.options.scales` — the plain merged config object,
 * NOT the proxied resolved options (mutating those recurses). We walk the chart's
 * LIVE scales (`ch.scales`), not just the config-declared ones: a scale whose
 * config never mentions `grid` (e.g. VolumeCharts' y-axis) still draws default
 * gridlines, so we create the missing config entry for it. Two traps, both hit
 * in verification: (1) restore must WRITE the prior value back (deleting the key
 * resolves to no-grid, not back to the default); (2) `chart.update()` REPLACES the
 * config's scale/grid objects, so the restore must re-read them by chart + scale id
 * at restore time — a captured object reference is detached by then.
 */
const GRID_CREATED = Symbol('grid-created') // marker: config had no grid key — default (visible)
function gridsOff(charts: Chart[]): () => void {
  const saved: [Chart, string, unknown][] = []
  for (const ch of charts) {
    const opts = ch.config.options as { scales?: ScalesConfig } | undefined
    if (!opts) continue
    opts.scales ??= {}
    for (const id of Object.keys(ch.scales)) {
      const sc = (opts.scales[id] ??= {})
      saved.push([ch, id, sc.grid ? sc.grid.display : GRID_CREATED])
      sc.grid ??= {}
      sc.grid.display = false
    }
  }
  return () => {
    for (const [ch, id, display] of saved) {
      const grid = (ch.config.options as { scales?: ScalesConfig } | undefined)?.scales?.[id]?.grid
      // a created grid had been resolving to the default (visible), so restore to true
      if (grid) grid.display = display === GRID_CREATED ? true : display
    }
  }
}

/**
 * Force axis tick labels (and axis titles) to export ink and return a restore fn.
 * `themeChartsLight`'s `Chart.defaults.color` override reaches the legend but NOT
 * scale ticks: each scale holds a resolver built at init whose per-key cache keeps
 * serving the old default (verified — exported ticks stayed `#93a1b3`). An explicit
 * `ticks.color` on the plain merged config outranks the default and is read fresh.
 * Same mutation rules as `gridsOff`; call it AFTER `gridsOff` so `opts.scales`
 * entries exist for every live scale.
 */
function scaleTextInk(charts: Chart[]): () => void {
  type TextScales = Record<string, { ticks?: { color?: unknown }; title?: { color?: unknown } }>
  const scalesOf = (ch: Chart) => (ch.config.options as { scales?: TextScales } | undefined)?.scales
  const saved: [Chart, string, 'ticks' | 'title', unknown][] = []
  for (const ch of charts) {
    const scales = scalesOf(ch)
    if (!scales) continue
    for (const id of Object.keys(ch.scales)) {
      const sc = scales[id]
      if (!sc) continue
      for (const part of ['ticks', 'title'] as const) {
        const o = (sc[part] ??= {})
        saved.push([ch, id, part, o.color])
        o.color = LIGHT_INK
      }
    }
  }
  return () => {
    // re-read by chart + scale id — update() replaced the config's scale objects
    for (const [ch, id, part, color] of saved) {
      const o = scalesOf(ch)?.[id]?.[part]
      if (!o) continue
      if (color === undefined) delete o.color
      else o.color = color
    }
  }
}

/**
 * Recolour every dataset's colour props to the light export palette (SERIES_LIGHT)
 * and return a restore fn. Dataset objects are plain user config — safe to mutate
 * directly. Scriptable colours and canvas gradients are left alone (only plain
 * strings / arrays are remapped).
 */
const COLOR_KEYS = [
  'borderColor',
  'backgroundColor',
  'pointBackgroundColor',
  'pointBorderColor',
  'pointHoverBackgroundColor',
  'pointHoverBorderColor',
  'hoverBackgroundColor',
  'hoverBorderColor',
] as const
function seriesLight(charts: Chart[]): () => void {
  const saved: [Record<string, unknown>, string, unknown][] = []
  for (const ch of charts) {
    for (const ds of ch.config.data.datasets as unknown as Record<string, unknown>[]) {
      for (const key of COLOR_KEYS) {
        if (!(key in ds)) continue
        const prev = ds[key]
        const next = remapColor(prev)
        if (next !== prev) {
          saved.push([ds, key, prev])
          ds[key] = next
        }
      }
    }
  }
  return () => {
    for (const [ds, key, prev] of saved) ds[key] = prev
  }
}

/**
 * Swap the shared CHART palette itself to the light shades and return a restore
 * fn. Custom canvas plugins (Chart 2 issuance labels, Chart 5 yield labels,
 * Chart 8 P/B labels + parity line) read `CHART.*` at draw time, so this is what
 * recolours plugin-drawn text/lines — dataset colours were baked at build() and
 * are handled by `seriesLight`.
 */
function chartPaletteLight(): () => void {
  const c = CHART as unknown as Record<string, string>
  const saved = { ...c }
  for (const k of Object.keys(c)) {
    if (k === 'grid') continue // gridline colour is handled by themeChartsLight
    c[k] = remapColor(saved[k]) as string
  }
  return () => Object.assign(c, saved)
}

/**
 * Force chart-internal titles to export ink for the capture and return a restore
 * fn. `themeChartsLight` only flips `Chart.defaults`, so a title with an explicit
 * `color` in its config (e.g. PieDrilldown's `#e8eef4` — near-white) would stay
 * unreadable on the white export. Same config-mutation rules as `gridsOff`
 * (mutate the plain `chart.config.options`, re-read by chart at restore time).
 */
function titlesInk(charts: Chart[]): () => void {
  type TitleConfig = { plugins?: { title?: { color?: unknown } } }
  const saved: [Chart, unknown][] = []
  for (const ch of charts) {
    const title = (ch.config.options as TitleConfig | undefined)?.plugins?.title
    if (!title) continue // no title config → color resolves from defaults, already themed
    saved.push([ch, title.color])
    title.color = LIGHT_INK
  }
  return () => {
    for (const [ch, color] of saved) {
      const title = (ch.config.options as TitleConfig | undefined)?.plugins?.title
      if (!title) continue
      if (color === undefined) delete title.color
      else title.color = color
    }
  }
}

/**
 * Force every chart font to the ABSOLUTE print type ramp for the capture and
 * return a restore fn. `Chart.defaults.font.size` covers anything resolving
 * from defaults, but — same resolver-cache trap as `scaleTextInk` — scale ticks
 * and titles keep serving their init-time size, so explicit values are also
 * written onto the plain merged config (scale ticks/titles, legend labels,
 * chart title). Legend swatches/padding are slimmed at the same time so long
 * legends wrap to fewer rows at the narrow print width. Also flips EXPORT_STATE
 * so draw-time plugins (marker/bar value labels) pick up the print scale. Call
 * AFTER `scaleTextInk` — it created the `ticks`/`title` config objects.
 */
function fontsLarge(charts: Chart[]): () => void {
  const defaultSize = Chart.defaults.font.size
  Chart.defaults.font.size = EXPORT_TICK_FONT
  EXPORT_STATE.active = true
  EXPORT_STATE.fontScale = EXPORT_LABEL_SCALE
  type Holder = Record<string, unknown>
  type Path = ['scales', string, 'ticks' | 'title'] | ['plugins', 'legend' | 'title', 'labels' | null]
  // [chart, path, key, print value, saved value]
  const saved: [Chart, Path, string, unknown, unknown][] = []
  type AnyOpts = Record<string, Record<string, Holder | undefined> | undefined>
  // resolve the config object a path points at, creating missing levels on apply
  const holderAt = (ch: Chart, p: Path, create: boolean): Holder | null => {
    const opts = ch.config.options as unknown as AnyOpts | undefined
    if (!opts) return null
    if (create) opts[p[0]] ??= {}
    const lvl1 = opts[p[0]]
    if (!lvl1) return null
    if (create) lvl1[p[1]!] ??= {}
    const lvl2 = lvl1[p[1]!]
    if (!lvl2) return null
    if (p[2] == null) return lvl2
    if (create) lvl2[p[2]] ??= {}
    return (lvl2[p[2]] as Holder) ?? null
  }
  for (const ch of charts) {
    const entries: [Path, string, unknown][] = [
      ...Object.keys(ch.scales).flatMap((id): [Path, string, unknown][] => [
        [['scales', id, 'ticks'], 'font', { size: EXPORT_TICK_FONT }],
        [['scales', id, 'title'], 'font', { size: EXPORT_TICK_FONT }],
      ]),
      [['plugins', 'legend', 'labels'], 'font', { size: EXPORT_TICK_FONT }],
      [['plugins', 'legend', 'labels'], 'boxWidth', EXPORT_LEGEND_BOX],
      [['plugins', 'legend', 'labels'], 'boxHeight', EXPORT_LEGEND_BOX],
      [['plugins', 'legend', 'labels'], 'padding', EXPORT_LEGEND_PAD],
      [['plugins', 'title', null], 'font', { size: EXPORT_TITLE_FONT }],
    ]
    for (const [p, key, value] of entries) {
      const o = holderAt(ch, p, true)
      if (!o) continue
      saved.push([ch, p, key, value, o[key]])
      o[key] = value
    }
  }
  return () => {
    Chart.defaults.font.size = defaultSize
    EXPORT_STATE.active = false
    EXPORT_STATE.fontScale = 1
    // re-read by path — update() replaced the config's nested objects
    for (const [ch, p, key, , prev] of saved) {
      const o = holderAt(ch, p, false)
      if (!o) continue
      if (prev === undefined) delete o[key]
      else o[key] = prev
    }
  }
}

/**
 * Drop legend-toggled-off series from the export legend and return a restore
 * fn. On screen Chart.js renders hidden series struck-through (the toggle UX);
 * in a print export a struck-through entry is noise — filter it out entirely.
 * Same config-mutation rules as `gridsOff`.
 */
function legendHideHidden(charts: Chart[]): () => void {
  type LegendLabels = { filter?: unknown }
  type LegendOpts = { plugins?: { legend?: { labels?: LegendLabels } } }
  const labelsOf = (ch: Chart) => (ch.config.options as LegendOpts | undefined)?.plugins?.legend?.labels
  const saved: [Chart, unknown, boolean][] = []
  for (const ch of charts) {
    const opts = ch.config.options as LegendOpts | undefined
    if (!opts) continue
    opts.plugins ??= {}
    opts.plugins.legend ??= {}
    const labels = (opts.plugins.legend.labels ??= {})
    saved.push([ch, labels.filter, 'filter' in labels])
    labels.filter = (item: { hidden?: boolean }) => !item.hidden
  }
  return () => {
    for (const [ch, prev, existed] of saved) {
      const labels = labelsOf(ch)
      if (!labels) continue
      if (existed) labels.filter = prev
      else delete labels.filter
    }
  }
}

/**
 * Give bar-label charts axis headroom for the capture and return a restore fn.
 * Charts with export bar-value labels enabled get `grace` on their value scales
 * so the tallest bar never reaches the plot top — labels then always fit ABOVE
 * the bar instead of flipping inside it (black on the bar colour, verified on
 * Chart 3's max bar). Same config-mutation rules as `gridsOff`.
 */
function labelHeadroom(charts: Chart[]): () => void {
  type GraceScales = Record<string, { grace?: unknown }>
  const scalesOf = (ch: Chart) => (ch.config.options as { scales?: GraceScales } | undefined)?.scales
  const saved: [Chart, string, unknown, boolean][] = []
  for (const ch of charts) {
    if (!chartHasBarLabels(ch)) continue
    const scales = scalesOf(ch)
    if (!scales) continue
    const horizontal = (ch.options as { indexAxis?: string }).indexAxis === 'y'
    for (const id of Object.keys(ch.scales)) {
      if (id === (horizontal ? 'y' : 'x')) continue // index axis — no grace needed
      const sc = scales[id]
      if (!sc) continue
      saved.push([ch, id, sc.grace, 'grace' in sc])
      sc.grace = '12%'
    }
  }
  return () => {
    for (const [ch, id, grace, existed] of saved) {
      const sc = scalesOf(ch)?.[id]
      if (!sc) continue
      if (existed) sc.grace = grace
      else delete sc.grace
    }
  }
}

/**
 * Disable animations on the given charts and return a restore fn. The export
 * re-theme/recolour must go through a FULL `chart.update()` — `update('none')`
 * skips re-resolving per-element option caches, so dataset colour changes (both
 * applying the light palette and restoring the dark one — verified: bars kept
 * stale colours in the capture, and the live page kept export colours after) never
 * land. A full update animates by default, which would leave the synchronous
 * capture mid-tween — so animations are switched off for the export's duration.
 */
function animationsOff(charts: Chart[]): () => void {
  const saved: [Chart, unknown, boolean][] = []
  for (const ch of charts) {
    const opts = ch.config.options as { animation?: unknown } | undefined
    if (!opts) continue
    saved.push([ch, opts.animation, 'animation' in opts])
    opts.animation = false
  }
  return () => {
    for (const [ch, prev, existed] of saved) {
      const opts = ch.config.options as { animation?: unknown } | undefined
      if (!opts) continue
      if (existed) opts.animation = prev
      else delete opts.animation
    }
  }
}

/**
 * Re-render each chart at print geometry for the capture — canvas resized to
 * EXPORT_WIDTH × a clamped-aspect height (so Word never scales it down) at a
 * fixed high pixel ratio — and return a restore fn. Same config-mutation rules
 * as `gridsOff` (touch the plain `chart.config.options`, re-read at restore
 * time); the restore's argless `resize()` re-measures the parent container,
 * undoing the explicit style set by `resize(w, h)`. The `draw()` after
 * `resize()` is REQUIRED: when the chart has a queued `_resizeBeforeDraw`
 * (hidden tab, or a resize event raced in), `resize()` only stashes the request
 * for the next draw — which may come after our synchronous capture — while
 * `draw()` flushes it immediately.
 */
function chartsHiRes(charts: Chart[], dpr: number, panelMaxH?: number): () => void {
  const saved: [Chart, number | undefined, number, number][] = []
  for (const ch of charts) {
    const opts = ch.config.options as { devicePixelRatio?: number } | undefined
    if (!opts) continue
    // fall back to the container when the canvas measured 0 (chart mid-mount)
    const cssW = ch.canvas.clientWidth || ch.canvas.parentElement?.offsetWidth || ch.width
    const cssH = ch.canvas.clientHeight || ch.canvas.parentElement?.offsetHeight || ch.height
    saved.push([ch, opts.devicePixelRatio, cssW, cssH])
    opts.devicePixelRatio = dpr
    // multi-panel cards share a one-page height budget — cap each panel so the
    // stacked export isn't taller than a Word page (Word would shrink it back)
    const maxH = panelMaxH ?? EXPORT_MAX_HEIGHT
    const baseH = Math.min(exportHeight(cssW, cssH), maxH)
    ch.resize(EXPORT_WIDTH, baseH)
    // grow by the plot deficit — the legend/axes just claimed their print-size share
    const plotH = ch.chartArea ? ch.chartArea.bottom - ch.chartArea.top : baseH
    if (plotH < EXPORT_MIN_PLOT) {
      ch.resize(EXPORT_WIDTH, Math.min(maxH, baseH + (EXPORT_MIN_PLOT - plotH)))
    }
    ch.draw()
  }
  return () => {
    for (const [ch, prev, cssW, cssH] of saved) {
      const opts = ch.config.options as { devicePixelRatio?: number } | undefined
      if (!opts) continue
      if (prev === undefined) delete opts.devicePixelRatio
      else opts.devicePixelRatio = prev
      // restore the saved CSS size explicitly — an argless resize() re-measures
      // the container mid-restore and collapsed the canvas to 0 width (verified)
      ch.resize(cssW, cssH)
      ch.draw()
    }
  }
}

// ─── canvas compositing ──────────────────────────────────────────────────────

/** Draw a canvas onto an opaque white canvas of the same device size. */
function whiteCanvas(cv: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = cv.width
  c.height = cv.height
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(cv, 0, 0)
  return c
}

/** Stack several chart canvases vertically onto one white canvas. */
function stackCanvases(cvs: HTMLCanvasElement[], dpr: number): { url: string; w: number; h: number } {
  const gap = Math.round(16 * dpr)
  const W = Math.max(...cvs.map((c) => c.width))
  const H = cvs.reduce((a, c) => a + c.height, 0) + gap * (cvs.length - 1)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  let y = 0
  for (const cv of cvs) {
    ctx.drawImage(cv, Math.round((W - cv.width) / 2), y)
    y += cv.height + gap
  }
  return { url: c.toDataURL('image/png'), w: W / dpr, h: H / dpr }
}

// ─── SVG assembly + download ─────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const FONT = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/**
 * Word-wrap `text` to `maxWidth` CSS px using real canvas text metrics (the same
 * font stack the SVG declares), so the footnote lines break where the renderer will.
 */
let measureCtx: CanvasRenderingContext2D | null = null
function wrapText(text: string, maxWidth: number, font: string): string[] {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  if (!measureCtx) return [text]
  measureCtx.font = font
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? line + ' ' + word : word
    if (line && measureCtx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Wrap a PNG data URL in a white-background, black-bordered SVG at the given CSS
 * size, with optional vector text: the chart title (bold) and data as-of line
 * above the image, and the card's footnote word-wrapped below it.
 */
function pngSvg(dataUrl: string, w: number, h: number, meta?: ExportMeta): string {
  const W = Math.round(w)
  const pad = 16
  // the capture is already at print width (no downscale in Word), so these are
  // true printed sizes: ~13.5pt title, ~10pt as-of/footnote
  const titleSize = 18
  const metaSize = 13
  let header = ''
  let y = 12
  if (meta?.title) {
    // word-wrap — long card titles were clipped at the fixed print width
    for (const line of wrapText(meta.title, W - pad * 2, `600 ${titleSize}px ${FONT}`)) {
      y += titleSize + 2
      header += `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="${titleSize}" font-weight="600" fill="${LIGHT_INK}">${esc(line)}</text>`
    }
    y += 8
  }
  if (meta?.asof) {
    for (const line of wrapText(meta.asof, W - pad * 2, `${metaSize}px ${FONT}`)) {
      y += metaSize + 2
      header += `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="${metaSize}" fill="${LIGHT_INK}">${esc(line)}</text>`
    }
    y += 5
  }
  const headerH = header ? y + 10 : 0
  const imgH = Math.round(h)
  let footer = ''
  let footerH = 0
  if (meta?.note) {
    const lineH = 20
    const lines = wrapText(meta.note, W - pad * 2, `${metaSize}px ${FONT}`)
    lines.forEach((line, i) => {
      footer += `<text x="${pad}" y="${headerH + imgH + 20 + i * lineH}" font-family="${FONT}" font-size="${metaSize}" fill="${LIGHT_INK}">${esc(line)}</text>`
    })
    footerH = 20 + (lines.length - 1) * lineH + 12
  }
  const H = headerH + imgH + footerH
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    header +
    `<image x="0" y="${headerH}" width="${W}" height="${imgH}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}"/>` +
    footer +
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#000000" stroke-width="1"/>` +
    `</svg>`
  )
}

function download(filename: string, svg: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.svg') ? filename : filename + '.svg'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'export'

// ─── public: chart export ────────────────────────────────────────────────────

/** Export every Chart.js canvas inside `node` as one white-background SVG. */
export function exportChartSvg(node: HTMLElement, name: string, meta?: ExportMeta): void {
  const cvs = Array.from(node.querySelectorAll('canvas')) as HTMLCanvasElement[]
  if (!cvs.length) return
  const charts = cvs.map((cv) => Chart.getChart(cv)).filter((c): c is Chart => !!c)
  const restoreAnim = animationsOff(charts)
  const restoreTheme = themeChartsLight()
  const restoreGrids = gridsOff(charts)
  const restoreScaleText = scaleTextInk(charts) // after gridsOff: it created the scale entries
  const restoreTitles = titlesInk(charts)
  const restoreFonts = fontsLarge(charts) // after scaleTextInk: it created the ticks/title config objects
  const restoreHeadroom = labelHeadroom(charts)
  const restoreLegend = legendHideHidden(charts)
  const restorePalette = chartPaletteLight()
  const restoreSeries = seriesLight(charts)
  charts.forEach((ch) => ch.update()) // FULL update (see animationsOff) — 'none' keeps stale colours
  // multi-panel cards: split a one-page image budget across the stacked panels
  // (16px gaps between them) so Word doesn't shrink the export to fit the page.
  // ~700px leaves room for a wrapped title + multi-line footnote inside Word's
  // ~9in (≈864px) printable height.
  const PAGE_IMG_BUDGET = 700
  const panelMaxH =
    charts.length > 1
      ? Math.max(200, Math.floor((PAGE_IMG_BUDGET - 16 * (charts.length - 1)) / charts.length))
      : undefined
  const restoreDpr = chartsHiRes(charts, CHART_EXPORT_DPR, panelMaxH) // after update: resize()+draw() renders themed synchronously
  const restore = () => {
    restoreSeries()
    restorePalette()
    restoreLegend()
    restoreHeadroom()
    restoreFonts()
    restoreTitles()
    restoreScaleText()
    restoreGrids()
    restoreTheme()
    charts.forEach((ch) => ch.update()) // FULL update — re-resolves the dark palette into element caches
    restoreDpr() // last — its resize()+draw() then repaints the restored dark theme synchronously
    restoreAnim()
  }
  try {
    if (cvs.length === 1) {
      const cv = cvs[0]
      download(slug(name), pngSvg(whiteCanvas(cv).toDataURL('image/png'), cv.clientWidth || cv.width, cv.clientHeight || cv.height, meta))
    } else {
      const s = stackCanvases(cvs, CHART_EXPORT_DPR)
      download(slug(name), pngSvg(s.url, s.w, s.h, meta))
    }
  } finally {
    restore()
  }
}

// ─── public: panel (DOM) export ──────────────────────────────────────────────

/** Concatenate every same-origin stylesheet's rules (for embedding in the export). */
function collectCss(): string {
  let css = ''
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin sheet — not readable, skip
    }
    if (!rules) continue
    for (const rule of Array.from(rules)) css += rule.cssText + '\n'
  }
  return css
}

/** Replace each cloned `<canvas>` with an `<img>` carrying the source pixels. */
function replaceCanvases(src: Element, clone: Element): void {
  const s = src.querySelectorAll('canvas')
  const c = clone.querySelectorAll('canvas')
  for (let i = 0; i < s.length; i++) {
    const sc = s[i] as HTMLCanvasElement
    const cc = c[i] as HTMLElement | undefined
    if (!cc) continue
    let url: string
    try {
      url = sc.toDataURL('image/png')
    } catch {
      continue
    }
    const img = document.createElement('img')
    img.src = url
    img.setAttribute('style', cc.getAttribute('style') || '')
    img.className = cc.className
    const r = sc.getBoundingClientRect()
    img.setAttribute('width', String(Math.round(sc.clientWidth || r.width)))
    img.setAttribute('height', String(Math.round(sc.clientHeight || r.height)))
    cc.parentNode?.replaceChild(img, cc)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Export a DOM panel (e.g. the snapshot-card grid) as a light-themed,
 * white-background SVG. Clones the node, re-themes it via `.svg-export-light`, and
 * rasterises it through a `<foreignObject>` that carries the page's own stylesheet
 * (so the real Tailwind layout is preserved — no per-node style inlining), then
 * embeds the flattened PNG in an SVG.
 */
export async function exportPanelSvg(node: HTMLElement, name: string, meta?: ExportMeta): Promise<void> {
  const w = node.offsetWidth
  const h = node.offsetHeight
  const css = collectCss()
  const clone = node.cloneNode(true) as HTMLElement
  clone.classList.add('svg-export-light')
  replaceCanvases(node, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  const cloneHtml = new XMLSerializer().serializeToString(clone)
  const foreign =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<foreignObject x="0" y="0" width="${w}" height="${h}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;background:#ffffff">` +
    `<style><![CDATA[${css}]]></style>${cloneHtml}</div>` +
    `</foreignObject></svg>`

  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(foreign))
  const dpr = PANEL_EXPORT_DPR
  const c = document.createElement('canvas')
  c.width = w * dpr
  c.height = h * dpr
  const ctx = c.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  download(slug(name), pngSvg(c.toDataURL('image/png'), w, h, meta))
}
