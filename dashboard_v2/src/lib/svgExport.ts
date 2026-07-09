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
function stackCanvases(cvs: HTMLCanvasElement[]): { url: string; w: number; h: number } {
  const dpr = window.devicePixelRatio || 1
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

/** Wrap a PNG data URL in a white-background SVG at the given CSS size. */
function pngSvg(dataUrl: string, w: number, h: number): string {
  const W = Math.round(w)
  const H = Math.round(h)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<image x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" href="${dataUrl}"/>` +
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
export function exportChartSvg(node: HTMLElement, name: string): void {
  const cvs = Array.from(node.querySelectorAll('canvas')) as HTMLCanvasElement[]
  if (!cvs.length) return
  const charts = cvs.map((cv) => Chart.getChart(cv)).filter((c): c is Chart => !!c)
  const restore = themeChartsLight()
  charts.forEach((ch) => ch.update('none'))
  try {
    if (cvs.length === 1) {
      const cv = cvs[0]
      download(slug(name), pngSvg(whiteCanvas(cv).toDataURL('image/png'), cv.clientWidth || cv.width, cv.clientHeight || cv.height))
    } else {
      const s = stackCanvases(cvs)
      download(slug(name), pngSvg(s.url, s.w, s.h))
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
export async function exportPanelSvg(node: HTMLElement, name: string): Promise<void> {
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
  const dpr = 2
  const c = document.createElement('canvas')
  c.width = w * dpr
  c.height = h * dpr
  const ctx = c.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  download(slug(name), pngSvg(c.toDataURL('image/png'), w, h))
}
