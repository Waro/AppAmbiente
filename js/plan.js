/* Planimetrie: visualizzazione con PDF.js, disegno a mano libera ed etichette dei campioni.
   Le annotazioni si salvano come dati (per poterle modificare) e vengono fuse in un nuovo PDF con pdf-lib. */

const PDFJS = () => window.pdfjsLib || window['pdfjs-dist/build/pdf'];
function pdfjsReady() {
  const lib = PDFJS();
  if (lib && !lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs.worker.min.js';
  return lib;
}
async function openPdf(bytes) {
  // isEvalSupported:false chiude la vulnerabilità dei font nelle versioni 3.x
  return pdfjsReady().getDocument({ data: bytes, isEvalSupported: false, disableFontFace: false }).promise;
}

const PENS = [
  { k: 'red', c: '#d62828', w: 2.2, o: 1, l: 'Rosso' },
  { k: 'blue', c: '#1d4ed8', w: 2.2, o: 1, l: 'Blu' },
  { k: 'black', c: '#111111', w: 2.2, o: 1, l: 'Nero' },
  { k: 'hl', c: '#facc15', w: 14, o: 0.4, l: 'Evidenziatore' },
];
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

/* ---------------- fusione nel PDF ---------------- */
// labelsById: { ref: { text, color } } — le etichette orfane (campione eliminato) vengono saltate
async function mergePlan(origBytes, annot, labelsById) {
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
    for (const s of a.strokes || []) {
      const pen = PENS.find(p => p.k === s.p) || PENS[0];
      const [r, g, b] = hexRgb(pen.c);
      for (let i = 2; i < s.pts.length; i += 2) {
        page.drawLine({ start: P(s.pts[i - 2], s.pts[i - 1]), end: P(s.pts[i], s.pts[i + 1]), thickness: s.w, color: rgb(r, g, b), opacity: pen.o, lineCap: LineCapStyle.Round });
      }
      if (s.pts.length === 2) page.drawCircle({ ...P(s.pts[0], s.pts[1]), size: s.w / 2, color: rgb(r, g, b), opacity: pen.o });
    }
    for (const l of a.labels || []) {
      const info = labelsById[l.ref]; if (!info) continue;
      const fs = l.fs; const text = String(info.text || '?');
      const tw = bold.widthOfTextAtSize(text, fs), padX = fs * 0.45, h = fs * 1.5, w = tw + padX * 2;
      const [r, g, b] = hexRgb(info.color || '#0076d3');
      // l.x, l.y = centro dell'etichetta in coordinate di visualizzazione
      const c = P(l.x, l.y);
      // rettangolo e testo ruotati con la pagina, così restano dritti a video
      const ang = rot * Math.PI / 180;
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
// plan: { id, nome, blobId, annot, mergedBlobId }
// labels: [{ ref, text, color }] disponibili (campioni o punti R)
function PlanViewer({ plan, labels, onChange, onClose }) {
  useBackClose(() => close());
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState(null);
  const [pageN, setPageN] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mode, setMode] = useState('move');
  const [pen, setPen] = useState('red');
  const [sel, setSel] = useState(null); // etichetta scelta dal vassoio
  const [annot, setAnnot] = useState(() => JSON.parse(JSON.stringify(plan.annot || {})));
  const [dims, setDims] = useState(null); // { w, h, scale } in px CSS
  const [saving, setSaving] = useState(false);
  const wrap = useRef(), cv = useRef(), ov = useRef(), bytesRef = useRef(null), dirty = useRef(false), drawing = useRef(null);
  const annotRef = useRef(annot); annotRef.current = annot;

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

  // rendering della pagina
  useEffect(() => {
    if (!doc) return; let dead = false, task;
    (async () => {
      const page = await doc.getPage(pageN + 1);
      const base = page.getViewport({ scale: 1 });
      const cw = wrap.current.clientWidth - 20;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let scale = cw / base.width * zoom;
      const maxPx = 14e6; // limite di memoria del canvas sui telefoni
      if (base.width * scale * dpr * base.height * scale * dpr > maxPx) scale = Math.sqrt(maxPx / (base.width * base.height)) / dpr;
      const vp = page.getViewport({ scale: scale * dpr });
      const c = cv.current; c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      c.style.width = (vp.width / dpr) + 'px'; c.style.height = (vp.height / dpr) + 'px';
      task = page.render({ canvasContext: c.getContext('2d'), viewport: vp });
      await task.promise.catch(() => {});
      if (!dead) setDims({ w: vp.width / dpr, h: vp.height / dpr, scale, dpr });
    })();
    return () => { dead = true; if (task) task.cancel(); };
  }, [doc, pageN, zoom]);

  // ridisegno dei tratti
  const pa = annot[pageN] || { strokes: [], labels: [] };
  useEffect(() => {
    if (!dims) return; const c = ov.current; const { w, h, scale, dpr } = dims;
    c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    const x = c.getContext('2d'); x.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round';
    const strokes = [...pa.strokes, ...(drawing.current ? [drawing.current] : [])];
    for (const s of strokes) {
      const p = PENS.find(q => q.k === s.p) || PENS[0];
      x.globalAlpha = p.o; x.strokeStyle = p.c; x.fillStyle = p.c; x.lineWidth = s.w;
      x.beginPath(); x.moveTo(s.pts[0], s.pts[1]);
      for (let i = 2; i < s.pts.length; i += 2) x.lineTo(s.pts[i], s.pts[i + 1]);
      if (s.pts.length === 2) { x.arc(s.pts[0], s.pts[1], s.w / 2, 0, Math.PI * 2); x.fill(); } else x.stroke();
    }
    x.globalAlpha = 1;
  }, [dims, annot, pageN]);

  const setPage = (fn) => {
    setAnnot(a => { const cur = a[pageN] || { strokes: [], labels: [] }; const next = { ...a, [pageN]: fn(cur) }; dirty.current = true; onChange({ annot: next }); return next; });
  };
  const toPage = e => { const r = ov.current.getBoundingClientRect(); return [(e.clientX - r.left) / dims.scale, (e.clientY - r.top) / dims.scale]; };
  const round = v => Math.round(v * 10) / 10;

  const down = e => {
    if (!dims) return;
    if (mode === 'draw') {
      e.preventDefault(); ov.current.setPointerCapture(e.pointerId);
      const p = PENS.find(q => q.k === pen); const [x, y] = toPage(e);
      drawing.current = { p: pen, w: round(p.w / Math.max(dims.scale, 0.2) * (pen === 'hl' ? 1 : 1)), pts: [round(x), round(y)] };
    } else if (mode === 'label' && sel) {
      const [x, y] = toPage(e);
      // dimensione come la si vede a schermo (circa 15 px), entro limiti ragionevoli rispetto al foglio
      const pw = dims.w / dims.scale;
      const fs = round(Math.min(pw / 25, Math.max(pw / 120, 15 / dims.scale)));
      setPage(cur => ({ ...cur, labels: [...cur.labels, { ref: sel.ref, x: round(x), y: round(y), fs }] }));
      setSel(null);
    }
  };
  const move = e => {
    if (mode !== 'draw' || !drawing.current) return;
    const [x, y] = toPage(e); const pts = drawing.current.pts;
    const lx = pts[pts.length - 2], ly = pts[pts.length - 1];
    if (Math.hypot(x - lx, y - ly) * dims.scale < 2) return; // semplifica il tratto
    pts.push(round(x), round(y));
    setAnnot(a => ({ ...a })); // forza il ridisegno
  };
  const up = () => {
    if (mode !== 'draw' || !drawing.current) return;
    const s = drawing.current; drawing.current = null;
    setPage(cur => ({ ...cur, strokes: [...cur.strokes, s] }));
  };

  // trascinamento delle etichette già posizionate
  const dragLabel = (i, e) => {
    if (mode !== 'label') return;
    e.stopPropagation(); e.preventDefault();
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const mv = ev => { const [x, y] = toPage(ev); setAnnot(a => { const cur = a[pageN]; const ls = cur.labels.slice(); ls[i] = { ...ls[i], x: round(x), y: round(y) }; return { ...a, [pageN]: { ...cur, labels: ls } }; }); };
    const end = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', end); dirty.current = true; onChange({ annot: annotRef.current }); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', end);
  };
  const removeLabel = i => setPage(cur => ({ ...cur, labels: cur.labels.filter((_, j) => j !== i) }));

  const placedRefs = new Set(Object.values(annot).flatMap(a => (a.labels || []).map(l => l.ref)));
  const tray = labels.filter(l => !placedRefs.has(l.ref));
  const byRef = Object.fromEntries(labels.map(l => [l.ref, l]));

  async function close() {
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

  const nPages = doc ? doc.numPages : 0;
  return html`<div class="planwrap" role="dialog" aria-label=${'Planimetria ' + plan.nome}>
    <div class="plan-top">
      <button class="btn sm" onClick=${() => history.back()} disabled=${saving}>${saving ? html`<div class="spin" />` : 'Fine'}</button>
      <b class="tb-grow"><div>${plan.nome}</div></b>
      ${nPages > 1 && html`<div class="row" style="gap:4px"><button class="sq plain" aria-label="Pagina precedente" disabled=${pageN === 0} onClick=${() => setPageN(pageN - 1)}>‹</button>
        <span style="font-size:13px;font-weight:700;min-width:44px;text-align:center">${pageN + 1}/${nPages}</span>
        <button class="sq plain" aria-label="Pagina successiva" disabled=${pageN >= nPages - 1} onClick=${() => setPageN(pageN + 1)}>›</button></div>`}
      <button class="sq plain" aria-label="Riduci" onClick=${() => setZoom(z => Math.max(0.5, z / 1.5))}>−</button>
      <button class="sq plain" aria-label="Ingrandisci" onClick=${() => setZoom(z => Math.min(6, z * 1.5))}>+</button>
    </div>
    <div class="plan-view" ref=${wrap} style=${mode === 'move' ? '' : 'overflow:auto'}>
      ${err && html`<div class="notice err" style="margin:16px">${err}</div>`}
      ${!doc && !err && html`<div class="empty">Apro la planimetria…</div>`}
      <div class="plan-page" style=${dims ? `width:${dims.w}px;height:${dims.h}px` : ''}>
        <canvas ref=${cv}></canvas>
        <canvas ref=${ov} class=${'plan-ov' + (mode === 'draw' || (mode === 'label' && sel) ? ' capture' : '')}
          onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}></canvas>
        ${dims && (pa.labels || []).map((l, i) => {
          const info = byRef[l.ref]; if (!info) return null;
          const fsPx = l.fs * dims.scale;
          return html`<div class="plan-lbl" key=${i} style=${`left:${l.x * dims.scale}px;top:${l.y * dims.scale}px;font-size:${fsPx}px;background:${info.color};touch-action:${mode === 'label' ? 'none' : 'auto'}`}
            onPointerDown=${e => dragLabel(i, e)}>${info.text}
            ${mode === 'label' && html`<button class="plan-lbl-x" aria-label=${'Rimuovi ' + info.text} onPointerDown=${e => e.stopPropagation()} onClick=${() => removeLabel(i)}>×</button>`}</div>`;
        })}
      </div>
    </div>
    <div class="plan-bar">
      <div class="seg" style="gap:6px">
        <button class=${mode === 'move' ? 'on' : ''} onClick=${() => { setMode('move'); setSel(null); }}>Sposta</button>
        <button class=${mode === 'draw' ? 'on' : ''} onClick=${() => { setMode('draw'); setSel(null); }}>Disegna</button>
        <button class=${mode === 'label' ? 'on' : ''} onClick=${() => setMode('label')}>Etichette${tray.length ? ' · ' + tray.length : ''}</button>
      </div>
      ${mode === 'draw' && html`<div class="row" style="margin-top:8px;gap:6px">
        ${PENS.map(p => html`<button class=${'pen' + (pen === p.k ? ' on' : '')} aria-label=${p.l} title=${p.l} style=${'--pc:' + p.c + (p.k === 'hl' ? ';opacity:.8' : '')} onClick=${() => setPen(p.k)}></button>`)}
        <span class="tb-grow"></span>
        <button class="btn sm" disabled=${!pa.strokes.length} onClick=${() => setPage(cur => ({ ...cur, strokes: cur.strokes.slice(0, -1) }))}>Annulla</button>
        <button class="btn sm danger" disabled=${!pa.strokes.length} onClick=${() => confirm('Cancellare tutti i tratti di questa pagina?') && setPage(cur => ({ ...cur, strokes: [] }))}>Pulisci</button>
      </div>`}
      ${mode === 'label' && html`<div style="margin-top:8px">
        ${!labels.length ? html`<div class="lock">Nessun campione da etichettare: aggiungine uno nella scheda.</div>`
          : !tray.length ? html`<div class="lock">Tutte le etichette sono posizionate. Trascinale per spostarle, × per toglierle.</div>`
          : html`<div class="lock" style="margin-bottom:6px">${sel ? 'Tocca la planimetria dove posizionare ' + sel.text : 'Scegli un\'etichetta, poi tocca la planimetria'}</div>
            <div class="row wrap" style="gap:6px">${tray.map(l => html`<button class=${'chip' + (sel && sel.ref === l.ref ? ' on' : '')} style=${'background:' + l.color} onClick=${() => setSel(sel && sel.ref === l.ref ? null : l)}>${l.text}</button>`)}</div>`}
      </div>`}
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
