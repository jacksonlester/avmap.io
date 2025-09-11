#!/usr/bin/env python3
import json
from datetime import datetime
from pathlib import Path

PUBLISHED_PATH = Path('data/published.json')
WEB_DIR = Path('web')


def parse_date(name: str):
    try:
        return datetime.strptime(name, '%B %Y')
    except ValueError:
        for fmt in ('%Y-%m', '%m %Y', '%b %Y'):
            try:
                return datetime.strptime(name, fmt)
            except ValueError:
                pass
    return None


def load_published():
    if PUBLISHED_PATH.exists():
        try:
            return json.loads(PUBLISHED_PATH.read_text())
        except Exception:
            return {}
    return {}


def scan_service_areas():
    published = load_published()
    rows = []
    providers_root = Path('Providers')
    for prov in sorted(p for p in providers_root.iterdir() if p.is_dir()):
        for city in sorted(p for p in prov.iterdir() if p.is_dir()):
            for date_dir in sorted((p for p in city.iterdir() if p.is_dir()), key=lambda p: (parse_date(p.name) or datetime.min)):
                processed = date_dir / 'processed' / 'boundary.geojson'
                if processed.exists():
                    try:
                        gj = json.loads(processed.read_text())
                    except Exception:
                        continue
                    d = parse_date(date_dir.name)
                    key = str(processed)
                    rows.append({
                        'provider': prov.name,
                        'city': city.name,
                        'date': (d.strftime('%Y-%m-%d') if d else date_dir.name),
                        'key': key,
                        'published': bool(published.get(key, False)),
                        'feature': gj,
                    })
    return rows


def build_dataset(rows):
    groups = {}
    for r in rows:
        k = (r['provider'], r['city'])
        groups.setdefault(k, []).append(r)
    dataset = []
    for (provider, city), items in groups.items():
        items.sort(key=lambda r: r['date'])
        dataset.append({
            'provider': provider,
            'city': city,
            'entries': [{'date': r['date'], 'key': r['key'], 'published': r['published'], 'feature': r['feature']} for r in items]
        })
    return {'generated_at': datetime.utcnow().isoformat() + 'Z', 'groups': dataset}


def write_web(dataset):
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    (WEB_DIR / 'data').mkdir(exist_ok=True)
    (WEB_DIR / 'data' / 'service_areas.json').write_text(json.dumps(dataset), encoding='utf-8')
    (WEB_DIR / 'index.html').write_text(MAP_HTML, encoding='utf-8')
    (WEB_DIR / 'about.html').write_text('<!doctype html><meta charset="utf-8"><title>About</title><p>About this project.</p>', encoding='utf-8')
    (WEB_DIR / 'companies.html').write_text('<!doctype html><meta charset="utf-8"><title>Companies</title><p>Companies coming soon.</p>', encoding='utf-8')
    (WEB_DIR / 'cities.html').write_text('<!doctype html><meta charset="utf-8"><title>Cities</title><p>Cities coming soon.</p>', encoding='utf-8')
    (WEB_DIR / 'news.html').write_text('<!doctype html><meta charset="utf-8"><title>AV News</title><p>News feed coming soon.</p>', encoding='utf-8')


MAP_HTML = r"""<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Robotaxi Service Areas</title>
  <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\" />
  <script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>
  <script src=\"https://unpkg.com/@turf/turf@6.5.0/turf.min.js\"></script>
  <style>
    :root { --text:#233041; --muted:#50667a; }
    body { margin:0; background:#f6fafc; color:var(--text); font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    header { background:#ffffff; color:var(--text); padding:10px 14px; display:flex; align-items:center; gap:16px; border-bottom:1px solid #e6eef3; position:sticky; top:0; z-index:10; }
    header a { color:var(--text); text-decoration:none; font-weight:600; padding:6px 8px; border-radius:6px; }
    header a.active { background:#e6eef3; }
    #wrap { display:grid; grid-template-columns: 260px 1fr 320px; height: calc(100vh - 52px); }
    #filters, #stats { background:#ffffff; padding:10px; overflow:auto; border-right:1px solid #e6eef3; }
    #map { height: 100%; }
    h3 { margin: 8px 0; font-size: 14px; text-transform: uppercase; color: var(--muted); }
    .chip { display:inline-flex; align-items:center; gap:6px; padding:3px 8px; border-radius:12px; background:#e6eef3; margin:2px; cursor:pointer; }
    .chip input { margin:0; }
    .small { color:var(--muted); font-size:12px; }
    table { width:100%; border-collapse: collapse; }
    td { border-bottom: 1px solid #e6eef3; padding:4px 2px; }
    /* Bottom slider */
    #timebar { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); background:#ffffff; border:1px solid #e6eef3; border-radius: 10px; padding: 8px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display:flex; align-items:center; gap:10px; z-index: 20; }
    #timebar input[type=range]{ width: 360px; }
    #dateNow { font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <strong>Robotaxi.ai</strong>
    <a href=\"index.html\" class=\"active\">Map</a>
    <a href=\"companies.html\">Companies</a>
    <a href=\"cities.html\">Cities</a>
    <a href=\"news.html\">AV News</a>
    <span style=\"margin-left:auto\"></span>
    <label class=\"chip\"><input type=\"checkbox\" id=\"darkToggle\"/> Dark</label>
    <select id=\"basemapSel\" class=\"chip\">
      <option value=\"osm\">OSM Standard</option>
      <option value=\"dark\">Dark Matter</option>
    </select>
    <a href=\"about.html\">About</a>
  </header>
  <div id=\"wrap\">
    <aside id=\"filters\">
      <h3>Companies</h3>
      <div id=\"companyChips\"></div>
      <h3 style=\"margin-top:10px\">Cities</h3>
      <div id=\"cityChips\"></div>
    </aside>
    <main id=\"map\"></main>
    <aside id=\"stats\">
      <h3>By the Numbers</h3>
      <div id=\"statsTable\"></div>
    </aside>
  </div>
  <div id=\"timebar\">
    <span id=\"minLabel\" class=\"small\"></span>
    <input id=\"dateSlider\" type=\"range\" min=\"0\" max=\"1\" step=\"1\" />
    <span class=\"small\">Latest</span>
    <span id=\"dateNow\" class=\"small\"></span>
  </div>
  <script>
  const map = L.map('map', {zoomControl:true});
  // Default view to include SF, LA, Las Vegas
  const viewBounds = L.latLngBounds([[33.5,-123.5],[38.5,-115.0]]);
  map.fitBounds(viewBounds.pad(0.3));
  let baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 17, attribution: '&copy; OpenStreetMap'}).addTo(map);
  const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO'});

  document.getElementById('basemapSel').addEventListener('change', (e)=>{
    map.removeLayer(baseLayer);
    baseLayer = (e.target.value === 'dark') ? darkLayer.addTo(map) : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 17, attribution: '&copy; OpenStreetMap'}).addTo(map);
  });
  document.getElementById('darkToggle').addEventListener('change', (e)=>{
    document.body.style.background = e.target.checked ? '#0b1117' : '#f6fafc';
    // Switch basemap to dark when toggled
    const sel = document.getElementById('basemapSel');
    if (e.target.checked) { sel.value='dark'; sel.dispatchEvent(new Event('change')); }
    else { sel.value='osm'; sel.dispatchEvent(new Event('change')); }
  });

  const COLORS = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'];
  let dataset = null;
  let companyFilter = new Set();
  let cityFilter = new Set();
  const layers = new Map();
  let months = [];

  async function loadData(){
    const res = await fetch('data/service_areas.json');
    dataset = await res.json();
    buildFilters();
    // Build month domain from earliest published to latest
    let minD=null, maxD=null;
    dataset.groups.forEach(g=>g.entries.forEach(e=>{ if(e.published){ const d=new Date(e.date); if(!minD||d<minD) minD=d; if(!maxD||d>maxD) maxD=d; }}));
    if (!minD) { const now=new Date(); minD=now; maxD=now; }
    months=[]; let cur=new Date(minD.getFullYear(),minD.getMonth(),1); const end=new Date(maxD.getFullYear(),maxD.getMonth(),1);
    while(cur<=end){ months.push(new Date(cur)); cur.setMonth(cur.getMonth()+1); }
    const slider = document.getElementById('dateSlider');
    slider.min='0'; slider.max=String(months.length); slider.value=slider.max;
    document.getElementById('minLabel').textContent = months[0].toLocaleString(undefined,{month:'short',year:'numeric'});
    slider.addEventListener('input', updateMap);
    updateMap();
  }

  function buildFilters(){
    const chips = document.getElementById('companyChips');
    const providers = [...new Set(dataset.groups.map(g=>g.provider))];
    providers.forEach((p,i)=>{
      const id = 'prov_'+i;
      const div = document.createElement('label'); div.className='chip';
      div.innerHTML = `<input type=\"checkbox\" id=\"${id}\" checked /> <span style=\"width:10px;height:10px;border-radius:5px;background:${COLORS[i%COLORS.length]}\"></span> ${p}`;
      chips.appendChild(div);
      document.getElementById(id).addEventListener('change', (e)=>{ if(e.target.checked) companyFilter.delete(p); else companyFilter.add(p); updateMap(); });
    });
    const cityChips = document.getElementById('cityChips');
    const cities = [...new Set(dataset.groups.map(g=>g.city))].sort();
    cities.forEach((c,i)=>{
      const id = 'city_'+i; const div=document.createElement('label'); div.className='chip';
      div.innerHTML = `<input type=\"checkbox\" id=\"${id}\" checked /> ${c}`;
      cityChips.appendChild(div);
      document.getElementById(id).addEventListener('change',(e)=>{ if(e.target.checked) cityFilter.delete(c); else cityFilter.add(c); updateMap(); });
    });
  }

  function chooseForMonth(entries, target){
    let pick=null; for(const e of entries){ const d=new Date(e.date); if(d<=target) pick=e; else break; } return pick && e.published ? pick : null;
  }

  function updateStats(summary){
    const el = document.getElementById('statsTable');
    const rows = Object.entries(summary).sort((a,b)=> b[1]-a[1]);
    el.innerHTML = '<table>'+ rows.map(([p,km2])=>`<tr><td>${p}</td><td style=\"text-align:right\">${km2.toLocaleString(undefined,{maximumFractionDigits:0})} km²</td></tr>`).join('') + '</table>';
  }

  function updateMap(){
    const slider = document.getElementById('dateSlider');
    const idx = parseInt(slider.value);
    const target = (idx>=months.length)? months[months.length-1] : months[idx];
    document.getElementById('dateNow').textContent = target.toLocaleString(undefined,{month:'short',year:'numeric'});
    layers.forEach(l=> map.removeLayer(l)); layers.clear();
    const summary = {};
    dataset.groups.forEach((g,gi)=>{
      if (companyFilter.has(g.provider)) return;
      if (cityFilter.has(g.city)) return;
      const pick = chooseForMonth(g.entries, target);
      if (!pick) return;
      const col = COLORS[gi % COLORS.length];
      const layer = L.geoJSON(pick.feature, {style:{color:col,weight:2,fillOpacity:0.25,fillColor:col}}).addTo(map);
      layers.set(g.provider+g.city, layer);
      let area=0; try{ area = turf.area(pick.feature)/1e6; }catch(e){}
      summary[g.provider]=(summary[g.provider]||0)+area;
    });
    updateStats(summary);
  }

  loadData();
  </script>
</body>
</html>
"""


def main():
    rows = scan_service_areas()
    dataset = build_dataset(rows)
    write_web(dataset)
    print(f"Built web site with {sum(len(g['entries']) for g in dataset['groups'])} entries")


if __name__ == '__main__':
    main()
