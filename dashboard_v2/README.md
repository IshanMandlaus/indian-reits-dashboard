# Indian REITs Dashboard — v2

An interactive dashboard for India's listed **REITs** (Embassy, Mindspace, Brookfield,
Nexus, Knowledge Realty Trust, Bagmane), **InvITs** (NHIT, Raajmarg, PGInvIT), and the
**global** REIT markets. Four pages of price/NAV, distributions, capital structure,
benchmarks, unitholding patterns, SPV/asset detail, and annexure drill-downs — with
one-click live data refresh from NSE/BSE and Yahoo Finance.

This is the **v2** rebuild (React SPA) and is fully self-contained. An earlier vanilla-JS +
Python implementation (**v1**) is frozen on the **`main`** branch; the `v2` branch no longer
depends on it — see [History](#history) below.

- **Repo:** https://github.com/IshanMandlaus/indian-reits-dashboard (private) · branch `v2`
- **Stack:** Vite 8 · React 19 · TypeScript 6 · Tailwind CSS v4 · React Router 7 ·
  Chart.js 4 (`react-chartjs-2` + `chartjs-plugin-zoom`) · `yahoo-finance2`
- **Theme:** refined dark only

**v2 runs on npm alone — no Python, no separate server.** Live refresh is served by a
Vite plugin (`POST /api/refresh`) that runs inside `npm run dev` and `npm run preview`.

---

## Requirements

- **Node.js ≥ 20** (developed on v23; `fetch` + `getSetCookie` are used, so v20+ is required)
- npm (ships with Node)

That's the whole list. No Python, no global tooling.

---

## Quick start

```bash
git clone https://github.com/IshanMandlaus/indian-reits-dashboard.git
cd indian-reits-dashboard
git checkout v2

cd dashboard_v2
npm install
npm run dev            # → http://localhost:5273
```

Open http://localhost:5273. The app loads immediately from the committed data in
`public/data/*.json` — **no refresh or API keys needed** to view it.

> The app renders from static JSON that ships in the repo, so a fresh clone works
> offline. Refreshing (below) is optional and only needed to pull newer market data.

---

## Refreshing live data

Click **⟳ Refresh data** in the top nav. It sends `POST /api/refresh`, which pulls and
rewrites `public/data/*.json` in place, then reloads the page. Four sources refresh in
parallel (~1 min):

| Source | What it fetches | From |
|---|---|---|
| prices | Live REIT unit prices | NSE + BSE |
| holdings | Sponsor-vs-public unitholding pattern per REIT | NSE |
| market | Benchmark & security price history, ADTV | Yahoo Finance |
| global | Global REIT quotes + price history | Yahoo Finance |

Notes:

- Refresh only exists where the Node process runs — i.e. **`npm run dev` and
  `npm run preview`**. A pure static host (just the built `dist/`) serves the app fine
  but has no `/api/refresh`; the committed JSON is what ships.
- Each source writes **only if it got data** — a blocked/failed source keeps its cached
  file, so a partial refresh never blanks a page. Live history only ever grows (fresh
  values are merged into the cached series, never used to shrink it).
- A refresh edits the committed `*-live.json` / `holdings.json` files, so it shows up as
  a git change. That's expected — commit it if you want to publish the newer data.
- The **trading-volume** chart intentionally stays on workbook data (not live) by design.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on **:5273** (HMR + `/api/refresh`). |
| `npm run build` | Prebuild asset check → `tsc -b` → `vite build` → static site in `dist/`. |
| `npm run preview` | Serve the built `dist/` locally (also exposes `/api/refresh`). |
| `npm run data` | Regenerate the **static** `public/data/*.json` from the vendored `.js` sources in `data-src/`. |
| `npm run lint` | Lint with oxlint. |

Typecheck on its own: `npx tsc -b`.

There is also a repo-root `.claude/launch.json` with a **`v2-dashboard`** config (npm
dev, :5273) plus alt-port variants for running a second instance.

---

## Production build

```bash
npm run build          # → dist/  (static, deployable)
npm run preview        # serve dist/ locally to verify
```

`npm run build` runs `scripts/check-assets.mjs` first — a guard that **fails the build
loudly** if the committed `public/img` image folder is missing or empty, rather than silently
shipping a `dist/` with broken images. Vite copies all annexure images and the data JSON
into `dist/`, and SPA deep routes (`/market`, `/global`, …) fall back to `index.html`.

Deploy the contents of `dist/` to any static host. (Static hosts won't have the refresh
endpoint — see [Refreshing live data](#refreshing-live-data).)

---

## Project structure

```
dashboard_v2/
  index.html                     # SPA entry (preloads the Inter font)
  vite.config.ts                 # :5273, refreshPlugin(), tailwind, react
  package.json                   # npm-only; engines.node >= 20

  public/
    data/*.json                  # 15 datasets the app loads per route
    fonts/InterVariable.woff2    # self-hosted full Inter (has ₹ and →)
    img/                         # committed annexure & structure images (~207 MB)

  data-src/                      # vendored .js sources for the static datasets (npm run data)

  server/                        # live refresh — Node/TS, run by the Vite plugin
    refreshPlugin.ts             #   registers POST /api/refresh (dev + preview)
    index.ts                     #   runAll(): NSE lane + Yahoo lane, per-source try/catch
    lib/{io,nse,yahoo,types}.ts  #   atomic writes · NSE cookie session · yahoo-finance2 wrapper
    fetchers/{prices,holdings,market,global}.ts

  src/
    main.tsx  router.tsx         # 4 routes under a shared AppShell
    index.css                    # Tailwind v4 @theme tokens (refined dark)
    components/
      layout/AppShell.tsx        #   top nav + the one ⟳ Refresh data button
      charts/                    #   TimeSeriesChart, SecurityModal, Sparkline, useChartCanvas, RangeBar
      domestic/ market/ invit/ global/   #   per-page chart & section components
      ui/                        #   Card, Badge, PageHeader, KPI
    lib/                         #   data loader, formatters, domain logic (bench, invit, global, reit)
    pages/                       #   DomesticReits, Market, InvITs, Global
    types/data.ts               #   dataset shapes

  scripts/
    convert-data.mjs             # data-src/*.js → public/data/*.json  (npm run data)
    check-assets.mjs             # prebuild image-folder guard
```

### Data pipeline

- **Static datasets** (11) are regenerated by `npm run data`, which sandbox-evaluates the
  vendored `window.*` `.js` sources in `data-src/` and serialises each to
  `public/data/<name>.json`. The generated JSON is committed and is the source of truth;
  edit the `data-src/` source then re-run `npm run data` to update it.
- **Live datasets** (`live-prices`, `bench-live`, `global-live`, `holdings`) are owned by
  the refresh server and rewritten in place by the ⟳ refresh (see above) — `npm run data`
  never touches them.
- **Images:** the annexure page scans + structure PNGs (~207 MB) are committed under
  `public/img/`; the build copies them into `dist/`.

---

## History

An earlier vanilla-JS + Python implementation (**v1**) — 4 linked HTML pages served by
`serve.py`, with `refresh_*.py` for live data — is frozen on the **`main`** branch. v2
preserves all of its functionality; only the implementation and UI changed. The `v2` branch
is fully standalone and no longer contains or depends on v1.

For the full build history, design tokens, and per-page implementation notes, see
[`HANDOVER.md`](HANDOVER.md).
