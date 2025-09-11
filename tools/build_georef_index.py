#!/usr/bin/env python3
import urllib.parse, json
from pathlib import Path


def load_published():
    p = Path('data/published.json')
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return {}
    return {}


def find_targets(root: Path):
    rows = []
    for p in root.rglob('interim'):
        if not p.is_dir():
            continue
        # candidate images (prefer known names; else any .png)
        img = None
        preferred = ['service area cropped.png', 'expansion map.png', 'service area.png']
        for name in preferred:
            cand = p / name
            if cand.exists():
                img = cand
                break
        if img is None:
            pngs = sorted(x for x in p.glob('*.png'))
            if pngs:
                img = pngs[0]
        geotiff = p / 'georef.tif'
        meta_cfg = p.parent / 'meta' / 'config.yml'
        boundary = p.parent / 'processed' / 'boundary.geojson'
        date_dir = p.parent
        city_dir = date_dir.parent
        provider_dir = city_dir.parent
        city = city_dir.name
        provider = provider_dir.name
        service_yml = date_dir / 'meta' / 'service.yml'
        date = date_dir.name
        rows.append({
            'provider': provider,
            'city': city,
            'date': date,
            'image': img,
            'has_geotiff': geotiff.exists(),
            'has_boundary': boundary.exists(),
            'has_service_yml': service_yml.exists(),
            'geotiff': geotiff,
            'boundary': boundary,
            'meta_cfg': meta_cfg,
            'date_dir': date_dir,
        })
    # sort: missing geotiff first, then city/date
    rows.sort(key=lambda r: (r['has_geotiff'], r['provider'], r['city'], r['date']))
    return rows


def build_html(rows, server_url='http://127.0.0.1:5001'):
    pub = load_published()
    def link_open(image, city):
        q = urllib.parse.urlencode({'image': str(image), 'city': city})
        return f"{server_url}/open?{q}"

    out = []
    out.append('<!doctype html>\n<html><head><meta charset="utf-8"><title>Georeferencing Index</title>')
    out.append('<style>body{font-family:system-ui,-apple-system,sans-serif;margin:16px} table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:8px} th{background:#f5f5f5;text-align:left} .ok{color:#2e7d32;font-weight:600} .miss{color:#c62828;font-weight:600} a.btn{background:#0b74de;color:#fff;text-decoration:none;padding:4px 8px;border-radius:6px} .nowrap{white-space:nowrap} .pub{min-width:160px}</style>')
    out.append('</head><body>')
    out.append('<h2>Georeferencing Dashboard</h2>')
    out.append('<div style="margin:8px 0;">\n<button onclick="startServerForFirst()">Start Server</button>\n<span id="srvStatus" style="margin-left:8px;color:#555"></span>\n</div>')
    missing = sum(1 for r in rows if not r['has_geotiff'])
    out.append(f'<p>Pending georeference: <b>{missing}</b> of <b>{len(rows)}</b></p>')
    out.append('<table>')
    out.append('<tr><th>Company</th><th>City</th><th>Date</th><th>Image</th><th>GeoTIFF</th><th>Boundary</th><th>Service YAML</th><th>Published</th><th class="nowrap">Open GCP UI</th><th>Quick Start</th></tr>')
    for r in rows:
        img_rel = r['image']
        geotiff = r['geotiff']
        boundary = r['boundary']
        ui = link_open(r['image'], r['city'])
        out.append('<tr>')
        out.append(f'<td>{r["provider"]}</td>')
        out.append(f'<td>{r["city"]}</td>')
        out.append(f'<td>{r["date"]}</td>')
        out.append(f'<td>{("<code>"+str(img_rel)+"</code>" if img_rel else "<span class=miss>no image</span>")}</td>')
        out.append(f'<td>{("<span class=ok>yes</span>" if r["has_geotiff"] else "<span class=miss>no</span>")}</td>')
        out.append(f'<td>{("<span class=ok>yes</span>" if r["has_boundary"] else "<span class=miss>no</span>")}</td>')
        # service.yml controls
        date_enc = urllib.parse.quote(str(r['date_dir']))
        if r['has_service_yml']:
            out.append(f'<td><span class=ok>yes</span> <button onclick="editService(\'{date_enc}\')">View/Edit</button></td>')
        else:
            out.append(f'<td><button onclick="initService(\'{date_enc}\')">Create</button></td>')
        # publish controls (requires publisher service)
        keyenc = urllib.parse.quote(str(boundary))
        pub_state = (pub.get(str(boundary), False) if r['has_boundary'] else None)
        pub_html = '<span class=miss>n/a</span>' if pub_state is None else ('<span class=ok>yes</span>' if pub_state else '<span class=miss>no</span>')
        out.append(f'<td class="pub">{pub_html}<br>' + (f"<button onclick=\"togglePub('{keyenc}',1)\">Publish</button> <button onclick=\"togglePub('{keyenc}',0)\">Unpublish</button>" if r['has_boundary'] else '') + '</td>')
        # Open link uses dynamic port from status; store data attrs
        img_q = urllib.parse.quote(str(img_rel) if img_rel else '')
        city_q = urllib.parse.quote(r['city'])
        out.append(f'<td class="nowrap"><a class="btn disabled" href="#" data-image="{img_q}" data-city="{city_q}" id="open_{keyenc}">Open</a></td>')
        if img_rel:
            out.append(f'<td><button onclick="startFor(\'{img_q}\', \'{city_q}\')">Start+Open</button></td>')
        else:
            out.append('<td><span class="small">no image</span></td>')
        out.append('</tr>')
    out.append('</table>')
    out.append('<style>.disabled{pointer-events:none; opacity:.5} .toast{position:fixed;right:16px;bottom:16px;background:#333;color:#fff;padding:8px 10px;border-radius:6px;opacity:.95;z-index:9999}</style>')
    out.append('<p style="margin-top:12px">Use the Start Server button to launch the GCP UI via the local publisher service. Publishing toggles also require the publisher service.</p>')
    out.append("<script>\nfunction toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.remove();},2500);}\nasync function refreshStatus(){try{const s=await (await fetch('http://127.0.0.1:5050/gcp/status')).json(); document.getElementById('srvStatus').textContent = s.running? ('Server running on '+s.port): 'Server not running'; const links=[...document.querySelectorAll('a[id^=open_]')]; links.forEach(a=>{if(s.running){a.classList.remove('disabled');} else {a.classList.add('disabled');}});}catch(e){ document.getElementById('srvStatus').textContent='Publisher not running'; const links=[...document.querySelectorAll('a[id^=open_]')]; links.forEach(a=>a.classList.add('disabled')); }}\nasync function startServerForFirst(){try{const btn=document.querySelector('a[id^=open_]'); if(!btn){toast('No rows'); return;} const url=new URL(btn.href); const image=url.searchParams.get('image'); const city=url.searchParams.get('city')||''; toast('Starting server...'); const r=await fetch('http://127.0.0.1:5050/gcp/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,city})}); const j=await r.json().catch(()=>({})); if(r.ok){for(let i=0;i<12;i++){await new Promise(res=>setTimeout(res,500)); const s=await (await fetch('http://127.0.0.1:5050/gcp/status')).json(); if(s.running){toast('Server running'); refreshStatus(); return;}} toast('Server start timed out');} else {toast('Failed to start'+(j.error?' — '+j.error:'')); if(j.log){console.log('GCP log tail:', j.log);}}}catch(e){toast('Publisher not running')}}\nasync function startFor(uienc){try{const url=new URL(decodeURIComponent(uienc)); const image=url.searchParams.get('image'); const city=url.searchParams.get('city')||''; toast('Starting server...'); const r=await fetch('http://127.0.0.1:5050/gcp/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,city})}); const j=await r.json().catch(()=>({})); if(r.ok){for(let i=0;i<12;i++){await new Promise(res=>setTimeout(res,500)); const s=await (await fetch('http://127.0.0.1:5050/gcp/status')).json(); if(s.running){window.location.href = decodeURIComponent(uienc); return;}} toast('Server start timed out');} else {toast('Failed to start'+(j.error?' — '+j.error:'')); if(j.log){console.log('GCP log tail:', j.log);}}}catch(e){toast('Publisher not running')}}\nasync function togglePub(keyEnc,val){try{toast(val?'Publishing...':'Unpublishing...'); await fetch('http://127.0.0.1:5050/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:decodeURIComponent(keyEnc),value:!!val})}); await fetch('http://127.0.0.1:5050/rebuild',{method:'POST'}); toast('Updated'); location.reload();}catch(e){toast('Publisher not running')}}\nasync function initService(dateEnc){try{toast('Creating service.yml...'); const r=await fetch('http://127.0.0.1:5050/service/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date_dir:decodeURIComponent(dateEnc)})}); if(!r.ok){toast('Create failed');return;} toast('Created'); location.reload();}catch(e){toast('Publisher not running')}}\nasync function editService(dateEnc){try{const r=await fetch('http://127.0.0.1:5050/service/open',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date_dir:decodeURIComponent(dateEnc)})}); if(!r.ok){toast('Open failed'); return;} const j=await r.json(); if(j.opened){toast('Opened in VS Code');} else {toast('Path: '+j.path);} }catch(e){toast('Publisher not running')}}\nrefreshStatus(); setInterval(refreshStatus, 3000);\n</script>")
    out.append('</body></html>')
    return '\n'.join(out)


def main():
    providers = Path('Providers')
    rows = find_targets(providers)
    html = build_html(rows)
    out_path = Path('georef_index.html')
    out_path.write_text(html, encoding='utf-8')
    print(f"Wrote {out_path} with {len(rows)} rows")


if __name__ == '__main__':
    main()
