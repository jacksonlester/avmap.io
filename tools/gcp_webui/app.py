#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path
from dataclasses import dataclass
import subprocess
import sys

import numpy as np
import cv2
import rasterio
from rasterio.transform import Affine
from flask import Flask, request, jsonify, render_template, send_file


@dataclass
class Session:
    image_path: Path
    out_dir: Path
    city: str
    auto_vectorize: bool = False


app = Flask(__name__, static_folder="static", template_folder="templates")
STATE: Session | None = None


def load_image_rgb(p: Path):
    img = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f"Cannot read image: {p}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)
    else:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img


def fit_affine(pixel_pts: np.ndarray, lonlat_pts: np.ndarray):
    # Solve lon = a*x + b*y + c; lat = d*x + e*y + f
    N = pixel_pts.shape[0]
    X = np.hstack([pixel_pts, np.ones((N, 1))])  # N x 3
    params, *_ = np.linalg.lstsq(X, lonlat_pts, rcond=None)  # 3x2
    A = params[:2, :].T  # 2x2
    t = params[2, :]
    return A, t


def residuals(pixel_pts: np.ndarray, lonlat_pts: np.ndarray, A: np.ndarray, t: np.ndarray):
    pred = (pixel_pts @ A.T) + t
    err = np.sqrt(((pred - lonlat_pts) ** 2).sum(axis=1))
    return pred, err


@app.route("/")
def index():
    assert STATE is not None
    img = load_image_rgb(STATE.image_path)
    h, w = img.shape[:2]
    return render_template(
        "index.html",
        image_rel="/image",
        width=w,
        height=h,
        city=STATE.city,
    )


@app.route("/api/georef", methods=["POST"])
def api_georef():
    assert STATE is not None
    payload = request.get_json(force=True)
    pixel_pts = np.asarray(payload.get("pixels", []), dtype=float)
    lonlat_pts = np.asarray(payload.get("lonlats", []), dtype=float)
    if pixel_pts.shape[0] < 3 or lonlat_pts.shape[0] < 3 or pixel_pts.shape[0] != lonlat_pts.shape[0]:
        return jsonify({"ok": False, "error": "Need at least 3 matching points"}), 400

    A, t = fit_affine(pixel_pts, lonlat_pts)
    pred, err = residuals(pixel_pts, lonlat_pts, A, t)
    rmse = float(np.sqrt((err ** 2).mean()))
    med = float(np.median(err))

    # Write GeoTIFF
    img = load_image_rgb(STATE.image_path)
    arr = img.transpose(2, 0, 1)
    h, w = img.shape[:2]
    out_tif = STATE.out_dir / "georef.tif"
    out_tif.parent.mkdir(parents=True, exist_ok=True)
    affine = Affine(A[0, 0], A[0, 1], t[0], A[1, 0], A[1, 1], t[1])
    with rasterio.open(
        out_tif,
        "w",
        driver="GTiff",
        height=h,
        width=w,
        count=3,
        dtype=arr.dtype,
        crs="EPSG:4326",
        transform=affine,
    ) as dst:
        dst.write(arr)

    # Save sidecar QC + metadata
    meta = {
        "pixels": pixel_pts.tolist(),
        "lonlats": lonlat_pts.tolist(),
        "affine": [affine.a, affine.b, affine.c, affine.d, affine.e, affine.f],
        "rmse_deg": rmse,
        "median_err_deg": med,
    }
    (STATE.out_dir / "autogeoref.json").write_text(json.dumps(meta, indent=2))

    result = {
        "ok": True,
        "out_tif": str(out_tif),
        "rmse_deg": rmse,
        "median_err_deg": med,
        "vectorized": False,
        "boundary_path": None,
    }

    # Optionally run vectorization via runner.py with sibling meta/config.yml
    try:
        if STATE.auto_vectorize:
            cfg = (STATE.out_dir.parent / 'meta' / 'config.yml')
            if cfg.exists():
                cmd = [sys.executable, 'runner.py', '--config', str(cfg)]
                subprocess.run(cmd, check=True)
                boundary = STATE.out_dir.parent / 'processed' / 'boundary.geojson'
                if boundary.exists():
                    result["vectorized"] = True
                    result["boundary_path"] = str(boundary)
    except Exception as e:
        # Don't fail the georeference if vectorization errored
        result["vectorized_error"] = str(e)

    return jsonify(result)


@app.route("/image")
def image_file():
    assert STATE is not None
    # Serve the PNG directly from disk; avoids relying on relative paths
    return send_file(STATE.image_path)


@app.route("/open")
def open_image():
    """Switch the active image (and derived out_dir/city) via URL params, then show the UI.
    Example: /open?image=Providers/Waymo/San%20Francisco/August%202023/interim/service%20area%20cropped.png&city=San%20Francisco
    """
    assert STATE is not None
    image = request.args.get('image')
    city = request.args.get('city', STATE.city)
    if not image:
        return jsonify({"ok": False, "error": "missing image param"}), 400
    p = Path(image)
    if not p.exists():
        return jsonify({"ok": False, "error": f"image not found: {p}"}), 404
    STATE.image_path = p.resolve()
    STATE.out_dir = STATE.image_path.parent.resolve()
    STATE.city = city
    return index()


def main():
    ap = argparse.ArgumentParser(description="Local GCP web UI for georeferencing a PNG")
    ap.add_argument("--image", required=True, help="Path to the PNG to georeference")
    ap.add_argument("--outdir", required=False, default=None, help="Output directory (default: <image>/../interim)")
    ap.add_argument("--city", required=False, default="", help="City label for the UI")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=5000)
    ap.add_argument("--auto-vectorize", action='store_true', help="After saving GeoTIFF, auto-run runner.py for sibling config.yml")
    args = ap.parse_args()

    img_path = Path(args.image).resolve()
    if not img_path.exists():
        raise SystemExit(f"Image not found: {img_path}")
    if args.outdir:
        out_dir = Path(args.outdir)
    else:
        out_dir = (img_path.parent)
    out_dir = out_dir.resolve()

    global STATE
    STATE = Session(image_path=img_path, out_dir=out_dir, city=args.city, auto_vectorize=bool(args.auto_vectorize))

    print(f"[gcp-webui] Serving for image: {img_path}")
    print(f"[gcp-webui] Output dir: {out_dir}")
    print(f"[gcp-webui] Open http://{args.host}:{args.port} in your browser")
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
