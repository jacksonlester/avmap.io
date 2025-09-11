#!/usr/bin/env python3
"""
georef.py
Compute a pixel->geo homography from QGIS .points or CSV.

Features:
  - Auto-try CRS: compares 4326 vs 3857->4326 and picks the lower RMSE
  - Optional flags: --flipx, --swapxy, --swap_latlon, --normalize, --force_crs
  - QA GeoTIFF output (optional, needs rasterio)

Example:
  python pipeline/georef.py \
    --image "…/map.png" \
    --gcps  "…/gcps.points" \
    --out_h "…/H.npy" \
    --out_tif "…/georef.tif" \
    --normalize --flipx --swapxy
"""

import argparse
import pathlib
import numpy as np
import cv2


# ---------------------------- GCP LOADER --------------------------------------

def load_gcps(path: pathlib.Path):
    """Return px, py, lon, lat from .points or CSV."""
    if not path.exists():
        raise FileNotFoundError(f"GCP file not found: {path}")

    def _get(row, names):
        for n in names:
            if n in row and row[n]:
                return row[n]
        raise KeyError(names)

    if path.suffix.lower() == ".points":
        import csv, io
        txt = path.read_text(encoding="utf-8")
        lines = [ln for ln in (ln.strip() for ln in txt.splitlines())
                 if ln and not ln.startswith("#")]
        px, py, lon, lat = [], [], [], []
        try:
            sample = "\n".join(lines[:10])
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t ")
            reader = csv.DictReader(io.StringIO("\n".join(lines)), dialect=dialect)
            rows = [{(k or "").strip().lower(): (v or "").strip() for k, v in r.items()} for r in reader]
            for r in rows:
                try:
                    mX = float(_get(r, ["mapx", "lon", "x", "long"]))
                    mY = float(_get(r, ["mapy", "lat", "y", "latitude"]))
                    pX = float(_get(r, ["pixelx", "sourcex", "x_src", "source_x", "imgx"]))
                    pY = float(_get(r, ["pixely", "sourcey", "y_src", "source_y", "imgy"]))
                except (ValueError, KeyError):
                    continue
                lon.append(mX); lat.append(mY); px.append(pX); py.append(pY)
        except Exception:
            # Fallback: whitespace split
            for s in lines:
                parts = s.replace("\t", " ").split()
                if len(parts) >= 4:
                    mX, mY, pX, pY = map(float, parts[:4])
                    lon.append(mX); lat.append(mY); px.append(pX); py.append(pY)
        if len(px) < 4:
            raise RuntimeError(f"Need at least 4 GCP rows in {path}, found {len(px)}.")
        return px, py, lon, lat

    # CSV with headers pixel_x,pixel_y,lon,lat
    import csv
    with path.open("r", newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        required = {"pixel_x", "pixel_y", "lon", "lat"}
        cols = {c.strip().lower() for c in (r.fieldnames or [])}
        if not required.issubset(cols):
            raise RuntimeError(f"CSV must have headers pixel_x,pixel_y,lon,lat. Got: {r.fieldnames}")
        px, py, lon, lat = [], [], [], []
        for row in r:
            px.append(float(row["pixel_x"]))
            py.append(float(row["pixel_y"]))
            lon.append(float(row["lon"]))
            lat.append(float(row["lat"]))
    if len(px) < 4:
        raise RuntimeError(f"Need at least 4 GCPs. Found {len(px)} in {path}.")
    return px, py, lon, lat


# -------------------------- CRS HANDLING --------------------------------------

def to_wgs84_candidates(lon, lat):
    """Return two candidates for dst coords in EPSG:4326:
       - as-is (assume already lon/lat degrees)
       - reproject from EPSG:3857 meters to EPSG:4326 degrees
    """
    lon = np.asarray(lon, np.float64)
    lat = np.asarray(lat, np.float64)
    # Candidate A: assume already 4326
    cand_a = (lon.astype(np.float32), lat.astype(np.float32))

    # Candidate B: 3857 -> 4326
    try:
        from pyproj import Transformer
        transformer = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
        lon_b, lat_b = transformer.transform(lon, lat)
        cand_b = (lon_b.astype(np.float32), lat_b.astype(np.float32))
    except Exception:
        cand_b = cand_a  # pyproj not installed, fallback

    return cand_a, cand_b


# ------------------------- PIXEL NORMALIZATION --------------------------------

def normalize_pixels(px, py, w, h, flipx=False, swapxy=False, normalize=False):
    """Map arbitrary px,py to image space, Y-down, with optional flips."""
    px = np.asarray(px, np.float32)
    py = np.asarray(py, np.float32)

    if normalize:
        x_min, x_max = float(px.min()), float(px.max())
        y_min, y_max = float(py.min()), float(py.max())
        px = (px - x_min) * (w - 1) / max(x_max - x_min, 1e-6)
        py = (py - y_min) * (h - 1) / max(y_max - y_min, 1e-6)

    # Y-down
    py = (h - 1) - py

    if flipx:
        px = (w - 1) - px
    if swapxy:
        px, py = py, px

    return np.column_stack([px, py])


# ----------------------------- SCORING ----------------------------------------

def _deg_to_meters(dx_deg, dy_deg, lat0_deg):
    """Rough conversion for small deltas near lat0."""
    lat0_rad = np.deg2rad(lat0_deg)
    mx = dx_deg * 111320.0 * np.cos(lat0_rad)  # meters per degree lon
    my = dy_deg * 110540.0                     # meters per degree lat
    return mx, my

def score_fit(H, src, dst):
    """RMSE in meters between H(src) and dst."""
    n = src.shape[0]
    pts = np.hstack([src, np.ones((n, 1), dtype=np.float32)]).T  # 3xN
    pred = (H @ pts)
    pred = (pred[:2] / pred[2:]).T  # Nx2 in degrees
    dx = pred[:, 0] - dst[:, 0]
    dy = pred[:, 1] - dst[:, 1]
    lat0 = float(dst[:, 1].mean())
    mx, my = _deg_to_meters(dx, dy, lat0)
    rmse = float(np.sqrt((mx**2 + my**2).mean()))
    return rmse


# ---------------------------- QA GEOTIFF --------------------------------------

def write_geotiff_qa(image_path, H, out_tif):
    try:
        import rasterio
        from rasterio.transform import Affine
        from rasterio.crs import CRS
    except Exception:
        print("[georef] rasterio not installed. Skipping QA GeoTIFF.")
        return

    img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if img is None:
        print(f"[georef] Could not read image for QA: {image_path}")
        return
    h, w = img.shape[:2]

    xs, ys = np.meshgrid(np.arange(w, dtype=np.float32),
                         np.arange(h, dtype=np.float32))
    pts = np.stack([xs.ravel(), ys.ravel(), np.ones(xs.size, dtype=np.float32)], axis=0)
    lonlat = H @ pts
    lon = (lonlat[0] / lonlat[2]).reshape(h, w)
    lat = (lonlat[1] / lonlat[2]).reshape(h, w)

    xres = (lon[0, -1] - lon[0, 0]) / max(w - 1, 1)
    yres = (lat[-1, 0] - lat[0, 0]) / max(h - 1, 1)
    transform = Affine.translation(lon[0, 0], lat[0, 0]) * Affine.scale(xres, yres)

    out_tif.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        out_tif, "w", driver="GTiff",
        height=h, width=w, count=3, dtype=img.dtype,
        crs=CRS.from_epsg(4326), transform=transform
    ) as dst:
        b, g, r = cv2.split(img)  # OpenCV BGR
        dst.write(r, 1); dst.write(g, 2); dst.write(b, 3)
    print(f"[georef] Wrote QA GeoTIFF to {out_tif}")


# --------------------------------- CLI ----------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--gcps", required=True)
    ap.add_argument("--out_h", required=True)
    ap.add_argument("--out_tif")
    ap.add_argument("--swap_latlon", action="store_true")
    ap.add_argument("--flipx", action="store_true")
    ap.add_argument("--swapxy", action="store_true")
    ap.add_argument("--normalize", action="store_true")
    ap.add_argument("--force_crs", choices=["auto", "4326", "3857"], default="auto",
                    help="Interpret GCP mapX/mapY as this CRS before fitting.")
    args = ap.parse_args()

    img = cv2.imread(str(args.image), cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {args.image}")
    h, w = img.shape[:2]
    print(f"[georef] Image size w={w} h={h}")

    px, py, lon_raw, lat_raw = load_gcps(pathlib.Path(args.gcps))
    src = normalize_pixels(px, py, w, h, flipx=args.flipx, swapxy=args.swapxy, normalize=args.normalize)

    # Build candidate dst sets in EPSG:4326
    cand_4326, cand_3857_to_4326 = to_wgs84_candidates(lon_raw, lat_raw)

    # Optionally force CRS
    candidates = []
    if args.force_crs == "4326":
        candidates = [("4326", cand_4326)]
    elif args.force_crs == "3857":
        candidates = [("3857->4326", cand_3857_to_4326)]
    else:
        candidates = [("4326", cand_4326), ("3857->4326", cand_3857_to_4326)]

    # Optional swap lat/lon
    tested = []
    for label, (lon_deg, lat_deg) in candidates:
        if args.swap_latlon:
            lon_deg, lat_deg = lat_deg, lon_deg
            label = f"{label} + swap_latlon"
        dst = np.column_stack([lon_deg, lat_deg]).astype(np.float32)
        H, mask = cv2.findHomography(src, dst, method=0)
        if H is None:
            rmse = float("inf")
        else:
            rmse = score_fit(H, src, dst)
        print(f"[georef] Candidate {label} RMSE ≈ {rmse:.2f} m")
        tested.append((rmse, H, label, dst))

    # Pick best
    tested.sort(key=lambda t: t[0])
    best_rmse, best_H, best_label, best_dst = tested[0]
    if not np.isfinite(best_rmse) or best_H is None:
        raise RuntimeError("Homography failed for all candidates. Check GCPs.")

    print(f"[georef] Selected: {best_label}  RMSE ≈ {best_rmse:.2f} m")
    out_h = pathlib.Path(args.out_h)
    out_h.parent.mkdir(parents=True, exist_ok=True)
    np.save(out_h, best_H)
    print(f"[georef] Saved homography -> {out_h}")

    if args.out_tif:
        write_geotiff_qa(pathlib.Path(args.image), best_H, pathlib.Path(args.out_tif))


if __name__ == "__main__":
    main()