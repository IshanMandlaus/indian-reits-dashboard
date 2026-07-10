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

const LIGHT_INK = '#0f172a'
const LIGHT_GRID = '#e5e7eb'
const LIGHT_MUT = '#64748b'

/**
 * Fixed pixel ratios for the exported rasters, independent of the user's screen
 * (a 1× monitor would otherwise produce a soft export). Charts re-render their
 * canvas at 4× for the capture; panels rasterise their DOM at 3× (the foreignObject
 * pass is heavier, and panels are mostly text which stays legible at 3×).
 */
const CHART_EXPORT_DPR = 4
const PANEL_EXPORT_DPR = 3

/** Optional header stamped above the exported image (kept as real vector text). */
export interface ExportMeta {
  /** Chart title, rendered as a bold header line. */
  title?: string
  /** Data as-of line (e.g. "Live prices to 10 Jul 2026 10:28"), rendered under the title. */
  asof?: string
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
 * NOT the proxied resolved options (mutating those recurses). Two traps, both hit
 * in verification: (1) restore must WRITE the prior value back (deleting the key
 * resolves to no-grid, not back to the default); (2) `chart.update()` REPLACES the
 * config's scale/grid objects, so the restore must re-read them by chart + scale id
 * at restore time — a captured object reference is detached by then.
 */
function gridsOff(charts: Chart[]): () => void {
  const saved: [Chart, string, unknown][] = []
  for (const ch of charts) {
    const scales = (ch.config.options as { scales?: ScalesConfig } | undefined)?.scales
    if (!scales) continue
    for (const [id, sc] of Object.entries(scales)) {
      if (!sc?.grid) continue
      saved.push([ch, id, sc.grid.display])
      sc.grid.display = false
    }
  }
  return () => {
    for (const [ch, id, display] of saved) {
      const grid = (ch.config.options as { scales?: ScalesConfig } | undefined)?.scales?.[id]?.grid
      if (grid) grid.display = display
    }
  }
}

/**
 * Re-render each chart's backing canvas at a fixed high pixel ratio for the capture
 * (CSS size is unchanged — the resize only recreates the backing store) and return a
 * restore fn. Same config-mutation rules as `gridsOff` (touch the plain
 * `chart.config.options`, re-read at restore time). The `draw()` after `resize()` is
 * REQUIRED: when the chart has a queued `_resizeBeforeDraw` (hidden tab, or a resize
 * event raced in), `resize()` only stashes the request for the next draw — which may
 * come after our synchronous capture — while `draw()` flushes it immediately.
 */
function chartsHiRes(charts: Chart[], dpr: number): () => void {
  const applyDpr = (ch: Chart, value: number | undefined) => {
    const opts = ch.config.options as { devicePixelRatio?: number } | undefined
    if (!opts) return
    if (value === undefined) delete opts.devicePixelRatio
    else opts.devicePixelRatio = value
    ch.resize()
    ch.draw()
  }
  const saved: [Chart, number | undefined][] = []
  for (const ch of charts) {
    const opts = ch.config.options as { devicePixelRatio?: number } | undefined
    if (!opts) continue
    saved.push([ch, opts.devicePixelRatio])
    applyDpr(ch, dpr)
  }
  return () => {
    for (const [ch, prev] of saved) applyDpr(ch, prev)
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
 * Wrap a PNG data URL in a white-background SVG at the given CSS size, with an
 * optional vector-text header: the chart title (bold) and the data as-of line.
 */
function pngSvg(dataUrl: string, w: number, h: number, meta?: ExportMeta): string {
  const W = Math.round(w)
  const pad = 16
  let header = ''
  let y = 10
  if (meta?.title) {
    y += 16
    header += `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="14" font-weight="600" fill="${LIGHT_INK}">${esc(meta.title)}</text>`
    y += 6
  }
  if (meta?.asof) {
    y += 12
    header += `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="11" fill="${LIGHT_MUT}">${esc(meta.asof)}</text>`
    y += 4
  }
  const headerH = header ? y + 8 : 0
  const H = Math.round(h) + headerH
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    header +
    `<image x="0" y="${headerH}" width="${W}" height="${Math.round(h)}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}"/>` +
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
  const restoreTheme = themeChartsLight()
  const restoreGrids = gridsOff(charts)
  charts.forEach((ch) => ch.update('none'))
  const restoreDpr = chartsHiRes(charts, CHART_EXPORT_DPR) // after update: resize() re-renders themed
  const restore = () => {
    restoreGrids()
    restoreTheme()
    restoreDpr() // last — its resize() repaints with the dark theme back
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
    charts.forEach((ch) => ch.update('none'))
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
