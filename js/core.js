/* Nembo — utilità, archivio locale, componenti condivisi */
// Stessa stringa di VERSION in sw.js: aumentala insieme a quella ad ogni aggiornamento.
// Essendo dentro un file JS servito dalla cache, se l'aggiornamento automatico fallisce
// questa scritta mostra ancora la versione vecchia — è il modo per accorgersene.
const APP_VERSION = 'nembo-v13';
const { h, render } = preact;
const { useState, useEffect, useRef, useMemo, useCallback } = preactHooks;
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
  radon: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.5 4.2a9 9 0 0 1 9 0l-2.5 4.3a4 4 0 0 0-4 0ZM20.6 16.3a9 9 0 0 1-4.5 7.8l-2.5-4.3a4 4 0 0 0 2-3.5ZM3.4 16.3h5a4 4 0 0 0 2 3.5l-2.5 4.3a9 9 0 0 1-4.5-7.8',
  plus: 'M12 5v14M5 12h14', back: 'M15 18l-6-6 6-6', chev: 'M6 9l6 6 6-6', right: 'M9 18l6-6-6-6',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 13m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  collapse: 'M11 17l-5-5 5-5M18 17l-5-5 5-5', expand: 'M13 17l5-5-5-5M6 17l5-5-5-5',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', sign: 'M3 17c3-4 5-9 7-9s-1 9 2 9 3-5 5-5 2 3 4 3M3 21h18',
  torch: 'M9 2h6v4l-2 3v13h-2V9L9 6z', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', paper: 'M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5',
};
const Icon = ({ n, s = 20, w = 2 }) => html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${P[n]} /></svg>`;

/* ---------------- campi form ---------------- */
function Inp({ label, value, set, type = 'text', disabled, placeholder, list, req, cls = '', inputmode }) {
  return html`<label class=${'fld ' + (req ? 'req ' : '') + cls}><span>${label}</span>
    <input type=${type} value=${value ?? ''} disabled=${disabled} placeholder=${placeholder || ''} list=${list} inputmode=${inputmode}
      onInput=${e => set(e.target.value)} /></label>`;
}
function Area({ label, value, set, rows = 3, disabled, placeholder, cls = '' }) {
  return html`<label class=${'fld ' + cls}><span>${label}</span>
    <textarea rows=${rows} disabled=${disabled} placeholder=${placeholder || ''} value=${value || ''} onInput=${e => set(e.target.value)}></textarea></label>`;
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
    ${!readonly && ids.length < max && html`<button class="addph" aria-label="Aggiungi foto" onClick=${() => inp.current.click()}>
      ${busy ? html`<div style="display:grid;place-items:center;gap:3px"><div class="spin" />${typeof busy === 'string' && html`<small style="font-size:10.5px;font-weight:700">${busy}</small>`}</div>` : html`<${Icon} n="camera" s=${22} />`}</button>`}
    <input ref=${inp} type="file" accept="image/*" capture="environment" multiple hidden onChange=${pick} />
    ${view !== null && html`<${Viewer} ids=${gal} index=${view} labelOf=${labelOf} onClose=${() => setView(null)} />`}
  </div>`;
}
// Visualizzatore a schermo intero: scorri a destra/sinistra (o usa frecce e tastiera) per le altre foto
function Viewer({ ids, index = 0, onClose, labelOf }) {
  useBackClose(onClose);
  const n = ids.length;
  const [i, setI] = useState(Math.min(Math.max(index, 0), n - 1));
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const t = useRef(null);
  const go = d => setI(x => Math.min(n - 1, Math.max(0, x + d)));
  useBlobUrl(ids[i]);                       // fa ridisegnare il componente quando l'immagine è pronta
  const src = urlCache.get(ids[i]) || null; // letta direttamente: niente foto "vecchia" che resta a schermo
  useEffect(() => { blobUrl(ids[i - 1]); blobUrl(ids[i + 1]); }, [i]); // precarica le vicine
  useEffect(() => {
    const k = e => { if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [n]);
  const ts = e => { const p = e.touches[0]; t.current = { x: p.clientX, y: p.clientY, lock: null }; setDrag(true); };
  const tm = e => {
    const s = t.current; if (!s) return;
    const p = e.touches[0], ddx = p.clientX - s.x, ddy = p.clientY - s.y;
    if (s.lock === null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) s.lock = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
    if (s.lock === 'x') setDx((ddx > 0 && i === 0) || (ddx < 0 && i === n - 1) ? ddx / 3 : ddx); // resistenza ai bordi
  };
  const te = () => {
    const s = t.current; t.current = null; setDrag(false);
    if (s && s.lock === 'x') { if (dx < -60) go(1); else if (dx > 60) go(-1); }
    setDx(0);
  };
  const label = labelOf && labelOf(ids[i]);
  const stop = e => e.stopPropagation();
  return html`<div class="viewer" onClick=${onClose} onTouchStart=${ts} onTouchMove=${tm} onTouchEnd=${te} onTouchCancel=${te}>
    <div class="vw-top" onClick=${stop}>
      ${n > 1 && html`<span class="vw-pill">${i + 1} / ${n}</span>`}
      ${label && html`<span class="vw-pill vw-lbl">${label}</span>`}
      <button class="vw-x" aria-label="Chiudi" onClick=${onClose}>×</button>
    </div>
    ${src && html`<img key=${ids[i]} src=${src} alt="Foto ingrandita" draggable="false" onClick=${stop}
      style=${`transform:translateX(${dx}px);transition:${drag ? 'none' : 'transform .2s ease'}`} />`}
    ${n > 1 && html`<button class="vw-nav l" aria-label="Foto precedente" disabled=${i === 0} onClick=${e => { stop(e); go(-1); }}><${Icon} n="back" s=${24} /></button>
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
      <button class="tb-grow" style="background:none;border:0;text-align:left;font-size:13.5px;padding:0" onClick=${() => open(it)}><div>${it.nome}</div></button>
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
  livelloRif: 300,
  msClientId: '', msTenantId: '',
};

// I modelli PDF non sono nel codice pubblicato: si caricano una volta dalle Impostazioni
const TEMPLATES = {
  'radon.pdf': { key: 'tpl_radon', label: 'Scheda raccolta dati radon (PDF compilabile)' },
  'scheda_campioni.pdf': { key: 'tpl_scheda', label: 'Scheda di prelievo campioni massivi' },
};
async function loadTemplate(name) {
  const t = TEMPLATES[name];
  const bytes = t && await DB.get(t.key);
  if (!bytes) throw new Error('carica prima il modello "' + (t ? t.label : name) + '" nelle Impostazioni');
  return new Uint8Array(bytes);
}
async function checkTemplate(name, bytes) {
  const doc = await PDFLib.PDFDocument.load(bytes);
  if (name === 'radon.pdf') {
    const names = doc.getForm().getFields().map(f => f.getName());
    if (doc.getPageCount() !== 2 || !names.includes('Commessa') || !names.includes('Fase 1_20'))
      throw new Error('non è il modulo radon compilabile atteso (2 pagine con i campi R1–R20)');
  } else if (doc.getPageCount() !== 1) throw new Error('la scheda campioni deve essere di una sola pagina');
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
async function notify(level, title, opt = {}) {
  try {
    const list = (await DB.get('notifiche')) || [];
    list.unshift({ id: uid('n'), t: Date.now(), level, title, detail: opt.detail || '', code: opt.code || '', record: opt.record || '', items: (opt.items || []).slice(0, 100), read: false });
    await DB.set('notifiche', list.slice(0, NOTIF_MAX));
    notifSubs.forEach(f => f());
  } catch (e) { console.warn('notifica non salvata', e); }
}
// errore mostrato a schermo e registrato nelle notifiche
function fail(title, e, record) {
  toast(title + ': ' + (e && e.message || e));
  notify('err', title, { detail: String(e && e.message || e), code: errCode(e), record });
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
async function notifMarkRead() {
  const l = (await DB.get('notifiche')) || [];
  if (l.some(n => !n.read)) { await DB.set('notifiche', l.map(n => ({ ...n, read: true }))); notifSubs.forEach(f => f()); }
}
async function notifClear() { await DB.set('notifiche', []); notifSubs.forEach(f => f()); }

/* ---------------- foto negli appunti ---------------- */
function NotePhotos({ rec, field = 'fotoAppunti', up }) {
  const ids = rec[field] || [];
  return html`<div style="margin-top:10px"><${PhotoStrip} ids=${ids} max=${10}
    onAdd=${add => up(p => ({ ...p, [field]: [...(p[field] || []), ...add] }))}
    onRemove=${async id => { await removeBlob(id); up(p => ({ ...p, [field]: (p[field] || []).filter(f => f !== id) })); }} /></div>`;
}
