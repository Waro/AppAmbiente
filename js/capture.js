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

function SignaturePadOverlay({ title, onDone, onClose }) {
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
      <button class="btn sm" onClick=${() => pad.current && pad.current.clear()}>Cancella</button>
      <button class="btn sm" onClick=${onClose}>Annulla</button>
      <button class="btn sm pri" onClick=${ok}>Conferma</button></div>
    <div class="sig-area"><div class="sig-line"></div><div class="sig-hint">Firma qui</div><canvas ref=${cv}></canvas></div>
  </div>`;
}
