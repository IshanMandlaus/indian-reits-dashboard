/**
 * Vite plugin exposing `POST /api/refresh` on BOTH the dev server and the preview
 * server, so the one global refresh button works under `npm run dev` and under
 * `npm run build && npm run preview`. The heavy fetcher code (and `yahoo-finance2`)
 * is lazily `import()`-ed inside the handler so it doesn't run at startup.
 *
 * Dev writes to `<publicDir>/data`; preview writes to `dist/data`.
 */
import type { Plugin, ResolvedConfig, Connect } from 'vite'
import { resolveDataDir } from './lib/io.ts'

function makeHandler(dataDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url || ''
    if (!url.startsWith('/api/refresh')) return next()
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Allow', 'POST')
      res.end('Method Not Allowed')
      return
    }
    ;(async () => {
      try {
        const { runAll } = await import('./index.ts')
        const results = await runAll(dataDir)
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: results.some((r) => r.ok), results }))
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }))
      }
    })()
  }
}

export function refreshPlugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'reits-refresh',
    configResolved(c) {
      config = c
    },
    configureServer(server) {
      server.middlewares.use(makeHandler(resolveDataDir(config, false)))
    },
    configurePreviewServer(server) {
      server.middlewares.use(makeHandler(resolveDataDir(config, true)))
    },
  }
}
