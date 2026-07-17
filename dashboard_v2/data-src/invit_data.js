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
      // Quarterly independent-valuation NAV/unit history — NHIT Feb-2026 investor
      // presentation, slide 10 "Consistent performance" (nhit.co.in); last point =
      // the FY26 (Mar-2026) EY valuation already used for `nav` above.
      nav_hist: [
        ["2021-11-30", 101.0], ["2022-03-31", 106.7], ["2022-10-31", 109.3],
        ["2022-12-31", 113.5], ["2023-03-31", 116.5], ["2023-09-30", 119.5],
        ["2023-12-31", 122.9], ["2024-03-31", 124.8], ["2024-06-30", 126.4],
        ["2024-09-30", 131.1], ["2025-02-28", 131.9], ["2025-03-31", 133.9],
        ["2025-06-30", 137.3], ["2025-12-31", 145.8], ["2026-03-31", 152.44]
      ],
      note: "NHAI's flagship InvIT — the government's road-monetisation vehicle. Concessions run 20–30 years.",
      color: "#45b5b5"
    },
    {
      key: "riit", name: "Raajmarg Infra Investment Trust (RIIT)", nse: "RIIT",
      sponsor: "National Highways Authority of India (NHAI)",
      sector: "Toll roads",
      listed: "24 Mar 2026",
      assets: "5 toll roads · 260.2 km · Jharkhand, AP, TN, Karnataka (Golden Quadrilateral sections)",
      ev_cr: 9299,             // independently assessed EV ₹9,298.7 cr at IPO (Mar-2026); issue size was ₹6,000 cr
      nav: 100,                // issue price reference; first NAV pending
      nav_hist: [["2026-03-31", 100]], // ₹99–100 IPO band; first independent valuation not yet published
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
      nav: 90.79,              // NAV at fair value, 31 Mar 2026 — FY25-26 annual report, Statement of Net Assets at Fair Value (pginvit.in)
      // Fair-value NAV/unit at each FY-end, from the ARs' "Statement of Net Assets
      // at Fair Value" (consolidated): FY22 AR p118, FY23 disclosure ₹86.04,
      // FY25 AR p121 (94.12 / prior-yr 85.28), FY26 AR p66 (90.79). First point =
      // May-2021 IPO price ₹100. FY23 impairment of SPV investments drove the drop.
      nav_hist: [
        ["2021-05-14", 100], ["2022-03-31", 101.07], ["2023-03-31", 86.04],
        ["2024-03-31", 85.28], ["2025-03-31", 94.12], ["2026-03-31", 90.79]
      ],
      last_dpu: "₹3.00 (Q1 FY27)",
      dpu_fy26: 12.0,
      px_ref: 93,              // implied by ~12.9% yield on ₹12 DPU
      note: "Only listed power-transmission InvIT. Availability-based revenues (no traffic risk) — bond-like cash flows, ~12.9% trailing yield.",
      color: "#7fb4d9"
    }
  ]
};
