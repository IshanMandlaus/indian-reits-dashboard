#!/usr/bin/env python3
"""
Serve the dashboard locally with a working "Refresh live prices" button.
Run:  python3 serve.py       → opens http://localhost:8742/dashboard.html
The Refresh button POSTs /refresh, which runs the NSE/BSE fetch in
refresh_prices.py and returns the fresh prices to the page.
Also downloads local copies of Chart.js + zoom plugin on first run (offline use).
"""
import json, os, sys, webbrowser, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
sys.path.insert(0, HERE)

import refresh_prices  # noqa: E402
import refresh_market  # noqa: E402
import refresh_blocks  # noqa: E402

PORT = 8742
REFRESH_PATHS = ("/refresh", "/refresh-market", "/refresh-global")

LIBS = {
    "chart.umd.min.js":
        "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js",
    "chartjs-plugin-zoom.min.js":
        "https://cdnjs.cloudflare.com/ajax/libs/chartjs-plugin-zoom/2.0.1/chartjs-plugin-zoom.min.js",
}


def ensure_libs():
    try:
        import requests
    except ImportError:
        return
    for fn, url in LIBS.items():
        p = os.path.join(HERE, fn)
        if not os.path.exists(p):
            try:
                r = requests.get(url, timeout=15)
                r.raise_for_status()
                open(p, "wb").write(r.content)
                print("downloaded", fn)
            except Exception as e:
                print("skip", fn, e)


class Handler(SimpleHTTPRequestHandler):
    def _market_has_data(self, out):
        return bool(out.get("sensex") or out.get("updates"))

    def _prices_has_data(self, out):
        return any(k != "_asof" for k in out)

    def _send_json(self, status, out):
        body = json.dumps(out).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in REFRESH_PATHS:
            self._send_json(405, {"error": "Use the Refresh button, which sends POST."})
            return
        super().do_GET()

    def do_POST(self):
        if self.path not in REFRESH_PATHS:
            self.send_error(404)
            return
        try:
            # hot-reload the fetch scripts so edits apply without restarting the server
            import importlib
            importlib.reload(refresh_market)
            importlib.reload(refresh_prices)
            if self.path == "/refresh-global":
                import refresh_global
                importlib.reload(refresh_global)
                out = refresh_global.fetch_all()
                if not out.get("quotes"):
                    self._send_json(503, {"error": "No live quotes fetched; keeping cached data."})
                    return
                refresh_global.write_live(out)
                out = {"ok": True, "asof": out.get("asof")}
            elif self.path == "/refresh-market":
                out = refresh_market.fetch_all()
                if not self._market_has_data(out):
                    self._send_json(503, {"error": "No market data fetched; keeping cached data."})
                    return
                refresh_market.write_live(out)
                # also refresh live REIT quotes for the snapshot cards
                try:
                    lp = refresh_prices.fetch_all()
                    if self._prices_has_data(lp):
                        refresh_prices.write_prices(lp)
                except Exception:
                    pass
                # Block/bulk deals are curated in data.js (NSE's deals API 503s from
                # scripts). To attempt a live pull anyway, run:  python3 refresh_blocks.py
                out = {"ok": True, "asof": out.get("asof")}
            else:
                out = refresh_prices.fetch_all()
                if not self._prices_has_data(out):
                    self._send_json(503, {"error": "No live prices fetched; keeping cached data."})
                    return
                refresh_prices.write_prices(out)
            self._send_json(200, out)
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def log_message(self, fmt, *args):  # quieter
        msg = " ".join([str(fmt), *(str(arg) for arg in args)])
        if any(path in msg for path in REFRESH_PATHS):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    ensure_libs()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/dashboard.html"
    print("Dashboard:", url, "(Ctrl-C to stop)")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
