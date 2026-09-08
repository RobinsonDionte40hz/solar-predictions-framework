(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const text = (id, v) => { $(id).textContent = v == null || v === '' ? '—' : v; };
  const num = (v, d = 1) => (v == null || Number.isNaN(v)) ? '—' : Number(v).toFixed(d);
  const pct = (v, d = 0) => v == null ? '—' : `${Number(v).toFixed(d)}%`;

  const fmtTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
  };
  const ago = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms)) return '';
    const h = ms / 3.6e6;
    if (h < 1) return `${Math.round(h * 60)} min ago`;
    if (h < 48) return `${h.toFixed(1)} h ago`;
    return `${Math.round(h / 24)} d ago`;
  };

  const el = (tag, cls, content) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (content != null) e.textContent = content;
    return e;
  };
  const badge = (label, cls) => el('span', `badge ${cls || ''}`, label);
  const row = (cells) => {
    const tr = document.createElement('tr');
    for (const c of cells) {
      const td = document.createElement('td');
      if (c instanceof Node) td.appendChild(c);
      else if (c && typeof c === 'object' && 'v' in c) { td.textContent = c.v; if (c.cls) td.className = c.cls; }
      else td.textContent = c == null ? '—' : c;
      tr.appendChild(td);
    }
    return tr;
  };

  // --- Current conditions -------------------------------------------------
  function renderCards(p) {
    const xr = p.xray || {}, r = p.r_scale || {};
    text('xray-class', xr.class);
    text('xray-sub', `${r.scale || ''} ${r.label ? '· ' + r.label.toLowerCase() : ''} · ${fmtTime(xr.time)}`);

    const g = p.geo_nowcast || {};
    text('geo-state', g.g_scale || g.state);
    text('geo-sub', `${g.state || ''} · Kp ≈ ${num(g.kp_estimate, 1)} · Bz ${num(g.bz, 1)} nT`);

    const sw = p.solar_wind || {}, imf = p.imf || {};
    text('sw-speed', sw.speed != null ? `${Math.round(sw.speed)} km/s` : null);
    text('sw-sub', `n ${num(sw.density, 2)} /cm³ · Bt ${num(imf.bt, 1)} nT · Bz ${num(imf.bz, 1)} nT`);

    const s = p.sigma_log || {};
    text('sigma', num(s.sigma_log, 2));
    text('sigma-sub', `${s.cycle_state || ''} · ${s.n_flares ?? '—'} flares in window · natural 1.5`);

    const pe = (p.proton_environment || {}), cur = pe.current || {}, fc = pe.forecast || {};
    text('s-scale', cur.scale);
    text('s-sub', `${(cur.label || '').toLowerCase()} · SEP prob ${pct((fc.sep_probability || 0) * 100)} · ${fc.expected_s_scale || ''}`);
  }

  // --- Forecast -----------------------------------------------------------
  function renderForecast(p) {
    const f = p.prediction || {}, h = p.hardness || {}, t = p.topology || {};
    text('f-m', f.expected_m != null ? `${num(f.expected_m, 1)} / day  (${(f.m_range || []).join('–')})` : null);
    text('f-x', pct(f.x_probability, 1));
    text('f-c', (f.c_range || []).length ? `${f.c_range[0]}–${f.c_range[1]} / day` : null);
    text('f-src', f.primary_source ? `${f.primary_source} · ${pct(f.primary_share_pct)}` : null);
    text('f-energy', f.energy_state);
    text('f-topo', t.mode ? `${t.mode} · ${t.n_active ?? '—'} regions` : f.topology_mode);
    text('f-hard', h.pattern ? `${h.pattern} · ${num(h.ratio, 4)}` : null);
    text('f-conf', f.confidence != null ? pct(f.confidence * 100) : null);
  }

  // --- CMEs ---------------------------------------------------------------
  function renderCMEs(p) {
    const body = $('cme-body');
    const list = ((p.cme_analysis || {}).earth_directed) || [];
    body.replaceChildren();
    $('cme-empty').hidden = list.length > 0;
    for (const c of list) {
      const arrived = c.arrival_late && new Date(c.arrival_late) < Date.now();
      body.appendChild(row([
        fmtTime(c.start_time),
        { v: c.speed != null ? `${Math.round(c.speed)} km/s` : '—', cls: 'num' },
        { v: pct((c.impact_probability || 0) * 100), cls: 'num' },
        fmtTime(c.arrival_est),
        { v: `${fmtTime(c.arrival_early)} → ${fmtTime(c.arrival_late)}`, cls: 'wrap-cell' },
        `${c.expected_g_scale || '—'} · Kp ${c.expected_kp ?? '—'}`,
        arrived ? badge('window closed', 'withdrawn') : c.in_transit ? badge('in transit', 'pending') : badge('watch', ''),
      ]));
    }
  }

  // --- Extended outlook ---------------------------------------------------
  function renderOutlook(p) {
    const ef = p.extended_forecast || {};
    text('outlook-text', ef.combined_outlook || (ef.micro && ef.micro.summary));
  }

  // --- Active regions -----------------------------------------------------
  function renderRegions(p) {
    const body = $('region-body');
    body.replaceChildren();
    const regions = [...(p.region_predictions || [])].sort((a, b) => (b.share || 0) - (a.share || 0));
    for (const r of regions) {
      const lat = r.latitude ?? 0, lon = r.longitude ?? 0;
      const pos = `${lat >= 0 ? 'N' : 'S'}${Math.abs(lat)}${lon >= 0 ? 'W' : 'E'}${Math.abs(lon)}`;
      const name = r.is_dominant ? `AR${r.number} ★` : `AR${r.number}`;
      body.appendChild(row([
        name,
        r.mag_class,
        { v: pos, cls: 'num' },
        { v: r.area != null ? `${r.area} μh` : '—', cls: 'num' },
        { v: pct((r.share || 0) * 100), cls: 'num' },
        { v: pct((r.m_probability || 0) * 100), cls: 'num' },
        { v: pct((r.x_probability || 0) * 100, 1), cls: 'num' },
        r.improving ? 'improving' : (r.growth_rate > 0 ? 'growing' : 'stable'),
      ]));
    }
  }

  // --- Charts (dependency-free SVG) --------------------------------------
  function drawChart(svgId, points, key, opts = {}) {
    const svg = $(svgId);
    svg.replaceChildren();
    const data = points.filter((p) => p[key] != null && p.t).map((p) => ({ x: new Date(p.t).getTime(), y: Number(p[key]) }));
    if (data.length < 2) {
      const t = document.createElementNS(svg.namespaceURI, 'text');
      t.setAttribute('x', 12); t.setAttribute('y', 24); t.setAttribute('class', 'chart-label');
      t.textContent = 'not enough data yet';
      svg.appendChild(t); return;
    }
    const W = 600, H = 160, padL = 44, padR = 10, padT = 10, padB = 22;
    const xs = data.map((d) => d.x), ys = data.map((d) => d.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    let y0 = opts.min ?? Math.min(...ys), y1 = opts.max ?? Math.max(...ys);
    if (y1 - y0 < 1e-9) { y0 -= 0.5; y1 += 0.5; }
    const sx = (x) => padL + ((x - x0) / (x1 - x0 || 1)) * (W - padL - padR);
    const sy = (y) => H - padB - ((y - y0) / (y1 - y0)) * (H - padT - padB);
    const ns = svg.namespaceURI;
    const mk = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

    for (let i = 0; i <= 2; i++) {
      const yv = y0 + (i / 2) * (y1 - y0), yy = sy(yv);
      svg.appendChild(mk('line', { x1: padL, x2: W - padR, y1: yy, y2: yy, class: 'chart-grid' }));
      const lbl = mk('text', { x: padL - 6, y: yy + 4, 'text-anchor': 'end', class: 'chart-label' });
      lbl.textContent = opts.fmt ? opts.fmt(yv) : yv.toFixed(opts.digits ?? 2);
      svg.appendChild(lbl);
    }
    if (opts.ref != null && opts.ref >= y0 && opts.ref <= y1) {
      svg.appendChild(mk('line', { x1: padL, x2: W - padR, y1: sy(opts.ref), y2: sy(opts.ref), class: 'chart-grid', 'stroke-dasharray': '4 4' }));
    }

    const path = data.map((d, i) => `${i ? 'L' : 'M'}${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`).join(' ');
    const base = (H - padB).toFixed(1);
    svg.appendChild(mk('path', { d: `${path} L${sx(data[data.length - 1].x).toFixed(1)},${base} L${sx(data[0].x).toFixed(1)},${base} Z`, class: 'chart-area' }));
    svg.appendChild(mk('path', { d: path, class: 'chart-line' }));
    const last = data[data.length - 1];
    svg.appendChild(mk('circle', { cx: sx(last.x), cy: sy(last.y), r: 3.5, class: 'chart-dot' }));

    const dateLbl = (x, anchor) => {
      const t = mk('text', { x, y: H - 6, 'text-anchor': anchor, class: 'chart-label' });
      t.textContent = new Date(x === padL ? x0 : x1).toISOString().slice(0, 10);
      return t;
    };
    svg.appendChild(dateLbl(padL, 'start'));
    svg.appendChild(dateLbl(W - padR, 'end'));
  }

  function renderCharts(history) {
    drawChart('chart-sigma', history, 'sigma_log', { ref: 1.5, digits: 2 });
    drawChart('chart-m', history, 'expected_m', { min: 0, digits: 1 });
    drawChart('chart-x', history, 'x_prob', { min: 0, digits: 0 });
    drawChart('chart-sw', history, 'sw_speed', { digits: 0 });
  }

  // --- Track record -------------------------------------------------------
  function renderLog(log) {
    const t = log.totals || {};
    const totals = $('totals');
    totals.replaceChildren();
    const add = (n, l) => { const d = el('div', 'total'); d.appendChild(el('span', 'n', n)); d.appendChild(el('span', 'l', l)); totals.appendChild(d); };
    add(t.accuracy_pct != null ? `${t.accuracy_pct}%` : '—', 'accuracy');
    add(`${t.points ?? '—'} / ${t.points_max ?? '—'}`, 'points');
    add(t.correct ?? '—', 'correct');
    add(t.incorrect ?? '—', 'incorrect');
    add(t.pending ?? '—', 'pending');

    const body = $('log-body');
    body.replaceChildren();
    for (const e of log.entries || []) {
      const status = (e.status || '').toUpperCase();
      const cls = status === 'CORRECT' ? 'correct' : status === 'INCORRECT' ? 'incorrect' : status === 'WITHDRAWN' ? 'withdrawn' : 'pending';
      body.appendChild(row([
        { v: `#${e.id}`, cls: 'num' },
        { v: e.title || 'Prediction', cls: 'wrap-cell' },
        e.issued,
        { v: e.target, cls: 'wrap-cell' },
        { v: e.score != null ? `${e.score}/${e.max}` : '—', cls: 'num' },
        badge(status.toLowerCase(), cls),
      ]));
    }
  }

  // --- Boot ---------------------------------------------------------------
  async function load(name) {
    const res = await fetch(`data/${name}?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  }

  async function main() {
    const errors = [];
    try {
      const p = await load('latest.json');
      $('updated').textContent = `Updated ${fmtTime(p.timestamp)} (${ago(p.timestamp)})`;
      renderCards(p); renderForecast(p); renderCMEs(p); renderOutlook(p); renderRegions(p);
    } catch (e) { errors.push(e.message); $('updated').textContent = 'no prediction data'; }
    try { renderCharts(await load('history.json')); } catch (e) { errors.push(e.message); }
    try { renderLog(await load('log.json')); } catch (e) { errors.push(e.message); }
    if (errors.length) { $('error').textContent = `Some data failed to load — ${errors.join('; ')}`; $('error').hidden = false; }
  }

  main();
})();
