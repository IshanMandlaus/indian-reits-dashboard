# Indian REITs Dashboard — v2

Version 2 rebuild of the Indian REITs dashboard, on the `v2` branch of
[indian-reits-dashboard](https://github.com/IshanMandlaus/indian-reits-dashboard).

**Stack:** Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router · Chart.js
(via react-chartjs-2). Refined dark theme.

The v1 app (vanilla JS + Chart.js) lives in [`../dashboard/`](../dashboard) on `main`
and remains the source of truth for data and functionality while v2 is built out.

## Develop

```bash
npm install
npm run dev        # http://localhost:5273
```

For the live-refresh buttons in dev, also run the v1 Python helper
(`python3 ../dashboard/serve.py`) — Vite proxies `/refresh*` to it (port 8742).

## Structure

```
src/
  router.tsx              # 4 routes under a shared AppShell
  components/layout/       # AppShell (top nav + outlet)
  components/ui/           # Card, Badge, PageHeader, KPI, chart wrappers
  pages/                   # DomesticReits, Market, InvITs, Global
  lib/                     # formatters, data loaders
```

## Data

The v1 `window.*` globals (`data.js`, `bench.js`, `global_data.js`, …) are being
converted to static JSON and loaded per-route. The Python refresh scripts
(`refresh_*.py`) are retained and adapted to emit JSON.

## Status

Scaffold + design system + app shell + routed page skeletons in place. Chart wiring
and data layer in progress.
