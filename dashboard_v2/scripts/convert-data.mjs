/**
 * Phase A data-layer converter.
 *
 * The v1 dashboard ships its data as plain `.js` files that assign a single
 * `window.<GLOBAL> = <value>` literal. Several of them use JS object-literal
 * syntax (comments, unquoted keys, single quotes, trailing commas) rather than
 * strict JSON, so they must be *evaluated* in a sandbox — not JSON.parse'd.
 *
 * This script reads each source file from ../dashboard, evaluates it in a
 * node:vm context with a stub `window`, then serialises the captured global to
 * public/data/<name>.json. Re-run whenever the v1 data changes:
 *
 *   npm run data
 */
import vm from 'node:vm'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const V1_DIR = path.resolve(__dirname, '../../dashboard')
const OUT_DIR = path.resolve(__dirname, '../public/data')

/** source file → [window global name, output json basename] */
const SOURCES = [
  ['data.js', 'REIT_DATA', 'reit-data'],
  ['prices.js', 'LIVE_PRICES', 'live-prices'],
  ['structures.js', 'REIT_STRUCTURES', 'structures'],
  ['annexures.js', 'ANNEXURES', 'annexures'],
  ['annexdata.js', 'ANNEXDATA', 'annexdata'],
  ['annex_images.js', 'ANNEX_IMAGES', 'annex-images'],
  ['links.js', 'REIT_LINKS', 'links'],
  ['val_hy.js', 'REIT_VAL_HY', 'val-hy'],
  ['blocks_live.js', 'BLOCKS_LIVE', 'blocks-live'],
  ['bench.js', 'BENCH', 'bench'],
  ['bench_live.js', 'BENCH_LIVE', 'bench-live'],
  ['invit_data.js', 'INVIT', 'invit'],
  ['global_data.js', 'GLOBAL', 'global'],
  ['global_live.js', 'GLOBAL_LIVE', 'global-live'],
]

function convertOne(file, globalName) {
  const src = fs.readFileSync(path.join(V1_DIR, file), 'utf8')
  // Minimal browser-ish sandbox; these files only touch `window`.
  const sandbox = { window: {}, console }
  vm.createContext(sandbox)
  vm.runInContext(src, sandbox, { filename: file })
  const value = sandbox.window[globalName]
  if (value === undefined) {
    throw new Error(`${file}: window.${globalName} was not assigned`)
  }
  return value
}

fs.mkdirSync(OUT_DIR, { recursive: true })

let ok = 0
const manifest = []
for (const [file, globalName, out] of SOURCES) {
  try {
    const value = convertOne(file, globalName)
    const json = JSON.stringify(value)
    const outPath = path.join(OUT_DIR, `${out}.json`)
    fs.writeFileSync(outPath, json)
    const kb = (Buffer.byteLength(json) / 1024).toFixed(1)
    manifest.push({ file, global: globalName, out: `${out}.json`, kb: Number(kb) })
    console.log(`  ✓ ${file.padEnd(16)} → data/${out}.json  (${kb} KB)`)
    ok++
  } catch (err) {
    console.error(`  ✗ ${file}: ${err.message}`)
  }
}

console.log(`\n${ok}/${SOURCES.length} converted → ${path.relative(process.cwd(), OUT_DIR)}`)
if (ok !== SOURCES.length) process.exitCode = 1
