#!/usr/bin/env python3
import argparse
from pathlib import Path
import json
import sys
import numpy as np
import cv2
import rasterio
from rasterio.transform import Affine
from shapely.geometry import shape, Polygon, MultiPolygon
try:
    from pyproj import Transformer
    HAS_PYPROJ = True
except Exception:
    HAS_PYPROJ = False
from shapely.ops import unary_union


def load_png_rgb(p: Path):
    img = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f"Could not read image: {p}")
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
    elif img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)
    else:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img


def extract_blue_mask(img, hsv_lower=(90,50,50), hsv_upper=(130,255,255), close_k=7):
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    lower = np.array(hsv_lower, dtype=np.uint8)
    upper = np.array(hsv_upper, dtype=np.uint8)
    mask = cv2.inRange(hsv, lower, upper)
    if close_k > 0:
        kernel = np.ones((close_k, close_k), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    return mask


def mask_largest_contour_polygon(mask):
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return None
    cnt = max(cnts, key=cv2.contourArea)
    # Convert to Nx2 float array (x,y) in pixel coordinates
    pts = cnt[:, 0, :].astype(np.float64)
    if len(pts) < 10:
        return None
    return pts


def read_reference_polygon(ref_geojson: Path):
    with ref_geojson.open('r', encoding='utf-8') as f:
        gj = json.load(f)
    geoms = []
    if gj.get('type') == 'FeatureCollection':
        for feat in gj['features']:
            geoms.append(shape(feat['geometry']))
    elif gj.get('type') in ('Polygon', 'MultiPolygon'):
        geoms.append(shape(gj))
    else:
        raise RuntimeError('Unsupported GeoJSON type')
    if not geoms:
        raise RuntimeError('No geometries in reference GeoJSON')
    u = unary_union(geoms)
    if isinstance(u, (Polygon, MultiPolygon)):
        if isinstance(u, Polygon):
            polys = [u]
        else:
            polys = list(u.geoms)
        # Take largest polygon
        poly = max(polys, key=lambda p: p.area)
        # Use exterior ring
        xs, ys = poly.exterior.xy
        ref_pts = np.stack([xs, ys], axis=1).astype(np.float64)
        # Heuristic CRS detection: if coordinates look like Web Mercator meters, reproject to EPSG:4326
        if HAS_PYPROJ:
            max_abs = float(np.max(np.abs(ref_pts)))
            if max_abs > 1000:  # likely not degrees
                t = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
                X, Y = t.transform(ref_pts[:,0], ref_pts[:,1])
                ref_pts = np.stack([X, Y], axis=1)
        return ref_pts
    raise RuntimeError('Unexpected reference geometry union type')


def resample_polyline(pts: np.ndarray, n: int = 500) -> np.ndarray:
    # pts: Nx2 ordered polyline
    diffs = np.diff(pts, axis=0)
    seglens = np.sqrt((diffs**2).sum(axis=1))
    L = np.concatenate([[0.0], np.cumsum(seglens)])
    if L[-1] == 0:
        return np.repeat(pts[:1], n, axis=0)
    t = np.linspace(0, L[-1], n)
    # interpolate
    xi = np.interp(t, L, pts[:,0])
    yi = np.interp(t, L, pts[:,1])
    return np.stack([xi, yi], axis=1)


def kabsch_similarity(src: np.ndarray, dst: np.ndarray, allow_reflection: bool = True):
    # Solve for s, R, t s.t. dst ≈ s R src + t
    src_mean = src.mean(axis=0)
    dst_mean = dst.mean(axis=0)
    X = src - src_mean
    Y = dst - dst_mean
    normX = np.sqrt((X**2).sum())
    normY = np.sqrt((Y**2).sum())
    if normX == 0 or normY == 0:
        raise RuntimeError('Degenerate point sets')
    Xn = X / normX
    Yn = Y / normY
    H = Xn.T @ Yn
    U, S, Vt = np.linalg.svd(H)
    R = Vt.T @ U.T
    if (not allow_reflection) and np.linalg.det(R) < 0:
        Vt[-1,:] *= -1
        R = Vt.T @ U.T
    s = (normY / normX)
    t = dst_mean - s*(R @ src_mean)
    return s, R, t


def transform_to_affine(s: float, R: np.ndarray, t: np.ndarray) -> Affine:
    # Map (col,row) -> (lon,lat): [lon,lat]^T = s*R*[col,row]^T + t
    a = s * R[0,0]
    b = s * R[0,1]
    d = s * R[1,0]
    e = s * R[1,1]
    c = t[0]
    f = t[1]
    return Affine(a, b, c, d, e, f)


def invert_similarity(s: float, R: np.ndarray, t: np.ndarray):
    # Inverse transform for QC overlay: pixel = R^T*(1/s)*(lonlat - t)
    Ri = R.T
    si = 1.0/s
    ti = -si * (Ri @ t)
    return si, Ri, ti


def affine_least_squares(src: np.ndarray, dst: np.ndarray):
    # Solve for A (2x2) and t (2,) minimizing ||A*src + t - dst||
    # Build design matrix
    N = src.shape[0]
    X = np.hstack([src, np.ones((N,1))])  # N x 3 with [x y 1]
    # Solve for each output dim
    # dst = X @ params, where params is 3x2 -> stack solutions
    params, *_ = np.linalg.lstsq(X, dst, rcond=None)
    A = params[:2, :].T  # 2x2
    t = params[2, :]     # 2,
    return A, t


def pixel_variants(pts: np.ndarray, w: int, h: int):
    # pts in pixel coords (x right, y down). Generate rotated/flipped variants in pixel space.
    variants = []
    def rot0(p):
        return p.copy(), w, h
    def rot90(p):
        # rotate 90 deg CCW: (x, y) -> (y, w-1-x)
        q = np.stack([p[:,1], (w-1)-p[:,0]], axis=1)
        return q, h, w
    def rot180(p):
        q = np.stack([(w-1)-p[:,0], (h-1)-p[:,1]], axis=1)
        return q, w, h
    def rot270(p):
        # 270 CCW: (x, y) -> (h-1-y, x)
        q = np.stack([(h-1)-p[:,1], p[:,0]], axis=1)
        return q, h, w
    rots = [("rot0", rot0), ("rot90", rot90), ("rot180", rot180), ("rot270", rot270)]
    for rname, rf in rots:
        q, ww, hh = rf(pts)
        for flip in ("none", "h", "v"):
            qq = q.copy()
            if flip == "h":
                qq[:,0] = (ww-1) - qq[:,0]
            elif flip == "v":
                qq[:,1] = (hh-1) - qq[:,1]
            variants.append(((rname, flip), qq, ww, hh))
    return variants


def variant_affine(rot: str, flip: str, w: int, h: int) -> Affine:
    # Return Affine mapping original pixel (x,y) -> variant pixel (x',y')
    # Order: apply rotation, then optional flip.
    if rot == 'rot0':
        a = Affine(1, 0, 0, 0, 1, 0)
    elif rot == 'rot90':
        # (x, y) -> (y, w-1-x)
        a = Affine(0, 1, 0, -1, 0, (w-1))
    elif rot == 'rot180':
        # (x, y) -> (w-1-x, h-1-y)
        a = Affine(-1, 0, (w-1), 0, -1, (h-1))
    elif rot == 'rot270':
        # (x, y) -> (h-1-y, x)
        a = Affine(0, -1, (h-1), 1, 0, 0)
    else:
        raise ValueError('unknown rot')
    # Apply flip in the rotated frame
    if rot in ('rot0','rot180'):
        ww, hh = w, h
    else:
        ww, hh = h, w
    if flip == 'h':
        f = Affine(-1, 0, (ww-1), 0, 1, 0)
        a = f * a
    elif flip == 'v':
        f = Affine(1, 0, 0, 0, -1, (hh-1))
        a = f * a
    elif flip == 'none':
        pass
    else:
        raise ValueError('unknown flip')
    return a


def run_autogeoref(image_path: Path, ref_geojson: Path, out_tif: Path, qc_overlay: Path) -> dict:
    img = load_png_rgb(image_path)
    mask = extract_blue_mask(img)
    pix_poly = mask_largest_contour_polygon(mask)
    if pix_poly is None:
        # debug dump
        dbg = out_tif.with_name('autogeoref_mask_debug.png')
        try:
            cv2.imwrite(str(dbg), mask)
        except Exception:
            pass
        nz = int(mask.sum() // 255)
        raise RuntimeError(f'Could not extract a polygon from image (blue area not found). mask_pixels={nz}, debug={dbg}')

    ref_poly = read_reference_polygon(ref_geojson)
    # Resample both to common length
    N = 800
    src = resample_polyline(pix_poly, N)
    dst = resample_polyline(ref_poly, N)

    # Try rotations/flips of the pixel polyline, and both directions of dst
    best = None
    h, w = img.shape[:2]
    for (rname, flip), src_var, ww, hh in pixel_variants(src, w, h):
        for candidate, cname in ((dst, 'fwd'), (dst[::-1], 'rev')):
            # Similarity (without and with reflection allowed)
            for allow_ref in (False, True):
                try:
                    s, R, t = kabsch_similarity(src_var, candidate, allow_reflection=allow_ref)
                    pred = (s * (src_var @ R.T)) + t
                    err = np.sqrt(((pred - candidate)**2).sum(axis=1))
                    rmse = float(np.sqrt((err**2).mean()))
                    med = float(np.median(err))
                    cand = {
                        'mode':'similarity','s':s,'R':R,'t':t,
                        'rmse':rmse,'median_err':med,
                        'variant': {'rot': rname, 'flip': flip, 'dst_order': cname, 'reflect_ok': allow_ref}
                    }
                    if (best is None) or (rmse < best['rmse']):
                        cand['pre_affine'] = variant_affine(rname, flip, w, h)
                        best = cand
                except Exception:
                    pass
            # Full affine
            try:
                A, t2 = affine_least_squares(src_var, candidate)
                pred2 = (src_var @ A.T) + t2
                err2 = np.sqrt(((pred2 - candidate)**2).sum(axis=1))
                rmse2 = float(np.sqrt((err2**2).mean()))
                med2 = float(np.median(err2))
                cand2 = {
                    'mode':'affine','A':A,'t':t2,
                    'rmse':rmse2,'median_err':med2,
                    'variant': {'rot': rname, 'flip': flip, 'dst_order': cname}
                }
                if (best is None) or (rmse2 < best['rmse']):
                    cand2['pre_affine'] = variant_affine(rname, flip, w, h)
                    best = cand2
            except Exception:
                pass

    if best['mode'] == 'similarity':
        solved = transform_to_affine(best['s'], best['R'], best['t'])
    else:
        A = best['A']; t = best['t']
        solved = Affine(A[0,0], A[0,1], t[0], A[1,0], A[1,1], t[1])
    # Compose with pre-variant transform to map original pixels -> lon/lat
    affine = solved * best['pre_affine']

    # Write GeoTIFF in EPSG:4326
    h, w = img.shape[:2]
    arr = img.transpose(2,0,1)  # bands, rows, cols
    out_tif.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        out_tif,
        'w',
        driver='GTiff',
        height=h,
        width=w,
        count=3,
        dtype=arr.dtype,
        crs='EPSG:4326',
        transform=affine,
    ) as dst:
        dst.write(arr)

    # QC overlay: draw reference boundary projected into pixel space
    # Build general inverse using homogeneous 3x3 for QC drawing
    M = np.array([[affine.a, affine.b, affine.c],
                  [affine.d, affine.e, affine.f],
                  [0,        0,        1       ]], dtype=float)
    Minv = np.linalg.inv(M)
    ref_pts = resample_polyline(ref_poly, 1000)
    ones = np.ones((ref_pts.shape[0],1))
    P = np.hstack([ref_pts, ones])  # lon,lat,1
    pix_h = (Minv @ P.T).T
    pix_pred = pix_h[:, :2]
    overlay = img[:, :, ::-1].copy()  # to BGR for cv2 drawing (contiguous)
    pp = pix_pred.astype(np.int32)
    cv2.polylines(overlay, [pp], isClosed=True, color=(0,0,255), thickness=2)
    qc_overlay.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(qc_overlay), overlay)

    return {
        'rmse_deg': best['rmse'],
        'median_err_deg': best['median_err'],
        'affine': [affine.a, affine.b, affine.c, affine.d, affine.e, affine.f],
        'w': w, 'h': h,
        'qc_overlay': str(qc_overlay)
    }


def main():
    ap = argparse.ArgumentParser(description='Auto-georeference PNG by aligning polygon to reference boundary.')
    ap.add_argument('--image', required=True, type=Path, help='Input PNG path (not georeferenced)')
    ap.add_argument('--ref', required=True, type=Path, help='Reference boundary GeoJSON in EPSG:4326')
    ap.add_argument('--out', required=True, type=Path, help='Output GeoTIFF path (EPSG:4326)')
    ap.add_argument('--qc', type=Path, default=None, help='Optional path to save QC overlay PNG')
    args = ap.parse_args()

    qc_path = args.qc or args.out.with_name('autogeoref_qc.png')
    info = run_autogeoref(args.image, args.ref, args.out, qc_path)
    payload = {'ok': True, **info}
    # Write sidecar JSON for downstream QA
    try:
        meta_path = args.out.with_name('autogeoref.json')
        with meta_path.open('w', encoding='utf-8') as f:
            json.dump(payload, f)
    except Exception:
        pass
    print(json.dumps(payload))


if __name__ == '__main__':
    main()
