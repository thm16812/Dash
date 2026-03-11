#!/usr/bin/env python3
"""
Fetch latest GOES-18 GLM (Geostationary Lightning Mapper) lightning flashes
from the NOAA Open Data Dissemination (NODD) S3 bucket and output GeoJSON.

S3 bucket: noaa-goes18 (public, no credentials required)
Product:   GLM-L2-LCFA  (Level 2 Lightning Cluster-Filter Algorithm)
Coverage:  Full disk, updated every ~20 seconds
"""
import sys
import json
import re
import os
import tempfile
import urllib.request
from datetime import datetime, timezone, timedelta

try:
    import h5py
except ImportError:
    print(json.dumps({"type": "FeatureCollection", "features": []}))
    sys.exit(0)

BUCKET = "noaa-goes18"
PRODUCT = "GLM-L2-LCFA"
MAX_FILES = 9   # ~3 minutes of coverage (9 × 20 s)
TIMEOUT = 8     # seconds per HTTP request


def list_files(year: int, doy: int, hour: int) -> list:
    url = (
        f"https://{BUCKET}.s3.amazonaws.com/"
        f"?prefix={PRODUCT}/{year}/{doy:03d}/{hour:02d}/&list-type=2"
    )
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as r:
            return re.findall(r"<Key>(.*?)</Key>", r.read().decode())
    except Exception:
        return []


def download_file(key: str) -> bytes | None:
    url = f"https://{BUCKET}.s3.amazonaws.com/{key}"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT) as r:
            return r.read()
    except Exception:
        return None


def parse_flashes(data: bytes) -> list:
    tmp = tempfile.NamedTemporaryFile(suffix=".nc", delete=False)
    tmp.write(data)
    tmp.close()
    flashes = []
    try:
        with h5py.File(tmp.name, "r") as f:
            if "flash_lat" in f and "flash_lon" in f:
                lats = f["flash_lat"][:]
                lons = f["flash_lon"][:]
                for lat, lon in zip(lats, lons):
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        flashes.append((float(lat), float(lon)))
    except Exception:
        pass
    finally:
        os.unlink(tmp.name)
    return flashes


def main():
    now = datetime.now(timezone.utc)
    candidate_keys = []

    # Collect file listings for the current hour and previous hour
    for delta_hours in (0, 1):
        t = now - timedelta(hours=delta_hours)
        keys = list_files(t.year, t.timetuple().tm_yday, t.hour)
        candidate_keys.extend(keys)

    # Deduplicate, keep most recent MAX_FILES
    seen = set()
    unique = []
    for k in reversed(candidate_keys):
        if k not in seen:
            seen.add(k)
            unique.append(k)
    keys_to_fetch = list(reversed(unique[:MAX_FILES]))

    all_flashes = []
    for key in keys_to_fetch:
        data = download_file(key)
        if data:
            all_flashes.extend(parse_flashes(data))

    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {},
        }
        for lat, lon in all_flashes
    ]

    print(json.dumps({"type": "FeatureCollection", "features": features}))


if __name__ == "__main__":
    main()
