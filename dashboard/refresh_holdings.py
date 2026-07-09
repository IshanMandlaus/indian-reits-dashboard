#!/usr/bin/env python3
"""
Refresh the unit-holding (shareholding) pattern for each REIT from NSE.

For a REIT, NSE's "shareholding pattern" filing IS the unit-holding pattern:
Sponsor & Sponsor Group (filed as "Promoter & Promoter Group") vs Public
unitholders, disclosed quarterly. This pulls the summary master feed and keeps
the last few quarters so the dashboard can show the latest split + a trend.

Run:  python3 refresh_holdings.py     (from the dashboard folder)
Writes holdings.js next to dashboard.html AND mirrors holdings.json into the v2
app (dashboard_v2/public/data/) via _v2json. NSE blocks datacentre IPs, so run
this from the same machine/network where refresh_prices.py works.
Requires: pip install requests

Endpoint (verified Jul 2026):
  GET https://www.nseindia.com/api/corporate-share-holdings-master
        ?index=equities&symbol=<SYM>
Returns a list of quarterly records (most recent first) with, per record:
  date          "31-DEC-2025"   as-on date
  pr_and_prgrp  "8.02"          Promoter & Promoter Group % (= Sponsor group)
  public_val    "91.98"         Public %
  employeeTrusts "0"            Employee-trust %
"""
import json, time, datetime, os, sys

try:
    import requests
except ImportError:
    sys.exit("pip install requests, then re-run")

HERE = os.path.dirname(os.path.abspath(__file__))

# REITs live in NSE's `reits` segment; the unit-holding endpoint needs both the
# trading symbol AND the full issuer name (exactly as NSE lists it).
REITS = {
    "embassy":    ("EMBASSY",   "Embassy Office Parks REIT"),
    "mindspace":  ("MINDSPACE", "Mindspace Business Parks REIT"),
    "brookfield": ("BIRET",     "Brookfield India Real Estate Trust"),
    "nexus":      ("NXST",      "Nexus Select Trust"),
    "krt":        ("KRT",       "Knowledge Realty Trust"),
    "bagmane":    ("BAGMANE",   "Bagmane Prime Office REIT"),
}

# How many most-recent quarters to keep per REIT (for the trend).
MAX_QUARTERS = 8

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

_MONTHS = {m: i for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
     "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], start=1)}


DEBUG = os.environ.get("HOLDINGS_DEBUG")


def nse_session():
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept": "*/*",
                      "Accept-Language": "en-US,en;q=0.9",
                      "Referer": "https://www.nseindia.com/"})
    s.get("https://www.nseindia.com", timeout=10)
    time.sleep(1)
    # The corporate-filings/shareholding APIs need cookies scoped to that
    # section — a bare homepage hit isn't enough. Warm up the listing page.
    try:
        s.get("https://www.nseindia.com/companies-listing/"
              "corporate-filings-unitholding-pattern", timeout=10)
        time.sleep(1)
    except Exception:
        pass
    return s


def _num(v):
    """Parse NSE's stringy percentages ('8.02', '', None) → float or None."""
    try:
        return round(float(v), 2)
    except (TypeError, ValueError):
        return None


def _parse_date(s):
    """'31-DEC-2025' → ('2025-12-31', 'Dec 2025'); None on failure."""
    try:
        d, mon, y = s.strip().upper().split("-")
        month = _MONTHS[mon[:3]]
        iso = f"{int(y):04d}-{month:02d}-{int(d):02d}"
        label = f"{mon[:3].title()} {int(y)}"
        return iso, label
    except Exception:
        return None, None


def _extract_rows(payload):
    """NSE sometimes wraps the array in a dict — return the list either way."""
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("data", "shareHoldings", "records", "rows"):
            v = payload.get(key)
            if isinstance(v, list):
                return v
    return []


# Field names for the corporate-unit-holdings-master (REITs) endpoint, with
# fallbacks to the equities shareholding endpoint's names just in case.
_SPONSOR_KEYS = ("sponsorGroupPer", "pr_and_prgrp", "sponsorAndSponsorGroup", "sponsor")
_PUBLIC_KEYS = ("publicHoldingPer", "public_val", "public", "publicVal")
_DATE_KEYS = ("asOnDate", "date", "as_on_date", "filePeriodDate", "submissionDate")
_EMP_KEYS = ("employeeTrusts", "employee_trusts", "nonPromoterNonPublic")


def _first(row, keys):
    for k in keys:
        if k in row and row[k] not in (None, ""):
            return row[k]
    return None


def nse_holdings(s, symbol, issuer):
    """Return a list of normalised quarter dicts (most recent first)."""
    quote_url = f"https://www.nseindia.com/get-quotes/equity?symbol={symbol}"
    # Visit the symbol's quote page first so the API call carries a valid,
    # symbol-scoped Referer + cookies (NSE rejects/empties otherwise).
    try:
        s.get(quote_url, timeout=10)
        time.sleep(0.4)
    except Exception:
        pass
    # REITs: corporate-unit-holdings-master, index=reits, needs the issuer name.
    r = s.get("https://www.nseindia.com/api/corporate-unit-holdings-master",
              params={"index": "reits", "symbol": symbol, "issuer": issuer},
              headers={"Referer": quote_url}, timeout=12)
    try:
        payload = r.json()
    except Exception:
        if DEBUG:
            print(f"  [debug {symbol}] {r.status_code} non-JSON: {r.text[:200]!r}")
        return []
    rows = _extract_rows(payload)
    if DEBUG:
        if rows:
            print(f"  [debug {symbol}] {len(rows)} rows; first record keys: "
                  f"{sorted(rows[0].keys())}")
            print(f"  [debug {symbol}] first record: {json.dumps(rows[0])[:400]}")
        else:
            preview = json.dumps(payload)[:300] if payload else repr(r.text[:200])
            print(f"  [debug {symbol}] HTTP {r.status_code} empty; body: {preview}")
    quarters = []
    for row in rows:
        iso, label = _parse_date(str(_first(row, _DATE_KEYS) or ""))
        sponsor = _num(_first(row, _SPONSOR_KEYS))
        public = _num(_first(row, _PUBLIC_KEYS))
        if iso is None or sponsor is None or public is None:
            continue
        quarters.append({
            "date": iso,
            "label": label,
            "sponsor": sponsor,
            "public": public,
            "emp": _num(_first(row, _EMP_KEYS)) or 0.0,
        })
    # newest first, de-duplicated by as-on date, capped
    quarters.sort(key=lambda q: q["date"], reverse=True)
    seen, deduped = set(), []
    for q in quarters:
        if q["date"] in seen:
            continue
        seen.add(q["date"])
        deduped.append(q)
    return deduped[:MAX_QUARTERS]


def fetch_all():
    out, now = {}, datetime.datetime.now().strftime("%d %b %Y %H:%M")
    s = None
    try:
        s = nse_session()
    except Exception as e:
        print("NSE session failed:", e)
    for key, (sym, issuer) in REITS.items():
        quarters = []
        if s:
            try:
                quarters = nse_holdings(s, sym, issuer)
            except Exception as e:
                print(f"{key:11s}  -- fetch error: {e}")
            time.sleep(0.8)
        if quarters:
            latest = quarters[0]
            out[key] = {"symbol": sym, "quarters": quarters}
            print(f"{key:11s} {latest['label']:>9s}  "
                  f"sponsor {latest['sponsor']:>6.2f}%  public {latest['public']:>6.2f}%  "
                  f"({len(quarters)} qtrs)")
        else:
            print(f"{key:11s}  -- no data")
    out["_asof"] = now
    return out


def has_data(out):
    return any(k != "_asof" for k in out)


def write_holdings(out):
    with open(os.path.join(HERE, "holdings.js"), "w") as f:
        f.write("window.HOLDINGS = " + json.dumps(out, indent=1) + ";")
    # Also feed the v2 React app (public/data/holdings.json); no-op if absent.
    try:
        from _v2json import emit as _emit_v2
        _emit_v2("holdings", out)
    except Exception:
        pass


if __name__ == "__main__":
    data = fetch_all()
    if not has_data(data):
        sys.exit("\nNo unit-holding data fetched (NSE blocked or empty) — "
                 "holdings.js left unchanged.")
    write_holdings(data)
    print("\nholdings.js updated —", data.get("_asof"))
