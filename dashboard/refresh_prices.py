#!/usr/bin/env python3
"""
Refresh live REIT prices for the dashboard.
Run:  python3 refresh_prices.py        (from the dashboard folder)
Writes prices.js next to dashboard.html. NSE first, BSE fallback.
Tip: `python3 serve.py` serves the dashboard with a working Refresh button.
Requires: pip install requests
"""
import json, time, datetime, os, sys

try:
    import requests
except ImportError:
    sys.exit("pip install requests, then re-run")

HERE = os.path.dirname(os.path.abspath(__file__))

# BSE scrip codes verified Jul 2026 (KRT 544481, Bagmane 544758).
REITS = {
    "embassy":    {"nse": "EMBASSY",   "bse": "542602"},
    "mindspace":  {"nse": "MINDSPACE", "bse": "543217"},
    "brookfield": {"nse": "BIRET",     "bse": "543261"},
    "nexus":      {"nse": "NXST",      "bse": "543913"},
    "krt":        {"nse": "KRT",       "bse": "544481"},
    "bagmane":    {"nse": "BAGMANE",   "bse": "544758"},
}

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def nse_session():
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "*/*",
                      "Accept-Language": "en-US,en;q=0.9",
                      "Referer": "https://www.nseindia.com/"})
    s.get("https://www.nseindia.com", timeout=10)
    time.sleep(1)
    return s


def nse_quote(s, symbol):
    r = s.get(f"https://www.nseindia.com/api/quote-equity?symbol={symbol}",
              timeout=10)
    p = r.json().get("priceInfo", {}).get("lastPrice")
    return float(p) if p else None


def bse_quote(scrip):
    r = requests.get(
        "https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w",
        params={"scripcode": scrip, "flag": "0", "fromdate": "",
                "todate": "", "seriesid": ""},
        headers={"User-Agent": UA, "Referer": "https://www.bseindia.com/"},
        timeout=10)
    j = r.json()
    p = j.get("CurrVal") or j.get("PrevClose")
    return float(p) if p else None


def fetch_all():
    out, now = {}, datetime.datetime.now().strftime("%d %b %Y %H:%M")
    s = None
    try:
        s = nse_session()
    except Exception as e:
        print("NSE session failed:", e)
    for key, ids in REITS.items():
        price, src = None, None
        if s:
            try:
                price, src = nse_quote(s, ids["nse"]), "NSE"
            except Exception:
                price = None
            time.sleep(0.8)
        if price is None:
            try:
                price, src = bse_quote(ids["bse"]), "BSE"
            except Exception:
                price = None
        if price:
            out[key] = {"price": round(price, 2), "asof": now, "src": src}
            print(f"{key:11s} {price:>10.2f}  ({src})")
        else:
            print(f"{key:11s}  -- failed (NSE & BSE)")
    out["_asof"] = now
    return out


def write_prices(out):
    with open(os.path.join(HERE, "prices.js"), "w") as f:
        f.write("window.LIVE_PRICES = " + json.dumps(out, indent=1) + ";")


if __name__ == "__main__":
    data = fetch_all()
    write_prices(data)
    print("\nprices.js updated —", data.get("_asof"))
