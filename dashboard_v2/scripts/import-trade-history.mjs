/**
 * Seed daily traded-volume history from the exchange CSVs in
 * "../Trade History/" (per REIT: <Name>_NSE.csv + <Name>_BSE.csv) into
 * public/data/volume-history.json. Per date: v = NSE Total Traded Quantity
 * + BSE No.of Shares (whichever venues traded); c = NSE Close Price (the
 * canonical price whenever one is needed). Run: npm run data:volume
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, '..', 'Trade History')
const outFile = join(root, 'public', 'data', 'volume-history.json')

/** CSV filename (lowercased) prefix → bench.js security name. */
const NAME = [
  ['embassy', 'Embassy REIT'],
  ['mindspace', 'Mindspace REIT'],
  ['brookfield', 'Brookfield REIT'],
  ['nexusselect', 'Nexus Select Trust'],
  ['knowledgerealty', 'Knowledge Realty Trust'],
]

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

/** "01-Apr-2019" (NSE) or "16-July-2026" (BSE) → "2019-04-01". */
function isoDate(s) {
  const m = s.trim().match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/)
  if (!m) return null
  const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]
  if (!mo) return null
  return `${m[3]}-${String(mo).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`
}

/** Split one CSV line on commas outside double quotes (NSE quotes grouped numbers). */
function splitCsv(line) {
  const out = []
  let cur = ''
  let q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

/** "29,03,200" / "8,87,91,338.25" / "422" → number. */
const num = (s) => Number(s.replace(/[",]/g, ''))

const secs = {}
let asof = ''
for (const f of readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.csv')).sort()) {
  const lower = f.toLowerCase()
  const sec = NAME.find(([p]) => lower.startsWith(p))?.[1]
  const venue = lower.includes('_nse') ? 'nse' : lower.includes('_bse') ? 'bse' : null
  if (!sec || !venue) {
    console.warn(`skip (no mapping): ${f}`)
    continue
  }
  const lines = readFileSync(join(srcDir, f), 'utf8').replace(/^﻿/, '').split(/\r?\n/)
  const header = splitCsv(lines[0]).map((h) => h.trim())
  // NSE: Date / Close Price / Total Traded Quantity. BSE: Date / No.of Shares.
  const iDate = header.findIndex((h) => h === 'Date')
  // NSE files carry a Series column; keep only regular-market rows (RR) —
  // BL block-deal crossings are order-of-magnitude spikes already charted
  // separately (Chart 2 block markers).
  const iSeries = header.findIndex((h) => h === 'Series')
  const iVol = header.findIndex((h) => h === (venue === 'nse' ? 'Total Traded Quantity' : 'No.of Shares'))
  const iClose = venue === 'nse' ? header.findIndex((h) => h === 'Close Price') : -1
  if (iDate < 0 || iVol < 0) {
    console.warn(`skip (columns not found): ${f}`)
    continue
  }
  const map = (secs[sec] ??= {})
  let n = 0
  let lo = ''
  let hi = ''
  let blocks = 0
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const cells = splitCsv(line)
    if (iSeries >= 0 && cells[iSeries]?.trim() !== 'RR') {
      blocks++
      continue
    }
    const d = isoDate(cells[iDate])
    const v = num(cells[iVol] ?? '')
    if (!d || !Number.isFinite(v)) {
      console.warn(`  unparsed line in ${f}: ${line.slice(0, 80)}`)
      continue
    }
    const rec = (map[d] ??= { v: 0 })
    rec.v += v
    if (iClose >= 0) {
      const c = num(cells[iClose] ?? '')
      if (Number.isFinite(c)) rec.c = c
    }
    n++
    if (!lo || d < lo) lo = d
    if (!hi || d > hi) hi = d
  }
  if (hi > asof) asof = hi
  console.log(`${sec.padEnd(24)} ${venue.toUpperCase()}  ${lo} → ${hi}  (${n} days${blocks ? `, ${blocks} non-RR rows skipped` : ''})  [${f}]`)
}

writeFileSync(outFile, JSON.stringify({ asof, secs }))
console.log(`\nwrote ${outFile} (asof ${asof}, ${Object.keys(secs).length} series)`)
