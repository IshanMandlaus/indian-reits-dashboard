// Prebuild guard: verify public/img (a symlink → ../../dashboard/img) actually
// resolves and carries the annexure/structure images before we build.
//
// Vite 8 copies public/ into dist/ and *does* follow this symlink (verified), so
// the build normally just works. But the symlink is committed to git, and if it
// ever dangles (repo restructure, sparse/partial checkout, img/ moved) `vite build`
// would SILENTLY produce a dist/ with broken images. This turns that into a loud,
// early failure so a broken deploy can't ship unnoticed.
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const imgDir = resolve('public/img')
const fail = (msg) => {
  console.error(`\n[check-assets] ${msg}\n`)
  process.exit(1)
}

if (!existsSync(imgDir)) {
  fail('public/img is missing — annexure & structure images will not ship. ' +
    'Recreate the symlink: (cd public && ln -s ../../dashboard/img img)')
}

let entries
try {
  entries = readdirSync(imgDir)
} catch (e) {
  fail(`cannot read public/img (dangling symlink?): ${e.message}`)
}

// The annexure images live under img/annex/; their absence means the symlink
// resolved to the wrong place or the source tree is incomplete.
if (!entries.length || !existsSync(resolve('public/img/annex'))) {
  fail('public/img resolved but looks empty (no annex/ subdirectory). ' +
    'Broken symlink or missing source images in ../dashboard/img.')
}

console.log(`[check-assets] public/img OK (${entries.length} top-level entries, annex/ present)`)
