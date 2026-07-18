// Prebuild guard: verify public/img (the committed annexure/structure image
// folder) is present and populated before we build.
//
// Vite 8 copies public/ into dist/, so the build normally just works. But if the
// image set ever goes missing (repo restructure, sparse/partial checkout, images
// removed) `vite build` would SILENTLY produce a dist/ with broken images. This
// turns that into a loud, early failure so a broken deploy can't ship unnoticed.
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const imgDir = resolve('public/img')
const fail = (msg) => {
  console.error(`\n[check-assets] ${msg}\n`)
  process.exit(1)
}

if (!existsSync(imgDir)) {
  fail('public/img is missing — annexure & structure images will not ship. ' +
    'Restore the committed image folder from git.')
}

let entries
try {
  entries = readdirSync(imgDir)
} catch (e) {
  fail(`cannot read public/img: ${e.message}`)
}

// The annexure images live under img/annex/; their absence means the image set
// is incomplete.
if (!entries.length || !existsSync(resolve('public/img/annex'))) {
  fail('public/img has no annex/ subdirectory — the image set is incomplete.')
}

console.log(`[check-assets] public/img OK (${entries.length} top-level entries, annex/ present)`)
