#!/usr/bin/env python3
"""
Mirror a refreshed live dataset into the v2 dashboard's `public/data/*.json`.

The v1 dashboard reads its data from `window.*` globals in `.js` files; the v2
React app reads the same data as plain JSON from `dashboard_v2/public/data/`.
The refresh scripts (`refresh_prices.py`, `refresh_market.py`, `refresh_global.py`)
write the v1 `.js` files directly — this helper lets them ALSO emit the matching
v2 JSON so a live refresh actually reaches the v2 app.

No-op if the v2 app isn't present, so the v1 refresh stays runnable standalone.
"""
import json
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_V2_DATA = os.path.normpath(os.path.join(_HERE, "..", "dashboard_v2", "public", "data"))


def emit(basename, obj):
    """Write `obj` to dashboard_v2/public/data/<basename>.json (compact).

    `basename` is the v2 dataset name (e.g. "live-prices", "bench-live",
    "global-live"). Silently does nothing if the v2 data dir doesn't exist.
    """
    if not os.path.isdir(_V2_DATA):
        return False
    with open(os.path.join(_V2_DATA, basename + ".json"), "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    return True
