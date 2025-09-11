#!/usr/bin/env python3
import argparse
import pathlib
import subprocess
import sys
import yaml
import hashlib
import shutil
import tempfile
from datetime import datetime
import os

def run_one(cfg_path: pathlib.Path):
    with cfg_path.open("r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    base = cfg_path.parent

    def rp(rel):
        p = (base / rel).resolve()
        p.parent.mkdir(parents=True, exist_ok=True)
        return str(p)

    paths = cfg.get("paths", {}) or {}
    extract = cfg.get("extract", {}) or {}
    post = cfg.get("post", {}) or {}

    image_georef = rp(paths["out_tif"] if "out_tif" in paths else paths["image_georef"])
    out_geojson = rp(paths.get("out_geojson", "../processed/boundary.geojson"))

    # Build CLI for vectorizer
    vec_args = [
        sys.executable, "pipeline/vectorize_from_tif.py",
        "--image_georef", image_georef,
        "--out", out_geojson,
        "--hsv_lower", ",".join(map(str, extract.get("hsv_lower", [90,50,50]))),
        "--hsv_upper", ",".join(map(str, extract.get("hsv_upper", [130,255,255]))),
        "--close_kernel", str(extract.get("close_kernel", 5)),
        "--simplify_ratio", str(extract.get("simplify_ratio", 0.001)),
        "--min_ring_length", str(extract.get("min_ring_length", 20)),
        # Post-process args (all optional, with sensible defaults)
        "--shave_radius_m", str(post.get("shave_radius_m", 0.0)),
        "--buffer_round_m", str(post.get("buffer_round_m", 0.0)),
        "--smooth_radius_m", str(post.get("smooth_radius_m", 20.0)),
        "--simplify_tolerance_m", str(post.get("simplify_tolerance_m", 5.0)),
        "--include_holes", str(post.get("include_holes", False)).lower(),
        "--min_hole_area_sqkm", str(post.get("min_hole_area_sqkm", 0.25)),
        "--max_perimeters", str(post.get("max_perimeters", 2)),
    ]

    print(f"[runner] Loading config: {cfg_path}")
    print(f"[runner] vectorize args: {' '.join(vec_args)}")

    # Backup existing output only if content changes after run
    def _sha256(p):
        h = hashlib.sha256()
        with open(p, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                h.update(chunk)
        return h.hexdigest()

    pre_hash = None
    pre_tmp_backup = None
    if os.path.exists(out_geojson):
        try:
            pre_hash = _sha256(out_geojson)
            # copy to temp backup; decide to keep/rename after run
            fd, pre_tmp_backup = tempfile.mkstemp(prefix="boundary_pre_", suffix=".geojson")
            os.close(fd)
            shutil.copy2(out_geojson, pre_tmp_backup)
            print(f"[runner] Found existing output; temp backup at {pre_tmp_backup}")
        except Exception as e:
            print(f"[runner] WARN: could not snapshot existing output: {e}")

    subprocess.run(vec_args, check=True)

    # If we had an existing output, compare and keep deprecated copy if changed
    if pre_hash is not None and pre_tmp_backup and os.path.exists(out_geojson):
        try:
            post_hash = _sha256(out_geojson)
            if post_hash != pre_hash:
                ts = datetime.now().strftime('%Y%m%d-%H%M%S')
                out_path = pathlib.Path(out_geojson)
                deprecated_name = out_path.with_name(f"boundary.deprecated.{ts}.geojson")
                shutil.move(pre_tmp_backup, deprecated_name)
                print(f"[runner] Output changed; saved previous to {deprecated_name}")
            else:
                os.unlink(pre_tmp_backup)
                print("[runner] Output unchanged; discarded temp backup")
        except Exception as e:
            print(f"[runner] WARN: could not finalize backup handling: {e}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True, nargs="+", help="Path(s) to config.yml")
    args = ap.parse_args()

    for c in args.config:
        run_one(pathlib.Path(c))

if __name__ == "__main__":
    main()
