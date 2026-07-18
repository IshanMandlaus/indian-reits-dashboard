#!/usr/bin/env python3
"""Build per-agent audit slices: <reit>_<family>.json under slices/."""
import json, os, subprocess, datetime

BASE = "/Users/ishan/Downloads/INDIAN REITS"
DASH = os.path.join(BASE, "dashboard_v2")
OUT = os.path.dirname(os.path.abspath(__file__))
SL = os.path.join(OUT, "slices"); os.makedirs(SL, exist_ok=True)

citations = json.load(open(os.path.join(OUT, "citations.json")))
targets = json.load(open(os.path.join(OUT, "targets.json")))
annexures = json.load(open(os.path.join(DASH, "public/data/annexures.json")))
price_hist = json.load(open(os.path.join(DASH, "public/data/price-history.json")))

FOLDERS = {"embassy": "Embassy", "mindspace": "MindSpace", "brookfield": "Brookfield",
           "nexus": "Nexus", "krt": "KRT", "bagmane": "Bagmane"}

KNOWN_GAPS = {  # from REIT_data_gaps.md — do not flag these as errors
    "mindspace": ["OpEx FY24-26 (structural n/a)"],
    "brookfield": ["OpEx FY24-26", "In-place Occ FY25-26", "Tenants FY25-26"],
    "nexus": ["UC+Future FY24-26", "In-place Rent FY26"],
    "krt": ["In-place Occ FY26"],
    "bagmane": ["nearly all FY26 operating financials (pre-operational; proforma from RHP)"],
    "embassy": ["Committed Occupancy FY24/25 (issuer reported physical only)"],
}

def pdf_listing(reit):
    d = os.path.join(BASE, FOLDERS[reit])
    rows = []
    for f in sorted(os.listdir(d)):
        if f.lower().endswith(".pdf"):
            p = os.path.join(d, f)
            rows.append({"file": p, "mb": round(os.path.getsize(p)/1e6, 1)})
    offer = os.path.join(BASE, "Final Offer Documents")
    for f in sorted(os.listdir(offer)):
        lf = f.lower()
        key = {"embassy":"embassy","mindspace":"mindspace","brookfield":"brookfield",
               "nexus":"nexus","krt":"knowledge","bagmane":"bagmane"}[reit]
        if key in lf or (reit=="bagmane" and lf.startswith("final_offer")):
            rows.append({"file": os.path.join(offer, f), "mb": round(os.path.getsize(os.path.join(offer,f))/1e6,1)})
    return rows

def cit_for(reit, labels):
    return [c for c in citations if c["reit"] == reit and c["metric"] in labels and (c.get("source") or c.get("wb_value") is not None)]

FAM = {
 "A_pnl": {
   "fin_keys": ["revenue", "rev_rental", "rev_maint", "ndcf", "dist_total", "dpu"],
   "labels": ["Revenue from Operations", "Net Distributable Cash Flow (NDCF)", "Total Distribution",
              "Distribution per Unit (DPU)", "NDCF Payout Ratio"],
 },
 "B_bs": {
   "fin_keys": ["gross_debt", "cash", "networth", "nav", "units_mn", "ltv", "cost_debt"],
   "labels": ["Gross Debt", "Cash & Cash Equivalents", "Net Worth / Unitholders Equity", "NAV per Unit",
              "Units Outstanding", "Cost of Debt", "Loan-to-Value (LTV)",
              "Gross Debt - external (banks/NCDs/LRD)", "Cost of Debt (wtd avg)", "Net Debt"],
 },
 "C_gav_area": {
   "fin_keys": ["gav", "msf_total", "msf_op"],
   "labels": ["Gross Asset Value (GAV) / AUM", "Total Leasable Area (GLA)", "Operational Area",
              "Under Construction + Future Development"],
 },
}

slices = []
for reit in FOLDERS:
    fin = targets["fin"][reit]
    pdfs = pdf_listing(reit)
    gaps = KNOWN_GAPS.get(reit, [])
    # A, B, C
    for fam, spec in FAM.items():
        tv = {k: {"years": fin["years"], "values": fin.get(k)} for k in spec["fin_keys"] if fin.get(k)}
        if not tv: continue
        s = {"reit": reit, "family": fam, "dashboard_values": tv,
             "workbook_citations": cit_for(reit, spec["labels"]),
             "known_gaps": gaps, "pdfs": pdfs}
        if fam == "C_gav_area":
            s["val_hy"] = targets["val_hy"].get(reit)
            src = os.path.join(BASE, "REIT_AUM_MSF_sources", f"{reit}.json")
            s["aum_msf_sources_file"] = src if os.path.exists(src) else None
        p = os.path.join(SL, f"{reit}_{fam}.json"); json.dump(s, open(p, "w"), indent=1)
        slices.append({"reit": reit, "family": fam, "path": p})
    # D spv
    spv = targets["spv"].get(reit)
    if spv:
        s = {"reit": reit, "family": "D_spv", "spv_assets": spv,
             "annexures": annexures.get(reit), "known_gaps": gaps, "pdfs": pdfs,
             "latest_gav_fin": (fin.get("gav") or [None])[-1]}
        p = os.path.join(SL, f"{reit}_D_spv.json"); json.dump(s, open(p, "w"), indent=1)
        slices.append({"reit": reit, "family": "D_spv", "path": p})
    # E facts
    ov = next((o for o in targets["bench_overview"] or [] if reit[:4] in (o.get("security","")+o.get("name","")).lower() or
               (reit=="krt" and "knowledge" in (o.get("name","")).lower()) or
               (reit=="embassy" and "embassy" in (o.get("name","")).lower()) or
               (reit=="mindspace" and "mindspace" in (o.get("name","")).lower()) or
               (reit=="brookfield" and "brookfield" in (o.get("name","")).lower()) or
               (reit=="nexus" and "nexus" in (o.get("name","")).lower()) or
               (reit=="bagmane" and "bagmane" in (o.get("name","")).lower())), None)
    met = next((m for m in targets["bench_metrics"] or [] if ov and m.get("security")==ov.get("security")), None)
    ipo_src = os.path.join(BASE, "REIT_IPO_Snapshot_sources", f"{reit}.json")
    s = {"reit": reit, "family": "E_facts",
         "issuances": targets["issuances"].get(reit), "blocks": targets["blocks"].get(reit),
         "bv": targets["bv"].get(reit), "bench_overview": ov, "bench_metrics": met,
         "notes": targets.get("notes"), "known_gaps": gaps, "pdfs": pdfs,
         "ipo_snapshot_sources_file": ipo_src if os.path.exists(ipo_src) else None}
    p = os.path.join(SL, f"{reit}_E_facts.json"); json.dump(s, open(p, "w"), indent=1)
    slices.append({"reit": reit, "family": "E_facts", "path": p})
    # F quarterly (split if > 14 quarters)
    q = fin.get("q") or []
    if q:
        halves = [q] if len(q) <= 14 else [q[:len(q)//2], q[len(q)//2:]]
        for i, chunk in enumerate(halves):
            fam = "F_quarterly" if len(halves) == 1 else f"F_quarterly{i+1}"
            s = {"reit": reit, "family": fam, "quarters": chunk, "known_gaps": gaps, "pdfs": pdfs}
            p = os.path.join(SL, f"{reit}_{fam}.json"); json.dump(s, open(p, "w"), indent=1)
            slices.append({"reit": reit, "family": fam, "path": p})

json.dump(slices, open(os.path.join(OUT, "slice_index.json"), "w"), indent=1)
print(f"{len(slices)} slices written")
for s in slices: print(" ", s["reit"], s["family"])

# ---- bonus inline check: fin.price_eoy vs price-history.json FY-end close ----
PH_KEYS = {"embassy":"embassy","mindspace":"mindspace","brookfield":"brookfield","nexus":"nexus","krt":"krt","bagmane":"bagmane"}
print("\nprice_eoy vs price-history FY-end close:")
for reit, phk in PH_KEYS.items():
    hist = price_hist.get(phk) or price_hist.get(phk.upper())
    if not hist: print(f"  {reit}: no price history key"); continue
    series = hist if isinstance(hist, list) else hist.get("prices") or hist.get("points")
    if not series: print(f"  {reit}: unknown history shape {list(hist)[:5] if isinstance(hist,dict) else '?'}"); continue
    closes = {}
    for pt in series:
        d, v = (pt[0], pt[1]) if isinstance(pt, list) else (pt.get("d") or pt.get("date"), pt.get("c") or pt.get("close"))
        closes[d[:10]] = v
    fin = targets["fin"][reit]
    for i, fy in enumerate(fin["years"]):
        pe = (fin.get("price_eoy") or [None]*99)[i]
        if pe is None: continue
        yr = int(fy[2:]);  # FY2021 -> Mar 2021
        # find last close on or before 31 Mar
        cands = [d for d in closes if d <= f"{yr}-03-31" and d >= f"{yr}-03-01"]
        if not cands: print(f"  {reit} {fy}: no Mar closes; dash={pe}"); continue
        d = max(cands); c = closes[d]
        flag = "OK" if abs(c - pe) <= max(0.5, 0.005*pe) else "** DIFF"
        if flag != "OK": print(f"  {flag} {reit} {fy}: dash={pe} csv({d})={c}")
print("price_eoy check done")
