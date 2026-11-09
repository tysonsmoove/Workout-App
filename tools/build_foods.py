#!/usr/bin/env python3
"""Build foods.json for Morning Laps from USDA FoodData Central CSV downloads.

Usage: python3 tools/build_foods.py <sr_legacy_csv_dir> <fndds_csv_dir> <out.json>

Sources (public domain, U.S. Department of Agriculture, Agricultural Research Service):
  FoodData_Central_sr_legacy_food_csv_2018-04.zip   (SR Legacy)
  FoodData_Central_survey_food_csv_2024-10-31.zip   (FNDDS 2021-2023)
from https://fdc.nal.usda.gov/download-datasets

Output: {"v", "src", "n": [nutrient keys], "f": [[name, source, [per-100 g values], [[portion label, grams], ...]], ...]}
source: 0 = SR Legacy (ingredients, brand items), 1 = FNDDS (foods as eaten).
"""
import csv, json, re, sys
from collections import defaultdict

SR, FN, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
KEYS = ["kcal", "protein", "fat", "carbs", "fiber", "sugar", "satfat", "transfat", "chol", "sodium", "potassium", "calcium", "iron", "vitd"]
# nutrient number (legacy "nutrient_nbr") -> key; SR rows use nutrient ids, mapped through nutrient.csv
NBR = {"208": "kcal", "203": "protein", "204": "fat", "205": "carbs", "291": "fiber", "269": "sugar", "606": "satfat",
       "605": "transfat", "601": "chol", "307": "sodium", "306": "potassium", "301": "calcium", "303": "iron", "328": "vitd"}
DEC = {"kcal": 0, "chol": 0, "sodium": 0, "potassium": 0, "calcium": 0}

def rows(path):
    with open(path, newline="", encoding="utf-8") as fh:
        yield from csv.DictReader(fh)

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def fmt_amount(a):
    a = num(a)
    if a is None:
        return ""
    return str(int(a)) if abs(a - round(a)) < 1e-9 else ("%.2f" % a).rstrip("0").rstrip(".")

def clean_name(s):
    s = re.sub(r"\s*\(Includes foods for USDA's Food Distribution Program\)", "", s)
    return re.sub(r"\s+", " ", s).strip()

def nutrient_values(vals):
    out = []
    for k in KEYS:
        v = vals.get(k)
        if v is None:
            out.append(None)
        else:
            d = DEC.get(k, 1)
            r = round(v, d)
            out.append(int(r) if d == 0 or r == int(r) else r)
    return out

foods = []

# ---- SR Legacy ----
id2key = {}
for r in rows(f"{SR}/nutrient.csv"):
    if r["nutrient_nbr"].split(".")[0] in NBR and r["nutrient_nbr"] in NBR:
        id2key[r["id"]] = NBR[r["nutrient_nbr"]]
units = {r["id"]: r["name"] for r in rows(f"{SR}/measure_unit.csv")}
sr_food = {}
for r in rows(f"{SR}/food.csv"):
    if r["food_category_id"] == "3":      # Baby Foods
        continue
    sr_food[r["fdc_id"]] = clean_name(r["description"])
sr_vals = defaultdict(dict)
for r in rows(f"{SR}/food_nutrient.csv"):
    k = id2key.get(r["nutrient_id"])
    if k and r["fdc_id"] in sr_food:
        v = num(r["amount"])
        if v is not None:
            sr_vals[r["fdc_id"]][k] = v
sr_port = defaultdict(list)
for r in rows(f"{SR}/food_portion.csv"):
    g = num(r["gram_weight"])
    if r["fdc_id"] not in sr_food or not g or g <= 0:
        continue
    unit = units.get(r["measure_unit_id"], "")
    unit = "" if unit in ("undetermined", "") else unit
    label = " ".join(x for x in [fmt_amount(r["amount"]), unit, r["modifier"].strip()] if x)
    sr_port[r["fdc_id"]].append((int(num(r["seq_num"]) or 99), label[:44], round(g, 1)))

# ---- FNDDS ----
skip_cat = set()
for r in rows(f"{FN}/wweia_food_category.csv"):
    d = r["wweia_food_category_description"].lower()
    if "baby" in d or "formula" in d or "human milk" in d:
        skip_cat.add(r["wweia_food_category"])
fn_food = {}
for r in rows(f"{FN}/food.csv"):
    if r["food_category_id"] in skip_cat:
        continue
    fn_food[r["fdc_id"]] = clean_name(r["description"])
fn_vals = defaultdict(dict)
for r in rows(f"{FN}/food_nutrient.csv"):
    k = NBR.get(r["nutrient_id"])
    if k and r["fdc_id"] in fn_food:
        v = num(r["amount"])
        if v is not None:
            fn_vals[r["fdc_id"]][k] = v
fn_port = defaultdict(list)
for r in rows(f"{FN}/food_portion.csv"):
    g = num(r["gram_weight"])
    d = r["portion_description"].strip()
    if r["fdc_id"] not in fn_food or not g or g <= 0 or d.lower().startswith("quantity not specified"):
        continue
    fn_port[r["fdc_id"]].append((int(num(r["seq_num"]) or 99), d[:44], round(g, 1)))

def portions(lst):
    seen, out = set(), []
    for _, label, g in sorted(lst):
        key = label.lower()
        if key in seen or not label:
            continue
        seen.add(key)
        out.append([label, int(g) if g == int(g) else g])
        if len(out) == 5:
            break
    return out

names = set()
for fid, name in fn_food.items():
    v = fn_vals.get(fid, {})
    if v.get("kcal") is None:
        continue
    names.add(name.lower())
    foods.append([name, 1, nutrient_values(v), portions(fn_port.get(fid, []))])
for fid, name in sr_food.items():
    v = sr_vals.get(fid, {})
    if v.get("kcal") is None or name.lower() in names:
        continue
    names.add(name.lower())
    foods.append([name, 0, nutrient_values(v), portions(sr_port.get(fid, []))])

foods.sort(key=lambda f: f[0].lower())
doc = {"v": 1,
       "src": "USDA FoodData Central: FNDDS 2021-2023 and SR Legacy (April 2018). U.S. Department of Agriculture, Agricultural Research Service. Public domain.",
       "n": KEYS, "f": foods}
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
print(len(foods), "foods;", sum(1 for f in foods if f[1] == 1), "FNDDS;", sum(1 for f in foods if f[1] == 0), "SR Legacy;",
      sum(1 for f in foods if f[3]), "with portions")
