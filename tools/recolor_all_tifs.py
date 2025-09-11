#!/usr/bin/env python3
import sys
from pathlib import Path
import numpy as np
import rasterio
import cv2


def recolor_tif(src_path: Path, dst_path: Path, v_threshold: int = 10):
    with rasterio.open(src_path) as ds:
        arr = ds.read()  # (bands, h, w)
        if arr.shape[0] < 3:
            raise RuntimeError(f"{src_path} has {arr.shape[0]} band(s); need at least 3 for RGB")
        r, g, b = arr[0], arr[1], arr[2]
        img = np.dstack([r, g, b]).astype(np.uint8)
        hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
        v = hsv[:, :, 2]
        mask = v > v_threshold  # non-black
        recolored = np.zeros_like(img)
        # Set non-black to pure blue (RGB)
        recolored[mask] = (0, 0, 255)
        # Write 3-band RGB GeoTIFF with original georeferencing
        meta = ds.meta.copy()
        meta.update({"count": 3, "dtype": recolored.dtype})
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        with rasterio.open(dst_path, "w", **meta) as out:
            out.write(recolored[:, :, 0], 1)
            out.write(recolored[:, :, 1], 2)
            out.write(recolored[:, :, 2], 3)


def main():
    root = Path("Providers")
    total = 0
    for tif in root.rglob("georef.tif"):
        dst = tif.parent / "georef_recolor.tif"
        try:
            recolor_tif(tif, dst)
            print(f"[recolor] {tif} -> {dst}")
            total += 1
        except Exception as e:
            print(f"[skip] {tif}: {e}")
    print(f"Done. Recolored {total} TIFF(s)")


if __name__ == "__main__":
    main()

