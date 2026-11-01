#!/usr/bin/env python3
"""Build-time synchronization for GitHub Pages (not a browser-side scraper).

Sources:
 - Checkjebon public supermarket dataset (regular prices)
 - PrijsProfeet /products/promotional/all (promotions)
Does not fabricate prices, infer EAN identity or publish future offers.
Data is published with the Pages artifact, not committed to git every day.
"""
from __future__ import annotations

import datetime as dt
import json
import logging
import os
import pathlib
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

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
MAX_PAGES = int(os.environ.get("MAX_PROMOTION_PAGES", "220"))
PAGE_SIZE = 100
DELAY = 2.1  # no-key 30/min list endpoints; below the advertised threshold
RETAILER_LIMIT = 80
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
                if rows:
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
    """Fetch a useful verified shortlist *quickly*, without walking thousands
    of promotional rows on every GitHub Pages deployment.

    PrijsProfeet documents q=* for browsing all, promotion_status=active
    and savings_percentage:desc for ranking. Each chain is sampled
    separately to avoid one chain dominating the homepage.
    """
    retailers = (
        "albert_heijn", "jumbo", "lidl", "aldi", "plus", "dirk",
        "dekamarkt", "hoogvliet", "vomar", "nettorama", "poiesz",
        "spar", "ekoplaza", "boons_markt", "gewoon_coop", "mcd",
    )
    rows = []
    seen = set()
    source_errors = []
    for index, retailer in enumerate(retailers):
        if index:
            time.sleep(0.75)
        query = urllib.parse.urlencode({
            "q": "*",
            "promotion_status": "active",
            "sort_by": "savings_percentage:desc",
            "retailer": retailer,
            "page_size": 75,
            "page": 1,
        })
        url = API_BASE + "/search?" + query
        try:
            data = fetch_json(url, attempts=2)
            products, _ = products_in_page(data)
            added = 0
            for item in products:
                if not isinstance(item, dict) or not is_running(item):
                    continue
                if not item.get("name") or not item.get("retailer"):
                    continue
                identity = (str(item["retailer"]), str(item.get("product_id") or item.get("name")))
                if identity in seen:
                    continue
                seen.add(identity)
                rows.append(item)
                added += 1
            logging.info("%s: %s verified running offers", retailer, added)
        except Exception as exc:
            source_errors.append(f"{retailer}: {exc}")
            logging.warning("Retailer query failed (%s): %s", retailer, exc)

    # The bulk endpoint is a documented independent fallback. Never invent
    # offers or copy static historical prices into the current dataset.
    if not rows:
        logging.warning("Search returned no current offers; trying promotional endpoint")
        for page in range(1, 4):
            url = API_BASE + "/products/promotional/all?" + urllib.parse.urlencode({
                "page": page, "page_size": PAGE_SIZE,
            })
            try:
                data = fetch_json(url, attempts=2)
            except Exception as exc:
                source_errors.append(f"bulk page {page}: {exc}")
                break
            products, _ = products_in_page(data)
            for item in products:
                if not isinstance(item, dict) or not is_running(item):
                    continue
                if not item.get("name") or not item.get("retailer"):
                    continue
                identity = (str(item["retailer"]), str(item.get("product_id") or item.get("name")))
                if identity in seen:
                    continue
                seen.add(identity)
                rows.append(item)
            if len(products) < PAGE_SIZE:
                break
            time.sleep(DELAY)

    if not rows:
        raise RuntimeError("No current PrijsProfeet offers retrieved; errors=" + repr(source_errors[:4]))

    chosen = sorted(rows, key=lambda p: (-percentage(p), float(p["price"])))
    fields = (
        "product_id", "id", "name", "retailer", "price", "original_price",
        "savings_percentage", "promotion_status", "status", "valid_from", "valid_until",
        "quantity", "category", "unified_category", "image_url", "product_url",
        "multi_buy_quantity", "multi_buy_price", "loyalty_price", "promotional_keywords",
    )
    slim = [{k: p[k] for k in fields if k in p} for p in chosen]
    save("deals.json", {
        "source": "PrijsProfeet",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "offers": slim,
        "sourceCount": len(rows),
        "partial": True,
        "sampling": "top 75 live offers per retailer",
        "sourceErrors": len(source_errors),
    })
    return len(slim), len(rows)


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
