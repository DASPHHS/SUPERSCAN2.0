#!/usr/bin/env python3
"""Build-time synchronization for GitHub Pages (not a browser-side scraper).

Sources:
 - Checkjebon public supermarket dataset (regular prices)
 - PrijsProfeet public search endpoint /search (active promotions)
Does not fabricate prices, infer EAN identity or publish future offers.
Data is published with the Pages artifact, not committed to git every day.
"""
from __future__ import annotations

import datetime as dt
import json
import logging
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data"
OUT.mkdir(exist_ok=True)
TODAY = dt.datetime.now(dt.timezone.utc).astimezone(
    dt.timezone(dt.timedelta(hours=1))  # overwritten below for correct Amsterdam DST
).date()
try:
    from zoneinfo import ZoneInfo
    TODAY = dt.datetime.now(ZoneInfo("Europe/Amsterdam")).date()
except ImportError:
    TODAY = dt.datetime.now(dt.timezone.utc).date()

USER_AGENT = "SuperScan2/1.0 (+https://github.com/DASPHHS/SUPERSCAN2.0)"
API_BASE = "https://www.prijsprofeet.nl/api/v1"
PRICES_URLS = (
    "https://www.checkjebon.nl/data/supermarkets.json",
    "https://raw.githubusercontent.com/supermarkt/checkjebon/main/data/supermarkets.json",
)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def fetch_json(url: str, *, attempts: int = 3):
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    if os.environ.get("PRIJSPROFEET_API_KEY") and "prijsprofeet.nl" in url:
        headers["X-API-Key"] = os.environ["PRIJSPROFEET_API_KEY"]
    for attempt in range(attempts):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code not in (403, 408, 429, 500, 502, 503, 504):
                raise
            if exc.code == 403:
                raise
            retry_after = exc.headers.get("Retry-After", "")
            delay = min(90, int(retry_after)) if retry_after.isdigit() else 2 ** attempt * 4
            logging.warning("HTTP %s from %s, retry in %s s", exc.code, url, delay)
            time.sleep(delay)
        except (TimeoutError, OSError, ValueError) as exc:
            logging.warning("Request %s failed: %s", url, exc)
            time.sleep(2 ** attempt * 3)
    raise RuntimeError(f"Unable to retrieve {url} after {attempts} attempts")


def save(filename, data):
    target = OUT / filename
    temp = target.with_suffix(".tmp")
    with temp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    temp.replace(target)
    logging.info("Saved %s (%.2f MB)", target, target.stat().st_size / 1024 / 1024)


def valid_price(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and value > 0


def get_prices():
    error = None
    for url in PRICES_URLS:
        try:
            data = fetch_json(url, attempts=2)
            if not isinstance(data, list) or not data:
                raise ValueError("Expected a nonempty list of stores")
            stores = []
            for store in data:
                if not isinstance(store, dict) or not isinstance(store.get("d"), list):
                    continue
                rows = [
                    {
                        "n": p["n"],
                        "s": p.get("s", ""),
                        "p": p["p"],
                        "l": p.get("l", ""),
                    }
                    for p in store["d"]
                    if isinstance(p, dict) and isinstance(p.get("n"), str)
                    and valid_price(p.get("p"))
                ]
                if rows and str(store.get("n", "")).lower() in {"ah", "jumbo", "lidl", "hoogvliet", "dirk"}:
                    stores.append({
                        "n": store.get("n"),
                        "c": store.get("c"),
                        "u": store.get("u", ""),
                        "d": rows
                    })
            if not stores:
                raise ValueError("Source was empty after validation")
            save("prices.json", {
                "source": "Checkjebon.nl",
                "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
                "stores": stores
            })
            return len(stores), sum(len(s["d"]) for s in stores)
        except Exception as exc:
            error = exc
            logging.warning("Price source %s failed: %s", url, exc)
    raise RuntimeError("No Checkjebon price data available") from error


def products_in_page(data):
    if isinstance(data, list):
        return data, None
    if not isinstance(data, dict):
        return [], None
    for key in ("products", "results", "items", "data"):
        rows = data.get(key)
        if isinstance(rows, list):
            return rows, data.get("total")
        if isinstance(rows, dict):
            for nested in ("products", "results", "items"):
                if isinstance(rows.get(nested), list):
                    return rows[nested], data.get("total")
    return [], data.get("total")


def is_running(item):
    status = item.get("promotion_status") or item.get("status")
    if status in ("upcoming", "shelf", "historical"):
        return False
    if status and status != "active":
        return False
    try:
        price = float(item["price"])
        if not (price > 0):
            return False
    except (TypeError, KeyError, ValueError):
        return False
    valid_from = item.get("valid_from")
    valid_until = item.get("valid_until")
    if valid_from and str(valid_from)[:10] > TODAY.isoformat():
        return False
    if valid_until and str(valid_until)[:10] < TODAY.isoformat():
        return False
    return status == "active" or bool(valid_from and valid_until)


def percentage(item):
    value = item.get("savings_percentage")
    if value is not None:
        try:
            return max(0.0, min(100.0, float(value)))
        except (TypeError, ValueError):
            pass
    try:
        p, old = float(item["price"]), float(item["original_price"])
        return max(0.0, min(100.0, (old - p) / old * 100)) if old > 0 else 0.0
    except (TypeError, ValueError, KeyError, ZeroDivisionError):
        return 0.0


def get_offers():
    """Collect only currently running promos for the five user-selected chains.

    First fetch a broader cross-category selection, then use targeted product
    searches to make genuine dinner ingredients discoverable. Every item must
    retain its source, chain, current status and valid date; no invented deals.
    """
    retailers = (
        "albert_heijn", "lidl", "jumbo", "hoogvliet", "dirk",
    )
    # Queries are factual ingredient types, NOT recipe suggestions or samples.
    ingredient_searches = (
        "paprika", "tomaat", "spinazie", "courgette", "kip",
        "aardappelen", "broccoli", "champignons", "pasta", "zalm",
        "komkommer", "eieren", "linzen", "tofu", "avocado", "wortel",
        "kikkererwten", "rijst", "prei", "pompoen",
    )
    seen = set()
    output = []
    query_errors = []
    for retailer in retailers:
        retailer_rows = []
        searches = ("*",) + ingredient_searches
        for i, term in enumerate(searches):
            # 120/minute on the anonymous search endpoint, slower by design.
            if output or i:
                time.sleep(0.58)
            params = {
                "q": term,
                "promotion_status": "active",
                "retailer": retailer,
                "sort_by": "savings_percentage:desc",
                "page_size": 75 if term == "*" else 20,
                "page": 1,
            }
            try:
                data = fetch_json(API_BASE + "/search?" + urllib.parse.urlencode(params), attempts=2)
                results, _ = products_in_page(data)
            except Exception as exc:
                query_errors.append(f"{retailer}/{term}: {exc}")
                logging.warning("Search query %s/%s failed: %s", retailer, term, exc)
                continue
            for item in results:
                if not isinstance(item, dict) or not is_running(item):
                    continue
                if not isinstance(item.get("name"), str) or not item["name"].strip():
                    continue
                if item.get("retailer") != retailer:
                    continue
                identity = (retailer, str(item.get("product_id") or item["name"]))
                if identity in seen:
                    continue
                seen.add(identity)
                retailer_rows.append(item)

        if not retailer_rows:
            logging.warning("No active offers for %s", retailer)
        # Prefer actual food ingredients to maximize action-recipes, but keep
        # the ordinary deals overview useful as well.
        retailer_rows.sort(key=lambda o: (-percentage(o), str(o.get("name") or "")))
        output.extend(retailer_rows[:320])
        logging.info("%s: %s confirmed running products", retailer, len(retailer_rows))

    if not output:
        raise RuntimeError("No current offers for five selected chains; errors=" + repr(query_errors[:4]))

    fields = (
        "product_id", "id", "name", "retailer", "price", "original_price",
        "savings_percentage", "promotion_status", "status", "valid_from",
        "valid_until", "quantity", "category", "unified_category",
        "product_url", "multi_buy_quantity", "multi_buy_price",
        "loyalty_price", "promotional_keywords",
    )
    slim = [{key: item[key] for key in fields if key in item} for item in output]
    save("deals.json", {
        "source": "PrijsProfeet",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "offers": slim,
        "sourceCount": len(output),
        "retailers": list(retailers),
        "sampling": "Current offers plus targeted searches for dinner ingredients",
        "partial": True,
        "sourceErrors": len(query_errors),
        "chainScope": "National chain offers, not confirmed for individual branches",
    })
    return len(slim), len(output)


def main():
    completed = 0
    for name, fn in (("Checkjebon prices", get_prices), ("PrijsProfeet offers", get_offers)):
        try:
            logging.info("Synchronizing %s", name)
            logging.info("%s synced: %s", name, fn())
            completed += 1
        except Exception:
            logging.exception("Failed syncing %s", name)
    if not (OUT / "deals.json").exists():
        raise SystemExit("No deals.json available")
    try:
        with (OUT / "deals.json").open(encoding="utf-8") as stream:
            count = len(json.load(stream).get("offers", []))
    except (OSError, ValueError, TypeError):
        count = 0
    if count == 0:
        raise SystemExit("No confirmed current offers; do not deploy a misleading empty deals page")
    logging.info("Completed %d / 2 data providers", completed)


if __name__ == "__main__":
    main()
