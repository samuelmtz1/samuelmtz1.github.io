/*
 * dash-shim.js — versión local del runtime del dashboard de Claude.
 *
 * El visualizador se publicó como un "Dashboard" de Claude, que le da a la
 * página un objeto global `dash` (datos, cálculos, dibujos). Este archivo
 * imita esa API para que la MISMA página (index.html + js/app.js) corra en
 * local, en VS Code, sin cambios.
 *
 * Solo implementa lo que usa el proyecto. Si app.js empieza a usar otra parte
 * de la API, agrégala aquí (ver CLAUDE.md, sección "Contrato de la API dash").
 *
 *   dash.data(id)            -> { status, data, columns, message, refreshing, meta }
 *   dash.calc(id, {inputs, fn, title, description})
 *   dash.draw(name, fn | {mount, update, unmount})   /  dash.draw(name) para re-dibujar
 *   dash.onData(fn)
 *   dash.colors              -> 8 colores (variables CSS, siguen el tema)
 *   dash.setLink(name)       -> actualiza el #hash
 *   dash.params / setParams / resetParams / refresh
 */
(function () {
  'use strict';

  const MANIFEST = 'data/datasets.json';
  const datasets = {};          // id -> resultado ya normalizado
  const calcs = {};             // id -> { inputs, fn, title, description, cache, ver }
  const draws = {};             // name -> fn | { mount, update, unmount }
  const onDataFns = [];
  const made = new WeakMap();   // el -> lo que devolvió mount()
  const widths = new WeakMap(); // el -> último ancho dibujado
  let manifest = null;          // null mientras carga
  let version = 0;              // sube cada vez que llegan datos
  let started = false;
  let scheduled = false;
  let params = {};
  let defaults = {};

  const EMPTY = (status, message) => ({ status, data: [], rows: [], columns: [], meta: [], message: message || '', refreshing: false });

  const rowsOf = (json) => {
    if (Array.isArray(json)) return json;
    if (json && typeof json === 'object') return json.rows || json.data || json.results || [json];
    return [];
  };

  const ok = (data) => {
    const columns = Array.isArray(data) && data.length && typeof data[0] === 'object' ? Object.keys(data[0]) : [];
    return { status: 'ok', data, rows: data, columns, meta: [], message: '', refreshing: false };
  };

  function evalCalc(id) {
    const c = calcs[id];
    if (c.cache && c.ver === version) return c.cache;
    const ins = c.inputs.map(get);
    let res;
    const bad = ins.find((s) => ['error', 'missing', 'connect', 'declined'].includes(s.status));
    if (bad) res = EMPTY('error', `Entrada con problema en "${id}": ${bad.message || bad.status}`);
    else if (ins.some((s) => s.status !== 'ok')) res = EMPTY('loading');
    else {
      try { res = ok(c.fn(...ins.map((s) => s.data))); }
      catch (e) { console.error(`[dash] el cálculo "${id}" falló:`, e); res = EMPTY('error', e.message); }
    }
    c.cache = res; c.ver = version;
    return res;
  }

  function get(id) {
    if (calcs[id]) return evalCalc(id);
    if (datasets[id]) return datasets[id];
    if (!manifest) return EMPTY('loading');
    console.warn(`[dash] no existe el dataset "${id}" en ${MANIFEST}`);
    return EMPTY('missing', `No existe el dataset "${id}"`);
  }

  const visible = (el) => el.isConnected && !el.closest('[hidden]');

  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => {
    entries.forEach((en) => {
      const el = en.target, w = Math.round(en.contentRect.width);
      if (widths.has(el) && widths.get(el) !== w && visible(el)) runOne(el.dataset.draw, el);
    });
  }) : null;

  function runOne(name, el) {
    const d = draws[name];
    if (!d) return;
    try {
      if (typeof d === 'function') d(el);
      else {
        if (!made.has(el)) { el.replaceChildren(); made.set(el, d.mount ? d.mount(el) : undefined); }
        if (d.update) d.update(el, made.get(el));
      }
    } catch (e) {
      console.error(`[dash] el dibujo "${name}" falló:`, e, el);
      if (typeof d === 'object' && d.unmount) { try { d.unmount(el, made.get(el)); } catch (_) {} made.delete(el); }
    }
    widths.set(el, Math.round(el.getBoundingClientRect().width));
    if (ro && !el.__dashObserved) { ro.observe(el); el.__dashObserved = true; }
  }

  function runDraw(name) {
    document.querySelectorAll(`[data-draw="${CSS.escape(name)}"]`).forEach((el) => { if (visible(el)) runOne(name, el); });
  }

  function runAll() {
    scheduled = false;
    if (!started) return;
    onDataFns.forEach((fn) => { try { fn(); } catch (e) { console.error('[dash] onData falló:', e); } });
    Object.keys(draws).forEach(runDraw);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(runAll);
  }

  async function loadAll() {
    try {
      const r = await fetch(MANIFEST, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${MANIFEST}: HTTP ${r.status}`);
      manifest = await r.json();
    } catch (e) {
      manifest = [];
      console.error('[dash] no se pudo leer el manifiesto. ¿Abriste la página con un servidor local y no con file://? Ver SOP §2.', e);
      showBanner('No se pudieron cargar los datos. Abre el proyecto con un servidor local (Live Server o "python3 -m http.server"), no con doble clic.');
      schedule();
      return;
    }
    manifest.forEach((m) => { datasets[m.id] = EMPTY('loading'); });
    await Promise.all(manifest.map(async (m) => {
      try {
        const r = await fetch('data/' + m.file, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        datasets[m.id] = ok(rowsOf(await r.json()));
      } catch (e) {
        console.error(`[dash] no se pudo cargar data/${m.file}:`, e);
        datasets[m.id] = EMPTY('error', e.message);
      }
      version++;
      schedule();
    }));
  }

  function showBanner(text) {
    const b = document.createElement('div');
    b.className = 'dash-banner';
    b.textContent = text;
    document.body.prepend(b);
  }

  window.dash = {
    data: get,
    calc(id, spec) {
      if (calcs[id] || (manifest && manifest.some((m) => m.id === id))) console.warn(`[dash] el id "${id}" ya existe`);
      calcs[id] = { inputs: spec.inputs || [], fn: spec.fn, title: spec.title, description: spec.description, cache: null, ver: -1 };
    },
    loader(id, spec) { console.warn(`[dash] loader("${id}") no está soportado en local; los datos ya vienen como filas.`, spec); },
    draw(name, fn) {
      if (fn === undefined) { if (started) runDraw(name); return; }
      draws[name] = fn;
      if (started) runDraw(name);
    },
    onData(fn) { onDataFns.push(fn); if (started) { try { fn(); } catch (e) { console.error(e); } } },
    colors: Array.from({ length: 8 }, (_, i) => `var(--dash-color-${i + 1})`),
    refresh() { version++; schedule(); },
    params: () => ({ ...params }),
    setParams(p) { Object.entries(p).forEach(([k, v]) => { if (v == null) delete params[k]; else params[k] = v; }); version++; schedule(); },
    resetParams() { params = { ...defaults }; version++; schedule(); },
    setLink(name) { history.replaceState(null, '', name ? '#' + name : location.pathname + location.search); },
    // Solo local: la lista de datasets con sus fuentes (útil en la consola).
    sources: () => manifest
  };

  // Un panel que se muestra (se quita `hidden`) dibuja lo que tiene dentro.
  new MutationObserver((muts) => {
    if (muts.some((m) => m.attributeName === 'hidden')) schedule();
  }).observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['hidden'] });

  // Tema claro/oscuro: ?theme=dark|light o el botón ◐ (se recuerda en este navegador).
  const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  let saved = null;
  try { saved = localStorage.getItem('ap-theme'); } catch (_) {}
  applyTheme(new URLSearchParams(location.search).get('theme') || saved);

  document.addEventListener('DOMContentLoaded', () => {
    started = true;
    document.querySelectorAll('.theme-toggle').forEach((b) => b.addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('ap-theme', next); } catch (_) {}
    }));
    runAll();
    loadAll();
  });
})();
