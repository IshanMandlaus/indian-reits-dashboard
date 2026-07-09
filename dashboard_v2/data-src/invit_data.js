// Page 3 — InvIT fundamentals (researched 7 Jul 2026; sources in AUDIT.md)
window.INVIT = {
  asof: "7 Jul 2026",
  trusts: [
    {
      key: "nhit", name: "National Highways Infra Trust (NHIT)", nse: "NHIT",
      sponsor: "National Highways Authority of India (NHAI)",
      sector: "Toll roads (TOT monetisation)",
      listed: "Nov 2021",
      assets: "26 operating toll roads · 2,345 km · 12 states",
      ev_cr: 56988,            // FY26 valuation (Feb-2026 investor presentation)
      nav: 152.44,             // pre-distribution NAV/unit, latest FY26 valuation
      last_dpu: "₹1.97 (Feb–Mar 2026)",
      dpu_fy26: 8.07,          // sum of FY26 distributions declared (approx — verify)
      px_ref: 167.95,          // 30 Jun 2026 reference close
      note: "NHAI's flagship InvIT — the government's road-monetisation vehicle. Concessions run 20–30 years.",
      color: "#45b5b5"
    },
    {
      key: "riit", name: "Raajmarg Infra Investment Trust (RIIT)", nse: "RIIT",
      sponsor: "National Highways Authority of India (NHAI)",
      sector: "Toll roads",
      listed: "24 Mar 2026",
      assets: "5 toll roads · 260.2 km · Jharkhand, AP, TN, Karnataka (Golden Quadrilateral sections)",
      ev_cr: 6000,             // ≈ issue size ₹6,000 cr @ ₹100 (public InvIT IPO Mar-2026)
      nav: 100,                // issue price reference; first NAV pending
      last_dpu: "First distribution pending (listed Mar-26)",
      dpu_fy26: null,
      px_ref: 100,
      note: "NHAI's second (and first public-IPO) InvIT — Chennai Bypass, Chennai–Tada, Chilakaluripet–Vijayawada, Gorhar–Barwa Adda, Neelmangla–Tumkur.",
      color: "#e8a86a"
    },
    {
      key: "pginvit", name: "PowerGrid Infrastructure Investment Trust (PGInvIT)", nse: "PGINVIT",
      sponsor: "Power Grid Corporation of India",
      sector: "Power transmission",
      listed: "May 2021",
      assets: "5 inter-state transmission SPVs (~3,699 ckm lines, 11 substations)",
      ev_cr: 10200,            // approx enterprise value; mcap ₹8,627 cr
      nav: 98.5,               // approx latest NAV/unit — verify from FY26 valuation report
      last_dpu: "₹3.00 (Q1 FY27)",
      dpu_fy26: 12.0,
      px_ref: 93,              // implied by ~12.9% yield on ₹12 DPU
      note: "Only listed power-transmission InvIT. Availability-based revenues (no traffic risk) — bond-like cash flows, ~12.9% trailing yield.",
      color: "#7fb4d9"
    }
  ]
};
