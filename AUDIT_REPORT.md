# Dashboard Numbers Audit — Charts vs Source Filings

**Date:** 16 Jul 2026 · **Branch:** `v2-redesign` · **Scope:** every hand-entered number feeding the dashboard's charts, verified page-by-page against the primary documents on disk (annual reports, condensed financial statements, valuation reports, earnings decks, RHPs), plus web verification for hardcoded benchmark constants.

## 1. Executive summary

**2,141 values audited. 1,811 matched the filings exactly; 112 were rounding-level; 62 confirmed misstatements were found and fixed; 16 further values were corrected for series/basis consistency.** Every reported misstatement was independently re-confirmed by a second verification agent re-reading the cited page before anything was changed.

| Final verdict | Count |
|---|---|
| Match | 1,811 |
| Rounding-level (within tolerance) | 112 |
| **Confirmed mismatch → fixed** | **64** (2 of which turned out to be auditor misquotes — see §6 — so 62 real) |
| Basis difference (16 fixed for series consistency, 39 documented as-is) | 55 |
| Unverifiable from local documents | 56 |
| Known gaps (issuer never disclosed) | 43 |

**The biggest chart-distorting issues found:**

1. **Brookfield NAV (Charts 1, 2, 7, 8):** FY2024–26 NAV had silently switched from fair-value basis (used FY2021–23) to book-value — showing a fake ~30% NAV collapse and inflating Brookfield's apparent P/B. Fixed to the issuer's fair-value NAV (FY24 332.60, FY25 336.35, FY26 386.66 — "Net asset value as of March 31, 2026 stood at ₹386.66 per unit", FY25-26 AR).
2. **Nexus quarterly placeholders (Charts 4, 5):** several FY26 quarterly NDCF/DPU values were stale even-split estimates rather than the actually-disclosed figures, and Q3FY26 PAT had a dropped leading digit (39.4 vs 139.40 cr).
3. **Nexus maintenance revenue (Chart 4):** FY2024/FY2025 `rev_maint` had pulled the *Marketing Income* line (94 / 110.22 cr) instead of *Maintenance Services* (351.78 / 420.07 cr) from FS Note 35.
4. **Mindspace FY26 basis break (Charts 3, 3b, 5, 9):** FY2026 GAV was the 100%-gross pre-NCI total (49,711.61 cr) while FY2021–25 are attributable-to-unitholders; fixed to 47,634.97 cr (which also makes the SPV table sum reconcile exactly). Mindspace `networth` similarly switched to include NCI from FY2024 — fixed back to attributable.
5. **Brookfield FY2026 leverage (Chart 6b):** LTV shown 30.9% vs the company's four-source 34.0%, and cost of debt 8.05% from a stale third-party report vs the company's own 7.3%.
6. **Mindspace quarterly DPUs FY26 (Chart 1):** all four quarters were distribution÷flat-units derivations (5.60/5.64/6.00/6.84) instead of the declared DPUs (5.79/5.83/5.83/6.64) — annual total matched, quarterly shape was wrong.
7. **Embassy FY2022 GAV (Charts 3, 3b, 5):** 49,007.8 cr was the corporate-snapshot NAV-table figure; the audited Statement of Net Assets (the basis used for flanking years, corroborated 4×) says 49,367.4 cr.
8. **Benchmark G-Sec line (Market & InvIT pages):** the 1-Jul-2025 step was 6.55% vs actual ~6.30% (10Y yields hit multi-year lows after RBI's Jun-2025 50bp cut).

**Not audited (by design):** live-fetched market data (prices, holdings, index yields — sourced from NSE/BSE/Yahoo at refresh time), `price-history.json` (exchange CSVs), and `global.json` (self-declared editorial estimates — order-of-magnitude web check only, one flag noted in §5). **InvITs (NHIT, RIIT, PGInvIT) were skipped per your decision** — their `invit.json` values (EV, NAV, nav_hist, FY26 DPU) remain **unverified** until you add the filing PDFs locally; the inline citations in `data-src/invit_data.js` say where each came from.

## 2. Method

- **Citation index:** the 903 page-cited source comments in `Indian_REITs_Key_Financials_FILLED.xlsx` + `REIT_AUM_MSF_sources/` + `REIT_IPO_Snapshot_sources/` told agents where to look; every number was verified against the actual PDF (pdftotext page-targeted extraction, visual page rendering for scanned/mangled tables), never against the comment.
- **Fan-out:** 40 extraction agents (one per REIT × metric family: P&L/NDCF/distributions, balance sheet/leverage, GAV & area, SPV asset tables, issuances/IPO facts, quarterly series, plus constants & global web checks).
- **Adversarial verification:** every flagged row went to an independent verifier instructed to *refute* it (checking standalone-vs-consolidated, ₹mn↔₹cr, restatements, wrong-FY-column, printed-vs-physical page offsets, REIT-share vs 100% basis, declared-vs-paid distributions). 20 of 89 flags were refuted or downgraded; only verifier-confirmed items were fixed.
- **Guard rails:** every edit asserted the current file value first — this caught 2 extractor misquotes (§6) where no error actually existed. `data-src` masters edited, `public/data` regenerated via `npm run data`, arithmetic cross-checks re-run, dashboard reloaded and spot-checked.
- Consolidated statements only; the year's own filing preferred over later restatements (restatements noted).

## 3. Confirmed misstatements — corrected

Every row was found by an extraction agent reading the cited filing, then independently re-confirmed by a second agent instructed to refute it. All are now fixed in `dashboard_v2/data-src/` (regenerated into `public/data/`).

### Embassy Office Parks REIT

| Metric | Period | Was | Corrected to | Source (doc · page) | Note |
|---|---|---|---|---|---|
| gav | FY2022 | 49007.8 | 49367.4 | final_annual_report.pdf · p128 | UPHELD. Dashboard's 490,078 mn is the Corporate Snapshot NAV-table GAV (physical p.32/printed p.30). The audited MD&A Statement of Net Assets at Fair Value (physical p.128/printed p.125) shows GAV=49… |
| rev | Q1FY20 | 473.8 | 535.10 | condensed-consolidated-financial-statements_1.pdf · p5 | Independently confirmed. P&L (phys p5) Revenue from operations Q/E 30-Jun-2019 = Rs.5,351.04mn = 535.10cr. Dashboard 473.8 = Commercial Offices SEGMENT rev-from-ops Rs.4,738.22mn (segment note total … |
| rev_maint | Q4FY21 | 74.3 | 112.66 | embassy_reit_consolidated_financial_statement_1qfy2022.pdf · p44 | Confirmed. Note 31 (phys p44) Maintenance services, Q/E 31-Mar-2021 col = Rs.1,126.61mn = 112.66cr; sibling cols Q1FY22 1,197.25(=119.7 match), Q1FY21 338.58(=33.9 match), FY21 2,547.77 all reconcile… |

### Mindspace Business Parks REIT

| Metric | Period | Was | Corrected to | Source (doc · page) | Note |
|---|---|---|---|---|---|
| rev_rental | FY2021 | 925.3 | Note 32 Facility rentals 9,024 Rs mn = 902.4 cr | 1st-Annual-Report-2020-21-of-Mindspace-REIT.pdf · p122 | Independently confirmed. FS Note 32 (Consolidated, physical p.122) discloses Facility rentals 9,024 Rs mn = 902.4 cr; dashboard 925.3 is +22.9 cr (+2.54%), outside tolerance. Dashboard reproduces exa… |
| rev_maint | FY2021 | 171.9 | Note 32 Maintenance services 1,665 Rs mn = 166.5 cr | 1st-Annual-Report-2020-21-of-Mindspace-REIT.pdf · p122 | Independently confirmed. FS Note 32 (Consolidated, physical p.122) discloses Maintenance services 1,665 Rs mn = 166.5 cr; dashboard 171.9 is +5.4 cr (+3.24%), outside tolerance. Dashboard reproduces … |
| msf_total | FY2026 | 38.2 | 39.3 MSF Total Leasable Area as at 31-Mar-2026 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf (snapshot); c… · p5 | Dashboard used stale H1 FY26 (30-Sep-2025) interim 38.2 from Mindspace-HYR-2025-26-1.pdf; the year's own year-end filing shows 39.3. Diff 1.1 msf > 0.1 tol. Prior finding upheld. |
| msf_op | FY2026 | 31 | 32.0 MSF Completed Area as at 31-Mar-2026 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf (snapshot); c… · p5 | Same staleness as msf_total: dashboard used H1 FY26 (30-Sep-2025) interim 31.0 from HYR; year-end shows 32.0. Diff 1.0 msf > 0.1 tol. Prior finding upheld. |
| val_hy_gav | 2022-09-30 | 27616 | 272,829 mn = 27,282.9 cr (Fair Value of Real Estate Assets,… | Investor-Presentation_Q2-FY2023-Final.pdf, Statement of Net Assets at… · p10 | Independently confirmed 272,829mn on Q2FY23 deck p.10 (row A Fair Value of Real Estate Assets); Total Portfolio Market Value INR 273 Bn. The value 276,160mn implied by dashboard 27616 appears in NO t… |
| Sustain — Commerzone Raidurg: mkt_rent | FY2026 | null | INR 105 /psf/mo (Market/Marginal Rent) | MindSpace/Valuation-Report-q4FY26.pdf · p283 | Exec-summary key-assumptions table (physical p.283) discloses Market/Marginal Rent INR105/psf/mo; in-place 69.1. Also §7.4 market assumptions. Dashboard null is missing a clearly disclosed value. Pri… |
| Horizonview — Commerzone Porur: wale | FY2026 | null | 8.1 yrs | MindSpace/Valuation-Report-q4FY26.pdf · p1119 | Lease Expiry Analysis (physical p.1119) states verbatim: 'The WALE of the Project is 8.1 years.' Cleanly disclosed; dashboard null confirmed as mismatch. Slice note 'not cleanly captured' is incorrec… |
| bv.FY2024.ipud | FY2024 | 672.67 | 1456.7 cr (14,567 mn) | Mindspace-Business-Parks-REIT-Annual-Report-2023-24.pdf · p161 | Confirmed mismatch. FY24 AR p161 BS: IPUD as at 31-Mar-24 = 14,567 mn = 1,456.7 cr; FY25 AR p190 shows FY24 comparative 14,567.35 mn and FY25 IPUD 6,726.74 mn = 672.67 cr. Dashboard duplicated FY25's… |
| bench_overview.uc_msf | Q4FY26 | 4.4 | 5.4 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p65 | Confirmed. AR26 p65 (and p4 Performance Snapshot): 39.3 MSF = 32 completed, 5.4 under construction, 1.9 future, as of 31-Mar-26. Q4FY26 IP concurs (5.4 msf UC). UC/future off by 1.0 msf; total 39.3 s… |
| bench_overview.future_msf | Q4FY26 | 2.9 | 1.9 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p65 | Confirmed. AR26 p65/p4 and Q4FY26 IP: 1.9 MSF future development as of 31-Mar-26. Dashboard 2.9 overstates by 1.0 msf (mirror of the UC understatement). |
| bench_overview.sponsor | latest | K Raheja Corp Group (backed by Blackstone) | K Raheja Corp Group only (Raheja-family entities: Anbee, Ca… | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p125 | Confirmed. AR26 p125 Sponsors + Sponsor Group tables list only Raheja-family entities; no BREP/Blackstone. Blackstone was a unitholder that fully exited its 9.2% to ADIA in Jan-2022; AR26's two Black… |
| bench_overview.occupancy | Q4FY26 | 0.93 | 0.909 occupied / 0.940 committed incl-Pocharam / 0.957 comm… | Investor-Presentation_Q4-FY26.pdf · p58 | Confirmed. Q4FY26 IP p58 portfolio table: 90.9% occupied, 94.0% committed; p5 headline 95.7% committed ex-Pocharam; AR26 p60 footnote confirms 94.0% incl / 95.7% excl Pocharam. None round to 93%. 93.… |
| dpu | Q1FY26 | 5.6 | 5.79 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p125 | AR Distribution History table: Board 4-Aug-2025 (qtr ended 30-Jun-25) = Rs.5.79 p.u. (Div 3.19 + Int 0.10 + OthInc 0.03 + RepCap 2.47). Corroborated Investor-Presentation_Q1FY26-1.pdf p.13 ('DPU 5.79… |
| ndcf | Q2FY26 | 357 | 364.5 | Investor-Presentation_Q2-FY26.pdf · p15 | NDCF Build-up Q2 FY26: NDCF (REIT Level) = Rs.3,645mn = 364.5cr. Dashboard tracks NDCF(REIT Level)/10 exactly for the other FY26 quarters (Q1 358.5=3585, Q3 379.8=3798, Q4 433.5=4335), so 364.5 is th… |
| dpu | Q2FY26 | 5.64 | 5.83 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p125 | AR Distribution History: Board 5-Nov-2025 (qtr ended 30-Sep-25) = Rs.5.83 p.u. (3.02+0.03+0.01+2.77). Corroborated Investor-Presentation_Q2-FY26.pdf p.14 ('DPU 5.83 p.u.'). Dashboard 5.64 = Distribut… |
| dpu | Q3FY26 | 6 | 5.83 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p125 | AR Distribution History: Board 27-Jan-2026 (qtr ended 31-Dec-25) = Rs.5.83 p.u. (3.12+0.05+2.66). Corroborated Investor-Presentation_Q3-FY26-1.pdf p.14 ('DPU 5.83 p.u.'). Post preferential issue unit… |
| dpu | Q4FY26 | 6.84 | 6.64 | Mindspace-Business-Parks-REIT-Annual-Report-2025-26.pdf · p168 | AR subsequent-events note: 'distribution to unitholders of Rs.6.64 per unit which aggregates to Rs.4,305.00 Mn for the quarter ended March 31, 2026'. Corroborated Investor-Presentation_Q4-FY26.pdf p.… |

### Brookfield India Real Estate Trust

| Metric | Period | Was | Corrected to | Source (doc · page) | Note |
|---|---|---|---|---|---|
| dist_total | FY2022 | 740.48 | 685.66 (₹6,856.57mn = Jun'21 1,816.81 + Sep'21 1,816.81 + D… | Annual_Report_FY_22_75fdca8d39.pdf · p103 | CONFIRMED mismatch. AR FY22 p103 discloses all four board-declared quarterly distributions summing to 6,856.57mn = 685.66cr; per-unit 6.00+6.00+5.00+5.10 = exactly 22.10 (the correct DPU). Dashboard … |
| dist_total | FY2024 | 779.4 | 774.49 (₹7,744.90mn / ₹17.75 per unit) | Annual_Report_FY_24_98f6fd26a0.pdf · p127 | CONFIRMED mismatch. AR FY24 p127 states verbatim: 'cumulative distribution for the year ended 31 March 2024 aggregates to Rs. 7,744.90 million/ Rs. 17.75 per unit' = 774.49cr. Dashboard 779.4 = DPU 1… |
| ltv | FY2025 | 0.2972 | Company LTV = 28.11% (Net Borrowings Ratio D/E, p.45); AR N… | Consolidated_Financial_Results_Q4_2026_065e5df741.pdf · p45 | Confirmed mismatch. 29.72% appears in no document; internally inconsistent basis (JV-incl net debt / non-grossed assets, undercut cash-netting) sits 1.6pp above the company's uniform 28.1%. |
| ltv | FY2026 | 0.3088 | Company LTV = 34.02% (Net Borrowings Ratio D/E, p.45; AR ke… | Consolidated_Financial_Results_Q4_2026_065e5df741.pdf · p45 | Confirmed mismatch. Dashboard mixes proportionate net debt with 100%-inclusive GAV, understating LTV 3.1pp vs the company's four-source 34.0%. |
| cost_debt | FY2026 | 0.0805 | Company Q4FY26 investor deck 'Cost of Debt' Sub-Total = 7.3… | BIRET_Q4_FY_2026_Investor_Presentation_d39ed0af9f.pdf · p37 | Confirmed mismatch. Dashboard sourced a stale Dec-2025 third-party analyst figure instead of the company's own 31-Mar-2026 deck (7.3%). Prior years were deck-sourced; 0.75pp overstatement. |
| msf_total | FY2026 | 32.43 | Valuation Summary TOTAL row (31-Mar-2026): Completed 32.43 … | Brookfield/Summary_Valuation_Report_FY_2026_8284e7236d.pdf · p14 | Independently confirmed on physical p14 TOTAL row. Dashboard's 32.43 is the Completed (operational) figure — identical to msf_op FY2026 — not the Total. Every other year sums op+UC+futuredev; FY2026 … |
| Ecoworld · cap_rate | FY2026 | 0.08 | 7.75% | Summary_Valuation_Report_FY_2026_8284e7236d.pdf · p75 | CONFIRMED. Physical p75 (printed Page 74), sec 4.13.6 Key Assumptions for Ecoworld Bengaluru @31-Mar-2026: Cap Rate 7.75%. Same table's Mkt Rent 114 / Effective Rent 100 / MV INR 148,279 Mn (=14,827.… |
| issuance: Preferential allotment (consideration, SDPL Noida) | 2022-06 (dashboard) / actual 2022-01 | 15.46mn @ ₹294.25 = ₹454.9cr, dated 2022-06 'Second tranche FY23' | FY22 AR p66: 'Allotment of 15,463,616 units of Brookfield I… | Brookfield/Annual_Report_FY_22_75fdca8d39.pdf · p66 | Independently confirmed: units/price/proceeds match but DATE is 24-Jan-2022 (FY2022), not June 2022/FY23. Sibling cash tranche of 16,821,856 units was allotted 17-Jan-2022 (=dashboard's 2022-01 entry… |
| bv.goodwill | FY2022 | 237.39 | No goodwill value in FY22 AR (full-text search: only accoun… | Brookfield/Annual_Report_FY_22_75fdca8d39.pdf · pn/a (absent) | Confirmed nil. The ₹237.39cr (₹2,373.89mn) is Rostrum JV goodwill inside the equity-method carrying value; Rostrum acquired 21-Jun-2024 (FY2025). Carried back in error — should be null like FY2021. |
| bv.goodwill | FY2023 | 237.39 | No goodwill value in FY23 AR (full-text search: only accoun… | Brookfield/Annual_Report_FY_23_0f8b53ea54.pdf · pn/a (absent) | Same carry-back error as FY2022. Rostrum JV (source of the ₹237.39cr) not acquired until Jun-2024. Should be null. |
| bv.goodwill | FY2024 | 237.39 | FY25 AR note 47 (Rostrum JV), p246: 'Goodwill on acquisitio… | Brookfield/Brookfield_Indian_REIT_Annual_Report_2024_25_04c607d8c7.pdf · p246 | Confirmed nil at FY2024 year-end. Rostrum acquired 21-Jun-2024 (after 31-Mar-2024); FY25 AR explicitly shows '—' for the FY2024 comparative. Should be null, not 237.39. |
| bench_overview.ipo (listing date) | current | 2021-02-01 | 'Units of Brookfield India REIT were listed on both NSE and… | Brookfield/First_Annual_Report_FY_21_c99b648f1a.pdf · p5 | Confirmed actual listing = 16-Feb-2021. Dashboard 2021-02-01 is a month-start placeholder, off by 15 days. |
| ndcf | Q1FY25 | 213.5 | NDCF at Trust Level 2,102.61 mn = Rs 210.26 cr (incl surplu… | Condensed_Consolidated_Financial_Statements_June_2024_17ccbc6ffc.pdf · p9 | Independently confirmed 2,102.61 on p9 (and as Q1FY25 comparative on p11 of Consolidated_Financial_Statement_7_nov_2024). Dashboard split H1FY25 total 4,387.44mn by DPU ratio; actual disclosed quarte… |
| pat | Q2FY25 | 20.55 | Profit for the period after tax 252.32 mn = Rs 25.23 cr | Consolidated_Financial_Statement_7_nov_2024_2f204beb6e.pdf · p5 | Q2FY25 (30 Sep 2024) profit after tax = 252.32mn on p5; unchanged 252.32 as comparative in 30-Jan-2025 Q3 filing. Dashboard 20.55 matches no disclosed line (attributable-to-unitholders=332.78mn; tota… |
| ndcf | Q2FY25 | 225.3 | NDCF at Trust Level 2,284.83 mn = Rs 228.48 cr (surplus cas… | Consolidated_Financial_Statement_7_nov_2024_2f204beb6e.pdf · p11 | Confirmed 2,284.83 directly on p11 NDCF-standalone table (H1 total 4,387.44 = Q1 2,102.61 + Q2 2,284.83). Prior auditor's cross-ref to 01_aug_2025 p3 is wrong (that doc's NDCF table shows 30-Jun-2024… |
| rev_ops | Q1FY26 | 650.49 | Revenue from operations 6,416.17 mn = Rs 641.62 cr | Consolidated_Financial_Results_01_aug_2025_458ecabca7.pdf · p2 | Revenue from operations Q1FY26 (30 Jun 2025) = 6,416.17mn on p2 P&L; Earnings_Presentation_01_aug_2025 also states 'Rs 6,416'. Total income = 6,538.35 (653.84). Dashboard 650.49 matches neither line … |

### Nexus Select Trust

| Metric | Period | Was | Corrected to | Source (doc · page) | Note |
|---|---|---|---|---|---|
| rev_maint | FY2025 | 110.22 | 420.074 | Annual-Report-FY2024-25.pdf · p184 | CONFIRMED (cannot refute). Consolidated Note 35 'Revenue from operations' (physical p.184): Maintenance Services FY25 = Rs 4,200.74 Mn = 420.07 cr; Marketing Income FY25 = Rs 1,102.19 Mn = 110.22 cr.… |
| nav | FY2026 | 87.7 | 87.20 (book value; fair value 164.00) | NXST-Consolidated-Financial-Results-Q4-FY26.pdf · p10 | CANNOT REFUTE. Visually confirmed printed book NAV/unit = 87.20 on the Consolidated Statement of Net Assets at Fair Value (p.10): Net Assets 13,210.10cr / 151.50cr units = 87.1954 -> 87.20. Fair-valu… |
| Fiza by Nexus — mkt_rent | FY26 (val 31-Mar-2026) | 86.5 | 59.7 | Detailed-Valuation-Report-Q4-FY26.pdf · p403 | Confirmed. Fiza marginal (market) rent = 59.7 psf/mo (p403 rent table; also stated p401 'approx INR 59.7 psf pm'). Dashboard 86.5 = Nexus Celebration's marginal rent (p383) mis-copied into Fiza row. … |
| Fiza by Nexus — inplace_rent | FY26 (val 31-Mar-2026) | 82.4 | 56.5 | Detailed-Valuation-Report-Q4-FY26.pdf · p403 | Confirmed. Fiza in-place warm-shell rent for leased area = 56.5 psf/mo (p403 rent table, 714,750 leasable / 691,222 leased). Dashboard 82.4 = Nexus Celebration's in-place rent (p383) mis-copied. Prio… |
| blocks: sponsor stake before→after selldown | 2024-08 | 43.1% → 21.3% | 43.13% → 22.30% (opening 653,351,390 units = 43.13%; sold (… | Annual-Report-FY2024-25.pdf (Note 15 unitholder movement); corroborat… · p141 | Before 43.1%≈43.13% OK. After 21.3% is 1.0pp off the audited 22.30% (outside ±0.1pp). 21.3% reflects an inflated ~330mn-unit press deal estimate; audited unit-count reconciles to 22.30%. |
| bv.ipud | FY2025 | null | 2.24 cr (₹22.42mn÷10, FY24-25 AR consolidated BS Note 7; re… | Annual-Report-FY2024-25.pdf; corroborated Annual-Report-FY-2025-26.pdf · p157 | IPUD IS separately disclosed at ₹2.24cr; dashboard 'not separately disclosed' note is false. Not in known_gaps. Should be 2.24, not null. |
| bv.ipud | FY2026 | null | 6.95 cr (Investment properties under development, Note 7, c… | Annual-Report-FY-2025-26.pdf · p233 | IPUD separately disclosed at ₹6.95cr (FY25 comparative 2.24). Dashboard null + 'not disclosed' note contradicted by filing. Should be 6.95. |
| bench_overview.ipo (listing date) | IPO | 2023-05-01 | 2023-05-19 ('listed on the Indian Stock Exchanges on May 19… | Annual-Report-FY-2024.pdf · p2 | Month/year correct; day is 01 vs actual listing 19. Confirmed in FY24 AR intro and distribution period notes. |
| dpu | Q3FY24 | 1.45 | Rs 2.00/unit (Q3FY24 distribution INR 3,030 M, period 1-Oct… | Nexus-Select-Trust_Dec-23_vf.pdf · p25 | Confirmed: deck DISTRIBUTION SUMMARY states 'Q3 FY24 distribution of INR 3,030 M / INR 2.00 per unit'. FY25 AR independently confirms FY24 total 7.075/unit, refuting workbook's 4.99 assumption. Dashb… |
| dpu | Q4FY25 | 1.8 | Rs 2.00/unit (aggregates Rs 3,030.00 Mn; FY25 cumulative Rs… | Annual-Report-FY2024-25.pdf · p132 | AR: qtr ended 31-Mar-25 declared 2.00/unit = 3,030.00 Mn; FY25 total 8.350 = 2.147+2.007+2.196+2.00. Dashboard 1.8 (residual placeholder) wrong; prior auditor correct (Q4 CCFS image-only, verified vi… |
| ndcf | Q2FY26 | 313.8 | NDCF at Trust Level = 3,208.18 mn = 320.818 cr (incl. surpl… | Consolidated-Financial-Results-Q2-FY26.pdf · p10 | Confirmed both bases on NDCF statement (3 months ended 30/09/2025). 313.8 is stale even-split placeholder; excl diff 7.0cr, incl diff 19.5cr, both > 1.57cr tol. |
| dpu | Q2FY26 | 2.28 | Rs 2.198/unit (aggregates Rs 3,329.97 Mn; H1FY26 cumulative… | Consolidated-Financial-Results-Q2-FY26.pdf · p10 | Board declared 2.198/unit on 04-Nov-2025 (note below NDCF stmt). Diff 0.082 > 0.05 tol; 2.28 est-split placeholder stale. |
| pat | Q3FY26 | 39.4 | 139.40 cr | NXST-Consolidated-Financial-Results-Dec-2025-Q3-FY26.pdf · p4 | Confirmed 139.40 cr for 3 months ended 31/12/2025 (PBT 204.19 - tax 64.79); also matches audited Q4FY26 filing preceding-qtr column. Dashboard 39.4 dropped leading '1'. |
| ndcf | Q3FY26 | 313.8 | NDCF at Trust Level = 317.36 cr (incl. surplus = 358.68 cr) | NXST-Consolidated-Financial-Results-Dec-2025-Q3-FY26.pdf · p5 | Confirmed (all amounts Rs. crore); corroborated by Q4FY26 filing preceding-qtr column. Excl diff 3.56cr > 1.57cr tol; stale even-split placeholder. |
| dpu | Q3FY26 | 2.28 | Rs 2.367/unit (aggregates Rs 358.60 cr; 9M cumulative Rs 6.… | NXST-Consolidated-Financial-Results-Dec-2025-Q3-FY26.pdf · p5 | Board declared 2.367/unit on 02-Feb-2026. Diff 0.087 > 0.05 tol; est-split placeholder stale. |
| ndcf | Q4FY26 | 313.8 | NDCF at Trust Level = 339.97 cr (incl. surplus = 345.90 cr) | NXST-Consolidated-Financial-Results-Q4-FY26.pdf · p12 | Confirmed both bases on NDCF statement (3 months ended 31/03/2026). Excl diff 26.2cr >> tol; 313.8 stale even-split placeholder. FY26 cumulative DPU 9.081/unit. |

### Bagmane Prime Office REIT

| Metric | Period | Was | Corrected to | Source (doc · page) | Note |
|---|---|---|---|---|---|
| revenue | FY2023 | null | 1979.312 | Final_Offer_Document (RHP).pdf · p314 | Confirmed RHP p.314 Summary Combined P&L: Revenue from operations FY23 (yr end 31-Mar-2023) 19,793.12 Rs mn = 1979.312 cr (proforma/combined). Dashboard populated FY24/FY25 from same table but left F… |
| rev_rental | FY2023 | null | 1603.094 | Final_Offer_Document (RHP).pdf · p345 | Confirmed RHP p.345: Income from leasing FY23 16,030.94 Rs mn = 1603.094 cr. Directly disclosed; dashboard null. Data gap. |
| rev_rental | FY2024 | null | 1785.113 | Final_Offer_Document (RHP).pdf · p345 | Confirmed RHP p.345: Income from leasing FY24 17,851.13 Rs mn = 1785.113 cr. Dashboard null. Data gap. |
| rev_rental | FY2025 | null | 2000.897 | Final_Offer_Document (RHP).pdf · p345 | Confirmed RHP p.345: Income from leasing FY25 20,008.97 Rs mn = 2000.897 cr. Dashboard null. Data gap. |
| rev_maint | FY2023 | null | 228.676 | Final_Offer_Document (RHP).pdf · p345 | Confirmed RHP p.345: Property maintenance services FY23 2,286.76 Rs mn = 228.676 cr. Dashboard null. Data gap. |
| rev_maint | FY2024 | null | 238.445 | Final_Offer_Document (RHP).pdf · p345 | Confirmed RHP p.345: Property maintenance services FY24 2,384.45 Rs mn = 238.445 cr. Dashboard null. Data gap. |
| rev_maint | FY2025 | null | 257.059 | Final_Offer_Document (RHP).pdf · p345 | Confirmed RHP p.345: Property maintenance services FY25 2,570.59 Rs mn = 257.059 cr. Dashboard null. Data gap. |
| bv.cwip | FY2023 | 4.85 | nil (–) as at 31-Mar-2023 | Final_Offer_Document (RHP).pdf, Summary Combined Balance Sheet · p313 | CWIP nil at 31-Mar-2023 confirmed twice: Summary Combined BS (p313) and CWIP movement Note 5 (opening & closing balance both nil, p550). Dashboard 4.85 has no source line; FY2024's 4.89 correctly = M… |

### Cross-cutting

| Metric | Period | Was | Corrected to | Source (doc · page) | Note |
|---|---|---|---|---|---|
| gsec_step 2025-07-01 | 2025-07-01 | 6.55% | ~6.25-6.31% | FRED INDIRLTLT01STM / TradingEconomics India 10Y benchmark G-Sec (dai… · p | Independently confirmed. India 10Y benchmark hit ~6.22% multi-year low late-Jun 2025 after RBI's 6-Jun 50bp cut; 6.305% on 17-Jul, 6.36% on 28-Jul. On/around 1-Jul it was ~6.25-6.30% — ~0.25pp below … |
| etv_acq_date | 2020-12 | 2020-12-15 | December 24, 2020 | Embassy REIT Annual Report FY2021, note (4) · p27 | Independently confirmed on physical p.27: '(4) ETV was acquired by Embassy REIT on December 24, 2020. The relevant asset SPVs and Holdco... consolidated from December 31, 2020.' Repeated across AR FY… |


## 4. Series-consistency (basis) corrections

These values matched *a* real figure in a filing, but on a different basis than the rest of their own series — which misstates trends on the charts. Corrected to the series-consistent basis; the alternative basis is noted.

| REIT | Metric | Period | Was | Corrected to | Why |
|---|---|---|---|---|---|
| Mindspace Business Parks REIT | networth | FY2024 | 14928.54 | — see §7 fix list | Independently confirmed: dashboard 14928.54 = Total equity incl NCI, not unitholders' equity (14168.9cr). FY21-23 series uses attributable-to-unitholders (16303=163,030mn, 15620.5=156,205, 14782.7=147,827); basis switch… |
| Mindspace Business Parks REIT | networth | FY2025 | 14810.55 | — see §7 fix list | Confirmed: dashboard = Total equity incl NCI, not attributable-to-unitholders (14054.44cr). Same incl-NCI basis as FY24/26, inconsistent with FY21-23 excl-NCI series. Finding upheld. |
| Mindspace Business Parks REIT | networth | FY2026 | 15796.83 | — see §7 fix list | Confirmed: dashboard = Total equity incl NCI, not attributable-to-unitholders (15046.82cr). Continues incl-NCI basis begun FY24. Finding upheld. |
| Mindspace Business Parks REIT | ltv | FY2026 | 0.2365 | — see §7 fix list | Confirmed: dashboard 0.2365 matches neither issuer 24.3% nor AR-GAV naive 24.69%; ties within 0.09pp to internal workbook LTV 0.2374 (verified Summary tab: net debt 11803.31, LTV 0.2374). GAV basis above AR's stated 47,… |
| Mindspace Business Parks REIT | gav | FY2026 | 49711.61 | — see §7 fix list | Number is a real doc figure (100%-gross Total) but wrong basis: series is attributable. FY25 dashboard 36600 = attributable 3,66,472.95mn (NOT 100% 3,82,560.74mn=38,256cr). Q4FY26 deck headline GAV 'INR 476 Bn' defined … |
| Brookfield India Real Estate Trust | nav | FY2024 | 233.57 | — see §7 fix list | Confirmed. Both Book (233.57) and Fair (332.60) columns present. Dashboard switched from fair-value basis (FY21-23) to book value here, creating a spurious ~30% NAV drop. |
| Brookfield India Real Estate Trust | nav | FY2025 | 230.85 | — see §7 fix list | Confirmed. Dashboard uses Book Value column; fair value ~336. Same book-vs-fair basis issue. |
| Brookfield India Real Estate Trust | nav | FY2026 | 233.87 | — see §7 fix list | Confirmed. Book Value 233.87 vs Fair value 386.66. Book-vs-fair basis switch. |
| Brookfield India Real Estate Trust | gav | FY2024 | 30719.83 | — see §7 fix list | Independently re-located: dashboard ties EXACTLY to FS Total Assets at Fair Value (incl cash/other assets). Deck Q4-2024 headline 'Rs 292B GAV' = portfolio-only 292,250 Mn (29,225 cr), 5.1% lower. Dashboard's FY21-23 & … |
| Brookfield India Real Estate Trust | gav | FY2025 | 34031.31 | — see §7 fix list | Independently confirmed: ties EXACTLY to FS Total Assets at Fair Value with North Commercial Portfolio/Rostrum on equity-method (50%) basis + cash. Deck 'Rs 380B Consolidated GAV' grosses NCP to 100% (~38,000 cr); AR202… |
| Nexus Select Trust | dist_total | FY2024 | 755.08 | — see §7 fix list | Downgrade mismatch->basis_difference. Dashboard 755.08 = SOCE 'Distribution to unitholders' Rs 7,550.76 Mn (declared-DURING-year: 3 quarters since May-2023 listing). AR Note 1 (p.133 standalone; p.162 consolidated): dec… |
| Nexus Select Trust | dist_total | FY2025 | 1234.72 | — see §7 fix list | Downgrade mismatch->basis_difference. Dashboard 1234.72 = ratio-note DPU 8.15 x 1,515 Mn units (=12,347.25 Mn). AR Note 1 (p.132 standalone; p.161 consolidated): declared-for-year FY25 = Rs 12,650.25 Mn = 1,265.03 cr / … |
| Nexus Select Trust | dpu | FY2024 | 4.99 | — see §7 fix list | Downgrade mismatch->basis_difference. Dashboard 4.99 ~= 7,550.76 Mn / 1,515 Mn units (declared-during-year, 3 quarters). AR Note 1 (p.133): declared-for-year FY24 DPU = Rs 7.075 (incl Q4 Rs 2.091 declared 09-May-24). Re… |
| Nexus Select Trust | dpu | FY2025 | 8.15 | — see §7 fix list | Downgrade mismatch->basis_difference. Dashboard 8.15 is a genuine published figure: FY26 results doc statutory ratio note '(t) distribution per unit', prev-year (31/03/2025) col = 8.15 (verified in NXST-Consolidated-Fin… |
| Nexus Select Trust | cost_debt | FY2026 | 0.075 | — see §7 fix list | CONFIRM basis_difference. Dashboard 7.5% = issuer's H1 FY26 (Sep-25) Average Debt Cost (Half-Yearly-Report-FY-2026.pdf: 'declined to 7.5%'). FY2026 fiscal-year-end (Mar-26) Average Debt Cost = 7.3% p.a. (AR p.63 infogra… |
| Nexus Select Trust | gav | FY2026 | 30558.3 | — see §7 fix list | CONFIRMED, cannot refute. Dashboard 30558.3 exactly equals DVR portfolio Market Value (physical p.109). But FY24 gav (27,083.69 = FS Total Assets 270,836.93 mn, verified) and FY25 gav (29,411.33 = FS Total Assets) are o… |
| Nexus Select Trust | Nexus Vega City — occ | FY26 (val 31-Mar-2026) | 0.99 | — see §7 fix list | Confirmed. Dash 0.99 = committed occ 99.0% (cert p102, absorption p469). Peer rows use leased-area basis (verified Citywalk p126: 531773/550908=96.5%->dash 0.97, not committed 98.8%). Vega leased = 431784/439687 = 98.2%… |
| Nexus Select Trust | Nexus MBD Complex — occ | FY26 (val 31-Mar-2026) | 0.99 | — see §7 fix list | Confirmed. Dash 0.99 = committed occ 99.3% (cert p104, absorption p489). Mall leased basis = 227650/257400 = 88.4% -> 0.88 (p490). Peer convention is leased-area occ; large gap reflects fit-out pipeline on newly-acquire… |
| Knowledge Realty Trust | bench_overview.uc_msf | as of 31-Mar-2026 | 1.2 | — see §7 fix list | Confirmed stale snapshot. 1.2 = as-of-31-Mar-2025 IPO/RHP UC; current 31-Mar-2026 UC = 2.6 msf. Dashboard completed_msf(37.2) & area_msf(46.5) ARE current but UC/FDA split is not. Not refuted. |
| Knowledge Realty Trust | bench_overview.future_msf | as of 31-Mar-2026 | 8 | — see §7 fix list | Confirmed stale snapshot. 8.0 = as-of-31-Mar-2025 IPO/RHP future-dev; current 31-Mar-2026 FDA = 6.6 msf. Same issue as uc_msf; UC+FDA total (9.2) unchanged but split shifted. Not refuted. |

## 5. Documented basis differences — left as-is

Verified as legitimate alternative bases (issuer publishes both, or the dashboard formula is internally consistent). Not errors; listed so chart readers know the definition used.

| REIT | Metric | Period | Dashboard | Issuer/alt figure | Note |
|---|---|---|---|---|---|
| Embassy Office Parks REIT | ltv | FY2024 | 0.2874 | Dashboard LTV = Net Debt/GAV = (gross debt 16,807.95cr - cash 1,026.85cr = 15,781.10cr) /… | Refutes mismatch. Dashboard uses simple net-debt (gross debt-cash) over NAV-statement 'fair value of investment properties' GAV; issuer's 29.32% uses 'adjusted net debt' over leverage-note GAV incl 5… |
| Embassy Office Parks REIT | ltv | FY2025 | 0.3159 | Dashboard LTV = (gross debt 19,807.30cr - cash 676.59cr = 19,130.71cr) / GAV 60,567.29cr … | Refutes mismatch. Same basis differences as FY2024: net-debt definition + GAV incl 50% GLSP (+5,960mn). Dashboard 31.59% rounds to issuer headline 32%; within 0.29pp of FY2026-AR restated comparative… |
| Embassy Office Parks REIT | ltv | FY2026 | 0.306 | Dashboard LTV = (gross debt 22,384.79cr - cash 980.38cr = 21,404.41cr) / GAV 69,943.74cr … | Refutes mismatch. Closest of the three: net debt basis nearly matches issuer; residual 0.24pp is the GAV-definition difference (leverage-note 'Value of REIT Assets' incl 50% GLSP vs NAV-statement fai… |
| Embassy Office Parks REIT | occ | FY2026 | null | Occupancy (Phase-I): 100% | Confirmed p52: 'Occupancy (Phase-I): 100%' (Philips India single tenant, 0.4 msf). Phase-II 1.0 msf UC to FY2028. Report gives no whole-asset occupancy; dashboard null is a convention for a mostly-UC… |
| Embassy Office Parks REIT | sum_vs_gav | FY2026 | 70540.0 (sum of 16 asset value_cr) | Valuation Total 705,400 Mn (p76) = FS GAV note 705,399.53 Mn = 70,540.0 cr; FS 'fair valu… | Dashboard sum = valuation Total (p76) = FS Net-debt-to-GAV figure 705,399.53 Mn exactly. 596 cr gap is only vs FS fair-value-of-IP line, which carries GolfLinks JV at equity-method book 36,506.47 Mn … |
| Mindspace Business Parks REIT | ltv | FY2021 | 0.1321 | Issuer 'Loan to value (%)' / 'Net Debt to Market Value' = 14.0% (p.15). Dashboard = self-… | Confirmed: dashboard 0.1321 is NOT issuer's 14.0%; exactly reproduces (net debt)/AR-GAV. GAV 246,167mn verified. Finding upheld. |
| Mindspace Business Parks REIT | ltv | FY2022 | 0.1553 | Issuer 'Loan to value*' = 15.7% (p.49). Dashboard = (4448-347.8)/26,399.6 GAV = 15.53% | Confirmed: issuer 15.7% vs dashboard self-computed 15.53% (0.17pp gap, outside tol). Finding upheld. |
| Mindspace Business Parks REIT | ltv | FY2023 | 0.1801 | Issuer 'Loan to value*' = 17.9% (p.56). Dashboard = (5453.5-406.2)/28,026.5 GAV = 18.01% | Confirmed: issuer 17.9% vs dashboard self-computed 18.01%. Not the issuer ratio. Finding upheld. |
| Mindspace Business Parks REIT | ltv | FY2024 | 0.2223 | Issuer 'Loan to value*' = 21.1% (p.59). Dashboard = (6972.81-325)/29,873.2 GAV = 22.25% | Confirmed: issuer 21.1% vs dashboard self-computed 22.23%/22.25% (1.1pp above issuer). Finding upheld. |
| Mindspace Business Parks REIT | ltv | FY2025 | 0.2588 | Issuer 'Net Debt to Value' = 24.3% (net of cash+FD>3m, minority-adj); 25.4% without FD ad… | Confirmed: issuer 24.3%/25.4% vs dashboard self-computed 25.88%. Not the issuer ratio. Finding upheld. |
| Mindspace Business Parks REIT | Portfolio: sum(value_cr) vs latest_gav_fin | FY2026 | Σ value_cr = 47,635.01 cr | GAV 49,711.61 cr | Gap 2,076.60 cr (4.18%, <5%). Dashboard value_cr uses 89% REIT-share for Madhapur trio (Sundew 79,638.12mn = 89% of 89,481.03mn confirmed p.4). Grossing Sundew+KRIT+Intime to 100% adds exactly 2,076.… |
| Mindspace Business Parks REIT | bv.FY2021.inv_prop | FY2021 | 19525.3 | 19457.9 cr (194,579 mn, own-year AR21 p99) / 19525.3 cr (195,253 mn, AR22 restated compar… | Confirmed. AR22 'as at 31 Mar 2021' comparative = 195,253 mn = 19,525.3 cr, matching dashboard exactly. Own-year AR21 = 194,579 mn = 19,457.9 cr. Dashboard uses restated figures. Prior verdict stands. |
| Mindspace Business Parks REIT | bv.FY2021.ppe | FY2021 | 141 | 155.6 cr (1,556 mn, own-year AR21 p99) / 141.0 cr (1,410 mn, AR22 restated comparative p1… | Confirmed. AR22 FY21 comparative PPE = 1,410 mn = 141.0 cr (exact); own-year AR21 = 1,556 mn = 155.6 cr. Restated basis. Prior verdict stands. |
| Brookfield India Real Estate Trust | rev_maint | FY2025 | 625 | 624.959 (own-year ₹6,249.59mn) / 629.364 (restated ₹6,293.64mn) | Confirmed independently. Dashboard 625 = own-year filing 6,249.59mn (624.959cr) exactly. FY26 filing restates to 6,293.64mn (629.36cr) via +44.05mn property-tax reclass (explicit note p66) - the SAME… |
| Brookfield India Real Estate Trust | gross_debt | FY2025 | 10690.03 | Grand Total Borrowings A+B (incl JV proportionate: Rostrum/Oak/Aspen/Arnon) = 106,900.30 … | Confirmed. Dashboard exactly matches the JV-inclusive Grand Total Borrowings, not the consolidated-BS total (9,058.53 cr, 15% lower). Difference = JV Subtotal B 16,315.05 Rs mn / 10. |
| Brookfield India Real Estate Trust | gross_debt | FY2026 | 18130.17 | Grand Total Borrowings A+B (incl JV proportionate) = 181,301.65 Rs mn = 18,130.17 cr (p.4… | Confirmed. Same pattern as FY25: dashboard = JV-inclusive grand total; BS borrowings 16,432.78 cr, 9.4% lower. JV Subtotal B = 16,973.83 Rs mn. |
| Brookfield India Real Estate Trust | ltv | FY2021 | 0.1827 | AR Key Ratio 'Net Debt to GAV' = 0.17 (net basis, p.29). Dashboard 0.1827 = gross debt/GA… | Confirmed. Dashboard reconciles exactly to gross-debt/GAV; AR headline nets cash to 0.17. Gross-vs-net basis difference (gross basis corroborated by AR's own '18%' text). |
| Brookfield India Real Estate Trust | ltv | FY2022 | 0.3228 | AR Key Ratio 'Net debt to GAV' = 0.31 (net, p.61; capital note: Borrowings 51,655.35, Net… | Confirmed. Dashboard = gross basis (no cash netting); AR = net 0.31. Gross-vs-net basis difference. |
| Brookfield India Real Estate Trust | ltv | FY2023 | 0.3324 | AR Key Ratio 'Net debt to GAV' = 0.32 (net, p.70; capital note: Borrowings 54,520.38, Net… | Confirmed. Dashboard = gross basis; AR = net 0.32. Q4FY23 deck also 32%. Gross-vs-net basis difference. |
| Brookfield India Real Estate Trust | bench_overview.sponsor stake | as of Mar-2026 (filed) / Jul-2026 (dashboard 'now') | 0.19 (19%) | As-filed Unitholding Pattern 31-Mar-2026 (AR26 p151/p114): Sponsor + Sponsor Group = 21.4… | Confirmed: dashboard uses forward-adjusted post-Apr-2026-QIP sponsor%, not the AR's as-filed 21.45%. QIP terms (p245) reproduce 19.37% exactly; derivable from primary AR26 disclosures but not itself … |
| Brookfield India Real Estate Trust | bench_metrics.nav | as of Mar-2026 | 380 | As-filed NAV per unit (fair value, 31-Mar-2026) = ₹386.66 (AR26 p126; net assets ₹289,759… | Confirmed: as-filed 386.66 is 6.66 outside the ±0.05 tolerance, but a post-Apr-2026-QIP diluted pro-forma (QIP: 80,495,356 units @ ₹323, ₹26,000mn) computes to ₹380.49→380. Cross-check: dashboard pre… |
| Brookfield India Real Estate Trust | pat | Q3FY25 | 23.43 | Original 30-Jan-2025 filing 258.07 mn = Rs 25.81 cr; restated to 234.27 mn = Rs 23.43 cr … | Original Q3FY25 (31 Dec 2024) profit after tax = 258.07mn on p5 of 30-Jan-2025 filing. Restated to 234.27mn (JV loss reclassification) in Consolidated_Financials_Q4_FY_2025 comparative (=23.43). Dash… |
| Nexus Select Trust | ltv | FY2024 | 0.156 | 14% (Net Debt/GAV, Mar'24 independent valuation, net debt = gross debt less short-term tr… | REFUTE mismatch->basis_difference. Issuer LTV=14%. Dashboard 0.156 reconciles EXACTLY to (gross debt 4263.53 - cash 39.4)/GAV 27,083.69 = 0.15597. Gap = the ~432cr short-term treasury/MF investments … |
| Nexus Select Trust | ltv | FY2025 | 0.1805 | 16% (Net Debt to GAV, Mar'25; net debt incl. MF/treasury investments) | REFUTE mismatch->basis_difference. Issuer LTV=16% (also AR FY2024-25 'Loan to value (%) 16%' and 'Net Debt to GAV 16%'). Dashboard 0.1805 = (gross 5328.55 - cash 19.3)/GAV~29,414. Same net-debt-defin… |
| Nexus Select Trust | ltv | FY2026 | 0.2016 | 18.0% (Net Debt to GAV; net debt basis after including mutual fund investments, 31-Mar-20… | REFUTE mismatch->basis_difference. Visually confirmed 'Robust Balance Sheet' infographic (p.63/printed 122-123): Gross Debt Rs62Bn, Net Debt Rs54Bn, Net Debt to GAV (LTV) 18.0%; MD&A states LTV is 'n… |
| Knowledge Realty Trust | ltv | FY2026 | 0.174 | SEBI Net Borrowings Ratio (D/E) = 117,320.91 / 674,110.88 = 0.17404 (FS displays 0.17); i… | Independently confirmed. Dashboard 0.174 matches the SEBI-mandated Net Borrowing Ratio exactly (borrowings 123,586.44 - cash 6,265.53 = 117,320.91 net; / GAV 674,110.88 = 0.17404; also in AR Statemen… |
| Knowledge Realty Trust | bv.FY2026 goodwill | FY2026 (as at 31-Mar-2026) | 4287.6 | Consolidated audited BS line 'Other intangible assets' = 42,876.04 Rs Mn (÷10 = 4,287.60 … | Independently confirmed. 4,287.6 exactly matches 'Other intangible assets' line, not goodwill. No BS line literally 'Goodwill'; FY26 business-combination goodwill = Nil (consideration = net identifia… |
| Bagmane Prime Office REIT | revenue | FY2026 | 1942.94 | 1942.937 | Confirmed 19,429.37 Rs mn = 1942.937 cr but it is the NINE MONTHS ended 31-Dec-2025, not full FY2026; no full-year combined P&L exists (Trust newly formed). Figure transcribed correctly, wrong period… |
| Bagmane Prime Office REIT | bv.inv_prop | FY2026 | 5776.43 | ₹57,744.32mn = ₹5,774.43cr as at 31-Dec-2025 | Value +2.0cr vs Dec-2025 combined BS (0.03%, within 0.5% tol). Labeled FY2026 but sourced from 31-Dec-2025 Special Purpose Combined BS; no Mar-2026 consolidated BS exists (Trust standalone at 31-Mar-… |
| Bagmane Prime Office REIT | bv.ipud | FY2026 | 201.83 | ₹2,018.25mn = ₹201.83cr as at 31-Dec-2025 | Numeric value matches Dec-2025 combined BS exactly (÷10). FY2026 label = 31-Dec-2025 combined basis, not a Mar-2026 FY-end. Uphold. |
| Bagmane Prime Office REIT | bv.ppe | FY2026 | 353.47 | ₹3,534.65mn = ₹353.47cr as at 31-Dec-2025 | Numeric value matches Dec-2025 combined BS exactly (÷10). FY2026 label = 31-Dec-2025 combined basis. Uphold. |
| Bagmane Prime Office REIT | bv.cwip | FY2026 | 146.18 | ₹1,461.76mn = ₹146.18cr as at 31-Dec-2025 | Numeric value matches Dec-2025 combined BS exactly (÷10); also confirmed in CWIP Note 5 (closing balance 1,461.76mn at 31-Dec-2025). FY2026 label = 31-Dec-2025 basis. Uphold. |
| Bagmane Prime Office REIT | bv.total_assets | FY2026 | 7674.82 | ₹76,748.19mn = ₹7,674.82cr as at 31-Dec-2025 | Numeric value matches Dec-2025 combined BS exactly (÷10). FY2026 label = 31-Dec-2025 combined basis, not a Mar-2026 FY-end consolidated figure. Uphold. |
| Bagmane Prime Office REIT | bench_metrics.nav | latest (Dec-2025) | 109 | ₹109.13 (pre-offer NAV at Fair Value = ₹344,969.03mn Net Assets before Offer ÷ 3,161,000,… | REFUTES prior mismatch. 109 = rounded pre-offer/pre-money fair-value NAV ₹109.13 (Net Assets before Offer ₹344,969.03mn ÷ 3,161mn pre-offer units, both printed on p449); independently reported as ₹10… |
| Cross-cutting | India aum | asof 7 Jul 2026 | $63bn | Pure-REIT GAV ~₹3.12 lakh cr (~$37bn, 5 listed REITs, mid-2026; was ₹2.3 lakh cr/$27bn De… | Prior finding independently CONFIRMED, not refuted. $63bn = correct USD conversion of dashboard's own ₹5.3 lakh cr, but that basis matches NO published aggregate: sits between real-estate REIT GAV (~… |

## 6. Findings refuted in verification (no error existed)

| REIT | Metric | Period | Why refuted |
|---|---|---|---|
| Embassy Office Parks REIT | dpu | Q3FY21 | Extraction agent misquoted the dashboard value; the file already held the source value (4.55). Caught by pre-edit assertion; no change made. |
| Embassy Office Parks REIT | dpu | Q3FY22 | Extraction agent misquoted the dashboard value; the file already held the source value (5.20). Caught by pre-edit assertion; no change made. |
| Mindspace Business Parks REIT | bv.FY2025.goodwill | FY2025 | Prior claim (goodwill nil) independently confirmed: no goodwill line in FY21/22/24/25 consolidated BS; AR p232 explicit. But 0.01 cr is within the +/-1 cr absolute tolerance of nil (immaterial phantom, equals the 0.01 Corpus line on p190).… |
| Brookfield India Real Estate Trust | revenue | FY2025 | Refutes prior basis_difference. Dashboard 2390 = restated FY26-filing figure 23,899.98mn (2389.998cr) to rounding, and also within 0.18% of own-year 23,855.93mn. Passes ±0.5% under BOTH bases, so the restatement choice does not change the … |
| Brookfield India Real Estate Trust | bv.total_assets | FY2021 | Refutes basis_difference: dashboard = AR22-restated comparative to the rupee, and the original own-filing differs by only ₹15.74cr = 0.14%, WITHIN the ±0.5% (₹54.97cr) tolerance. Correct under either reading. |
| Brookfield India Real Estate Trust | bv.ppe | FY2024 | Refutes basis_difference: dashboard = FY25-AR restated comparative exactly; own-filing differs by 0.22cr = 0.55%, but the ₹cr tolerance floor is ±1cr, so BOTH readings are within tolerance. |
| Brookfield India Real Estate Trust | bench_overview.uc_msf (under construction) | as of Mar-2026 | AR26 discloses 0.6 UC; dashboard 0.7 differs by exactly 0.1 msf (the ±0.1 tolerance boundary). area_msf (37.1), completed_msf (32.5) and uc+future total (4.6) all tie exactly. Split leans stale (FY24 vintage) but within tolerance. |
| Brookfield India Real Estate Trust | bench_overview.future_msf | as of Mar-2026 | AR26 discloses 4.0 future; dashboard 3.9 differs by exactly 0.1 msf (tolerance boundary). Complement of uc_msf; uc+future=4.6 ties to current combined figure. Within tolerance. |
| Nexus Select Trust | gav_hy | 2024-03-31 | REFUTES prior basis_difference. Value matches deck independent-valuation total (physical p.43): 253,929 mn = 25,392.9 cr, rounds to 25,393 (0.1 cr, within tolerance). gav_hy is a self-consistent half-yearly independent-valuation (portfolio… |
| Nexus Select Trust | gav_hy | 2025-03-31 | REFUTES prior basis_difference. Value exactly matches deck independent-valuation total (physical p.36): 275,330 mn = 27,533.0 cr. Consistent portfolio-GAV basis across all val_hy points; the flag arose only from comparing to the gav-main F… |
| Nexus Select Trust | bv.inv_prop | FY2025 | Confirmed true figure is 14,524.65 (both ARs). Dashboard is exactly ₹50cr high = 0.344%, INSIDE the ±0.5% ₹cr tolerance (band ≈₹72.6cr). Prior auditor pinned the figure correctly but did not apply the tolerance; scores match though 14,524.… |
| Cross-cutting | fd_step 2022-02-15 | 2022-02-15 | Value independently confirmed: goldenpi lists '15 February 2022: 5.10%' for the 1-yr bucket, matching dashboard exactly. Prior auditor conceded 'value correct' and only disputed onset date (15-Jan vs 15-Feb-2022); onset granularity does no… |
| Cross-cutting | fd_step 2025-06-15 | 2025-06-15 | Value confirmed correct on labeled date. SBI 1-yr card rate was 6.50% from 16-May-2025 to 14-Jul-2025; the 15-Jun-2025 revision left retail term-deposit card rates unchanged (only Amrit Vrishti 444d + EBLR cut). Prior auditor conceded valu… |
| Cross-cutting | fd_step 2026-01-15 | 2026-01-15 | Value confirmed correct on labeled date: 1-yr rate 6.25%, held since 15-Jul-2025 through 15-Dec-2025 revision (unchanged) into 2026. Prior auditor conceded 'value is currently accurate.' Real onset was 15-Jul-2025, so the step-curve holds … |

## 7. Complete list of corrections applied

All edits in `dashboard_v2/data-src/` (regenerated into `public/data/` via `npm run data`) unless a code file is named. Format: **was → now**.

### data.js — annual `fin` series
| REIT | Field | FY | Was → Now | Basis |
|---|---|---|---|---|
| Embassy | gav | FY2022 | 49,007.8 → **49,367.4** | audited SoNA GAV, AR FY22 (4× corroborated) |
| Embassy | ltv | FY2022 | 0.2349 → **0.2332** | recomputed on corrected GAV (series formula) |
| Embassy | price_eoy | FY2025 | 365.49 → **367.99** | last FY25 trading day close (28-Mar-2025), exchange CSV |
| Mindspace | rev_rental | FY2021 | 925.3 → **902.4** | FS Note 32 actual split (was pro-forma % mix) |
| Mindspace | rev_maint | FY2021 | 171.9 → **166.5** | FS Note 32 |
| Mindspace | msf_total | FY2026 | 38.2 → **39.3** | 31-Mar-26 year-end (was Sep-25 interim) |
| Mindspace | msf_op | FY2026 | 31 → **32.0** | 31-Mar-26 year-end |
| Mindspace | gav | FY2026 | 49,711.61 → **47,634.97** | attributable basis, consistent with FY21–25 |
| Mindspace | ltv | FY2026 | 0.2365 → **0.2469** | recomputed on attributable GAV (series formula) |
| Mindspace | networth | FY2024–26 | 14,928.54 / 14,810.55 / 15,796.83 → **14,168.90 / 14,054.44 / 15,046.82** | attributable-to-unitholders (was Total equity incl NCI) |
| Brookfield | dist_total | FY2022 | 740.48 → **685.66** | AR FY22 sum of board-declared quarters (was DPU × year-end units) |
| Brookfield | dist_total | FY2024 | 779.4 → **774.49** | AR FY24 verbatim ₹7,744.90 mn |
| Brookfield | ltv | FY2025 | 0.2972 → **0.2811** | company LTV (FS Net Borrowings Ratio, AR, deck agree) |
| Brookfield | ltv | FY2026 | 0.3088 → **0.3402** | company LTV, four sources |
| Brookfield | cost_debt | FY2026 | 0.0805 → **0.073** | Q4FY26 deck (was stale Dec-25 third-party figure) |
| Brookfield | msf_total | FY2026 | 32.43 → **37.03** | valuation TOTAL row (was Completed column only) |
| Brookfield | nav | FY2024–26 | 233.57 / 230.85 / 233.87 → **332.60 / 336.35 / 386.66** | fair-value NAV, consistent with FY21–23 (was book-value) |
| Brookfield | gav | FY2024–25 | 30,719.83 / 34,031.31 → **29,225 / 37,954** | portfolio market value basis, consistent series (was FS total assets) |
| Nexus | rev_maint | FY2024–25 | 94 / 110.22 → **351.78 / 420.07** | FS Note 35 Maintenance Services (was Marketing Income line) |
| Nexus | nav | FY2026 | 87.7 → **87.20** | printed figure (87.7 was an OCR misread) |
| Nexus | gav | FY2026 | 30,558.3 → **32,240.6** | FS Total-Assets-at-fair-value basis, consistent with FY24–25 |
| Nexus | ltv | FY2026 | 0.2016 → **0.1911** | recomputed on consistent GAV |
| Nexus | cost_debt | FY2026 | 0.075 → **0.073** | FY-end figure (7.5% was the H1 interim) |
| Nexus | dpu / dist_total | FY2024 | 4.99 / 755.08 → **7.075 / 1,071.86** | declared-for-year (AR Note 1), series & cross-REIT convention |
| Nexus | dpu / dist_total | FY2025 | 8.15 / 1,234.72 → **8.35 / 1,265.03** | declared-for-year (AR Note 1) |
| Bagmane | revenue | FY2023 | null → **1,979.31** | RHP p314 combined P&L (disclosed, was uncaptured) |
| Bagmane | rev_rental | FY2023–25 | null → **1,603.09 / 1,785.11 / 2,000.90** | RHP p345 Income from leasing |
| Bagmane | rev_maint | FY2023–25 | null → **228.68 / 238.45 / 257.06** | RHP p345 Property maintenance services |

### data.js — quarterly `q[]` series
| REIT | Quarter | Field | Was → Now |
|---|---|---|---|
| Embassy | Q1FY20 | rev | 473.8 → **535.1** (was office-segment revenue, not total) |
| Embassy | Q4FY21 | rev_maint | 74.3 → **112.66** (FS Note 31) |
| Mindspace | Q1FY26 | dpu | 5.6 → **5.79** |
| Mindspace | Q2FY26 | ndcf / dpu | 357 → **364.5** · 5.64 → **5.83** |
| Mindspace | Q3FY26 | dpu | 6.00 → **5.83** |
| Mindspace | Q4FY26 | dpu | 6.84 → **6.64** |
| Brookfield | Q1FY25 | ndcf | 213.5 → **210.26** (disclosed, was DPU-ratio split of H1) |
| Brookfield | Q2FY25 | pat / ndcf | 20.55 → **25.23** · 225.3 → **228.48** |
| Brookfield | Q1FY26 | rev_ops | 650.49 → **641.62** |
| Nexus | Q3FY24 | dpu | 1.45 → **2.00** (declared) |
| Nexus | Q4FY25 | dpu | 1.8 → **2.00** (declared) |
| Nexus | Q2FY26 | ndcf / dpu | 313.8 → **320.82** · 2.28 → **2.198** |
| Nexus | Q3FY26 | pat / ndcf / dpu | 39.4 → **139.40** · 313.8 → **317.36** · 2.28 → **2.367** |
| Nexus | Q4FY26 | ndcf | 313.8 → **339.97** |

### data.js — balance-sheet breakdown `bv`, SPV assets, issuances/blocks
| Item | Was → Now |
|---|---|
| Mindspace bv FY2024 ipud | 672.67 → **1,456.7** (FY25 value had been duplicated into FY24) |
| Brookfield bv FY2022/23/24 goodwill | 237.39 → **null** (Rostrum JV goodwill only exists from Jun-2024) |
| Nexus bv FY2025/26 ipud | null → **2.24 / 6.95** (separately disclosed, contrary to old note) |
| Bagmane bv FY2023 cwip | 4.85 → **0** (RHP combined BS shows nil) |
| Mindspace SPV — Commerzone Raidurg mkt_rent | null → **105** ₹/psf/mo (valuation report p283) |
| Mindspace SPV — Commerzone Porur wale | null → **8.1** yrs (valuation report p1119) |
| Brookfield SPV — Ecoworld cap_rate | 0.08 → **0.0775** (valuer key assumptions) |
| Nexus SPV — Fiza by Nexus mkt_rent / inplace_rent | 86.5 / 82.4 → **59.7 / 56.5** (Celebration's rents had been mis-copied into Fiza) |
| Nexus SPV — Vega City / MBD Complex occ | 0.99 / 0.99 → **0.98 / 0.88** (leased-area basis, peer convention; 0.99 was committed) |
| Brookfield issuance — SDPL Noida preferential | date 2022-06 → **2022-01** (allotted 24-Jan-2022 per FY22 AR p66) |
| Nexus block 2024-08 note | sponsor after-stake 21.3% → **22.3%** (audited AR unit count; 21.3% was a press estimate) |

### bench.js — Market-page overview
| Item | Was → Now |
|---|---|
| Mindspace uc_msf / future_msf | 4.4 / 2.9 → **5.4 / 1.9** (AR26: 32 completed + 5.4 UC + 1.9 future = 39.3) |
| Mindspace sponsor | "K Raheja Corp Group (backed by Blackstone)" → **"K Raheja Corp Group"** (Blackstone exited Jan-2022) |
| Mindspace occupancy | 0.93 → **0.94** (31-Mar-26 committed; 0.93 was FY25's) |
| Brookfield ipo | 2021-02-01 → **2021-02-16** (actual listing date) |
| Brookfield uc_msf / future_msf | 0.7 / 3.9 → **0.6 / 4.0** (AR26 current split, was FY24's) |
| Nexus ipo | 2023-05-01 → **2023-05-19** |
| KRT ipo | 2025-08-01 → **2025-08-18** (listing date) |
| KRT uc_msf / future_msf | 1.2 / 8.0 → **2.6 / 6.6** (Mar-26 split; was the Mar-25 IPO-time split) |

### Other files
| File | Was → Now |
|---|---|
| `data-src/val_hy.js` | Mindspace 2022-09-30 GAV 27,616 → **27,282.9** (Q2FY23 deck SoNA row A; 27,616 appears in no filing) |
| `src/lib/bench.ts` GSEC_STEPS | 2025-07-01 step 6.55% → **6.30%** (actual 10Y ~6.25–6.31% around 1-Jul-2025) |
| `src/components/domestic/Chart2Issuances.tsx` | TechVillage acquisition date 2020-12-15 → **2020-12-24** (AR FY21: "ETV was acquired by Embassy REIT on December 24, 2020") |

### Verified clean (no changes needed)
- All Embassy annual P&L/NDCF/distribution/revenue-split figures FY2019–26 (45/45 match); all Embassy quarterly rows except the three fixed; Embassy SPV table (138 rows, only rounding); Embassy issuances & blocks.
- KRT: entire SPV table (240 rows), all annual financials, quarterly rows — only the IPO-date and the "goodwill"-label caveat (§5).
- Bagmane SPV table (62 rows); all G-Sec steps except Jul-2025; all SBI FD steps; the PPFAS/Capital Group block-deal facts (~5.63 cr units, ~6%, ₹420, 24-Feb-2026); TechVillage cost ₹9,782 cr.
- `data-src` ↔ `public/data` were in perfect sync before and after; live-data merge layers untouched.

## 8. Unverifiable locally / known gaps

**Unverifiable (56)** — no local document covers these (mostly cap/discount rates not stated in summary valuation reports, some quarterly docs missing, and analyst estimates like FY27 NDCF):

- embassy:B_bs · cost_debt FY2020 — Workbook itself flags this as a 'blended estimate', not a literal filed number. Underlying Q3 data point verified, but no primary source st…
- embassy:E_facts · block units_mn (Blackstone entities sell) 2020-06-24 — Three independent reconstructions disagree by up to 3x; cannot confirm 24.5mn from primary/secondary sources available
- embassy:E_facts · bench_overview uc_msf Mar-2026 — No single document gives a clean UC-vs-future msf split matching dashboard's 7.6/1.4 breakdown
- embassy:E_facts · bench_overview future_msf Mar-2026 — 
- embassy:E_facts · bench_metrics price latest — skip per methodology (market-quoted, not a filing figure)
- embassy:E_facts · bench_metrics fy27_ndcf FY2027E — analyst estimate, not verifiable against filings
- embassy:E_facts · bench_metrics fy27_yield FY2027E — analyst estimate, not verifiable against filings
- mindspace:D_spv · Pocharam: inplace_rent FY2026 — no rent — vacant
- mindspace:D_spv · Pocharam: cap_rate FY2026 — 
- mindspace:D_spv · Avacado — The Square, BKC: wale FY2026 — WALE not disclosed; dashboard null
- mindspace:D_spv · Sundew RE — The Square, Avenue 98 (BKC Annex): wale FY2026 — WALE not disclosed; dashboard null
- mindspace:E_facts · bench_metrics.fy27_ndcf FY2027 — analyst estimate
- mindspace:E_facts · bench_metrics.fy27_yield FY2027 — analyst estimate
- brookfield:D_spv · Worldmark Tower 1 · wale FY2026 — deck gives combined Worldmark New Delhi WALE 5.1 only
- brookfield:D_spv · Worldmark Tower 2 & 3 · wale FY2026 — 
- brookfield:D_spv · Pavilion Mall · mkt_rent FY2026 — mall priced by many categories; blank defensible
- brookfield:E_facts · bench_metrics.fy27_ndcf FY2027E — analyst estimate
- brookfield:E_facts · bench_metrics.fy27_yield FY2027E — analyst estimate
- nexus:E_facts · bench_metrics.fy27_ndcf FY2027E — Analyst estimate — not a filed figure.
- nexus:E_facts · bench_metrics.fy27_yield FY2027E — Analyst estimate — not a filed figure.
- nexus:F_quarterly · ndcf Q1FY24 — REIT's first distribution covered combined listing-to-30Sep23 period; dashboard's 226/226 even split across Q1+Q2 is an assumption, not a d…
- nexus:F_quarterly · ndcf Q2FY24 — Same combined H1 total as Q1FY24 row; no standalone Q2 NDCF exists
- nexus:F_quarterly · dpu Q2FY24 — First distribution was a single combined declaration; no separate Q1 or Q2 DPU exists to check 1.45 against
- krt:C_gav_area · uc_fd_msf (supporting, not a dashboard target) FY2026 — Not present in dashboard_values slice (only workbook citation); listed for completeness — ties out to AR's 9.2 msf UC+FD figure.
- krt:D_spv · Sattva Knowledge Capital \| occ FY26 (val 31-Mar-2026) — committed occ not stated; dash null consistent
- krt:D_spv · Sattva Global City \| leasable_msf FY26 (val 31-Mar-2026) — dash left null (op+FD split)
- krt:D_spv · Sattva Techpoint \| occ FY26 (val 31-Mar-2026) — committed occ not stated; dash null consistent
- krt:D_spv · One Trade Tower \| occ FY26 (val 31-Mar-2026) — committed occ not stated; dash null consistent
- krt:D_spv · Sattva Horizon \| occ FY26 (val 31-Mar-2026) — committed occ not stated; dash null consistent
- krt:D_spv · Sattva Magnificia (I & II) \| occ FY26 (val 31-Mar-2026) — committed occ not stated; dash null consistent
- krt:D_spv · Sattva Cosmo Lavelle \| occ FY26 (val 31-Mar-2026) — committed occ not stated; dash null consistent
- krt:D_spv · Sattva Endeavour \| occ FY26 (val 31-Mar-2026) — under construction; dash null consistent
- krt:D_spv · Sattva Spectrum \| occ FY26 (val 31-Mar-2026) — under construction; dash null consistent
- krt:D_spv · One BKC Solar \| leasable_msf FY26 (val 31-Mar-2026) — capacity in MW, not msf; dash null
- krt:D_spv · Prima Bay Solar \| leasable_msf FY26 (val 31-Mar-2026) — capacity in MW, not msf; dash null
- krt:D_spv · Karnataka Solar I \| leasable_msf FY26 (val 31-Mar-2026) — capacity in MW, not msf; dash null
- krt:D_spv · Karnataka Solar - II \| leasable_msf FY26 (val 31-Mar-2026) — capacity in MW, not msf; dash null
- krt:E_facts · bench_metrics.price snapshot — Live market price, not a filing figure — skipped per audit scope.
- krt:E_facts · bench_metrics.prem_disc snapshot — NAV(124) independently verified as match; price is live/market and skipped per scope, so the premium/discount figure can't be pinned down b…
- krt:E_facts · bench_metrics.fy27_ndcf FY2027E — Forward-looking analyst estimate, not filing data, per audit scope.
- krt:E_facts · bench_metrics.fy27_yield FY2027E — Forward-looking analyst estimate, not filing data, per audit scope.
- bagmane:A_pnl · revenue FY2019 — Trust incorporated 30-May-2025; RHP Summary Combined Statement of P&L (p.314) only covers FY2023-FY2025 + 9M-FY2026. No local document disc…
- bagmane:A_pnl · revenue FY2020 — Same as FY2019 - outside RHP's disclosed combined-financials window.
- bagmane:A_pnl · revenue FY2021 — Same as FY2019 - outside RHP's disclosed combined-financials window.
- bagmane:A_pnl · revenue FY2022 — Same as FY2019 - outside RHP's disclosed combined-financials window.
- bagmane:A_pnl · rev_rental FY2019 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_rental FY2020 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_rental FY2021 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_rental FY2022 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_maint FY2019 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_maint FY2020 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_maint FY2021 — No revenue-note disclosure for this period in any local document.
- bagmane:A_pnl · rev_maint FY2022 — No revenue-note disclosure for this period in any local document.
- bagmane:E_facts · bench_metrics.price latest — skipped per family spec (market-derived)
- None:W_global · Australia aum asof 7 Jul 2026 — Could not locate a clean total-portfolio/GAV figure for the whole A-REIT sector to test against $110bn directly; the >$100bn FUM figure and…
- None:W_global · Singapore aum asof 7 Jul 2026 — No official aggregate AUM/portfolio-value figure located for the S-REIT sector; dashboard's $95bn is somewhat below the gearing-implied est…

**Known gaps (43)** — issuer never disclosed (per REIT_data_gaps.md); correctly blank on charts.

## 9. Follow-ups worth knowing about

1. **The master workbook has the same errors.** `Indian_REITs_Key_Financials_FILLED.xlsx` (and for two items `REIT_AUM_MSF_sources/`) is the source most of these values were transcribed from — the dashboard now *diverges deliberately* from the workbook on every corrected value. Fix the workbook separately if you want them re-aligned.
2. **Cross-REIT NAV basis (Chart 8):** Brookfield now uses fair-value NAV throughout; Nexus's issuer-stated NAV is book-value (87.20; its fair-value NAV is 164.00 but is only disclosed from FY26, so a consistent fair series can't be built yet). P/B comparisons across REITs mix bases — consider a footnote on Chart 8, or switching Nexus to 164.00 when FY27 data arrives.
3. **Nexus SPV-sum banner:** the SPV table sums to the valuer's portfolio value (30,558 cr) while `fin.gav` is now on the FS total-assets basis (32,240.6 cr) — the table's >5% reconciliation warning now shows for Nexus and is *correct* (the gap is cash/other assets).
4. **Bagmane FY2026 P&L is a 9-month stub** (Apr–Dec 2025, RHP basis) and its `bv` "FY2026" is the 31-Dec-2025 combined BS; real FY-end numbers arrive with Q1-FY2027 results (~Aug/Sep 2026).
5. **KRT `bv.goodwill` (4,287.6 cr) is actually "Other intangible assets"** — the number is right, the chart legend label is not (KRT's business-combination goodwill is nil). Cosmetic code change if you want it.
6. **InvIT values remain unverified** — add NHIT / PGInvIT / RIIT filings to a local folder and I can run the same audit on them.


---

## Addendum — Rounds 2–3 (17-Jul-2026, stopped before verification completed)

After round 1, two further passes ran: **round 2** (re-checks of the 56 unverifiable rows — aided by the newly added `Embassy/embassy_reit_ar_2025-26_final_1.pdf` — plus an all-REIT area-figure re-check, meta/structure-note/CAGR checks, and annexure/link spot-checks; 211 rows) and **round 3** (an 11-cluster audit of the chart-math layer — the code transforming JSON into plotted values; 111 rows). Extraction completed; the adversarial verification pass was stopped at the user's request, so the findings below are **candidates, not confirmed**, except where marked verified.

**Positive assurance obtained:** Embassy's new FY2025-26 AR independently confirmed every FY2026 value already in the dashboard; the workbook price seed matches the exchange CSVs on all ~1,185 overlapping dates; turnover magnitudes reconcile (Embassy's ₹2,443 cr day = the PPFAS block); 80 of 111 chart-math checks verified as correct math (NAV step construction, P/B series, KPI premium/discount, distribution stacking, FD/G-Sec accrual, snapshot mcap all recompute exactly).

**Pending data candidates** (strong evidence, unverified): Embassy overview UC/future 7.6/1.4 → 6.2/2.8 and completed/total 43.6/52.6 → 43.5/52.5 (AR26 p75–76); Mindspace Avenue 98 WALE null → 1.6 yr (**verified**); Brookfield Worldmark Tower 1 WALE null → 4.7 yr; Embassy FY2020 cost_debt 9.5% vs filed 9.61%; Nexus overview area 10.7 vs 11.97 (basis); Bagmane valuation-report link mislabelled; Nexus structure-note NSRPL wording.

**Pending chart-math candidates:** Chart2 `unitsAtDate` FY-end unit mapping distorts FV/unit markers at intra-year issuance dates; Chart1 DPU-axis `suggestedMax` −Infinity fallback (Bagmane); local-vs-UTC date parsing can shift FY-end NAV steps by a day outside IST; Chart5 quarterly-yield denominator mixes `gav`/`assets_fv` (tooltip mislabel); Chart3 BV null-coalescing; rebased basket jump when a constituent lists mid-window; SecurityModal day-change baseline; SBI-FD line back-extrapolation to FY2020; plus the already-documented Nexus book-vs-fair NAV mix on Chart 8.

Machine-readable cache of ALL extracted source values (2,463 rows with doc + physical page): **`dashboard_v2/audit/verified_values.json`** — consult it before ever re-extracting from the PDFs. Full methodology and resume instructions: `dashboard_v2/HANDOVER.md` §21.

## Addendum — New datasets audit (17-Jul-2026: keyfin, lease, volume-history)

Scope: the three datasets added for the Market-page key-financials table, the per-REIT
occupancy/WALE + lease expiries/renewals charts, and the Chart-1 volume swap.

**keyfin.json (FY2026 comparison table).** Scripted openpyxl diff of all 15 metrics × 6 REITs
against the workbook "Comparison" sheet: 90/90 cells exact, 0 mismatches. Citation cross-check
against `audit/workbook_citations.json`: 15/15 metrics have FY2026 page-cited sources for all
six REITs. No LLM verification needed.

**lease.json — wale / occ_committed / occ_inplace.** Scripted diff vs workbook per-REIT sheets
rows 45–47: 144/144 cells exact, 0 mismatches. These values inherit the workbook's existing
citations (WALE 71 rows, Committed Occupancy 64 rows, etc.).

**lease.json — activity[] & ladder (new extraction).** Six Sonnet extraction agents (one per
REIT, targeted pdftotext page reads) followed by six Opus adversarial verifiers re-reading only
the cited pages. All values carry `src` = document + PDF page. Verification outcomes:
- 1 numeric correction: Nexus FY2025 new_msf 1.1 → 0.1 (1.1 msf was total leasing incl. the
  1.0 msf re-leased; recording both double-counted).
- 1 quote correction: Embassy FY2024 — 4.4 msf New Lease-up and 2.4 msf pre-commitments are
  separate labels (4.4+2.4+1.3 = 8.1 msf total); values unchanged.
- All other values confirmed verbatim.
Assembly conventions (mine, transparent): Nexus FY2020–23 disclosed only "Re-leased (Mn sf)"
totals (0.7/0.3/0.9/1.3, AR FY24-25 p.74) — mapped to `renewed_msf` (the field is defined as
renewed/re-leased). Brookfield's forward ladder is disclosed as CUMULATIVE % of contracted
rentals (10/21/27/35% till FY27–30, Q4 FY26 deck p.17) — stored as per-FY increments
(10/11/6/8) and gap-noted. Known gaps are recorded per REIT in `lease.js gaps[]` (surfaced in
the UI): Embassy has no text-extractable forward ladder (image-only slides) and no FY2026
full-year figures in local docs; Brookfield FY2023 has no new/renewal split; Mindspace FY21–24
expired areas come from deck bar-chart labels; per-FY expired area is widely undisclosed.

**volume-history.json.** Exchange primary data (Trade History CSVs), exempt from filing audit
like price-history.json. Spot-checks: Embassy 2019-04-01 v = 29,03,200 (NSE) + 2,78,800 (BSE)
= 31,82,000 ✓, c = 314.67 (NSE Close) ✓; 2026-07-16 ✓. NSE Series filtered to RR — the 9
excluded BL rows are block-deal crossings (e.g. 4.26 cr units on 03-Mar-2023) already shown as
Chart-2 block markers; post-filter NSE and BSE day counts match exactly for all 5 REITs.

Not covered: nothing new — InvITs remain the only unaudited dashboard datasets.

### Verification round for previously-unaudited workbook cells (17-Jul-2026, evening)

The July audit only covered metrics present in the dashboard's data.js; the FY2026 table's NOI,
EBITDA, market cap (and derived margins/yields), plus the WALE/occupancy history, had recorded
citations but no adversarial verification. Closed now:

- **Arithmetic (scripted):** NOI margin = NOI/Revenue and LTV = net debt/GAV exact to machine
  precision for all 6 REITs; distribution yields = DPU ÷ FY-end NSE close within ~1bp; market
  caps = units × FY-end NSE close within 0.1% (Brookfield resolved below).
- **Source verification (6 Opus agents, 74 cells; verdicts archived in
  `dashboard_v2/audit/workbook_verify_2026-07-17.json`):** 64 confirmed verbatim, 10 basis
  notes, **0 corrections**. Notable basis notes: Bagmane NOI/EBITDA are 9M Apr–Dec 2025
  proforma (RHP) and its ₹34,000 cr market cap is at the ₹100 offer price — keyfin footnote
  updated; Brookfield market cap = 749,385,513 units × ₹320.31 (30-Mar-2026, NSE holiday on
  31-Mar) — exact; Brookfield FY22–24 "in-place" is Effective Economic Occupancy; Mindspace
  FY24–25 committed occupancy is the ex-Pocharam headline.
- **Gap fills (7 cells, all with citations):** Mindspace WALE FY23 = 7.0, committed occ FY23 =
  0.89, in-place FY21/22/23 = 0.818/0.822/0.834 (Q4 deck portfolio tables); Brookfield
  committed occ FY21 = 0.87 (FY21 AR); Bagmane in-place FY26 = 0.957 (RHP p.207). Written into
  BOTH lease.js and the workbook (openpyxl edit + fresh-profile LibreOffice re-bake; Comparison
  sheet cached values byte-identical pre/post, both scripted diffs re-run at 0 mismatches).
- **Confirmed genuinely undisclosed (left blank, noted in UI):** Embassy committed occupancy
  FY2020–FY2025 (issuer only began splitting committed-by-value vs in-place-by-area in FY26);
  Brookfield in-place FY25–26; KRT in-place FY26. Per-REIT `occ_note` now surfaces the
  occupancy-basis caveats under chart 3c.
