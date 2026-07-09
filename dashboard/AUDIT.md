# Dashboard data audit — 7 Jul 2026 (updated after cash-flow re-parse)

## Page 2 — Market & Benchmarks (built 7 Jul 2026)

`market.html` + `bench.js` (exported from REIT_Tableau_Ready_1.xlsx: 7,196 daily closes 2021–Jun-2026 for 6 REITs + NIFTY 50 + NIFTY REALTY; 1,711 turnover points from Jun-30-25) + `refresh_market.py`/`serve.py /refresh-market` (Yahoo: ^NSEI, ^CNXREALTY, ^BSESN + REIT units — SENSEX appears after first refresh; also re-runs the page-1 live-quote fetch). Combined-REITs method reverse-engineered from the Tableau workbook and verified: **sum of unit prices, basket grows at each IPO** — start 972 (matches exhibit ~970), end 1,591 (exhibit ~1,590), rebased 164 (exhibit ~164); veterans-only rebased 141 (exhibit ~141); NIFTY REALTY 157; FD index 121.1; volume spike on 24-Feb-26 = 4,513 vs exhibit's 4,514. SBI 1-yr FD modeled as stepped rate history (editable `fd_steps` in bench.js — dates/rates approximate, flagged for review). Charts: snapshot cards, area breakdown, levels vs NIFTY REALTY, rebased vs benchmarks + FD, veterans vs NIFTY 50, volume trajectory (raw + 20d MA, PPFAS block-deal marker), sector NAV-vs-price with premium/discount bars, distributions stacked by REIT with combined yield vs FD line. Exhibit 7 (ADTV) intentionally omitted per user.

## Round 5 — Embassy shredded blocks (7 Jul 2026, found by user)

The GolfLinks popup still showed shredded small-caps rows ("OPERATINGINCOME", "O&Mcost ININININ RRRRM ILLION") — two Annexure-1 cash-flow blocks the round-2 grid parser had missed entirely: **Embassy GolfLinks – Pinehurst (p398)** and **Embassy Oxygen (p406)**, both stored as garbage heading lines rather than tables. Re-parsed both pages from the source PDF with char-geometry stitching (line clustering, gap-based cell splits, x-position column assignment, wrapped-label merge, thousand-split repair "6 73.1"→"673.1"). Both rebuilt grids pass the NOI identity (Total Income − Total Operating Costs = Net operating Income) on **11/11 columns each**, and replaced the garbage in `annexdata.js`. Render also now demotes any heading carrying ≥3 numeric tokens to the paragraph pipeline (catches leaked data rows like Nexus "FY19 0.07 51.8%"), and the lint gained a fused-small-caps detector (would have caught this class). Lint: 0 defects.

## Round 6 — dictionary-driven text cleanup of annexdata.js (7 Jul 2026)

Direct text repair in the data file, scanned with a 234k-word dictionary (with inflection handling) across every string: mid-word splits where neither half is a word but the join is ("Comp onent"→Component, "onwar ds"→onwards, "requir ements"→requirements ×9, "o ccupiers"→occupiers), fused words ("figuresin"→"figures in" ×3), chopped text ("R ’s ortfolio"→"REIT’s portfolio"), and source-PDF typos ("Mangement"→Management ×6, "corelated"→correlated ×2). Remaining dictionary flags reviewed and confirmed legitimate (benchmark, cashflow, submarket, pickleball, etc.); number-space flags all legitimate dates/addresses/series. Post-fix scan: 0 split-word candidates; lint: 0 defects.

## Pages 3 & 4 — InvITs + Global Markets (built 7 Jul 2026)

**Page 3 `invits.html`** — NHIT, Raajmarg (RIIT), PGInvIT. Fundamentals in `invit_data.js`, researched: NHIT 26 toll roads/2,345 km/12 states, EV ₹56,988 cr (FY26 valuation), NAV ₹152.44, ₹1.97/unit Feb–Mar-26 distribution ([nhit.co.in](https://nhit.co.in/), [Screener](https://www.screener.in/company/NHIT/consolidated/)); Raajmarg = NHAI's second InvIT, ₹6,000 cr IPO @ ₹100, listed 24-Mar-2026, 5 toll roads/260.2 km ([Chittorgarh](https://www.chittorgarh.com/ipo/raajmarg-infra-investment-trust-ipo/2863/), [SEBI](https://www.sebi.gov.in/filings/invit-public-issues/feb-2026/raajmarg-infra-investment-trust_100062.html)); PGInvIT ₹12 FY26 DPU, ~12.9% yield, mcap ₹8,627 cr ([Trendlyne](https://trendlyne.com/equity/Dividend/PGINVIT/481511/powergrid-infrastructure-investment-trust-dividend/)). **Flagged approximations:** PGInvIT EV/NAV and NHIT FY26 total DPU (8.07) are estimates — verify against valuation reports. InvIT price history has no local seed: charts populate after first Refresh (NSE securityArchives via refresh_market.py, which now includes NHIT/RIIT/PGINVIT).

**Page 4 `global.html`** — 7 markets (US, JP, AU, SG, HK, CN, IN). `global_data.js` mcap/AUM figures are order-of-magnitude estimates (US ~$1.3tn listed cap; C-REITs +85% in 2024 overtaking HK per [Cushman & Wakefield](https://www.cushmanwakefield.com/en/greater-china/news/2025/12/china-reit-market-accelerates-growth-signaling-new-era-for-real-estate-investment)) — marked editable. Case studies sourced: Easterly DEA 106 props/10.7 msf/93 federal-leased/WALT 9.4y ([Q1-26 results](https://ir.easterlyreit.com/news-releases/news-release-details/easterly-government-properties-reports-first-quarter-2026)); BREIT $54.9bn NAV Mar-26, Nov-22 gating ([SEC filings](https://www.sec.gov/Archives/edgar/data/1662972/000166297226000039/breitnavfebruary2026a.htm)); Temasek S$434bn NPV, India ~$40bn/8%, CLI ~$90bn + Mapletree ~$61bn AUM, merger talks Nov-25 ([Temasek Review](https://www.temasekreview.com.sg/performance-and-portfolio.html), [Mingtiandi](https://www.mingtiandi.com/real-estate/finance/singapores-temasek-said-mulling-merger-of-mapletree-capitaland/), [The Edge](https://www.theedgesingapore.com/cityandcountry/investing-strategies/temaseks-own-shifts-capitaland-mapletree-merger-has-higher)). Top-5 tickers per country hardcoded; C-REIT Yahoo tickers experimental. `refresh_global.py` + serve.py `/refresh-global` pull live quotes.

## Round 7 — drop-caps headings (7 Jul 2026, found by user: Commerzone Yerwada "7.5KAI EY SSUMPTIONS AND NPUTS")

Small-caps section headings had their large initial letters separated from the word bodies in three shapes: (a) caps collected into a preceding fragment ("7.5KAI" / "7.5 K A I" + "EY SSUMPTIONS AND NPUTS" — 26 heading pairs zip-merged with dictionary verification of every rebuilt word), (b) inline splits ("7.5 K EY A SSUMPTIONS AND I NPUTS", "M ARKET V ALUE" — 25 headings joined), (c) one donorless heading ("EY ROJECTIONS OR ASHFLOWS" → "KEY PROJECTIONS FOR CASHFLOWS"). All fixed in annexdata.js. Post-fix corpus scan for decapitated-looking uppercase tokens returns only legitimate acronyms (IBBI, FRICS, INOX, IMAX, MEGA, AUDA, IGIA, ITES); lint 0 defects.

## Round 4 — full-corpus annexure lint (7 Jul 2026, evening)

Replaced the image-review approach with a programmatic lint (`lint_annex.js`) that replicates the modal's exact render pipeline over all 108 annexures and checks every defect class textually (letter-spacing, split digits, TOC leaders, run-on labels, fused table intros, duplicate/subset tables, degenerate/sparse/ragged tables, empty pages). Found and fixed:

- **KRT Y-O-Y misalignment (23 assets, data fix):** every KRT "Y-O-Y Growth (%)" row had 10 values under 11 year headers — the blank FY27 cell (no prior-year growth) was dropped in parsing, shifting all values one year left. Verified arithmetically against NOI series (7,324/7,116 = +2.9% ⇒ FY28) and padded the blank back in `annexdata.js`.
- **Duplicate/fragment tables (render fix):** certificate/section overlap and page-spanning fragments produced exact and near-subset repeats (82 exact + fragments like Bagmane Cosmos p422⊂p425, Madhapur KRIT p131). Render now suppresses tables whose rows are ≥75% contained in a larger table for the same asset.
- **Fragmented certificate tables (render fix):** KRT/Nexus certs split header and data rows into separate 1-row tables; consecutive equal-width fragments whose follower starts with a numeric cell are now stitched into one table.
- **Fused table-intro prose (render fix):** paragraphs like "…table below: The below table highlights…" are split at intro boundaries; runs of 5+ numeric tokens inside prose (flattened NOI/Fitout rows) render as monospace blocks.
- **Split digits (data fix):** "415 .96" and "1,637 .39" (Mindspace) — the only two genuine cases in 1.2 MB.

Lint result after fixes: **0 defects across all 108 assets**. Visual spot-check (headless LibreOffice renders of Sattva Knowledge City and Nexus Westend) confirms. Known residuals: KRT cert movement-table rows partially flattened into prose where the source parse merged them (values present and legible, e.g. "Market rent – Office 108.0 120.0"); Embassy p400 shared-boundary pages show adjacent assets' tables (faithful to source page).

## Post-audit correction (found by user, confirmed and fixed)

The first audit checked annexure **structure** (tables exist, cells intact, correct asset/pages) but not **content legibility** — and Embassy's Annexure-1 cash-flow pages (pp. 389–409) failed exactly there: the PDF letter-spaces every character, which both parsers shredded into unreadable, mis-aligned grids (Manyata, GolfLinks, and every other Embassy asset's DCF table). Fixed with a dedicated grid parser: character-geometry stitching (rejoins split digits like "7 ,989.5" and letter-spaced labels), positional column mapping (each value assigned to the year column it sits under), one table per building block with section subheaders.

The re-parse is now **arithmetically audited**: on every cash-flow block, the parsed "Net operating Income" row equals parsed "Total Income" minus "Total Operating Costs" across all 10–11 forecast years — 5/5 blocks pass exactly. This column-sum identity would fail on any misalignment, so these grids are verified at the number level, not just visually.

**Legibility pass (visually verified):** rendered sample annexures to images via headless LibreOffice and inspected them directly. Fixed: split small-caps headings ("V A F P D S" + "ALUATION SSUMPTIONS…" → "VALUATION ASSUMPTIONS FOR POWER DISTRIBUTION SERVICES"), de-letter-spaced 34 strings, restored per-SPV Madhapur pages (a merge regression had reintroduced campus-wide TOC pages), purged 35 boilerplate/TOC pages, dropped 36 no-table prose-wall pages, split run-on "Label: value Label: value" paragraphs into definition tables, and line-broke fused multi-value cells. Rendered re-scan across all 108 assets: 0 empty, 0 letter-spaced, 0 TOC, 0 run-on labels.

Also filled in this pass: **Brookfield quarterly NDCF FY23–FY25** recovered from comparative columns across the quarterly FS (FY23: 171.9+171.7+167.8+167.2 = ₹678.6 cr vs filed 676.9 — 0.25% restatement gap; FY24 and FY25 tie exactly at 770.5 and 1,055.2). Only Q1/Q2 FY25 remain a DPU-ratio split (est-flagged) and FY22 quarters remain open (fully scanned filings).

Scope: every number series in `data.js` (annual, quarterly, book values, issuances, block deals, SPV values, price history, live prices) and all 108 asset annexures in `annexdata.js`.

## Fixed during audit

**Brookfield FY2022/FY2023 units outstanding** were stored as raw units (302,801,601 / 335,087,073) instead of millions, inflating implied market cap ~1,000,000×. Corrected to 302.80 / 335.09 mn. No other REIT had this bug. This affected nothing visible (units aren't charted directly) but would have corrupted any future per-unit calculation.

## Checks that passed

**Annual series (all 6 REITs, all years):** payout ratio (distribution ÷ NDCF) within 60–115% everywhere; market cap = price × units plausible; debt + equity vs GAV within normal range; book value of real-estate assets ≤ GAV in every year with both.

**Quarterly ↔ annual reconciliation (the strongest check):** quarterly sums tie to the workbook annual figures — Embassy NDCF exact for FY20–FY26 (e.g. FY26: 618.5+617.7+613.7+618.5 = ₹2,400.8 cr = filed total); Embassy quarterly facility rentals sum exactly to the annual revenue-note figures (FY23: 2,379.8; FY25: 2,818.0); Mindspace FY22/24/25 exact, FY26 reconciled to filed totals; Nexus FY24/25/26 NDCF and DPU exact; Brookfield FY26 NDCF exact (quarters derived from the Q3 results' cumulative columns), FY24 DPU exact (3.85+4.40+4.75+4.75 = 17.75); KRT FY26 exact (689.9+695.5+716.6 = ₹2,102.0 cr; DPU 4.75 vs filed 4.74).

**Half-yearly NAV marks** (Embassy Sep points) match the Net-Assets-at-Fair-Value statements verbatim (375.02, 388.26, 400.71, 398.86, 445.91), and every March point equals the annual NAV.

**Issuances:** units × price = stated proceeds within 3% for all 21 events across 6 REITs; each verified against unit-capital notes in the financial statements.

**Block deals (Embassy):** all 8 events cross-checked against exchange bulk/block-deal records; prices sit within normal block-discount range of the market price on the day (e.g. Dec-2023 ₹316 vs market ~₹333 ≈ 5% block discount).

**SPV table:** portfolio share sums to 100.00% on every tab; 10 of 10 sampled asset values found **verbatim** in their valuation reports (e.g. Manyata ₹278,689 Mn, Citywalk ₹50,040 Mn, Sattva Knowledge City ₹122,920 Mn, BWTC ₹85,680.8 Mn, Ecoworld ₹148,279 Mn).

**Annexures:** 108/108 assets populated (1,101 tables, 1,670 paragraphs); zero degenerate tables; zero parse-error pages; all page references within the source PDF's bounds; the asset-to-page mapping verified — 100% of sampled mapped pages contain the asset's name in the raw PDF text (the parsed view strips the running header, which is why the name may not appear in the popup body itself).

**Price history:** no zero/negative/absurd values, no unexplained >35% daily jumps across ~6,000 points; live prices within a normal band of the last historical close.

## Explained warnings (not errors)

- Embassy FY21 and Brookfield FY25: DPU × year-end units ≠ total distribution by ~10% — both years had mid-year unit issuances, so period-weighted units apply. Correct as filed.
- Bagmane book value ≈ 16% of GAV — assets are decades-old Bengaluru parks carried at historical cost; the market-value gap is real, not a data error.
- Brookfield FY24 quarterly NDCF absent (results PDFs are scans; DPU and rentals present).

## Known estimates (flagged with `est` in data.js, shown in chart tooltips)

- Nexus Q1/Q2 FY24 NDCF: H1 split evenly; Q2/Q3 FY24 DPU estimated (FY total exact). Nexus Q2–Q4 FY26: FY residual split evenly (Q2/Q3 filings are scans).
- Brookfield Q1/Q2 FY26 DPU: pair-total 10.50 split 5.20/5.30.
- Mindspace: a few quarters use NDCF ≈ distribution (~100% payout) where the deck omitted the walkdown; FY26 quarters reconciled to filed totals.
- Embassy Q4FY21/Q4FY24 NDCF and some Q4 revenue figures are FY-minus-9M residuals (later confirmed by comparative columns where available).

## Remaining gaps (need text versions of scanned filings)

Brookfield FY22–FY25 quarterly NDCF; Nexus Q2/Q3 FY26 exact split; Mindspace & Embassy FY26 rental/maintenance split; Brookfield FY21 book values.
