# Indian REITs & InvITs Dashboard

A dashboard analysing India's listed REITs (Embassy, Mindspace, Brookfield, Nexus,
Knowledge Realty Trust, Bagmane), InvITs (NHIT, Raajmarg, PGInvIT), and global REIT
markets.

> **Two versions.** The current app is **v2** — a React SPA that runs on npm alone with
> one-click live refresh — on the **`v2` branch** in [`dashboard_v2/`](dashboard_v2).
> **Its setup and run instructions live in [`dashboard_v2/README.md`](dashboard_v2/README.md).**
> The original v1 app (below) is the vanilla-JS/Python version on `main`; it stays as the
> data source of truth.

---

## v1 (this branch, `../dashboard/`)

A local, static-file dashboard that runs entirely in the browser off local JS data files,
with an optional Python refresh server for live prices.

### Run it

```bash
cd dashboard
python3 serve.py          # opens http://localhost:8742/dashboard.html
```

The **Refresh** button fetches live prices/volumes via `refresh_prices.py`,
`refresh_market.py`, and `refresh_global.py` (yfinance + curl_cffi, jugaad-data
fallback). Block/bulk deals are curated in `data.js` (run `python3 refresh_blocks.py`
to attempt a live NSE/BSE pull).

### Pages

- `dashboard.html` — Domestic REITs (per-REIT: price vs NAV, issuances + FV/BV accretion,
  AUM, NDCF vs revenue, yield, capital structure, SPV/asset table, structure, filings).
- `market.html` — INDIAN REITs Market (benchmarks, GoI 10Y, FDs, snapshots, ADTV).
- `invits.html` — InvITs.
- `global.html` — Global REIT markets.

### Key data files

- `data.js` — per-REIT financials, quarterly series, SPV/asset tracker, blocks, issuances.
- `val_hy.js` — half-yearly headline valuations (GAV) per REIT + Embassy TechVillage.
- `bench.js` / `bench_live.js` — benchmark & price history.
- `annexdata.js` / `annex_images.js` — parsed annexures + cropped valuation-table images.
- `../Indian_REITs_Asset_SPV_Tracker.xlsx` — source asset/SPV tracker (data.js is derived).
- `../Indian_REITs_Key_Financials_FILLED.xlsx` — source annual financials.

### Not in this repo

Source regulatory filings (the `Embassy/`, `MindSpace/`, `Brookfield/`, `Nexus/`, `KRT/`,
`Bagmane/` PDF folders, ~2.5 GB) are git-ignored — they're static inputs kept on local disk.
The committed dashboard data/images are derived from them, so the app runs from a clone.
