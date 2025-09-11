#!/usr/bin/env python3
import argparse, json, pathlib, warnings
import numpy as np
import cv2
import rasterio
from rasterio.features import shapes
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.validation import make_valid

try:
    from pyproj import Transformer
    HAS_PYPROJ = True
except Exception:
    HAS_PYPROJ = False

def parse_rgb(ds):
    arr = ds.read()  # bands x h x w
    if arr.shape[0] >= 3:
        r, g, b = arr[0], arr[1], arr[2]
    else:
        raise RuntimeError("Expected at least 3 bands for RGB or RGBA.")
    img = np.dstack([r, g, b]).astype(np.uint8)
    return img

def threshold_blue(img, hsv_lower, hsv_upper):
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    lower = np.array(hsv_lower, dtype=np.uint8)
    upper = np.array(hsv_upper, dtype=np.uint8)
    mask = cv2.inRange(hsv, lower, upper)
    return mask

def clean_mask(mask, k):
    if k > 0:
        kernel = np.ones((k, k), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    return mask

def mask_to_polygons(mask, transform):
    geoms = []
    for geom, val in shapes(mask, mask=mask.astype(bool), transform=transform):
        if int(val) == 0:
            continue
        geoms.append(shape(geom))
    if not geoms:
        return []
    g = unary_union(geoms)
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return []

def simplify_and_filter(polys, simplify_ratio, min_ring_len):
    out = []
    for p in polys:
        p2 = make_valid(p)
        p2 = p2.simplify(simplify_ratio, preserve_topology=True)
        if p2.is_empty:
            continue
        if p2.geom_type == "Polygon":
            if len(p2.exterior.coords) >= min_ring_len:
                out.append(p2)
        elif p2.geom_type == "MultiPolygon":
            for q in p2.geoms:
                if len(q.exterior.coords) >= min_ring_len:
                    out.append(q)
    return out

def _pick_metric_transformer(poly4326):
    if not HAS_PYPROJ:
        return None, None
    try:
        t_fwd = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
        t_back = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
        return t_fwd, t_back
    except Exception:
        return None, None

def _reproject_poly(poly, transformer):
    def _coords(coords):
        xs, ys = zip(*coords)
        X, Y = transformer.transform(xs, ys)
        return list(zip(X, Y))
    if poly.is_empty:
        return poly
    if poly.geom_type == "Polygon":
        ext = _coords(poly.exterior.coords)
        holes = [_coords(ring.coords) for ring in poly.interiors]
        return Polygon(ext, holes)
    elif poly.geom_type == "MultiPolygon":
        return MultiPolygon([_reproject_poly(p, transformer) for p in poly.geoms])
    return poly

def smooth_polygon(poly, smooth_radius_m, simplify_tolerance_m):
    if smooth_radius_m <= 0 and simplify_tolerance_m <= 0:
        return poly
    t_fwd, t_back = _pick_metric_transformer(poly)
    use_metric = (t_fwd is not None)
    if use_metric:
        p_m = _reproject_poly(poly, t_fwd)
        r = float(smooth_radius_m)
        q = p_m.buffer(+r).buffer(-r)
        if simplify_tolerance_m > 0:
            q = q.simplify(simplify_tolerance_m, preserve_topology=True)
        out = _reproject_poly(q, t_back)
    else:
        if smooth_radius_m > 0:
            warnings.warn("pyproj not installed. Smoothing in degrees.")
        deg_r = smooth_radius_m / 111320.0
        q = poly.buffer(+deg_r).buffer(-deg_r)
        if simplify_tolerance_m > 0:
            q = q.simplify(simplify_tolerance_m / 111320.0, preserve_topology=True)
        out = q
    return make_valid(out)

def drop_or_keep_holes(poly, include_holes, min_hole_area_sqkm):
    if include_holes:
        if min_hole_area_sqkm <= 0:
            return poly
        thresh_deg2 = (min_hole_area_sqkm * 1e6) / (111320.0 * 110540.0)
        if poly.geom_type == "Polygon":
            ext = poly.exterior
            holes = [ring for ring in poly.interiors if Polygon(ring).area >= thresh_deg2]
            return Polygon(ext, holes)
        elif poly.geom_type == "MultiPolygon":
            return MultiPolygon([drop_or_keep_holes(p, True, min_hole_area_sqkm) for p in poly.geoms])
        return poly
    if poly.geom_type == "Polygon":
        return Polygon(poly.exterior)
    elif poly.geom_type == "MultiPolygon":
        return MultiPolygon([Polygon(p.exterior) for p in poly.geoms])
    return poly

def keep_n_largest(polys, n):
    if n is None or n <= 0:
        return polys
    polys = sorted(polys, key=lambda p: p.area, reverse=True)
    return polys[:n]

def write_geojson(polys, out_path):
    fc = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": mapping(p),
            "properties": {}
        } for p in polys],
    }
    out_path = pathlib.Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(fc, f)
    print(f"[vectorize] wrote {out_path}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image_georef", required=True, help="GeoTIFF in EPSG:4326")
    ap.add_argument("--out", required=True, help="Output GeoJSON path")
    ap.add_argument("--hsv_lower", default="90,50,50")
    ap.add_argument("--hsv_upper", default="130,255,255")
    ap.add_argument("--close_kernel", type=int, default=5)
    ap.add_argument("--simplify_ratio", type=float, default=0.001)
    ap.add_argument("--fill_holes_under_sqkm", type=float, default=0.05)  # legacy
    ap.add_argument("--min_ring_length", type=int, default=20)
    # New post-process controls
    ap.add_argument("--smooth_radius_m", type=float, default=20.0)
    ap.add_argument("--simplify_tolerance_m", type=float, default=5.0)
    ap.add_argument("--include_holes", type=lambda s: s.lower() == "true", default=False)
    ap.add_argument("--min_hole_area_sqkm", type=float, default=0.25)
    ap.add_argument("--max_perimeters", type=int, default=2)
    args = ap.parse_args()

    hsv_lower = list(map(int, args.hsv_lower.split(",")))
    hsv_upper = list(map(int, args.hsv_upper.split(",")))

    with rasterio.open(args.image_georef) as ds:
        if ds.crs is None:
            raise RuntimeError("GeoTIFF has no CRS.")
        if ds.crs.to_epsg() not in (4326, None):
            raise RuntimeError("Please export GeoTIFF in EPSG:4326 for now.")
        img = parse_rgb(ds)
        mask = threshold_blue(img, hsv_lower, hsv_upper)
        mask = clean_mask(mask, args.close_kernel)
        polys = mask_to_polygons(mask, ds.transform)
        polys = simplify_and_filter(polys, args.simplify_ratio, args.min_ring_length)
        processed = []
        for p in polys:
            p1 = smooth_polygon(p, args.smooth_radius_m, args.simplify_tolerance_m)
            p2 = drop_or_keep_holes(p1, args.include_holes, args.min_hole_area_sqkm)
            if not p2.is_empty:
                if p2.geom_type == "Polygon":
                    processed.append(p2)
                elif p2.geom_type == "MultiPolygon":
                    processed.extend(list(p2.geoms))
        processed = keep_n_largest(processed, args.max_perimeters)
        write_geojson(processed, args.out)

if __name__ == "__main__":
    main()