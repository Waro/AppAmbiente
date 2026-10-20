/* Scanner codici a barre (BarcodeDetector di Chrome Android) e raccolta firme */

function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)();
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = 1320; g.gain.value = 0.08; o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.09); setTimeout(() => a.close(), 300);
  } catch (e) {}
}

/* props: title, target (testo "R3 · Fase 1"), onCode(code) -> {next?: string, msg?: string, close?: bool, error?: string}, onClose */
function Scanner({ title, target, onCode, onClose }) {
  useBackClose(onClose);
  const video = useRef(); const st = useRef({});
  const [err, setErr] = useState(null);
  const [tgt, setTgt] = useState(target);
  const [last, setLast] = useState(null);
  const [hit, setHit] = useState(false);
  const [torch, setTorch] = useState(null); // null = non disponibile
  const [zoom, setZoom] = useState(null);
  const [manual, setManual] = useState('');
  const cbRef = useRef(onCode); cbRef.current = onCode;

  const accept = code => {
    const r = cbRef.current(code) || {};
    if (r.error) { setLast({ bad: true, text: r.error }); if (navigator.vibrate) navigator.vibrate([60, 60, 60]); return; }
    beep(); if (navigator.vibrate) navigator.vibrate(80);
    setHit(true); setTimeout(() => setHit(false), 500);
    setLast({ text: r.msg || ('Letto ' + code) });
    if (r.close) setTimeout(onClose, 350); else if (r.next) setTgt(r.next);
  };

  useEffect(() => {
    let alive = true, stream, timer;
    (async () => {
      if (!('BarcodeDetector' in window)) { setErr('Questo browser non legge i codici a barre. Usa Chrome su Android, oppure inserisci il codice a mano qui sotto.'); return; }
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        const det = new BarcodeDetector({ formats: formats.length ? formats : undefined });
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
        if (!alive) return stream.getTracks().forEach(t => t.stop());
        const v = video.current; v.srcObject = stream; await v.play();
        const track = stream.getVideoTracks()[0]; st.current.track = track;
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.torch) setTorch(false);
        if (caps.zoom) setZoom({ min: caps.zoom.min, max: Math.min(caps.zoom.max, 8), step: caps.zoom.step || 0.1, v: (track.getSettings().zoom || caps.zoom.min) });
        if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        let prev = null, prevT = 0, lastAcc = null, lastAccT = 0;
        const loop = async () => {
          if (!alive) return;
          try {
            if (v.readyState >= 2) {
              const codes = await det.detect(v);
              const now = Date.now();
              if (codes.length) {
                const val = codes[0].rawValue.trim();
                // doppia lettura consecutiva per evitare letture errate
                if (val && val === prev && now - prevT < 1200) {
                  if (now - lastAccT > 1200 && !(val === lastAcc && now - lastAccT < 4000)) {
                    lastAcc = val; lastAccT = now; accept(val);
                  }
                }
                prev = val; prevT = now;
              }
            }
          } catch (e) {}
          timer = setTimeout(loop, 140);
        };
        loop();
      } catch (e) {
        setErr(e.name === 'NotAllowedError' ? 'Permesso fotocamera negato. Abilitalo nelle impostazioni del sito in Chrome, oppure inserisci il codice a mano.' : 'Fotocamera non disponibile: ' + e.message);
      }
    })();
    return () => { alive = false; clearTimeout(timer); if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  const toggleTorch = async () => {
    const t = st.current.track; if (!t) return;
    try { await t.applyConstraints({ advanced: [{ torch: !torch }] }); setTorch(!torch); } catch (e) { toast('Torcia non disponibile'); }
  };
  const setZ = async val => {
    const t = st.current.track; setZoom(z => ({ ...z, v: val }));
    try { await t.applyConstraints({ advanced: [{ zoom: val }] }); } catch (e) {}
  };
  const sendManual = () => { const v = manual.trim(); if (!v) return; setManual(''); accept(v); };

  return html`<div class="scanwrap" role="dialog" aria-label="Scansione codice">
    <div class="scan-video">
      <video ref=${video} playsinline muted></video>
      ${!err && html`<div class=${'scan-frame' + (hit ? ' hit' : '')}></div>`}
      <div class="scan-top"><b>${title}</b><small>${tgt ? 'Inquadra il codice per ' + tgt : 'Inquadra il codice a barre'}</small></div>
      ${err && html`<div class="scan-last" style="top:90px;bottom:auto">${err}</div>`}
      ${last && html`<div class="scan-last" style=${last.bad ? 'background:rgba(160,20,30,.85)' : ''}>${last.text}</div>`}
    </div>
    <div class="scan-bar">
      ${zoom && html`<label style="color:#ccc;font-size:12px">Zoom ${zoom.v.toFixed(1)}×
        <input type="range" min=${zoom.min} max=${zoom.max} step=${zoom.step} value=${zoom.v} onInput=${e => setZ(+e.target.value)} /></label>`}
      <div class="row"><input placeholder="Oppure scrivi il codice" value=${manual} onInput=${e => setManual(e.target.value)} onKeyDown=${e => e.key === 'Enter' && sendManual()} />
        <button class="btn" onClick=${sendManual}>OK</button></div>
      <div class="row">
        ${torch !== null && html`<button class="btn" onClick=${toggleTorch}><${Icon} n="torch" s=${17} /> ${torch ? 'Spegni' : 'Torcia'}</button>`}
        <button class="btn pri" style="flex:1" onClick=${onClose}>Fine</button>
      </div>
    </div>
  </div>`;
}

/* ---------------- firma ---------------- */
function trimCanvas(src) {
  const ctx = src.getContext('2d'); const { width: w, height: hh } = src;
  const d = ctx.getImageData(0, 0, w, hh).data;
  let x0 = w, y0 = hh, x1 = 0, y1 = 0;
  for (let y = 0; y < hh; y += 2) for (let x = 0; x < w; x += 2) {
    if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0) return null;
  const pad = 10; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(hh, y1 + pad);
  const k = Math.min(1, 700 / (x1 - x0));
  const out = document.createElement('canvas'); out.width = Math.round((x1 - x0) * k); out.height = Math.round((y1 - y0) * k);
  out.getContext('2d').drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

// Firma da immagine (foto o scansione su carta bianca): lo sfondo chiaro diventa trasparente,
// l'immagine viene ritagliata sul tratto e salvata come PNG, come una firma disegnata.
async function signatureFromImage(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('scegli un\'immagine (JPG o PNG)');
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('immagine non leggibile')); i.src = URL.createObjectURL(file); }); }
  const k = Math.min(1, 1600 / Math.max(src.width, src.height));
  const c = document.createElement('canvas'); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  const g = c.getContext('2d'); g.drawImage(src, 0, 0, c.width, c.height);
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  // sfondo stimato a blocchi (la carta è la parte più chiara di ogni zona): così ombre e luce non uniforme spariscono
  let hasAlpha = false;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { hasAlpha = true; break; }
  const W = c.width, H = c.height, B = 40, bw = Math.ceil(W / B), bh = Math.ceil(H / B);
  const lum = new Float32Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) lum[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const bm = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let m = 0; for (let y = by * B; y < Math.min(H, by * B + B); y += 2) for (let x = bx * B; x < Math.min(W, bx * B + B); x += 2) { const v = lum[y * W + x]; if (v > m) m = v; }
    bm[by * bw + bx] = m;
  }
  // un blocco tutto inchiostro prende lo sfondo dei vicini
  const bg = bm.slice();
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let m = bm[by * bw + bx];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = by + dy, xx = bx + dx; if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) m = Math.max(m, bm[yy * bw + xx]); }
    bg[by * bw + bx] = m;
  }
  const bgAt = (x, y) => {
    const fx = Math.min(bw - 1, Math.max(0, x / B - .5)), fy = Math.min(bh - 1, Math.max(0, y / B - .5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(bw - 1, x0 + 1), y1 = Math.min(bh - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    return (bg[y0 * bw + x0] * (1 - tx) + bg[y0 * bw + x1] * tx) * (1 - ty) + (bg[y1 * bw + x0] * (1 - tx) + bg[y1 * bw + x1] * tx) * ty;
  };
  let ink = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, i = p * 4;
    const a = hasAlpha ? d[i + 3] : Math.max(0, Math.min(255, (bgAt(x, y) - lum[p] - 28) * 5));
    d[i + 3] = Math.min(d[i + 3], a);
    if (d[i + 3] > 20) ink++;
  }
  if (ink < 30) throw new Error('nell\'immagine non trovo una firma: serve un tratto scuro su fondo chiaro');
  if (ink > d.length / 4 * 0.5) throw new Error('l\'immagine è troppo scura: fotografa la firma su un foglio bianco');
  g.putImageData(im, 0, 0);
  const url = trimCanvas(c);
  if (!url) throw new Error('nell\'immagine non trovo una firma');
  return url;
}
function SigImageButton({ onDone, cls = 'btn sm' }) {
  const inp = useRef();
  const pick = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { onDone(await signatureFromImage(f)); toast('Firma caricata'); } catch (err) { toast('Firma non caricata: ' + err.message); }
  };
  return html`<button class=${cls} onClick=${() => inp.current.click()}><${Icon} n="camera" s=${15} /> Carica immagine</button>
    <input ref=${inp} type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onChange=${pick} />`;
}

function SignaturePadOverlay({ title, onDone, onClose, allowImage }) {
  useBackClose(onClose);
  const cv = useRef(); const pad = useRef();
  useEffect(() => {
    let dead = false;
    const el = document.documentElement;
    (async () => {
      try { if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) {}
    })();
    const fit = () => {
      if (dead || !cv.current) return;
      const c = cv.current, r = c.getBoundingClientRect(), dpr = Math.max(window.devicePixelRatio || 1, 1);
      const data = pad.current ? pad.current.toData() : null;
      c.width = r.width * dpr; c.height = r.height * dpr; c.getContext('2d').scale(dpr, dpr);
      if (!pad.current) pad.current = new SignaturePad(c, { penColor: '#0b1f6b', minWidth: 1.2, maxWidth: 3.2, velocityFilterWeight: 0.6 });
      pad.current.clear(); if (data) pad.current.fromData(data);
    };
    const t = setTimeout(fit, 250); window.addEventListener('resize', fit);
    return () => {
      dead = true; clearTimeout(t); window.removeEventListener('resize', fit);
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);
  const ok = () => {
    if (!pad.current || pad.current.isEmpty()) { toast('Firma nello spazio bianco'); return; }
    const url = trimCanvas(cv.current); if (!url) return;
    onDone(url); onClose();
  };
  return html`<div class="sig-wrap" role="dialog" aria-label=${title}>
    <div class="sig-top"><b>${title}</b>
      ${allowImage && html`<${SigImageButton} onDone=${url => { onDone(url); onClose(); }} />`}
      <button class="btn sm" onClick=${() => pad.current && pad.current.clear()}>Cancella</button>
      <button class="btn sm" onClick=${onClose}>Annulla</button>
      <button class="btn sm pri" onClick=${ok}>Conferma</button></div>
    <div class="sig-area"><div class="sig-line"></div><div class="sig-hint">Firma qui</div><canvas ref=${cv}></canvas></div>
  </div>`;
}

/* ---------------- Fotocamera di Nembo: anteprima, scatto e galleria in basso a sinistra ----------------
   camOpen(input) sostituisce input.click() sui campi foto con capture: le foto scattate o scelte dalla galleria
   arrivano all'input come se le avesse scelte il telefono (evento change), quindi i gestori esistenti non cambiano.
   Senza fotocamera utilizzabile (PC, permesso negato) resta la fotocamera del telefono / la scelta file. */
let _camSet = null;
const camUsable = () => !!(_camSet && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && matchMedia('(pointer: coarse)').matches);
function camOpen(input) { if (!input) return; if (!camUsable()) { input.click(); return; } _camSet({ input }); }
function camDeliver(input, files) {
  if (!files.length) return;
  const dt = new DataTransfer(); files.forEach(f => dt.items.add(f));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
}
function CameraHost() { const [s, set] = useState(null); _camSet = set; return s ? html`<${Camera} key=${Date.now()} input=${s.input} onClose=${() => set(null)} />` : null; }

function Camera({ input, onClose }) {
  const multi = !!input.multiple;
  const video = useRef(); const gal = useRef(); const st = useRef({});
  const [shots, setShots] = useState([]); const shotsRef = useRef(shots); shotsRef.current = shots;
  const [err, setErr] = useState(null);
  const [torch, setTorch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  // chiudendo, le foto già scattate non si perdono
  const finish = (extra = []) => { const files = [...shotsRef.current.map(s => s.file), ...extra]; shotsRef.current.forEach(s => URL.revokeObjectURL(s.url)); onClose(); setTimeout(() => camDeliver(input, files), 0); };
  useBackClose(() => finish());
  useEffect(() => {
    let alive = true, stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
        if (!alive) return stream.getTracks().forEach(t => t.stop());
        const v = video.current; v.srcObject = stream; await v.play();
        const track = stream.getVideoTracks()[0]; st.current.track = track;
        if ('ImageCapture' in window) try { st.current.ic = new ImageCapture(track); } catch (e) { /* scatto dal video */ }
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.torch) setTorch(false);
        if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      } catch (e) { setErr('Non riesco ad aprire la fotocamera dentro Nembo. Usa la fotocamera del telefono o la galleria.'); }
    })();
    return () => { alive = false; if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);
  const toggleTorch = () => { const t = st.current.track; if (!t) return; const on = !torch; t.applyConstraints({ advanced: [{ torch: on }] }).then(() => setTorch(on)).catch(() => {}); };
  const grab = async () => {
    const ic = st.current.ic;
    if (ic) { try { return await ic.takePhoto(); } catch (e) { /* ripiego sul fotogramma */ } }
    const v = video.current, c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
  };
  const shoot = async () => {
    if (busy || err) return; setBusy(true); setFlash(true); setTimeout(() => setFlash(false), 160);
    try {
      const b = await grab(); if (!b) throw new Error('scatto non riuscito');
      const file = new File([b], `foto_${Date.now()}.jpg`, { type: b.type || 'image/jpeg' });
      if (navigator.vibrate) navigator.vibrate(30);
      if (!multi) { shotsRef.current = [{ file, url: '' }]; finish(); return; }
      setShots(s => [...s, { file, url: URL.createObjectURL(b) }]);
    } catch (e) { toast('Foto non scattata: riprova'); }
    setBusy(false);
  };
  const last = shots[shots.length - 1];
  return html`<div class="cam" role="dialog" aria-label="Fotocamera">
    <video ref=${video} playsinline muted></video>
    ${flash && html`<div class="cam-flash"></div>`}
    <div class="cam-top">
      <button class="cam-b" aria-label="Chiudi" onClick=${() => finish()}><${Icon} n="x" s=${22} /></button>
      <span class="cam-n">${shots.length ? shots.length + (shots.length === 1 ? ' foto' : ' foto') : ''}</span>
      ${torch !== null ? html`<button class=${'cam-b' + (torch ? ' on' : '')} aria-label="Torcia" onClick=${toggleTorch}><${Icon} n="torch" s=${21} /></button>` : html`<span style="width:44px"></span>`}
    </div>
    ${err && html`<div class="cam-err">${err}<button class="btn" style="margin-top:12px" onClick=${() => { onClose(); input.click(); }}><${Icon} n="camera" s=${18} /> Fotocamera del telefono</button></div>`}
    <div class="cam-bot">
      <button class="cam-gal" aria-label="Scegli dalla galleria" onClick=${() => gal.current.click()}>
        ${last ? html`<img src=${last.url} alt="" />` : html`<${Icon} n="image" s=${24} />`}<small>Galleria</small></button>
      <button class="cam-shut" aria-label="Scatta" disabled=${busy || !!err} onClick=${shoot}><i></i></button>
      ${multi && shots.length ? html`<button class="cam-done" onClick=${() => finish()}>Fine</button>` : html`<span class="cam-sp"></span>`}
    </div>
    <input ref=${gal} type="file" accept="image/*" multiple=${multi} hidden onChange=${e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) finish(fs); }} />
  </div>`;
}
