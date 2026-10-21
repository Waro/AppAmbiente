/* Planimetrie: visualizzazione con PDF.js, disegno ed etichette dei campioni.
   Due dita: zoom e spostamento (sempre). Un dito, il mouse o la penna: lo strumento scelto.
   Con «Solo penna» il dito sposta la pianta e solo la penna scrive.
   Le annotazioni si salvano come dati (per poterle modificare) e vengono fuse in un nuovo PDF con pdf-lib.
   Oggetti di una pagina (annot[pagina].strokes):
     tratti vecchi  { p: 'red'|'blue'|'black'|'hl', w, pts }
     penna/evid.    { t: 'pen'|'hl', c, w, pts }
     linea/freccia  { t: 'line'|'arrow', c, w, pts: [x1, y1, x2, y2] }
     rett./cerchio  { t: 'rect'|'ell', c, w, pts: [x1, y1, x2, y2] }
     testo          { t: 'text', c, fs, x, y, s }   (x, y = angolo in alto a sinistra)
   Coordinate in unità della pagina (viewport PDF.js a scala 1). */

const PDFJS = () => window.pdfjsLib || window['pdfjs-dist/build/pdf'];
function pdfjsReady() {
  const lib = PDFJS();
  if (lib && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs.worker.min.js';
  return lib;
}
async function openPdf(bytes) {
  await needLib('pdfjs');
  // isEvalSupported:false chiude la vulnerabilità dei font nelle versioni 3.x
  return pdfjsReady().getDocument({ data: bytes, isEvalSupported: false, disableFontFace: false }).promise;
}

// penne dei tratti vecchi (prima della v45)
const PENS = [
  { k: 'red', c: '#d62828', w: 2.2, o: 1, l: 'Rosso' },
  { k: 'blue', c: '#1d4ed8', w: 2.2, o: 1, l: 'Blu' },
  { k: 'black', c: '#111111', w: 2.2, o: 1, l: 'Nero' },
  { k: 'hl', c: '#facc15', w: 14, o: 0.4, l: 'Evidenziatore' },
];
const PLAN_COLORS = ['#d62828', '#ea580c', '#facc15', '#15803d', '#0891b2', '#1d4ed8', '#7c3aed', '#111111'];
const PLAN_SIZES = [1, 2, 4, 8];        // spessori (× unità della pagina / 800)
const PLAN_FONTS = [9, 13, 19, 28];     // dimensioni del testo (× unità della pagina / 800)
const PLAN_TOOLS = [
  { k: 'pen', ic: 'pen', l: 'Penna' }, { k: 'hl', ic: 'hl', l: 'Evidenziatore' },
  { k: 'line', ic: 'line', l: 'Linea' }, { k: 'arrow', ic: 'arrow', l: 'Freccia' },
  { k: 'rect', ic: 'rect', l: 'Rettangolo' }, { k: 'ell', ic: 'circle', l: 'Cerchio' },
  { k: 'text', ic: 'text', l: 'Testo' }, { k: 'eraser', ic: 'eraser', l: 'Gomma' },
  { k: 'label', ic: 'tag', l: 'Etichette' },
];
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
// oggetto normalizzato: i tratti vecchi diventano penna o evidenziatore
function planObj(s) {
  if (s.t) return { o: s.t === 'hl' ? 0.4 : 1, ...s };
  const p = PENS.find(q => q.k === s.p) || PENS[0];
  return { ...s, t: p.k === 'hl' ? 'hl' : 'pen', c: p.c, o: p.o };
}
const ELL_N = 64;
const ellPts = (x1, y1, x2, y2) => { const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2; const o = []; for (let i = 0; i <= ELL_N; i++) { const a = i / ELL_N * Math.PI * 2; o.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a)); } return o; };
const rectPts = (x1, y1, x2, y2) => [x1, y1, x2, y1, x2, y2, x1, y2, x1, y1];
// punte della freccia: due segmenti dalla punta
function arrowHead(x1, y1, x2, y2, w) {
  const L = Math.max(w * 4.5, 8), a = Math.atan2(y2 - y1, x2 - x1), d = Math.PI / 7;
  return [[x2, y2, x2 - L * Math.cos(a - d), y2 - L * Math.sin(a - d)], [x2, y2, x2 - L * Math.cos(a + d), y2 - L * Math.sin(a + d)]];
}
// polilinee che compongono un oggetto (per disegno, esportazione e gomma)
function planPolys(o) {
  const [x1, y1, x2, y2] = o.pts || [];
  if (o.t === 'pen' || o.t === 'hl') return [o.pts];
  if (o.t === 'line') return [[x1, y1, x2, y2]];
  if (o.t === 'arrow') return [[x1, y1, x2, y2], ...arrowHead(x1, y1, x2, y2, o.w)];
  if (o.t === 'rect') return [rectPts(x1, y1, x2, y2)];
  if (o.t === 'ell') return [ellPts(x1, y1, x2, y2)];
  return [];
}
const textLines = o => String(o.s || '').split('\n');
const textBox = o => { const L = textLines(o); return { x: o.x, y: o.y, w: Math.max(...L.map(l => l.length)) * o.fs * 0.56, h: L.length * o.fs * 1.2 }; };
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0;
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function planHit(o, x, y, tol) {
  if (o.t === 'text') { const b = textBox(o); return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol; }
  const t = tol + (o.w || 0) / 2;
  for (const p of planPolys(o)) {
    if (p.length === 2 && Math.hypot(x - p[0], y - p[1]) <= t) return true;
    for (let i = 2; i < p.length; i += 2) if (segDist(x, y, p[i - 2], p[i - 1], p[i], p[i + 1]) <= t) return true;
  }
  return false;
}
// disegno su canvas (contesto già scalato in unità della pagina)
function planPaint(x, objs) {
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (const s of objs) {
    const o = planObj(s);
    x.globalAlpha = o.o; x.strokeStyle = o.c; x.fillStyle = o.c;
    if (o.t === 'text') {
      x.font = `600 ${o.fs}px Helvetica, Arial, sans-serif`; x.textBaseline = 'alphabetic';
      textLines(o).forEach((l, i) => x.fillText(l, o.x, o.y + o.fs * (0.85 + i * 1.2)));
      continue;
    }
    x.lineWidth = o.w;
    for (const p of planPolys(o)) {
      x.beginPath();
      if (p.length === 2) { x.arc(p[0], p[1], o.w / 2, 0, Math.PI * 2); x.fill(); continue; }
      x.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) x.lineTo(p[i], p[i + 1]);
      x.stroke();
    }
  }
  x.globalAlpha = 1;
}
// il carattere che Helvetica (WinAnsi) non sa scrivere diventa «?»
const winAnsi = (font, s) => [...s].map(ch => { try { font.encodeText(ch); return ch; } catch (e) { return '?'; } }).join('');

/* ---------------- fusione nel PDF ---------------- */
// labelsById: { ref: { text, color } } — le etichette orfane (campione eliminato) vengono saltate
async function mergePlan(origBytes, annot, labelsById) {
  await needLib('pdflib');
  const { PDFDocument, rgb, StandardFonts, degrees, LineCapStyle } = PDFLib;
  const doc = await PDFDocument.load(origBytes, { ignoreEncryption: true });
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const js = await openPdf(origBytes.slice(0));
  for (const [pi, a] of Object.entries(annot || {})) {
    const idx = +pi; if (idx >= doc.getPageCount()) continue;
    const page = doc.getPage(idx);
    const vp = (await js.getPage(idx + 1)).getViewport({ scale: 1 });
    const P = (x, y) => { const [px, py] = vp.convertToPdfPoint(x, y); return { x: px, y: py }; };
    const rot = vp.rotation || 0;
    const ang = rot * Math.PI / 180;
    for (const s of a.strokes || []) {
      const o = planObj(s); const [r, g, b] = hexRgb(o.c || '#d62828'); const color = rgb(r, g, b);
      if (o.t === 'text') {
        const t0 = P(o.x, o.y);
        textLines(o).forEach((l, i) => {
          const dy = -o.fs * (0.85 + i * 1.2);
          const t = { x: t0.x - dy * Math.sin(ang), y: t0.y + dy * Math.cos(ang) };
          if (l) page.drawText(winAnsi(bold, l), { x: t.x, y: t.y, size: o.fs, font: bold, color, rotate: degrees(rot) });
        });
        continue;
      }
      for (const p of planPolys(o)) {
        if (p.length === 2) { page.drawCircle({ ...P(p[0], p[1]), size: o.w / 2, color, opacity: o.o }); continue; }
        // un solo tracciato: l'evidenziatore resta trasparente in modo uniforme anche dove il tratto si sovrappone
        let d = '';
        for (let i = 0; i < p.length; i += 2) { const q = P(p[i], p[i + 1]); d += (i ? ' L' : 'M') + q.x.toFixed(2) + ' ' + (-q.y).toFixed(2); }
        page.drawSvgPath(d, { x: 0, y: 0, borderColor: color, borderWidth: o.w, borderOpacity: o.o, borderLineCap: LineCapStyle.Round });
      }
    }
    for (const l of a.labels || []) {
      const info = labelsById[l.ref]; if (!info) continue;
      const fs = l.fs; const text = String(info.text || '?');
      const tw = bold.widthOfTextAtSize(text, fs), padX = fs * 0.45, h = fs * 1.5, w = tw + padX * 2;
      const [r, g, b] = hexRgb(info.color || '#0076d3');
      // l.x, l.y = centro dell'etichetta in coordinate di visualizzazione
      const c = P(l.x, l.y);
      // rettangolo e testo ruotati con la pagina, così restano dritti a video
      const off = (dx, dy) => ({ x: c.x + dx * Math.cos(ang) - dy * Math.sin(ang), y: c.y + dx * Math.sin(ang) + dy * Math.cos(ang) });
      const o = off(-w / 2, -h / 2);
      page.drawRectangle({ x: o.x, y: o.y, width: w, height: h, color: rgb(r, g, b), borderColor: rgb(1, 1, 1), borderWidth: fs * 0.12, rotate: degrees(rot) });
      const t = off(-tw / 2, -fs * 0.35);
      page.drawText(text, { x: t.x, y: t.y, size: fs, font: bold, color: rgb(1, 1, 1), rotate: degrees(rot) });
    }
  }
  await js.destroy();
  return doc.save();
}

/* ---------------- visualizzatore ---------------- */
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* senza memoria */ } };
const DRAW_TOOLS = ['pen', 'hl', 'line', 'arrow', 'rect', 'ell', 'eraser'];

// plan: { id, nome, blobId, annot, mergedBlobId }
// labels: [{ ref, text, color }] disponibili (campioni o punti R)
function PlanViewer({ plan, labels, onChange, onClose }) {
  useBackClose(() => close());
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  const [pageN, setPageN] = useState(0);
  const [tool, setTool] = useState(() => lsGet('nembo_plan_tool', 'pen'));
  const [color, setColor] = useState(() => lsGet('nembo_plan_color', PLAN_COLORS[0]));
  const [size, setSize] = useState(() => lsGet('nembo_plan_size', 1));
  const [soloPenna, setSoloPenna] = useState(() => lsGet('nembo_solo_penna', false));
  const [pop, setPop] = useState(false);       // pannello colore e spessore
  const [sel, setSel] = useState(null);        // etichetta scelta dal vassoio
  const [edit, setEdit] = useState(null);      // testo in modifica { i (indice o -1), x, y, fs, c, s }
  const [annot, setAnnot] = useState(() => JSON.parse(JSON.stringify(plan.annot || {})));
  const [dims, setDims] = useState(null);      // pagina disegnata: { w, h (px CSS), scale (px per unità), dpr, bw, bh (unità) }
  const [rz, setRz] = useState(1);             // zoom a cui è disegnato il PDF
  const [, tick] = useState(0);
  const [saving, setSaving] = useState(false);
  const wrap = useRef(), pageEl = useRef(), cv = useRef(), ov = useRef(), edRef = useRef();
  const bytesRef = useRef(null), dirty = useRef(false), act = useRef(null), ptrs = useRef(new Map());
  const view = useRef({ z: 1, tx: 10, ty: 10, fit: 1 }); // z = zoom rispetto a «pagina larga quanto lo schermo»
  const hist = useRef({});                     // per pagina: { u: [], r: [] }
  const annotRef = useRef(annot); annotRef.current = annot;
  const dimsRef = useRef(dims); dimsRef.current = dims;
  const editRef = useRef(edit); editRef.current = edit;
  const settle = useRef();
  useEffect(() => lsSet('nembo_plan_tool', tool), [tool]);
  useEffect(() => lsSet('nembo_plan_color', color), [color]);
  useEffect(() => lsSet('nembo_plan_size', size), [size]);
  useEffect(() => lsSet('nembo_solo_penna', soloPenna), [soloPenna]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const b = await DB.getBlob(plan.blobId); if (!b) throw new Error('file non trovato');
        const bytes = new Uint8Array(await b.blob.arrayBuffer()); bytesRef.current = bytes;
        const d = await openPdf(bytes.slice(0)); if (!dead) setDoc(d);
      } catch (e) { if (!dead) setErr(e.message); }
    })();
    return () => { dead = true; };
  }, []);

  // posizione e zoom: trasformazione CSS della pagina (fluida durante i gesti)
  const applyView = () => {
    const el = pageEl.current, d = dimsRef.current; if (!el || !d) return;
    const v = view.current; const k = v.z * v.fit / d.scale;
    el.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${k})`;
  };
  // pagina nuova: adatta alla larghezza
  useEffect(() => { view.current = { ...view.current, z: 1, tx: 10, ty: 10, ready: false }; setRz(1); setEdit(null); }, [pageN]);

  // rendering della pagina al livello di zoom rz (nitida anche ingrandita)
  useEffect(() => {
    if (!doc) return; let dead = false, task;
    (async () => {
      const page = await doc.getPage(pageN + 1);
      const base = page.getViewport({ scale: 1 });
      const cw = wrap.current.clientWidth - 20;
      const fit = cw / base.width; view.current.fit = fit;
      if (!view.current.ready) { view.current.tx = Math.max(10, (wrap.current.clientWidth - base.width * fit) / 2); view.current.ty = Math.max(10, (wrap.current.clientHeight - base.height * fit) / 2); view.current.ready = true; }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let scale = fit * rz;
      const maxPx = 14e6; // limite di memoria del canvas sui telefoni
      if (base.width * scale * dpr * base.height * scale * dpr > maxPx) scale = Math.sqrt(maxPx / (base.width * base.height)) / dpr;
      const vp = page.getViewport({ scale: scale * dpr });
      // disegno fuori schermo, poi copia: niente lampeggio durante lo zoom
      const off = document.createElement('canvas'); off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
      task = page.render({ canvasContext: off.getContext('2d'), viewport: vp });
      try { await task.promise; } catch (e) { return; }
      if (dead) return;
      const c = cv.current; c.width = off.width; c.height = off.height; c.getContext('2d').drawImage(off, 0, 0);
      c.style.width = (vp.width / dpr) + 'px'; c.style.height = (vp.height / dpr) + 'px';
      const nd = { w: vp.width / dpr, h: vp.height / dpr, scale, dpr, bw: base.width, bh: base.height };
      // dimensioni, posizione e annotazioni aggiornate nello stesso fotogramma del PDF
      dimsRef.current = nd; const pg = pageEl.current; if (pg) { pg.style.width = nd.w + 'px'; pg.style.height = nd.h + 'px'; pg.style.visibility = ''; }
      applyView(); paint(); setDims(nd);
    })();
    return () => { dead = true; if (task) task.cancel(); };
  }, [doc, pageN, rz]);
  useEffect(applyView, [dims]);

  // ridisegno delle annotazioni
  const pa = annot[pageN] || { strokes: [], labels: [] };
  const paint = () => {
    const d = dimsRef.current, c = ov.current; if (!d || !c) return;
    const W = Math.floor(d.w * d.dpr), H = Math.floor(d.h * d.dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; c.style.width = d.w + 'px'; c.style.height = d.h + 'px'; }
    const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    x.setTransform(d.dpr * d.scale, 0, 0, d.dpr * d.scale, 0, 0);
    const cur = annotRef.current[pageN] || { strokes: [] };
    const a = act.current;
    const ed = editRef.current; const hide = ed && ed.i >= 0 ? ed.i : -1;
    planPaint(x, [...(cur.strokes || []).filter((_, i) => i !== hide), ...(a && a.obj ? [a.obj] : [])]);
  };
  useEffect(paint, [dims, annot, pageN, edit]);
  const raf = useRef(0);
  const repaint = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; paint(); }); };

  // modifiche con storia (indietro / avanti), separata per pagina
  const H = () => (hist.current[pageN] = hist.current[pageN] || { u: [], r: [] });
  const snap = () => { const c = annotRef.current[pageN] || { strokes: [], labels: [] }; return { strokes: (c.strokes || []).slice(), labels: (c.labels || []).slice() }; };
  const setPageRaw = next => {
    const a = { ...annotRef.current, [pageN]: next }; annotRef.current = a; dirty.current = true; setAnnot(a); onChange({ annot: a });
  };
  const commit = fn => { const h = H(); h.u.push(snap()); if (h.u.length > 100) h.u.shift(); h.r = []; setPageRaw(fn(snap())); };
  const undo = () => { const h = H(); if (!h.u.length) return; h.r.push(snap()); setPageRaw(h.u.pop()); setEdit(null); };
  const redo = () => { const h = H(); if (!h.r.length) return; h.u.push(snap()); setPageRaw(h.r.pop()); setEdit(null); };
  const canU = !!(hist.current[pageN] && hist.current[pageN].u.length), canR = !!(hist.current[pageN] && hist.current[pageN].r.length);

  const round = v => Math.round(v * 10) / 10;
  const unit = () => (dimsRef.current ? dimsRef.current.bw / 800 : 1);
  const toPage = e => { const r = pageEl.current.getBoundingClientRect(), d = dimsRef.current; return [(e.clientX - r.left) * d.bw / r.width, (e.clientY - r.top) * d.bh / r.height]; };
  const pxToUnits = () => { const r = pageEl.current.getBoundingClientRect(); return dimsRef.current.bw / r.width; };
  const scheduleRender = () => { clearTimeout(settle.current); settle.current = setTimeout(() => { const z = view.current.z; setRz(r => (Math.abs(r - z) / z > 0.05 ? z : r)); }, 220); };
  const zoomAt = (cx, cy, z) => {
    const v = view.current, wr = wrap.current.getBoundingClientRect();
    z = Math.max(0.3, Math.min(12, z));
    const px = cx - wr.left, py = cy - wr.top;
    v.tx = px - (px - v.tx) * z / v.z; v.ty = py - (py - v.ty) * z / v.z; v.z = z;
    applyView(); scheduleRender();
  };

  // ---------- puntatori: due dita = zoom e spostamento; uno = strumento ----------
  const startTool = (e, t) => {
    const [x, y] = toPage(e); const u = unit();
    if (t === 'pen' || t === 'hl') { act.current = { k: 'draw', obj: { t, c: color, w: round(PLAN_SIZES[size] * u * (t === 'hl' ? 5 : 1)), pts: [round(x), round(y)] } }; repaint(); }
    else if (['line', 'arrow', 'rect', 'ell'].includes(t)) act.current = { k: 'shape', x0: x, y0: y, obj: null, t };
    else if (t === 'eraser') { act.current = { k: 'erase', before: snap(), hit: false }; erase(x, y); }
  };
  const erase = (x, y) => {
    const a = act.current; const tol = 10 * pxToUnits();
    const cur = annotRef.current[pageN] || { strokes: [], labels: [] };
    const keep = (cur.strokes || []).filter(s => !planHit(planObj(s), x, y, tol));
    if (keep.length !== (cur.strokes || []).length) { a.hit = true; const nx = { ...cur, strokes: keep }; annotRef.current = { ...annotRef.current, [pageN]: nx }; repaint(); }
  };
  // la gomma toglie gli oggetti mentre passa; a fine gesto diventa un solo passo della storia
  const endErase = a => { if (!a || a.k !== 'erase' || !a.hit) return; a.hit = false; const after = annotRef.current[pageN]; annotRef.current = { ...annotRef.current, [pageN]: a.before }; commit(() => after); };
  const down = e => {
    if (!dimsRef.current) return;
    if (editRef.current) { commitText(); return; }
    const el = wrap.current; try { el.setPointerCapture(e.pointerId); } catch (er) { /* già catturato */ }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    if (ptrs.current.size >= 2) {
      // secondo dito: annulla quello che stava facendo il primo e passa allo zoom
      endErase(act.current);
      act.current = null; repaint();
      const [p1, p2] = [...ptrs.current.values()];
      act.current = { k: 'pinch', d0: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1, m0: [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2], v0: { ...view.current } };
      return;
    }
    // fuori dal foglio si sposta soltanto
    const [px0, py0] = toPage(e), d0 = dimsRef.current;
    const fuori = px0 < 0 || py0 < 0 || px0 > d0.bw || py0 > d0.bh;
    const panOnly = fuori || e.button === 1 || e.button === 2 || (soloPenna && e.pointerType === 'touch');
    if (!panOnly && DRAW_TOOLS.includes(tool)) { e.preventDefault(); startTool(e, tool); return; }
    act.current = { k: 'pan', x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, tap: !panOnly && (tool === 'text' || tool === 'label'), e0: { clientX: e.clientX, clientY: e.clientY } };
  };
  const move = e => {
    const p = ptrs.current.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    const a = act.current; if (!a) return;
    if (a.k === 'pinch') {
      if (ptrs.current.size < 2) return;
      const [p1, p2] = [...ptrs.current.values()];
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y), m = [(p1.x + p2.x) / 2, (p1.y + p2.y) / 2];
      const v = view.current, wr = wrap.current.getBoundingClientRect();
      const z = Math.max(0.3, Math.min(12, a.v0.z * d / a.d0));
      const mx = a.m0[0] - wr.left, my = a.m0[1] - wr.top;
      v.z = z; v.tx = m[0] - wr.left - (mx - a.v0.tx) * z / a.v0.z; v.ty = m[1] - wr.top - (my - a.v0.ty) * z / a.v0.z;
      applyView(); return;
    }
    if (a.k === 'pan') {
      if (a.tap && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) > 8) a.tap = false;
      view.current.tx += e.clientX - a.x; view.current.ty += e.clientY - a.y; a.x = e.clientX; a.y = e.clientY; applyView(); return;
    }
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (a.k === 'draw') {
      const pts = a.obj.pts; const step = 1.5 * pxToUnits();
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = toPage(ev); const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
        if (Math.hypot(x - lx, y - ly) < step) continue;
        pts.push(round(x), round(y));
      }
      repaint();
    } else if (a.k === 'shape') {
      let [x, y] = toPage(e);
      a.obj = { t: a.t, c: color, w: round(PLAN_SIZES[size] * unit()), pts: [round(a.x0), round(a.y0), round(x), round(y)] };
      repaint();
    } else if (a.k === 'erase') { const [x, y] = toPage(e); erase(x, y); }
  };
  const up = e => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    const a = act.current;
    if (a && a.k === 'pinch') {
      // resta un dito: continua come spostamento, senza disegnare
      const rest = [...ptrs.current.values()][0];
      act.current = rest ? { k: 'pan', x: rest.x, y: rest.y, sx: rest.x, sy: rest.y, tap: false } : null;
      scheduleRender(); return;
    }
    act.current = null;
    if (!a || e.type === 'pointercancel') { endErase(a); repaint(); return; }
    if (a.k === 'draw') { const o = a.obj; commit(c => ({ ...c, strokes: [...c.strokes, o] })); }
    else if (a.k === 'shape') {
      const o = a.obj; const minL = 4 * pxToUnits();
      if (o && Math.hypot(o.pts[2] - o.pts[0], o.pts[3] - o.pts[1]) > minL) commit(c => ({ ...c, strokes: [...c.strokes, o] })); else repaint();
    } else if (a.k === 'erase') endErase(a);
    else if (a.k === 'pan' && a.tap) tapAt(a.e0);
  };
  // tocco singolo con Testo o Etichette
  const tapAt = e => {
    const [x, y] = toPage(e);
    if (tool === 'label') {
      if (!sel) return;
      const d = dimsRef.current, pw = d.bw;
      const fs = round(Math.min(pw / 25, Math.max(pw / 120, 15 * pxToUnits())));
      commit(c => ({ ...c, labels: [...c.labels, { ref: sel.ref, x: round(x), y: round(y), fs }] }));
      setSel(null);
    } else if (tool === 'text') {
      const cur = annotRef.current[pageN] || { strokes: [] };
      const i = (cur.strokes || []).findIndex(s => s.t === 'text' && planHit(s, x, y, 4 * pxToUnits()));
      if (i >= 0) { const o = cur.strokes[i]; setEdit({ i, x: o.x, y: o.y, fs: o.fs, c: o.c, s: o.s }); }
      else setEdit({ i: -1, x: round(x), y: round(y - PLAN_FONTS[size] * unit() * 0.6), fs: round(PLAN_FONTS[size] * unit()), c: color, s: '' });
    }
  };
  useEffect(() => { if (edit && edRef.current) setTimeout(() => edRef.current && edRef.current.focus(), 30); }, [edit && edit.i, edit && edit.x]);
  const commitText = () => {
    const ed = editRef.current; if (!ed) return; editRef.current = null; setEdit(null);
    const s = String(ed.s || '').replace(/\s+$/, '');
    const cur = annotRef.current[pageN] || { strokes: [] };
    if (ed.i >= 0) {
      const old = cur.strokes[ed.i];
      if (!s) commit(c => ({ ...c, strokes: c.strokes.filter((_, j) => j !== ed.i) }));
      else if (old && (old.s !== s || old.c !== ed.c || old.fs !== ed.fs)) commit(c => { const st = c.strokes.slice(); st[ed.i] = { ...old, s, c: ed.c, fs: ed.fs }; return { ...c, strokes: st }; });
    } else if (s) commit(c => ({ ...c, strokes: [...c.strokes, { t: 'text', c: ed.c, fs: ed.fs, x: ed.x, y: ed.y, s }] }));
  };
  // rotella: sposta; con Ctrl (o il pinch del trackpad) ingrandisce
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const wh = e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, view.current.z * Math.exp(-e.deltaY * 0.01));
      else { view.current.tx -= e.deltaX; view.current.ty -= e.deltaY; applyView(); }
    };
    el.addEventListener('wheel', wh, { passive: false });
    return () => el.removeEventListener('wheel', wh);
  }, []);
  const zoomBtn = f => { const r = wrap.current.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, view.current.z * f); };

  // trascinamento delle etichette già posizionate (strumento Etichette)
  const dragLabel = (i, e) => {
    if (tool !== 'label' || ptrs.current.size) return;
    e.stopPropagation(); e.preventDefault();
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const before = snap(); let moved = false;
    const mv = ev => { moved = true; const [x, y] = toPage(ev); const cur = annotRef.current[pageN]; const ls = cur.labels.slice(); ls[i] = { ...ls[i], x: round(x), y: round(y) }; const a = { ...annotRef.current, [pageN]: { ...cur, labels: ls } }; annotRef.current = a; setAnnot(a); };
    const end = () => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', end); el.removeEventListener('pointercancel', end);
      if (!moved) return; const after = annotRef.current[pageN]; annotRef.current = { ...annotRef.current, [pageN]: before }; commit(() => after);
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  };
  const removeLabel = i => commit(cur => ({ ...cur, labels: cur.labels.filter((_, j) => j !== i) }));

  const placedRefs = new Set(Object.values(annot).flatMap(a => (a.labels || []).map(l => l.ref)));
  const tray = labels.filter(l => !placedRefs.has(l.ref));
  const byRef = Object.fromEntries(labels.map(l => [l.ref, l]));

  async function close() {
    if (editRef.current) commitText();
    if (dirty.current && bytesRef.current) {
      setSaving(true);
      try {
        const out = await mergePlan(bytesRef.current.slice(0), annotRef.current, byRef);
        const hasAny = Object.values(annotRef.current).some(a => (a.strokes || []).length || (a.labels || []).length);
        if (plan.mergedBlobId) await removeBlob(plan.mergedBlobId);
        let mergedBlobId = null;
        if (hasAny) {
          mergedBlobId = uid('b');
          await DB.putBlob({ id: mergedBlobId, blob: new Blob([out], { type: 'application/pdf' }), type: 'application/pdf', name: slug(plan.nome) + '_annotata.pdf' });
        }
        onChange({ annot: annotRef.current, mergedBlobId, mergedAt: hasAny ? Date.now() : null });
        toast(hasAny ? 'Planimetria annotata salvata' : 'Annotazioni rimosse');
      } catch (e) { fail('PDF annotato non creato', e); }
      setSaving(false);
    }
    if (doc) doc.destroy();
    onClose();
  }

  const pickTool = k => { if (editRef.current) commitText(); setTool(k); setPop(false); if (k !== 'label') setSel(null); };
  const isText = tool === 'text';
  const nPages = doc ? doc.numPages : 0;
  const d = dims;
  return html`<div class="planwrap" role="dialog" aria-label=${'Planimetria ' + plan.nome}>
    <div class="plan-top">
      <button class="btn sm" onClick=${() => history.back()} disabled=${saving}>${saving ? html`<div class="spin" />` : 'Fine'}</button>
      <b class="tb-grow"><div>${plan.nome}</div></b>
      ${nPages > 1 && html`<div class="row" style="gap:4px"><button class="sq plain" aria-label="Pagina precedente" disabled=${pageN === 0} onClick=${() => setPageN(pageN - 1)}>‹</button>
        <span style="font-size:13px;font-weight:700;min-width:44px;text-align:center">${pageN + 1}/${nPages}</span>
        <button class="sq plain" aria-label="Pagina successiva" disabled=${pageN >= nPages - 1} onClick=${() => setPageN(pageN + 1)}>›</button></div>`}
      <button class="sq plain" aria-label="Riduci" onClick=${() => zoomBtn(1 / 1.5)}>−</button>
      <button class="sq plain" aria-label="Ingrandisci" onClick=${() => zoomBtn(1.5)}>+</button>
    </div>
    <div class="plan-view" ref=${wrap} onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up} onContextMenu=${e => e.preventDefault()}>
      ${err && html`<div class="notice err" style="margin:16px">${err}</div>`}
      ${!doc && !err && html`<div class="empty">Apro la planimetria…</div>`}
      <div class="plan-page" ref=${pageEl} style=${d ? `width:${d.w}px;height:${d.h}px` : 'visibility:hidden'}>
        <canvas ref=${cv}></canvas>
        <canvas ref=${ov} class="plan-ov"></canvas>
        ${d && (pa.labels || []).map((l, i) => {
          const info = byRef[l.ref]; if (!info) return null;
          const fsPx = l.fs * d.scale;
          return html`<div class=${'plan-lbl' + (tool === 'label' ? ' drag' : '')} key=${i} style=${`left:${l.x * d.scale}px;top:${l.y * d.scale}px;font-size:${fsPx}px;background:${info.color}`}
            onPointerDown=${e => dragLabel(i, e)}>${info.text}
            ${tool === 'label' && html`<button class="plan-lbl-x" aria-label=${'Rimuovi ' + info.text} onPointerDown=${e => e.stopPropagation()} onClick=${() => removeLabel(i)}>×</button>`}</div>`;
        })}
        ${d && edit && html`<textarea ref=${edRef} class="plan-txt" placeholder="Scrivi il testo" rows=${Math.max(1, String(edit.s || '').split('\n').length)} cols=${Math.max(8, ...String(edit.s || '').split('\n').map(l => l.length + 2))}
          style=${`left:${edit.x * d.scale}px;top:${edit.y * d.scale}px;font-size:${edit.fs * d.scale}px;color:${edit.c}`}
          value=${edit.s} onPointerDown=${e => e.stopPropagation()} onInput=${e => { const v = { ...editRef.current, s: e.target.value }; editRef.current = v; setEdit(v); }} onBlur=${commitText}></textarea>`}
      </div>
    </div>
    <div class="plan-bar">
      ${tool === 'label' && html`<div class="plan-tray">
        ${!labels.length ? html`<div class="lock">Nessun campione da etichettare: aggiungine uno nella scheda.</div>`
          : !tray.length ? html`<div class="lock">Tutte le etichette sono posizionate. Trascinale per spostarle, × per toglierle.</div>`
          : html`<div class="lock" style="margin-bottom:6px">${sel ? 'Tocca la planimetria dove posizionare ' + sel.text : 'Scegli un\'etichetta, poi tocca la planimetria'}</div>
            <div class="row wrap" style="gap:6px">${tray.map(l => html`<button class=${'chip' + (sel && sel.ref === l.ref ? ' on' : '')} style=${'background:' + l.color} onClick=${() => setSel(sel && sel.ref === l.ref ? null : l)}>${l.text}</button>`)}</div>`}
      </div>`}
      ${pop && html`<div class="plan-pop">
        <div class="row wrap" style="gap:8px">${PLAN_COLORS.map(c => html`<button key=${c} class=${'pen' + (color === c ? ' on' : '')} aria-label=${'Colore ' + c} style=${'--pc:' + c} onPointerDown=${e => e.preventDefault()} onClick=${() => { setColor(c); if (editRef.current) { const v = { ...editRef.current, c }; editRef.current = v; setEdit(v); } }}></button>`)}</div>
        <div class="row" style="gap:8px;margin-top:10px">${PLAN_SIZES.map((w, i) => html`<button key=${i} class=${'plan-size' + (size === i ? ' on' : '')} aria-label=${'Spessore ' + (i + 1)} onPointerDown=${e => e.preventDefault()} onClick=${() => { setSize(i); if (editRef.current) { const v = { ...editRef.current, fs: Math.round(PLAN_FONTS[i] * unit() * 10) / 10 }; editRef.current = v; setEdit(v); } }}>
          ${isText ? html`<span style=${'font-weight:700;font-size:' + (11 + i * 4) + 'px;color:' + color}>A</span>` : html`<i style=${`width:${Math.min(26, 3 + w * 2.6)}px;height:${Math.min(26, 3 + w * 2.6)}px;background:${color}`}></i>`}</button>`)}
          <span class="tb-grow"></span>
          <button class="btn sm danger" disabled=${!pa.strokes.length} onClick=${() => { if (confirm('Cancellare tutti i tratti di questa pagina?')) { commit(c => ({ ...c, strokes: [] })); setPop(false); } }}>Pulisci</button></div>
      </div>`}
      <div class="plan-tools">
        ${PLAN_TOOLS.map(t => html`<button key=${t.k} class=${'plan-tool' + (tool === t.k ? ' on' : '')} aria-label=${t.l} title=${t.l} aria-pressed=${tool === t.k} onClick=${() => pickTool(t.k)}>
          <${Icon} n=${t.ic} s=${21} />${t.k === 'label' && tray.length ? html`<small class="plan-n">${tray.length}</small>` : ''}</button>`)}
      </div>
      <div class="plan-tools sub">
        <button class="plan-tool" aria-label="Indietro" title="Indietro" disabled=${!canU} onClick=${undo}><${Icon} n="undo" s=${21} /></button>
        <button class="plan-tool" aria-label="Avanti" title="Avanti" disabled=${!canR} onClick=${redo}><${Icon} n="redo" s=${21} /></button>
        <button class=${'plan-tool' + (pop ? ' on' : '')} aria-label="Colore e spessore" title="Colore e spessore" aria-expanded=${pop} onClick=${() => setPop(!pop)}>
          <span class="plan-swatch" style=${'background:' + color}></span></button>
        <span class="tb-grow"></span>
        <label class="plan-solo"><${Toggle} on=${soloPenna} label="Solo penna" set=${v => { setSoloPenna(v); tick(x => x + 1); }} /><span>Solo penna</span></label>
      </div>
    </div>
  </div>`;
}

/* ---------------- sezione nelle schede ---------------- */
function PlanList({ items = [], labels, onUpdate, onAdd, onRemove }) {
  const inp = useRef(); const [open, setOpen] = useState(null);
  const pick = async e => {
    for (const f of [...e.target.files]) {
      const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...head) !== '%PDF-') { toast(f.name + ': non è un PDF'); continue; }
      onAdd({ id: uid('pl'), nome: f.name.replace(/\.pdf$/i, ''), blobId: await saveFile(f), annot: {}, mergedBlobId: null });
    }
    e.target.value = '';
  };
  const cur = open && items.find(p => p.id === open);
  return html`<div class="stack">
    ${items.map(p => {
      const nl = Object.values(p.annot || {}).reduce((a, x) => a + (x.labels || []).length, 0);
      const ns = Object.values(p.annot || {}).reduce((a, x) => a + (x.strokes || []).length, 0);
      return html`<div class="row" key=${p.id}>
        <span class="sq plain"><${Icon} n="file" s=${18} /></span>
        <button class="tb-grow" style="background:none;border:0;text-align:left;padding:0" onClick=${() => setOpen(p.id)}>
          <div style="font-size:13.5px;font-weight:600">${p.nome}</div>
          <div class="lock">${ns || nl ? `${ns} tratti · ${nl} etichette${p.mergedBlobId ? ' · PDF annotato pronto' : ''}` : 'Tocca per aprire e annotare'}</div></button>
        <button class="x" aria-label=${'Rimuovi ' + p.nome} onClick=${() => { if (confirm('Rimuovere ' + p.nome + ' e le sue annotazioni?')) onRemove(p); }}>×</button></div>`;
    })}
    <button class="btn dashed" onClick=${() => inp.current.click()}><${Icon} n="paper" s=${17} /> Aggiungi planimetria (PDF)</button>
    <input ref=${inp} type="file" accept="application/pdf,.pdf" multiple hidden onChange=${pick} />
    ${cur && html`<${PlanViewer} key=${cur.id} plan=${cur} labels=${labels} onChange=${patch => onUpdate(cur.id, patch)} onClose=${() => setOpen(null)} />`}
  </div>`;
}
