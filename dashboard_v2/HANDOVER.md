# Indian REITs Dashboard v2 — Session Handover

> Living document for anyone (human or agent) picking up the v2 rebuild.
> Last updated: 2026-07-09. Update the **Status** and **Changelog** sections as you go.

---

## 1. TL;DR

We are rebuilding the Indian REITs dashboard as **v2**: same functionality as v1,
new implementation. v1 is a static multi-page vanilla-JS + Chart.js app; v2 is a
modern React SPA. The scaffold, design system, and routed page skeletons are done.
The **data layer and real page/chart wiring are not yet built** — that's the bulk of
the remaining work.

- **Repo:** https://github.com/IshanMandlaus/indian-reits-dashboard (private)
- **Branch:** `v2` (v1 stays on `main`, untouched, as the source of truth)
- **v2 app:** `dashboard_v2/` · **v1 app:** `dashboard/`

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
| Data | Convert v1 `window.*` `.js` globals → static JSON, lazy-loaded per route | Big files (annexdata 1.1 MB, global_live 763 KB) must be code-split |
| Refresh | Keep Python `refresh_*.py`; adapt to emit JSON; dev proxy to `serve.py` | Preserve live-price/market/global refresh |

**Dev-server proxy:** `vite.config.ts` proxies `/refresh`, `/refresh-market`,
`/refresh-global` → `http://localhost:8742` (the v1 `serve.py`). Run `serve.py`
alongside `npm run dev` to exercise the refresh buttons.

---

## 4. How to run

```bash
cd dashboard_v2
npm install
npm run dev          # http://localhost:5273
# optional, for live refresh in dev:
python3 ../dashboard/serve.py     # :8742
```

Typecheck: `npx tsc -b`  ·  Build: `npm run build`  ·  Lint: `npm run lint` (oxlint).

There is a `.claude/launch.json` at repo root with two configs: **`v2-dashboard`**
(npm dev, :5273) and **`v1-dashboard`** (serve.py, :8742).

---

## 5. Current state (what exists)

```
dashboard_v2/src/
  main.tsx                      # RouterProvider
  router.tsx                    # 4 routes under AppShell; "/" → /domestic
  index.css                     # Tailwind v4 + refined-dark @theme tokens (SEE §7)
  components/layout/AppShell.tsx# sticky top nav + <Outlet/>
  components/ui/
    Card.tsx                    # panel primitive (title/note/actions/body)
    Badge.tsx                   # tones: pos/neg/accent/warn/neutral
    PageHeader.tsx              # page title + subtitle + actions
    ChartPlaceholder.tsx        # dashed "wiring in progress" box (temporary)
  lib/format.ts                 # inr, inrCr, pct, pctRaw, fmtMonth
  pages/
    DomesticReitsPage.tsx       # tab bar + KPI header + 9-card bento (placeholders)
    MarketPage.tsx              # snapshot cards + 7 chart slots (placeholders)
    InvitsPage.tsx              # 3 snapshot cards + 4 chart slots (placeholders)
    GlobalPage.tsx              # 2 pies + country panels + cases (placeholders)
```

**Everything on the pages is placeholder** (`ChartPlaceholder`, hardcoded demo
values). No real data is loaded yet. Design/layout/nav are real and verified in the
browser.

---

## 6. Remaining work (priority order)

### Phase A — Data layer ✅ DONE (2026-07-09)
- **Converter:** `scripts/convert-data.mjs` (run `npm run data`). Sandbox-evaluates
  each v1 `.js` global via `node:vm` with a stub `window` and serializes to
  `public/data/<name>.json`. All 14 sources convert; re-run whenever v1 data changes.
- **Output:** `public/data/*.json` (committed, ~2.9 MB total) — `reit-data`,
  `live-prices`, `structures`, `annexures`, `annexdata`, `annex-images`, `links`,
  `val-hy`, `blocks-live`, `bench`, `bench-live`, `invit`, `global`, `global-live`.
- **Types:** `src/types/data.ts` — accurate shapes derived from the real JSON (note:
  `REIT_DATA` also has `built` + `notes`; `mcap_breakdown`/`sector_breakdown` are
  country-keyed objects, not arrays).
- **Loader:** `src/lib/data.ts` — `loadData(name)` (typed, cached, in-flight-deduped,
  honours `BASE_URL`) + `invalidateData()`. React hook: `src/lib/useDataset.ts`
  → `useDataset('reit-data')` returns `{data, loading, error}`.
- **Images:** `public/img` is a **symlink** → `../dashboard/img` (200 MB of annexure
  images — not duplicated/committed). Verified Vite serves both JSON and symlinked
  images (HTTP 200) in dev. ⚠️ **Production build must resolve this** — Rollup may not
  follow the symlink on `vite build`; do a real copy or serve `img/` from a CDN.

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

### Phase D — Refresh pipeline (NEXT — all 4 pages now wired)
- Adapt `refresh_prices.py` / `refresh_market.py` / `refresh_global.py` to also emit
  JSON into `public/data/`, or add a tiny endpoint the React refresh buttons call.
- Re-enable a **scale-consistent** live-turnover merge in `makeBenchCtx` (currently
  live turnover is intentionally not merged — see the Market data-accuracy note).

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
tabular-numeric financial figures; font stack is Inter → system-ui (Inter not yet
self-hosted — add woff2 to `public/` if desired). Keep charts on the same palette
(thin lines, soft grid `--color-border` at low alpha, rounded bars).

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

- v1 data files are `.js` that assign `window.*` — they must be sandboxed/evaluated to
  convert, not JSON-parsed.
- Two near-identical security modals in v1 (`secmodal.js`, page-2 `#smodal`) — unify.
- Embassy is a special case in several places (structure = static PNG; annexure = image
  mode; chart 2 has extra TechVillage fair-value lines).
- Large JSON must be code-split / fetched, not bundled, to keep the initial load fast.
- The refresh buttons only work when `serve.py` is running (proxied in dev).
- Node modules and build output are gitignored inside `dashboard_v2/`.

---

## 10. Changelog

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
