// Half-yearly headline valuations (GAV, ₹ cr) parsed from each REIT's valuation reports.
// Used to plot fair-value/unit at half-yearly (Sept + March) granularity on chart 2,
// and to trace single-asset accretion (Embassy TechVillage = tv).
// d = as-of date; gav = total portfolio market value (₹ cr); tv = Embassy TechVillage market value (₹ cr).
window.REIT_VAL_HY = {
  embassy: [
    {d:"2020-03-31", gav:33168},
    {d:"2020-09-30", gav:33737},
    {d:"2021-09-30", gav:47540, tv:11322},
    {d:"2022-03-31", gav:49367, tv:11654},
    {d:"2022-09-30", gav:50842, tv:11978},
    {d:"2023-03-31", gav:51414, tv:12299},
    {d:"2025-03-31", gav:61163, tv:14040},
    {d:"2025-09-30", gav:63980, tv:14926},
    {d:"2026-03-31", gav:70540, tv:16625}
  ],
  brookfield: [
    {d:"2021-03-31", gav:11481},
    {d:"2021-09-30", gav:11660},
    {d:"2022-03-31", gav:16036},
    {d:"2022-09-30", gav:16356},
    {d:"2023-03-31", gav:16373},
    {d:"2023-09-30", gav:28488},
    {d:"2024-09-30", gav:36847},
    {d:"2025-03-31", gav:38123},   // reconstructed (no printed consolidated total in that report)
    {d:"2025-09-30", gav:39602},
    {d:"2026-03-31", gav:56528}
  ],
  nexus: [   // REIT economic-interest share
    {d:"2023-09-30", gav:24353},
    {d:"2024-03-31", gav:25393},
    {d:"2024-09-30", gav:25836},
    {d:"2025-03-31", gav:27533},
    {d:"2026-03-31", gav:30558}
  ],
  mindspace: [   // 100% asset market value (Mar-2023 report incomplete → omitted)
    {d:"2020-09-30", gav:24008},
    {d:"2021-03-31", gav:24547},
    {d:"2021-09-30", gav:25695},
    {d:"2022-03-31", gav:26400},
    {d:"2022-09-30", gav:27282.9},   // audit fix: Q2FY23 deck SoNA row A = 272,829 mn (was 27616, unsourced)
    {d:"2023-09-30", gav:28671},
    {d:"2024-03-31", gav:29932},
    {d:"2024-09-30", gav:31355},
    {d:"2025-03-31", gav:36654},
    {d:"2026-03-31", gav:47638}
  ],
  krt: [   // 100% market value; KRT listed Aug-2025
    {d:"2025-09-30", gav:64551},
    {d:"2026-03-31", gav:67411}
  ]
};
