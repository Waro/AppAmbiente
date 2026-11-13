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
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } } });
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
      ${zoom && html`<label style="color:var(--on-dark);opacity:.8;font-size:var(--fs-xs)">Zoom ${zoom.v.toFixed(1)}×
        <input type="range" min=${zoom.min} max=${zoom.max} step=${zoom.step} value=${zoom.v} onInput=${e => setZ(+e.target.value)} /></label>`}
      <div class="row"><input placeholder="Oppure scrivi il codice" value=${manual} onInput=${e => setManual(e.target.value)} onKeyDown=${e => e.key === 'Enter' && sendManual()} />
        <button class="btn" onClick=${sendManual}>OK</button></div>
      <div class="row">
        ${torch !== null && html`<button class="btn" onClick=${toggleTorch}><${Icon} n="torch" s=${17} /> ${torch ? 'Spegni' : 'Torcia'}</button>`}
        <button class="btn pri grow" onClick=${onClose}>Fine</button>
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
      if (!pad.current) pad.current = new SignaturePad(c, { penColor: PRINT.firma, minWidth: 1.2, maxWidth: 3.2, velocityFilterWeight: 0.6 });
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
   Senza fotocamera utilizzabile (PC, permesso negato) resta la fotocamera del telefono / la scelta file.
   v57: in Impostazioni → Foto si sceglie, per questo dispositivo, la fotocamera predefinita (telefono o Nembo);
   con Nembo si possono attivare gli scatti in serie. Negli appunti (input che accetta anche video) la fotocamera
   di Nembo ha anche la modalità Video, con registrazione fermata a VIDEO_MAX secondi. */
let _camSet = null;
const _ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
// prima della v57 esisteva solo «Scatti in serie»: chi l'aveva attivo usava già la fotocamera di Nembo
const camScelta = () => _ls('nembo_cam') || (_ls('nembo_cam_serie') === '1' ? 'nembo' : 'tel');
const setCamScelta = v => _ls('nembo_cam', v);
const camSerie = () => camScelta() === 'nembo' && _ls('nembo_cam_serie') === '1';
const setCamSerie = on => _ls('nembo_cam_serie', on ? '1' : '0');
const camUsable = () => !!(_camSet && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && matchMedia('(pointer: coarse)').matches);
/* copia nel telefono (v58, Impostazioni → Foto, per dispositivo): le foto e i video appena scattati (non quelli scelti dalla
   galleria, che ci sono già) si salvano anche come file nella cartella Download, alla qualità piena, e compaiono nella
   galleria. In Nembo le foto restano ridotte (lato lungo 1600 px) per il Word e lo spazio. */
const camCopia = () => _ls('nembo_cam_copia') === '1';
function copiaNelTelefono(files) {
  if (!camCopia() || !files.length) return;
  const d = new Date(), p2 = n => String(n).padStart(2, '0');
  const base = `Nembo_${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  files.forEach((f, i) => {
    const ext = (/\.([a-z0-9]{2,4})$/i.exec(f.name || '') || [, /^video\//.test(f.type) ? 'mp4' : 'jpg'])[1];
    setTimeout(() => downloadBlob(f, `${base}${files.length > 1 ? '_' + (i + 1) : ''}.${ext}`), i * 400);
  });
}
function camOpen(input) {
  if (!input) return;
  if (camScelta() !== 'nembo' || !camUsable()) {
    // fotocamera del telefono: la copia parte quando il file arriva al campo (non dalla galleria di Nembo)
    // in cattura: parte prima del gestore del campo, che poi svuota input.files
    if (input._copiaL) input.removeEventListener('change', input._copiaL, true);
    input._copiaL = () => { input.removeEventListener('change', input._copiaL, true); input._copiaL = null; if (!input._gal && input.files) copiaNelTelefono([...input.files]); };
    input.addEventListener('change', input._copiaL, true);
    input.click(); return;
  }
  _camSet({ input });
}
// galleria: le foto (e, negli appunti, i video) scelte arrivano allo stesso campo della fotocamera
function galOpen(input) {
  if (!input) return;
  const g = document.createElement('input'); g.type = 'file'; g.accept = /video/.test(input.accept) ? 'image/*,video/*' : 'image/*'; g.multiple = !!input.multiple;
  g.onchange = () => { const files = [...g.files]; if (files.length) { input._gal = true; try { camDeliver(input, files); } finally { input._gal = false; } } };
  g.click();
}
function CamSerieCard() {
  const [cam, setCam] = useState(camScelta); const [on, set] = useState(() => _ls('nembo_cam_serie') === '1');
  const [auto, setAuto] = useState(odAutoOn); const [copia, setCopia] = useState(camCopia);
  const scegli = v => { setCamScelta(v); setCam(v); };
  return html`<div class="card"><div class="fg-sw"><span>Fotocamera predefinita</span></div>
    <div class="seg mt-2">${[['tel', 'Telefono'], ['nembo', 'Nembo']].map(([k, l]) => html`<button class=${cam === k ? 'on' : ''} aria-pressed=${cam === k} onClick=${() => scegli(k)}>${l}</button>`)}</div>
    <p class="hint-p" style="margin:var(--sp-2) 0 0">${cam === 'tel' ? 'Telefono: foto più nitide, con tutte le lenti. Negli appunti puoi scegliere foto o video.' : 'Nembo: resti nell\'app; negli appunti puoi registrare anche video.'}</p>
    ${cam === 'nembo' && html`<label class="fg-sw mt-3"><span>Scatti in serie</span><${Toggle} on=${on} label="Scatti in serie" set=${v => { setCamSerie(v); set(v); }} /></label>
      <p class="hint-p" style="margin:var(--sp-2) 0 0">Più foto di seguito senza chiudere la fotocamera.</p>`}
    <label class="fg-sw mt-4"><span>Carica subito su OneDrive</span><${Toggle} on=${auto} label="Carica subito su OneDrive" set=${v => { _ls('nembo_od_auto', v ? '1' : '0'); setAuto(v); if (v) OdAuto.vai(); }} /></label>
    <p class="hint-p" style="margin:var(--sp-2) 0 0">Foto e video partono appena li aggiungi, se OneDrive è collegato e c'è rete; senza rete partono quando torna. I video caricati non occupano più spazio sul telefono.</p>
    <label class="fg-sw mt-4"><span>Copia nel telefono</span><${Toggle} on=${copia} label="Copia nel telefono" set=${v => { _ls('nembo_cam_copia', v ? '1' : '0'); setCopia(v); }} /></label>
    <p class="hint-p" style="margin:var(--sp-2) 0 0">Ogni foto o video che scatti resta anche nel telefono, a qualità piena, nella cartella Download: lo trovi nella galleria.</p></div>`;
}
function camDeliver(input, files) {
  if (!files.length) return;
  const dt = new DataTransfer(); files.forEach(f => dt.items.add(f));
  input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
}
function CameraHost() { const [s, set] = useState(null); _camSet = set; return s ? html`<${Camera} key=${Date.now()} input=${s.input} onClose=${() => set(null)} />` : null; }

// video degli appunti (v57): durata massima in secondi e peso massimo in MB (anche per i video del telefono)
const VIDEO_MAX = 120;
const VIDEO_MAX_MB = 400;
const fmtDurata = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function Camera({ input, onClose }) {
  const multi = !!input.multiple && camSerie();
  const conVideo = /video/.test(input.accept || '');
  const video = useRef(); const gal = useRef(); const st = useRef({});
  const [shots, setShots] = useState([]); const shotsRef = useRef(shots); shotsRef.current = shots;
  const [err, setErr] = useState(null);
  const [torch, setTorch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [modo, setModo] = useState('foto');
  const [rec, setRec] = useState(false); const [secs, setSecs] = useState(0);
  // chiudendo, le foto già scattate non si perdono; una registrazione in corso si ferma e il video viene tenuto
  // extra: file dalla galleria; nuovi: video appena registrato. Copia nel telefono solo di scatti e video nuovi.
  const finish = (extra = [], nuovi = []) => {
    const mr = st.current.mr;
    if (mr && mr.state === 'recording') { st.current.chiudi = true; mr.stop(); return; }
    const scatti = [...shotsRef.current.map(s => s.file), ...nuovi];
    const files = [...scatti, ...extra]; shotsRef.current.forEach(s => URL.revokeObjectURL(s.url)); onClose();
    setTimeout(() => { input._gal = true; try { camDeliver(input, files); } finally { input._gal = false; } copiaNelTelefono(scatti); }, 0);
  };
  useBackClose(() => finish());
  useEffect(() => {
    let alive = true, stream; setErr(null); setTorch(null);
    const vid = modo === 'video';
    const chiedi = audio => navigator.mediaDevices.getUserMedia({ audio, video: { facingMode: { ideal: 'environment' }, width: { ideal: vid ? 1280 : 3840 }, height: { ideal: vid ? 720 : 2160 } } });
    (async () => {
      try {
        // video: con il microfono se il permesso c'è, altrimenti senza audio
        try { stream = await chiedi(vid); } catch (e) { if (!vid) throw e; stream = await chiedi(false); }
        if (!alive) return stream.getTracks().forEach(t => t.stop());
        st.current.stream = stream;
        const v = video.current; v.srcObject = stream; await v.play();
        const track = stream.getVideoTracks()[0]; st.current.track = track; st.current.ic = null;
        if (!vid && 'ImageCapture' in window) try { st.current.ic = new ImageCapture(track); } catch (e) { /* scatto dal video */ }
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.torch) setTorch(false);
        if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      } catch (e) { setErr('Non riesco ad aprire la fotocamera dentro Nembo. Usa la fotocamera del telefono o la galleria.'); }
    })();
    return () => { alive = false; if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [modo]);
  useEffect(() => () => clearInterval(st.current.tick), []);
  const toggleTorch = () => { const t = st.current.track; if (!t) return; const on = !torch; t.applyConstraints({ advanced: [{ torch: on }] }).then(() => setTorch(on)).catch(() => {}); };
  const grab = async () => {
    const ic = st.current.ic;
    if (ic) {
      // scatto alla risoluzione massima del sensore
      try { const pc = await ic.getPhotoCapabilities(); const w = pc && pc.imageWidth && pc.imageWidth.max; return await ic.takePhoto(w ? { imageWidth: w } : undefined); }
      catch (e) { try { return await ic.takePhoto(); } catch (e2) { /* ripiego sul fotogramma */ } }
    }
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
  // registrazione: 720p, ferma da sola a VIDEO_MAX secondi; la durata va nel nome del file (i WebM registrati non la riportano)
  const recStart = () => {
    const s = st.current.stream;
    if (!s || !window.MediaRecorder) { toast('Su questo telefono Nembo non può registrare: usa la fotocamera del telefono'); return; }
    const tipo = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    let mr; try { mr = new MediaRecorder(s, { ...(tipo ? { mimeType: tipo } : {}), videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 }); }
    catch (e) { toast('Registrazione non avviata: riprova'); return; }
    const parts = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
    mr.onstop = () => {
      clearInterval(st.current.tick); setRec(false);
      const dur = Math.max(1, Math.round((Date.now() - st.current.t0) / 1000));
      const type = ((mr.mimeType || tipo || 'video/webm').split(';')[0]) || 'video/webm';
      const file = new File(parts, `video_${Date.now()}_${Math.min(dur, VIDEO_MAX)}s.${type === 'video/mp4' ? 'mp4' : 'webm'}`, { type });
      if (navigator.vibrate) navigator.vibrate(30);
      st.current.mr = null; finish([], [file]);
    };
    mr.start(1000); st.current.mr = mr; st.current.t0 = Date.now(); setSecs(0); setRec(true);
    st.current.tick = setInterval(() => { const n = Math.floor((Date.now() - st.current.t0) / 1000); setSecs(n); if (n >= VIDEO_MAX && mr.state === 'recording') mr.stop(); }, 250);
  };
  const recStop = () => { const mr = st.current.mr; if (mr && mr.state === 'recording') mr.stop(); };
  const last = shots[shots.length - 1];
  return html`<div class="cam" role="dialog" aria-label="Fotocamera">
    <video ref=${video} playsinline muted></video>
    ${flash && html`<div class="cam-flash"></div>`}
    <div class="cam-top">
      <button class="cam-b" aria-label="Chiudi" onClick=${() => finish()}><${Icon} n="x" s=${22} /></button>
      <span class=${'cam-n' + (rec ? ' rec' : '')}>${modo === 'video' ? (rec ? fmtDurata(secs) + ' / ' + fmtDurata(VIDEO_MAX) : 'Registrazione ferma a ' + VIDEO_MAX + ' secondi') : shots.length ? shots.length + ' foto' : ''}</span>
      ${torch !== null ? html`<button class=${'cam-b' + (torch ? ' on' : '')} aria-label="Torcia" onClick=${toggleTorch}><${Icon} n="torch" s=${21} /></button>` : html`<span style="width:var(--tap)"></span>`}
    </div>
    ${err && html`<div class="cam-err">${err}<button class="btn mt-3" onClick=${() => { onClose(); input.click(); }}><${Icon} n="camera" s=${18} /> Fotocamera del telefono</button></div>`}
    ${conVideo && !rec && html`<div class="cam-modo" role="group" aria-label="Modalità">${[['foto', 'Foto'], ['video', 'Video']].map(([k, l]) => html`<button class=${modo === k ? 'on' : ''} aria-pressed=${modo === k} disabled=${busy} onClick=${() => setModo(k)}>${l}</button>`)}</div>`}
    <div class="cam-bot">
      ${rec ? html`<span class="cam-sp"></span>` : html`<button class="cam-gal" aria-label="Scegli dalla galleria" onClick=${() => gal.current.click()}>
        ${last ? html`<img src=${last.url} alt="" />` : html`<${Icon} n="image" s=${24} />`}<small>Galleria</small></button>`}
      ${modo === 'video'
        ? html`<button class=${'cam-shut vid' + (rec ? ' rec' : '')} aria-label=${rec ? 'Ferma la registrazione' : 'Registra'} disabled=${!!err} onClick=${rec ? recStop : recStart}><i></i></button>`
        : html`<button class="cam-shut" aria-label="Scatta" disabled=${busy || !!err} onClick=${shoot}><i></i></button>`}
      ${multi && shots.length && !rec ? html`<button class="cam-done" onClick=${() => finish()}>Fine</button>` : html`<span class="cam-sp"></span>`}
    </div>
    <input ref=${gal} type="file" accept=${conVideo ? 'image/*,video/*' : 'image/*'} multiple=${multi} hidden onChange=${e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) finish(fs); }} />
  </div>`;
}
