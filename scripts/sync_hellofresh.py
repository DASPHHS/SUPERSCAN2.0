#!/usr/bin/env python3
"""Optional registered hfresh.info API sync for HelloFresh recipe *metadata*.

Requires explicit HFRESH_API_TOKEN set as a GitHub Actions secret and the
account holder's authorization for this use. The source website API requires
registration. No recipe steps, PDFs, photographs or full recipe cards are
downloaded/published. The verified official NL link index remains functional
when the API is unavailable.
"""
from __future__ import annotations
import datetime as dt
import json
import logging
import os
import pathlib
import urllib.error
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parent.parent
PATH=ROOT/"data"/"hellofresh.json"
API="https://api.hfresh.info/nl-nl/recipes"
LOG=logging.getLogger("hellofresh")
logging.basicConfig(level=logging.INFO,format="%(levelname)s %(message)s")

def valid_public_link(url):
    try:
        parsed=urllib.parse.urlsplit(str(url))
        return parsed.scheme=="https" and (
            (parsed.hostname=="hfresh.info" and parsed.path.startswith("/nl-nl/recipes/"))
            or (parsed.hostname=="www.hellofresh.nl" and parsed.path.startswith("/recipes/"))
        )
    except ValueError:
        return False

def transform_recipe(summary,detail):
    if not isinstance(summary,dict) or not isinstance(detail,dict):
        return None
    title=detail.get("name") or summary.get("name")
    url=detail.get("url") or summary.get("url")
    if not isinstance(title,str) or not title.strip() or not valid_public_link(url):
        return None
    raw=detail.get("ingredients")
    if not isinstance(raw,list):return None
    names=[]
    for row in raw[:60]:
        if not isinstance(row,dict) or not isinstance(row.get("name"),str):continue
        name=row["name"].strip()
        if 0<len(name)<=90 and name not in names:names.append(name)
    if not names:return None
    return {
        "id":"hfresh:"+str(detail.get("id") or summary.get("id"))[:50],
        "title":title.strip()[:170],
        "url":url,
        "minutes":detail.get("total_time") if isinstance(detail.get("total_time"),int) else None,
        "diet":"onbekend",
        "ingredients":[{"name":name} for name in names],
    }

def fetch_json(url,token):
    req=urllib.request.Request(url,headers={
        "Authorization":"Bearer "+token,
        "Accept":"application/json",
        "User-Agent":"SuperScan2-Recipe-Linker/1.0 (https://github.com/DASPHHS/SUPERSCAN2.0)",
    })
    with urllib.request.urlopen(req,timeout=20) as response:
        raw=response.read(2_000_001)
        if len(raw)>2_000_000:raise ValueError("HelloFresh API response exceeds limit")
        return json.loads(raw.decode("utf-8"))

def load_index(path=PATH):
    return json.loads(path.read_text(encoding="utf-8"))

def merge_metadata(index,items):
    existing=list(index.get("recipes") or [])
    urls={r.get("url") for r in existing if isinstance(r,dict)}
    for item in items:
        if item is None or item["url"] in urls:continue
        existing.append(item);urls.add(item["url"])
    return {
        **index,"recipes":existing[:800],
        "apiStatus":"connected" if items else "no-new-recipes",
        "apiProvider":"hfresh.info (unofficial, registered API)",
        "metadataOnly":True,
        "apiSyncedAt":dt.datetime.now(dt.timezone.utc).isoformat()
    }

def sync(token):
    data=load_index()
    all_items=[]
    for page in range(1,4):  # bounded optional API import, not bulk mirroring
        url=API+"?"+urllib.parse.urlencode({"per_page":40,"page":page})
        body=fetch_json(url,token)
        summaries=body.get("data") if isinstance(body,dict) else None
        if not isinstance(summaries,list):raise ValueError("Unexpected API index schema")
        for summary in summaries:
            if not isinstance(summary,dict) or not isinstance(summary.get("id"),int):continue
            detail=fetch_json(API+"/"+str(summary["id"]),token)
            resource=detail.get("data") if isinstance(detail,dict) else None
            rec=transform_recipe(summary,resource)
            if rec:all_items.append(rec)
        if len(summaries)<40:break
    if not all_items:raise ValueError("No valid NL recipe metadata from registered API")
    PATH.write_text(json.dumps(merge_metadata(data,all_items),ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    LOG.info("Imported %d additional HelloFresh recipe references",len(all_items))

def main():
    token=os.getenv("HFRESH_API_TOKEN","").strip()
    if not token:
        LOG.info("No registered HFRESH_API_TOKEN configured. Keeping verified HelloFresh NL recipe links.")
        return
    try:sync(token)
    except (ValueError,urllib.error.URLError,OSError,KeyError) as exc:
        # Never prevent the grocery site from deploying when a third-party
        # registered API is down or the user's entitlement has lapsed.
        LOG.warning("Registered HelloFresh database API unavailable: %s; using verified links",exc)

if __name__=="__main__":main()
