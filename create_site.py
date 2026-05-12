#!/usr/bin/env python3
"""Create the public-facing 'Iowa Letters' site in Omeka S 4.1.1."""
import json
import urllib.request
from urllib.parse import urlencode

import os

API_BASE = os.environ.get("OMEKA_API_BASE", "http://localhost:8090/api")
KEY_IDENTITY = os.environ["OMEKA_KEY_ID"]
KEY_CREDENTIAL = os.environ["OMEKA_KEY_CRED"]


def auth_url(path):
    return f"{API_BASE}{path}?{urlencode({'key_identity': KEY_IDENTITY, 'key_credential': KEY_CREDENTIAL})}"


def api(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(auth_url(path), data=data, method=method,
                                  headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        body = r.read().decode()
        return json.loads(body) if body else {}


# Get all items so we can attach them to the site
items = api("GET", "/items")
item_ids = sorted(i["o:id"] for i in items)
print(f"Found {len(item_ids)} items to attach: {item_ids}")

# Get item sets
item_sets = api("GET", "/item_sets")
item_set_ids = [s["o:id"] for s in item_sets]
print(f"Found {len(item_set_ids)} item sets to attach: {item_set_ids}")

# Create the site
site = api("POST", "/sites", {
    "o:slug": "iowa-letters",
    "o:title": "Iowa Letters",
    "o:summary": "A digital edition of letters home from Iowa volunteers serving in the American Civil War. Built as a prototype demonstrating Library digital scholarship publishing workflows.",
    "o:theme": "default",
    "o:is_public": True,
    "o:assign_new_items": True,
    "o:item": [{"o:id": iid} for iid in item_ids],
    "o:item_set": [{"o:id": sid} for sid in item_set_ids],
    "o:site_page": [
        {
            "o:slug": "browse",
            "o:title": "Browse Letters",
            "o:is_public": True,
            "o:block": [
                {
                    "o:layout": "browsePreview",
                    "o:data": {
                        "resource-type": "items",
                        "query": "",
                        "heading": "All Letters",
                        "pagination": True,
                        "sort": True,
                        "search": True
                    }
                }
            ]
        }
    ]
})
print(f"Created site id={site['o:id']} slug={site['o:slug']}")
print(f"Public URL: http://localhost:8090/s/{site['o:slug']}/")
