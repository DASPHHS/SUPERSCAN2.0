#!/usr/bin/env python3
"""Import the user's public SpecialeDeals Weekdeals feed into SuperScan.

The producer already exhaustively paginates PrijsProfeet and preserves the
offer terms. Download it at build time (never 8MB in a user's browser).
The five-chain subset is compacted with transparent provenance.
Fallback: if it is unavailable, keep the independent live PrijsProfeet sync.
"""
from __future__ import annotations
import datetime as dt
import json
import logging
import pathlib
import tempfile
import urllib.request
from zoneinfo import ZoneInfo

ROOT=pathlib.Path(__file__).resolve().parent.parent
DEST=ROOT/"data"/"deals.json"
SOURCE="https://raw.githubusercontent.com/DASPHHS/specialedeals/main/weekdeals/deals.json"
NAMES={
    "Albert Heijn":"albert_heijn","Lidl":"lidl","Jumbo":"jumbo",
    "Hoogvliet":"hoogvliet","Dirk":"dirk"
}
LOG=logging.getLogger("specialedeals")
logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")

def iso(value):
    if not isinstance(value,str) or len(value)<10:return None
    try:return dt.date.fromisoformat(value[:10]).isoformat()
    except ValueError:return None

def number(value):
    if isinstance(value,bool) or not isinstance(value,(int,float)):return None
    if not 0 < value < 100000:return None
    return float(value)

def normalize(raw,today):
    if not isinstance(raw,dict):return None
    retailer=NAMES.get(raw.get("winkel"))
    valid_from, valid_until=iso(raw.get("van")),iso(raw.get("tot"))
    price=number(raw.get("prijs"))
    if not retailer or not price or not valid_from or not valid_until:return None
    if valid_from>valid_until or valid_until<today:return None
    if raw.get("einddatum_geschat"):return None  # don't present guessed dates as certainty
    product=raw.get("product")
    if not isinstance(product,str) or not product.strip():return None
    original=number(raw.get("van_prijs"))
    pct=raw.get("korting")
    if isinstance(pct,(float,int)) and not isinstance(pct,bool) and 0 < pct <= 1:
        percent=round(pct*100)
    else:percent=round((original-price)/original*100) if original and original>price else 0
    # Bundles and loyalty require special conditions. Preserve those separately.
    offer={
        "id":str(raw.get("id") or f"{retailer}:{product}"),
        "name":product.strip(),
        "retailer":retailer,
        "price":price,
        "original_price":original if original and original>price and not raw.get("bundelaantal") else None,
        "savings_percentage":max(0,min(100,percent)),
        "category":raw.get("categorie") or "",
        "quantity":raw.get("verpakking") or "",
        "valid_from":valid_from,
        "valid_until":valid_until,
        "promotion_status":"active" if valid_from<=today else "upcoming",
        "product_url":raw.get("url") if isinstance(raw.get("url"),str) and raw["url"].startswith("https://") else None,
        "promotion_type":raw.get("actievorm") or "",
        "multi_buy_quantity":raw.get("bundelaantal") if isinstance(raw.get("bundelaantal"),int) else None,
        "multi_buy_price":number(raw.get("bundelprijs")),
        "loyalty_price":number(raw.get("ledenprijs")),
        "unit_price":number(raw.get("eenheidsprijs")),
        "unit":raw.get("eenheid") or "",
        "channel":raw.get("kanaal") or "",
        "promotion_source":"SpecialeDeals / PrijsProfeet",
    }
    return {k:v for k,v in offer.items() if v is not None}

def make_payload(data, now):
    if not isinstance(data,dict) or data.get("schema_version")!=2 or data.get("source")!="PrijsProfeet":
        raise ValueError("Unexpected source schema")
    updated=dt.datetime.fromisoformat(str(data["updated_at"]))
    if updated.tzinfo is None:raise ValueError("Source timestamp missing timezone")
    if not dt.timedelta(0)<=now-updated<=dt.timedelta(hours=72):
        raise ValueError("Source feed is outdated or has future timestamp")
    rows=data.get("deals")
    if not isinstance(rows,list) or len(rows)<100:
        raise ValueError("Source feed incomplete")
    today=now.date().isoformat()
    seen=set()
    offers=[]
    for raw in rows:
        item=normalize(raw,today)
        if item is None:continue
        key=(item["retailer"],item["id"])
        if key in seen:continue
        seen.add(key);offers.append(item)
    if len(offers)<20:raise ValueError("Not enough valid current/future five-chain products")
    return {
        "source":"PrijsProfeet via SpecialeDeals",
        "generatedAt":now.isoformat(),
        "sourceUpdatedAt":updated.isoformat(),
        "chainScope":"Nationwide chain offers, local availability not verified",
        "partial":False,
        "offers":offers,
        "sourceCount":len(rows),
        "retailers":list(NAMES.values())
    }

def fetch():
    req=urllib.request.Request(SOURCE,headers={
        "User-Agent":"SuperScan2 (+https://github.com/DASPHHS/SUPERSCAN2.0)",
        "Accept":"application/json"
    })
    with urllib.request.urlopen(req,timeout=65) as response:
        # Cap remote input at 25 MB.
        raw=response.read(25_000_001)
        if len(raw)>25_000_000:raise ValueError("Source exceeds limit")
        return json.loads(raw)

def main():
    now=dt.datetime.now(ZoneInfo("Europe/Amsterdam"))
    try:
        result=make_payload(fetch(),now)
        DEST.parent.mkdir(exist_ok=True,parents=True)
        with tempfile.NamedTemporaryFile("w",encoding="utf-8",dir=DEST.parent,
                                         delete=False,suffix=".tmp") as tmp:
            json.dump(result,tmp,ensure_ascii=False,separators=(",",":"))
            filename=pathlib.Path(tmp.name)
        filename.replace(DEST)
        LOG.info("SpecialeDeals imported: %d offers from five chains (%s)",
                 len(result["offers"]),result["sourceUpdatedAt"])
    except Exception as err:
        LOG.warning("SpecialeDeals feed unavailable: %s. Using independent PrijsProfeet sync.",err)
        if not DEST.exists() or not json.loads(DEST.read_text(encoding="utf-8")).get("offers"):
            raise SystemExit("No valid alternative offers dataset") from err

if __name__=="__main__":
    main()
