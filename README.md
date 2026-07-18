# Indian REITs & InvITs Dashboard

An interactive dashboard analysing India's listed REITs (Embassy, Mindspace, Brookfield,
Nexus, Knowledge Realty Trust, Bagmane), InvITs (NHIT, Raajmarg, PGInvIT), and the global
REIT markets.

The app is **v2** — a self-contained React SPA (Vite · TypeScript · Tailwind · Chart.js)
that runs on npm alone with one-click live data refresh. It lives in
[`dashboard_v2/`](dashboard_v2).

## Setup & run

**Everything — requirements, quick start, refresh, build, and project structure — is in
[`dashboard_v2/README.md`](dashboard_v2/README.md).** In short:

```bash
cd dashboard_v2
npm install
npm run dev        # → http://localhost:5273
```

## This repo

- [`dashboard_v2/`](dashboard_v2) — the dashboard app (source of truth for how to run it).
- Provenance / source-data files at the root — the workbooks and notes the committed
  data is derived from:
  - `REIT_Tableau_Ready_1.xlsx` — benchmark/market workbook (data source of truth).
  - `Indian_REITs_Asset_SPV_Tracker.xlsx` — asset/SPV tracker.
  - `Indian_REITs_Key_Financials_FILLED.xlsx` — annual financials.
  - `Indian REITs - Visualizaed.docx` — Tableau exhibit screenshots.
  - `REIT_data_gaps.md`, `REIT_workbook_notes.md` — working notes.

### Not in this repo

Source regulatory filings (the `Embassy/`, `MindSpace/`, `Brookfield/`, `Nexus/`, `KRT/`,
`Bagmane/` PDF folders, ~2.5 GB) are git-ignored — static inputs kept on local disk. The
committed dashboard data and images are derived from them, so the app runs from a clone.

### History

An earlier vanilla-JS + Python implementation (**v1**) remains frozen on the **`main`**
branch. The `v2` branch is the current app and no longer depends on it.
