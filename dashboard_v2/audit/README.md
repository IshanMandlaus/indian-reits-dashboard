# Audit cache — extracted source-of-truth values (Jul-2026 filings audit)

**Purpose: never re-extract a number from the PDFs that has already been extracted.**
Before auditing any dashboard value, look it up in `verified_values.json` first — it carries the
figure as printed in the primary document, the document filename, the physical page, the verdict,
and the verification status. Only go back to a PDF for (a) metrics/periods not in the cache,
(b) new filings, or (c) rows marked `PENDING`.

## Files

| File | What it is |
|---|---|
| `verified_values.json` | **The cache.** 2,463 rows: every (reit, metric, period) audited in rounds 1–3 with source_value, source_doc, physical page, verdict, note. `dashboard_value_at_audit` is the pre-fix value — see `AUDIT_REPORT.md` §7 (repo root) for what was changed. |
| `round1_rows.json` | Round 1 raw rows (2,141): full fin/quarterly/SPV/bv/issuances/overview audit vs filings, incl. adversarial-verifier notes. |
| `round23_rows.json` | Rounds 2–3 raw rows (322): unverifiable re-checks (new Embassy AR), area re-check, meta/structures, annexure/link checks, chart-math audit. Rows with `verified_by: "none (run stopped)"` were **never adversarially verified** — treat as candidates, not confirmed. |
| `workbook_citations.json` | 1,815 rows extracted from `Indian_REITs_Key_Financials_FILLED.xlsx` cell comments — the (reit, metric, FY) → (source doc, page, original figure) citation index. Regenerate with `phase0.py` after workbook edits. |
| `crosschecks_latest.json` / `dash_vs_workbook_latest.json` | Post-fix arithmetic cross-checks and dashboard↔workbook diff (all remaining deviations are documented basis effects). |
| `phase0.py` | Re-runnable: rebuilds citation index + dashboard-vs-workbook diff + arithmetic cross-checks (dpu×units≈dist, ltv≈(debt−cash)/gav, Σspv≈gav…). Outputs land next to the script. |
| `slices.py` | Builds per-agent audit slices (per REIT × metric family) for a fresh audit workflow run. |
| `apply_fixes.py` | The round-1 correction script (already applied 16-Jul-2026) — pattern for future fixes: every edit asserts the current value first; skips when the file already holds the source value. |
| `gen_report.py` | Generates the AUDIT_REPORT.md tables from a rows JSON. |

## Ground rules learned the hard way

- Workbook sheets have **CONSOLIDATED and STANDALONE blocks side-by-side** (cols C–J vs L–S) — always read the consolidated block.
- Extraction agents sometimes misquote the *dashboard* value — never apply a fix without asserting the current file value (2 false findings caught this way in round 1).
- Filings are ₹ mn (÷10 = ₹cr); decks are ₹cr; printed page ≠ physical page (front-matter offset).
- Basis conventions locked by the audit (do not "fix" these back): Brookfield NAV = fair-value; Brookfield GAV = 100% portfolio market value; Mindspace GAV/networth = attributable-to-unitholders; Nexus GAV = FS total-assets-at-fair-value; DPU/dist_total = declared-for-year. Nexus NAV remains book-value (issuer's only continuous series) — Chart 8 mixes bases cross-REIT (footnote recommended).
- Workbook was fixed in the same pass (25 cells, "AUDIT FIX 16-Jul-2026" comments) and re-baked via fresh-profile soffice; keep the two in sync from now on.

## Rounds 2–3 close-out (17-Jul-2026, lean single-context pass — page-targeted pdftotext, no agent fan-out)

**Verified & FIXED (data):** Embassy overview 52.5/43.5/6.2/2.8 msf (AR 25-26 p75–76, was 52.6/43.6/7.6/1.4); Embassy FY2020 cost_debt 0.095 → **0.0961** (FY2020 AR p111; workbook D40 fixed + re-baked, "AUDIT FIX 17-Jul-2026" comment); Brookfield Worldmark T1 WALE null → **4.7** (Q4FY26 val report p589); Mindspace Avenue 98 WALE null → **1.6** (val report p1180); Nexus overview area/completed 10.7 → **11.9** (10.7 was retail-only GLA; 11.97 total incl 1.25 msf offices — now consistent with own fin msf_total); Nexus structure note reworded (NSRPL 64.9% economic interest is from **Nexus Shantiniketan**, not ITIPL; ITIPL is plain 50:50); Bagmane links.js label "Detailed Valuation Report" → "Valuation Report" (file is Summary_Valuation_Report.pdf).

**Verified & FIXED (chart math):** `reit.ts fyTs` → `Date.UTC` (was local-midnight vs `dTs` UTC-midnight — 31-Mar closes picked the previous NAV step in negative-UTC TZs); Chart1 DPU-axis `suggestedMax` −Infinity for zero-DPU REITs → explicit `dpu.length` guard (fallback 10); Chart2 `unitsAtDate` rewritten to true as-of units (last FY-end ≤ date + issuance units in between; validated against audit expectations 480.02/640.01/302.8 for Brookfield); SecurityModal day-change now uses last close strictly before the live quote's IST day.

**Documented as-is (basis/design, NOT fixed):** Chart5 quarterly-yield denominator mixes gav/assets_fv (+ tooltip says "GAV"); rebased basket charts step up when KRT/Bagmane/Nexus list mid-window (growing-basket artifact — disclosure candidate); Nexus modal NAV/unit is book-value 87.20 while peers are fair-value (Nexus's only continuous series); Chart3 BV null-components coalesce to 0 (~0.5% understatement in partial-disclosure years); SBI-FD line plots first known step (5.0%) before Jan-2021; Embassy fin msf_op stays 43.4 (valuation-report basis, locked) vs overview 43.5 (AR basis). Post-fix `phase0.py` cross-checks: same 15 documented basis-effect FAILs as the round-1 baseline — no regressions.

**Still open:** InvITs entirely unverified (no local filings — user will add).
