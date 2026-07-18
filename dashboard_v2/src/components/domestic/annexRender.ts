/**
 * Faithful port of v1's annexure text/table rendering pipeline (renderAnnexItems
 * and friends). Turns the parsed valuation-report blocks (annexdata) into an
 * HTML string rendered into the modal via dangerouslySetInnerHTML. The heuristics
 * (junk filtering, table cleaning, run-on splitting, subset suppression) are kept
 * as-is so output matches v1. Styling lives under `.annex-content` in index.css.
 */
import type { AnnexBlock, ReitKey, Annexures } from '../../types/data'

const esc = (s: unknown): string =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const JUNK = /\.{4,}|…|^—|^\s*$|^Page \d+|^\d{1,3}$|Registered Valuer|IBBI\/|^Source:/

function cleanTable(rows: string[][]): string[][] | null {
  let R = rows.filter((r) => !JUNK.test(r.join(' ')) && r.some((c) => c && c.length > 1))
  if (!R.length) return null
  const w = Math.max(...R.map((r) => r.length))
  R = R.map((r) => {
    const x = [...r]
    while (x.length < w) x.push('')
    return x
  })
  const n = R.length
  const keep = [...Array(w).keys()].filter((j) => {
    const filled = R.reduce((s, r) => s + (r[j] ? 1 : 0), 0)
    return n > 5 ? filled > 0.15 * n : filled > 0
  })
  if (!keep.length) return null
  R = R.map((r) => keep.map((j) => r[j]))
  return R.length ? R : null
}

const LBL = /([A-Z][A-Za-z ()/&'’-]{2,32}):\s+/g
function splitRunon(t: string): [string, string][] | null {
  const parts = [...t.matchAll(LBL)]
  if (parts.length < 2) return null
  const rows: [string, string][] = []
  if ((parts[0].index ?? 0) > 4) rows.push(['', t.slice(0, parts[0].index).trim()])
  for (let i = 0; i < parts.length; i++) {
    const end = i + 1 < parts.length ? (parts[i + 1].index ?? t.length) : t.length
    rows.push([parts[i][1], t.slice((parts[i].index ?? 0) + parts[i][0].length, end).trim()])
  }
  return rows.filter((r) => r[1])
}

function stitchTables(secs: AnnexBlock[]): AnnexBlock[] {
  const out: AnnexBlock[] = []
  const isNum = (c: string) => /^-?[\d,]+(?:\.\d+)?%?$/.test(c.trim())
  for (const it of secs) {
    const prev = out[out.length - 1]
    if (it.t === 'tbl' && prev && prev.t === 'tbl') {
      const w1 = Math.max(...prev.rows.map((r) => r.length))
      const w2 = Math.max(...it.rows.map((r) => r.length))
      if (w1 === w2 && it.rows[0].some(isNum)) {
        prev.rows = prev.rows.concat(it.rows)
        continue
      }
    }
    out.push(it.t === 'tbl' ? { t: 'tbl', rows: [...it.rows] } : it)
  }
  return out
}

function renderPara(t: string): string {
  if (JUNK.test(t) || t.length < 12) return ''
  const numtok = (t.match(/[\d,]+(?:\.\d+)?%?/g) || []).length
  if (numtok >= 8 && numtok > t.split(/\s+/).length * 0.45) return `<pre class="numrun">${esc(t)}</pre>`
  const rr = splitRunon(t)
  if (rr)
    return (
      '<div class="twrap"><table class="def"><tbody>' +
      rr
        .map(
          ([l, v]) =>
            `<tr><td>${esc(l)}</td><td>${v.length > 240 ? `<div class="clamp">${esc(v)}</div>` : esc(v)}</td></tr>`,
        )
        .join('') +
      '</tbody></table></div>'
    )
  const parts = t.split(/((?:-?[\d,]+(?:\.\d+)?%?\s+){4,}-?[\d,]+(?:\.\d+)?%?)/)
  if (parts.length > 1)
    return parts
      .map((s, i) => {
        s = s.trim()
        if (!s) return ''
        return i % 2 ? `<pre class="numrun">${esc(s)}</pre>` : `<p>${esc(s)}</p>`
      })
      .join('')
  return `<p>${esc(t)}</p>`
}

/** Render the parsed annexure blocks for an asset to an HTML string. */
export function renderAnnexItems(secsIn: AnnexBlock[]): string {
  const secs = stitchTables(secsIn)
  let h = ''
  let lastH = ''
  const cleaned = secs.map((it) => (it.t === 'tbl' ? cleanTable(it.rows) : null))
  const sigsets = cleaned.map((R) => (R ? new Set(R.map((r) => JSON.stringify(r))) : null))
  const suppress = new Set<number>()
  for (let i = 0; i < cleaned.length; i++) {
    if (!cleaned[i]) continue
    for (let j = 0; j < cleaned.length; j++) {
      if (i === j || !cleaned[j] || suppress.has(j)) continue
      const a = sigsets[i]!
      const b = sigsets[j]!
      if (a.size < b.size) {
        let hit = 0
        for (const s of a) if (b.has(s)) hit++
        if (hit >= Math.max(2, Math.ceil(0.75 * a.size))) {
          suppress.add(i)
          break
        }
      } else if (a.size === b.size && j < i) {
        let hit = 0
        for (const s of a) if (b.has(s)) hit++
        if (hit === a.size) {
          suppress.add(i)
          break
        }
      }
    }
  }

  secs.forEach((it, ix) => {
    if (it.t === 'pg') h += `<div class="mpg">report page ${it.x}</div>`
    else if (it.t === 'h') {
      const t = it.x.trim()
      if (JUNK.test(t) || t === lastH) return
      lastH = t
      const hnum = (t.match(/[\d,]+(?:\.\d+)?%?/g) || []).length
      if (hnum >= 3) {
        h += renderPara(t)
        return
      }
      h += `<h4>${esc(t)}</h4>`
    } else if (it.t === 'p') {
      const t = it.x.trim()
      const segs = t.split(/(?<=(?:table below|table above|as follows|find below[\w\s()–-]{0,80})\s{0,2}[:：])\s+/i)
      for (const s of segs) h += renderPara(s.trim())
    } else if (it.t === 'tbl') {
      const R = cleaned[ix]
      if (!R || suppress.has(ix)) return
      const cols = R[0].length
      const hdr = R[0]
      const body = R.slice(1)
      const isHdr = body.length > 0 && hdr.filter((c) => c).length >= 2 && !/\d{3}/.test(hdr.join(''))
      const isDef = cols === 2 && R.filter((r) => /[:：]\s*$/.test(r[0])).length > R.length / 3
      const cls = (cols >= 6 ? 'wide' : '') + (isDef ? ' def' : '')
      const isLong = (r: string[]) => r.some((c) => c.length > 240)
      const fixCell = (c: string) => {
        let t = c.replace(/[:：]\s*$/, '')
        const nums = (t.match(/\d[\d,]*\.?\d*/g) || []).length
        if (t.length > 60 && nums >= 2) t = t.replace(/(?<=[\d%).]) (?=[A-Z(])/g, '\n')
        return esc(t).replace(/\n/g, '<br>')
      }
      const rowHtml = (r: string[]) => {
        const sub = r[0] && !r.slice(1).some((c) => c)
        return `<tr${sub ? ' class="sub"' : ''}>` + r.map((c) => `<td>${fixCell(c)}</td>`).join('') + '</tr>'
      }
      const defRow = (r: string[]) => {
        const long = r.reduce((a, b) => (b.length > a.length ? b : a), '')
        const label = r[0] === long ? '' : r[0].replace(/[:：]\s*$/, '')
        const rest = r.filter((c) => c !== long && c !== r[0] && c).join(' · ')
        return `<div class="defrow">${label ? `<span class="dl2">${esc(label)}</span>` : ''}<div class="clamp">${esc(long)}${rest ? ' — ' + esc(rest) : ''}</div></div>`
      }
      const parts: ({ t: 'rows'; rows: string[][] } | { t: 'def'; row: string[] })[] = []
      let seg: string[][] = []
      const rows2 = isHdr && !isDef ? body : R
      for (const r of rows2) {
        if (isLong(r)) {
          if (seg.length) {
            parts.push({ t: 'rows', rows: seg })
            seg = []
          }
          parts.push({ t: 'def', row: r })
        } else seg.push(r)
      }
      if (seg.length) parts.push({ t: 'rows', rows: seg })
      for (const p of parts) {
        if (p.t === 'def') {
          h += defRow(p.row)
          continue
        }
        h += `<div class="twrap"><table class="${cls.trim()}">`
        if (isHdr && !isDef) h += '<thead><tr>' + hdr.map((c) => `<th>${esc(c)}</th>`).join('') + '</tr></thead>'
        h += '<tbody>' + p.rows.map(rowHtml).join('') + '</tbody></table></div>'
      }
    }
  })
  return h
}

/** Order the report pages for an asset: statement/description pages first. */
export function annexPages(annexures: Annexures | null, k: ReitKey, asset: string, secs: AnnexBlock[]): number[] {
  const mapped = annexures?.[k]?.[asset] || null
  const pages =
    mapped && mapped.length
      ? mapped
      : [...new Set((secs || []).filter((s): s is { t: 'pg'; x: number } => s.t === 'pg').map((s) => s.x))]
  if (!pages.length || !secs.length) return pages
  const byPage: Record<number, string> = {}
  let cur: number | null = null
  for (const it of secs) {
    if (it.t === 'pg') {
      cur = it.x
      if (!byPage[cur]) byPage[cur] = ''
      continue
    }
    if (cur == null) continue
    if (it.t === 'tbl') byPage[cur] += ' ' + it.rows.flat().join(' ')
    else byPage[cur] += ' ' + (it.x || '')
  }
  const rawScore = (p: number) => {
    const t = (byPage[p] || '').toLowerCase()
    if (
      /statement of assets|area statement|property name|subject property description|asset description|asset details|asset type|building area|leasable area|occupancy\s*(?:\(|:)|occupancy office|average occupancy|current effective rent|approved usage/.test(
        t,
      )
    )
      return 0
    return 1
  }
  const score: Record<number, number> = {}
  pages.forEach((p) => {
    score[p] = rawScore(p)
  })
  for (let i = 1; i < pages.length; i++) {
    const prev = pages[i - 1]
    const p = pages[i]
    if (p === prev + 1 && score[prev] === 0) score[p] = 0
  }
  return [...pages].sort((a, b) => score[a] - score[b] || pages.indexOf(a) - pages.indexOf(b))
}
