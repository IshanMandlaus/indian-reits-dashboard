#!/usr/bin/env python3
"""Apply audit corrections to dashboard_v2 data-src masters.
Every fix asserts the current (wrong) value first — abort loudly on any surprise."""
import json, math, sys

DS = "/Users/ishan/Downloads/INDIAN REITS/dashboard_v2/data-src"

def load(path, prefix):
    raw = open(path).read()
    assert raw.startswith(prefix), f"{path}: unexpected prefix"
    payload = raw[len(prefix):].rstrip()
    tail = raw[len(prefix) + len(payload):]          # trailing newline/semicolon
    if payload.endswith(";"): payload, tail = payload[:-1], ";" + tail
    obj = json.loads(payload)
    rt = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    if rt != payload:
        # tolerate float-repr diffs only if lengths tell us something is off
        print(f"WARNING {path}: round-trip differs (len {len(rt)} vs {len(payload)}) — checking semantic equality")
        assert json.loads(rt) == obj
    return obj, tail

def save(path, prefix, obj, tail):
    open(path, "w").write(prefix + json.dumps(obj, separators=(",", ":"), ensure_ascii=False) + tail)

SKIPPED = []   # fixes not needed: file already holds the source value (extractor misquoted dashboard)

def _eq(a, b):
    if a is None or b is None: return a is b
    if isinstance(a,(int,float)) and isinstance(b,(int,float)): return math.isclose(a, b, rel_tol=1e-9)
    return a == b

def _apply(label, cur, old, new, setter):
    if _eq(cur, old):
        setter(new); print(f"  {label}: {old} -> {new}")
    elif _eq(cur, new):
        SKIPPED.append(label); print(f"  SKIP {label}: file already {new} (extractor misquoted dashboard; no error existed)")
    else:
        raise AssertionError(f"{label}: expected {old} or {new}, found {cur}")

def setfin(fin, reit, key, fy, old, new):
    i = fin[reit]["years"].index(fy)
    _apply(f"fin {reit}.{key} {fy}", fin[reit][key][i], old, new, lambda v: fin[reit][key].__setitem__(i, v))

def setq(fin, reit, q, key, old, new):
    row = next(r for r in fin[reit]["q"] if r["q"] == q)
    _apply(f"q {reit} {q} {key}", row.get(key), old, new, lambda v: row.__setitem__(key, v))

data, dtail = load(f"{DS}/data.js", "window.REIT_DATA = ")
fin, bv, spv, iss = data["fin"], data["bv"], data["spv"], data["issuances"]

print("== data.js fin ==")
# Embassy
setfin(fin, "embassy", "gav", "FY2022", 49007.8, 49367.4)       # AR FY22 SoNA GAV 493,674.00 mn (4x corroborated)
setfin(fin, "embassy", "ltv", "FY2022", 0.2349, 0.2332)         # recomputed (12101.35-588.45)/49367.4, series formula
setfin(fin, "embassy", "price_eoy", "FY2025", 365.49, 367.99)   # last FY25 close 28-Mar-2025 per exchange CSV
setq(fin, "embassy", "Q1FY20", "rev", 473.8, 535.1)             # was office-segment revenue, not total
setq(fin, "embassy", "Q3FY21", "dpu", 5.6, 4.55)                # 5.60 is Q4FY21's DPU
setq(fin, "embassy", "Q4FY21", "rev_maint", 74.3, 112.66)       # Note 31 Q4FY21 = 1,126.61 mn
setq(fin, "embassy", "Q3FY22", "dpu", 5.26, 5.2)                # 5.26 is Q4FY22's DPU
# Mindspace
setfin(fin, "mindspace", "rev_rental", "FY2021", 925.3, 902.4)  # FS Note 32 actual split, not proforma mix
setfin(fin, "mindspace", "rev_maint", "FY2021", 171.9, 166.5)
setfin(fin, "mindspace", "msf_total", "FY2026", 38.2, 39.3)     # year-end AR26, not Sep-25 interim
setfin(fin, "mindspace", "msf_op", "FY2026", 31, 32.0)
setfin(fin, "mindspace", "gav", "FY2026", 49711.61, 47634.97)   # attributable basis, consistent with FY21-25
setfin(fin, "mindspace", "ltv", "FY2026", 0.2365, 0.2469)       # (12976.17-1217.59)/47634.97, series formula
setfin(fin, "mindspace", "networth", "FY2024", 14928.54, 14168.9)   # attributable-to-unitholders, consistent w/ FY21-23
setfin(fin, "mindspace", "networth", "FY2025", 14810.55, 14054.44)
setfin(fin, "mindspace", "networth", "FY2026", 15796.83, 15046.82)
setq(fin, "mindspace", "Q1FY26", "dpu", 5.6, 5.79)
setq(fin, "mindspace", "Q2FY26", "ndcf", 357, 364.5)
setq(fin, "mindspace", "Q2FY26", "dpu", 5.64, 5.83)
setq(fin, "mindspace", "Q3FY26", "dpu", 6, 5.83)
setq(fin, "mindspace", "Q4FY26", "dpu", 6.84, 6.64)
# Brookfield
setfin(fin, "brookfield", "dist_total", "FY2022", 740.48, 685.66)   # AR FY22 sum of declared qtrs 6,856.57 mn
setfin(fin, "brookfield", "dist_total", "FY2024", 779.4, 774.49)    # AR FY24 verbatim 7,744.90 mn
setfin(fin, "brookfield", "ltv", "FY2025", 0.2972, 0.2811)          # issuer LTV (4 sources)
setfin(fin, "brookfield", "ltv", "FY2026", 0.3088, 0.3402)
setfin(fin, "brookfield", "cost_debt", "FY2026", 0.0805, 0.073)     # Q4FY26 deck, not stale analyst report
setfin(fin, "brookfield", "msf_total", "FY2026", 32.43, 37.03)      # valuation TOTAL row, not Completed col
setfin(fin, "brookfield", "nav", "FY2024", 233.57, 332.6)           # fair-value NAV, consistent with FY21-23
setfin(fin, "brookfield", "nav", "FY2025", 230.85, 336.35)
setfin(fin, "brookfield", "nav", "FY2026", 233.87, 386.66)
setfin(fin, "brookfield", "gav", "FY2024", 30719.83, 29225)         # portfolio MV basis, consistent series
setfin(fin, "brookfield", "gav", "FY2025", 34031.31, 37954)         # AR24-25 p141 100% portfolio table
setq(fin, "brookfield", "Q1FY25", "ndcf", 213.5, 210.26)
setq(fin, "brookfield", "Q2FY25", "pat", 20.55, 25.23)
setq(fin, "brookfield", "Q2FY25", "ndcf", 225.3, 228.48)
setq(fin, "brookfield", "Q1FY26", "rev_ops", 650.49, 641.62)
# Nexus
setfin(fin, "nexus", "rev_maint", "FY2024", 94, 351.78)             # was Marketing Income line
setfin(fin, "nexus", "rev_maint", "FY2025", 110.22, 420.07)
setfin(fin, "nexus", "nav", "FY2026", 87.7, 87.2)                   # OCR misread of 87.20
setfin(fin, "nexus", "gav", "FY2026", 30558.3, 32240.6)             # FS Total-Assets basis, consistent w/ FY24-25
setfin(fin, "nexus", "ltv", "FY2026", 0.2016, 0.1911)               # recomputed on consistent GAV
setfin(fin, "nexus", "cost_debt", "FY2026", 0.075, 0.073)           # FY-end figure, not H1 interim
setfin(fin, "nexus", "dpu", "FY2024", 4.99, 7.075)                  # declared-for-year, series convention
setfin(fin, "nexus", "dist_total", "FY2024", 755.08, 1071.86)
setfin(fin, "nexus", "dpu", "FY2025", 8.15, 8.35)
setfin(fin, "nexus", "dist_total", "FY2025", 1234.72, 1265.03)
setq(fin, "nexus", "Q3FY24", "dpu", 1.45, 2.0)
setq(fin, "nexus", "Q4FY25", "dpu", 1.8, 2.0)
setq(fin, "nexus", "Q2FY26", "ndcf", 313.8, 320.82)
setq(fin, "nexus", "Q2FY26", "dpu", 2.28, 2.198)
setq(fin, "nexus", "Q3FY26", "pat", 39.4, 139.4)
setq(fin, "nexus", "Q3FY26", "ndcf", 313.8, 317.36)
setq(fin, "nexus", "Q3FY26", "dpu", 2.28, 2.367)
setq(fin, "nexus", "Q4FY26", "ndcf", 313.8, 339.97)
# Bagmane (values disclosed in RHP but left null)
setfin(fin, "bagmane", "revenue", "FY2023", None, 1979.31)
setfin(fin, "bagmane", "rev_rental", "FY2023", None, 1603.09)
setfin(fin, "bagmane", "rev_rental", "FY2024", None, 1785.11)
setfin(fin, "bagmane", "rev_rental", "FY2025", None, 2000.9)
setfin(fin, "bagmane", "rev_maint", "FY2023", None, 228.68)
setfin(fin, "bagmane", "rev_maint", "FY2024", None, 238.45)
setfin(fin, "bagmane", "rev_maint", "FY2025", None, 257.06)

print("== data.js bv ==")
def setbv(reit, fy, key, old, new):
    _apply(f"bv {reit} {fy} {key}", bv[reit][fy].get(key), old, new, lambda v: bv[reit][fy].__setitem__(key, v))
setbv("mindspace", "FY2024", "ipud", 672.67, 1456.7)   # FY25 value had been duplicated into FY24
setbv("brookfield", "FY2022", "goodwill", 237.39, None) # Rostrum JV goodwill (Jun-2024) carried back in error
setbv("brookfield", "FY2023", "goodwill", 237.39, None)
setbv("brookfield", "FY2024", "goodwill", 237.39, None)
setbv("nexus", "FY2025", "ipud", None, 2.24)            # separately disclosed, wrongly marked n/a
setbv("nexus", "FY2026", "ipud", None, 6.95)
setbv("bagmane", "FY2023", "cwip", 4.85, 0)             # RHP combined BS shows nil

print("== data.js spv ==")
def setspv(reit, asset_sub, key, old, new):
    row = next(r for r in spv[reit] if asset_sub in r["asset"])
    _apply(f"spv {reit} {row['asset']} {key}", row.get(key), old, new, lambda v: row.__setitem__(key, v))
setspv("mindspace", "Raidurg", "mkt_rent", None, 105)
setspv("mindspace", "Porur", "wale", None, 8.1)
setspv("brookfield", "Ecoworld", "cap_rate", 0.08, 0.0775)
setspv("nexus", "Fiza", "mkt_rent", 86.5, 59.7)         # Celebration's rents were mis-copied into Fiza
setspv("nexus", "Fiza", "inplace_rent", 82.4, 56.5)
setspv("nexus", "Vega", "occ", 0.99, 0.98)              # leased-area basis (peer convention); 0.99 was committed
setspv("nexus", "MBD", "occ", 0.99, 0.88)

print("== data.js issuances ==")
row = next(r for r in iss["brookfield"] if r["date"] == "2022-06")
assert abs(row["units_mn"] - 15.46) < 0.01, row
row["date"] = "2022-01"
row["note"] = "Preferential allotment 24-Jan-2022 to BSREP India Office Holdings IV as consideration for SDPL Noida (FY22 AR p66)"
print(f"  issuance brookfield SDPL: 2022-06 -> 2022-01")

blocks = data["blocks"]
nx = [b for b in blocks.get("nexus", []) if b.get("date","").startswith("2024-08")]
for b in nx:
    if "21.3" in (b.get("note") or ""):
        b["note"] = b["note"].replace("21.3", "22.3")
        print(f"  block nexus 2024-08 note: 21.3% -> 22.3% (audited AR unit count)")

save(f"{DS}/data.js", "window.REIT_DATA = ", data, dtail)

# ---- bench.js overview ----
bench, btail = load(f"{DS}/bench.js", "window.BENCH = ")
print("== bench.js overview ==")
def setov(namesub, key, old, new):
    row = next(o for o in bench["overview"] if namesub.lower() in (o.get("name","")+o.get("security","")).lower())
    _apply(f"overview {namesub} {key}", row.get(key), old, new, lambda v: row.__setitem__(key, v))
setov("Mindspace", "uc_msf", 4.4, 5.4)
setov("Mindspace", "future_msf", 2.9, 1.9)
setov("Mindspace", "sponsor", "K Raheja Corp Group (backed by Blackstone)", "K Raheja Corp Group")
setov("Mindspace", "occupancy", 0.93, 0.94)               # 31-Mar-26 committed occupancy
setov("Brookfield", "ipo", "2021-02-01", "2021-02-16")    # actual listing date
setov("Brookfield", "uc_msf", 0.7, 0.6)                   # AR26 current split
setov("Brookfield", "future_msf", 3.9, 4.0)
setov("Nexus", "ipo", "2023-05-01", "2023-05-19")
setov("Knowledge", "ipo", "2025-08-01", "2025-08-18")     # listing date, consistent basis
setov("Knowledge", "uc_msf", 1.2, 2.6)                    # Mar-26 split (was IPO-time Mar-25)
setov("Knowledge", "future_msf", 8, 6.6)
save(f"{DS}/bench.js", "window.BENCH = ", bench, btail)

# ---- val_hy.js ----
vh, vtail = load(f"{DS}/val_hy.js", "window.REIT_VAL_HY = ")
pt = next(p for p in vh["mindspace"] if p["d"] == "2022-09-30")
assert pt["gav"] == 27616, pt
pt["gav"] = 27282.9
print("== val_hy.js ==\n  mindspace 2022-09-30 gav: 27616 -> 27282.9")
save(f"{DS}/val_hy.js", "window.REIT_VAL_HY = ", vh, vtail)

print(f"\nALL FIXES APPLIED OK — {len(SKIPPED)} skipped (already correct): {SKIPPED}")
json.dump(SKIPPED, open("./skipped_fixes.json", "w"))
