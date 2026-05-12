#!/usr/bin/env python3
"""
Populate the Iowa Letters Lab Omeka S instance with:
  - A Resource Template ("Civil War Letter")
  - An Item Set ("Iowa Letters, 1862-1865")
  - Six illustrative items

Reads the same source data the demo prototype uses, so the two stay in sync.

Usage:
    python populate.py
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlencode

import urllib.request
import urllib.error

import os

# Set OMEKA_KEY_ID and OMEKA_KEY_CRED in your env, or in a .env file (see .env.example).
# These should NOT be committed to source control.
API_BASE = os.environ.get("OMEKA_API_BASE", "http://localhost:8090/api")
KEY_IDENTITY = os.environ["OMEKA_KEY_ID"]
KEY_CREDENTIAL = os.environ["OMEKA_KEY_CRED"]

DC_PROPS = {
    "dcterms:title":       1,
    "dcterms:creator":     2,
    "dcterms:subject":     3,
    "dcterms:description": 4,
    "dcterms:date":        7,
    "dcterms:type":        8,
    "dcterms:format":      9,
    "dcterms:source":     11,
    "dcterms:language":   12,
    "dcterms:rights":     15,
    "dcterms:spatial":    40,
    "dcterms:temporal":   41,
}


def auth_url(path: str) -> str:
    q = urlencode({"key_identity": KEY_IDENTITY, "key_credential": KEY_CREDENTIAL})
    return f"{API_BASE}{path}?{q}"


def api(method: str, path: str, payload: dict | None = None) -> dict:
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(auth_url(path), data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        print(f"  ERROR {e.code}: {e.read().decode('utf-8')[:300]}")
        raise


def build_property_values(item_data: dict) -> dict:
    """Convert the demo items.json record into Omeka S property-value blocks."""
    values: dict[str, list[dict]] = {}

    def add(term: str, value, lang: str | None = None):
        if not value:
            return
        prop_id = DC_PROPS[term]
        block = {
            "type": "literal",
            "property_id": prop_id,
            "@value": value,
        }
        if lang:
            block["@language"] = lang
        values.setdefault(term, []).append(block)

    add("dcterms:title", item_data.get("dcterms:title"))
    add("dcterms:creator", item_data.get("dcterms:creator"))
    add("dcterms:date", item_data.get("dcterms:date"))
    add("dcterms:type", item_data.get("dcterms:type"))
    add("dcterms:format", item_data.get("dcterms:format"))
    add("dcterms:language", item_data.get("dcterms:language"))
    add("dcterms:spatial", item_data.get("dcterms:spatial"))
    add("dcterms:temporal", item_data.get("dcterms:temporal"))
    add("dcterms:rights", item_data.get("dcterms:rights"))
    add("dcterms:source", item_data.get("dcterms:source"))
    add("dcterms:description", item_data.get("transcription"))

    for subj in (item_data.get("dcterms:subject") or []):
        add("dcterms:subject", subj)

    return values


def main():
    print("=== Iowa Letters Lab — Omeka S populator ===\n")

    # 1. Create Resource Template
    print("[1/3] Creating Resource Template: 'Civil War Letter'")
    template = api("POST", "/resource_templates", {
        "o:label": "Civil War Letter",
        "o:resource_template_property": [
            {"o:property": {"o:id": DC_PROPS["dcterms:title"]},       "o:alternate_label": "Title of the letter",      "o:is_required": True,  "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:creator"]},     "o:alternate_label": "Author / Soldier",         "o:is_required": True,  "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:date"]},        "o:alternate_label": "Date written",             "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:type"]},        "o:alternate_label": "Type",                     "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:format"]},      "o:alternate_label": "Physical format",          "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:language"]},    "o:alternate_label": "Language",                 "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:subject"]},     "o:alternate_label": "Subject headings",         "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:spatial"]},     "o:alternate_label": "Place written",            "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:temporal"]},    "o:alternate_label": "Time period",              "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:description"]}, "o:alternate_label": "Transcription",            "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:rights"]},      "o:alternate_label": "Rights statement",         "o:is_required": False, "o:data_type": ["literal"]},
            {"o:property": {"o:id": DC_PROPS["dcterms:source"]},      "o:alternate_label": "Source / holding repo",    "o:is_required": False, "o:data_type": ["literal"]},
        ],
    })
    template_id = template["o:id"]
    print(f"     -> Resource Template id={template_id}")

    # 2. Create Item Set
    print("\n[2/3] Creating Item Set: 'Iowa Letters, 1862-1865'")
    item_set = api("POST", "/item_sets", {
        "o:is_public": True,
        "dcterms:title": [{"type": "literal", "property_id": DC_PROPS["dcterms:title"], "@value": "Iowa Letters, 1862-1865"}],
        "dcterms:description": [{"type": "literal", "property_id": DC_PROPS["dcterms:description"], "@value": "A small illustrative digital edition of letters written by Iowa volunteers during the American Civil War. Built as a prototype for a portfolio piece demonstrating CMS-based scholarly publishing workflows."}],
    })
    item_set_id = item_set["o:id"]
    print(f"     -> Item Set id={item_set_id}")

    # 3. Create 6 Items
    src = Path(r"C:\Users\mered\Desktop\iowa-demo\data\items.json")
    data = json.loads(src.read_text(encoding="utf-8"))
    items = data["items"]

    print(f"\n[3/3] Creating {len(items)} items")
    for i, item in enumerate(items, 1):
        payload = build_property_values(item)
        payload["o:resource_template"] = {"o:id": template_id}
        payload["o:item_set"] = [{"o:id": item_set_id}]
        payload["o:is_public"] = True
        result = api("POST", "/items", payload)
        print(f"     -> Item {i}/{len(items)} id={result['o:id']}: {item['dcterms:title'][:60]}")

    print("\nDone. Open http://localhost:8090/admin to browse the populated instance.")


if __name__ == "__main__":
    main()
