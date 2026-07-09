import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/domestic', label: 'Domestic REITs', num: '01' },
  { to: '/market', label: 'Market & Benchmarks', num: '02' },
  { to: '/invits', label: 'InvITs', num: '03' },
  { to: '/global', label: 'Global Markets', num: '04' },
]

export function AppShell() {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-strong text-[15px] font-bold text-bg shadow-[0_0_20px_-4px_rgba(45,212,191,0.6)]">
              R
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-ink">
                Indian REITs
              </div>
              <div className="text-[11px] font-medium text-subtle">
                Market Intelligence
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'group relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'bg-surface-2 text-ink'
                      : 'text-muted hover:bg-surface/60 hover:text-ink',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={[
                        'font-mono text-[10px] tabular-nums transition-colors',
                        isActive ? 'text-accent' : 'text-subtle group-hover:text-muted',
                      ].join(' ')}
                    >
                      {item.num}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* One global refresh — pulls prices, unitholding, benchmarks & global quotes */}
          <GlobalRefreshButton />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-6">
        <Outlet />
      </main>
    </div>
  )
}

interface SourceResult {
  source: string
  ok: boolean
  asof: string | null
  count: number
  error?: string
}

/**
 * The single live-data refresh: POST /api/refresh (served by the Vite plugin in
 * dev + preview), which re-pulls prices, unitholding, benchmarks and global
 * quotes from NSE/BSE/Yahoo and rewrites public/data/*.json. Reloads on success.
 */
function GlobalRefreshButton() {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [tip, setTip] = useState('Pull the latest prices, unitholding, benchmarks & global quotes')

  const refresh = async () => {
    setBusy(true)
    setFailed(false)
    try {
      const r = await fetch('/api/refresh', { method: 'POST' })
      const j = (await r.json()) as { ok?: boolean; results?: SourceResult[]; error?: string }
      if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`)
      const results = j.results ?? []
      const summary = results
        .map((s) => `${s.source}: ${s.ok ? `✓ ${s.count}` : `✗ ${s.error ?? 'failed'}`}`)
        .join(' · ')
      if (!j.ok) {
        setTip(summary || 'All sources failed')
        setFailed(true)
        setBusy(false)
        return
      }
      // Some sources may have partially failed but at least one updated → reload to show it.
      location.reload()
    } catch (e) {
      setTip(e instanceof Error ? e.message : 'Refresh failed')
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <button
      onClick={refresh}
      disabled={busy}
      title={tip}
      className={[
        'shrink-0 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition disabled:opacity-50',
        failed
          ? 'bg-neg/15 text-neg hover:bg-neg/25'
          : 'bg-accent text-bg hover:bg-accent-strong',
      ].join(' ')}
    >
      {busy ? 'Refreshing…' : failed ? '⟳ Refresh failed — retry' : '⟳ Refresh data'}
    </button>
  )
}
