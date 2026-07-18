/**
 * Filesystem helpers for the refresh server.
 *
 * The v2 app reads its live data from `public/data/*.json` in dev and from
 * `dist/data/*.json` under `vite preview`. `resolveDataDir` picks the right one;
 * `writeJsonAtomic` writes compact JSON via a tmp file + rename so the client's
 * loader (`src/lib/data.ts`) never reads a half-written file, and so the write
 * doesn't race Vite's own file watcher.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ResolvedConfig } from 'vite'

/** Dev → `<publicDir>/data`; preview → `<root>/<build.outDir>/data` (→ dist/data). */
export function resolveDataDir(config: ResolvedConfig, isPreview: boolean): string {
  if (isPreview) {
    return path.resolve(config.root, config.build.outDir, 'data')
  }
  return path.join(config.publicDir, 'data')
}

/** Write `obj` as compact JSON to `<dir>/<name>.json` atomically (tmp + rename). */
export async function writeJsonAtomic(dir: string, name: string, obj: unknown): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
  const target = path.join(dir, `${name}.json`)
  const tmp = `${target}.tmp`
  await fs.writeFile(tmp, JSON.stringify(obj), 'utf8')
  await fs.rename(tmp, target)
}

/** Read + parse `<dir>/<name>.json`; returns `null` if missing or unparseable. */
export async function readJson<T = unknown>(dir: string, name: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(dir, `${name}.json`), 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
