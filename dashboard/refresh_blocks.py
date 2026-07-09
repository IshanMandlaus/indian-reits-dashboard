#!/usr/bin/env python3
"""
Fetch block + bulk deals for every listed Indian REIT from NSE (primary) and
BSE (best-effort), and write blocks_live.js — merged onto data.js `blocks` at
page load so chart 2 (New Issuances vs NAV) shows secondary-market block deals
for all REITs, the way Embassy's are hand-curated.

Run:  python3 refresh_blocks.py     (or it runs as part of the Refresh button via serve.py)
Requires: requests · recommended: jugaad-data (NSE session helper) not needed here.

Notes
- NSE's /api/historical/{bulk,block}-deals returns ALL symbols for a date range,
  so we pull once per date-chunk and filter to our symbols.
- A "marker" = the largest single deal on a (symbol, date), kept only if it is
  material (>= VALUE_MIN_CR, or the day's total >= DAY_MIN_CR). This mirrors the
  curated Embassy markers (big sponsor/anchor exits & entries) rather than every
  small bulk trade.
"""
import json, os, sys, time, datetime

try:
    import requests
except ImportError:
    sys.exit("pip install requests, then re-run")

HERE = os.path.dirname(os.path.abspath(__file__))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
TODAY = datetime.date.today()

VALUE_MIN_CR = 50.0     # keep a deal if the single largest leg is >= this
DAY_MIN_CR = 75.0       # or if the symbol's total deal value that day is >= this

# reit key -> {nse symbol, bse scrip, listing month}
SYMBOLS = {
    "embassy":    {"nse": "EMBASSY",   "bse": "542602", "since": "2019-04-01"},
    "mindspace":  {"nse": "MINDSPACE", "bse": "543217", "since": "2020-08-01"},
    "brookfield": {"nse": "BIRET",     "bse": "543261", "since": "2021-02-01"},
    "nexus":      {"nse": "NXST",      "bse": "543321", "since": "2023-05-01"},
    "krt":        {"nse": "KRT",       "bse": "544481", "since": "2025-08-01"},
    "bagmane":    {"nse": "BAGMANE",   "bse": "544758", "since": "2026-05-01"},
}
NSE_BY_SYM = {v["nse"]: k for k, v in SYMBOLS.items()}


def _f(rec, *keys):
    for k in keys:
        if k in rec and rec[k] not in (None, "", "-"):
            return rec[k]
    return None


def _num(v):
    if v is None:
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except ValueError:
        return None


def _norm_date(s):
    s = str(s).strip()
    for fmt in ("%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %b %Y"):
        try:
            return datetime.datetime.strptime(s[:11], fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s[:10]


# ---------------- NSE ----------------
def nse_session():
    """Borrow jugaad-data's live NSE session — it holds valid cookies that beat
    the 503s (same library that cracked the price APIs). Fall back to curl_cffi."""
    warm = ("https://www.nseindia.com/",
            "https://www.nseindia.com/market-data/large-deals",
            "https://www.nseindia.com/report-detail/display-bulk-and-block-deals")
    # 1) jugaad-data live session (proven against NSE /api/*)
    try:
        from jugaad_data.nse import NSELive
        n = NSELive()
        try:
            n.market_status()  # establishes cookies
        except Exception:
            pass
        s = n.s
        for u in warm:
            try:
                s.get(u, timeout=12); time.sleep(0.6)
            except Exception:
                pass
        s.headers["Referer"] = warm[-1]
        return s
    except Exception:
        pass
    # 2) curl_cffi Chrome impersonation
    try:
        from curl_cffi import requests as creq
        s = creq.Session(impersonate="chrome")
    except Exception:
        s = requests.Session()
        s.headers.update({"User-Agent": UA})
    s.headers.update({"Accept": "*/*", "Accept-Language": "en-US,en;q=0.9",
                      "Accept-Encoding": "gzip, deflate, br"})
    for u in warm:
        try:
            s.get(u, timeout=12); time.sleep(0.8)
        except Exception:
            pass
    s.headers["Referer"] = warm[-1]
    return s


def _get_json(s, url, params, tries=3):
    last = None
    for i in range(tries):
        try:
            r = s.get(url, params=params, timeout=25)
            if r.status_code == 503:
                last = RuntimeError("503"); time.sleep(1.5 * (i + 1)); continue
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last = e; time.sleep(1.0 + i)
    raise last or RuntimeError("failed")


def _chunks(since, days=60):
    start = datetime.datetime.strptime(since, "%Y-%m-%d").date()
    cur = start
    while cur < TODAY:
        nxt = min(cur + datetime.timedelta(days=days), TODAY)
        yield cur.strftime("%d-%m-%Y"), nxt.strftime("%d-%m-%Y")
        cur = nxt + datetime.timedelta(days=1)


def nse_deals(s, kind, f, t):
    """kind = 'bulk' or 'block'. Returns normalised records for our symbols."""
    url = f"https://www.nseindia.com/api/historical/{kind}-deals"
    data = _get_json(s, url, {"from": f, "to": t})
    out = []
    for rec in (data.get("data") or []):
        sym = _f(rec, "BD_SYMBOL", "symbol", "Symbol")
        if sym not in NSE_BY_SYM:
            continue
        out.append({
            "reit": NSE_BY_SYM[sym],
            "date": _norm_date(_f(rec, "BD_DT_DATE", "date", "mTIMESTAMP") or ""),
            "client": _f(rec, "BD_CLIENT_NAME", "clientName", "name") or "—",
            "side": (str(_f(rec, "BD_BUY_SELL", "buySell", "buyOrSell") or "").upper()[:4]),
            "qty": _num(_f(rec, "BD_QTY_TRD", "quantity", "qty")),
            "price": _num(_f(rec, "BD_TP_WATP", "watp", "tradePrice", "price")),
            "exch": "NSE", "kind": kind,
        })
    return out


# ---------------- BSE (best-effort) ----------------
_BSE_S = None


def _bse_session():
    global _BSE_S
    if _BSE_S is not None:
        return _BSE_S
    try:
        from curl_cffi import requests as creq
        s = creq.Session(impersonate="chrome")
    except Exception:
        s = requests.Session()
        s.headers.update({"User-Agent": UA})
    s.headers.update({"Accept": "application/json, text/plain, */*",
                      "Referer": "https://www.bseindia.com/"})
    try:
        s.get("https://www.bseindia.com/markets/equity/EQReports/bulk_block_deals.aspx", timeout=12)
    except Exception:
        pass
    _BSE_S = s
    return s


def bse_deals(scrip, kind):
    """kind = 'Bulk' or 'Block'. BSE exposes limited recent deals per scrip."""
    url = f"https://api.bseindia.com/BseIndiaAPI/api/{kind}Deals/w"
    s = _bse_session()
    r = s.get(url, params={"flag": "", "scripcode": scrip}, timeout=15)
    r.raise_for_status()
    data = r.json()
    rows = data if isinstance(data, list) else (data.get("Table") or [])
    out = []
    for rec in rows:
        out.append({
            "date": _norm_date(_f(rec, "Deal_Date", "DealDate", "Date") or ""),
            "client": _f(rec, "ClientName", "Client_Name", "Name") or "—",
            "side": (str(_f(rec, "Deal_Type", "DealType", "BuySell") or "").upper()[:4]),
            "qty": _num(_f(rec, "Quantity", "Qty", "DealQty")),
            "price": _num(_f(rec, "Price", "TradePrice", "WATP")),
            "exch": "BSE", "kind": kind.lower(),
        })
    return out


def aggregate(records):
    """Group per (reit, date); keep material days; emit one marker each."""
    by = {}
    for r in records:
        if not r.get("qty") or not r.get("price") or not r.get("date"):
            continue
        by.setdefault((r["reit"], r["date"]), []).append(r)
    markers = {k: [] for k in SYMBOLS}
    for (reit, date), recs in by.items():
        # largest single leg
        big = max(recs, key=lambda x: (x["qty"] or 0) * (x["price"] or 0))
        big_val = (big["qty"] * big["price"]) / 1e7  # ₹ cr
        # day total per side (avoid double counting matched block legs: take max side)
        buy = sum(x["qty"] for x in recs if x["side"].startswith("B"))
        sell = sum(x["qty"] for x in recs if x["side"].startswith("S"))
        day_qty = max(buy, sell) or big["qty"]
        vwap = sum(x["qty"] * x["price"] for x in recs) / sum(x["qty"] for x in recs)
        day_val = day_qty * vwap / 1e7
        if big_val < VALUE_MIN_CR and day_val < DAY_MIN_CR:
            continue
        exch = "/".join(sorted({x["exch"] for x in recs}))
        side_txt = "sold" if big["side"].startswith("S") else "bought"
        markers[reit].append({
            "date": date,
            "seller": big["client"][:42] + (" +" + str(len(recs) - 1) if len(recs) > 1 else ""),
            "units_mn": round(day_qty / 1e6, 2),
            "price": round(vwap, 2),
            "note": f"{exch} {big['kind']} deal · {big['client'][:36]} {side_txt} "
                    f"{round(big['qty']/1e6,2)} mn @ ₹{round(big['price'],1)}",
        })
    for reit in markers:
        markers[reit].sort(key=lambda m: m["date"])
    return markers


def fetch_all(force=False):
    # Block/bulk deals are curated in data.js (NSE's historical deals API 503s from
    # scripts). The Refresh button must NOT trigger the live fetch — it just spews 503
    # noise. Only attempt it when explicitly run standalone:  python3 refresh_blocks.py
    if not force:
        print("block/bulk deals: curated in data.js — skipping live NSE/BSE fetch "
              "(run `python3 refresh_blocks.py` to attempt a live pull)")
        return {"asof": None, "blocks": {k: [] for k in SYMBOLS}}
    recs = []
    # NSE — one pass of date-chunks covers all symbols
    earliest = min(v["since"] for v in SYMBOLS.values())
    try:
        s = nse_session()
        for kind in ("bulk", "block"):
            for f, t in _chunks(earliest):
                try:
                    recs += nse_deals(s, kind, f, t)
                except Exception as e:
                    print(f"  NSE {kind} {f}->{t} failed: {e}")
                time.sleep(0.6)
        print(f"NSE: {len(recs)} deal legs collected for tracked REITs")
    except Exception as e:
        print("NSE session failed:", e)
    # BSE — best-effort recent deals per scrip
    for reit, cfg in SYMBOLS.items():
        for kind in ("Bulk", "Block"):
            try:
                for d in bse_deals(cfg["bse"], kind):
                    d["reit"] = reit
                    recs.append(d)
            except Exception as e:
                print(f"  BSE {kind} {reit} failed: {e}")
            time.sleep(0.4)
    markers = aggregate(recs)
    for reit, ms in markers.items():
        print(f"{reit:11s} {len(ms)} block/bulk markers")
    return {"asof": datetime.datetime.now().strftime("%d %b %Y %H:%M"), "blocks": markers}


def write_live(out):
    with open(os.path.join(HERE, "blocks_live.js"), "w") as f:
        f.write("window.BLOCKS_LIVE = " + json.dumps(out, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    write_live(fetch_all(force=True))
    print("\nblocks_live.js updated")
