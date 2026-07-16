# Indian REITs Dashboard v2 — Session Handover

> Living document for anyone (human or agent) picking up the v2 rebuild.
> Last updated: 2026-07-13 — **SVG exports fully print-ready** (Word-legible): black ink
> everywhere, full-frame border, note footer, light Tailwind series palette (see Changelog top).
> Before that (2026-07-11): Domestic per-REIT **P/B ratio** charts (7 · time series
> vs 1.0× parity, 8 · cross-REIT bars); SPVs/Structure/Links renumbered 9/10/11.
> Prior session (2026-07-10): **LANDING REDESIGN on branch `v2-redesign`, read §14**:
> Global is now the landing page at `/` with a full-viewport, scroll-pinned, boundless 3D globe
> hero (scroll-scrubbed recede, geometric zoom caps, wheel-scroll etiquette) and the whole app
> moved to a **pure-black theme**. Stable pre-redesign v2 is tagged **`v2.0-stable`** (= `dba89fe`
> on `v2`); the `v2` branch itself is untouched. Redesign commits: `071bb27`, `e79cceb`.
> Prior session: Global AUM pie 3rd drilldown; SVG exports title+asof header / no gridlines /
> high-res 4×; complete-pairs rule; unitholding FULL NSE history. Before that: Global 3D globe
> (§13); Portfolio Map (§11); v2 fully STANDALONE (`8b0d9c5`); Phase E npm-only refresh (`18a6348`).
> Update the **Status** and **Changelog** sections as you go.

---

## 1. TL;DR

We rebuilt the Indian REITs dashboard as **v2**: same functionality as v1, new
implementation. v1 is a static multi-page vanilla-JS + Chart.js app; v2 is a modern
React SPA. **v2 is now feature-complete, production-ready, AND self-contained:** every
page is wired to real data (Phases A–C), the refresh pipeline is done, and as
of Phase E it runs **npm-only** — one ⟳ Refresh data button in the top nav pulls live
NSE/BSE/Yahoo data through a Vite plugin (`POST /api/refresh`); no Python, no serve.py,
no v1 needed. **A 5th page was since added — the interactive Portfolio Map** (`/map`,
ECharts) — see §11. **Nothing is outstanding.** Phase D2 is a deliberate won't-do (volume
chart stays on workbook data by design). Read §10 Changelog top-to-bottom for the full
build history; §6 Phase E for the refresh server; §11 for the map.

- **Repo:** https://github.com/IshanMandlaus/indian-reits-dashboard (private)
- **Branches:** `main` = frozen v1 · `v2` = stable v2 (tag **`v2.0-stable`**, do not touch) ·
  **`v2-redesign`** = active branch: landing redesign (§14). `dashboard/` (v1) exists only on `main`.
- **v2 app:** `dashboard_v2/` (the whole product; `npm install && npm run dev` off a clean clone)

---

## 2. Product intent (from the user)

- Keep the **functionality** of every v1 component; the *methodology to build it may
  change*.
- Build on **React + Tailwind**. v1 "looks too rudimentary."
- Want **better layouts and cleaner colors**.
- Theme decision: **dark only** (no light mode for now) — originally "refined dark",
  evolved to **pure black** in the 2026-07-10 redesign (§14).
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
:5273) plus alt-port variants, including **`v2-dashboard-node23`** (:5286) which runs Vite via
`/opt/homebrew/bin/node` — use it (and that node for tsc/build) when the shell's default Node
is <20 (Vite 8 needs ≥20; Node 18 fails with a `styleText` import error — see §15 tooling notes).

---

## 5. Current state (what exists)

> ⚠️ This section described the *initial scaffold*. It is now historical — **every page
> is fully wired to real data and there are no placeholders left.** See §6 (all phases
> ✅) and §10 Changelog for the real, current structure. Key runtime layout today:

```
dashboard_v2/
  server/                       # Phase E — npm-only refresh (Node/TS, Vite plugin)
    refreshPlugin.ts            #   POST /api/refresh on dev + preview
    index.ts                    #   runAll() — three-lane fetch orchestration
    lib/{io,nse,yahoo,types}.ts #   fs + NSE session + yahoo-finance2 wrapper
    fetchers/{prices,holdings,market,global,indexYields}.ts  # 4 refresh_*.py ports + index div yields
  src/
    components/layout/AppShell.tsx   # top nav (5 items) + ONE global ⟳ Refresh data button
    components/{domestic,market,invit,global,charts,map}/  # all real, wired charts (+ map, §11)
    lib/{data,useDataset,bench,invit,global,reit,chartSetup,format,svgExport,geo,echartsSetup}.ts
    pages/{Domestic,Market,Invits,Global,Map}Page.tsx   # all fully wired to real data
    types/data.ts
  public/data/*.json            # 16 datasets; the 5 live ones (*-live, holdings, index-yields) refresh live
  public/geo/india-districts.json  # India map for the Portfolio Map page (§11; fetched, not bundled)
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
top listed REITs + "Others" remainder; AUM → sectors **→ sector's listed REITs by est. AUM share** —
3rd level added 2026-07-10, see Changelog), country panels with live
Yahoo quotes (`global-live.json`, keyed by ticker). *(The case studies + Temasek deep-dive
that shipped here were replaced 2026-07-10 by the interactive 3D REIT globe — see §13.)*
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
- `index.ts` — `runAll(dataDir)`: lane-parallel `Promise.allSettled` (NSE lane prices→holdings on
  one shared primed session; Yahoo lane market→global; **since 2026-07-13 a third lane** —
  `fetchers/indexYields.ts` → `index-yields.json`). Per-source try/catch.
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

### Shared building blocks (all built)
`<TimeSeriesChart>`, `<SecurityModal>`, `<Sparkline>` (`src/components/charts/`),
`<PieDrilldown>` (`global/`), the `useDataset()` loader hook, and the central Chart.js
theme in `src/lib/chartSetup.ts` — see Phase C above for how each is used.

---

## 7. Design system (pure black — re-themed 2026-07-10, §14.2)

Tokens live in `src/index.css` under `@theme` (Tailwind v4). Use as utilities:
`bg-surface`, `text-muted`, `border-border`, `text-accent`, `text-pos`, etc.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#000000` | page background (+ faint teal radial glow) |
| `--color-surface` | `#0c1117` | cards |
| `--color-surface-2` / `-3` | `#11161e` / `#161c26` | nested / hover surfaces |
| `--color-border` / `-soft` | `#1c2431` / `#141b25` | borders |
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
and the session that scaffolded v2. If more detail is needed, read the v1 source — it
exists **only on the `main` branch** now (`dashboard/`, removed from `v2` in the standalone
move); `dashboard.html` (~950 lines, all page-1 logic inline) is the key file. The static
`.js` data sources themselves are vendored on this branch under `dashboard_v2/data-src/`.

---

## 9. Gotchas

- Static data sources (`data-src/*.js`) assign `window.*` — `convert-data.mjs` sandbox-
  evaluates them (`node:vm`), not `JSON.parse`. `npm run data` regenerates only the 11 STATIC
  datasets; the **5 live ones** (live-prices, bench-live, global-live, holdings, index-yields)
  are owned by the refresh server and must NOT be added back to `SOURCES`.
- Embassy is a special case in several places (structure = static PNG `public/img/structure_embassy.png`;
  annexure = image mode; chart 2 has extra TechVillage fair-value lines).
- Large JSON must be code-split / fetched, not bundled, to keep the initial load fast.
- Refresh (`⟳ Refresh data` → `POST /api/refresh`) needs the Node process, so it works under
  `npm run dev`/`npm run preview` but not a pure-static deploy — committed JSON seeds ship there.
- `public/img` is a **real committed folder** now (was a symlink to v1 before the standalone
  move). `check-assets.mjs` guards it at build time.
- Node modules and build output are gitignored inside `dashboard_v2/`.
- **Globe/WebGL** (`/global`) is **un-verifiable visually in the headless preview** (hidden tab pauses
  rAF + globe.gl renders via a post-processing composer) — not a bug; verify the globe in a real
  browser. See §13 gotcha 4.
- **Vendored offline assets:** `public/geo/` now holds both `india-districts.json` (map) and
  `world-countries.geojson` (globe), alongside `public/fonts/` + `public/img/`. Never hotlink CDNs for
  these — offline-asset ethos. (globe.gl’s `three` textures aren’t used — the globe is a hex grid.)

---

## 10. Changelog

- **2026-07-13 (branch `v2-redesign`)** — **SVG exports: print-ready overhaul (Word-legible).** User
  feedback: exports pasted into Word had grey unreadable text and neon dark-theme series colours that
  washed out on white. All in `src/lib/svgExport.ts` unless noted. (1) **All text pure black** —
  `LIGHT_INK #000000`; new `scaleTextInk()` sets explicit `ticks.color`/scale `title.color` because the
  `Chart.defaults.color` override reaches the legend but NOT axis ticks (scale resolver caches the old
  default — verified: ticks exported `#93a1b3` without it); new `titlesInk()` overrides chart-internal
  `plugins.title.color` (PieDrilldown hardcodes near-white `#e8eef4`); `.svg-export-light` tokens
  `--color-ink/muted/subtle` → `#000000` (index.css, panels); `Card.tsx` passes the card footnote
  (`noteRef` textContent) into the export. (2) **Note footer + border** — `ExportMeta.note` word-wrapped
  (canvas-metric `wrapText`) below the image; 1px black rect frames header+chart+note. (3) **Light series
  palette** — `SERIES_LIGHT` maps each dark neon (keyed by exact r,g,b; alpha preserved incl. hex8/rgba)
  to a Tailwind 500–700 shade (teal-400→teal-600, gold→amber-700, blue-400→blue-600, `#e8eef4` basket
  line→slate-900, pie pastels→500s, …); `seriesLight()` remaps dataset colour props; `chartPaletteLight()`
  swaps the shared `CHART` object so draw-time canvas plugins recolour too (Chart 2 block labels now read
  `CHART.info`, Chart 8 P/B labels read `Chart.defaults.color` instead of hardcoded grey). (4)
  **`gridsOff` walks LIVE scales** so config-less scales (VolumeCharts y) also drop gridlines.
  ⚠️ **Two traps burned into this session, don't regress:** (a) colour changes MUST go through a FULL
  `chart.update()` — `update('none')` never re-resolves per-element option caches, so bars kept stale
  colours in the capture AND the live dark page kept export colours after restore (new `animationsOff()`
  disables animation for the export so the full update is capture-safe; painting is rAF-async — only
  `ch.draw()` inside `chartsHiRes` is synchronous). (b) `scaleTextInk`'s restore must RE-READ scale
  objects by chart+id (like `gridsOff`) — `update()` replaces them; a saved object reference is detached,
  which left black (invisible) ticks on the live dark page until fixed. Verified in-browser by
  intercepting `URL.createObjectURL` + anchor click and pixel-sampling the embedded PNG per export shape
  (chart / multi-canvas / panel / pie / P/B bars), plus live-canvas + config restore checks; tsc + oxlint
  + build clean. Root workbook `REIT_AUM_MSF_History.gen.mjs` got the same treatment (border, black
  notes, gridlines dropped except zero axis) **plus a panel content swap** (middle = total incl. future
  dev, bottom = completed-only) — regenerated `.svg` committed alongside.
- **2026-07-13 (branch `v2-redesign`)** — **Market: new "Distribution yield vs index dividend yields"
  chart + `index-yields.json` live dataset.** Companion card to Distributions-vs-FD (fills the half-slot
  before "P/B across REITs"): combined REIT basket trailing distribution yield per FY as teal bars
  (`basketDistYield` in `bench.ts` — the computation extracted from `DistributionChart`, which now calls
  it) vs **Nifty 50** (blue line) and **Nifty Realty** (amber line, rectRot points) dividend yields at
  FY-end, plus a final **"Latest"** category: basket = FY2026 distributions ÷ current market cap at live
  prices (`basketDistYieldLatest`, same price-resolution as the security modal), indices = last NSE print.
  `BenchmarkYieldChart.tsx`; single % axis, category x, no zoom. Data: NEW live dataset
  `index-yields.json` (5th live file — do NOT add to converter `SOURCES`) written by
  `server/fetchers/indexYields.ts`, run as a **third lane** in `runAll()`. Source endpoint:
  `POST https://www.niftyindices.com/BackPage/getpepbHistoricaldataDBtoString` — quirks: payload is a
  **string-wrapped JSON** `{cinfo: "{'name':…,'startDate':…,'endDate':…,'indexName':…}"}` with
  `DD-Mon-YYYY` dates (the old `Backpage.aspx/...` path 404s/errors — endpoint found in their
  `IISLComponet.js`); server caps each request at a **1-year range**; daily rows
  `{pe, pb, divYield, DATE:"31 Mar 2020"}`; `divYield` may lack a leading zero (".33"); no cookies
  needed. FY-end prints never change, so cached FY windows are **skipped** — a steady-state refresh
  makes only the two trailing-window "latest" requests; union-merge with cache, never reduces coverage.
  Line colours: violet failed the CVD check against blue (deutan ΔE 0.3) → Realty uses amber `#fbbf24`.
- **2026-07-11 (branch `v2-redesign`)** — **GoI India boundary geojson finally COMMITTED.** Found while
  committing the P/B work: the hand-spliced `public/geo/world-countries.geojson` (§13 — India-worldview
  boundary, max lat 37.05°N) had been sitting **uncommitted** in the working tree; HEAD still held the
  stock Natural Earth shape (35.49°N). Verified both versions programmatically (India feature max-lat)
  and committed the GoI one alongside the day's live-data refresh. The §13 "do NOT re-vendor" warning
  stands. Also gitignored `new grpahs materieal/` (C&W reference images, local-only like `Global reits/`).
- **2026-07-11 (branch `v2-redesign`)** — **Domestic: two new P/B-ratio charts per REIT (charts 7 & 8);
  later sections renumbered 9/10/11.** Source: user-supplied C&W Asia REIT report pages
  (`new grpahs materieal/`), which define **P/B = market price per unit ÷ NAV per unit** — user confirmed
  that basis (NOT price ÷ book equity, which would be ~2× for Embassy). New helpers in `src/lib/reit.ts`:
  `navAtStrict` (like `navAt` but returns null before the first NAV report — no earliest-NAV backfill)
  and `pbSeries` (daily closes ÷ NAV-as-of-date + a live point). **Complete-pairs rule applied:** the
  P/B series starts at the first reported NAV, so Nexus starts 05 Apr 2024 (prices exist from May 2023
  but its first NAV is FY24) and KRT starts 01 Apr 2026 — each shows a "P/B shown from … — no reported
  NAV before that date" note; Embassy/Mindspace/Brookfield/Bagmane have full coverage, no note.
  `Chart7Pb.tsx` = Chart1-style time series (RangeBar + zoom + `_xmin/_xmax` + dbl-click reset) with a
  dashed 1.0× parity line and a `price ÷ NAV` tooltip; `Chart8PbPeers.tsx` = horizontal current-P/B bars
  for all six REITs (Figure-12 style), selected REIT in teal, value labels via `afterDatasetsDraw`,
  dashed 1.0× guide via a `beforeDatasetsDraw` plugin. Both cards `exportable="chart"` with `exportAsof`.
  **`Chart8PbPeers` is also on the Market page** ("P/B across REITs (latest)" card, fills the half-slot
  next to Distributions-vs-FD): its `k` prop is now optional — omit it for uniform teal bars with no
  highlight (Market), pass it for the selected-REIT highlight (Domestic). Verified on both pages.
  **Market also got the multi-REIT P/B time series** (`src/components/market/PbAllChart.tsx`, full-width
  "P/B Ratio — Price to NAV per Unit, all REITs" card after the Volume card): all six REITs' `pbSeries`
  on one axis via `<TimeSeriesChart>`, coloured with the map page's `REIT_COLOR` (geo.ts), dashed 1.0×
  parity line, driven by the page's shared **Time window** filter (`years` prop; no own RangeBar). Each
  line starts at that REIT's first reported NAV (strict rule) — the card note says so. Verified: paints
  at 3Y and rewindows on 1Y (Mindspace's Apr-26 P/B step-down from the higher FY26 NAV is visible),
  0 console errors.
  Verified in a real browser on the user's :5273 dev server (agent-spawned :5280 failed — the spawn
  shell resolved Node 18; Vite 8 needs ≥20, use `/opt/homebrew/bin/node`): all 6 tabs, values hand-checked
  (Embassy 0.92× = 450.1/491.62 · Brookfield 1.44× · Nexus 1.88×), highlight follows tab, tooltips,
  notes on Nexus/KRT only, range bar click, 0 console errors; tsc + oxlint + build clean.
- **2026-07-10 (branch `v2-redesign`)** — **Landing redesign: Global at `/` with a full-viewport
  pinned globe hero + pure-black theme.** Stable v2 first protected with tag `v2.0-stable`
  (`dba89fe`); `Global reits/` PDFs + issuances docx gitignored (local-only, user choice). Then on
  `v2-redesign`: Global page renders at `/` (old `/global` → redirect; nav reordered 01 Global,
  `NavLink end` on `/`); old "Global REIT players — live 3D map" card removed; new `GlobeHero`
  (globe-only hero, no headline copy — user cut it); whole app re-themed to pure-black
  (`--color-bg #000`, surface ramp `#0c1117/#11161e/#161c26`, borders `#1c2431/#141b25`, + 5
  hardcoded-hex sites updated); globe made "boundless" (transparent canvas) then cinematic:
  sticky full-viewport hero, scroll-scrubbed recede, geometric zoom caps, wheel-scroll etiquette,
  pointer-events gating. **Full detail + gotchas: §14.** Commits `071bb27`, `e79cceb`.
- **2026-07-10** — **Unitholding pattern: FULL filing history (cap removed).** `server/fetchers/
  holdings.ts` capped the NSE unit-holding history at 8 quarters (`MAX_QUARTERS`); the user asked
  for all of it. Cap removed; dedup changed from by-date to **by label (month+year), newest-first**
  — NSE re-files a revised pattern for the same quarter (the latest revision wins) while genuine
  mid-quarter event filings (Brookfield "Jan 2022"/"Aug 2023"/"Apr 2026", Mindspace "May 2026")
  keep their own label and are kept. `UnitholdingPanel` Trend row now **flex-wraps** (was a single
  row — 24 columns would overflow, and a scroll container would clip the panel's SVG export).
  Verified with a REAL NSE pull (ran the fetcher standalone via `node --experimental-strip-types`):
  embassy 19 qtrs (Dec 2020→Mar 2026, sponsor 50.13%→7.69%), mindspace 18, **brookfield 24**
  (54.37%→19.37%, wraps to 2 rows), nexus 12, krt 3, bagmane 1 — and copied that output into
  `public/data/holdings.json` (identical to what ⟳ Refresh now writes). Browser-verified: Embassy
  19 columns single row, Brookfield 24 columns wrapped, 0 console errors; tsc + oxlint + build clean.
- **2026-07-10** — **Domestic charts: complete-pairs rule (user request) + dup-key fix.** Paired
  bar charts no longer draw a year when one leg of the pair is missing — the year is omitted and a
  note under the chart says so. Trigger: Embassy FY2019 showed revenue with no NDCF on
  "4 · NDCF vs Revenue"; user: drop such years and "follow this throughout". Applied to:
  **Chart4Ndcf** (FY mode year filter now `hasRev && ndcf != null`; note gains "FY2019 omitted —
  NDCF not reported for that year") and **Chart3FvBv** (year filter `gav != null && bvTotal != null`
  — was OR; Bagmane FY23–25 were book-value-only bars, now omitted with a note; helper `bvTotal` +
  `pairYears` extracted). Chart5 already required both (ndcf && gav); quarterly mode has no
  rev-without-NDCF quarters in the data; Chart1's DPU bars are a time-series overlay, not a pair —
  all left alone. Data facts: the ONLY affected years are Embassy FY19 (C4) and Bagmane FY23/24/25
  (C3 → now shows the single FY26 pair). Pre-existing omissions unchanged (e.g. Nexus C4 FY26 —
  revenue breakdown not filed yet, note already said so). **Also fixed in passing:** React
  duplicate-key console error in `UnitholdingPanel` Trend — NSE returns two filings for the same
  quarter (Mindspace "Mar 2025", Brookfield "Sep/Dec 2025"), so `key={q.label}` collided; now
  `key={date-i}`. Verified in browser across all 6 REIT tabs: expected label sets per REIT, notes
  render, 0 console errors (dup-key gone); tsc + oxlint + build clean.
- **2026-07-10** — **SVG exports: high-res capture (charts 4×, panels 3×).** Exports previously
  captured the chart canvas at the SCREEN's pixel ratio (soft on 1× monitors, zoom, print). Now
  `exportChartSvg` re-renders each chart's backing store at a fixed **4×** for the capture (new
  `chartsHiRes(charts, dpr)` in `src/lib/svgExport.ts`, `CHART_EXPORT_DPR = 4`) and
  `exportPanelSvg`'s foreignObject raster went 2×→**3×** (`PANEL_EXPORT_DPR`). The SVG document
  keeps the same CSS/layout size — only the embedded PNG is denser — so files drop into Word at
  the same size. On-screen charts are restored to their original resolution after capture.
  **Chart.js trap (verified live):** setting `options.devicePixelRatio` + `chart.resize()` is NOT
  enough — when the chart has a queued `_resizeBeforeDraw` (hidden tab; or a resize event racing
  in), `resize()` only stashes the request for the *next draw*, which can land after the
  synchronous capture. Fix: call `chart.draw()` right after `resize()` — it flushes the pending
  resize immediately. Verified via toDataURL spy: levels chart captured at 4748×1440 (exactly 4×
  of 1187×360, SVG doc unchanged at 1187×416), snapshot panel at 3×, Global pie at 4×; backing
  store / dpr / grid / theme all restored post-export, no leftover `devicePixelRatio` key; sizes
  ~460 KB (chart) / ~1.2 MB (big panel); tsc + oxlint + build clean, 0 console errors.
- **2026-07-10** — **SVG exports: title + as-of header, gridlines removed (export-only).** Every
  "↓ SVG" download now stamps a **vector-text header** above the image — the card title (bold 14px)
  and, where wired, a **data as-of line** (11px grey) — and captures the chart **without gridlines**
  (axis border/ticks/labels stay; the on-screen dark chart is untouched). Files: `src/lib/svgExport.ts`
  (new `ExportMeta {title,asof}` param through `pngSvg`/`exportChartSvg`/`exportPanelSvg`; new
  `gridsOff(charts)` alongside `themeChartsLight`), `Card.tsx` (new `exportAsof?: string|null` prop;
  title auto-passed when it's a string), and per-page wiring: Market (snapshot/levels/rebased/veterans
  → "Prices to <ctx.asof> · NSE/BSE"; turnover → "Turnover data to <bench asof> (workbook basis)"),
  InvITs (live cards → "Prices to <liveAsof> · NSE", EV → "Valuations as of <IV.asof>"), Domestic
  chart 1 → "Live price as of <lp.asof>", Global (pies + country panels → "Live quotes as of
  <LIVE.asof> (Yahoo Finance) · estimates as of <G.asof>"). **Two Chart.js traps found in
  verification (both real):** (1) toggling `Chart.defaults.scale.grid.display` does NOT affect
  existing charts — scale defaults are merged into each chart's config at init; you must flip
  `grid.display` on `chart.config.options.scales` (the plain merged config — never the proxied
  resolved options, which recurse on mutation). (2) The restore MUST re-read the grid object **by
  chart + scale id at restore time** and write the prior value back — `chart.update()` REPLACES the
  config's scale/grid objects (a captured reference is detached), and deleting the key resolves to
  no-grid, not back to the default. Verified in-browser via a `toDataURL` spy: at capture time y-grid
  = false + light ink; after export the config/resolved grid and dark theme are fully restored; chart
  + panel + pie exports all carry the header; tsc + oxlint + build clean, 0 console errors. (Chart
  pixels are blank in the headless preview — known rAF limitation; header/grid logic verified
  programmatically, look confirmed by the vector header rendering.)
- **2026-07-10** — **Global AUM pie: new 3rd drilldown level (country → sector → REITs).** The
  "Real-estate AUM by country" pie already drilled country → sector; clicking a sector now drills
  once more into **the listed REITs in that sector**, sized by **estimated AUM share** — the sector's
  gross AUM split across its REITs in proportion to their **live market cap** (top 10 + an "Others"
  slice; pie total = the parent sector slice). The mcap pie is unchanged (still one level). **Data
  enrichment (per the user's "enrich the dataset" + "estimated AUM share" choices):** added a new
  `sector_reits` roster to `data-src/global_data.js` (regenerated `public/data/global.json` via
  `npm run data`) — `{ country: [name, Yahoo ticker, sector, seed mcap US$ bn] }`, ~8–12 REITs per
  country where the market has them (US deep; HK/CN/India thin — honest). The `sector` string **must**
  match a `sector_breakdown` label so the pie groups by it. New type `GlobalSectorReit` + optional
  `Global.sector_reits`. **Weighting avoids currency-mixing:** Yahoo `mcap` is local-currency while
  seeds are US$ bn, so `sectorReitDrill` derives an implied FX (median live/seed over names that have
  a live quote) to rebase seed-only names into the same basis; pre-refresh or a sector with no live
  quotes falls back to pure seeds (title tagged " (seed est.)"). **Refresh server** (`server/fetchers/
  global.ts`) now fetches a live quote for **every** roster ticker (was top-5 only); 5y **history**
  stays top-5-only (drives the click-through SecurityModal), so the extra tickers add ~50 quote calls
  (sleep trimmed 400→300ms). **Component:** `PieDrilldown.tsx` generalised from a single `drillKey`
  to a **path stack** — a slice is drillable iff it carries a `key` AND `drill(path)` returns a view;
  leaf slices lose `cursor-pointer`. `sectorDrill` slices now carry `key = sector label` when a roster
  exists. Nav shows "← Back" + (at depth 2) a "countries" reset. Files: `data-src/global_data.js`,
  `src/types/data.ts`, `src/lib/global.ts` (`sectorReitDrill`, `DrillSlice`), `src/components/global/
  PieDrilldown.tsx`, `src/pages/GlobalPage.tsx`, `server/fetchers/global.ts`. tsc + oxlint + build
  clean; **verified end-to-end in a real browser** (US → Retail → 7 REITs summing to the $375 bn Retail
  AUM: Simon 34.6%, Realty Income 31.4%, … ; back-nav pops levels; leaf non-clickable; 0 console
  errors). ⚠️ **Headless-preview gotcha:** the drilldown hit-test uses `getElementsAtEventForMode(…,
  {intersect:true}, /*useFinalPosition*/ false)`; under headless rAF-pause the in-flight arc geometry
  never settles, so synthetic clicks miss unless you first set `chart.options.animation=false;
  chart.update('none')` (real browsers settle the animation → clicks land). Same rAF root cause as the
  globe (§13 gotcha 4). New roster tickers only get live quotes after the next ⟳ Refresh; seeds render
  a correct pie immediately in the meantime.
- **2026-07-10** — **Global page: case studies → interactive 3D REIT globe (on-brand hex look).**
  Removed both narrative case-study blocks (the "Case studies" card — Easterly/BREIT/C-REITs — and the
  Temasek Singapore deep-dive panel) from `GlobalPage.tsx` and replaced them with a **fully-interactive
  dark teal HEX-GRID globe** (`globe.gl` / three.js) plotting the world's **35 big listed-REIT players**
  (the `top5` per country) at their HQ cities, **sized by market cap**, coloured by country, with
  pulsing rings. Live Yahoo quotes come from the data we already own (`global-live.json`, refreshed by
  the existing server) — hover shows the live price + mkt cap; **clicking a marker opens the same
  `<SecurityModal>`** the country-panel rows use (reuses `buildGlobalSecModal`). New files:
  `src/lib/globe.ts` (HQ coords + `buildGlobePoints`), `src/components/global/ReitGlobe.tsx`,
  `public/geo/world-countries.geojson` (Natural Earth 110m, vendored offline). Deps: `+globe.gl`
  (pulls `three`+`three-globe`) `+@types/three` (dev). The globe is **`React.lazy`-loaded** in
  `GlobalPage`, so three.js lands in its **own ~1.89 MB / 534 KB-gzip async chunk** (`ReitGlobe-*.js`),
  out of the main bundle — the other four routes are untouched. `global.json`'s `cases`/`temasek`
  data + their types are left in place (UI-only removal). **Aesthetic iteration:** the first pass used a
  photographic earth-night texture, which the user found "cartoony" → switched to the on-brand look —
  landmasses as a teal honeycomb (`hexPolygonsData` over the world GeoJSON), a solid lit dark-teal ocean
  (`globeMaterial(new MeshPhongMaterial(...))` — the default no-texture sphere is an invisible
  ShaderMaterial, so it MUST be replaced), teal atmosphere, deep `#0a0e14` background. The 3 photographic
  textures were removed. tsc + oxlint + build clean; scene structurally verified (177 hex countries + 35
  markers + 35 rings, 0 console errors), click→modal proven (Prologis $141.36); 4 other routes
  regression-clean. **Full detail: §13.** ⚠️ Globe is **blank in the headless preview** (hidden tab
  pauses rAF + globe.gl renders through a post-processing composer) — verify the LOOK in a real browser.
  Committed on `v2` (the "on-brand hex globe" commit).
- **2026-07-10** — **NEW 5th page: interactive Portfolio Map (`/map`).** An India map of every
  REIT asset (108 rows in `reit-data.spv`), built with **Apache ECharts** (tree-shaken, lazy
  route → echarts isolated in its own ~585 KB chunk, out of the main bundle). District-level
  choropleth base coloured by each state's aggregate REIT footprint + animated `effectScatter`
  pins per asset (symbol = asset type, colour = REIT / occupancy / rent gradient, size =
  leasable / completed / value). REIT + type filters, Assets↔Cities view, live totals bar,
  hover-synced sortable asset list, click→detail drawer (all SPV fields incl. computed
  mark-to-market) → reuses the existing `AnnexModal` for the valuation annexure. New files:
  `src/lib/{geo,echartsSetup}.ts`, `src/components/map/{IndiaMap,MapControls,MapTotals,AssetList,
  AssetDrawer}.tsx`, `src/pages/MapPage.tsx`, `public/geo/india-districts.json`; wired in
  `router.tsx` (lazy) + `AppShell.tsx` (nav 05). Committed `ca14bc2`; look refined (brighter
  choropleth, glow pins + type-symbol legend, layout-filled framing, radial backdrop, Card title
  + dynamic note) in `5be9c70`. Verified end-to-end + 4 existing routes regression-clean; tsc +
  oxlint + build clean; 0 console errors. **Full detail: §11.** The income/total-return analytics
  from the same planning session are a deferred next wave (see §12).
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

---

## 11. Portfolio Map page (`/map`) — NEW, 2026-07-10

A dedicated, fully-interactive India map of **every REIT asset**, built **only from data we
already own** (`reit-data.spv` — 108 asset rows across the six REITs). No new data pulls. The
user asked for its own page ("cool as f*ck, fully interactable").

**Stack:** **Apache ECharts** (`echarts/core`, tree-shaken) on a raw `div` ref — *not*
`echarts-for-react` (avoids React-19 peer-dep friction; matches our existing raw-canvas idiom).
The route is **lazy** (`router.tsx`: `lazy: () => import('./pages/MapPage')`), so ECharts lands in
its own ~585 KB chunk and never touches the other four routes' bundles. Chosen over react-simple-maps
(would hand-roll ripple/tooltip/visualMap) and Leaflet/MapLibre (external tile host breaks the
offline-JSON ethos). ECharts gives choropleth + `effectScatter` ripple pins + `visualMap` gradient +
rich tooltips + roam + image export, all offline.

**Files:**
- `src/lib/geo.ts` — the data/coord layer. `REIT_COLOR`, `CITY_COORDS` (~25 canonical cities),
  `CITY_TO_STATE` (state names must match the GeoJSON `st` prop), `CITY_ALIASES` (messy raw labels
  → canonical), `ASSET_OVERRIDES` (marquee parks at true micro-market coords — applied to
  non-Solar/Other only, so "One BKC Solar" in Dhule can't grab Mumbai-BKC's pin), golden-angle
  `jitter` (fans a city's assets out from its centroid so pins don't stack), `assetsFromReitData(D)`
  → flat `MapAsset[]` with `[lng,lat]` + `raw` (original `ReitSpv`, for `AnnexModal`),
  `aggregateByCity` / `aggregateByState`, `totals`.
- `src/lib/echartsSetup.ts` — `echarts.use([...])` (only MapChart, EffectScatterChart, Geo/VisualMap/
  Tooltip/Toolbox/Title, CanvasRenderer) + `ensureIndiaMap()` (fetch `public/geo/india-districts.json`
  once, `registerMap('india', …)`, resolves with the features for state mapping).
- `src/components/map/IndiaMap.tsx` — the ECharts component. Geo base + `map` series (choropleth,
  bound via `geoIndex:0`) + `effectScatter` pins. Two-way hover sync (list↔map via `dispatchAction`
  highlight + `mouseover`/`mouseout` events), click→`onPick`, roam persistence (stashes center/zoom
  on `georoam`).
- `src/components/map/{MapControls,MapTotals,AssetList,AssetDrawer}.tsx` — control rail (REIT + type
  chips, view/size/colour/shade toggles), live totals, hover-synced sortable list, slide-over drawer.
- `src/pages/MapPage.tsx` — orchestrates filter state; drawer's "Open valuation annexure" reuses
  `components/domestic/AnnexModal` (pass `k=asset.reit`, `asset=asset.raw`).
- `public/geo/india-districts.json` — the India map (see gotcha 1). Wired: `router.tsx` (lazy `/map`)
  + `AppShell.tsx` (nav item `05 Portfolio Map`).

**Controls:** REIT chips (colour + live count) · asset-type chips · **View** Assets↔Cities ·
**Bubble size** leasable/completed/value · **Bubble colour** REIT / occupancy-gradient /
in-place-rent-gradient · **State shading** leasable/value/count. A filter selection can't go empty.

**Gotchas (hard-won):**
1. **India GeoJSON** — no lightweight *state-level* India file exists openly. Took udit-001/
   india-maps-data's **district** file (759 features, 3.8 MB, has modern states incl. Telangana),
   preprocessed to **0.48 MB**: round coords to 3 decimals, set each feature `name`→its index &
   keep `st`. Colour each *district* by its parent state's aggregate → visually a state choropleth
   with subtle district texture. `registerMap('india', …)` once; the file is **fetched, not bundled**.
   If you ever need clean state polygons, dissolve districts by `st` (needs a geometry lib — none was
   available here).
2. **ECharts 0-size warning** — on a lazy route the container is 0-wide at init. `IndiaMap` defers
   `echarts.init` via a `requestAnimationFrame` retry until `clientWidth>0`, plus a `ResizeObserver`.
   Don't remove these or the map inits blank until a manual resize.
3. **Lazy route needs a `HydrateFallback`** on the root route (`router.tsx`: `HydrateFallback: () =>
   null`) or React-Router 7 warns "No HydrateFallback element provided" on a direct `/map` load.
4. **ECharts `chart.on(event, {seriesIndex:1}, fn)`** — do NOT annotate the handler param (TS infers
   `ECElementEvent`); read `(p as {data?:{id?:string}}).data?.id` inside.
5. **Framing** — geo uses `layoutCenter/layoutSize` (fills the card) *until* the user roams, then the
   stashed `center/zoom` take over (so a filter change doesn't reset their view).
6. **Export** — the map uses ECharts' own toolbox `saveAsImage` (PNG), NOT the Card `↓ SVG` pipeline
   (that's Chart.js-specific).

**Coordinates are curated, not exact for all** — marquee parks (Manyata, TechVillage, Airoli, One BKC,
Ecoworld, Bagmane parks, Sattva Knowledge City, …) sit at true micro-market coords via `ASSET_OVERRIDES`;
the rest fan out from their city centroid. Refining more assets to true coords is pure polish in `geo.ts`.

## 12. Deferred next wave — income & total-return analytics

The same planning session explored (and the user green-lit as a *later* wave) a set of income /
total-return charts, all buildable from data we already own, to fold into the existing pages:
- **Price return vs total return** (distributions reinvested) for the listed-REIT basket vs NIFTY
  REALTY — the gap between the two REIT lines is the dividend contribution both source reports flag
  as the missing piece. (Market page.)
- **Cumulative distributions per unit** since listing · **yield-gap ribbon** (REIT trailing yield
  minus 10Y G-Sec / FD) · **DPU growth + NDCF payout ratio** vs the 90% mandate (Domestic).
- Plus valuation-quality ideas: **mark-to-market rent upside** (`mkt_rent` vs `inplace_rent`, already
  in SPV), **GAV growth & CAGR** (`val_hy`), **premium/discount-to-NAV over time**, a **relative-value
  scoreboard**. Not started. Respect the plain-title / no-insight-box design rule.

## 13. Global REIT globe (`/global`) — NEW, 2026-07-10

Replaced the Global page's two narrative case-study blocks with a **sexy, fully-interactive 3D globe**
of the world's big listed-REIT players. Built **only from data we already own** — `global.json`
(`top5` per country) for the roster + `global-live.json` for live Yahoo quotes/history (refreshed by
the existing server; **no new fetch wiring**). Positions are the only added data: a static HQ coord map.

**Stack:** **`globe.gl`** (framework-agnostic; three.js / ThreeGlobe under the hood), driven
**imperatively on a raw `<div>` ref** — the same idiom as the Portfolio Map's `IndiaMap.tsx`. Chosen
over `react-globe.gl` to avoid React-19 peer-dep friction (matches the codebase's "raw canvas/div, no
React wrapper" convention). **On-brand dark look (NOT a photo texture):** landmasses are a
**HEX GRID** (`hexPolygonsData` over the world GeoJSON) coloured **by continent** — each continent has
its own palette family (`CONTINENT_PALETTES` keyed by the GeoJSON `CONTINENT` prop; teal=Asia the hero,
blue=N.America, violet=Europe, green=S.America, amber=Africa, coral=Oceania), a country picks a shade
within its family by name-hash; the ocean is a solid lit dark-teal sphere
(`globeMaterial(new MeshPhongMaterial(...))`), a teal atmosphere glow, deep `#0a0e14` background;
auto-rotate (pauses on hover), drag-to-rotate, scroll-zoom; one **market-cap-sized point per player**
with a **pulsing ring** (same ripple language as the map's `effectScatter`). *(v1 of this globe used a
photographic earth-night texture — the user found it "cartoony", hence the hex switch.)*

**Files:**
- `src/lib/globe.ts` — `HQ` (35 tickers → `[lat,lng]` HQ city), golden-angle `jitter` (fans co-located
  HQs so pins don't stack — ported from `geo.ts`, wider radius for globe scale), `buildGlobePoints(G,
  LIVE)` → `GlobePoint[]` (ckey+ri for the modal, country colour from `global.ts` `COLS`, live
  price/ccy/mcap from `LIVE.quotes`, `size` = normalised √market-cap for radius/altitude/rings).
- `src/components/global/ReitGlobe.tsx` — the globe. Init-once `useEffect` mirroring `IndiaMap`:
  `requestAnimationFrame` size-guard (lazy mount → 0-width) + `ResizeObserver`. Loads the world GeoJSON
  once (`ensureWorld()`), sets `hexPolygonsData` (`hexPolygonResolution:3`, `hexPolygonMargin:0.28`,
  `hexPolygonColor` = `hexColor()` = per-continent palette, shade chosen by name-hash), replaces the globe material with a
  `MeshPhongMaterial`, then `pointsData`/`ringsData` accessors, rich HTML `pointLabel`, `onPointHover`
  pauses auto-rotate, `onPointClick` → `onPick(ckey,ri)`. `_destructor()` on unmount.
  `preserveDrawingBuffer:true` so the globe is screenshot-/export-able.
- `public/geo/world-countries.geojson` — Natural Earth **110m admin-0 countries** (177 features, ~490 KB),
  originally copied from `node_modules/globe.gl/example/datasets/`, fetched via `import.meta.env.BASE_URL +
  'geo/world-countries.geojson'`. **Do NOT hotlink unpkg** — honours the offline-asset ethos (same
  reason Leaflet/MapLibre were rejected for the map). Committed, not gitignored.
  *(The earlier photographic textures under `public/textures/` were removed with the hex switch.)*
  **⚠ HAND-EDITED for the Government-of-India-approved India boundary (2026-07-10, user request) — do
  NOT re-vendor the stock file, it would silently revert this.** Stock Natural Earth uses the "de facto"
  worldview (India capped at 35.49°N — no PoK/Gilgit-Baltistan/Aksai Chin; the standalone `/map` page's
  `india-districts.json` was already GoI-correct). Fix: India's geometry replaced with the **Natural
  Earth 10m India-worldview** shape (`ne_10m_admin_0_countries_ind.geojson`, github
  nvkelso/natural-earth-vector `geojson/` — the *only* resolution published as geojson; 110m/50m POV
  variants don't exist), simplified to ~110m density (337 pts, max lat 37.05°N, and it adds the
  Andaman & Nicobar islands the 110m file lacked); then the new India (buffered 0.02°) was
  **subtracted from Pakistan and China** so hex tiles don't double-render over the re-attributed
  territory (Pakistan 81.9→72.5 deg², China 954.6→950.5; an orphaned 0.12 deg² Pakistan fragment left
  inside Indian-claimed Gilgit was dropped — keep-largest). Splice script (shapely): scratchpad
  `splice_india.py` from the 2026-07-10 session; trivially re-derivable from this note.
- `src/pages/GlobalPage.tsx` — the two case-study `<Card>`s + the `TemasekPanel` function are gone;
  a `<Card title="Global REIT players — live 3D map">` now wraps `<Suspense><ReitGlobe …/></Suspense>`.
  `ReitGlobe` is **`React.lazy`-imported** → three.js in its own async chunk. `onPick` builds the modal
  via the existing `buildGlobalSecModal(G, LIVE, ckey, ri)` — identical to the country-panel rows.

**Left intact:** the two country pies + `CountryPanels` (still live-quote tables), and `global.json`'s
`cases`/`temasek` data + `types/data.ts` types (the removal is UI-only — re-add a card any time).

**Gotchas:**
1. **The default no-texture globe sphere is an INVISIBLE `ShaderMaterial`.** With no `globeImageUrl`,
   `globeMaterial()` is a transparent shader → the sphere renders nothing (and mutating its
   `.color/.emissive` silently no-ops). You MUST replace it: `g.globeMaterial(new MeshPhongMaterial({
   color, emissive, emissiveIntensity, shininess }))` (imported from `three` — needs `@types/three`,
   pinned to the same `three` version, single deduped copy so the instance is compatible).
2. **`ringColor`/`hexPolygonColor` need an explicit param type.** Their accessor return type is itself a
   function/union, so TS can't tell an accessor-fn from a value — annotate `(d: object) => …` (the
   plain `pointLat`/`ringLat` accessors infer `object` fine).
3. **globe.gl’s `package.json` isn’t in `exports`** — `require('globe.gl/package.json')` throws; read
   the file directly if you need the version. Import is `import Globe, { type GlobeInstance } from 'globe.gl'`
   and construct with `new Globe(el, cfg)`.
4. **Headless-preview is UN-verifiable visually (expected, NOT a bug).** In the automation browser the
   preview tab is `document.hidden` → `requestAnimationFrame` is paused AND globe.gl renders through a
   post-processing composer (`postProcessingComposer()`), so neither the internal loop nor a manual
   `renderer.render()`/`composer.render()` reliably paints the visible canvas — readPixels reads the
   flat background. You can still verify the **scene is built** (`hexPolygonsData().length`===177,
   `pointsData().length`===35, `ringsData().length`===35) and that there are **0 console errors**, and
   the click→modal path (shared with the country panels). **The actual LOOK can only be confirmed in a
   real (visible) browser** — same class as the documented Chart.js “canvas blank in headless” caveat.
5. **Coords are HQ cities, not asset-level.** US spread across each REIT’s real HQ; JP/AU/SG/HK
   collapse to one hub city + jitter; CN to sponsor cities; IN to Mumbai/Bengaluru. Refining is pure
   polish in `globe.ts` `HQ`.

---

## 14. Landing redesign (branch `v2-redesign`) — 2026-07-10

**What:** Global became the app's landing page with a cinematic full-viewport globe hero; the whole
app went pure-black. All on branch **`v2-redesign`** (from `v2` tip). Pre-redesign stable state is
tag **`v2.0-stable`** — recover via `git checkout v2.0-stable` / `git reset --hard v2.0-stable`.
Design inspiration: graphite.com hero (the headline/CTA copy was built, then **cut by the user** —
the hero is globe-only now; don't re-add copy without asking).

### 14.1 Routing & nav
- `router.tsx`: `{ index: true, element: <GlobalPage/> }`; `global` path → `<Navigate to="/" replace/>`.
- `AppShell.tsx` `NAV`: 01 Global (`to:'/'`, **`end:true`** — without `end`, `/` matches every route),
  02 Domestic, 03 Market, 04 InvITs, 05 Portfolio Map.

### 14.2 Pure-black theme (all pages)
- `index.css` @theme: `--color-bg #000000`; surfaces `#0c1117 / #11161e / #161c26`; borders
  `#1c2431 / #141b25`. Ink/muted/accents unchanged. Body radial teal glow alpha 0.05 → **0.07**.
- Hardcoded-hex sites that MUST track the tokens (grep old values before re-theming again):
  `chartSetup.ts` `CHART.grid` rgba(28,36,49,.6) · `IndiaMap.tsx` `P.surface/border/bg` ·
  `ReitGlobe.tsx` tooltip inline style · `PieDrilldown.tsx` slice `borderColor #000` ·
  `Chart6Capital.tsx` doughnut `borderColor #0c1117`. `.svg-export-light` untouched (light export).

### 14.3 GlobeHero (`src/components/global/GlobeHero.tsx`)
- Owns the `React.lazy` ReitGlobe import (three.js stays in its own chunk, now loaded on `/`).
- **Sticky full-viewport hero**: `sticky top-[61px] z-0 -mt-6 mb-3 h-[calc(100svh-177px)]
  min-h-[420px]`. 61px = AppShell sticky-nav height (py-3 + content + border — single constant to
  move if the nav ever changes); 177 = 61 + ~116px of pie-card row peeking at the viewport bottom
  on a fresh load. `-mt-6` cancels `<main>`'s top padding so the globe sits flush under the nav.
- **Scroll-scrubbed recede**: rAF-throttled passive scroll listener; `p = clamp(scrollY/heroH, 0, 1)`
  drives `scale(1 − 0.12p)` + `opacity(1 − 0.55p)` on the fx wrapper (`SCRUB_SCALE`/`SCRUB_FADE`
  constants). Scrubbed ⇒ fully reversible. Cards (`relative z-10`, translucent `bg-surface/90`)
  ride over the pinned globe; past full overlap the dimmed globe just stays pinned to page end
  (sticky containing block = `<main>`).
- **Pointer gate**: same handler sets `section.style.pointerEvents = p > 0.02 ? 'none' : ''` — the
  globe is interactive ONLY at the rest state. Without this, the canvas bleed behind the cards
  hijacks wheel/drag through the gaps between cards.
- The live-asof note (`Live quotes as of … · drag to spin …`) is INSIDE the fx wrapper — it fades
  with the globe. When `LIVE` is absent it falls back to the estimates + ⟳ Refresh hint.

### 14.4 ReitGlobe changes (`src/components/global/ReitGlobe.tsx`)
- **Transparent canvas**: `rendererConfig.alpha:true` + `g.backgroundColor('rgba(0,0,0,0)')`; wrapper
  lost `overflow-hidden rounded-lg` + its box radial gradient. The globe is chrome-less — page glow
  runs through it ("boundless"). An opaque bg equal to --color-bg is NOT enough: the body's radial
  glow makes the canvas rectangle read darker than the page.
- **Props**: `className` (wrapper band sizing; hero passes `min-h-0 flex-1`) and `canvasClassName`
  (hero passes `h-[175%]`) — when set, the canvas div is `absolute inset-x-0 top-1/2 -translate-y-1/2`,
  i.e. CENTERED zoom headroom: invisible at rest, lets a zoomed globe overflow under nav/note/cards
  instead of clipping at the canvas edge.
- **Camera framed to the BAND, not the canvas**: `ratio = canvasH/bandH` (measured at init);
  `restAlt = 3.4·ratio − 1` (altitude 2.4 was the tuned fit when canvas == band);
  `controls.maxDistance = 100·(1+restAlt)` ⇒ **rest = fully zoomed out**, fresh load fits the band.
- **Zoom-in cap — exact sphere projection**: a sphere of radius r at distance d projects with
  half-angle `asin(r/d)`, on-screen tangent `r/√(d²−r²)` — NOT the small-angle r/d (the first
  attempt used r/d and clipped badly at close range). Horizontal no-clip bound:
  `minDistance = AURA·R·√(1 + 1/T²)·SAFETY`, `T = tan(25°)·w/h` (globe.gl camera vfov 50°, R=100),
  `AURA 1.35` (atmosphere shell 1.26R + fade), `SAFETY 1.04`. Recomputed in the resize handler
  (aspect-dependent) and clamped ≤ maxDistance (narrow screens ⇒ effectively no zoom, correct).
- **Wheel etiquette** (capture-phase `wheel` listener on the container, `passive:true`):
  if the wheel direction can't zoom further (at min/max distance) AND the user has paused
  ≥ `ZOOM_SCROLL_GRACE_MS` (600) since their last consumed tick → `stopPropagation()` so
  OrbitControls never sees it and the browser scrolls the page. During the grace window the event
  still reaches OrbitControls (clamped no-op that preventDefaults) — zoom-out momentum can't ram
  the page into the cards. Fresh-load first scroll passes through instantly (grace arms on zoom).

### 14.5 GlobalPage
- `GlobeHero` mounts unconditionally (`points=[]` while loading ⇒ globe never re-inits when data
  arrives); only the section below swaps error/loading/cards. Cards grid + fallback Cards carry
  `relative z-10` (paint above the pinned hero). PageHeader is gone from this page.

### 14.6 Gotchas learned (this redesign)
1. **Small-angle vs tangent projection** — see 14.4; any future "fit the sphere" math must use
   `asin(r/d)`.
2. **rAF-throttled scroll handlers are headless-unverifiable** (hidden tab pauses rAF — same root
   cause as the blank globe canvas). Verify sticky GEOMETRY headless (positions are synchronous);
   verify scrub/wheel FEEL in a real browser. Synthetic WheelEvents don't trigger default scrolling
   either (untrusted), so wheel etiquette is real-browser-only too.
3. **Headless viewport can report height 0** (svh → min-h fallback) — don't trust `innerHeight`
   there; `preview_resize` didn't fix it in this env.
4. **JSX comments can't sit as a second root in a `return (…)` or ternary branch** — use `//` above
   the expression (twice bitten this session).
5. The user's dev server runs on **:5273** (launch.json `v2-dashboard`); agents should use
   `v2-dashboard-alt` (:5280) to avoid the port clash.

### 14.7 State / next steps
- Committed & pushed: `071bb27` (landing + theme), `e79cceb` (pinned scroll hero + zoom/wheel).
- tsc + oxlint + build clean; all 5 routes regression-checked structurally; user has verified the
  hero feel in a real browser through the wheel-grace iteration.
- Open design question deferred: whether Domestic/other pages get any landing-style treatment, and
  whether the removed hero copy/CTAs return anywhere else. Merge to `v2` only when the user calls
  the redesign done.

## 15. REIT AUM & MSF history workbook + Market-page area split — 2026-07-13

**Deliverable (repo root):** `REIT_AUM_MSF_History.svg` (3-panel chart), `REIT_AUM_MSF_History.csv`
(92 quarterly data points), `REIT_AUM_MSF_History.gen.mjs` (generator — edit data/layout there and
run `node REIT_AUM_MSF_History.gen.mjs <svg> <csv>`), and `REIT_AUM_MSF_sources/*.json` (per-REIT
extraction results **with page-level citations** into the offer documents / quarterly filings).

**What it is:** AUM (GAV) and portfolio-area history for all 6 REITs from each one's final offer
document (IPO baseline, ◆ on the chart) through Q4 FY26 (Mar 2026), extracted from the PDFs in
`Final Offer Documents/` and the per-REIT folders by parallel subagents (PyMuPDF text extraction;
numbers verified against actual filing text, never memory).

**Panels / basis (all user-driven):**
1. AUM = GAV in **₹ cr, full figures** (not bn — user asked for cr).
2. Portfolio area = **completed + under-construction** msf, future dev excluded. Where a deck
   prints only a combined dev bucket, the **last disclosed UC is carried** (`uc_is_carried` in CSV).
3. Total area = completed + UC + future dev **combined** (headline basis, matches Market page).
Labels: IPO + material jumps only (≥5% GAV / ≥1 msf), collision-avoided; end labels carry latest.

**Hard-won data facts (documented in `REIT_AUM_MSF_sources/`):**
- All six value **semi-annually (Mar/Sep)**; Jun/Dec decks reprint the prior valuation.
- **Brookfield changed msf definition** at Q4 FY24 (total → operating-only headline) and stopped
  printing a total from FY25 (total = operating + "dev potential" there); GAV counts 100% of
  50%-interest assets from Q1 FY25.
- **Embassy FY20–Q1FY23 UC** is not in the portfolio tables (only "Completed vs Development");
  backfilled from each deck's "ongoing on-campus development" statements (1.4→2.6→2.7→5.7 after
  ETV→4.6). Offer doc's 2.5 UC vs FY20's 1.4 is definitional (active-construction basis) — hence
  the small 27.3→26.2 dip.
- **Nexus is 100%-completed retail** throughout (no UC ever); growth = completed-mall acquisitions.
- **Misfiled PDFs:** `KRT/Detailed-Valuation-Report-Q4-FY26.pdf` is actually a Nexus report;
  `Nexus/earnings_presentation_q4_fy26_v1.pdf` is an Embassy deck. Scanned/no-text-layer PDFs:
  Nexus Q3 FY26 financials, KRT Q2 FY26 earnings update.
- **Bagmane** listed May 14 2026; no post-IPO portfolio disclosure exists yet (first will be
  Q1 FY27). Its FY26 "financials" are Trust-standalone pre-acquisition — no portfolio data.

**Market-page change:** "Total area breakdown (msf)" is now a **3-segment stack**
(Completed / Under construction / Future development). `data-src/bench.js` overview gained
`future_msf` (uc_msf is now true UC); types + `AreaChart.tsx` + card note updated. Also fixed
stale overview data: Embassy was Dec-2025 vintage (now Mar-2026: 52.6/43.6 total/completed) and
Mindspace was **pro-forma incl. unclosed Chennai acquisitions** (44.2 → as-filed 39.3/32.0).
UC for Embassy/Mindspace/Brookfield follows each REIT's last disclosed split (their latest decks
print only a combined bucket) — same carry convention as the CSV.

**Tooling notes:** the preview harness's Node 18 cannot run Vite 8 (`styleText` import error) —
use the `v2-dashboard-node23` launch config (runs `/opt/homebrew/bin/node node_modules/vite/bin/
vite.js` on :5286). Headless viewport can report width 0 → Chart.js canvases size 0×600 and pixel
sampling fails; verify via bench.json + served-module content + console errors, and eyeball in a
real browser. PDF extraction recipe: `python3 -m venv && pip install pymupdf`, then a small
grep/text-by-page CLI (see `REIT_AUM_MSF_History.gen.mjs` header comment for the data shape).


## 16. Per-REIT leverage & AUM/MSF charts + workbook gap-fill — 2026-07-15

**Two new Domestic-page cards (every REIT):**
- **6b · Debt & Leverage Profile** (`Chart6bDebt.tsx`) — gross debt bars (₹cr/FY, the debt leg of
  chart 6 without equity) with **LTV** (gold) and **COF — cost of financing** (blue) stacked above
  each bar. Chart-local `leverageLabels` plugin draws them always (screen + export); on export it
  re-inks black and adds the ₹cr debt value as a third row (global `barValueLabels` opted out).
- **3b · AUM & Leasable Area** (`Chart3cAumMsf.tsx`) — AUM/GAV bars (₹cr, left axis) + total
  leasable and operational area lines (msf, right axis). Export labels: **one chart-local
  `exportValueLabels` plugin draws bar values AND line-point msf values through a single
  `LabelPlacer`** — two independent placers can't avoid each other (verified overlap: "52.5" over
  "69.9k cr" on Embassy FY26). Total-line labels go above points, operational below. y/y1 have
  `grace: '12%'` + top padding because opting out of `barValueLabels` also loses svgExport's
  label headroom.

**New `fin` fields** (data-src/data.js → reit-data.json → `types/data.ts ReitFin`): `ltv`,
`cost_debt` (fractions), `msf_total`, `msf_op` — all extracted from
`Indian_REITs_Key_Financials_FILLED.xlsx` by year-label matching (not column position).

**Workbook gap-fill (filings researched by parallel subagents, sources in cell hover-comments):**
- Mindspace FY23: cash ₹406.2 cr, GAV 28,026.5, gross debt 5,453.5 (col G was empty → LTV formula
  now yields 18.0%; the deck's own print is 17.9% on minority-adjusted net debt), COF 7.6%
  (Q4 FY23 deck), GLA 32.0 / operational 25.8 msf.
- Brookfield FY21: COF 7.15% (Q1 FY22 deck p.20; IPO-refinanced debt unchanged Feb→Jun '21),
  14.0 / 10.3 msf.
- Embassy FY20: COF ~9.5% **blended estimate** (Q3 FY20 deck in-place ~9.65% Dec-19 + CFO's
  "original 9.4% at listing" — flagged as estimate in the comment).
- **Genuinely undisclosed, left blank:** Embassy FY19 COF (pre-IPO SPV debt, repaid at IPO);
  Bagmane FY24/25 GAV+LTV (only valuation date in the RHP is 31-Dec-2025) and Bagmane COF all
  years (RHP has only facility ranges 6–11%; implied ~7.9%/9.4% from interest expense = derived,
  not disclosed — kept out).
- Workbook edits via openpyxl on the formula copy, then **fresh-profile LibreOffice convert to
  bake values** (skill recalc.py no-ops here); `Comment(text, 'Source')` mirrors the existing
  hover convention.

**Verification notes:** headless canvas pixel-readback only worked on the first paint after a
fresh load; afterwards `getImageData` returns all-transparent (GPU compositing). Reliable export
check instead: hook `URL.createObjectURL`, click the card's SVG button, pull the captured blob,
decode the embedded PNG data-URI into a fresh canvas → pixel-count / render to file and eyeball.

## 17. Unitholding pattern — per-sponsor stakes + full NSE breakdown — 2026-07-15

User ask: the panel only showed Sponsor-vs-Public; wanted each sponsor's stake (KRT has two
sponsor groups) and a proper public breakdown from NSE.

**Data source (new):** every row of `/api/corporate-unit-holdings-master` links the filing's
XBRL (`xbrlFilePath` → `nsearchives.nseindia.com/corporate/xbrl/UHP_<ndsID>_…_WEB.xml`, ~90 KB,
plain fetch with a browser UA — **no cookie session needed**, unlike the JSON APIs). It carries
the full SEBI table: sponsor split Indian/Foreign with **named per-entity stakes**
(`OtherIndianN`/`OtherForeignN` members, `NatureOfOther` = entity name), institutions /
non-institutions category percentages, and top-5 public unitholders.

- **Parser** `server/lib/uhpXbrl.ts` — dependency-free regex XBRL reader → `QuarterDetail`
  (`types/data.ts`): `inst`, `noninst`, `cats{mf,fpi,ins,pf,banks,inst_other,retail,corp,nri,trusts,noninst_other}`,
  `sponsors[]` (named entities), `groups[]` (sponsor-group rollup), `top[]`. Traps learned:
  `OtherNonInstitutionsMember` is a **subtotal** (corp+NRI+trusts+clearing) — the leaf is
  `OtherNonInstitutionsOtherMember`; top-5 percentages are filed as fractions of 1 (scale ×100
  when max ≤ 1, Nexus files real % — heuristic handles both); Brookfield lists a sponsor entity
  in the "other than sponsor" top-5 (filtered by name match); Nexus repeats an entity name on two
  rows (merged); names carry `&amp;` and "Sponsor Group"/"Body Corporate" suffixes (cleaned).
- **Sponsor groups**: rollup = the sponsor category's Indian/Foreign side totals (exact, no
  name-matching): `SPONSOR_GROUPS` map in `server/fetchers/holdings.ts` (krt: Sattva/Blackstone,
  embassy: Embassy Sponsor/Blackstone — history shows Blackstone 31.7→23.6→exit, …). Mindspace
  files entities unnamed ("Bodies Corporate") → single "K Raheja Corp group" + panel note.
- **Fetcher**: full-history backfill — every deduped quarter's XBRL is fetched once and cached at
  `server/.cache/uhp/<ndsID>.xml` (gitignored; XBRLs are immutable per ndsID; 72 files, ~18/REIT).
  Fetch/parse failure ⇒ quarter has no `detail` and the panel renders the old 2-way split.
- **Panel** (`UnitholdingPanel.tsx`): stacked bar = one segment per sponsor group (teal, gold,
  violet) + Institutions (info blue) + Non-institutions (warn amber), 2px gaps, ≥12% direct labels;
  figures row per segment; detail grid = sponsor entities (top 6 + "N smaller entities") | public
  category mini-bars + top-5 named holders. React keys on entity rows are index-suffixed
  (filings can repeat a name — Nexus).
- **Ownership trend** (same panel, below the detail grid): **inline-SVG stacked area** — sponsor
  (accent) / institutions (info) / non-institutions (warn) summing to 100%, date-proportional
  x-axis over the full filed history, y 0–100 with 25/50/75 gridlines, right-edge value labels
  (collision-nudged — Brookfield sponsor 19.4 vs non-inst 18.8), per-quarter hover tooltips, and a
  neutral grey band for quarters whose filing lacks the split (Embassy ≤ Jun 2021, Brookfield
  ≤ Dec 2021) + footnote. Inline SVG on purpose: the `panel` export rasterises DOM through a
  foreignObject, which serialises SVG but NOT canvas — a Chart.js chart here would export blank.
  Newest x-tick keeps priority; earlier ticks within 70 viewBox-units are dropped (label collision).
- **Split exports (Word-readable)**: the card no longer uses `Card exportable` — two custom
  buttons, **"↓ SVG · pattern"** (`<k>-unitholding-pattern`, bar + figures + detail grid) and
  **"↓ SVG · trend"** (`<k>-unitholding-trend`, area chart), each calling `exportPanelSvg` on its
  own section ref with its own title/footnote. Rationale: the combined card is page-tall — pasted
  into Word it shrank to fit and text went sub-legible; the halves are 679px / 389px at 1187 wide,
  both within the ~700px page-image budget. Verified via the createObjectURL hook (white bg,
  black title, frame, footnote, 3× raster).
- **Browser-pane trap (verification)**: if in-app screenshots go black AND `window.innerWidth`
  reads 0, the pane renderer is wedged — offsetWidths collapse and panel exports come out
  `width="0"`. Fix: `preview_stop` + `preview_start` (resize alone doesn't recover it).

## 18. InvIT NAV charts — 2026-07-15

User ask: the InvITs page had no NAV charts. Added two cards to `InvitsPage.tsx`:

- **"Unit price vs NAV per unit"** (span-2, `InvitNavChart` in `InvitCharts.tsx`): daily closes
  (solid, per-trust colours) vs independent-valuation NAV/unit as dashed **stepped** lines with
  point markers (PGInvIT has 6 points, RIIT one — a bare line would vanish).
- **"Price to NAV (latest)"** (`InvitPNavChart`): horizontal bars of last close ÷ latest NAV with
  the dashed 1.0× parity guide — clones the Chart 8 (`Chart8PbPeers.tsx`) label/parity plugins.

**Data (new, sourced 2026-07-15):** `nav_hist: [[ISO date, ₹/unit]]` per trust in
`data-src/invit_data.js` (→ `invit.json`, optional field on `InvitTrust`):
- **NHIT** — 15 quarterly valuation points Nov-21 (101.0) → Dec-25 (145.8) from the Feb-2026
  investor presentation slide 10 (nhit.co.in "NAV & Distributions"); Mar-26 = 152.44 (existing).
- **PGInvIT** — FY-end fair-value NAV from the ARs' "Statement of Net Assets at Fair Value":
  Mar-22 101.07 (FY22 AR p118), Mar-23 86.04 (FY23 impairment year), Mar-24 85.28 / Mar-25 94.12
  (FY25 AR p121), **Mar-26 90.79 (FY26 AR p66)** — also corrected the snapshot `nav` from the
  stale approx 98.5 to 90.79. Anchor May-21 = ₹100 IPO.
- **RIIT** — ₹100 issue reference only (listed Mar-26; first valuation not yet published). Also
  corrected `ev_cr` 6000 → 9299 (independently assessed EV ₹9,298.7 cr at IPO, vs issue size).

Grid rebalance: EV card dropped from span-2 to single so the four singles pair up
(P/NAV | rebased, yield | EV). Verified via the createObjectURL export hook (both SVGs inspected;
P/NAV prints NHIT 1.10× · RIIT 1.17× · PGInvIT 1.07×).

## 19. Structure diagrams from PPTX for all six REITs — 2026-07-16

`~/Downloads/Indian REIT Structures.pptx.pptx` (6 dark Canva-style slides, one per REIT:
slide1 embassy · 2 mindspace · 3 brookfield · 4 nexus · 5 krt · 6 bagmane) is now the source of
truth for section 10 · REIT Structure. Rendered at 200 dpi (fresh-profile LibreOffice → pdftoppm)
to `public/img/structure_<key>.png` (~2134px wide), overwriting the stale unwired PNGs; bagmane new.
`Structure.tsx` simplified: every REIT renders the static image (native 3-level diagram deleted);
Embassy's notes paragraph kept in a `NOTES` map, other REITs fall back to `structures[k].notes`.

White document versions live in `Indian REIT Structures - PNGs/` (project root,
`REIT_Structure_<Name>_white.png` + `_dark.png`). Made by recoloring slide XML: white text runs
(`rPr` solidFill FFFFFF) → 111111 and the `<p:bg>` fill 1E1C1F → FFFFFF. Trap: slide 5 (KRT)
colors its entity names with the *same hex as the background* (1E1C1F) — a global 1E1C1F swap
turns names white/invisible; the bg replacement must be scoped to the `<p:bg>` element only.
