#!/usr/bin/env python3
"""
Refresh benchmark + REIT market data for market.html (page 2).
Run:  python3 refresh_market.py     (or click Refresh on the page via serve.py)

Order of attack per series:
  1. Yahoo Finance chart API — with a proper cookie+crumb session and 429 backoff
  2. NSE India historical APIs (indices + securityArchives) — same session trick
     as refresh_prices.py; also yields true traded turnover for the volume charts
SENSEX comes from Yahoo (^BSESN) or BSE fallback; skipped with a warning if both fail.

Writes bench_live.js next to market.html — merged over bench.js at page load.
Requires: pip install requests · recommended: pip install --upgrade yfinance curl_cffi jugaad-data
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

# security name (bench.js) -> {yahoo, nse (symbol or index name), kind}
SERIES = {
    "NIFTY 50":               {"yahoo": "^NSEI",      "nse": "NIFTY 50",     "kind": "index"},
    "NIFTY REALTY":           {"yahoo": "^CNXREALTY", "nse": "NIFTY REALTY", "kind": "index"},
    "SENSEX":                 {"yahoo": "^BSESN",     "nse": None,           "kind": "index"},
    "Embassy REIT":           {"yahoo": "EMBASSY.NS",   "nse": "EMBASSY",   "kind": "reit"},
    "Mindspace REIT":         {"yahoo": "MINDSPACE.NS", "nse": "MINDSPACE", "kind": "reit"},
    "Brookfield REIT":        {"yahoo": "BIRET.NS",     "nse": "BIRET",     "kind": "reit"},
    "Nexus Select Trust":     {"yahoo": "NXST.NS",      "nse": "NXST",      "kind": "reit"},
    # newer listings: Yahoo's NSE feed lacks them; its BSE feed uses NAME.BO symbols
    "Knowledge Realty Trust": {"yahoo": ["KRT.BO", "KRT.NS"],          "nse": "KRT",     "kind": "reit"},
    "Bagmane REIT":           {"yahoo": ["BAGMANE.BO", "BAGMANE.NS"],  "nse": "BAGMANE", "kind": "reit"},
    # page 3 — InvITs (treated like listed securities on NSE)
    "NHIT InvIT":             {"yahoo": ["NHIT.BO", "NHIT.NS"],        "nse": "NHIT",    "kind": "reit"},
    "Raajmarg InvIT":         {"yahoo": ["RIIT.BO", "RIIT.NS"],        "nse": "RIIT",    "kind": "reit"},
    "PGInvIT":                {"yahoo": "PGINVIT.NS",   "nse": "PGINVIT",   "kind": "reit"},
}


class YahooRateLimited(RuntimeError):
    pass


# Yahoo symbols to sum for 30-day average traded VOLUME (units): NSE + BSE legs.
# ADTV is a volume measure, so we count units traded on BOTH exchanges a name lists on.
ADTV_SYMBOLS = {
    "Embassy REIT":           ["EMBASSY.NS", "EMBASSY.BO"],
    "Mindspace REIT":         ["MINDSPACE.NS", "MINDSPACE.BO"],
    "Brookfield REIT":        ["BIRET.NS", "BIRET.BO"],
    "Nexus Select Trust":     ["NXST.NS", "NXST.BO"],
    "Knowledge Realty Trust": ["KRT.NS", "KRT.BO"],
    "Bagmane REIT":           ["BAGMANE.NS", "BAGMANE.BO"],
    "NHIT InvIT":             ["NHIT.NS", "NHIT.BO"],
    "Raajmarg InvIT":         ["RIIT.NS", "RIIT.BO"],
    "PGInvIT":                ["PGINVIT.NS", "PGINVIT.BO"],
}


def yf_avg_volume(sym, days=30):
    """30-day average daily traded volume (units) for one Yahoo symbol; None on miss."""
    import yfinance as yf
    df = yf.Ticker(sym).history(period="3mo", interval="1d", auto_adjust=False)
    if df is None or df.empty or "Volume" not in df:
        return None
    vols = [float(v) for v in df["Volume"].tolist()[-days:] if v and v == v and v > 0]
    return round(sum(vols) / len(vols)) if vols else None


def _http_status(exc):
    response = getattr(exc, "response", None)
    return getattr(response, "status_code", None)


# ---------------- yfinance (preferred — browser impersonation) ----------------
def yf_history(sym, rng):
    """Fetch daily closes+volume via yfinance. Raises ImportError if not installed."""
    import yfinance as yf
    t = yf.Ticker(sym)
    df = t.history(period=rng, interval="1d", auto_adjust=False)
    if df is None or df.empty:
        raise RuntimeError("yfinance returned no rows")
    px, to = {}, {}
    for idx, row in df.iterrows():
        d = idx.strftime("%Y-%m-%d")
        c = row.get("Close")
        v = row.get("Volume")
        if c == c and c is not None:          # NaN check
            px[d] = round(float(c), 2)
            if v and v == v:
                to[d] = round(float(v) * float(c) / 1e7, 2)  # ≈ turnover cr
    return px, to


# ---------------- Yahoo (cookie + crumb + backoff) ----------------
def yahoo_session():
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "application/json,text/plain,*/*",
                      "Accept-Language": "en-US,en;q=0.9"})
    try:
        s.get("https://fc.yahoo.com", timeout=10)          # sets the A3 cookie
    except Exception:
        pass
    crumb = None
    try:
        r = s.get("https://query2.finance.yahoo.com/v1/test/getcrumb", timeout=10)
        if r.ok and 0 < len(r.text.strip()) < 24:
            crumb = r.text.strip()
    except Exception:
        pass
    return s, crumb


def yahoo_chart(s, crumb, sym, rng):
    params = {"range": rng, "interval": "1d"}
    if crumb:
        params["crumb"] = crumb
    last = None
    for host in ("query2", "query1"):
        for attempt in range(2):
            try:
                r = s.get(f"https://{host}.finance.yahoo.com/v8/finance/chart/{sym}",
                          params=params, timeout=15)
                if r.status_code == 429:
                    wait = 4 if attempt == 0 else 0
                    if wait:
                        print(f"    yahoo 429 for {sym}, waiting {wait}s...")
                        time.sleep(wait)
                        continue
                    raise YahooRateLimited("Yahoo rate limit reached; keeping cached data")
                r.raise_for_status()
                res = r.json()["chart"]["result"][0]
                ts = res.get("timestamp") or []
                q = res["indicators"]["quote"][0]
                px, to = {}, {}
                for i, t in enumerate(ts):
                    d = datetime.datetime.utcfromtimestamp(t).strftime("%Y-%m-%d")
                    c = (q.get("close") or [None])[i]
                    v = (q.get("volume") or [None])[i]
                    if c is not None:
                        px[d] = round(float(c), 2)
                        if v:
                            to[d] = round(float(v) * float(c) / 1e7, 2)  # ≈ turnover cr
                return px, to
            except YahooRateLimited:
                raise
            except requests.HTTPError as e:
                last = e
                if r.status_code != 429:
                    break
            except Exception as e:
                last = e
                break
    raise last or RuntimeError("yahoo failed")


# ---------------- NSE via jugaad-data (handles NSE's cookies properly) ----------------
def nse_jugaad_history(symbol, days_back=1700):
    """pip install jugaad-data — purpose-built NSE client that survives the 503s.
    REIT/InvIT units trade in series RR/IV, so try those before EQ."""
    from jugaad_data.nse import stock_df
    end = TODAY
    start = end - datetime.timedelta(days=days_back)
    last_err = None
    for series in ("IV", "RR", "EQ"):
        try:
            df = stock_df(symbol=symbol, from_date=start, to_date=end, series=series)
            if df is None or df.empty:
                continue
            px, to = {}, {}
            for _, row in df.iterrows():
                d = str(row["DATE"])[:10]
                c = row.get("CLOSE")
                tv = row.get("VALUE")            # traded value, ₹
                if c == c and c is not None:
                    px[d] = round(float(c), 2)
                    if tv and tv == tv:
                        to[d] = round(float(tv) / 1e7, 2)   # -> ₹ cr
            if px:
                return px, to
        except Exception as e:
            last_err = e
    raise last_err or RuntimeError(f"jugaad-data: no rows for {symbol} in IV/RR/EQ")


# ---------------- NSE fallback (indices + securityArchives) ----------------
def nse_session():
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "*/*",
                      "Accept-Language": "en-US,en;q=0.9",
                      "Accept-Encoding": "gzip, deflate, br",
                      "Referer": "https://www.nseindia.com/"})
    s.get("https://www.nseindia.com", timeout=10)
    time.sleep(1)
    # prime the historical-reports page — the API 503s without its cookies
    try:
        s.get("https://www.nseindia.com/report-detail/eq_security", timeout=10)
        s.headers["Referer"] = "https://www.nseindia.com/report-detail/eq_security"
        time.sleep(1)
    except Exception:
        pass
    return s


def _chunks(days_back):
    end = TODAY
    start = end - datetime.timedelta(days=days_back)
    cur = start
    while cur < end:
        nxt = min(cur + datetime.timedelta(days=88), end)
        yield cur.strftime("%d-%m-%Y"), nxt.strftime("%d-%m-%Y")
        cur = nxt + datetime.timedelta(days=1)


def nse_index_history(s, index_name, days_back=400):
    px = {}
    for f, t in _chunks(days_back):
        r = s.get("https://www.nseindia.com/api/historical/indicesHistory",
                  params={"indexType": index_name, "from": f, "to": t}, timeout=15)
        r.raise_for_status()
        recs = (r.json().get("data") or {}).get("indexCloseOnlineRecords") or []
        for rec in recs:
            d = str(rec.get("EOD_TIMESTAMP", ""))[:10]
            v = rec.get("EOD_CLOSE_INDEX_VAL")
            if d and v:
                px[d] = round(float(v), 2)
        time.sleep(0.7)
    return px, {}


def nse_reit_history(s, symbol, days_back=400):
    px, to = {}, {}
    for f, t in _chunks(days_back):
        r = s.get("https://www.nseindia.com/api/historical/securityArchives",
                  params={"from": f, "to": t, "symbol": symbol,
                          "dataType": "priceVolumeDeliverable", "series": "ALL"},
                  timeout=15)
        r.raise_for_status()
        for rec in r.json().get("data") or []:
            d = str(rec.get("mTIMESTAMP") or rec.get("CH_TIMESTAMP") or "")
            try:
                d = datetime.datetime.strptime(d, "%d-%b-%Y").strftime("%Y-%m-%d")
            except ValueError:
                d = d[:10]
            c = rec.get("CH_CLOSING_PRICE")
            tv = rec.get("CH_TOT_TRADED_VAL")          # ₹
            if d and c:
                px[d] = round(float(c), 2)
                if tv:
                    to[d] = round(float(tv) / 1e7, 2)  # -> cr
        time.sleep(0.7)
    return px, to


# ---------------- BSE fallback for SENSEX ----------------
def bse_sensex():
    r = requests.get("https://api.bseindia.com/BseIndiaAPI/api/"
                     "GetSensexHistoricalData/w",
                     params={"period": "5Y"},
                     headers={"User-Agent": UA,
                              "Referer": "https://www.bseindia.com/"}, timeout=15)
    r.raise_for_status()
    px = {}
    for rec in r.json() if isinstance(r.json(), list) else []:
        d, v = str(rec.get("dtTm", ""))[:10], rec.get("vale1") or rec.get("close")
        if d and v:
            px[d] = round(float(v), 2)
    if not px:
        raise RuntimeError("BSE sensex endpoint returned no rows")
    return px, {}


def fetch_all():
    now = datetime.datetime.now().strftime("%d %b %Y %H:%M")
    live = {"asof": now, "sensex": {}, "updates": {}, "turnover_updates": {},
            "adtv_units": {}, "adtv_detail": {}}
    try:
        import yfinance  # noqa: F401
        has_yf = True
        print("using yfinance (browser impersonation)")
    except ImportError:
        has_yf = False
        print("TIP: run  pip install --upgrade yfinance curl_cffi  — it impersonates "
              "a real browser and reliably beats the Yahoo 429s / NSE 503s.")
    ys, crumb = (None, None) if has_yf else yahoo_session()
    ns = None
    yahoo_blocked = has_yf   # skip raw-Yahoo path when yfinance is available
    nse_blocked = False
    for sec, cfg in SERIES.items():
        px, to, src = {}, {}, None
        # indices have 5y seeded in bench.js (1y update is enough); SENSEX has no seed (6y);
        # REITs/InvITs: pull full listed history so Max > 1Y in the popups
        rng = "6y" if sec == "SENSEX" else ("max" if cfg["kind"] == "reit" else "1y")
        if has_yf:
            cands = cfg["yahoo"] if isinstance(cfg["yahoo"], list) else [cfg["yahoo"]]
            for sym in cands:
                try:
                    p2, t2 = yf_history(sym, rng)
                    if len(p2) > len(px):          # keep the richest series
                        px, to, src = p2, t2, f"yfinance:{sym}"
                    if len(px) >= 5:               # good enough — stop trying
                        break
                except Exception as e:
                    print(f"  yfinance {sym} failed for {sec}: {e}")
            if px and len(px) < 5:
                print(f"  note: {sec} best series has only {len(px)} rows — trying NSE fallback")
                src = src or "yfinance(sparse)"
        if not px and not yahoo_blocked:
            try:
                sym0 = cfg["yahoo"][0] if isinstance(cfg["yahoo"], list) else cfg["yahoo"]
                px, to = yahoo_chart(ys, crumb, sym0, rng)
                src = "Yahoo"
            except YahooRateLimited as e:
                yahoo_blocked = True
                print(f"  yahoo failed for {sec}: {e}")
            except Exception as e:
                print(f"  yahoo failed for {sec}: {e}")
        if len(px) < 5 and cfg["nse"] and cfg["kind"] == "reit":
            try:
                p2, t2 = nse_jugaad_history(cfg["nse"])
                if len(p2) > len(px):
                    px, to, src = p2, t2, "NSE:jugaad"
            except ImportError:
                print("  TIP: pip install jugaad-data  — proper NSE client "
                      "(needed for thin-on-BSE names like NHIT)")
            except Exception as e:
                print(f"  jugaad-data failed for {sec}: {e}")
        if len(px) < 5 and cfg["nse"] and not nse_blocked:
            try:
                if ns is None:
                    ns = nse_session()
                if cfg["kind"] == "index":
                    p2, t2 = nse_index_history(ns, cfg["nse"])
                else:
                    p2, t2 = nse_reit_history(ns, cfg["nse"])
                if len(p2) > len(px):
                    px, to, src = p2, t2, "NSE"
            except Exception as e:
                if _http_status(e) in (429, 503):
                    nse_blocked = True
                print(f"  NSE failed for {sec}: {e}")
        if not px and sec == "SENSEX":
            try:
                px, to = bse_sensex()
                src = "BSE"
            except Exception as e:
                print(f"  BSE failed for SENSEX: {e}")
        if px:
            if sec == "SENSEX":
                live["sensex"] = px
            else:
                live["updates"][sec] = px
                if to:
                    live["turnover_updates"][sec] = to
            print(f"{sec:24s} {len(px):5d} closes  (latest {max(px)})  [{src}]")
        else:
            print(f"{sec:24s} FAILED on all sources")
        time.sleep(1.2)
    # ---- ADTV pass: 30-day average traded VOLUME (units), NSE + BSE summed ----
    if has_yf:
        print("computing ADTV (30d avg volume, NSE+BSE)...")
        for sec, syms in ADTV_SYMBOLS.items():
            detail, total = {}, 0
            for sym in syms:
                try:
                    v = yf_avg_volume(sym)
                except Exception as e:
                    v = None
                    print(f"  adtv {sym} failed: {e}")
                if v:
                    exch = "BSE" if sym.endswith(".BO") else "NSE"
                    detail[exch] = v
                    total += v
            if total:
                live["adtv_units"][sec] = total
                live["adtv_detail"][sec] = detail
                print(f"  {sec:24s} ADTV {total:>12,} units  {detail}")
            time.sleep(0.6)
    return live


def write_live(live):
    with open(os.path.join(HERE, "bench_live.js"), "w") as f:
        f.write("window.BENCH_LIVE = " + json.dumps(live, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    data = fetch_all()
    write_live(data)
    ok = len(data["updates"]) + (1 if data["sensex"] else 0)
    print(f"\nbench_live.js updated — {data['asof']} · {ok}/9 series fetched")
