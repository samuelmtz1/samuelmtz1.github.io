// ---------- Valores calculados a partir de los datos ----------
dash.calc('ap_totals', {
  inputs: ['ap_nfl'],
  title: 'Totales NFL de Peterson',
  description: 'Suma de todas sus filas de temporada regular; promedios = yardas entre acarreos y entre partidos.',
  fn: (ap_nfl) => {
    const s = (k) => ap_nfl.reduce((a, r) => a + Number(r[k] || 0), 0);
    const att = s('att'), yds = s('yds'), gp = s('gp'), recyds = s('recyds');
    return [{ gp, att, yds, td: s('td'), rec: s('rec'), recyds, rectd: s('rectd'), ypc: Math.round(yds / att * 10) / 10, ypg: Math.round(yds / gp * 10) / 10, scrim: yds + recyds, totTd: s('td') + s('rectd') }];
  }
});

dash.calc('ap_by_year', {
  inputs: ['ap_nfl'],
  title: 'Peterson por año',
  description: 'Une los años en que jugó para dos equipos (2017, 2021) y suma sus números.',
  fn: (ap_nfl) => {
    const years = [...new Set(ap_nfl.map((r) => Number(r.year)))].sort((a, b) => a - b);
    const yes = (v) => v === true || v === 'true';
    return years.map((year) => {
      const rs = ap_nfl.filter((r) => Number(r.year) === year);
      const s = (k) => rs.reduce((a, r) => a + Number(r[k] || 0), 0);
      const yds = s('yds'), att = s('att');
      return {
        year, team: rs.map((r) => r.team).join('/'), gp: s('gp'), att, yds, td: s('td'), rec: s('rec'), recyds: s('recyds'),
        scrim: yds + s('recyds'), avg: att ? Math.round(yds / att * 10) / 10 : 0,
        allpro: (rs.find((r) => r.allpro) || {}).allpro || '', ledYds: rs.some((r) => yes(r.ledYds)), ledTd: rs.some((r) => yes(r.ledTd)),
        note: rs.map((r) => r.note).filter(Boolean).join(' · ')
      };
    });
  }
});

dash.calc('rbs_rates', {
  inputs: ['rbs'],
  title: 'Promedios de los 11 corredores',
  description: 'Yardas por acarreo y por partido, yardas desde scrimmage (tierra + recepción) y TD totales (tierra + recepción).',
  fn: (rbs) => rbs.map((r) => {
    const yds = Number(r.yds), recyds = Number(r.recyds), g = Number(r.games);
    return { id: r.id, ypc: Math.round(yds / Number(r.att) * 10) / 10, ypg: Math.round(yds / g * 10) / 10, scrim: yds + recyds, scrimPg: Math.round((yds + recyds) / g * 10) / 10, totTd: Number(r.td) + Number(r.rectd) };
  })
});

dash.calc('hs_totals', {
  inputs: ['ap_hs'],
  title: 'Totales de preparatoria',
  description: 'Suma de sus temporadas junior y senior.',
  fn: (ap_hs) => {
    const s = (k) => ap_hs.reduce((a, r) => a + Number(r[k] || 0), 0);
    return [{ att: s('att'), yds: s('yds'), td: s('td'), ypc: Math.round(s('yds') / s('att') * 10) / 10 }];
  }
});

dash.calc('col_totals', {
  inputs: ['ap_college'],
  title: 'Totales universitarios',
  description: 'Suma de sus tres temporadas en Oklahoma.',
  fn: (ap_college) => {
    const s = (k) => ap_college.reduce((a, r) => a + Number(r[k] || 0), 0);
    return [{ gp: s('gp'), att: s('att'), yds: s('yds'), td: s('td') }];
  }
});

// ---------- Estado y utilidades compartidas ----------
window.AP = window.AP || { a: 'peterson', b: 'sanders', seasonMetric: 'yds', rankMetric: 'yds', level: 'all', sortKey: 'yds', sortDir: -1, cumulDone: false };
const AP = window.AP;
const f0 = d3.format(','), f1 = d3.format('.1f');
window.APfmt = (v, fmt) => {
  if (v == null || v === '') return '—';
  if (fmt === 'text' || fmt === 'year') return String(v);
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return fmt === 'dec1' ? f1(n) : f0(n);
};
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fail = (el) => { const d = mk('div', 'ap-fail'); d.append(mk('i'), document.createTextNode('No se pudo cargar')); el.appendChild(d); };
const notReady = (el, ids) => {
  const st = ids.map((id) => dash.data(id).status);
  if (st.every((s) => s === 'ok')) return false;
  if (st.some((s) => s === 'error' || s === 'connect' || s === 'declined' || s === 'missing')) fail(el);
  return true;
};
const tipFor = (box) => {
  const t = mk('div', 'ap-tip'); t.hidden = true; box.appendChild(t);
  return {
    show(lines, x, y) {
      t.replaceChildren(...lines.map((l, i) => { const d = mk('div', i === 0 ? 'ap-tip-h' : null); if (l.c) { const s = mk('i', 'ap-sw'); s.style.background = l.c; d.appendChild(s); } d.appendChild(document.createTextNode(l.t)); return d; }));
      t.hidden = false;
      const bw = box.clientWidth, tw = t.offsetWidth, th = t.offsetHeight;
      let left = x + 14; if (left + tw > bw) left = x - tw - 14; if (left < 0) left = 0;
      let top = y - th - 10; if (top < 0) top = y + 14;
      t.style.left = left + 'px'; t.style.top = top + 'px';
    },
    hide() { t.hidden = true; }
  };
};
const measure = (svg, texts, cls) => {
  let w = 0;
  texts.forEach((s) => { const t = svg.append('text').attr('class', cls || null).text(s); w = Math.max(w, t.node().getComputedTextLength()); t.remove(); });
  return w;
};
const rbAll = () => {
  const a = dash.data('rbs'), b = dash.data('rbs_rates');
  if (a.status !== 'ok' || b.status !== 'ok') return null;
  const m = new Map(b.data.map((r) => [r.id, r]));
  return a.data.map((r) => {
    const o = { ...r, ...(m.get(r.id) || {}) };
    ['seasons', 'games', 'att', 'yds', 'td', 'rec', 'recyds', 'rectd', 'probowls', 'allpro1', 'mvp', 'opoy', 'rushtitles', 'k2', 'rings', 'oroy'].forEach((k) => { o[k] = Number(o[k]); });
    return o;
  });
};
const METRICS = [
  { k: 'games', l: 'Partidos', f: 'int', count: false },
  { k: 'att', l: 'Acarreos', f: 'int', count: false },
  { k: 'yds', l: 'Yardas por tierra', f: 'int' },
  { k: 'ypc', l: 'Yardas por acarreo', f: 'dec1' },
  { k: 'ypg', l: 'Yardas por partido', f: 'dec1' },
  { k: 'td', l: 'TD por tierra', f: 'int' },
  { k: 'rec', l: 'Recepciones', f: 'int' },
  { k: 'recyds', l: 'Yardas por recepción', f: 'int' },
  { k: 'scrim', l: 'Yardas desde scrimmage', f: 'int' },
  { k: 'scrimPg', l: 'Scrimmage por partido', f: 'dec1' },
  { k: 'totTd', l: 'TD totales', f: 'int' },
  { k: 'probowls', l: 'Pro Bowls', f: 'int' },
  { k: 'allpro1', l: 'All-Pro 1er equipo', f: 'int' },
  { k: 'mvp', l: 'MVP', f: 'int' },
  { k: 'opoy', l: 'Jugador Ofensivo del Año', f: 'int' },
  { k: 'rushtitles', l: 'Títulos de yardas', f: 'int' },
  { k: 'k2', l: 'Temporadas de 2,000 yds', f: 'int' },
  { k: 'rings', l: 'Campeonatos', f: 'int' }
];
const SEASON_METRICS = { yds: { l: 'Yardas por tierra', f: 'int', lead: 'ledYds' }, td: { l: 'TD por tierra', f: 'int', lead: 'ledTd' }, avg: { l: 'Yardas por acarreo', f: 'dec1' }, scrim: { l: 'Yardas desde scrimmage', f: 'int' }, rec: { l: 'Recepciones', f: 'int' } };
const C = (i) => dash.colors[i % dash.colors.length];

// Muestras de color de las leyendas
document.querySelectorAll('.ap-sw[data-c]').forEach((s) => { s.style.background = C(Number(s.dataset.c)); });

// ---------- Pestañas ----------
const openTab = (id) => {
  document.querySelectorAll('.ap-panel').forEach((p) => { p.hidden = p.id !== id; });
  document.querySelectorAll('.ap-tab').forEach((t) => { t.setAttribute('aria-selected', String(t.dataset.tab === id)); });
};
document.querySelectorAll('.ap-tab').forEach((t) => t.addEventListener('click', () => { openTab(t.dataset.tab); dash.setLink(t.dataset.tab); }));
const startTab = location.hash.slice(1);
if ([...document.querySelectorAll('.ap-panel')].some((p) => p.id === startTab)) openTab(startTab);

// ---------- Controles ----------
document.querySelectorAll('.js-season-metric').forEach((s) => s.addEventListener('change', () => { AP.seasonMetric = s.value; dash.draw('seasons'); }));
document.querySelectorAll('.js-rank-metric').forEach((s) => s.addEventListener('change', () => { AP.rankMetric = s.value; dash.draw('rank'); }));
document.querySelectorAll('.js-level').forEach((b) => b.addEventListener('click', () => {
  AP.level = b.dataset.level;
  document.querySelectorAll('.js-level').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  dash.draw('timeline');
}));
document.querySelectorAll('.js-sort').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.sort;
  if (AP.sortKey === k) AP.sortDir *= -1; else { AP.sortKey = k; AP.sortDir = (k === 'name' || k === 'years' || k === 'draft' || k === 'heisman') ? 1 : -1; }
  document.querySelectorAll('.js-sort').forEach((x) => {
    const th = x.closest('th'); if (!th) return;
    if (x.dataset.sort === AP.sortKey) th.setAttribute('aria-sort', AP.sortDir < 0 ? 'descending' : 'ascending'); else th.removeAttribute('aria-sort');
  });
  dash.draw('rbtable');
}));

// ---------- Valores sueltos ----------
dash.draw('val', (el) => {
  const d = dash.data(el.dataset.source);
  el.classList.toggle('dash-skeleton', d.status === 'loading');
  if (d.status !== 'ok') { el.textContent = '—'; return; }
  let row;
  if (el.dataset.where) {
    const [k, v] = el.dataset.where.split('=');
    row = d.data.find((r) => String(r[k]) === decodeURIComponent(v));
  } else row = d.data[Number(el.dataset.row || 0)];
  el.textContent = APfmt(row ? row[el.dataset.field] : null, el.dataset.fmt);
});

// ---------- Gráfica por temporada ----------
dash.draw('seasons', (el) => {
  el.replaceChildren();
  if (notReady(el, ['ap_by_year'])) return;
  const rows = dash.data('ap_by_year').data;
  const M = SEASON_METRICS[AP.seasonMetric] || SEASON_METRICS.yds, k = AP.seasonMetric in SEASON_METRICS ? AP.seasonMetric : 'yds';
  const W = Math.max(280, el.clientWidth), H = 300, mt = 34, mb = 26, ml = 4, mr = 4;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleBand(rows.map((r) => r.year), [ml, W - mr]).padding(0.2);
  const y = d3.scaleLinear([0, (d3.max(rows, (r) => Number(r[k])) || 1) * 1.08], [H - mb, mt]);
  y.ticks(4).forEach((t) => svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)'));
  const bw = Math.min(32, x.bandwidth()), off = (x.bandwidth() - bw) / 2;
  const tip = tipFor(el);
  const g = svg.append('g');
  rows.forEach((r) => {
    const v = Number(r[k]), x0 = x(r.year) + off;
    const top = r.allpro === '1º';
    g.append('rect').attr('x', x0).attr('y', y(v)).attr('width', bw).attr('height', Math.max(0, y(0) - y(v))).attr('rx', 3)
      .style('fill', top ? C(0) : 'var(--cds-chart-muted)');
    if (x.bandwidth() >= 24) g.append('text').attr('x', x0 + bw / 2).attr('y', y(v) - 6).attr('text-anchor', 'middle').attr('class', top ? 'strong' : null).style('font-size', x.bandwidth() < 40 ? '10px' : '12px').text(APfmt(v, M.f));
    if (M.lead && (r[M.lead] === true)) g.append('text').attr('x', x0 + bw / 2).attr('y', y(v) - (x.bandwidth() >= 24 ? 21 : 6)).attr('text-anchor', 'middle').style('fill', C(1)).style('font-size', '14px').text('★');
    const yr = String(r.year);
    g.append('text').attr('x', x0 + bw / 2).attr('y', H - 8).attr('text-anchor', 'middle').style('font-size', x.bandwidth() < 34 ? '10px' : '12px').text(x.bandwidth() < 34 ? "'" + yr.slice(2) : yr);
    g.append('rect').attr('x', x(r.year)).attr('y', mt - 20).attr('width', x.bandwidth()).attr('height', H - mt + 20 - mb).style('fill', 'transparent')
      .on('mousemove', (ev) => {
        const [px, py] = d3.pointer(ev, el);
        const lines = [{ t: `${yr} · ${r.team} · ${r.gp} PJ` }, { t: `${M.l}: ${APfmt(v, M.f)}` }];
        if (k !== 'yds') lines.push({ t: `Yardas por tierra: ${APfmt(r.yds)}` });
        if (r.allpro) lines.push({ t: `All-Pro ${r.allpro} equipo` });
        if (r.note) lines.push({ t: r.note });
        tip.show(lines, px, py);
      })
      .on('mouseleave', () => tip.hide());
  });
  svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'var(--cds-chart-axis)');
});

// ---------- Acumulado vs. la lista histórica ----------
dash.draw('cumul', (el) => {
  el.replaceChildren();
  if (notReady(el, ['ap_by_year', 'rbs'])) return;
  const years = dash.data('ap_by_year').data;
  const others = dash.data('rbs').data.filter((r) => r.id !== 'peterson').map((r) => ({ ...r, yds: Number(r.yds) })).sort((a, b) => b.yds - a.yds);
  let run = 0; const pts = years.map((r) => ({ year: Number(r.year), cum: (run += Number(r.yds)) }));
  const total = run;
  const W = Math.max(300, el.clientWidth), H = 340, mt = 14, mb = 26;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
  const labelOf = (r) => `${r.short} ${f0(r.yds)}`;
  const lw = measure(svg, others.map(labelOf).concat([`Peterson ${f0(total)}`]), 'strong');
  const ml = 34, mr = Math.min(W * 0.45, lw + 14);
  const maxY = Math.max(total, d3.max(others, (r) => r.yds)) * 1.04;
  const x = d3.scaleLinear([pts[0].year, pts[pts.length - 1].year], [ml, W - mr - 6]);
  const y = d3.scaleLinear([0, maxY], [H - mb, mt]);
  [0, 5000, 10000, 15000].filter((t) => t < maxY).forEach((t) => {
    svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)');
    svg.append('text').attr('x', ml - 6).attr('y', y(t) + 4).attr('text-anchor', 'end').text(t ? (t / 1000) + 'k' : '0');
  });
  const step = W < 520 ? 4 : 2;
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) svg.append('text').attr('x', x(p.year)).attr('y', H - 6).attr('text-anchor', 'middle').text(String(p.year)); });
  // Líneas de referencia y etiquetas sin encimarse
  const labs = others.map((r) => ({ r, y: y(r.yds) }));
  labs.push({ r: { short: 'Peterson', yds: total, me: true }, y: y(total) });
  labs.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 14) labs[i].y = labs[i - 1].y + 14;
  const over = labs[labs.length - 1].y - (H - mb);
  if (over > 0) labs.forEach((l) => { l.y -= over; });
  others.forEach((r) => {
    svg.append('line').attr('x1', ml).attr('x2', W - mr).attr('y1', y(r.yds)).attr('y2', y(r.yds)).style('stroke', 'var(--cds-chart-reference)').attr('stroke-dasharray', '3 4');
    const pass = pts.find((p) => p.cum >= r.yds);
    if (pass) svg.append('circle').attr('cx', x(pass.year)).attr('cy', y(r.yds)).attr('r', 4).style('fill', C(1)).attr('class', AP.cumulDone ? null : 'ap-fade');
  });
  labs.forEach((l) => {
    svg.append('text').attr('x', W - mr + 6).attr('y', l.y + 4).attr('class', l.r.me ? 'strong' : null).style('fill', l.r.me ? C(0) : null).text(l.r.me ? `Peterson ${f0(total)}` : labelOf(l.r));
  });
  const line = d3.line().x((p) => x(p.year)).y((p) => y(p.cum));
  const path = svg.append('path').datum(pts).attr('d', line).style('fill', 'none').style('stroke', C(0)).attr('stroke-width', 3).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
  if (!AP.cumulDone) { const len = path.node().getTotalLength(); path.attr('class', 'ap-anim').style('--len', len); AP.cumulDone = true; }
  pts.forEach((p) => svg.append('circle').attr('cx', x(p.year)).attr('cy', y(p.cum)).attr('r', 3).style('fill', C(0)));
  const tip = tipFor(el);
  const guide = svg.append('line').attr('y1', mt).attr('y2', H - mb).style('stroke', 'var(--cds-chart-axis)').style('opacity', 0);
  svg.append('rect').attr('x', ml).attr('y', mt).attr('width', W - mr - ml).attr('height', H - mt - mb).style('fill', 'transparent')
    .on('mousemove', (ev) => {
      const [px] = d3.pointer(ev, svg.node());
      const yr = Math.round(x.invert(px)); const p = pts.find((q) => q.year === yr) || pts[pts.length - 1];
      guide.attr('x1', x(p.year)).attr('x2', x(p.year)).style('opacity', 1);
      const passed = others.filter((r) => r.yds <= p.cum).map((r) => r.short);
      const [bx, by] = d3.pointer(ev, el);
      tip.show([{ t: String(p.year) }, { t: `${f0(p.cum)} yardas acumuladas`, c: C(0) }, { t: passed.length ? `Ya rebasó a: ${passed.join(', ')}` : 'Aún no rebasa a nadie del grupo' }], bx, by);
    })
    .on('mouseleave', () => { tip.hide(); guide.style('opacity', 0); });
});

// ---------- Tablas ----------
const fillBody = (tbody, rows, cols, keyOf, hl) => {
  tbody.replaceChildren(...rows.map((r) => {
    const tr = mk('tr', hl && hl(r) ? 'hl' : null); tr.dataset.key = keyOf(r);
    cols.forEach((c) => tr.appendChild(mk('td', c.cls || null, APfmt(r[c.k], c.f))));
    return tr;
  }));
};
dash.draw('nfltable', (tb) => {
  const d = dash.data('ap_nfl'); if (d.status !== 'ok') { tb.replaceChildren(); return; }
  fillBody(tb, d.data, [{ k: 'year', f: 'year', cls: 'l' }, { k: 'team', f: 'text', cls: 'l' }, { k: 'gp' }, { k: 'att' }, { k: 'yds' }, { k: 'avg', f: 'dec1' }, { k: 'lng', f: 'text' }, { k: 'td' }, { k: 'rec' }, { k: 'recyds' }, { k: 'rectd' }, { k: 'allpro', f: 'text', cls: 'l' }, { k: 'note', f: 'text', cls: 'l wrap' }],
    (r) => `${r.year},${encodeURIComponent(r.team)}`, (r) => r.allpro === '1º');
});
dash.draw('hstable', (tb) => {
  const d = dash.data('ap_hs'); if (d.status !== 'ok') { tb.replaceChildren(); return; }
  fillBody(tb, d.data, [{ k: 'year', f: 'year', cls: 'l' }, { k: 'cls', f: 'text', cls: 'l' }, { k: 'att' }, { k: 'yds' }, { k: 'avg', f: 'dec1' }, { k: 'td' }], (r) => String(r.year));
});
dash.draw('coltable', (tb) => {
  const d = dash.data('ap_college'); if (d.status !== 'ok') { tb.replaceChildren(); return; }
  fillBody(tb, d.data, [{ k: 'year', f: 'year', cls: 'l' }, { k: 'cls', f: 'text', cls: 'l' }, { k: 'gp' }, { k: 'att' }, { k: 'yds' }, { k: 'avg', f: 'dec1' }, { k: 'td' }, { k: 'rec' }, { k: 'recyds' }], (r) => String(r.year));
});
dash.draw('proftable', (tb) => {
  const d = dash.data('ap_profile'); if (d.status !== 'ok') { tb.replaceChildren(); return; }
  fillBody(tb, d.data, [{ k: 'metric', f: 'text', cls: 'l' }, { k: 'value', f: 'text' }], (r) => String(r.id));
});
dash.draw('rbtable', (tb) => {
  const all = rbAll(); if (!all) { tb.replaceChildren(); return; }
  const k = AP.sortKey, dir = AP.sortDir;
  const rows = all.slice().sort((p, q) => {
    const a = p[k], b = q[k];
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
    return String(a).localeCompare(String(b), 'es') * dir;
  });
  fillBody(tb, rows, [{ k: 'name', f: 'text', cls: 'l' }, { k: 'years', f: 'text', cls: 'l' }, { k: 'games' }, { k: 'att' }, { k: 'yds' }, { k: 'ypc', f: 'dec1' }, { k: 'ypg', f: 'dec1' }, { k: 'td' }, { k: 'rec' }, { k: 'recyds' }, { k: 'scrim' }, { k: 'totTd' }, { k: 'probowls' }, { k: 'allpro1' }, { k: 'mvp' }, { k: 'opoy' }, { k: 'rushtitles' }, { k: 'rings' }, { k: 'draft', f: 'text', cls: 'l' }, { k: 'heisman', f: 'text', cls: 'l' }],
    (r) => String(r.id), (r) => r.id === 'peterson');
});

// ---------- Escalera HS → college → NFL ----------
dash.draw('ladder', (el) => {
  el.replaceChildren();
  if (notReady(el, ['ap_hs', 'ap_college', 'ap_by_year'])) return;
  const rows = [
    ...dash.data('ap_hs').data.map((r) => ({ year: Number(r.year), yds: Number(r.yds), td: Number(r.td), lvl: 'Preparatoria', c: C(2), sub: r.cls })),
    ...dash.data('ap_college').data.map((r) => ({ year: Number(r.year), yds: Number(r.yds), td: Number(r.td), lvl: 'Oklahoma', c: C(1), sub: r.cls })),
    ...dash.data('ap_by_year').data.map((r) => ({ year: Number(r.year), yds: Number(r.yds), td: Number(r.td), lvl: 'NFL', c: C(0), sub: r.team }))
  ].sort((a, b) => a.year - b.year);
  const W = Math.max(280, el.clientWidth), H = 300, mt = 22, mb = 26;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
  const x = d3.scaleBand(rows.map((r) => r.year), [4, W - 4]).padding(0.18);
  const y = d3.scaleLinear([0, d3.max(rows, (r) => r.yds) * 1.08], [H - mb, mt]);
  y.ticks(4).forEach((t) => svg.append('line').attr('x1', 4).attr('x2', W - 4).attr('y1', y(t)).attr('y2', y(t)).style('stroke', 'var(--cds-chart-grid)'));
  const bw = Math.min(32, x.bandwidth()), off = (x.bandwidth() - bw) / 2;
  const tip = tipFor(el);
  rows.forEach((r) => {
    const x0 = x(r.year) + off;
    svg.append('rect').attr('x', x0).attr('y', y(r.yds)).attr('width', bw).attr('height', y(0) - y(r.yds)).attr('rx', 3).style('fill', r.c);
    if (x.bandwidth() >= 30) svg.append('text').attr('x', x0 + bw / 2).attr('y', y(r.yds) - 6).attr('text-anchor', 'middle').style('font-size', '10px').text(d3.format('.1f')(r.yds / 1000) + 'k');
    const yr = String(r.year);
    svg.append('text').attr('x', x0 + bw / 2).attr('y', H - 8).attr('text-anchor', 'middle').style('font-size', '10px').text("'" + yr.slice(2));
    svg.append('rect').attr('x', x(r.year)).attr('y', mt).attr('width', x.bandwidth()).attr('height', H - mt - mb).style('fill', 'transparent')
      .on('mousemove', (ev) => { const [px, py] = d3.pointer(ev, el); tip.show([{ t: `${yr} · ${r.lvl} · ${r.sub}` }, { t: `${f0(r.yds)} yardas por tierra`, c: r.c }, { t: `${r.td} TD por tierra` }], px, py); })
      .on('mouseleave', () => tip.hide());
  });
  svg.append('line').attr('x1', 4).attr('x2', W - 4).attr('y1', y(0)).attr('y2', y(0)).style('stroke', 'var(--cds-chart-axis)');
});

// ---------- Récords ----------
dash.draw('records', (el) => {
  el.replaceChildren();
  if (notReady(el, ['ap_records'])) return;
  dash.data('ap_records').data.forEach((r) => {
    const c = mk('div', 'ap-rec');
    c.append(mk('span', 'ap-rec-v', r.value), mk('span', 'ap-rec-l', r.label), mk('span', 'ap-rec-d', r.detail));
    el.appendChild(c);
  });
});

// ---------- Línea de tiempo ----------
dash.draw('timeline', (el) => {
  el.replaceChildren();
  const d = dash.data('ap_awards'); if (d.status !== 'ok') return;
  const colorOf = { Preparatoria: C(2), College: C(1), NFL: C(0) };
  const rows = d.data.filter((r) => AP.level === 'all' || r.level === AP.level);
  const years = [...new Set(rows.map((r) => r.year))];
  years.forEach((yr) => {
    const li = mk('li'); li.appendChild(mk('span', 'ap-tl-y', String(yr)));
    const box = mk('div', 'ap-tl-e');
    rows.filter((r) => r.year === yr).forEach((r) => {
      const a = mk('div', 'ap-tl-a'); a.appendChild(document.createTextNode(r.award));
      const tag = mk('span', 'ap-tl-tag', r.level); tag.style.background = colorOf[r.level] || 'var(--cds-chart-muted)'; a.appendChild(tag);
      const wrap = mk('div'); wrap.append(a, mk('div', 'ap-tl-d', r.detail)); box.appendChild(wrap);
    });
    li.appendChild(box); el.appendChild(li);
  });
});

// ---------- Selectores del comparador ----------
dash.draw('pick', (sel) => {
  const d = dash.data('rbs');
  sel.replaceChildren(...(d.status === 'ok' ? d.data : []).map((r) => new Option(r.name, r.id)));
  const which = sel.dataset.which === 'b' ? 'b' : 'a';
  sel.value = AP[which];
  sel.onchange = () => { AP[which] = sel.value; ['h2h', 'radar', 'rank', 'pick'].forEach((n) => dash.draw(n)); };
});

// ---------- Cara a cara ----------
dash.draw('h2h', (el) => {
  el.replaceChildren();
  if (notReady(el, ['rbs', 'rbs_rates'])) return;
  const all = rbAll();
  const A = all.find((r) => r.id === AP.a) || all[0], B = all.find((r) => r.id === AP.b) || all[1];
  const ca = C(0), cb = C(1);
  const card = (r, c) => {
    const d = mk('div', 'ap-h2h-card'); d.style.borderTopColor = c;
    d.appendChild(mk('div', 'ap-h2h-name', r.name));
    const dl = mk('dl', 'ap-h2h-dl');
    [['Carrera', r.years], ['Draft', r.draft], ['Universidad', r.college], ['Heisman', r.heisman], ['Salón de la Fama', r.hof], ['Prepa', r.hsNote], ['College', r.collegeNote]].forEach(([k, v]) => dl.append(mk('dt', null, k), mk('dd', null, v)));
    d.appendChild(dl); return d;
  };
  const head = mk('div', 'ap-h2h-head'); head.append(card(A, ca), mk('div', 'ap-vs', 'VS'), card(B, cb)); el.appendChild(head);
  let wa = 0, wb = 0, tie = 0;
  METRICS.forEach((m) => {
    const va = Number(A[m.k]) || 0, vb = Number(B[m.k]) || 0, mx = Math.max(va, vb) || 1;
    const win = va > vb ? 'a' : vb > va ? 'b' : 't';
    if (m.count !== false) { if (win === 'a') wa++; else if (win === 'b') wb++; else tie++; }
    const row = mk('div', 'ap-h2h-row');
    const vA = mk('span', 'ap-h2h-v a' + (win === 'a' ? ' win' : ''), APfmt(va, m.f)); vA.style.gridArea = 'va'; if (win === 'a') vA.style.color = ca;
    const vB = mk('span', 'ap-h2h-v b' + (win === 'b' ? ' win' : ''), APfmt(vb, m.f)); vB.style.gridArea = 'vb'; if (win === 'b') vB.style.color = cb;
    const bar = (v, c, side, on) => { const b = mk('div', 'ap-h2h-bar ' + side); b.style.gridArea = 'b' + side; const i = mk('i'); i.style.width = (v / mx * 100) + '%'; i.style.background = c; i.style.opacity = on ? 1 : 0.4; b.appendChild(i); return b; };
    row.append(vA, bar(va, ca, 'a', win !== 'b'), mk('span', 'ap-h2h-l', m.l), bar(vb, cb, 'b', win !== 'a'), vB);
    el.appendChild(row);
  });
  const foot = mk('p', 'ap-h2h-foot');
  const bA = mk('b', null, `${A.short} ${wa}`); bA.style.color = ca;
  const bB = mk('b', null, `${B.short} ${wb}`); bB.style.color = cb;
  foot.append(document.createTextNode('Categorías ganadas: '), bA, document.createTextNode(' · '), bB, document.createTextNode(` · empates ${tie}`));
  el.appendChild(foot);
});

// ---------- Radar ----------
dash.draw('radar', (el) => {
  el.replaceChildren();
  if (notReady(el, ['rbs', 'rbs_rates'])) return;
  const all = rbAll().map((r) => ({ ...r, big: r.mvp + r.opoy }));
  const A = all.find((r) => r.id === AP.a) || all[0], B = all.find((r) => r.id === AP.b) || all[1];
  const axes = [{ k: 'yds', l: 'Yardas' }, { k: 'ypc', l: 'Yds/acarreo' }, { k: 'ypg', l: 'Yds/partido' }, { k: 'totTd', l: 'TD totales' }, { k: 'scrim', l: 'Scrimmage' }, { k: 'probowls', l: 'Pro Bowls' }, { k: 'allpro1', l: 'All-Pro' }, { k: 'big', l: 'MVP + OPOY' }];
  const max = Object.fromEntries(axes.map((a) => [a.k, d3.max(all, (r) => r[a.k]) || 1]));
  const S = Math.min(Math.max(260, el.clientWidth), 440), cx = S / 2, cy = S / 2, R = S / 2 - 58;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${S} ${S}`).style('max-width', S + 'px');
  const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / axes.length;
  [0.25, 0.5, 0.75, 1].forEach((f) => svg.append('polygon').attr('points', axes.map((_, i) => [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f].join(',')).join(' ')).style('fill', 'none').style('stroke', 'var(--cds-chart-grid)'));
  axes.forEach((a, i) => {
    svg.append('line').attr('x1', cx).attr('y1', cy).attr('x2', cx + Math.cos(ang(i)) * R).attr('y2', cy + Math.sin(ang(i)) * R).style('stroke', 'var(--cds-chart-grid)');
    const lx = cx + Math.cos(ang(i)) * (R + 14), ly = cy + Math.sin(ang(i)) * (R + 14);
    const c = Math.cos(ang(i));
    svg.append('text').attr('x', lx).attr('y', ly + 4).attr('text-anchor', Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end').text(a.l);
  });
  const tip = tipFor(el);
  [[B, C(1)], [A, C(0)]].forEach(([r, c]) => {
    const pts = axes.map((a, i) => { const f = r[a.k] / max[a.k]; return [cx + Math.cos(ang(i)) * R * f, cy + Math.sin(ang(i)) * R * f]; });
    svg.append('polygon').attr('points', pts.map((p) => p.join(',')).join(' ')).style('fill', c).style('fill-opacity', 0.16).style('stroke', c).attr('stroke-width', 2).attr('stroke-linejoin', 'round');
    pts.forEach((p, i) => svg.append('circle').attr('cx', p[0]).attr('cy', p[1]).attr('r', 4).style('fill', c)
      .on('mousemove', (ev) => { const [px, py] = d3.pointer(ev, el); const a = axes[i]; tip.show([{ t: a.l }, { t: `${r.short}: ${APfmt(r[a.k], a.k === 'ypc' || a.k === 'ypg' ? 'dec1' : 'int')} (${Math.round(r[a.k] / max[a.k] * 100)}% del líder)`, c }], px, py); })
      .on('mouseleave', () => tip.hide()));
  });
  const lg = mk('div', 'ap-legend');
  [[A, C(0)], [B, C(1)]].forEach(([r, c]) => { const s = mk('span'); const sw = mk('i', 'ap-sw'); sw.style.background = c; s.append(sw, document.createTextNode(r.name)); lg.appendChild(s); });
  el.appendChild(lg);
});

// ---------- Ranking ----------
dash.draw('rank', (el) => {
  el.replaceChildren();
  if (notReady(el, ['rbs', 'rbs_rates'])) return;
  const m = METRICS.find((x) => x.k === AP.rankMetric) || METRICS[2];
  const rows = rbAll().sort((p, q) => q[m.k] - p[m.k]);
  const rowH = 26, W = Math.max(280, el.clientWidth), H = rows.length * rowH + 8;
  const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
  const ml = measure(svg, rows.map((r) => r.short), 'strong') + 12;
  const mr = measure(svg, rows.map((r) => APfmt(r[m.k], m.f)), 'strong') + 10;
  const x = d3.scaleLinear([0, d3.max(rows, (r) => r[m.k]) || 1], [ml, W - mr]);
  const tip = tipFor(el);
  rows.forEach((r, i) => {
    const yy = 4 + i * rowH, isA = r.id === AP.a, isB = r.id === AP.b;
    const c = isA ? C(0) : isB ? C(1) : 'var(--cds-chart-muted)';
    svg.append('text').attr('x', ml - 8).attr('y', yy + rowH / 2 + 4).attr('text-anchor', 'end').attr('class', isA || isB ? 'strong' : null).text(r.short);
    svg.append('rect').attr('x', ml).attr('y', yy + 4).attr('width', Math.max(0, x(r[m.k]) - ml)).attr('height', rowH - 8).attr('rx', 3).style('fill', c);
    svg.append('text').attr('x', x(r[m.k]) + 6).attr('y', yy + rowH / 2 + 4).attr('class', isA || isB ? 'strong' : null).text(APfmt(r[m.k], m.f));
    svg.append('rect').attr('x', 0).attr('y', yy).attr('width', W).attr('height', rowH).style('fill', 'transparent')
      .on('mousemove', (ev) => { const [px, py] = d3.pointer(ev, el); tip.show([{ t: `${i + 1}º · ${r.name}` }, { t: `${m.l}: ${APfmt(r[m.k], m.f)}`, c: isA || isB ? c : null }, { t: r.years }], px, py); })
      .on('mouseleave', () => tip.hide());
  });
});
