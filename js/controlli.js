/* Controlli sui file che entrano in Nembo: allegati, backup ZIP e sincronizzazione.
   Allegati ammessi:
   - foto (JPEG, PNG, WebP): vengono ridisegnate in JPEG, quindi del file originale resta solo l'immagine;
   - PDF: si aprono con il visore interno (PDF.js, senza eseguire script); quelli con script, azioni o file incorporati
     vengono segnati, mai eseguiti;
   - Word .docx: rifiutati se hanno macro, controlli ActiveX, oggetti eseguibili o contenuti caricati da Internet;
     non si aprono dentro Nembo ma con l'app Word.
   Backup e sincronizzazione: ogni attività viene controllata e completata prima di essere salvata;
   i file dello ZIP hanno un'impronta SHA-256 nel manifest e vengono confrontati al ripristino. */

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ALLEGATI_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.pdf,.docx,' + MIME_DOCX;
const ALLEGATO_MAX = 60 * 1048576;
const PDF_MAX_PAG = 40;

const errAllegato = msg => Object.assign(new Error(msg), { code: 'ALLEGATO' });
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

/* ---------------- riconoscimento del contenuto ---------------- */
async function testa(blob, n = 12) { return new Uint8Array(await blob.slice(0, n).arrayBuffer()); }
function tipoDaTesta(b) {
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  if (b[0] === 0x50 && b[1] === 0x4B && b[2] === 3 && b[3] === 4) return 'zip';
  return null;
}
async function sha256(data) {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data;
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------------- Word ed Excel: niente macro né contenuti attivi ---------------- */
// restituisce il motivo del rifiuto, oppure null se il file va bene
async function officeRischi(data, kind) {
  await needLib('jszip'); const z = await JSZip.loadAsync(data).catch(() => null);
  if (!z) return 'il file è danneggiato';
  const nomi = Object.keys(z.files);
  if (nomi.length > 5000) return 'il file contiene troppi elementi';
  const tot = nomi.reduce((a, n) => a + ((z.files[n]._data && z.files[n]._data.uncompressedSize) || 0), 0);
  if (tot > 400 * 1048576) return 'il file è troppo grande una volta aperto';
  const parte = kind === 'docx' ? 'word/document.xml' : 'xl/workbook.xml';
  if (!z.file('[Content_Types].xml') || !z.file(parte)) return kind === 'docx' ? 'non è un documento Word (.docx)' : 'non è un file Excel (.xlsx)';
  const ct = await z.file('[Content_Types].xml').async('string');
  if (/macroEnabled|vbaProject/i.test(ct) || nomi.some(n => /vbaProject\.bin$|vbaData\.xml$/i.test(n))) return 'il documento contiene macro';
  if (nomi.some(n => /(^|\/)activeX\//i.test(n))) return 'il documento contiene controlli ActiveX';
  if (nomi.some(n => /\/embeddings\/.*\.(bin|exe|dll|js|vbs|bat|cmd|ps1|hta|scr|jar|msi|lnk)$/i.test(n))) return 'il documento contiene oggetti incorporati eseguibili';
  for (const n of nomi.filter(x => /\.rels$/i.test(x))) {
    const x = await z.file(n).async('string');
    for (const m of x.matchAll(/<Relationship\b[^>]*>/g)) {
      if (/TargetMode\s*=\s*"External"/i.test(m[0]) && /\/(attachedTemplate|oleObject|frame|subDocument|package|image)"/i.test(m[0])) return 'il documento carica contenuti da Internet';
    }
  }
  return null;
}

/* ---------------- PDF: script, azioni e file incorporati ---------------- */
const PDF_ATTIVI = /\/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia|XFA)\b/;
async function pdfConScript(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (PDF_ATTIVI.test(new TextDecoder('latin1').decode(bytes))) return true;
  // oggetti dentro i flussi compressi: li legge pdf-lib
  try {
    await needLib('pdflib');
    const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      const dict = obj instanceof PDFLib.PDFDict ? obj : obj && obj.dict instanceof PDFLib.PDFDict ? obj.dict : null;
      if (!dict) continue;
      for (const k of dict.keys()) if (PDF_ATTIVI.test(k.toString())) return true;
      const s = dict.get(PDFLib.PDFName.of('S'));
      if (s && /^\/(JavaScript|Launch)$/.test(s.toString())) return true;
    }
  } catch (e) { /* PDF che pdf-lib non legge: resta il controllo sul testo */ }
  return false;
}

/* ---------------- allegati ---------------- */
// controlla un file scelto dall'utente e lo prepara per l'archivio; se non è ammesso lancia un errore con code 'ALLEGATO'
async function allegato(file) {
  const nome = String(file.name || 'file').slice(0, 160);
  const base = nome.replace(/\.[^.]*$/, '') || 'file';
  if (file.size > ALLEGATO_MAX) throw errAllegato(nome + ': file oltre 60 MB, non allegato');
  const t = tipoDaTesta(await testa(file));
  if (t === 'pdf') return { blob: new Blob([file], { type: PDF_MIME }), type: PDF_MIME, name: base + '.pdf', script: await pdfConScript(file) };
  if (t === 'zip' && /\.docx$/i.test(nome)) {
    const r = await officeRischi(file, 'docx');
    if (r) throw errAllegato(nome + ': ' + r + ', non allegato');
    return { blob: new Blob([file], { type: MIME_DOCX }), type: MIME_DOCX, name: nome };
  }
  if (t === 'jpeg' || t === 'png' || t === 'webp') {
    let blob; try { blob = await shrinkImage(file, 2400); } catch (e) { throw errAllegato(nome + ': immagine non leggibile, non allegata'); }
    return { blob, type: 'image/jpeg', name: base + '.jpg' };
  }
  throw errAllegato(nome + ': tipo di file non ammesso. Si possono allegare foto, PDF e Word (.docx)');
}
// apre un allegato già salvato: foto e PDF nel visore di Nembo, Word con l'app Word, il resto si salva senza aprirlo
async function apriAllegato(it, show) {
  const b = it.blobId && await DB.getBlob(it.blobId);
  if (!b) { toast('Il file non è più su questo dispositivo'); return; }
  const t = tipoDaTesta(await testa(b.blob));
  const nome = it.nome || b.name || 'file';
  if (t === 'pdf') { show.pdf({ blob: b.blob, nome }); return; }
  if (t === 'jpeg' || t === 'png' || t === 'webp') { show.img(it.blobId); return; }
  if (t === 'zip' && /\.docx$/i.test(nome)) { await shareFiles([{ blob: new Blob([b.blob], { type: MIME_DOCX }), name: nome }], nome); return; }
  toast('Tipo di file non ammesso: lo salvo senza aprirlo');
  downloadBlob(new Blob([b.blob], { type: 'application/octet-stream' }), nome);
}
// PDF mostrato come immagini delle pagine (PDF.js non esegue gli script del documento)
function PdfViewer({ blob, nome, onClose }) {
  const [ids, setIds] = useState(null);
  useEffect(() => {
    let alive = true; const made = [];
    (async () => {
      try {
        const doc = await openPdf(new Uint8Array(await blob.arrayBuffer()));
        const n = Math.min(doc.numPages, PDF_MAX_PAG);
        for (let i = 1; i <= n && alive; i++) {
          if (n > 1) _progress({ title: 'Apro il PDF', text: nome, done: i - 1, total: n });
          const page = await doc.getPage(i);
          const v1 = page.getViewport({ scale: 1 });
          const v = page.getViewport({ scale: Math.min(4, 2000 / Math.max(v1.width, v1.height)) });
          const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
          const ctx = c.getContext('2d'); ctx.fillStyle = PRINT.carta; ctx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: ctx, viewport: v }).promise;
          const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
          c.width = c.height = 0; page.cleanup();
          const id = uid('pdfpag'); urlCache.set(id, URL.createObjectURL(out)); made.push(id);
        }
        if (doc.numPages > PDF_MAX_PAG && alive) toast(`Mostro le prime ${PDF_MAX_PAG} pagine di ${doc.numPages}`);
        doc.destroy();
        if (alive) setIds(made);
      } catch (e) { if (alive) { fail('PDF non leggibile', e); onClose(); } }
      _progress(null);
    })();
    return () => { alive = false; made.forEach(id => { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }); };
  }, []);
  if (!ids) return null;
  return html`<${Viewer} ids=${ids} labelOf=${() => nome} onClose=${onClose} />`;
}

/* ---------------- file da backup e sincronizzazione ---------------- */
// tipo da salvare per un file in arrivo, o null se non è ammesso (meta: { type, name } dichiarati)
async function tipoFileArrivo(data, meta = {}) {
  const t = tipoDaTesta(data.subarray ? data.subarray(0, 12) : await testa(data));
  if (t === 'jpeg') return 'image/jpeg';
  if (t === 'png') return 'image/png';
  if (t === 'webp') return 'image/webp';
  if (t === 'pdf') return PDF_MIME;
  if (t === 'zip') {
    const dich = String(meta.type || ''), nome = String(meta.name || '');
    const kind = dich === MIME_XLSX || /\.xlsx$/i.test(nome) ? 'xlsx' : dich === MIME_DOCX || /\.docx$/i.test(nome) ? 'docx' : null;
    if (kind && !(await officeRischi(data, kind))) return kind === 'xlsx' ? MIME_XLSX : MIME_DOCX;
  }
  return null;
}

/* ---------------- attività in arrivo (backup ZIP, sincronizzazione) ---------------- */
const TIPI_REC = ['dda', 'mappatura', 'radon', 'ra', 'hs', 'vs', 'firme', 'aria', 'app', 'cli'];
const ID_OK = /^[A-Za-z0-9_-]{1,80}$/;
const CHIAVI_VIETATE = new Set(['__proto__', 'constructor', 'prototype']);
const ARR_FOTO = new Set(['foto', 'fotoPrec', 'fotoAppunti', 'fotoAppunti2']);
const ARR_OGG = new Set(['manufatti', 'punti', 'momenti', 'recs', 'checklist', 'documenti', 'rapporti', 'planimetrie', 'fogli', 'partecipanti']);
const DATA_OK = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]*$/;
const REC_MAX = 20 * 1048576;
function chiaviVietate(o) {
  if (Array.isArray(o)) return o.some(chiaviVietate);
  if (isObj(o)) return Object.keys(o).some(k => CHIAVI_VIETATE.has(k) || chiaviVietate(o[k]));
  return false;
}
// struttura di partenza del tipo, per completare i campi mancanti
function modelloDi(r) {
  const s = DEFAULT_SETTINGS;
  try {
    switch (r.type) {
      case 'dda': return newDda([], s); case 'mappatura': return newMappatura([], s); case 'radon': return newRadon(s);
      case 'ra': return newRa([], s); case 'hs': return newHs([], s, r.formato); case 'vs': return newVerbale([], s);
      case 'firme': return newFirmeRec([], s); case 'aria': return newAria([], s); case 'app': return newApp(); case 'cli': return newCliente();
    }
  } catch (e) { /* modello non disponibile: si controlla solo la forma */ }
  return {};
}
// ripulisce in profondità: elenchi di foto solo con testi, elenchi di oggetti solo con oggetti, data: solo immagini
function ripulisci(o) {
  if (Array.isArray(o)) { o.forEach(ripulisci); return; }
  if (!isObj(o)) return;
  for (const [k, v] of Object.entries(o)) {
    if (ARR_FOTO.has(k)) o[k] = Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
    else if (ARR_OGG.has(k) && v != null) o[k] = Array.isArray(v) ? v.filter(isObj) : [];
    else if (typeof v === 'string' && /^\s*data:/i.test(v) && !DATA_OK.test(v)) o[k] = '';
    if (typeof o[k] === 'object') ripulisci(o[k]);
  }
}
// [record ripulito, null] oppure [null, motivo]
function pulisciRecord(r) {
  if (!isObj(r)) return [null, 'non è un\'attività'];
  if (!TIPI_REC.includes(r.type)) return [null, 'tipo di attività sconosciuto'];
  if (typeof r.id !== 'string' || !ID_OK.test(r.id)) return [null, 'identificativo non valido'];
  let json; try { json = JSON.stringify(r); } catch (e) { return [null, 'contenuto non leggibile']; }
  if (json.length > REC_MAX) return [null, 'attività troppo grande'];
  if (chiaviVietate(r)) return [null, 'contenuto non ammesso'];
  const c = JSON.parse(json);
  const base = modelloDi(c);
  for (const [k, def] of Object.entries(base)) {
    if (k === 'id' || k === 'type') continue;
    if (Array.isArray(def)) { if (!Array.isArray(c[k])) c[k] = []; }
    else if (isObj(def)) {
      if (!isObj(c[k])) c[k] = JSON.parse(JSON.stringify(def));
      else for (const [kk, d2] of Object.entries(def)) if (Array.isArray(d2) && !Array.isArray(c[k][kk])) c[k][kk] = [];
    } else if (c[k] === undefined) c[k] = def;
  }
  ripulisci(c);
  if (typeof c.updatedAt !== 'number') c.updatedAt = 0;
  return [migraRecord(c), null];
}
// impostazioni da un backup o da una configurazione: solo le chiavi note, con il tipo atteso
function pulisciImpostazioni(s) {
  if (!isObj(s)) return null;
  const out = {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in s)) continue;
    const v = s[k];
    const ok = Array.isArray(def) ? Array.isArray(v) : isObj(def) ? isObj(v) : typeof v === typeof def;
    if (ok && !chiaviVietate(v)) out[k] = v;
  }
  if (out.firmaTecnico && !DATA_OK.test(out.firmaTecnico)) delete out.firmaTecnico;
  return out;
}

/* ---------------- firma dei backup ----------------
   Ogni dispositivo ha una coppia di chiavi ECDSA P-256. La chiave privata è creata non esportabile e resta solo
   nell'archivio del dispositivo; la chiave pubblica va nella cartella dell'app su OneDrive (_nembo/chiavi/<impronta>.json),
   così gli altri tuoi dispositivi collegati allo stesso account la riconoscono.
   Ogni ZIP contiene firma.json: firma di manifest.json, che a sua volta contiene le impronte SHA-256 di tutti i file.
   Al ripristino: firma non valida = backup modificato, ripristino annullato; firma di un dispositivo non riconosciuto
   o backup senza firma = si chiede conferma. */
const FIRMA_ALG = { name: 'ECDSA', namedCurve: 'P-256' }, FIRMA_SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const CHIAVI_DIR = '_nembo/chiavi/';
const pubJwk = j => ({ kty: j.kty, crv: j.crv, x: j.x, y: j.y });
const improntaChiave = async jwk => (await sha256(new TextEncoder().encode(JSON.stringify(pubJwk(jwk))))).slice(0, 32);
let _chiaveP = null;
function chiaveDispositivo() {
  return _chiaveP || (_chiaveP = (async () => {
    const c = await DB.get('chiave_dispositivo');
    if (c && c.priv && c.jwk && c.fp) return c;
    const k = await crypto.subtle.generateKey(FIRMA_ALG, false, ['sign', 'verify']);
    const jwk = pubJwk(await crypto.subtle.exportKey('jwk', k.publicKey));
    const n = { priv: k.privateKey, jwk, fp: await improntaChiave(jwk), creata: Date.now() };
    await DB.set('chiave_dispositivo', n);
    return n;
  })().catch(e => { _chiaveP = null; throw e; }));
}
// pubblica la chiave pubblica di questo dispositivo su OneDrive (una volta sola)
async function chiavePubblica() {
  if (!OD.account || !navigator.onLine) return;
  const c = await chiaveDispositivo();
  if ((await DB.get('chiave_pubblicata')) === c.fp) return;
  const doc = { app: 'nembo', kind: 'chiave', chiave: c.jwk, impronta: c.fp, creata: new Date(c.creata).toISOString() };
  await OD.putRaw(CHIAVI_DIR + c.fp + '.json', new Blob([JSON.stringify(doc)], { type: 'application/json' }), 'application/json');
  await DB.set('chiave_pubblicata', c.fp);
}
// impronte delle chiavi dei tuoi dispositivi: da OneDrive se raggiungibile, altrimenti l'ultimo elenco salvato
async function chiaviNote() {
  let L = (await DB.get('chiavi_note')) || [];
  if (OD.account && navigator.onLine) {
    try {
      L = (await OD.list(CHIAVI_DIR)).map(f => f.name.replace(/\.json$/, '')).filter(x => /^[0-9a-f]{32}$/.test(x));
      await DB.set('chiavi_note', L);
    } catch (e) { /* accesso da rinnovare o rete assente: resta l'elenco salvato */ }
  }
  return L;
}
/* Codice utente: un segreto casuale di 256 bit, uguale su tutti i dispositivi della stessa persona.
   Viaggia solo nel file di configurazione (mai nei backup né su OneDrive) ed è legato al nome del tecnico:
   se la configurazione viene adattata per un collega cambiando nome e cognome, sul suo dispositivo il codice non viene accettato.
   Ogni backup porta, oltre alla firma del dispositivo, un HMAC-SHA256 di manifest.json con questo codice:
   un altro dispositivo con la stessa configurazione riconosce il backup come tuo anche senza OneDrive. */
const nomeTecnico = s => cliNorm(`${(s && s.tecnicoNome) || ''} ${(s && s.tecnicoCognome) || ''}`);
const hmacKey = raw => crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
const idUtente = async raw => (await sha256(raw)).slice(0, 16);
async function chiaveUtente(crea) {
  const u = await DB.get('chiave_utente');
  if (u && typeof u.k === 'string') return u;
  if (!crea) return null;
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const n = { k: bufToB64(raw), per: nomeTecnico(_settings), id: await idUtente(raw) };
  await DB.set('chiave_utente', n);
  return n;
}
// dal file di configurazione: accettato solo se è dello stesso tecnico della configurazione
async function chiaveUtenteDaConfig(u, settings) {
  const nome = nomeTecnico(settings);
  const ok = isObj(u) && typeof u.k === 'string' && typeof u.per === 'string' && u.per === nome && /^[A-Za-z0-9+/=]{40,48}$/.test(u.k) && b64ToBuf(u.k).byteLength === 32;
  if (ok) { await DB.set('chiave_utente', { k: u.k, per: u.per, id: await idUtente(b64ToBuf(u.k)) }); return true; }
  const cur = await DB.get('chiave_utente');
  if (cur && cur.per !== nome) await DB.set('chiave_utente', null); // configurazione di un'altra persona: il codice precedente non vale più
  return false;
}
// nome del tecnico cambiato in Impostazioni: il codice di un'altra persona non resta su questo dispositivo
async function chiaveUtenteNome(settings) {
  const cur = await DB.get('chiave_utente');
  if (cur && cur.per !== nomeTecnico(settings)) await DB.set('chiave_utente', null);
}
async function firmaBackup(manText) {
  const c = await chiaveDispositivo();
  const sig = await crypto.subtle.sign(FIRMA_SIGN, c.priv, new TextEncoder().encode(manText));
  chiavePubblica().catch(e => console.warn('chiave', e));
  const f = { app: 'nembo', kind: 'firma', alg: 'ECDSA-P256-SHA256', chiave: c.jwk, impronta: c.fp, firma: bufToB64(sig), creata: new Date().toISOString() };
  const u = await chiaveUtente(true);
  f.utente = { id: u.id, alg: 'HMAC-SHA256', firma: bufToB64(await crypto.subtle.sign('HMAC', await hmacKey(b64ToBuf(u.k)), new TextEncoder().encode(manText))) };
  return f;
}
// 'questo' | 'tuo' | 'sconosciuto' | 'non valida'
async function verificaFirma(manText, f) {
  try {
    if (!isObj(f) || f.alg !== 'ECDSA-P256-SHA256' || !isObj(f.chiave) || typeof f.firma !== 'string') return 'non valida';
    const jwk = pubJwk(f.chiave);
    const key = await crypto.subtle.importKey('jwk', jwk, FIRMA_ALG, false, ['verify']);
    if (!await crypto.subtle.verify(FIRMA_SIGN, key, b64ToBuf(f.firma), new TextEncoder().encode(manText))) return 'non valida';
    const fp = await improntaChiave(jwk);
    const mia = await DB.get('chiave_dispositivo');
    if (mia && mia.fp === fp) return 'questo';
    // stesso codice utente (stessa configurazione): riconosciuto anche senza OneDrive
    const u = await chiaveUtente(false);
    if (u && isObj(f.utente) && f.utente.id === u.id) {
      return await crypto.subtle.verify('HMAC', await hmacKey(b64ToBuf(u.k)), b64ToBuf(String(f.utente.firma)), new TextEncoder().encode(manText)) ? 'tuo' : 'non valida';
    }
    return (await chiaviNote()).includes(fp) ? 'tuo' : 'sconosciuto';
  } catch (e) { return 'non valida'; }
}
const FIRMA_ESITO = { questo: 'Firma valida, di questo dispositivo.', tuo: 'Firma valida, di un tuo dispositivo.', sconosciuto: 'Firma valida, di un dispositivo non riconosciuto.', assente: 'Backup senza firma.' };

/* ---------------- impronta dei fogli firme chiusi ----------------
   SHA-256 dei dati del foglio al momento della chiusura (partecipanti, firme, orari, relatore):
   ricalcolandola si vede se il foglio è stato cambiato dopo. */
async function improntaFoglio(f) {
  const dati = { titolo: f.titolo || '', data: f.data || '', chiuso: f.chiuso || null, firmaRelatore: f.firmaRelatore || '',
    partecipanti: (f.partecipanti || []).map(p => [p.nome || '', p.societa || '', p.ruolo || '', p.firma || '', p.ts || null]) };
  return sha256(new TextEncoder().encode(JSON.stringify(dati)));
}


/* ---------------- firma del tecnico su OneDrive, cifrata con un PIN ----------------
   La firma va nella configurazione su OneDrive solo cifrata: AES-GCM con una chiave ricavata dal PIN (PBKDF2-SHA256).
   Su questo dispositivo resta la chiave (non esportabile) con il suo sale, così i salvataggi automatici
   non chiedono il PIN; il PIN non viene mai salvato. Al ripristino su un altro dispositivo il PIN serve per decifrarla. */
const PIN_ITER = 310000, PIN_ALG = 'PBKDF2-SHA256/AES-GCM';
const pinOk = p => /^\d{6}$/.test(String(p || ''));
async function pinChiave(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: PIN_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const pinImpostato = async () => !!(await DB.get('cfg_pin'));
async function pinImposta(pin) {
  if (!pinOk(pin)) throw new Error('il PIN deve avere 6 cifre');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await DB.set('cfg_pin', { salt: bufToB64(salt), key: await pinChiave(pin, salt) });
}
// null se manca la firma o il PIN
async function firmaCifra(dataUrl) {
  const p = await DB.get('cfg_pin');
  if (!p || !p.key || !dataUrl) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, p.key, new TextEncoder().encode(dataUrl));
  return { alg: PIN_ALG, iter: PIN_ITER, salt: p.salt, iv: bufToB64(iv), ct: bufToB64(ct) };
}
// firma in chiaro (PNG o JPEG verificato); errore se il PIN è sbagliato o il contenuto non è valido
async function firmaDecifra(f, pin) {
  if (!isObj(f) || f.alg !== PIN_ALG || typeof f.salt !== 'string' || typeof f.iv !== 'string' || typeof f.ct !== 'string') throw new Error('firma non leggibile');
  const salt = new Uint8Array(b64ToBuf(f.salt)), key = await pinChiave(pin, salt);
  let pt;
  try { pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(f.iv)) }, key, b64ToBuf(f.ct)); }
  catch (e) { throw Object.assign(new Error('PIN non corretto'), { code: 'PIN' }); }
  const url = new TextDecoder().decode(pt);
  if (!DATA_OK.test(url)) throw new Error('firma non valida');
  await DB.set('cfg_pin', { salt: f.salt, key }); // stessa chiave per i prossimi salvataggi da questo dispositivo
  return url;
}
