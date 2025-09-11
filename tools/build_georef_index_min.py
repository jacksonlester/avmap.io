#!/usr/bin/env python3
from pathlib import Path
import urllib.parse


def find_rows(root: Path):
    rows = []
    for p in root.rglob('interim'):
        if not p.is_dir():
            continue
        img = None
        for name in ['service area cropped.png', 'expansion map.png', 'service area.png']:
            cand = p / name
            if cand.exists():
                img = cand
                break
        if img is None:
            pngs = sorted(p.glob('*.png'))
            if pngs:
                img = pngs[0]
        date_dir = p.parent
        city = date_dir.parent.name
        provider = date_dir.parent.parent.name
        has_tif = (date_dir / 'interim' / 'georef.tif').exists() or (date_dir / 'interim' / 'georef_recolor.tif').exists()
        has_boundary = (date_dir / 'processed' / 'boundary.geojson').exists()
        has_service = (date_dir / 'meta' / 'service.yml').exists()
        rows.append({
            'provider': provider,
            'city': city,
            'date': date_dir.name,
            'image': img,
            'has_tif': has_tif,
            'has_boundary': has_boundary,
            'has_service': has_service,
            'date_dir': date_dir,
        })
    rows.sort(key=lambda r: (r['provider'], r['city'], r['date']))
    return rows


def build_html(rows):
    H = []
    H.append('<!doctype html>\n<html><head><meta charset="utf-8"><title>Georeferencing Dashboard</title>')
    H.append('<style>body{font-family:system-ui,-apple-system,sans-serif;margin:16px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px} th{background:#f5f5f5;text-align:left} .ok{color:#2e7d32;font-weight:600} .miss{color:#c62828;font-weight:600} a.btn{background:#0b74de;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px}</style>')
    H.append('</head><body>')
    H.append('<h2>Georeferencing Dashboard</h2>')
    H.append('<table>')
    H.append('<tr><th>Company</th><th>City</th><th>Date</th><th>Image</th><th>GeoTIFF</th><th>Boundary</th></tr>')
    for r in rows:
        date_enc = urllib.parse.quote(str(r['date_dir']))
        img = f"<code>{r['image']}</code>" if r['image'] else '<span class=miss>no image</span>'
        H.append('<tr>')
        H.append(f"<td>{r['provider']}</td>")
        H.append(f"<td>{r['city']}</td>")
        H.append(f"<td>{r['date']}</td>")
        H.append(f"<td>{img}</td>")
        H.append(f"<td>{('<span class=ok>yes</span>' if r['has_tif'] else '<span class=miss>no</span>')}</td>")
        H.append(f"<td>{('<span class=ok>yes</span>' if r['has_boundary'] else '<span class=miss>no</span>')}</td>")
        H.append('</tr>')
    H.append('</table>')
    # No client-side actions; pure static dashboard
    H.append('</body></html>')
    return '\n'.join(H)


def main():
    rows = find_rows(Path('Providers'))
    html = build_html(rows)
    out = Path('georef_index.html')
    out.write_text(html, encoding='utf-8')
    print(f"Wrote {out} with {len(rows)} rows")


if __name__ == '__main__':
    main()
