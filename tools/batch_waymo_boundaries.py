#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
import subprocess
import yaml
import sys

TEMPLATE_PATH = Path("Providers/Waymo/Silicon Valley/June 2025/meta/config.yml")

DEFAULT_TEMPLATE = {
    "paths": {
        "image_georef": "../interim/georef.tif",
        "out_geojson": "../processed/boundary.geojson",
    },
    "extract": {
        "hsv_lower": [90, 50, 50],
        "hsv_upper": [130, 255, 255],
        "close_kernel": 9,
        "simplify_ratio": 0.0005,
        "min_ring_length": 20,
    },
    "post": {
        "smooth_radius_m": 70,
        "simplify_tolerance_m": 10,
        "include_holes": False,
        "min_hole_area_sqkm": 0.25,
        "max_perimeters": 1,
        "shave_radius_m": 40,
        "buffer_round_m": 30,
    }
}


def load_template():
    if TEMPLATE_PATH.exists():
        with TEMPLATE_PATH.open('r', encoding='utf-8') as f:
            try:
                cfg = yaml.safe_load(f) or {}
            except Exception:
                cfg = {}
        # Ensure required keys and defaults
        out = DEFAULT_TEMPLATE.copy()
        # shallow merge dicts
        for k, v in cfg.items():
            if isinstance(v, dict) and k in out:
                out[k].update(v)
            else:
                out[k] = v
        # Hard-set the canonical paths
        out.setdefault('paths', {})
        out['paths']['image_georef'] = "../interim/georef.tif"
        out['paths']['out_geojson'] = "../processed/boundary.geojson"
        return out
    return DEFAULT_TEMPLATE


def iter_waymo_date_dirs(root: Path, only_under: str = ""):
    waymo = root
    for city in sorted(d for d in waymo.iterdir() if d.is_dir()):
        for date in sorted(d for d in city.iterdir() if d.is_dir()):
            if only_under and only_under not in str(date):
                continue
            # expect subdirs
            meta = date / 'meta'
            interim = date / 'interim'
            processed = date / 'processed'
            if meta.is_dir() and interim.is_dir() and processed.is_dir():
                yield date


def ensure_config(date_dir: Path, template: dict, overwrite: bool = False, dry_run: bool = False) -> Path:
    meta_dir = date_dir / 'meta'
    cfg_path = meta_dir / 'config.yml'
    if cfg_path.exists() and not overwrite:
        print(f"CONFIG exists: {cfg_path}")
        return cfg_path
    meta_dir.mkdir(parents=True, exist_ok=True)
    print(f"WRITE CONFIG: {cfg_path}")
    if not dry_run:
        with cfg_path.open('w', encoding='utf-8') as f:
            yaml.safe_dump(template, f, sort_keys=False)
    return cfg_path


def run_runner(cfg_path: Path, dry_run: bool = False) -> int:
    cmd = [
        sys.executable, "runner.py", "--config", str(cfg_path)
    ]
    print(f"RUN: {' '.join(cmd)}")
    if dry_run:
        return 0
    res = subprocess.run(cmd)
    return res.returncode


def find_city_reference_geojson(city_dir: Path) -> Path | None:
    # Prefer an existing boundary.geojson; else any *.geojson in processed
    candidates = []
    for date in sorted(d for d in city_dir.iterdir() if d.is_dir()):
        proc = date / 'processed'
        if not proc.is_dir():
            continue
        b = proc / 'boundary.geojson'
        if b.exists():
            return b
        for g in sorted(proc.glob('*.geojson')):
            candidates.append(g)
    return candidates[0] if candidates else None


def autogeoref_if_needed(date_dir: Path, only_city_ref: Path | None, dry_run: bool = False) -> bool:
    geotiff = date_dir / 'interim' / 'georef.tif'
    if geotiff.exists():
        return True
    img1 = date_dir / 'interim' / 'service area cropped.png'
    img2 = date_dir / 'interim' / 'expansion map.png'
    image = img1 if img1.exists() else (img2 if img2.exists() else None)
    if not image:
        print(f"SKIP (no PNG found): {date_dir}/interim")
        return False
    if only_city_ref is None:
        print(f"SKIP (no reference GeoJSON for city): {date_dir}")
        return False
    out_qc = geotiff.with_name('autogeoref_qc.png')
    cmd = [
        sys.executable, 'tools/autogeoref_from_polygon.py',
        '--image', str(image),
        '--ref', str(only_city_ref),
        '--out', str(geotiff),
        '--qc', str(out_qc),
    ]
    print(f"AUTOGEOREF: {' '.join(cmd)}")
    if dry_run:
        return False
    res = subprocess.run(cmd)
    return res.returncode == 0 and geotiff.exists()


def main():
    ap = argparse.ArgumentParser(description="Create configs and generate boundary.geojson for Waymo date folders.")
    ap.add_argument('--root', type=Path, default=Path('Providers/Waymo'), help='Waymo root path')
    ap.add_argument('--only-under', type=str, default='', help='Substring filter for target paths')
    ap.add_argument('--overwrite-config', action='store_true', help='Overwrite existing configs')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    template = load_template()
    targets = list(iter_waymo_date_dirs(args.root, args.only_under))
    if not targets:
        print("No Waymo date folders found.")
        return

    ok = 0
    skipped = 0
    for date_dir in targets:
        print(f"---\nDATE: {date_dir}")
        cfg_path = ensure_config(date_dir, template, overwrite=args.overwrite_config, dry_run=args.dry_run)
        geotiff = date_dir / 'interim' / 'georef.tif'
        # Autogeoref if missing, using a per-city reference
        city_dir = date_dir.parent
        ref = find_city_reference_geojson(city_dir)
        if not geotiff.exists():
            ok_auto = autogeoref_if_needed(date_dir, ref, dry_run=args.dry_run)
            if not ok_auto:
                print(f"SKIP (no georef.tif): {geotiff}")
                skipped += 1
                continue
        rc = run_runner(cfg_path, dry_run=args.dry_run)
        if rc == 0:
            ok += 1
        else:
            print(f"ERROR: runner exited code {rc} for {cfg_path}")
    print(f"---\nDone. Ran: {ok}, Skipped: {skipped}")


if __name__ == '__main__':
    main()
