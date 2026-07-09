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

### Phase B — Domestic REITs page (most complex; good end-to-end reference)
9 sections per REIT (see §8 for data): (1) Price vs NAV + DPU bars, (2) Issuances vs
NAV with fair/book-value lines + markers, (3) AUM FV vs BV grouped bars, (4) NDCF vs
Revenue with FY/quarterly toggle, (5) Distribution yield line with toggle, (6) Capital
structure doughnut → click-to-drill year bars, (7) SPV/asset table (row-click → annexure
modal), (8) native REIT structure diagram (Embassy = static PNG), (9) PDF links.
Plus the **annexure modal** (image mode for Embassy via `ANNEX_IMAGES`; page-image +
extracted-text mode for others via `ANNEXURES`/`ANNEXDATA`).

### Phase C — Market, InvITs, Global
- Reusable **`<TimeSeriesChart>`** (range bar 6M/1Y/3Y/5Y/All + zoom/pan + y-rescale).
- Reusable **`<SecurityModal>`** — unify v1's duplicated `secmodal.js` and page-2
  `#smodal` into ONE component (range buttons, gradient line, metrics grid, profile).
- Market: snapshot cards + sparklines, combined-vs-benchmark charts, area, volume, dist-vs-FD.
- InvITs: snapshot cards, unit price, rebased (basket ↔ own-life toggle), yield, EV.
- Global: two pies with slice drilldown (market cap → top REITs; AUM → sectors),
  country panels with live quotes, case studies, Temasek deep-dive.

### Phase D — Refresh pipeline
- Adapt `refresh_prices.py` / `refresh_market.py` / `refresh_global.py` to also emit
  JSON into `public/data/`, or add a tiny endpoint the React refresh buttons call.

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

- **2026-07-09** — Created `v2` branch. Scaffolded Vite+React+TS+Tailwind. Built refined
  dark design system, AppShell nav, UI primitives, formatters, and routed skeletons for
  all 4 pages. Verified in browser (:5273), typecheck clean. Commit `abfb4af`.
- **2026-07-09** — **Phase A (data layer) done.** Added `scripts/convert-data.mjs`
  (`npm run data`) → all 14 v1 globals as `public/data/*.json`; TS types in
  `src/types/data.ts`; cached loader `src/lib/data.ts` + hook `src/lib/useDataset.ts`;
  `public/img` symlink to v1 images. tsc + oxlint clean; JSON & images verified served
  in dev. **Next:** Phase B (Domestic REITs page) — start wiring `useDataset('reit-data')`
  into `DomesticReitsPage`, and extract the shared `<TimeSeriesChart>` / Chart.js theme.
