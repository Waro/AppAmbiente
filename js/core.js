/* Nembo — utilità, archivio locale, componenti condivisi */
// Stessa stringa di VERSION in sw.js: aumentala insieme a quella ad ogni aggiornamento.
// Essendo dentro un file JS servito dalla cache, se l'aggiornamento automatico fallisce
// questa scritta mostra ancora la versione vecchia — è il modo per accorgersene.
const APP_VERSION = 'nembo-v47';

/* ---------------- tema grafico: "essenziale" (predefinito), "originale" o "scuro" ----------------
   Scelta personale, salvata solo su questo dispositivo. Applicata subito, prima del disegno.
   Selettore a 3 vie: sole = Essenziale, ciotola di ramen = Originale, luna = Scuro. */
const THEMES = { essenziale: { l: 'Essenziale', ic: 'sun' }, originale: { l: 'Originale', ic: 'ramen' }, scuro: { l: 'Scuro', ic: 'moon' } };
function getTheme() { try { const t = localStorage.getItem('nembo_theme'); if (THEMES[t]) return t; } catch (e) {} return 'essenziale'; }
function applyTheme(t) {
  if (t === 'originale' || t === 'scuro') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  // il colore della barra di sistema è il fondo del tema (--bg in styles.css)
  const m = document.querySelector('meta[name="theme-color"]'); const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(); if (m && bg) m.setAttribute('content', bg);
}
function setTheme(t) { try { localStorage.setItem('nembo_theme', t); } catch (e) {} applyTheme(t); }
applyTheme(getTheme());

/* ---------------- design system ----------------
   Sullo schermo si usano solo i token di styles.css (colori, testo, raggi, spazi).
   TIPO_COL: il colore di ogni tipo di attività, uguale in menu, «Nuova attività», programmazione e home.
   PRINT: i colori fissi scritti su planimetrie, PDF, Word, Excel ed email; non cambiano con il tema. */
const TIPO_COL = { dda: 'var(--t-dda)', mappatura: 'var(--t-map)', ra: 'var(--t-ra)', radon: 'var(--t-radon)', aria: 'var(--t-aria)',
  hs: 'var(--t-hse)', vs: 'var(--t-vs)', firme: 'var(--t-firme)', app: 'var(--t-app)' };
const PRINT = {
  integro: '#007e46', suscettibile: '#a45f00', danneggiato: '#be222a', nonIspez: '#6f7278', rimosso: '#5b3cb0', nc: '#52555b',
  aria: '#0a6ebd', ariaOver: '#be222a', radon: '#0061c5', rec: '#b7791f',
  terreni: '#855831', acque: '#00708e', mca: '#a21f8f', fav: '#a45f00', altro: '#0076d3',
  firma: '#0b1f6b', testo: '#1c1c1e', critico: '#be222a',
};
const { h, render } = preact;
const { useState, useEffect, useRef, useMemo, useCallback, useErrorBoundary } = preactHooks;
const html = htm.bind(h);

/* ---------------- utilità ---------------- */
const uid = (p = 'r') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);
const fmtD = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const addMonths = (iso, n) => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
const slug = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const fmtN = n => n == null ? '–' : (Math.round(n * 10) / 10).toLocaleString('it-IT');

/* ---------------- IndexedDB ---------------- */
const DB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('nembo', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('records', { keyPath: 'id' });
      d.createObjectStore('blobs', { keyPath: 'id' });
      d.createObjectStore('kv');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = (store, mode, fn) => open().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode); const s = t.objectStore(store);
    let out; const q = fn(s); if (q) q.onsuccess = () => { out = q.result; };
    t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
  }));
  return {
    all: () => tx('records', 'readonly', s => s.getAll()),
    put: r => tx('records', 'readwrite', s => s.put(r)),
    del: id => tx('records', 'readwrite', s => s.delete(id)),
    putBlob: b => tx('blobs', 'readwrite', s => s.put(b)),
    getBlob: id => tx('blobs', 'readonly', s => s.get(id)),
    delBlob: id => tx('blobs', 'readwrite', s => s.delete(id)),
    get: k => tx('kv', 'readonly', s => s.get(k)),
    set: (k, v) => tx('kv', 'readwrite', s => s.put(v, k)),
    keys: () => tx('kv', 'readonly', s => s.getAllKeys()),
    // svuota tutto il database del dispositivo (attività, file, impostazioni, modelli)
    wipe: () => open().then(d => new Promise((res, rej) => {
      const t = d.transaction(['records', 'blobs', 'kv'], 'readwrite');
      ['records', 'blobs', 'kv'].forEach(n => t.objectStore(n).clear());
      t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    })),
  };
})();

// URL delle immagini salvate (cache in memoria)
const urlCache = new Map();
async function blobUrl(id) {
  if (!id) return null;
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await DB.getBlob(id); if (!b) return null;
  const u = URL.createObjectURL(b.blob); urlCache.set(id, u); return u;
}
function useBlobUrl(id) {
  const [u, setU] = useState(urlCache.get(id) || null);
  useEffect(() => { let on = true; blobUrl(id).then(x => on && setU(x)); return () => { on = false; }; }, [id]);
  return u;
}
async function removeBlob(id) {
  if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
  await DB.delBlob(id);
}
// tutti gli id di file contenuti in un record
function blobIds(obj, out = []) {
  if (typeof obj === 'string') { if (obj.startsWith('b_')) out.push(obj); }
  else if (Array.isArray(obj)) obj.forEach(x => blobIds(x, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(x => blobIds(x, out));
  return out;
}

// foto ridimensionata (lato lungo 1600 px, JPEG)
// Riduce la foto a maxSide px sul lato lungo e libera subito la memoria dell'originale
// (su Android, con molte foto di fila, la memoria trattenuta rallenta tutto il browser).
async function shrinkImage(file, maxSide) {
  let bmp = null, fallbackUrl = null;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { fallbackUrl = URL.createObjectURL(file); bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = fallbackUrl; }); }
  try {
    const w = bmp.width, h = bmp.height, k = Math.min(1, maxSide / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    c.width = c.height = 0;
    return out;
  } finally {
    if (bmp && bmp.close) bmp.close();
    if (fallbackUrl) URL.revokeObjectURL(fallbackUrl);
  }
}
async function saveImage(file, maxSide = 1600) {
  const blob = await shrinkImage(file, maxSide);
  const id = uid('b');
  await DB.putBlob({ id, blob, type: 'image/jpeg', name: (file.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg' });
  return id;
}
async function saveFile(file) {
  const id = uid('b');
  await DB.putBlob({ id, blob: file, type: file.type || 'application/octet-stream', name: file.name || 'file' });
  return id;
}

function getPosition() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: +p.coords.latitude.toFixed(5), lon: +p.coords.longitude.toFixed(5) }),
      () => res(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });
}

/* ---------------- condivisione / download ---------------- */
// Chrome richiede un tocco recente per aprire la condivisione: se la preparazione è stata lunga
// mostro un pulsante "Condividi" che fornisce un nuovo tocco.
let _shareAsk = null;
function askShare(info) { return new Promise(res => _shareAsk ? _shareAsk({ ...info, res }) : res(false)); }
async function shareFiles(files, title, opts = {}) {
  // files: [{blob, name}]
  const fs = files.map(f => new File([f.blob], f.name, { type: f.blob.type || 'application/octet-stream' }));
  if (navigator.canShare && navigator.canShare({ files: fs })) {
    if (opts.ask || (navigator.userActivation && !navigator.userActivation.isActive)) {
      const ok = await askShare({ title, n: fs.length, size: fs.reduce((a, f) => a + f.size, 0), label: opts.label });
      if (!ok) return 'cancel';
    }
    try { await navigator.share({ files: fs, title }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancel'; console.warn('share', e); }
  }
  if (opts.noDownload) return 'failed';
  for (const f of files) downloadBlob(f.blob, f.name);
  return 'downloaded';
}
function ShareAsk() {
  const [q, setQ] = useState(null);
  _shareAsk = setQ;
  if (!q) return null;
  const done = v => { setQ(null); q.res(v); };
  return html`<div class="ov" onClick=${e => e.target === e.currentTarget && done(false)}><div class="modal" role="dialog">
    <h4>${q.label || 'File pronti'}</h4>
    <p>${q.n} ${q.n === 1 ? 'file' : 'file'} · ${(q.size / 1048576).toFixed(1)} MB. Nella condivisione scegli OneDrive e la cartella di destinazione.</p>
    <div class="row"><button class="btn" style="flex:1" onClick=${() => done(false)}>Annulla</button>
      <button class="btn pri" style="flex:2" onClick=${() => done(true)}><${Icon} n="share" s=${17} /> Condividi</button></div>
  </div></div>`;
}
function bufToB64(buf) {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
function b64ToBuf(b64) { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 20000);
}

/* ---------------- tasto indietro Android ---------------- */
const Back = (() => {
  const stack = []; let skip = 0;
  window.addEventListener('popstate', () => {
    if (skip > 0) { skip--; return; }
    const f = stack.pop(); if (f) f();
  });
  return {
    push(fn) { history.pushState({ n: stack.length + 1 }, ''); stack.push(fn); },
    // chiusura dall'interfaccia: rimuove la voce e riallinea la cronologia
    pop(fn) { const i = stack.lastIndexOf(fn); if (i < 0) return; stack.splice(i, 1); skip++; history.back(); },
  };
})();
function useBackClose(onClose) {
  const ref = useRef(onClose); ref.current = onClose;
  useEffect(() => {
    const f = () => ref.current();
    Back.push(f);
    return () => Back.pop(f);
  }, []);
}

/* ---------------- toast ---------------- */
let _toast = () => {};
const toast = (t) => _toast(t);
function Toast() {
  const [t, setT] = useState(null); const tm = useRef();
  _toast = (x) => { setT(x); clearTimeout(tm.current); tm.current = setTimeout(() => setT(null), 2600); };
  return t ? html`<div class="toast" role="status">${t}</div>` : null;
}

/* ---------------- icone ---------------- */
const P = {
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10ZM2 21c0-3 1.85-5.36 5.08-6',
  image: 'M4 5h16v14H4ZM4 16l4.5-4.5 4 4 3-3L20 17M15.5 8.5h.01',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14ZM21 21l-4.35-4.35',
  radon: 'M12 12.65m-1.3 0a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0M7.2 4.34A9.6 9.6 0 0 1 16.8 4.34L14.15 8.93A4.3 4.3 0 0 0 9.85 8.93ZM21.6 12.65A9.6 9.6 0 0 1 16.8 20.96L14.15 16.37A4.3 4.3 0 0 0 16.3 12.65ZM7.2 20.96A9.6 9.6 0 0 1 2.4 12.65L7.7 12.65A4.3 4.3 0 0 0 9.85 16.37Z',
  plus: 'M12 5v14M5 12h14', back: 'M15 18l-6-6 6-6', chev: 'M6 9l6 6 6-6', right: 'M9 18l6-6-6-6',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  air: 'M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8',
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  collapse: 'M11 17l-5-5 5-5M18 17l-5-5 5-5', expand: 'M13 17l5-5-5-5M6 17l5-5-5-5',
  today: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M8 14h3v3H8z',
  building: 'M4 21V5l8-3v19M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2M2 21h20',
  nav: 'M3 11l18-8-8 18-2-8-8-2z', check: 'M5 12l5 5 9-10', map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3', stop: 'M6 6h12v12H6z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', spark: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  helmet: 'M2 18h20v2H2zM4 18v-2a8 8 0 0 1 16 0v2M10 6.3V11M14 6.3V11M12 8v-3', x: 'M6 6l12 12M18 6 6 18', bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  note: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', sign: 'M3 17c3-4 5-9 7-9s-1 9 2 9 3-5 5-5 2 3 4 3M3 21h18',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', hl: 'M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4',
  line: 'M5 19 19 5', arrow: 'M5 19 19 5M10 5h9v9', rect: 'M4 6h16v12H4z', circle: 'M3 12a9 8 0 1 0 18 0a9 8 0 1 0-18 0', text: 'M5 6V4h14v2M12 4v16M9 20h6',
  eraser: 'M7 21h13M5.5 15.5l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 19H8.5l-3-3a1 1 0 0 1 0-1.4zM10 11l5 5', tag: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11', redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  drone: 'M10 10h4v4h-4zM10 10 7.6 7.6M14 10l2.4-2.4M10 14l-2.4 2.4M14 14l2.4 2.4M3 5.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M16 5.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M3 18.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M16 18.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  ramen: 'M3 12h18a9 7.5 0 0 1-18 0zM9 21h6M13 11.5 17 3M15.5 11.5 21 4.5M6 9c0-1.2 1.2-1.2 1.2-2.4S6 5.4 6 4.2M9.5 9c0-1.2 1.2-1.2 1.2-2.4S9.5 5.4 9.5 4.2',
  torch: 'M9 2h6v4l-2 3v13h-2V9L9 6z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', paper: 'M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5',
};
const Icon = ({ n, s = 20, w = 2 }) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n]} /></svg>`;

/* ---------------- campi form ---------------- */
/* Dati importati (PMC, anno precedente, mappatura, file JSON o Word): si vedono come testo con un lucchetto.
   Toccando il lucchetto il campo si sblocca; se lo cambi, sotto resta il valore di partenza con «Ripristina».
   imp = valore importato (undefined = campo libero). Gli originali stanno in rec.imp / manufatto.imp. */
const impOf = (o, k) => (o && o.imp && Object.prototype.hasOwnProperty.call(o.imp, k) ? o.imp[k] : undefined);
// registra come importati i campi non vuoti di src (chiavi elencate), con un prefisso facoltativo
function markImp(target, src, keys, pre = '') {
  const m = { ...(target.imp || {}) }; let n = 0;
  for (const k of keys) { const v = src[k]; if (v != null && String(v).trim() !== '') { m[pre + k] = String(v); n++; } }
  if (n) target.imp = m; return target;
}
const markImpSelf = (o, keys) => markImp(o, o, keys);
const IMP_ANAG = ['commessa', 'cliente', 'citta', 'indirizzo', 'sito', 'insegna', 'provincia', 'incaricoDal', 'incaricoAl'];
function useLock(imp, value, type) {
  const [open, setOpen] = useState(false); const ref = useRef();
  const locked = imp !== undefined && !open;
  const changed = imp !== undefined && String(value ?? '') !== String(imp);
  const show = v => (type === 'date' ? fmtD(v) : v) || '—';
  const unlock = () => { setOpen(true); setTimeout(() => { const el = ref.current; if (el) { el.focus(); try { const n = String(el.value).length; el.setSelectionRange(n, n); } catch (e) { /* data */ } } }, 30); };
  return { locked, changed, show, unlock, ref, open, lock: () => setOpen(false) };
}
function LockView({ label, value, L, cls = '', req }) {
  return html`<div class=${'fld lockf ' + (req ? 'req ' : '') + cls}><span>${label}</span>
    <div class="lockv"><span class="t">${L.show(value)}</span>
      <button type="button" class="lockb" aria-label=${'Sblocca ' + (label || 'il campo')} title="Dato importato: tocca per modificarlo" onClick=${L.unlock}><${Icon} n="lock" s=${15} /></button></div>
    ${L.changed && html`<small class="impd">Modificato</small>`}</div>`;
}
const ImpNote = ({ L, imp, set }) => L.changed ? html`<small class="impd">Valore importato: «${L.show(imp)}» <button type="button" class="btn link sm" onClick=${() => { set(imp); L.lock(); }}>Ripristina</button></small>` : null;
function Inp({ label, value, set, type = 'text', disabled, placeholder, list, req, cls = '', inputmode, imp }) {
  const L = useLock(imp, value, type);
  if (L.locked) return html`<${LockView} label=${label} value=${value} L=${L} cls=${cls} req=${req} />`;
  return html`<label class=${'fld ' + (req ? 'req ' : '') + cls}><span>${label}</span>
    <input ref=${L.ref} type=${type} value=${value ?? ''} disabled=${disabled} placeholder=${placeholder || ''} list=${list} inputmode=${inputmode}
      onInput=${e => set(e.target.value)} /><${ImpNote} L=${L} imp=${imp} set=${set} /></label>`;
}
// campo di una riga che va a capo e cresce col testo (ubicazioni lunghe leggibili sul telefono)
function growFit(el) { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; } }
function InpGrow({ label, value, set, disabled, placeholder, cls = '', list, imp }) {
  const L = useLock(imp, value);
  useEffect(() => growFit(L.ref.current), [value, L.locked]);
  useEffect(() => { const f = () => growFit(L.ref.current); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  if (L.locked) return html`<${LockView} label=${label} value=${value} L=${L} cls=${cls} />`;
  return html`<label class=${'fld ' + cls}>${label && html`<span>${label}</span>`}
    <textarea ref=${L.ref} class="grow" rows="1" disabled=${disabled} placeholder=${placeholder || ''} value=${value ?? ''}
      onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
      onInput=${e => { set(e.target.value.replace(/\n/g, ' ')); growFit(e.target); }}></textarea><${ImpNote} L=${L} imp=${imp} set=${set} /></label>`;
}
function Area({ label, value, set, rows = 3, disabled, placeholder, cls = '', imp }) {
  const L = useLock(imp, value);
  if (L.locked) return html`<${LockView} label=${label} value=${value} L=${L} cls=${cls} />`;
  return html`<label class=${'fld ' + cls}><span>${label}</span>
    <textarea ref=${L.ref} rows=${rows} disabled=${disabled} placeholder=${placeholder || ''} value=${value || ''} onInput=${e => set(e.target.value)}></textarea><${ImpNote} L=${L} imp=${imp} set=${set} /></label>`;
}

/* ---------------- foto ---------------- */
function Thumb({ id, onRemove, onOpen }) {
  const u = useBlobUrl(id);
  return html`<div class="ph">${u && html`<img src=${u} alt="Foto" onClick=${() => onOpen && onOpen()} />`}
    ${onRemove && html`<button class="x" aria-label="Elimina foto" onClick=${onRemove}>×</button>`}</div>`;
}
function PhotoStrip({ ids = [], max = 10, onAdd, onRemove, readonly, gallery, labelOf }) {
  const inp = useRef(); const [busy, setBusy] = useState(false); const [view, setView] = useState(null);
  const gal = gallery && gallery.length ? gallery : ids;
  const pick = async e => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    setBusy(true);
    try { const list = files.slice(0, max - ids.length), out = []; for (const [i, f] of list.entries()) { if (list.length > 1) setBusy(`${i + 1}/${list.length}`); out.push(await saveImage(f)); } if (out.length) await onAdd(out); }
    catch (err) { fail('Foto non salvata', err); }
    setBusy(false);
  };
  return html`<div class="photos">
    ${ids.map(id => html`<${Thumb} key=${id} id=${id} onOpen=${() => setView(Math.max(0, gal.indexOf(id)))} onRemove=${readonly ? null : () => { if (confirm('Eliminare la foto?')) onRemove(id); }} />`)}
    ${!readonly && ids.length < max && html`<button class="addph" aria-label="Aggiungi foto" onClick=${() => camOpen(inp.current)}>
      ${busy ? html`<div style="display:grid;place-items:center;gap:3px"><div class="spin" />${typeof busy === 'string' && html`<small style="font-size:var(--fs-2xs);font-weight:700">${busy}</small>`}</div>` : html`<${Icon} n="camera" s=${22} />`}</button>
      ${!busy && html`<button class="addph gal" aria-label="Scegli dalla galleria" title="Scegli dalla galleria" onClick=${() => galOpen(inp.current)}><${Icon} n="image" s=${20} /></button>`}`}
    <input ref=${inp} type="file" accept="image/*" capture="environment" multiple hidden onChange=${pick} />
    ${view !== null && html`<${Viewer} ids=${gal} index=${view} labelOf=${labelOf} onClose=${() => setView(null)} />`}
  </div>`;
}
// Visualizzatore a schermo intero: scorri a destra/sinistra (o usa frecce e tastiera) per le altre foto.
// Zoom: due dita o doppio tocco sul telefono, rotella o doppio clic sul PC; con la foto ingrandita si trascina per muoversi.
function Viewer({ ids, index = 0, onClose, labelOf }) {
  useBackClose(onClose);
  const n = ids.length;
  const [i, setI] = useState(Math.min(Math.max(index, 0), n - 1));
  const [dx, setDx] = useState(0);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const [anim, setAnim] = useState(true);
  const box = useRef(); const zr = useRef(z); zr.current = z;
  const P = useRef(new Map()); const g = useRef(null); const lastTap = useRef({ t: 0, x: 0, y: 0 }); const moved = useRef(false);
  const go = d => setI(x => Math.min(n - 1, Math.max(0, x + d)));
  useEffect(() => { setZ({ s: 1, x: 0, y: 0 }); }, [i]);
  useBlobUrl(ids[i]);                       // fa ridisegnare il componente quando l'immagine è pronta
  const src = urlCache.get(ids[i]) || null; // letta direttamente: niente foto "vecchia" che resta a schermo
  useEffect(() => { blobUrl(ids[i - 1]); blobUrl(ids[i + 1]); }, [i]); // precarica le vicine
  useEffect(() => {
    const k = e => { if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [n]);
  // coordinate rispetto al centro dello schermo
  const rel = e => { const r = box.current.getBoundingClientRect(); return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2, w: r.width, h: r.height }; };
  const clamp = q => {
    const s = Math.min(6, Math.max(1, q.s)); if (s <= 1.01) return { s: 1, x: 0, y: 0 };
    const r = box.current.getBoundingClientRect(), mx = (s - 1) * r.width / 2, my = (s - 1) * r.height / 2;
    return { s, x: Math.max(-mx, Math.min(mx, q.x)), y: Math.max(-my, Math.min(my, q.y)) };
  };
  const zoomAt = (m, s1) => { const q = zr.current; const k = s1 / q.s; return clamp({ s: s1, x: m.x - (m.x - q.x) * k, y: m.y - (m.y - q.y) * k }); };
  const down = e => {
    if (e.target.closest('button')) return;
    box.current.setPointerCapture && box.current.setPointerCapture(e.pointerId);
    P.current.set(e.pointerId, rel(e)); setAnim(false); moved.current = false;
    const pts = [...P.current.values()];
    if (pts.length === 2) { const [a, b] = pts; g.current = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, z: zr.current }; }
    else if (pts.length === 1) g.current = { start: pts[0], z: zr.current, lock: null };
  };
  const move = e => {
    if (!P.current.has(e.pointerId)) return;
    P.current.set(e.pointerId, rel(e));
    const G = g.current; if (!G) return;
    const pts = [...P.current.values()];
    if (G.pinch && pts.length >= 2) {
      const [a, b] = pts, d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s1 = Math.min(6, Math.max(1, G.z.s * d / G.d)), k = s1 / G.z.s;
      setZ(clamp({ s: s1, x: m.x - (G.m.x - G.z.x) * k, y: m.y - (G.m.y - G.z.y) * k })); moved.current = true; return;
    }
    if (pts.length !== 1 || G.pinch) return;
    const p = pts[0], ddx = p.x - G.start.x, ddy = p.y - G.start.y;
    if (Math.abs(ddx) > 6 || Math.abs(ddy) > 6) moved.current = true;
    if (G.z.s > 1) { setZ(clamp({ s: G.z.s, x: G.z.x + ddx, y: G.z.y + ddy })); return; }
    if (G.lock === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) G.lock = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
    if (G.lock === 'x') setDx((ddx > 0 && i === 0) || (ddx < 0 && i === n - 1) ? ddx / 3 : ddx); // resistenza ai bordi
  };
  const up = e => {
    const had = P.current.get(e.pointerId); P.current.delete(e.pointerId); setAnim(true);
    const G = g.current;
    if (G && G.pinch) { if (P.current.size === 1) { const p = [...P.current.values()][0]; g.current = { start: p, z: zr.current, lock: 'pan' }; } else g.current = null; return; }
    g.current = null;
    if (G && G.lock === 'x' && G.z.s === 1) { if (dx < -60) go(1); else if (dx > 60) go(-1); }
    setDx(0);
    // doppio tocco: ingrandisce dove tocchi, oppure torna alla foto intera
    if (had && !moved.current && e.pointerType !== 'mouse') {
      const now = Date.now(), L = lastTap.current;
      if (now - L.t < 300 && Math.hypot(had.x - L.x, had.y - L.y) < 30) { setZ(zr.current.s > 1 ? { s: 1, x: 0, y: 0 } : zoomAt(had, 2.5)); lastTap.current = { t: 0, x: 0, y: 0 }; moved.current = true; }
      else lastTap.current = { t: now, x: had.x, y: had.y };
    }
  };
  const wheel = e => { e.preventDefault(); const m = rel(e); setAnim(false); setZ(zoomAt(m, zr.current.s * Math.exp(-e.deltaY * 0.0022))); };
  const dbl = e => { e.preventDefault(); const m = rel(e); setAnim(true); setZ(zr.current.s > 1 ? { s: 1, x: 0, y: 0 } : zoomAt(m, 2.5)); };
  useEffect(() => { const el = box.current; el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel); }, [i]);
  // tocco sullo sfondo (fuori dalla foto) chiude, solo con la foto intera e senza trascinare
  // (con il pointer capture il clic arriva sempre allo sfondo: controllo cosa c'è davvero sotto il dito)
  const click = e => { const el = document.elementFromPoint(e.clientX, e.clientY); if (el === box.current && !moved.current && zr.current.s === 1 && e.detail < 2) setTimeout(() => { if (zr.current.s === 1 && !moved.current) onClose(); }, 260); };
  const label = labelOf && labelOf(ids[i]);
  const stop = e => e.stopPropagation();
  return html`<div class=${'viewer' + (z.s > 1 ? ' zoomed' : '')} ref=${box} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onDblClick=${dbl} onClick=${click}>
    <div class="vw-top" onClick=${stop}>
      ${n > 1 && html`<span class="vw-pill">${i + 1} / ${n}</span>`}
      ${label && html`<span class="vw-pill vw-lbl">${label}</span>`}
      ${z.s > 1 && html`<button class="vw-pill vw-zoom" onClick=${() => { setAnim(true); setZ({ s: 1, x: 0, y: 0 }); }}>${Math.round(z.s * 10) / 10}× · Foto intera</button>`}
      <button class="vw-x" aria-label="Chiudi" onClick=${onClose}>×</button>
    </div>
    ${src && html`<img key=${ids[i]} src=${src} alt="Foto ingrandita" draggable="false"
      style=${`transform:translate(${z.x + dx}px,${z.y}px) scale(${z.s});transition:${anim && !P.current.size ? 'transform .2s ease' : 'none'}`} />`}
    ${n > 1 && z.s === 1 && html`<button class="vw-nav l" aria-label="Foto precedente" disabled=${i === 0} onClick=${e => { stop(e); go(-1); }}><${Icon} n="back" s=${24} /></button>
      <button class="vw-nav r" aria-label="Foto successiva" disabled=${i === n - 1} onClick=${e => { stop(e); go(1); }}><${Icon} n="right" s=${24} /></button>`}
  </div>`;
}

/* ---------------- allegati (documenti) ---------------- */
function FileList({ items = [], onAdd, onRemove, accept = '*/*', label = 'Allega documento' }) {
  const inp = useRef();
  const open = async it => { const b = await DB.getBlob(it.blobId); if (b) window.open(URL.createObjectURL(b.blob), '_blank'); };
  const pick = async e => {
    for (const f of [...e.target.files]) onAdd({ id: uid('d'), nome: f.name, blobId: await saveFile(f) });
    e.target.value = '';
  };
  return html`<div class="stack">
    ${items.map(it => html`<div class="row" key=${it.id}>
      <span class="sq plain"><${Icon} n="file" s=${18} /></span>
      <button class="tb-grow" style="background:none;border:0;text-align:left;font-size:var(--fs-md);padding:0" onClick=${() => open(it)}><div>${it.nome}</div></button>
      <button class="x" aria-label="Rimuovi" onClick=${() => { if (confirm('Rimuovere ' + it.nome + '?')) onRemove(it); }}>×</button></div>`)}
    <button class="btn dashed" onClick=${() => inp.current.click()}><${Icon} n="paper" s=${17} /> ${label}</button>
    <input ref=${inp} type="file" accept=${accept} multiple hidden onChange=${pick} />
  </div>`;
}

/* ---------------- salvataggio automatico ---------------- */
function useAutosave(initial, onSave) {
  const [rec, setRec] = useState(initial);
  const t = useRef(); const latest = useRef(initial); const dirty = useRef(false);
  const [saved, setSaved] = useState(true);
  const flush = () => { clearTimeout(t.current); if (dirty.current) { dirty.current = false; onSave(latest.current); setSaved(true); } };
  const update = useCallback(fn => {
    setRec(prev => {
      const next = typeof fn === 'function' ? fn(prev) : { ...prev, ...fn };
      next.updatedAt = Date.now();
      latest.current = next; dirty.current = true; setSaved(false);
      clearTimeout(t.current); t.current = setTimeout(flush, 500);
      return next;
    });
  }, []);
  useEffect(() => {
    const vis = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); flush(); };
  }, []);
  return [rec, update, saved];
}

/* ---------------- impostazioni ---------------- */
const DEFAULT_SETTINGS = {
  tecnicoNome: '', tecnicoCognome: '', firmaTecnico: '',
  prelevatoDa: '', verificatoDa: '', emailReferti: '',
  labNome: '', labR1: '', labR2: '', offerta: '', offertaRev: '',
  mcaCodice: '', mcaDesc: '', favCodice: '', favDesc: '',
  livelloRif: 300, buDefault: 'ambiente',
  ariaCampionatori: [], ariaTaratura: '', ariaProfili: {}, // monitoraggio aria
  supportEmail: '', // destinatario di "Segnala un problema" (solo nel file di configurazione)
  // valori proposti nei nuovi sopralluoghi HSE (restano nel file di configurazione, mai nel codice)
  firmeEnte: '', firmeModelli: [], odSync: true, durate: {},
  hsCommEsteso: '', hsCommSint: '', hsVerificato: '', hsApprovato: '', hsFirma: '', hsDeveloper: '', hsPropertyManager: '', hsProcuratore: '', hsTecnici: '',
  msClientId: '', msTenantId: '',
};

// I modelli PDF non sono nel codice pubblicato: si caricano una volta dalle Impostazioni
const TEMPLATES = {
  'radon.pdf': { key: 'tpl_radon', label: 'Scheda raccolta dati radon (PDF compilabile)', bu: 'ambiente' },
  'scheda_campioni.pdf': { key: 'tpl_scheda', label: 'Schede di prelievo campioni massivi e aria (PDF)', bu: 'ambiente' },
  'scheda_campioni.xlsx': { key: 'tpl_scheda_xlsx', label: 'Schede di prelievo campioni massivi e aria (Excel)', bu: 'ambiente', xlsx: true },
  'hs_esteso.docx': { key: 'tpl_hs_esteso', label: 'Modello Word HSE Esteso', bu: 'hs', docx: true },
  'hs_sintetico.docx': { key: 'tpl_hs_sintetico', label: 'Modello Word HSE Sintetico', bu: 'hs', docx: true },
  'vs.docx': { key: 'tpl_vs', label: 'Modello Word Verbale HSE', bu: 'hs', docx: true },
};
async function loadTemplate(name) {
  const t = TEMPLATES[name];
  const bytes = t && await DB.get(t.key);
  if (!bytes) throw new Error('carica prima il modello "' + (t ? t.label : name) + '" nelle Impostazioni');
  return new Uint8Array(bytes);
}
async function checkTemplate(name, bytes) {
  if (/\.docx$/.test(name)) return hsCheckTemplate(name, bytes);
  if (/\.xlsx$/.test(name)) {
    const z = await JSZip.loadAsync(bytes).catch(() => null); const wb = z && z.file('xl/workbook.xml') && await z.file('xl/workbook.xml').async('string');
    if (!wb || !/name="[^"]*MASSIVI/i.test(wb)) throw new Error('non è il modello Excel atteso (serve il foglio MASSIVI, e ARIA per il monitoraggio dell\'aria)');
    return;
  }
  await needLib('pdflib');
  const doc = await PDFLib.PDFDocument.load(bytes);
  if (name === 'radon.pdf') {
    const names = doc.getForm().getFields().map(f => f.getName());
    if (doc.getPageCount() !== 2 || !names.includes('Commessa') || !names.includes('Fase 1_20'))
      throw new Error('non è il modulo radon compilabile atteso (2 pagine con i campi R1–R20)');
  } else if (![1, 2].includes(doc.getPageCount())) throw new Error('le schede di prelievo devono avere 1 pagina (solo massivi) o 2 pagine (massivi e aria)');
}

/* ---------------- luoghi: città e indirizzo prima del codice sito ---------------- */
// Solo città + indirizzo (stringa vuota se mancano entrambi)
function placeAddr(r) {
  const ind = (r.indirizzo || '').trim(), cit = (r.citta || '').trim();
  if (ind && cit && !ind.toLowerCase().includes(cit.toLowerCase())) return `${cit} · ${ind}`;
  return ind || cit;
}
// Etichetta per gli elenchi: indirizzo, poi il sito come ripiego
function placeLabel(r) { return placeAddr(r) || (r.sito || '').trim() || 'Indirizzo da indicare'; }
// Per i documenti (PDF, Excel, Word): sito e indirizzo, quelli presenti
function placeDoc(r) { return [(r.sito || '').trim(), placeAddr(r)].filter(Boolean).join(' – '); }

/* ---------------- notifiche: storico di esiti ed errori ---------------- */
const NOTIF_MAX = 200;
const notifSubs = new Set();
// codice errore leggibile: quello esplicito, un codice Microsoft (AADSTS…) o lo stato HTTP
function errCode(e) {
  if (!e) return '';
  if (e.code) return String(e.code);
  if (e.errorCode) return String(e.errorCode);
  const msg = String(e.message || e);
  const a = /\b(AADSTS\d+)\b/.exec(msg); if (a) return a[1];
  const h = /^(\d{3})\b/.exec(msg); if (h) return 'HTTP ' + h[1];
  return e.name && e.name !== 'Error' ? e.name : '';
}
// level: 'ok' | 'warn' | 'err'
// le scritture sono in coda: due notifiche nello stesso istante non si sovrascrivono
let notifQ = Promise.resolve();
function notify(level, title, opt = {}) {
  const n = { id: uid('n'), t: Date.now(), level, title, detail: opt.detail || '', code: opt.code || '', record: opt.record || '', ids: opt.ids || [], items: (opt.items || []).slice(0, 100), read: false };
  notifQ = notifQ.then(async () => {
    const list = (await DB.get('notifiche')) || [];
    list.unshift(n);
    await DB.set('notifiche', list.slice(0, NOTIF_MAX));
    notifSubs.forEach(f => f());
  }).catch(e => console.warn('notifica non salvata', e));
  return notifQ;
}
// errore mostrato a schermo e registrato nelle notifiche
function fail(title, e, record, ids) {
  toast(title + ': ' + (e && e.message || e));
  notify('err', title, { detail: String(e && e.message || e), code: errCode(e), record, ids });
  if (e) console.error(e);
}
function useNotifiche() {
  const [list, setList] = useState([]);
  useEffect(() => {
    const load = () => DB.get('notifiche').then(l => setList(l || []));
    load(); notifSubs.add(load); return () => notifSubs.delete(load);
  }, []);
  return list;
}
function notifMarkRead() {
  notifQ = notifQ.then(async () => {
    const l = (await DB.get('notifiche')) || [];
    if (l.some(n => !n.read)) { await DB.set('notifiche', l.map(n => ({ ...n, read: true }))); notifSubs.forEach(f => f()); }
  }).catch(e => console.warn(e));
  return notifQ;
}
function notifClear() { notifQ = notifQ.then(async () => { await DB.set('notifiche', []); notifSubs.forEach(f => f()); }).catch(e => console.warn(e)); return notifQ; }

/* ---------------- librerie caricate solo quando servono ---------------- */
// Excel, Word, lettura e scrittura PDF pesano più di 2 MB: all'avvio non servono.
// I file restano nella cache del service worker, quindi funzionano anche offline.
const LIBS = {
  exceljs: ['vendor/exceljs.min.js', () => window.ExcelJS],
  docx: ['vendor/docx.umd.min.js', () => window.docx],
  pdfjs: ['vendor/pdfjs.min.js', () => window.pdfjsLib || window['pdfjs-dist/build/pdf']],
  pdflib: ['vendor/pdf-lib.min.js', () => window.PDFLib],
};
const libP = {};
function needLib(k) {
  const [src, get] = LIBS[k];
  if (get()) return Promise.resolve(get());
  if (!libP[k]) libP[k] = new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = src; el.async = true;
    el.onload = () => get() ? res(get()) : rej(Object.assign(new Error('libreria ' + k + ' non disponibile'), { code: 'LIB-LOAD' }));
    el.onerror = () => { delete libP[k]; el.remove(); rej(Object.assign(new Error('libreria ' + k + ' non caricata: riapri l\'app con la rete attiva'), { code: 'LIB-LOAD' })); };
    document.head.appendChild(el);
  });
  return libP[k];
}

/* ---------------- errori dell'app ---------------- */
// Gli errori non gestiti (bug) finiscono nelle Notifiche con codice APP-JS, senza ripetizioni.
const appErr = { seen: new Map(), n: 0, toasted: false };
function reportAppError(e, where) {
  try {
    const msg = String((e && e.message) || e || 'errore sconosciuto');
    if (/ResizeObserver loop|^Script error\.?$/i.test(msg)) return;
    const now = Date.now(); const last = appErr.seen.get(msg);
    if (last && now - last < 60000) return;
    appErr.seen.set(msg, now); if (++appErr.n > 15) return;
    const stack = String((e && e.stack) || '').split('\n').slice(0, 5).map(l => l.trim()).join('\n');
    const page = (location.hash || '').slice(0, 60);
    notify('err', 'Errore dell\'app', { code: 'APP-JS', detail: [msg, stack && stack !== msg ? stack : '', where, 'Schermata: ' + (page || 'Oggi') + ' · ' + APP_VERSION].filter(Boolean).join('\n') });
    if (!appErr.toasted) { appErr.toasted = true; toast('Si è verificato un errore: i dettagli sono nelle Notifiche'); }
  } catch (x) { console.warn(x); }
}
addEventListener('error', ev => reportAppError(ev.error || ev.message, ev.filename ? ev.filename.split('/').pop() + ':' + ev.lineno : ''));
addEventListener('unhandledrejection', ev => reportAppError(ev.reason));

/* ---------------- segnala un problema ---------------- */
function deviceInfo() {
  const ua = navigator.userAgent;
  const os = /Android [\d.]+/.exec(ua)?.[0] || (/iPhone|iPad/.test(ua) ? 'iOS ' + ((/OS ([\d_]+)/.exec(ua) || [])[1] || '').replace(/_/g, '.') : /Windows NT [\d.]+/.exec(ua)?.[0] || /Mac OS X [\d_]+/.exec(ua)?.[0]?.replace(/_/g, '.') || (/Linux/.test(ua) ? 'Linux' : 'sistema non riconosciuto'));
  const br = /Edg\/[\d]+/.exec(ua)?.[0] || /Chrome\/[\d]+/.exec(ua)?.[0] || /Version\/[\d.]+ .*Safari/.test(ua) && 'Safari' || 'browser non riconosciuto';
  const inst = matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'installata' : 'nel browser';
  return `${os} · ${br} · ${screen.width}×${screen.height} · app ${inst}`;
}
async function issueText() {
  const list = ((await DB.get('notifiche')) || []).filter(n => n.level === 'err').slice(0, 5);
  const errs = list.map(n => `- ${new Date(n.t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · ${n.title}${n.code ? ' · ' + n.code : ''}${n.detail ? '\n  ' + String(n.detail).split('\n')[0].slice(0, 200) : ''}`);
  return ['Descrivi qui cosa stavi facendo e cosa è successo:', '', '', '', '— Dati tecnici (non modificare) —',
    'Versione: ' + APP_VERSION, 'Dispositivo: ' + deviceInfo(), 'Data: ' + new Date().toLocaleString('it-IT'),
    'Ultimi errori:', ...(errs.length ? errs : ['nessuno'])].join('\n');
}
async function reportIssue(settings) {
  const body = (await issueText()).slice(0, 1800);
  const to = (settings && settings.supportEmail) || '';
  location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent('Nembo · segnalazione (' + APP_VERSION + ')')}&body=${encodeURIComponent(body)}`;
}
async function copyIssue() {
  try { await navigator.clipboard.writeText(await issueText()); toast('Segnalazione copiata: incollala in un messaggio'); } catch (e) { toast('Copia non riuscita'); }
}


/* ---------------- foto negli appunti ---------------- */
function NotePhotos({ rec, field = 'fotoAppunti', up }) {
  const ids = rec[field] || [];
  const tk = field === 'fotoAppunti' ? 'tagAppunti' : 'tag' + field.slice(4); // tag degli appunti
  return html`<div style="margin-top:10px"><${PhotoStrip} ids=${ids} max=${10}
    onAdd=${add => up(p => ({ ...p, [field]: [...(p[field] || []), ...add] }))}
    onRemove=${async id => { await removeBlob(id); up(p => ({ ...p, [field]: (p[field] || []).filter(f => f !== id) })); }} />
    <${TagPicker} tags=${rec[tk] || []} set=${t => up({ [tk]: t })} /></div>`;
}

/* ---------------- tag delle note ----------------
   Un tag è un testo breve. Quelli già usati in qualunque attività (campi "tag…") vengono proposti. */
function collectTags(o, cnt = {}) {
  if (Array.isArray(o)) o.forEach(x => collectTags(x, cnt));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if (/^tag/.test(k) && Array.isArray(v)) v.forEach(t => { if (typeof t === 'string' && t.trim()) { const key = t.trim(); cnt[key] = (cnt[key] || 0) + 1; } });
    else if (v && typeof v === 'object') collectTags(v, cnt);
  }
  return cnt;
}
// colore del tag: tavolozza di colori diversi tra loro e da quelli dei tipi di attività (MCA, FAV, radon, aria, RA, HSE).
// Ogni tag ha il suo colore: si parte dal nome e, se il colore è già preso da un altro tag, si passa al successivo.
const TAG_PAL = ['#0f8b8d', '#5b4fd6', '#c2416b', '#6b8e23', '#8b5e3c', '#e07a5f', '#3d5a80', '#0ca678', '#e5007d', '#b08968', '#5e548e', '#495057', '#2b9348', '#d1495b', '#00798c', '#9a6324'];
let _tagCol = {};
const tagHash = t => { let h = 2166136261; for (const ch of String(t).toLowerCase()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
function setTagList(list) {
  const used = new Set(); _tagCol = {};
  [...list].sort((a, b) => a.localeCompare(b, 'it')).forEach(t => {
    let k = tagHash(t) % TAG_PAL.length, n = 0;
    while (used.has(k) && n < TAG_PAL.length) { k = (k + 1) % TAG_PAL.length; n++; }
    if (n < TAG_PAL.length) { used.add(k); _tagCol[t.toLowerCase()] = TAG_PAL[k]; }
    else _tagCol[t.toLowerCase()] = `hsl(${tagHash(t) % 360} 55% 38%)`;
  });
}
function tagColor(t) { return _tagCol[String(t).toLowerCase()] || TAG_PAL[tagHash(t) % TAG_PAL.length]; }
const tagStyle = (t, on) => { const c = tagColor(t); return on ? `background:${c};color:var(--on-dark)` : `background:color-mix(in srgb, ${c} 14%, var(--card));color:${c}`; };
async function knownTags() { const cnt = collectTags(await DB.all()); const L = Object.keys(cnt); setTagList(L); return L.sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b, 'it')); }
function TagPicker({ tags = [], set, label = 'Tag' }) {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [known, setKnown] = useState([]);
  useEffect(() => { if (open) knownTags().then(setKnown); }, [open]);
  const has = t => tags.some(x => x.toLowerCase() === t.toLowerCase());
  const addT = t => { t = (t || '').trim().replace(/^#/, ''); if (!t || has(t)) { setQ(''); return; } if (!known.some(x => x.toLowerCase() === t.toLowerCase())) { const L = [...known, t]; setKnown(L); setTagList(L); } set([...tags, t]); setQ(''); };
  const sugg = known.filter(t => !has(t) && (!q || t.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 12);
  const nuovo = q.trim() && !known.some(t => t.toLowerCase() === q.trim().toLowerCase()) && !has(q.trim());
  return html`<div class="tags">
    <div class="tags-row">${tags.map(t => html`<span class="tag" key=${t} style=${tagStyle(t)}>#${t}<button aria-label=${'Togli il tag ' + t} onClick=${() => set(tags.filter(x => x !== t))}>×</button></span>`)}
      <button class="tag add" onClick=${() => setOpen(o => !o)}>${open ? 'Chiudi' : '+ ' + label}</button></div>
    ${open && html`<div class="tags-pick">
      <input class="inp" value=${q} placeholder="Scrivi un tag o scegline uno" onInput=${e => setQ(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') { e.preventDefault(); addT(q); } }} />
      <div class="tags-row">${nuovo && html`<button class="tag new" onClick=${() => addT(q)}>Crea “${q.trim()}”</button>`}
        ${sugg.map(t => html`<button class="tag sugg" key=${t} style=${'color:' + tagColor(t)} onClick=${() => addT(t)}>#${t}</button>`)}
        ${!sugg.length && !nuovo && html`<span class="lock">${known.length ? 'Nessun altro tag' : 'Ancora nessun tag: scrivine uno'}</span>`}</div></div>`}
  </div>`;
}

/* ---------------- componenti dello stile "Essenziale" ---------------- */
// Titolo grande: occhiello, titolo, sottotitolo e pulsanti a destra. cls "top" = nascosto su tablet in orizzontale (c'è la barra superiore)
function LargeTitle({ eye, title, sub, acts, top }) {
  return html`<div class=${'lt' + (top ? ' top' : '')}><div class="lt-row"><div>
    ${eye && html`<div class="lt-eye">${eye}</div>`}<div class="lt-title">${title}</div>${sub && html`<div class="lt-sub">${sub}</div>`}</div>
    ${acts && html`<div class="lt-acts">${acts}</div>`}</div></div>`;
}
// Intestazione delle schede di dettaglio (stessa sul telefono e nel pannello affiancato)
function DetailHead({ eye, title, sub, saved, onClose }) {
  return html`<div class="dh"><div>
      <div class="lt-eye">${eye}${saved !== undefined && html` · <span class="saved">${saved ? 'Salvato' : 'Salvataggio…'}</span>`}</div>
      <div class="dh-title">${title}</div>${sub && html`<div class="dh-sub">${sub}</div>`}</div>
    ${onClose && html`<button class="btn-icon" aria-label="Chiudi" onClick=${onClose}><${Icon} n="x" s=${18} /></button>`}</div>`;
}
// Anello di avanzamento in SVG (p da 0 a 1)
function Ring({ p = 0, size = 96, w = 9, color = 'var(--blue)', track, children }) {
  const r = (size - w) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, p || 0));
  return html`<svg width=${size} height=${size} viewBox=${`0 0 ${size} ${size}`} style="transform:rotate(-90deg);display:block" aria-hidden="true">
    <circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" style=${'stroke:' + (track || `color-mix(in srgb, ${color} 14%, transparent)`)} stroke-width=${w} />
    ${v > 0 && html`<circle cx=${size / 2} cy=${size / 2} r=${r} fill="none" style=${'stroke:' + color} stroke-width=${w} stroke-linecap="round" stroke-dasharray=${`${c * v} ${c}`} />`}${children}</svg>`;
}
function Toggle({ on, set, label }) {
  return html`<button class=${'tgl' + (on ? ' on' : '')} role="switch" aria-checked=${!!on} aria-label=${label} onClick=${() => set(!on)}></button>`;
}
function Stepper({ n, dec, inc, label, min = 0 }) {
  return html`<div class="stp" role="group" aria-label=${label}>
    <button aria-label="Togli" disabled=${n <= min} onClick=${dec}>−</button><b>${n}</b><button aria-label="Aggiungi" onClick=${inc}>+</button></div>`;
}
// Barra azioni in fondo alla scheda: 1 secondario + 1 primario
// Schede di un'attività (Anagrafica, contenuto, Firme). Nembo ricorda l'ultima aperta per ogni tipo;
// la ricerca porta alla scheda giusta con l'evento nembo-goto ("tab:chiave" oppure l'id di un elemento, tramite i prefissi di map).
function useSchede(type, keys, isNew, map = {}) {
  const [t, setT] = useState(() => {
    if (isNew) return keys[0];
    try { const v = localStorage.getItem('nembo_tab_' + type); if (keys.includes(v)) return v; } catch (e) { /* senza memoria */ }
    return keys[1] || keys[0];
  });
  const set = k => { setT(k); try { localStorage.setItem('nembo_tab_' + type, k); } catch (e) { /* senza memoria */ } };
  useEffect(() => {
    const h = e => { const a = String(e.detail || ''); const k = a.startsWith('tab:') ? a.slice(4) : (Object.entries(map).find(([p]) => a.startsWith(p)) || [])[1]; if (k && keys.includes(k)) setT(k); };
    addEventListener('nembo-goto', h); return () => removeEventListener('nembo-goto', h);
  }, [keys.join()]);
  return [keys.includes(t) ? t : keys[0], set];
}
function Schede({ tabs, value, set }) {
  const ref = useRef();
  const pick = k => { if (k === value) return; set(k); const c = ref.current && ref.current.closest('.content'); if (c) c.scrollTop = 0; };
  return html`<div class="seg schede" ref=${ref} role="tablist">${tabs.map(x => html`<button key=${x.k} role="tab" aria-selected=${value === x.k} class=${value === x.k ? 'on' : ''} onClick=${() => pick(x.k)}>
    ${x.l}${x.n > 0 && html`<small class="sch-n">${x.n}</small>`}</button>`)}</div>`;
}
// tasto OneDrive per la barra azioni della scheda Anagrafica
function OdBtn({ r, settings }) {
  return html`<button class="btn pri" onClick=${() => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings)}><${Icon} n="share" s=${20} /> ${OD.account ? 'Carica su OneDrive' : 'Invia a OneDrive'}</button>`;
}
function ActionBar({ children }) { return html`<div class="abar">${children}</div>`; }
/* Barra in basso delle attività, uguale ovunque: a sinistra uno strumento (planimetria, fotocamera…),
   al centro l'azione principale, a destra «Opzioni» con tutte le azioni dell'attività raggruppate.
   gruppi: [[titolo, [{ ic, l, s, fn, danger, hide }]]] */
function BarraAtt({ left, center, gruppi, r, settings }) {
  const [o, setO] = useState(false);
  // il foglio sta fuori dalla barra: la barra ha un filtro di sfondo che farebbe da riferimento per position: fixed
  return html`<${ActionBar}>${left || null}${center}
    <button class="btn-icon lg" aria-label="Opzioni" title="Opzioni" onClick=${() => setO(true)}><${Icon} n="more" s=${24} w=${3} /></button><//>
    ${o && html`<${OpzioniSheet} gruppi=${gruppi} r=${r} settings=${settings} onClose=${() => setO(false)} />`}`;
}
function OpzioniSheet({ gruppi, r, settings, onClose }) {
  useBackClose(onClose);
  const [riep, setRiep] = useState(false);
  // il riepilogo via email e l'email al cliente ci sono in tutte le attività
  const cli = r && typeof clienteDi === 'function' ? clienteDi(r.cliente) : null;
  const condividi = r ? [r.type !== 'firme' && { ic: 'mail', l: 'Riepilogo via email', s: 'Valutazioni e foto da inviare per email', fn: () => setRiep(true), keep: true },
    cli && cli.mail && (cli.mailA || cli.email) && { ic: 'share', l: 'Email al cliente', s: (cli.mailA || cli.email), fn: () => mailCliente(r, settings) }] : [];
  const G = [['Condividi', condividi], ...gruppi].map(([t, L]) => [t, (L || []).filter(x => x && !x.hide)]).filter(([, L]) => L.length);
  if (riep) return html`<${RiepilogoSheet} r=${r} settings=${settings} onClose=${() => { setRiep(false); onClose(); }} />`;
  const run = x => { if (x.keep) { x.fn(); return; } onClose(); setTimeout(x.fn, 80); };
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}>
    <div class="sheet" role="dialog" aria-label="Opzioni dell'attività">
      <div class="sheet-grab"></div>
      <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>Opzioni</b><span></span></div>
      <div class="sheet-body">${G.map(([t, L], gi) => html`<div key=${t}>
        <div class="sec-h" style=${gi ? '' : 'margin-top:4px'}><h3>${t}</h3></div>
        <div class="opz">${L.map((x, i) => html`<button key=${i} class=${'opz-it' + (x.danger ? ' danger' : '')} disabled=${x.disabled} onClick=${() => run(x)}>
          <span class="opz-ic"><${Icon} n=${x.ic || 'file'} s=${19} /></span><span class="t"><b>${x.l}</b>${x.s && html`<small>${x.s}</small>`}</span></button>`)}</div></div>`)}
      </div></div></div>`;
}
// voci di archivio comuni: foglio firme, ZIP, elimina
function opzArchivio({ r, settings, onDelete, firme, elimina = 'Elimina' }) {
  return ['Archivio', [
    firme && { ic: 'sign', l: 'Prepara il foglio firme', s: 'Con i dati dell’attività e l’elenco di campioni o manufatti', fn: firme },
    { ic: 'archive', l: 'Salva tutto in un file ZIP', fn: () => exportRecords([r], settings) },
    { ic: 'trash', l: elimina, danger: true, fn: () => onDelete(r) }]];
}
const scrollToId = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
// Foto rapida dalla riga dell'elenco (segnaposto rosso "manca la foto")
function QuickPhoto({ onAdd, label = 'Scatta la foto' }) {
  const inp = useRef(); const [busy, setBusy] = useState(false);
  const pick = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy(true); try { await onAdd([await saveImage(f)]); } catch (err) { fail('Foto non salvata', err); } setBusy(false);
  };
  return html`<button class="ph-miss" aria-label=${label} onClick=${e => { e.stopPropagation(); camOpen(inp.current); }}>
    ${busy ? html`<div class="spin" style="border-color:var(--sep);border-top-color:var(--danger)" />` : html`<${Icon} n="camera" s=${20} />`}
    <input ref=${inp} type="file" accept="image/*" capture="environment" hidden onClick=${e => e.stopPropagation()} onChange=${pick} /></button>`;
}
function Thumb44({ id, dot }) {
  const u = useBlobUrl(id);
  return html`<span class="thumb44">${u && html`<img src=${u} alt="" />`}${dot && html`<i class="md" style=${'background:' + dot}></i>`}</span>`;
}
