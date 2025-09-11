#!/usr/bin/env python3
import json
from pathlib import Path
from flask import Flask, request, jsonify
import os
from subprocess import Popen
import subprocess
import sys
import textwrap

# For dynamic dashboard rendering with robust fallback import
import importlib.util
def _load_georef_index():
    try:
        import tools.build_georef_index as georef_index  # type: ignore
        return georef_index
    except Exception:
        # Fallback: load by file path relative to repo root
        try:
            repo_root = Path(__file__).resolve().parent.parent
            mod_path = repo_root / 'tools' / 'build_georef_index.py'
            if mod_path.exists():
                spec = importlib.util.spec_from_file_location('build_georef_index_fallback', str(mod_path))
                if spec and spec.loader:
                    mod = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
                    return mod
        except Exception:
            pass
    return None
georef_index = _load_georef_index()

app = Flask(__name__)
STORE = Path('data/published.json')
STORE.parent.mkdir(parents=True, exist_ok=True)
# Global state for GCP UI process
GCP_PROC: Popen | None = None
GCP_PORT = 5001
GCP_LOG = Path('/tmp/gcp_webui.log')


def load_store():
    if STORE.exists():
        try:
            return json.loads(STORE.read_text())
        except Exception:
            return {}
    return {}


def save_store(obj):
    STORE.write_text(json.dumps(obj, indent=2))


@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp


@app.route('/status')
def status():
    return jsonify(load_store())


@app.route('/toggle', methods=['POST'])
def toggle():
    data = request.get_json(force=True)
    key = data.get('key')
    val = bool(data.get('value'))
    if not key:
        return jsonify({'ok': False, 'error': 'missing key'}), 400
    store = load_store()
    store[key] = val
    save_store(store)
    return jsonify({'ok': True, 'key': key, 'value': val})


@app.route('/rebuild', methods=['POST'])
def rebuild():
    # Rebuild map dataset after toggles
    try:
        subprocess.run([sys.executable, 'tools/build_map_site.py'], check=True)
        return jsonify({'ok': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/gcp/status')
def gcp_status():
    global GCP_PROC
    alive = (GCP_PROC is not None and (GCP_PROC.poll() is None))
    # Try a quick socket connect to confirm listener
    connected = False
    if alive:
        import socket
        try:
            with socket.create_connection(("127.0.0.1", int(GCP_PORT)), timeout=0.2):
                connected = True
        except Exception:
            connected = False
    return jsonify({'ok': True, 'running': bool(alive and connected), 'port': GCP_PORT, 'pid': (GCP_PROC.pid if GCP_PROC else None)})


@app.route('/gcp/start', methods=['POST'])
def gcp_start():
    """Start the GCP web UI pointing to a given image and city.
    Body: {image: str, city: str, port?: int}
    """
    global GCP_PROC, GCP_PORT
    data = request.get_json(force=True)
    image = data.get('image')
    city = data.get('city', '')
    port = int(data.get('port', GCP_PORT))
    if not image:
        return jsonify({'ok': False, 'error': 'missing image'}), 400
    img_path = Path(image)
    if not img_path.exists():
        return jsonify({'ok': False, 'error': f'image not found: {img_path}'}), 404
    # If already running, stop and restart
    if GCP_PROC is not None and (GCP_PROC.poll() is None):
        try:
            GCP_PROC.terminate()
        except Exception:
            pass
    # Choose python: prefer repo venv if present
    repo_root = Path(__file__).resolve().parent.parent
    venv_python = repo_root / 'env' / 'bin' / 'python'
    python_exe = str(venv_python if venv_python.exists() else Path(sys.executable))
    app_path = repo_root / 'tools' / 'gcp_webui' / 'app.py'
    # Pick a free port if requested port is busy
    def _port_free(p:int)->bool:
        import socket
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('127.0.0.1', p))
                return True
        except Exception:
            return False
    chosen = port
    if not _port_free(port):
        for cand in range(5001, 5011):
            if _port_free(cand):
                chosen = cand
                break
    GCP_PORT = chosen
    # rotate log
    try:
        if GCP_LOG.exists() and GCP_LOG.stat().st_size > 2_000_000:
            GCP_LOG.unlink(missing_ok=True)
    except Exception:
        pass
    log_fp = open(GCP_LOG, 'a', buffering=1)
    cmd = [python_exe, str(app_path), '--image', str(img_path), '--city', city, '--host', '127.0.0.1', '--port', str(GCP_PORT), '--auto-vectorize']
    GCP_PROC = Popen(cmd, stdout=log_fp, stderr=log_fp, cwd=str(repo_root))
    # Briefly wait to detect immediate failures
    import time
    time.sleep(0.5)
    if GCP_PROC.poll() is not None:
        # crashed quickly; report tail of log
        try:
            tail = GCP_LOG.read_text().splitlines()[-20:]
        except Exception:
            tail = []
        return jsonify({'ok': False, 'error': 'GCP UI failed to start', 'log': tail}), 500
    return jsonify({'ok': True, 'port': GCP_PORT, 'pid': GCP_PROC.pid, 'log': str(GCP_LOG)})


@app.route('/gcp/stop', methods=['POST'])
def gcp_stop():
    global GCP_PROC
    if GCP_PROC is not None and (GCP_PROC.poll() is None):
        try:
            GCP_PROC.terminate()
        except Exception:
            pass
    GCP_PROC = None
    return jsonify({'ok': True})


@app.route('/service/init', methods=['POST'])
def service_init():
    data = request.get_json(force=True)
    date_dir = Path(data.get('date_dir',''))
    if not date_dir.exists():
        return jsonify({'ok': False, 'error': 'date_dir not found'}), 404
    meta = date_dir / 'meta'
    meta.mkdir(parents=True, exist_ok=True)
    svc = meta / 'service.yml'
    if not svc.exists():
        provider = date_dir.parent.parent.name
        city = date_dir.parent.name
        tmpl = textwrap.dedent(f'''\
        service_name: {provider} {city}
        provider: {provider}
        city: {city}
        start_date: {date_dir.name}
        booking:
          channel: 
          url: 
        safety: driverless  # driverless | safety_driver | attendant
        ridership:
          period: 
          trips: 
          source_url: 
        notes: 
        links:
          - title: 
            url: 
        ''').strip() + '\n'
        svc.write_text(tmpl, encoding='utf-8')
    return jsonify({'ok': True, 'path': str(svc)})


@app.route('/service/open', methods=['POST'])
def service_open():
    data = request.get_json(force=True)
    date_dir = Path(data.get('date_dir',''))
    if not date_dir.exists():
        return jsonify({'ok': False, 'error': 'date_dir not found'}), 404
    svc = date_dir / 'meta' / 'service.yml'
    if not svc.exists():
        alt = date_dir / 'meta' / 'service.yaml'
        if alt.exists():
            svc = alt
        else:
            return jsonify({'ok': False, 'error': 'service.yml not found'}), 404
    # Try to open in VS Code via 'code' CLI
    try:
        subprocess.Popen(['code', str(svc)])
        return jsonify({'ok': True, 'opened': True, 'path': str(svc)})
    except Exception as e:
        # Fallback: return path so user can open manually
        return jsonify({'ok': True, 'opened': False, 'path': str(svc), 'hint': 'Install VS Code "code" CLI to open directly', 'error': str(e)})


@app.route('/service/get', methods=['POST'])
def service_get():
    data = request.get_json(force=True)
    date_dir = Path(data.get('date_dir',''))
    if not date_dir.exists():
        return jsonify({'ok': False, 'error': 'date_dir not found'}), 404
    svc = date_dir / 'meta' / 'service.yml'
    if not svc.exists():
        alt = date_dir / 'meta' / 'service.yaml'
        if alt.exists():
            svc = alt
        else:
            return jsonify({'ok': False, 'error': 'service.yml not found'}), 404
    text = svc.read_text(encoding='utf-8')
    return jsonify({'ok': True, 'path': str(svc), 'content': text})


@app.route('/service/save', methods=['POST'])
def service_save():
    data = request.get_json(force=True)
    date_dir = Path(data.get('date_dir',''))
    content = data.get('content','')
    if not date_dir.exists():
        return jsonify({'ok': False, 'error': 'date_dir not found'}), 404
    svc = date_dir / 'meta' / 'service.yml'
    svc.parent.mkdir(parents=True, exist_ok=True)
    svc.write_text(content, encoding='utf-8')
    return jsonify({'ok': True, 'path': str(svc)})


@app.route('/config/init', methods=['POST'])
def config_init():
    data = request.get_json(force=True)
    date_dir = Path(data.get('date_dir',''))
    if not date_dir.exists():
        return jsonify({'ok': False, 'error': 'date_dir not found'}), 404
    meta = date_dir / 'meta'
    meta.mkdir(parents=True, exist_ok=True)
    cfg = meta / 'config.yml'
    if not cfg.exists():
        cfg.write_text("""paths:
  image_georef: "../interim/georef.tif"
  out_geojson: "../processed/boundary.geojson"
extract:
  hsv_lower: [90, 50, 50]
  hsv_upper: [130, 255, 255]
  close_kernel: 9
  simplify_ratio: 0.0005
  min_ring_length: 20
post:
  smooth_radius_m: 70
  simplify_tolerance_m: 10
  include_holes: false
  min_hole_area_sqkm: 0.25
  max_perimeters: 1
  shave_radius_m: 40
  buffer_round_m: 30
""", encoding='utf-8')
    return jsonify({'ok': True, 'path': str(cfg)})


@app.route('/config/open', methods=['POST'])
def config_open():
    data = request.get_json(force=True)
    date_dir = Path(data.get('date_dir',''))
    if not date_dir.exists():
        return jsonify({'ok': False, 'error': 'date_dir not found'}), 404
    cfg = date_dir / 'meta' / 'config.yml'
    if not cfg.exists():
        return jsonify({'ok': False, 'error': 'config.yml not found'}), 404
    try:
        subprocess.Popen(['code', str(cfg)])
        return jsonify({'ok': True, 'opened': True, 'path': str(cfg)})
    except Exception as e:
        return jsonify({'ok': True, 'opened': False, 'path': str(cfg), 'hint': 'Install VS Code "code" CLI to open directly', 'error': str(e)})

@app.route('/deployment/create', methods=['POST'])
def deployment_create():
    """Create a new deployment folder structure.
    Body: { provider: str, city: str, month: int(1-12), year: int }
    Creates Providers/<provider>/<city>/<Month YYYY>/{interim,meta,processed} and a starter meta/service.yml
    """
    data = request.get_json(force=True)
    provider = (data.get('provider') or '').strip()
    city = (data.get('city') or '').strip()
    month = int(data.get('month') or 0)
    year = int(data.get('year') or 0)
    if not provider or not city or not (1 <= month <= 12) or year <= 0:
        return jsonify({'ok': False, 'error': 'invalid parameters'}), 400
    import calendar
    month_name = calendar.month_name[month]
    date_name = f"{month_name} {year}"
    base = Path('Providers') / provider / city / date_name
    (base / 'interim').mkdir(parents=True, exist_ok=True)
    (base / 'processed').mkdir(parents=True, exist_ok=True)
    meta = base / 'meta'
    meta.mkdir(parents=True, exist_ok=True)
    svc = meta / 'service.yml'
    if not svc.exists():
        tmpl = f"""service_name: {provider} {city}
provider: {provider}
city: {city}
start_date: {date_name}
booking:
  channel: 
  url: 
safety: driverless  # driverless | safety_driver | attendant
ridership:
  period: 
  trips: 
  source_url: 
notes: 
links:
  - title: 
    url: 
"""
        svc.write_text(tmpl, encoding='utf-8')
    cfg = meta / 'config.yml'
    if not cfg.exists():
        cfg.write_text("""paths:
  image_georef: "../interim/georef.tif"
  out_geojson: "../processed/boundary.geojson"
extract:
  hsv_lower: [90, 50, 50]
  hsv_upper: [130, 255, 255]
  close_kernel: 9
  simplify_ratio: 0.0005
  min_ring_length: 20
post:
  smooth_radius_m: 70
  simplify_tolerance_m: 10
  include_holes: false
  min_hole_area_sqkm: 0.25
  max_perimeters: 1
  shave_radius_m: 40
  buffer_round_m: 30
""", encoding='utf-8')
    return jsonify({'ok': True, 'path': str(base)})


@app.route('/dashboard')
def dashboard():
    # Serve the dashboard over localhost without needing a separate static server
    try:
        if georef_index is None:
            return 'Dashboard module not available. Ensure you run: python tools/publisher.py from the repo root.', 500
        rows = georef_index.find_targets(Path('Providers'))
        html = georef_index.build_html(rows)
        return html
    except Exception as e:
        return f'Error building dashboard: {e}', 500


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--port', type=int, default=5050)
    args = ap.parse_args()
    print(f"[publisher] store: {STORE.resolve()}")
    print(f"[publisher] http://{args.host}:{args.port}/status")
    app.run(host=args.host, port=args.port)


if __name__ == '__main__':
    main()
