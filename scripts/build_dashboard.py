"""
Dashboard data builder
======================
Turns the latest unified prediction + PREDICTION_LOG.md into the small JSON
files the static dashboard reads.

    python scripts/build_dashboard.py
    python scripts/build_dashboard.py --output engine/output --data dashboard/data --log engine/PREDICTION_LOG.md

Writes:
    <data>/latest.json   - most recent unified prediction (verbatim)
    <data>/history.json  - compact time series, appended each run
    <data>/log.json      - parsed prediction log + totals
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / 'output'
DATA_DIR = ROOT / 'dashboard' / 'data'
LOG_PATH = ROOT / 'PREDICTION_LOG.md'

MAX_HISTORY_POINTS = 2000


def latest_prediction_file() -> Path | None:
    files = sorted(OUTPUT_DIR.glob('unified_prediction_*.json'))
    return files[-1] if files else None


def history_point(pred: dict) -> dict:
    def get(*keys, default=None):
        node = pred
        for k in keys:
            if not isinstance(node, dict) or k not in node:
                return default
            node = node[k]
        return node

    return {
        't': pred.get('timestamp'),
        'sigma_log': get('sigma_log', 'sigma_log'),
        'expected_m': get('prediction', 'expected_m'),
        'x_prob': get('prediction', 'x_probability'),
        'xray_flux': get('xray', 'flux'),
        'hardness': get('hardness', 'ratio'),
        'kp': get('geo_nowcast', 'kp_estimate'),
        'sw_speed': get('solar_wind', 'speed'),
        'bz': get('imf', 'bz'),
    }


def build_history(existing: list[dict]) -> list[dict]:
    by_time = {p['t']: p for p in existing if p.get('t')}
    for f in sorted(OUTPUT_DIR.glob('unified_prediction_*.json')):
        try:
            pred = json.loads(f.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            continue
        point = history_point(pred)
        if point['t']:
            by_time[point['t']] = point
    points = sorted(by_time.values(), key=lambda p: p['t'])
    return points[-MAX_HISTORY_POINTS:]


HEADING_RE = re.compile(r'^## Prediction #(\w+)\s*(?:\((.*?)\))?\s*$')
FIELD_RE = re.compile(r'^\*\*(Date Issued|Target Period|Status):\*\*\s*(.+?)\s*$')
TOTAL_RE = re.compile(r'\*\*Total\*\*.*?\*\*(\d+)/(\d+)')


def normalize_status(raw: str) -> str:
    s = raw.upper()
    for key in ('CORRECT', 'INCORRECT', 'WITHDRAWN', 'PENDING', 'IN PROGRESS'):
        if key in s:
            # "INCORRECT" contains "CORRECT"; check longer key first
            return 'INCORRECT' if 'INCORRECT' in s else key
    return raw.strip()


def parse_log() -> dict:
    entries: list[dict] = []
    current: dict | None = None
    for line in LOG_PATH.read_text(encoding='utf-8').splitlines():
        m = HEADING_RE.match(line)
        if m:
            if m.group(1).upper() == 'XXX':  # template entry at end of file
                current = None
                continue
            current = {'id': m.group(1), 'title': m.group(2) or '', 'status': 'PENDING',
                       'issued': '', 'target': '', 'score': None, 'max': None}
            entries.append(current)
            continue
        if current is None:
            continue
        m = FIELD_RE.match(line)
        if m:
            field, value = m.groups()
            if field == 'Date Issued':
                current['issued'] = value
            elif field == 'Target Period':
                current['target'] = value
            else:
                current['status'] = normalize_status(value)
            continue
        m = TOTAL_RE.search(line)
        if m and current['score'] is None:
            current['score'], current['max'] = int(m.group(1)), int(m.group(2))

    scored = [e for e in entries if e['score'] is not None]
    totals = {
        'predictions': len(entries),
        'correct': sum(e['status'] == 'CORRECT' for e in entries),
        'incorrect': sum(e['status'] == 'INCORRECT' for e in entries),
        'withdrawn': sum(e['status'] == 'WITHDRAWN' for e in entries),
        'pending': sum(e['status'] in ('PENDING', 'IN PROGRESS') for e in entries),
        'points': sum(e['score'] for e in scored),
        'points_max': sum(e['max'] for e in scored),
    }
    totals['accuracy_pct'] = round(100 * totals['points'] / totals['points_max'], 1) if totals['points_max'] else None
    return {'totals': totals, 'entries': entries[::-1]}


def main() -> None:
    global OUTPUT_DIR, DATA_DIR, LOG_PATH
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--output', type=Path, default=OUTPUT_DIR, help='dir containing unified_prediction_*.json')
    ap.add_argument('--data', type=Path, default=DATA_DIR, help='dashboard data dir to write')
    ap.add_argument('--log', type=Path, default=LOG_PATH, help='PREDICTION_LOG.md path')
    args = ap.parse_args()
    OUTPUT_DIR, DATA_DIR, LOG_PATH = args.output, args.data, args.log

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    latest = latest_prediction_file()
    if latest:
        (DATA_DIR / 'latest.json').write_text(latest.read_text(encoding='utf-8'), encoding='utf-8')
        print(f'latest.json  <- {latest.name}')
    else:
        print('latest.json  (no unified_prediction_*.json found, left unchanged)')

    history_path = DATA_DIR / 'history.json'
    existing = json.loads(history_path.read_text(encoding='utf-8')) if history_path.exists() else []
    history = build_history(existing)
    history_path.write_text(json.dumps(history, separators=(',', ':')), encoding='utf-8')
    print(f'history.json <- {len(history)} points')

    log = parse_log()
    (DATA_DIR / 'log.json').write_text(json.dumps(log, indent=1, ensure_ascii=False), encoding='utf-8')
    t = log['totals']
    print(f"log.json     <- {t['predictions']} predictions, {t['points']}/{t['points_max']} pts ({t['accuracy_pct']}%)")


if __name__ == '__main__':
    main()
