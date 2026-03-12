#!/usr/bin/env python3
"""
Fetch latest GOES-19 GLM (Geostationary Lightning Mapper) lightning flashes
from the NOAA Open Data Dissemination (NODD) S3 bucket and output GeoJSON.

S3 bucket: noaa-goes19 (public, anonymous access, us-east-1)
Product:   GLM-L2-LCFA  (Level 2 Lightning Cluster-Filter Algorithm)
Coverage:  Full disk, updated every ~20 seconds
Variables: flash_lat, flash_lon, flash_energy, flash_area
"""
import sys
import json
import re
import os
import tempfile
import urllib.request
from datetime import datetime, timezone, timedelta

try:
    import netCDF4 as nc
except ImportError:
    try:
        import h5py as _h5py_fallback
        _USE_H5PY = True
    except ImportError:
        print(json.dumps({"type": "FeatureCollection", "features": []}))
        sys.exit(0)
    else:
        _USE_H5PY = True
        nc = None
else:
    _USE_H5PY = False

BUCKET  = "noaa-goes19"
PRODUCT = "GLM-L2-LCFA"
MAX_FILES = 9    # ~3 minutes of coverage (9 × 20 s)
TIMEOUT   = 10   # seconds per HTTP request


# ---------------------------------------------------------------------------
# S3 helpers (anonymous HTTP, no boto3 required)
# ---------------------------------------------------------------------------

def list_files(year: int, doy: int, hour: int) -> list[str]:
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


# ---------------------------------------------------------------------------
# NetCDF parsing — tries netCDF4 first, falls back to h5py
# ---------------------------------------------------------------------------

def _safe_array(val):
    """Convert masked/scalar netCDF4 value to plain Python float."""
    try:
        import numpy as np
        if hasattr(val, 'filled'):
            val = val.filled(0)
        return float(np.asarray(val).ravel()[0]) if np.asarray(val).size > 0 else 0.0
    except Exception:
        return 0.0


def parse_flashes_netcdf4(path: str) -> list[dict]:
    flashes = []
    try:
        import numpy as np
        with nc.Dataset(path, "r") as ds:  # type: ignore[union-attr]
            def get(name):
                if name in ds.variables:
                    v = ds.variables[name][:]
                    if hasattr(v, 'filled'):
                        v = v.filled(0)
                    return np.asarray(v, dtype=float)
                return None

            lats    = get("flash_lat")
            lons    = get("flash_lon")
            energy  = get("flash_energy")
            area    = get("flash_area")

            if lats is None or lons is None:
                return flashes

            n = len(lats)
            for i in range(n):
                lat = float(lats[i])
                lon = float(lons[i])
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    continue
                flashes.append({
                    "lat":       lat,
                    "lon":       lon,
                    "energy_J":  float(energy[i]) if energy is not None else 0.0,
                    "area_km2":  float(area[i])   if area   is not None else 0.0,
                })
    except Exception:
        pass
    return flashes


def parse_flashes_h5py(path: str) -> list[dict]:
    import h5py
    import numpy as np
    flashes = []
    try:
        with h5py.File(path, "r") as f:
            def get(name):
                return np.asarray(f[name][:], dtype=float) if name in f else None

            lats   = get("flash_lat")
            lons   = get("flash_lon")
            energy = get("flash_energy")
            area   = get("flash_area")

            if lats is None or lons is None:
                return flashes

            for i in range(len(lats)):
                lat = float(lats[i])
                lon = float(lons[i])
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    continue
                flashes.append({
                    "lat":      lat,
                    "lon":      lon,
                    "energy_J": float(energy[i]) if energy is not None else 0.0,
                    "area_km2": float(area[i])   if area   is not None else 0.0,
                })
    except Exception:
        pass
    return flashes


def parse_flashes(data: bytes) -> list[dict]:
    tmp = tempfile.NamedTemporaryFile(suffix=".nc", delete=False)
    tmp.write(data)
    tmp.close()
    try:
        if _USE_H5PY:
            return parse_flashes_h5py(tmp.name)
        return parse_flashes_netcdf4(tmp.name)
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Optional bounding-box filter
# ---------------------------------------------------------------------------

def filter_region(
    flashes: list[dict],
    min_lat: float, max_lat: float,
    min_lon: float, max_lon: float,
) -> list[dict]:
    return [
        f for f in flashes
        if min_lat <= f["lat"] <= max_lat and min_lon <= f["lon"] <= max_lon
    ]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def fetch_latest_flashes() -> list[dict]:
    now = datetime.now(timezone.utc)
    candidate_keys: list[str] = []

    # Current hour + previous hour fallback
    for delta in (0, 1):
        t = now - timedelta(hours=delta)
        keys = list_files(t.year, t.timetuple().tm_yday, t.hour)
        candidate_keys.extend(keys)

    # Deduplicate, keep most recent MAX_FILES
    seen: set[str] = set()
    unique: list[str] = []
    for k in reversed(candidate_keys):
        if k not in seen:
            seen.add(k)
            unique.append(k)
    keys_to_fetch = list(reversed(unique[:MAX_FILES]))

    all_flashes: list[dict] = []
    for key in keys_to_fetch:
        data = download_file(key)
        if data:
            all_flashes.extend(parse_flashes(data))

    return all_flashes


def main():
    flashes = fetch_latest_flashes()

    # --- diagnostic summary to stderr (not captured by the Node route) ---
    if flashes:
        lats    = [f["lat"]      for f in flashes]
        lons    = [f["lon"]      for f in flashes]
        energies = [f["energy_J"] for f in flashes]
        areas    = [f["area_km2"] for f in flashes]
        print(
            f"[GLM] {len(flashes)} flashes | "
            f"lat [{min(lats):.2f}, {max(lats):.2f}] "
            f"lon [{min(lons):.2f}, {max(lons):.2f}] | "
            f"max energy {max(energies):.3e} J | "
            f"max area {max(areas):.1f} km²",
            file=sys.stderr,
        )
    else:
        print("[GLM] 0 flashes found", file=sys.stderr)

    # --- GeoJSON output to stdout (consumed by the Node route) ---
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [f["lon"], f["lat"]]},
            "properties": {
                "energy_J":  f["energy_J"],
                "area_km2":  f["area_km2"],
            },
        }
        for f in flashes
    ]
    print(json.dumps({"type": "FeatureCollection", "features": features}))


if __name__ == "__main__":
    main()
