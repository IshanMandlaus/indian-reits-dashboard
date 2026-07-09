# Indian REITs Dashboard v2 — Session Handover

> Living document for anyone (human or agent) picking up the v2 rebuild.
> Last updated: 2026-07-09 (**v2 is now fully STANDALONE** — the v1 `dashboard/` folder was
> removed from the `v2` branch; images de-symlinked into a real `public/img/`, static data
> sources vendored to `data-src/`. Committed on `v2` as `8b0d9c5`. Prior milestone: Phase E
> npm-only refresh, `18a6348`.) Update the **Status** and **Changelog** sections as you go.

---

## 1. TL;DR

We rebuilt the Indian REITs dashboard as **v2**: same functionality as v1, new
implementation. v1 is a static multi-page vanilla-JS + Chart.js app; v2 is a modern
React SPA. **v2 is now feature-complete, production-ready, AND self-contained:** all
four pages are wired to real data (Phases A–C), the refresh pipeline is done, and as
of Phase E it runs **npm-only** — one ⟳ Refresh data button in the top nav pulls live
NSE/BSE/Yahoo data through a Vite plugin (`POST /api/refresh`); no Python, no serve.py,
no v1 needed. **Nothing is outstanding.** Phase D2 is a deliberate won't-do (volume
chart stays on workbook data by design). Read §10 Changelog top-to-bottom for the full
build history; §6 Phase E for the refresh server.

- **Repo:** https://github.com/IshanMandlaus/indian-reits-dashboard (private)
- **Branch:** `v2` — now fully standalone; **`dashboard/` (v1) was removed from this branch.**
  v1 stays frozen and intact on `main`.
- **v2 app:** `dashboard_v2/` (the whole product; `npm install && npm run dev` off a clean clone)

---

## 2. Product intent (from the user)

- Keep the **functionality** of every v1 component; the *methodology to build it may
  change*.
- Build on **React + Tailwind**. v1 "looks too rudimentary."
- Want **better layouts and cleaner colors**.
- Theme decision: **refined dark only** (no light mode for now).
- Language: **TypeScript**. Charts: **Chart.js via react-chartjs-2** (chosen for
  fidelity — v1 leans on Chart.js-specific zoom/pan/custom-plugin behavior that would
  be costly to reproduce in Recharts).

---

## 3. Stack & key decisions

| Concern | Decision | Rationale |
|---|---|---|
| Build | Vite 8 + React 19 + TypeScript | Fast HMR, typed data models |
| Styling | Tailwind CSS v4 (CSS-first `@theme` in `src/index.css`) | User request; tokens → utilities |
| Routing | React Router 7 (`src/router.tsx`) | Replaces 4 hard-linked HTML pages with SPA + shared shell |
| Charts | Chart.js 4 + react-chartjs-2 + chartjs-plugin-zoom | Preserve v1's zoom/pan/drilldown/custom-label behavior |
| Data | Static `window.*` `.js` sources (vendored in `data-src/`) → static JSON via `npm run data`, lazy-loaded per route | Big files (annexdata 1.1 MB) must be code-split; JSON is the committed source of truth |
| Refresh | **Node/TS fetchers in a Vite plugin** (`server/`), one `POST /api/refresh` | npm-only; no Python. See §6 Phase E |

**Refresh (as of Phase E, npm-only):** `vite.config.ts` registers `refreshPlugin()` which
serves `POST /api/refresh` on dev **and** preview. No proxy, no `serve.py`. The old dev-proxy
to `:8742` is gone.

---

## 4. How to run

```bash
cd dashboard_v2
npm install
npm run dev          # http://localhost:5273  (live refresh works here via /api/refresh)
```

Typecheck: `npx tsc -b`  ·  Build: `npm run build`  ·  Lint: `npm run lint` (oxlint)  ·
Regenerate static data: `npm run data` (from vendored `data-src/`).

There is a `.claude/launch.json` at repo root with the **`v2-dashboard`** config (npm dev,
:5273) plus alt-port variants. (The old `v1-dashboard`/serve.py config was removed.)

---

## 5. Current state (what exists)

> ⚠️ This section described the *initial scaffold*. It is now historical — **every page
> is fully wired to real data and there are no placeholders left.** See §6 (all phases
> ✅) and §10 Changelog for the real, current structure. Key runtime layout today:

```
dashboard_v2/
  server/                       # Phase E — npm-only refresh (Node/TS, Vite plugin)
    refreshPlugin.ts            #   POST /api/refresh on dev + preview
    index.ts                    #   runAll() — two-lane fetch orchestration
    lib/{io,nse,yahoo,types}.ts #   fs + NSE session + yahoo-finance2 wrapper
    fetchers/{prices,holdings,market,global}.ts  # ports of the 4 refresh_*.py
  src/
    components/layout/AppShell.tsx   # top nav + ONE global ⟳ Refresh data button
    components/{domestic,market,invit,global,charts}/  # all real, wired charts
    lib/{data,useDataset,bench,invit,global,reit,chartSetup,format,svgExport}.ts
    pages/{Domestic,Market,Invits,Global}Page.tsx   # all fully wired to real data
    types/data.ts
  public/data/*.json            # 15 datasets; the 4 *-live + holdings refresh live
  public/img/                   # committed annexure + structure images (~207 MB, real folder)
  data-src/*.js                 # vendored .js sources for the 11 STATIC datasets (npm run data)
  scripts/{convert-data,check-assets}.mjs
```

Original scaffold note (historical): the pages once shipped with `ChartPlaceholder`
boxes and demo values — all replaced across Phases A–C. `ChartPlaceholder.tsx` may
still exist but is unused.

---

## 6. Remaining work (priority order)

### Phase A — Data layer ✅ DONE (2026-07-09)
- **Converter:** `scripts/convert-data.mjs` (run `npm run data`). Sandbox-evaluates
  each `.js` global via `node:vm` with a stub `window` and serializes to
  `public/data/<name>.json`. **(Standalone update: sources are now vendored in `data-src/`,
  and only the 11 STATIC datasets are converted — see the top Changelog entry.)**
- **Output:** `public/data/*.json` (committed, ~2.9 MB total) — `reit-data`,
  `live-prices`, `structures`, `annexures`, `annexdata`, `annex-images`, `links`,
  `val-hy`, `blocks-live`, `bench`, `bench-live`, `invit`, `global`, `global-live`.
- **Types:** `src/types/data.ts` — accurate shapes derived from the real JSON (note:
  `REIT_DATA` also has `built` + `notes`; `mcap_breakdown`/`sector_breakdown` are
  country-keyed objects, not arrays).
- **Loader:** `src/lib/data.ts` — `loadData(name)` (typed, cached, in-flight-deduped,
  honours `BASE_URL`) + `invalidateData()`. React hook: `src/lib/useDataset.ts`
  → `useDataset('reit-data')` returns `{data, loading, error}`.
- **Images:** ~~`public/img` is a **symlink** → `../dashboard/img`~~ **SUPERSEDED — as of the
  standalone move `public/img` is a real committed folder of 918 files (~207 MB); the note below
  about symlink behaviour is historical.** Verified Vite serves both JSON and
  images (HTTP 200) in dev. ✅ **Production build RESOLVED (2026-07-09):** Vite 8 /
  Rollup *does* follow the symlink on `vite build` — `dist/img` is a real copy of all
  926 files (byte-identical, md5-verified), and `vite preview` serves them + data JSON
  + SPA deep-route fallback all at HTTP 200. The feared "Rollup won't follow the
  symlink" does not occur with this toolchain. A prebuild guard
  (`scripts/check-assets.mjs`, wired into `npm run build`) now fails the build **loudly**
  if `public/img` ever dangles (repo restructure / sparse checkout), instead of silently
  shipping a `dist/` with broken images. No copy/CDN change needed for the current
  single-repo deploy model.

### Phase B — Domestic REITs page ✅ DONE (2026-07-09)
All 9 sections wired to real data + verified in browser. Files:
- **Foundation:** `src/lib/chartSetup.ts` (Chart.js registration, `CHART` palette,
  `baseOptions`/`zoomOptions`/`rescaleY`, `RangeConfig`/`ChartWithRange`);
  `src/lib/reit.ts` (`navSteps`/`navAt`/`lastPrice`, date helpers). *(Originally also
  had a `buildInsights` narrative-insight generator — removed 2026-07-09, see Changelog.)*
- **Charts** in `src/components/domestic/`: `useChartCanvas` (raw Chart.js hook —
  chosen over react-chartjs-2 for v1's custom plugins/zoom/rescale), `RangeBar`
  (6M/1Y/3Y/5Y/All), `Chart1PriceNav`, `Chart2Issuances` (markers + Embassy
  TechVillage + custom label plugin), `Chart3FvBv`, `Chart4Ndcf` (FY↔qtr toggle),
  `Chart5Yield` (qtr↔FY toggle), `Chart6Capital` (pie→bars drilldown).
- **Sections:** `SpvTable` (grouped, row-click → modal), `Structure` (Embassy PNG
  special-case + native diagram), `LinksSection`, `AnnexModal` + `annexRender.ts`
  (faithful port of v1's `renderAnnexItems`/`annexPages`; annexdata + annex-images
  lazy-load on first open). Modal CSS lives under `.annex-content` in `index.css`.
- **Gotcha fixed:** Chart.js canvas `onClick` did NOT fire reliably for the §6
  doughnut drilldown — replaced with a container-level React click (`role=button`,
  keyboard-accessible). If you add click-to-drill elsewhere, do the same, not
  `options.onClick`.
- **Verified in browser:** tab switch, KPIs, all 6 charts draw,
  §4 toggle, §6 drilldown + back, SPV table (17 grouped rows), both modal modes
  (Embassy image mode / others page-image + extracted text with real tables),
  structure PNG, links. tsc + oxlint clean; zero console errors.

### Phase C — Market + InvITs + Global ✅ ALL DONE (2026-07-09)
**Market page (`src/pages/MarketPage.tsx`) is wired + verified.** Shared components
extracted to `src/components/charts/`:
- **`<TimeSeriesChart>`** — raw canvas (`useChartCanvas`) + optional windowing range
  bar (`RangeBar`, both relocated here from `domestic/`) + zoom/pan + y-rescale +
  dbl-click reset + caption. `build` closure returns a `RangeConfig` (linear x, `{x,y}`
  datasets, `_xmin/_xmax`). `rangeBar` off = window driven externally via `deps`.
- **`<SecurityModal>`** — config-driven, unifies `secmodal.js` + page-2 `#smodal`.
  Takes a `SecModalData` (`{title,codes,ccy,series,livePrice,liveTag,mkt[],profile[]}`);
  renders header + big price/chg + range buttons (1M…Max) + gradient line + 2 stat grids.
- **`<Sparkline>`** — DPR-aware gradient sparkline on a 2D canvas.
- Market domain layer: **`src/lib/bench.ts`** (`makeBenchCtx` live-merge + ffill calendar,
  `combinedPts`/`rebase`/`fdPts`/`gsecPts` series, `volumeSeries`, `buildSnapRows`,
  `buildReitSecModal`). Market chart components in `src/components/market/`.
- Snapshot cards + sparklines · Levels/Rebased/Veterans benchmark charts (shared **Time
  window** filter 1Y/3Y/5Y/Max drives all time-series) · Area · Volume (VOL INDEX + 20d MA)
  · Distributions-vs-FD · click a snapshot → `<SecurityModal>`.

**⚠️ Data-accuracy fix baked in (was wrong in v1 too):** the source of truth is
`REIT_Tableau_Ready_1.xlsx` + `Indian REITs - Visualizaed.docx` (7 Tableau exhibit
screenshots). `bench.json` prices/turnover/overview are a **byte-for-byte match** to
that workbook (verified: 0 mismatches; block-deal VOL INDEX = 4,513 ≈ the "4,514"
Tableau label). The bug: v1 (and my first pass) **merged `bench-live` `turnover_updates`**
into the turnover series — but that live turnover is **broken-scale** (NIFTY 50 live ≈609
vs workbook ≈20,549 ₹cr; REIT turnover re-pulled back to 2019), which **collapsed the
NIFTY 50 / NIFTY REALTY moving-average lines to ~0–10**. Fix in `makeBenchCtx`: keep
merging live **prices + SENSEX** (scale-consistent, keeps price charts current), **do NOT
merge live turnover**. Volume rebase + 20d MA now recompute **dynamically against the
selected window** (re-anchor to window start = Tableau table-calc behaviour). Re-enable a
per-security turnover merge only once Phase D emits turnover on the workbook's basis.

**Not ported from the docx (deliberate, per user — "v1 took only some, that's fine"):**
Exhibit 7 (30-day ADTV bar: 6 REITs combined ₹90cr vs NIFTY Realty ₹1,059cr) — a real gap
if a future session wants full docx parity; data is in `Volume Summary`/`Trading Volume`.
The Rebased chart intentionally keeps v1's extra FD/G-Sec/SENSEX lines (live-sourced, user
approved) beyond the 3 Tableau series.

**InvITs page (`src/pages/InvitsPage.tsx`) done + verified.** Domain layer
`src/lib/invit.ts`; components in `src/components/invit/` (`InvitSnapshotCard`,
`InvitCharts` = price / rebased / yield / EV). Reuses `makeBenchCtx` — the 3 InvIT
daily price series live **only** in `bench-live.json` `updates` ("NHIT InvIT" /
"Raajmarg InvIT" / "PGInvIT"; `bench.json` has none), and `makeBenchCtx` already
merges those scale-consistent live prices + forward-fills them. **No live-turnover
pitfall here:** the only turnover use in v1 was the modal's ADTV fallback, and
`ctx.adtvUnits` (from `bench-live` `adtv_units`) already carries all 3 InvITs
directly (NHIT 50k / RIIT 38,374 / PGInvIT 1.7M units) — so the InvIT page never
touches the broken turnover. Combined-REIT FY26 yield bar computed from reit-data
the Market way (replacing v1's hard-coded 5.9% placeholder). Rebased chart has the
basket ↔ own-life toggle. Verified: 3 snapshot cards + sparklines, 4 charts painted,
toggle, modal (EV/NAV/premium/yield/ADTV all correct), 0 console errors.

**Global page (`src/pages/GlobalPage.tsx`) done + verified.** Domain layer
`src/lib/global.ts`; components in `src/components/global/` (`PieDrilldown`,
`CountryPanels`). Two country pies with per-country **slice drilldown** (market cap →
top listed REITs + "Others" remainder; AUM → sectors), country panels with live
Yahoo quotes (`global-live.json`, keyed by ticker), case studies + Temasek deep-dive.
`top5` rows are `[name, ticker, sector, quoteOverride|null, manager]` (element [3] is
a quote-symbol override, always null in current data → falls back to the ticker).
Verified: both pies paint, slice-click drills + back returns, all 35 country rows
with live prices, row-click modal (Prologis $141 live, $131.5bn, 10.1% of US, 1Y
+12.4%), cases + Temasek render, 0 console errors.

**⚠️ Fixed a real bug uncovered here:** `src/lib/chartSetup.ts` registered
`DoughnutController` but **not `PieController`** — Global's `type:'pie'` charts threw
`"pie" is not a registered controller` and the whole route hit the error boundary.
Added `PieController` to the registration list. (Domestic §6 uses doughnut, so this
gap only surfaced on Global.)

**Drilldown click:** per the §6 gotcha, `PieDrilldown` hit-tests slices via
`chart.getElementsAtEventForMode(e.nativeEvent, 'nearest', {intersect:true}, false)`
on a real DOM click, **not** Chart.js `options.onClick`.

- **Reuse pattern (for future pages):** `<TimeSeriesChart>`, `<SecurityModal>`,
  `<Sparkline>`, and `src/lib/bench.ts` / `makeBenchCtx`.

### Phase D — Refresh pipeline
**D1 — refresh → v2 JSON ✅ DONE (2026-07-09).** The three refresh buttons POST to
`serve.py` (proxied in dev), which fetched fresh NSE/BSE + Yahoo data but only wrote
the v1 `window.*` `.js` files — v2 reads `public/data/*.json`, so a refresh never
reached it. Fix: `dashboard/_v2json.py` (`emit(basename, obj)`) is now called from
each `write_*` function so `refresh_prices` → `live-prices.json`, `refresh_market` →
`bench-live.json`, `refresh_global` → `global-live.json` are mirrored into
`dashboard_v2/public/data/`. Guarded (try/except + dir check) so the v1 scripts still
run standalone. The v2 `RefreshButton`s already `location.reload()` after the POST, and
Vite dev serves the rewritten JSON fresh (verified: plain fetch returns new asof) — so
no v2-code change was needed. Verified end-to-end in the browser (Market asof + Embassy
₹446 update after resync). ⚠️ Refreshed `*-live.json` are committed (like v1's `.js`),
so a refresh shows as a git data change — expected.

**D2 — scale-consistent live turnover (NOT DONE — needs a real data source).** Live
turnover is still intentionally NOT merged in `makeBenchCtx` (`src/lib/bench.ts` ~L94).
The blocker is data-sourcing, not wiring: `refresh_market.py` computes each series'
turnover as Yahoo `volume × close / 1e7` or NSE history `VALUE / 1e7`, but for the
**indices** this is a different basis than the workbook (Tableau's NIFTY 50 turnover
≈20,549 ₹cr = total traded value of all constituents; the live pull gives ≈609), and
REIT turnover gets re-pulled back to 2019, shifting the rebase base. Merging it (as v1
did) collapses the NIFTY 50 / REALTY moving-average lines — the bug fixed in Phase C.
To enable it, `refresh_market.py` must emit **index turnover on the workbook basis**
(NSE index total-traded-value, same units, not re-anchored) and REIT turnover appended
without moving the window base, then re-verify against `REIT_Tableau_Ready_1.xlsx` +
the docx exhibit (block-deal VOL INDEX ≈4,514). **Low value / high risk:** it only
extends ONE chart family (volume/VOL-INDEX) past the workbook asof while prices are
already live, and risks corrupting the workbook-verified volume charts. **User decided
(2026-07-09): live data everywhere EXCEPT the trading-volume chart.** That is exactly
the shipped state — D1 makes prices/benchmarks/rebased/InvIT/global all live; only the
volume/VOL-INDEX turnover stays on workbook data by design. **Do NOT re-enable live
turnover** (the user explicitly does not want the volume chart live). Phase D is
**complete** as intended — treat D2 as won't-do, not deferred.

### Phase E — npm-only live refresh (Node-in-Vite) + ONE global button — ✅ DONE (2026-07-09)
**Built & verified end-to-end. v2 now runs npm-only: no Python, no serve.py, no v1.**
Click the one **⟳ Refresh data** button in the top nav → `POST /api/refresh` (served by a
Vite plugin in BOTH dev and preview) re-pulls prices + unitholding (NSE/BSE) and benchmarks
+ global quotes (Yahoo via `yahoo-finance2`) and rewrites `public/data/*.json`, then reloads.

**Shipped files** (all new under `dashboard_v2/server/`):
- `lib/io.ts` — `resolveDataDir` (dev→`<publicDir>/data`, preview→`dist/data`),
  `writeJsonAtomic` (tmp+rename), `readJson`.
- `lib/nse.ts` — `createNseSession(warmups[])`: cookie-primed `fetch` (`getSetCookie` jar,
  replays Cookie + Referer). `NSE_UA` export.
- `lib/yahoo.ts` — wraps `yahoo-finance2` **v3**: `chartSeries(sym,period1)`→`{px,to}`,
  `quoteOne`→`{price,ccy,mcap}`, `avgVolume` (30d), `yearsAgo`/`daysAgo`.
- `lib/types.ts` — `FetchResult`, `nowStamp()`.
- `fetchers/{prices,holdings,global,market}.ts` — faithful ports of the four `refresh_*.py`;
  each returns `{source,ok,asof,count,error?}` and writes JSON **only if it got data**.
- `index.ts` — `runAll(dataDir)`: two-lane `Promise.allSettled` (NSE lane prices→holdings on
  one shared primed session; Yahoo lane market→global). Per-source try/catch.
- `refreshPlugin.ts` — registers `POST /api/refresh` on `configureServer`+`configurePreviewServer`;
  lazy `await import('./index.ts')` in the handler; responds `{ok,results}`.

**Edits:** `vite.config.ts` (dropped the `proxy` block; added `refreshPlugin()` +
`server.watch.ignored:['**/public/data/**']`); `tsconfig.node.json` include `["vite.config.ts","server"]`;
`package.json` (+`yahoo-finance2`, `engines.node>=20`); `AppShell.tsx` (one `GlobalRefreshButton`);
removed the four per-page buttons; refreshed all stale "serve.py" copy to name the top-nav ⟳ button.

**Two things that differed from / improved on the plan:**
1. **`yahoo-finance2` v3 API.** The default export is now the **class** `YahooFinance`, not a
   singleton — you must `new YahooFinance({ suppressNotices:['yahooSurvey','ripHistorical'],
   validation:{logErrors:false}, versionCheck:false })`. `suppressNotices` is a constructor
   option (no top-level `suppressNotices()`); pass `{validateResult:false}` as the 3rd arg to
   `chart()`/`quote()` to survive schema drift. `chart()` returns `{quotes:[{date:Date,close,volume}]}`
   (typed `unknown` when `validateResult:false` → cast). See `lib/yahoo.ts`.
2. **"Never reduce coverage" merge (NEW — real bug caught in verification).** A wholesale rewrite
   of `bench-live.json` clobbered thin names: **NHIT InvIT** is ~1 day on Yahoo on a given run, and
   a straight overwrite dropped it from **302 → 1** close (killed the InvIT NHIT chart). Fix:
   `market.ts` (and `global.ts` hist) now **union each series with the cached file** (fresh wins on
   shared dates) before writing, so live history only ever grows. Verified: after refresh NHIT = 303
   (302 cached + 1 new), not 1. If you add another live series, apply the same union.

**ADTV is NSE+BSE summed (unchanged intent, verified):** `market.ts` `ADTV_SYMBOLS` sums both legs
(`.NS`+`.BO`) per name — e.g. Embassy 602,141 units = NSE 498,932 + BSE 103,209; split kept in
`adtv_detail`. `market.ts` still WRITES `turnover_updates` for shape parity; **`src/lib/bench.ts`
is unchanged and still ignores it** (Phase D2 stays won't-do).

**Verified (2026-07-09):** `tsc -b` + oxlint + `npm run build` clean. `npm run dev` (NO serve.py)
→ ⟳ Refresh → `/api/refresh` **200 in ~59s, all 4 sources ✓** (prices 6 · holdings 6 · market 12 ·
global 35); all four routes render with fresh asof and **0 console errors**; one button in the nav,
none in the pages. `npm run build && vite preview` → same button works, writes `dist/data`. No
`serve.py`/`8742`/`/refresh-*` refs remain in `dashboard_v2` source. NSE was **not** blocked from
this machine (prices+holdings came back live).

**Known limitation (unchanged, not a regression):** `/api/refresh` needs the Node process, so it
exists under `vite dev`/`vite preview` but not a pure static deploy — refresh is a local authoring
action; committed JSON seeds are what ship.

<details><summary>Original plan (kept for reference)</summary>

**This is the next session's job. Approved plan, ready to build. Nothing implemented yet.**

**Goal (from user):** make v2 stand on its own — **npm only, no Python, no v1**. Today
refresh needs `dashboard/serve.py` (:8742) running alongside `npm run dev` (vite proxies
`/refresh*` to it). Replace that with a **Vite plugin** exposing one `POST /api/refresh`,
backed by **Node/TS ports** of the four Python fetchers, writing the same
`public/data/*.json`. And collapse the **four** per-page refresh buttons into **ONE**
global button in the top nav that refreshes everything.

**The two "blockers" are solved, not traded off:**
- **Yahoo reliability** (Python used `yfinance`/`curl_cffi`) → **`yahoo-finance2`** (npm) —
  the maintained Node equivalent; handles Yahoo cookie+crumb+retry. `chart()` = OHLCV
  history, `quote()` = price/currency/marketCap. Confirmed via docs it covers everything
  the yfinance path produced.
- **"Needs a server"** → the Vite plugin hooks **both** `configureServer` (dev) AND
  `configurePreviewServer` (preview), so refresh works in `npm run dev` AND
  `npm run build && npm run preview`. (Only a *pure static* deploy lacks it — same as
  serve.py is dev-only today; not a regression.)

**Full approved plan:** `~/.claude/plans/what-can-you-do-cheerful-eclipse.md` (embedded
below in case that file is gone). Two Explore agents + one Plan agent validated it.

**Build order & files (all new under `dashboard_v2/server/`):**
1. **Config:** `npm i yahoo-finance2`; `package.json` add `"engines":{"node":">=20"}`;
   `tsconfig.node.json` `include: ["vite.config.ts","server"]` (do NOT make a new
   composite reference — these configs are `noEmit`, composite would conflict; just widen
   include). Server modules import each other with **explicit `.ts` extensions**
   (`module:"nodenext"`). `vite.config.ts`: delete the `proxy` block, add `refreshPlugin()`
   to plugins, add `server.watch.ignored:['**/public/data/**']`.
2. **`server/lib/io.ts`** — `resolveDataDir(config,isPreview)` (dev→`<publicDir>/data`,
   preview→`<build.outDir>/data`), `writeJsonAtomic(dir,name,obj)` (write `*.json.tmp`
   then `fs.rename` — avoids half-read + Vite reload race), `readJson`.
3. **`server/lib/nse.ts`** — `createNseSession()`: GET `nseindia.com`, capture
   `res.headers.getSetCookie()` into a jar, replay `Cookie`+`Referer`. **This is the
   proven flow** — see the WORKING `dashboard/refresh_holdings.py` for the exact
   warm-ups/referers each NSE endpoint needs.
4. **`server/lib/yahoo.ts`** — wrap `yahoo-finance2`:
   `yahooFinance.suppressNotices(['yahooSurvey','ripHistorical'])`, pass
   `{validateResult:false}` (survive Yahoo schema drift). `chartSeries(sym,period1)`→
   `{px:{date:close}, to:{date:volume*close/1e7}}`; `quoteOne(sym)`→`{price,ccy,mcap}`;
   `avgVolume(sym)` (30d). Range→period1 (no `'max'` in chart): SENSEX now−6y, index
   now−1y, reit/invit `2018-01-01`.
5. **`server/fetchers/{prices,holdings,global,market}.ts`** — faithful ports of the four
   `dashboard/refresh_*.py`. Each returns `{source,ok,asof,count,error?}` and writes its
   JSON **only if it got data** (mirror the Python `has_data` guards → a failing source
   keeps its cached file). Exact source cascades, symbol maps, and output shapes are in
   the Python files AND in the plan. **`market.ts`: still WRITE `turnover_updates` for
   shape parity even though `bench.ts` ignores it — do NOT change `bench.ts`.** `global.ts`
   reads tickers from `global.json` (`rowSym`=`top5[k][i][3]` if string else `[1]`, per
   `src/lib/global.ts`), not from v1's `global_data.js`.
6. **`server/index.ts`** — `runAll(dataDir)`: `Promise.allSettled` two lanes — NSE lane
   (one shared session, sequential prices→holdings) + Yahoo lane (sequential
   market→global). Per-source try/catch; return the summary array.
7. **`server/refreshPlugin.ts`** — tiny: registers middleware for `POST /api/refresh` on
   both `configureServer`+`configurePreviewServer`; **lazy `await import('./index.ts')`**
   inside the handler (keeps yahoo-finance2 out of the esbuild-bundled config). Respond
   200 `{ok,results}`.
8. **`src/components/layout/AppShell.tsx`** — add ONE `GlobalRefreshButton` after the
   `flex-1 <nav>` (auto right-aligns): `useState` busy/failed, `POST /api/refresh`, on ok
   `location.reload()`. Reuse the `bg-accent` button style from the old `RefreshButton`s.
9. **Remove the 4 old buttons** + their `PageHeader actions` wiring + unused `useState`
   imports: `RefreshButton` in `MarketPage.tsx`/`InvitsPage.tsx`/`GlobalPage.tsx`,
   `RefreshHoldingsButton` in `DomesticReitsPage.tsx` (keep Domestic's `LIVE?._asof`
   "Live prices:" span). Update stale "run serve.py" copy (UnitholdingPanel, InvitsPage
   EmptyChart, MarketPage note, SecurityModal) to name the one top-nav ⟳ button.

**Environment facts (verified this session):** Node **v23.2.0** (fetch + `getSetCookie`
present, yahoo-finance2 needs v20+ ✓). `dashboard_v2` is `"type":"module"`, Vite 8,
TS ~6.0. `@types/node ^24` already a devDep. `public/data/*.json` already ships to
`dist/data/` (Vite copies public/). Data loader cache (`src/lib/data.ts`) is module-level
→ `location.reload()` clears it (that's why the buttons reload).

**Verify (dev, no serve.py running):** `npm i` → `npx tsc -b` + `npm run lint` clean →
`npm run dev`, click ⟳ Refresh → `/api/refresh` 200 with per-source results, the 4
live JSONs get new asof, page reloads, all 4 routes show fresh data (browser MCP, 0
console errors). Then `npm run build && npm run preview` → button works there too.
Confirm no `serve.py`/`:8742`/`/refresh*` refs remain in `dashboard_v2`.

**Out of scope / do NOT touch:** `dashboard/` (v1 Python stays runnable standalone);
`src/lib/bench.ts` turnover logic (still ignores `turnover_updates`); static datasets
(still `npm run data` from the workbook — the button only refreshes the 4 live sources).

</details>

### Shared building blocks to extract early
`<TimeSeriesChart>`, `<SecurityModal>`, `<DataTable>` (sortable), `<Sparkline>`,
`<PieDrilldown>`, a `useReitData()` loader hook, and a central Chart.js theme
(defaults: colors, grid, fonts, tooltip styling matching §7).

---

## 7. Design system (refined dark)

Tokens live in `src/index.css` under `@theme` (Tailwind v4). Use as utilities:
`bg-surface`, `text-muted`, `border-border`, `text-accent`, `text-pos`, etc.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a0e14` | page background (+ faint teal radial glow) |
| `--color-surface` | `#111721` | cards |
| `--color-surface-2` / `-3` | `#161d29` / `#1c2532` | nested / hover surfaces |
| `--color-border` / `-soft` | `#232d3b` / `#1a2230` | borders |
| `--color-ink` | `#e8eef4` | primary text |
| `--color-muted` / `--color-subtle` | `#93a1b3` / `#61707f` | secondary / tertiary text |
| `--color-accent` / `-strong` | `#2dd4bf` / `#14b8a6` | primary teal |
| `--color-pos` / `--color-neg` | `#34d399` / `#f87171` | premium/gain · discount/loss |
| `--color-warn` / `--color-info` / `--color-violet` / `--color-gold` | `#fbbf24` / `#60a5fa` / `#a78bfa` / `#d9c48a` | supporting series |

Conventions: `--radius-card: 14px`; `--shadow-card` for elevation; `.tnum` utility for
tabular-numeric financial figures; font stack is Inter → system-ui. **Inter is now
self-hosted (2026-07-09):** `public/fonts/InterVariable.woff2` (full glyph set, variable
100–900) + an `@font-face` at the top of `src/index.css` + a `<link rel=preload>` in
`index.html`. **Use the FULL InterVariable, not fontsource's `latin` subset** — the
latin subset is missing both ₹ (U+20B9) and → (U+2192), which the dashboard uses
everywhere; the full file (352 KB) includes them (glyph coverage verified with
fontTools). Keep charts on the same palette (thin lines, soft grid `--color-border` at
low alpha, rounded bars).

---

## 8. v1 data shapes (reference for wiring)

From `../dashboard/*.js`. Parallel arrays are indexed by fiscal year.

- **`REIT_DATA`** (`data.js`): `meta[key]{name,nse,bse,listed,sponsor}`;
  `fin[key]{years[],revenue[],ndcf[],dist_total[],dpu[],gav[],gross_debt[],cash[],
  networth[],nav[],units_mn[],price_eoy[],rev_rental[],rev_maint[],
  q:[{per,q,ndcf,dpu,rev,nav,assets_fv,rev_rent,rev_maint,rev_ops,pat}]}`;
  `bv[key]{"FY2019":{inv_prop,ipud,ppe,cwip,goodwill,total_assets}}`;
  `issuances[key][{date,type,units_mn,price,proceeds_cr,note}]`;
  `prices[key][[date,close]]`; `blocks[key][{date,seller,units_mn,price,note}]`;
  `spv[key][{spv,asset,type,city,leasable_msf,completed_msf,occ,mkt_rent,inplace_rent,
  wale,cap_rate,disc_rate,value_cr,val_psf,notes}]`. Keys: `embassy, mindspace,
  brookfield, nexus, krt, bagmane`.
- **`LIVE_PRICES`** (`prices.js`): `{key:{price,asof,src}, _asof}`.
- **`REIT_STRUCTURES`** (`structures.js`): per REIT `{sponsors[],public_stake,trustee,
  manager,notes,spvs:[{name,stake,via?,assets[]}]}`.
- **`ANNEXURES`** (`annexures.js`): `{key:{assetName:[pageNumbers]}}` → image files
  `img/annex/<key>/p<n>.jpg`.
- **`ANNEXDATA`** (`annexdata.js`, 1.1 MB): `{key:{assetName:[{t:"pg"|"h"|"p"|"tbl",...}]}}`
  parsed text/tables for the modal.
- **`ANNEX_IMAGES`** (`annex_images.js`): Embassy-only cropped table images.
- **`REIT_LINKS`** (`links.js`): `{key:[{label,url,latest,type}]}`.
- **`REIT_VAL_HY`** (`val_hy.js`): `{key:[{d,gav,tv?}]}` half-yearly GAV.
- **`BENCH`** (`bench.js`, 178 KB): `{asof,prices:{series:{date:close}},turnover_cr,
  overview[],metrics[],fd_steps[],veterans[]}`.
- **`BENCH_LIVE`** (`bench_live.js`, 328 KB): `{asof,sensex,updates,turnover_updates,
  adtv_units,adtv_detail}` (also carries InvIT price series).
- **`INVIT`** (`invit_data.js`): `{asof,trusts:[{key,name,nse,sponsor,sector,listed,
  assets,ev_cr,nav,last_dpu,dpu_fy26,px_ref,note,color}]}`.
- **`GLOBAL`** (`global_data.js`): `{asof,countries[],top5,mcap_breakdown,
  sector_breakdown,cases[],temasek}`.
- **`GLOBAL_LIVE`** (`global_live.js`, 763 KB): `{asof,quotes:{ticker:{price,ccy,mcap}},
  hist:{ticker:{date:close}}}`.

**Full v1 functional map** (every page, section, interaction) is in the project memory
and the session that scaffolded v2. If more detail is needed, read the v1 source in
`../dashboard/` — `dashboard.html` (~950 lines, all page-1 logic inline) is the key file.

---

## 9. Gotchas

- Static data sources (`data-src/*.js`) assign `window.*` — `convert-data.mjs` sandbox-
  evaluates them (`node:vm`), not `JSON.parse`. `npm run data` regenerates only the 11 STATIC
  datasets; the 4 live ones (live-prices, bench-live, global-live, holdings) are owned by the
  refresh server and must NOT be added back to `SOURCES`.
- Embassy is a special case in several places (structure = static PNG `public/img/structure_embassy.png`;
  annexure = image mode; chart 2 has extra TechVillage fair-value lines).
- Large JSON must be code-split / fetched, not bundled, to keep the initial load fast.
- Refresh (`⟳ Refresh data` → `POST /api/refresh`) needs the Node process, so it works under
  `npm run dev`/`npm run preview` but not a pure-static deploy — committed JSON seeds ship there.
- `public/img` is a **real committed folder** now (was a symlink to v1 before the standalone
  move). `check-assets.mjs` guards it at build time.
- Node modules and build output are gitignored inside `dashboard_v2/`.

---

## 10. Changelog

- **2026-07-09** — **v2 is now fully standalone; v1 `dashboard/` removed from the `v2` branch.**
  Severed the two remaining couplings to v1: (1) `public/img` was a committed symlink →
  `../../dashboard/img`; it is now a **real committed image folder** (918 files, ~207 MB) moved
  in via `git mv` (pure rename — `.git` unchanged at ~179 MB, no blob bloat). (2) The static-data
  converter no longer reads `../../dashboard/*.js`; the **11 static** `.js` sources are vendored
  under `dashboard_v2/data-src/` and `convert-data.mjs` repoints there (`SRC_DIR`), with the **4
  live datasets** (live-prices, bench-live, global-live, holdings) intentionally dropped from
  `SOURCES` — they are owned by the refresh server, so `npm run data` can't clobber live data.
  Then `git rm -r dashboard` (v1 stays frozen on `main`). Updated: `check-assets.mjs` (folder,
  not symlink, wording), `.claude/launch.json` (dropped `v1-dashboard`), root `README.md`
  (v2-only), root `.gitignore` (dead `dashboard/` rules → `dashboard_v2/public/img/**/_*`), and
  this file's README/structure/pipeline sections. Note: older changelog entries below still
  describe the symlink and `npm run data`-reads-`../dashboard` era — kept as historical record.
  ⚠ Note the *earlier* Phase A entry's claim "`public/img` is a **symlink**" is now superseded.
- **2026-07-09** — **Chart date labels now show the day (finance fix).** Daily time-series were
  labelling only month+year ("Jul 26"), ambiguous across ~22 trading days. `fmtM` (axis ticks)
  now includes the day ("08 Jul 26") and a new `fmtDay` ("08 Jul 2026") drives the **tooltips**,
  across all daily charts (Chart1 price/NAV, Chart2 issuances, market Benchmarks/Volume, InvIT
  charts). FY/quarterly bar charts (distributions, NDCF, yield) keep their `FYxxxx` labels — not
  daily. SecurityModal chart already showed full ISO dates (untouched). Verified in browser.
  **Design rule:** daily finance charts must identify the exact trading day, not just the month.
- **2026-07-09** — **Phase E DONE + committed (`18a6348`) — npm-only live refresh (Node-in-Vite)
  + ONE global button.** *(Same commit also carries the date-label fix above.)*
  Ported all four `dashboard/refresh_*.py` fetchers to Node/TS under `dashboard_v2/server/`,
  wired as a Vite plugin exposing `POST /api/refresh` on dev **and** preview; Yahoo via
  `yahoo-finance2`, NSE via cookie-primed `fetch`. Replaced the four per-page refresh buttons
  with one **⟳ Refresh data** button in the top nav; removed all `serve.py` proxy/copy. v2 now
  runs npm-only (no Python/serve.py/v1). Two notable points: (1) `yahoo-finance2` **v3**'s default
  export is a class you must `new` with `suppressNotices`/`validation`/`versionCheck` options
  (not a singleton); (2) added a **"never reduce coverage" union merge** in `market.ts`/`global.ts`
  after catching a real regression — a wholesale bench-live rewrite dropped thin-name **NHIT InvIT
  302→1** close; the merge unions each series with the cached file (fresh wins on shared dates), so
  live history only grows (verified NHIT 303 post-refresh). ADTV stays the NSE+BSE unit sum
  (Embassy 602,141 = NSE 498,932 + BSE 103,209). Full detail in §6 Phase E. tsc + oxlint + build
  clean; `/api/refresh` 200 with all 4 sources ✓ in dev and preview; all 4 routes fresh, 0 console
  errors. ⚠️ Refreshed `*-live.json` + `holdings.json` show as git data changes (expected, like v1).
- **2026-07-09** — **Unitholding fetch confirmed LIVE + Phase E planned (npm-only refresh).**
  (1) **The unitholding fetcher now pulls real live data** — the correct NSE endpoint was
  discovered (the equities `corporate-share-holdings-master` is empty for REITs): use
  **`api/corporate-unit-holdings-master?index=reits&symbol=<SYM>&issuer=<full REIT name>`**
  (fields `asOnDate` / `sponsorGroupPer` / `publicHoldingPer`; response is
  `{data:[...],msg}`). `dashboard/refresh_holdings.py` is updated to this and is the
  **working reference** for the Node port (user ran it: all 6 REITs populated with full
  quarter trends, e.g. Brookfield's sponsor drawdown 26→19%, KRT 78.56). The `(symbol,
  issuer)` map and flexible field-parsing live in that file.
  (2) **Phase E planned & approved** (see §6 Phase E): port all four refresh fetchers to
  **Node/TypeScript inside a Vite plugin** (`server/` folder, `yahoo-finance2` for Yahoo),
  exposing one `POST /api/refresh`, and replace the four per-page buttons with ONE global
  top-nav button — so v2 runs npm-only with no Python/serve.py/v1. **Not started** —
  next session builds it. Plan file: `~/.claude/plans/what-can-you-do-cheerful-eclipse.md`.
  ⚠️ **Working tree at handover:** the unitholding feature (item below) is
  **uncommitted** on `v2`; commit it first for a clean base before starting Phase E.
- **2026-07-09** — **Unit-holding (shareholding) pattern per REIT — NEW.** Added a
  compact "Unitholding pattern" panel at the top of the Domestic page (directly under
  the REIT KPI header), per selected REIT: Sponsor & Sponsor Group vs Public as a
  stacked bar + figures, plus a quarter-over-quarter sponsor-share trend (small-multiple
  columns) when ≥2 quarters exist. Graceful empty state per REIT; a "seed" badge until
  the first live refresh.
  - **Fetch (runs on your machine — NSE blocks this sandbox):** `dashboard/refresh_holdings.py`
    hits `GET /api/corporate-share-holdings-master?index=equities&symbol=<SYM>` (verified
    schema: list of quarterly records, `pr_and_prgrp`/`public_val` as *strings*, `date`
    = `DD-MMM-YYYY`), normalises to `{key:{symbol,quarters:[{date,label,sponsor,public,emp}]}}`
    (newest-first, deduped, capped 8 qtrs), writes `holdings.js` + emits
    `dashboard_v2/public/data/holdings.json` via `_v2json`. Same session/cookie pattern as
    `refresh_prices.py`. Parsing unit-tested against a mock NSE record.
  - **Refresh button:** "⟳ Refresh unitholding (NSE)" on the Domestic PageHeader → POST
    `/refresh-holdings` (wired in `serve.py` + proxied in `vite.config.ts`); fails gracefully
    to "run serve.py" like the other pages' buttons.
  - **v2 wiring:** `holdings.js` added to `scripts/convert-data.mjs` (15/15 convert);
    `Holdings`/`ReitHolding`/`HoldingQuarter` types in `src/types/data.ts`; `holdings`
    added to the loader's `DatasetName`/`DatasetTypes`; component
    `src/components/domestic/UnitholdingPanel.tsx`; integrated in `pages/DomesticReitsPage.tsx`.
  - **Seed data:** `holdings.js` ships last-known **real, sourced, dated** filings (Embassy
    7.69/92.31 Mar26 · Mindspace 66.60→67.29 Mar/May26 · Brookfield 26.59/73.41 Jun25 ·
    Nexus 21/79 Dec24 · Bagmane 82.81/17.19 May26; KRT intentionally empty — no clean
    sponsor-total sourced). Running the refresh replaces all of it with live NSE + full
    trends. tsc + oxlint clean; all 3 panel states browser-verified (bar+figures, trend,
    empty), 0 console errors; `holdings.json` ships in `dist/`.
- **2026-07-09** — **Production-readiness pass (3 items, all done).**
  (1) **Production build verified.** `npm run build` → a fully working `dist/`: Vite 8
  follows the `public/img` symlink and copies all 926 image files (byte-identical,
  md5-checked); `vite preview` serves app, SPA deep routes (`/market`, `/global` → 200
  fallback), `data/*.json`, and annexure/structure images all at HTTP 200. Added
  `scripts/check-assets.mjs` (a prebuild guard in `npm run build`) so a dangling
  `public/img` fails the build loudly instead of silently shipping broken images. No
  copy/CDN change needed for the single-repo deploy model.
  (2) **Inter self-hosted.** `public/fonts/InterVariable.woff2` (full variable font) +
  `@font-face` in `src/index.css` + preload in `index.html`. Chose the FULL font over
  fontsource's `latin` subset because the subset lacks ₹ (U+20B9) and → (U+2192) — both
  used throughout the app (verified glyph coverage with fontTools). Browser-confirmed:
  `document.fonts.check('16px Inter')` true, body computes to Inter, ₹ renders from
  Inter itself.
  (3) **Fresh E2E browser verification** of all 4 routes on a clean dev server: Domestic
  (6 charts painted), Market (snapshot cards + sparklines), InvITs (3 cards + sparklines),
  Global (both pies paint — PieController fix holds); security modal opens with live
  price + range buttons + painted area chart + metrics grid. **0 console errors on every
  route.** tsc + oxlint clean. **The v2 rebuild is now feature-complete and
  production-ready.**
- **2026-07-09** — **Phase D1 (refresh → v2 JSON) done.** Added `dashboard/_v2json.py`
  and wired it into `refresh_prices` / `refresh_market` / `refresh_global` `write_*`
  functions so every live refresh mirrors its output into
  `dashboard_v2/public/data/{live-prices,bench-live,global-live}.json` (guarded; v1
  scripts still run standalone). Fixes the dead refresh buttons — they wrote only the
  v1 `.js` files, so v2 (which reads JSON) never saw fresh data. No v2-code change
  needed: the `RefreshButton`s already reload, and Vite dev serves the rewritten JSON
  fresh. Verified in the browser. **Remaining Phase D: D2** — re-enable scale-consistent
  live turnover, which needs a real workbook-basis index-turnover source in
  `refresh_market.py` (low value / high risk — see Phase D section; recommend leaving
  disabled).
- **2026-07-09** — **Reverted narrative chart titles + insight boxes (user request).**
  A prior experiment had (a) replaced every chart card title with a narrative
  "takeaway" headline (e.g. "Price orbits NAV — the premium/discount is the signal")
  and (b) added per-chart data-driven **insight callout boxes** on the Domestic page
  (`buildInsights` in `src/lib/reit.ts` + an `Insight` component). The user rejected
  both. Restored the **plain descriptive titles** (v1 style: "1 · Price vs NAV &
  Distributions", etc.) across all 4 pages; removed the `Insight` component, the
  `insights` `useMemo`, and every `<Insight>` usage from `DomesticReitsPage.tsx`; and
  deleted `buildInsights` + its helpers (`lastNN`/`firstNN`/`ap`/`cagr`), the
  `Insights` interface, and the now-unused `inr` import from `reit.ts`. Also reverted
  the matching uncommitted v1 edits (`git checkout HEAD -- dashboard/{dashboard,global,
  invits,market}.html`); v1's `prices.js`/`bench_live.js` still carry a live-price
  refresh (data only, left as-is). **Design rule going forward: chart/card titles are
  plain and describe what the chart shows — no editorializing headlines, no insight
  boxes.** tsc + oxlint clean; verified in browser (all 4 pages show plain titles, no
  insight boxes, 0 console errors).
- **2026-07-09** — Created `v2` branch. Scaffolded Vite+React+TS+Tailwind. Built refined
  dark design system, AppShell nav, UI primitives, formatters, and routed skeletons for
  all 4 pages. Verified in browser (:5273), typecheck clean. Commit `abfb4af`.
- **2026-07-09** — **Phase A (data layer) done.** Added `scripts/convert-data.mjs`
  (`npm run data`) → all 14 v1 globals as `public/data/*.json`; TS types in
  `src/types/data.ts`; cached loader `src/lib/data.ts` + hook `src/lib/useDataset.ts`;
  `public/img` symlink to v1 images. tsc + oxlint clean; JSON & images verified served
  in dev.
- **2026-07-09** — **Phase B (Domestic REITs page) done.** Full page wired to real
  data: Chart.js foundation (`chartSetup`), domain helpers (`reit.ts`),
  all 6 charts, SPV table, structure diagram, links, and the 3-mode annexure modal
  (`AnnexModal` + `annexRender.ts`). Verified end-to-end in the browser. tsc + oxlint
  clean. **Next:** Phase C — Market page. Extract the reusable `<TimeSeriesChart>` and
  `<SecurityModal>` here (the domestic charts already establish the patterns to lift).
  Note: `.claude/launch.json` gained a `v2-dashboard-alt` config (port 5280) for
  running a second dev server when 5273 is busy.
- **2026-07-09** — **Phase C — InvITs + Global pages done (Phase C complete).**
  InvITs: `src/lib/invit.ts` + `src/components/invit/*` (snapshot cards, unit-price,
  rebased basket↔own-life toggle, yield, EV) — reuses `makeBenchCtx`; InvIT prices
  come only from `bench-live` `updates`, ADTV from `adtv_units`, so no live-turnover
  pitfall. Global: `src/lib/global.ts` + `src/components/global/*` (two pies with
  slice drilldown, country panels with live quotes, cases, Temasek). **Fixed a real
  bug:** `chartSetup.ts` didn't register `PieController` → Global's pies crashed the
  route; added it. Pie slice clicks hit-test via `getElementsAtEventForMode`, not
  `options.onClick`. tsc + oxlint clean; both pages verified end-to-end in the browser
  (charts paint, drilldown + back, all modals with correct values, 0 live console
  errors). **Next: Phase D** — refresh pipeline (adapt `refresh_*.py` to emit JSON;
  re-enable a scale-consistent live-turnover merge in `makeBenchCtx`).
- **2026-07-09** — **Phase C — Market page done.** Extracted shared `charts/`
  (`TimeSeriesChart`, `SecurityModal`, `Sparkline`; relocated `useChartCanvas` +
  `RangeBar` here and updated domestic imports). Built `src/lib/bench.ts` + all Market
  chart components; rewrote `MarketPage.tsx` (snapshot cards, benchmark trio, area,
  volume, distributions, security modal). **Found & fixed a real data bug (present in
  v1):** merging `bench-live` broken-scale `turnover_updates` collapsed the NIFTY 50 /
  REALTY moving-average lines — now uses clean workbook turnover, verified against
  `REIT_Tableau_Ready_1.xlsx` (prices/turnover a 0-mismatch match) and the docx exhibit
  screenshots (block-deal VOL INDEX 4,513 ≈ Tableau's 4,514; MA lines now match). Volume
  rebase + 20d MA recompute dynamically on the shared **Time window** filter. tsc + oxlint
  clean; verified in browser (fresh load, 7 charts + 6 sparklines, 0 console errors).
  Added `v2-dashboard-alt2` launch config (port 5286). **Next:** Phase C — InvITs + Global
  (reuse `TimeSeriesChart`/`SecurityModal`/`Sparkline`); then Phase D refresh pipeline
  (and re-enabling a scale-consistent live-turnover merge).
- **2026-07-09** — **SVG export feature.** "↓ SVG" button on every chart card + snapshot
  panel (all 4 pages) via a new `Card` `exportable` ('chart' | 'panel') + `exportName`
  prop → downloads a portable, white-background, light-themed `.svg` for Word/slides.
  `src/lib/svgExport.ts`: **charts** light-themed by overriding `Chart.defaults` (NOT a
  chart's `options` — proxied, mutating recurses → `RangeError`), canvas composited on
  white, wrapped in `<svg><image>`; **panels** cloned, re-themed via `.svg-export-light`
  (overrides Tailwind `--color-*` tokens, index.css), rasterised through a
  `<foreignObject>` carrying the page's own stylesheet (embedding real CSS preserves
  layout; a per-node style inliner mangled it and `html-to-image` hung on font
  embedding). Both emit raster-in-SVG (a `<foreignObject>` SVG won't render in Word).
  ⚠️ Headless preview exports charts blank (Chart.js doesn't repaint after resize there);
  verify chart exports in a real browser — the user confirmed both look correct.
