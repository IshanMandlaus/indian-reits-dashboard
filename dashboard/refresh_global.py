#!/usr/bin/env python3
"""
Refresh live quotes for the global REIT page (page 4).
Run:  python3 refresh_global.py    (or click Refresh on the page via serve.py)

Pulls each top-5 ticker from global_data.js via Yahoo's chart API (cookie+crumb
session, 429 backoff). Writes global_live.js: {asof, quotes:{ticker:{price,ccy,mcap}}}.
C-REIT (.SS/.SZ fund) tickers may fail on Yahoo — they're reported and skipped.
Requires: pip install requests · strongly recommended: pip install --upgrade yfinance curl_cffi
"""
import json, os, re, sys, time, datetime

try:
    import requests
except ImportError:
    sys.exit("pip install requests, then re-run")

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from refresh_market import yahoo_session  # reuse cookie+crumb session

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def tickers_from_data():
    src = open(os.path.join(HERE, "global_data.js")).read()
    return sorted(set(re.findall(r'"([A-Z0-9^.\-]{1,12}\.(?:NS|T|AX|SI|HK|SS|SZ|BO))"', src)
                      + re.findall(r'\["[^"]+","([A-Z]{1,6})","', src)))


def quote(s, crumb, sym):
    params = {"range": "5d", "interval": "1d"}
    if crumb:
        params["crumb"] = crumb
    for host in ("query2", "query1"):
        for attempt in range(3):
            r = s.get(f"https://{host}.finance.yahoo.com/v8/finance/chart/{sym}",
                      params=params, timeout=15)
            if r.status_code == 429:
                time.sleep(4 * (attempt + 1))
                continue
            r.raise_for_status()
            meta = r.json()["chart"]["result"][0]["meta"]
            return {"price": round(float(meta.get("regularMarketPrice")), 2),
                    "ccy": meta.get("currency"),
                    "mcap": meta.get("marketCap")}  # often absent in chart meta
    raise RuntimeError("429 persisted")


def yf_quote(tk):
    """Quote via yfinance fast_info (browser impersonation — beats 429s)."""
    import yfinance as yf
    fi = yf.Ticker(tk).fast_info
    price = fi.get("last_price") or fi.get("lastPrice")
    if not price:
        raise RuntimeError("no price in fast_info")
    return {"price": round(float(price), 2),
            "ccy": fi.get("currency"),
            "mcap": fi.get("market_cap") or fi.get("marketCap")}


def fetch_all():
    now = datetime.datetime.now().strftime("%d %b %Y %H:%M")
    try:
        import yfinance  # noqa: F401
        has_yf = True
        print("using yfinance (browser impersonation)")
    except ImportError:
        has_yf = False
        print("TIP: run  pip install --upgrade yfinance curl_cffi  — far more reliable "
              "than raw Yahoo calls.")
    s, crumb = (None, None) if has_yf else yahoo_session()
    out = {"asof": now, "quotes": {}, "hist": {}}
    for tk in tickers_from_data():
        try:
            out["quotes"][tk] = yf_quote(tk) if has_yf else quote(s, crumb, tk)
            print(f"{tk:12s} {out['quotes'][tk]['price']:>12,.2f} {out['quotes'][tk]['ccy'] or ''}")
        except Exception as e:
            print(f"{tk:12s} FAILED: {e}")
        # 1y of daily closes for the click-through chart
        if has_yf:
            try:
                import yfinance as yf
                df = yf.Ticker(tk).history(period="5y", interval="1d", auto_adjust=False)
                if df is not None and not df.empty:
                    out["hist"][tk] = {i.strftime("%Y-%m-%d"): round(float(r["Close"]), 2)
                                       for i, r in df.iterrows() if r["Close"] == r["Close"]}
            except Exception as e:
                print(f"{tk:12s} hist skipped: {e}")
        time.sleep(0.4 if has_yf else 0.7)
    if has_yf:
        return out
    # try to enrich with market caps via the quote endpoint (may 401 without crumb)
    syms = ",".join(out["quotes"].keys())
    try:
        params = {"symbols": syms}
        if crumb:
            params["crumb"] = crumb
        r = s.get("https://query1.finance.yahoo.com/v7/finance/quote",
                  params=params, timeout=20)
        if r.ok:
            for q in r.json().get("quoteResponse", {}).get("result", []):
                t = q.get("symbol")
                if t in out["quotes"] and q.get("marketCap"):
                    out["quotes"][t]["mcap"] = q["marketCap"]
    except Exception as e:
        print("mcap enrich skipped:", e)
    return out


def write_live(out):
    with open(os.path.join(HERE, "global_live.js"), "w") as f:
        f.write("window.GLOBAL_LIVE = " + json.dumps(out, separators=(",", ":")) + ";\n")
    # Also feed the v2 React app (public/data/global-live.json); no-op if absent.
    try:
        from _v2json import emit as _emit_v2
        _emit_v2("global-live", out)
    except Exception:
        pass


if __name__ == "__main__":
    data = fetch_all()
    write_live(data)
    print(f"\nglobal_live.js updated — {data['asof']} · {len(data['quotes'])} quotes")
