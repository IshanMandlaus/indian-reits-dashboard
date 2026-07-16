/**
 * Seed daily close-price history from the authoritative CSVs in
 * "../Historical Close Prices/" (one file per REIT/InvIT, rows
 * "YYYY-MM-DD 00:00:00",close) into public/data/price-history.json.
 * That file is the top-priority layer in makeBenchCtx / Chart1PriceNav —
 * live refreshes only extend past its last date. Run: npm run data:prices
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, '..', 'Historical Close Prices')
const outFile = join(root, 'public', 'data', 'price-history.json')

/** CSV filename (lowercased) prefix → bench.js security name. */
const NAME = [
  ['embassy', 'Embassy REIT'],
  ['mindspace', 'Mindspace REIT'],
  ['brookfield', 'Brookfield REIT'],
  ['nexus', 'Nexus Select Trust'],
  ['krt', 'Knowledge Realty Trust'],
  ['bagmane', 'Bagmane REIT'],
  ['nhit', 'NHIT InvIT'],
  ['riit', 'Raajmarg InvIT'],
  ['pginvit', 'PGInvIT'],
]

const secs = {}
let asof = ''
for (const f of readdirSync(srcDir).filter((f) => f.toLowerCase().endsWith('.csv'))) {
  const sec = NAME.find(([p]) => f.toLowerCase().startsWith(p))?.[1]
  if (!sec) {
    console.warn(`skip (no security mapping): ${f}`)
    continue
  }
  const map = {}
  for (const line of readFileSync(join(srcDir, f), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1)) {
    const m = line.match(/^"(\d{4}-\d{2}-\d{2}) 00:00:00",("?)([\d.]+)\2\s*$/)
    if (!m) {
      if (line.trim()) console.warn(`  unparsed line in ${f}: ${line}`)
      continue
    }
    map[m[1]] = Number(m[3])
  }
  const dates = Object.keys(map).sort()
  if (!dates.length) {
    console.warn(`skip (no rows): ${f}`)
    continue
  }
  secs[sec] = map
  if (dates[dates.length - 1] > asof) asof = dates[dates.length - 1]
  console.log(`${sec.padEnd(24)} ${dates[0]} → ${dates[dates.length - 1]}  (${dates.length} closes)  [${f}]`)
}

writeFileSync(outFile, JSON.stringify({ asof, secs }))
console.log(`\nwrote ${outFile} (asof ${asof}, ${Object.keys(secs).length} series)`)
