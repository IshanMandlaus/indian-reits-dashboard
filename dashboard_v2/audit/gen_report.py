#!/usr/bin/env python3
"""Generate AUDIT_REPORT.md from final_rows.json + fix outcome tags."""
import json, collections

SP = "."
rows = json.load(open(f"{SP}/final_rows.json"))

NAME = {"embassy":"Embassy Office Parks REIT","mindspace":"Mindspace Business Parks REIT",
        "brookfield":"Brookfield India Real Estate Trust","nexus":"Nexus Select Trust",
        "krt":"Knowledge Realty Trust","bagmane":"Bagmane Prime Office REIT","None":"Cross-cutting"}

# extractor misquoted the dashboard value — no error actually existed
MISQUOTES = {("embassy","dpu","Q3FY21"), ("embassy","dpu","Q3FY22")}
# basis rows ALSO corrected for series consistency (beyond strict mismatches)
BASIS_FIXED = {
    ("mindspace","networth","FY2024"),("mindspace","networth","FY2025"),("mindspace","networth","FY2026"),
    ("mindspace","gav","FY2026"),("mindspace","ltv","FY2026"),
    ("brookfield","nav","FY2024"),("brookfield","nav","FY2025"),("brookfield","nav","FY2026"),
    ("brookfield","gav","FY2024"),("brookfield","gav","FY2025"),
    ("nexus","gav","FY2026"),("nexus","cost_debt","FY2026"),
    ("nexus","dpu","FY2024"),("nexus","dist_total","FY2024"),("nexus","dpu","FY2025"),("nexus","dist_total","FY2025"),
}
BASIS_FIXED_EXTRA = [  # basis rows fixed that live under different metric labels
    ("krt","bench_overview.uc_msf"),("krt","bench_overview.future_msf"),
    ("brookfield","bench_overview.uc_msf (under construction)"),("brookfield","bench_overview.future_msf"),
    ("nexus","Nexus Vega City — occ"),("nexus","Nexus MBD Complex — occ"),
]
def is_basis_fixed(reit, metric, period):
    if (reit, metric, period) in BASIS_FIXED: return True
    return any(reit == r and metric.startswith(m.split(" (")[0]) for r, m in BASIS_FIXED_EXTRA)

def esc(s):
    return str(s).replace("|", "\\|").replace("\n", " ") if s is not None else ""

def short(s, n=170):
    s = esc(s)
    return s if len(s) <= n else s[:n-1] + "…"

mism = [x for x in rows if x["verdict"] == "mismatch"]
basis = [x for x in rows if x["verdict"] == "basis_difference"]
unver = [x for x in rows if x["verdict"] == "unverifiable"]
gaps  = [x for x in rows if x["verdict"] == "known_gap"]
counts = collections.Counter(x["verdict"] for x in rows)

out = []
A = out.append
A("<!-- generated tables below; header/summary maintained by hand -->")

A("\n## 3. Confirmed misstatements — corrected\n")
A("Every row was found by an extraction agent reading the cited filing, then independently re-confirmed by a second agent instructed to refute it. All are now fixed in `dashboard_v2/data-src/` (regenerated into `public/data/`).\n")
by_reit = collections.defaultdict(list)
for x in mism:
    reit = x["slice"].split(":")[0]
    key = (reit, x["metric"], x["period"])
    if key in MISQUOTES: continue
    by_reit[reit].append(x)
for reit in ["embassy","mindspace","brookfield","nexus","krt","bagmane","None"]:
    if reit not in by_reit: continue
    A(f"### {NAME[reit]}\n")
    A("| Metric | Period | Was | Corrected to | Source (doc · page) | Note |")
    A("|---|---|---|---|---|---|")
    for x in by_reit[reit]:
        A(f"| {esc(x['metric'])} | {esc(x['period'])} | {esc(x['dashboard_value'])} | {short(x.get('source_value'),60)} | {short(x.get('source_doc'),70)} · p{esc(x.get('page'))} | {short(x.get('verifier_note') or x.get('note'), 200)} |")
    A("")

A("\n## 4. Series-consistency (basis) corrections\n")
A("These values matched *a* real figure in a filing, but on a different basis than the rest of their own series — which misstates trends on the charts. Corrected to the series-consistent basis; the alternative basis is noted.\n")
A("| REIT | Metric | Period | Was | Corrected to | Why |")
A("|---|---|---|---|---|---|")
for x in basis:
    reit = x["slice"].split(":")[0]
    if is_basis_fixed(reit, x["metric"], x["period"]):
        A(f"| {NAME.get(reit,reit)} | {esc(x['metric'])} | {esc(x['period'])} | {esc(x['dashboard_value'])} | — see §7 fix list | {short(x.get('verifier_note') or x.get('note'), 220)} |")

A("\n## 5. Documented basis differences — left as-is\n")
A("Verified as legitimate alternative bases (issuer publishes both, or the dashboard formula is internally consistent). Not errors; listed so chart readers know the definition used.\n")
A("| REIT | Metric | Period | Dashboard | Issuer/alt figure | Note |")
A("|---|---|---|---|---|---|")
for x in basis:
    reit = x["slice"].split(":")[0]
    if not is_basis_fixed(reit, x["metric"], x["period"]):
        A(f"| {NAME.get(reit,reit)} | {esc(x['metric'])} | {esc(x['period'])} | {esc(x['dashboard_value'])} | {short(x.get('source_value'),90)} | {short(x.get('verifier_note') or x.get('note'), 200)} |")

A("\n## 6. Findings refuted in verification (no error existed)\n")
A("| REIT | Metric | Period | Why refuted |")
A("|---|---|---|---|")
for x in rows:
    reit = x["slice"].split(":")[0]
    if (reit, x["metric"], x["period"]) in MISQUOTES:
        A(f"| {NAME.get(reit,reit)} | {esc(x['metric'])} | {esc(x['period'])} | Extraction agent misquoted the dashboard value; the file already held the source value ({esc(x.get('source_value'))}). Caught by pre-edit assertion; no change made. |")
    elif x.get("extract_verdict") in ("mismatch","basis_difference") and x["verdict"] in ("match","rounding"):
        A(f"| {NAME.get(reit,reit)} | {esc(x['metric'])} | {esc(x['period'])} | {short(x.get('verifier_note') or x.get('note'), 240)} |")

A("\n## 8. Unverifiable locally / known gaps\n")
A(f"**Unverifiable ({len(unver)})** — no local document covers these (mostly cap/discount rates not stated in summary valuation reports, some quarterly docs missing, and analyst estimates like FY27 NDCF):\n")
for x in unver:
    A(f"- {x['slice']} · {esc(x['metric'])} {esc(x['period'])} — {short(x.get('note'),140)}")
A(f"\n**Known gaps ({len(gaps)})** — issuer never disclosed (per REIT_data_gaps.md); correctly blank on charts.\n")

open(f"{SP}/report_tables.md","w").write("\n".join(out))
print("tables written:",
      "mismatch", len(mism), "| basis", len(basis), "| unver", len(unver), "| gaps", len(gaps),
      "| verdict counts:", dict(counts))
