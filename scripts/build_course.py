#!/usr/bin/env python3
"""Attach GPX distance, climb and a per-kilometre grade onto the handwritten guide."""

import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GPX = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/otw/route.gpx")
SRC = ROOT / "scripts" / "course_src.json"
OUT = ROOT / "data" / "course.json"
NS = {"g": "http://www.topografix.com/GPX/1/1"}


def hav(a, b):
    r = 6371000.0
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(min(1.0, h)))


def load_track(path):
    root = ET.parse(path).getroot()
    pts = []
    for p in root.findall(".//g:trkpt", NS):
        ele = float(p.find("g:ele", NS).text)
        pts.append((float(p.attrib["lat"]), float(p.attrib["lon"]), ele))
    cum = [0.0]
    for i in range(1, len(pts)):
        cum.append(cum[-1] + hav(pts[i - 1], pts[i]))
    wpts = []
    for w in root.findall("g:wpt", NS):
        lat, lon = float(w.attrib["lat"]), float(w.attrib["lon"])
        if lat == 0:
            continue
        name = w.find("g:name", NS).text
        best = min(range(len(pts)), key=lambda i: hav((lat, lon), pts[i]))
        wpts.append({"name": name, "km": cum[best] / 1000, "ele": pts[best][2]})
    return pts, cum, wpts


def at(cum, dist):
    lo, hi = 0, len(cum) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if cum[mid] < dist:
            lo = mid + 1
        else:
            hi = mid
    return lo


def smooth(vals, window):
    out = []
    for i in range(len(vals)):
        chunk = vals[max(0, i - window) : i + window + 1]
        out.append(sum(chunk) / len(chunk))
    return out


def series(pts, cum, a_km, b_km, step_m):
    a = max(0.0, a_km * 1000)
    b = min(cum[-1], b_km * 1000)
    if b < a:
        b = a
    dists = []
    d = a
    while d < b - 1:
        dists.append(d)
        d += step_m
    dists.append(b)
    elev = []
    for d in dists:
        i = at(cum, d)
        elev.append(pts[i][2])
    return dists, elev


def climb(elev):
    sm = smooth(elev, 2)
    gain = loss = 0.0
    for i in range(1, len(sm)):
        de = sm[i] - sm[i - 1]
        if de > 0.4:
            gain += de
        elif de < -0.4:
            loss -= de
    return round(gain), round(loss), round(sm[0]), round(sm[-1])


def main():
    src = json.loads(SRC.read_text())
    pts, cum, wpts = load_track(GPX)
    total_km = cum[-1] / 1000
    by_name = {w["name"]: w for w in wpts}

    whole_gain, whole_loss, _, _ = climb(series(pts, cum, 0, total_km, 20)[1])

    for cp in src["checkpoints"]:
        wp = by_name[cp["waypoint"]]
        cp["gpsKm"] = round(wp["km"], 2)
        cp["ele"] = round(wp["ele"])

    cps = src["checkpoints"]
    for i, cp in enumerate(cps):
        prev = 0 if i == 0 else cps[i - 1]["gpsKm"]
        cp["gpsSectionKm"] = round(cp["gpsKm"] - prev, 2)
        if cp.get("sheetSectionKm"):
            cp["sheetCumulativeKm"] = round(
                sum(c["sheetSectionKm"] for c in cps[: i + 1] if c.get("sheetSectionKm")), 2
            )

    for seg in src["segments"]:
        gain, loss, ele0, ele1 = climb(series(pts, cum, seg["fromKm"], seg["toKm"], 20)[1])
        dist = round(seg["toKm"] - seg["fromKm"], 2)
        seg["distanceKm"] = dist
        seg["gain"] = gain
        seg["loss"] = loss
        seg["eleStart"] = ele0
        seg["eleEnd"] = ele1
        seg["grade"] = round((ele1 - ele0) / (dist * 1000) * 100, 1) if dist else 0

    profile = []
    dists, elev = series(pts, cum, 0, total_km, 100)
    sm = smooth(elev, 2)
    for d, e in zip(dists, sm):
        profile.append([round(d / 1000, 2), round(e)])

    kms = []
    end_km = int(math.floor(total_km))
    for km in range(0, end_km + 1):
        a = km
        b = min(total_km, km + 1)
        if b - a < 0.05:
            continue
        gain, loss, ele0, ele1 = climb(series(pts, cum, a, b, 20)[1])
        grade = (ele1 - ele0) / ((b - a) * 1000) * 100
        owner = None
        mid = (a + b) / 2
        for seg in src["segments"]:
            if seg["fromKm"] - 0.01 <= mid <= seg["toKm"] + 0.01:
                owner = seg["id"]
                break
        kms.append(
            {
                "km": km,
                "toKm": round(b, 2),
                "eleStart": ele0,
                "eleEnd": ele1,
                "gain": gain,
                "loss": loss,
                "grade": round(grade, 1),
                "segmentId": owner,
            }
        )

    src["profile"] = profile
    src["kms"] = kms
    src["stats"] = {
        "distanceKm": round(total_km, 2),
        "gain": whole_gain,
        "loss": whole_loss,
        "points": len(pts),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(src, ensure_ascii=False, separators=(",", ":")))
    print(
        f"wrote {OUT}  {total_km:.2f} km  +{whole_gain}/-{whole_loss} m  "
        f"{len(src['segments'])} segments  {len(kms)} km rows"
    )


if __name__ == "__main__":
    main()
