/* File delle attività: nomi, ZIP, invio a OneDrive senza sincronizzazione, import dello ZIP e pagina Backup. */

// nome leggibile dell’attività (notifiche, messaggi): codice · cliente · indirizzo
function recordTitle(r) {
  const id = r.codice || (r.type === 'radon' ? ['Radon', r.commessa].filter(Boolean).join(' ') : r.commessa);
  return [id, r.cliente, placeLabel(r)].filter(Boolean).join(' · ');
}
function recordLabel(r) {
  if (r.type === 'app') return slug(['Appuntamento', r.data, r.titolo].filter(Boolean).join('_')) || r.id;
  return r.type === 'dda' || r.type === 'mappatura' || r.type === 'ra' || r.type === 'hs' || r.type === 'vs' || r.type === 'firme' || r.type === 'aria' ? slug([r.codice, r.cliente, r.sito || placeAddr(r)].filter(Boolean).join('_'))
    : slug(['Radon', r.commessa, r.cliente, r.citta].filter(Boolean).join('_')) || r.id;
}

// Costruisce lo ZIP: cartelle leggibili (foto, documenti, PDF) + manifest.json per il ripristino
async function buildZip(records, settings, withSettings) {
  await needLib('jszip'); const zip = new JSZip();
  const files = {};
  const used = new Set();
  const uniq = p => { let q = p, i = 2; while (used.has(q)) q = p.replace(/(\.[^.]+)$/, `_${i++}$1`); used.add(q); return q; };
  const addBlob = async (id, path) => {
    if (!id || files[id]) return;
    const b = await DB.getBlob(id); if (!b) return;
    const ext = (b.name && b.name.includes('.')) ? b.name.slice(b.name.lastIndexOf('.')) : (b.type === 'image/jpeg' ? '.jpg' : '');
    const full = uniq(path.includes('.') ? path : path + ext);
    // impronta SHA-256: al ripristino si controlla che il file non sia cambiato
    zip.file(full, b.blob); files[id] = { path: full, type: b.type, name: b.name, sha256: await sha256(b.blob) };
  };
  for (const r of records) {
    if (r.type === 'cli') continue; // i clienti vanno solo nel manifest
    const dir = recordLabel(r) + '/';
    if (r.type === 'ra') {
      for (const m of r.manufatti) for (const [k, f] of m.foto.entries()) await addBlob(f, `${dir}foto/${slug(m.codice) || 'manufatto'}_${k + 1}.jpg`);
    } else if (r.type === 'hs') {
      for (const [k, p] of hsFotoOrd(r).entries()) await addBlob(p.id, `${dir}foto/${String(k + 1).padStart(3, '0')}${p.g === 'prev' ? '_prec' : ''}${p.cap ? '_' + slug(p.cap) : ''}.jpg`);
      for (const [k, v] of Object.entries(r.img || {})) await addBlob(v, `${dir}immagini/${k}.jpg`);
      for (const [k, o] of (r.cgFoto || []).entries()) await addBlob(o.id, `${dir}immagini/inquadramento_${k + 1}.jpg`);
      for (const d of (r.documenti || [])) await addBlob(d.blobId, `${dir}documenti/${d.nome}`);
      try { zip.file(uniq(`${dir}${slug(hsFileBase(r))}.docx`), await hsBuildDocx(r, settings, {})); } catch (e) { console.warn('hs word', e); }
    } else if (r.type === 'radon') {
      for (const [i, p] of r.punti.entries()) for (const [k, f] of p.foto.entries()) await addBlob(f, `${dir}foto/R${i + 1}_${k + 1}.jpg`);
      for (const d of r.rapporti) await addBlob(d.blobId, `${dir}rapporti/${d.nome}`);
      try {
        const bytes = await PdfGen.radonPdf(await loadTemplate('radon.pdf'), r);
        zip.file(uniq(`${dir}Scheda_radon_${slug(r.commessa || 'campagna')}.pdf`), bytes);
      } catch (e) { console.warn(e); }
    } else if (r.type === 'vs') {
      for (const x of vsPhotos(r)) await addBlob(x.id, `${dir}note/${slug(x.name)}.jpg`);
      for (const [k, v] of Object.entries(r.img || {})) if (v) await addBlob(v, `${dir}immagini/${k}.jpg`);
      if (await DB.get(TEMPLATES['vs.docx'].key)) try { zip.file(uniq(`${dir}${slug(vsFileBase(r))}.docx`), await vsBuildDocx(r, settings, {})); } catch (e) { console.warn('vs word', e); }
    } else if (r.type === 'firme' || r.type === 'aria' || r.type === 'app') {
      // solo fogli firme / monitoraggio aria: i file si aggiungono sotto
    } else {
      for (const x of r.recs) for (const [k, f] of x.foto.entries()) await addBlob(f, `${dir}foto/${slug(x.nome)}_${k + 1}.jpg`);
      for (const m of MATS) for (const c of r.campioni[m.k]) for (const [k, f] of (c.foto || []).entries()) await addBlob(f, `${dir}foto/${m.l}_${slug(c.codice) || 'campione'}_${k + 1}.jpg`);
      for (const x of ncOf(r)) for (const [k, f] of (x.foto || []).entries()) await addBlob(f, `${dir}foto/${x.codice}_${k + 1}.jpg`);
      for (const x of [...((r.precedente || {}).campioni || []), ...((r.precedente || {}).nc || [])]) for (const [k, f] of (x.foto || []).entries()) await addBlob(f, `${dir}foto/Precedente_${slug(x.codice) || 'campione'}_${k + 1}.jpg`);
      for (const d of r.documenti) await addBlob(d.blobId, `${dir}documenti/${d.nome}`);
      try {
        for (const k of ['mca', 'fav']) if (r.campioni[k].length) zip.file(uniq(`${dir}Scheda_campioni_${k.toUpperCase()}.xlsx`), await schedaCampioniXlsx(r, k, settings));
        if (allCamp(r).length) zip.file(uniq(`${dir}Riepilogo_campioni.docx`), await riepilogoCampioniDocx(r, settings));
      } catch (e) { console.warn('office', e); }
      for (const k of ['mca', 'fav']) if (r.campioni[k].length) {
        try {
          const s = settings;
          const bytes = await schedaCampioniPdfBytes(r, k, s);
          zip.file(uniq(`${dir}Scheda_campioni_${k.toUpperCase()}.pdf`), bytes);
        } catch (e) { console.warn(e); }
      }
    }
    for (const p of (r.planimetrie || [])) {
      await addBlob(p.blobId, `${dir}planimetrie/${slug(p.nome)}.pdf`);
      if (p.mergedBlobId) await addBlob(p.mergedBlobId, `${dir}planimetrie/${slug(p.nome)}_annotata.pdf`);
    }
    for (const f of (r.fogli || [])) if (foglioFirme(f)) { try { zip.file(uniq(`${dir}firme/${foglioNome(f)}.pdf`), await foglioPdf(r, f, settings)); } catch (e) { console.warn('firme', e); } }
    // monitoraggio aria (attività a sé o sezione dell'RA)
    for (const x of ariaPhotos(r)) await addBlob(x.id, `${dir}aria/${slug(x.name)}.jpg`);
    for (const d of ariaRapporti(r)) await addBlob(d.blobId, `${dir}aria/rapporti/${d.nome}`);
    for (const o of ariaOutputs(r, settings)) { try { zip.file(uniq(`${dir}aria/${o.name}${o.ext}`), await o.make()); } catch (e) { console.warn('aria', e); } }
    // eventuali file non ancora inclusi
    for (const [k, f] of (r.fotoAppunti || []).entries()) await addBlob(f, `${dir}foto/Appunti_${k + 1}.jpg`);
    for (const [k, f] of (r.fotoAppunti2 || []).entries()) await addBlob(f, `${dir}foto/Appunti_Fase2_${k + 1}.jpg`);
    for (const id of blobIds(r)) await addBlob(id, `${dir}altri/${id}`);
  }
  const manifest = { app: 'nembo', version: 1, impronte: 'sha256', exportedAt: new Date().toISOString(), records, files };
  if (withSettings) {
    manifest.settings = settings; manifest.templates = {};
    for (const [name, t] of Object.entries(TEMPLATES)) {
      const b = await DB.get(t.key);
      if (b) { zip.file('_modelli/' + name, b); manifest.templates[t.key] = '_modelli/' + name; }
    }
  }
  const manText = JSON.stringify(manifest, null, 1);
  zip.file('manifest.json', manText);
  // firma del dispositivo su manifest.json (che contiene le impronte di tutti i file)
  try { zip.file('firma.json', JSON.stringify(await firmaBackup(manText), null, 1)); } catch (e) { console.warn('firma del backup', e); }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

// Tutti i PDF, le foto e gli allegati (PDF/immagini) di un record, con nomi leggibili
async function recordFiles(r, settings) {
  const s = settings || _settings;
  const pre = (r.type === 'dda' || r.type === 'mappatura' || r.type === 'hs' || r.type === 'vs' || r.type === 'ra' || r.type === 'firme' || r.type === 'aria') ? slug([r.codice, r.commessa].filter(Boolean).join('_')) : slug(['Radon', r.commessa || r.cliente].filter(Boolean).join('_'));
  const out = [];
  const pdf = (bytes, name) => out.push({ blob: new Blob([bytes], { type: 'application/pdf' }), name: `${pre}_${name}.pdf` });
  const add = async (id, name) => {
    const b = id && await DB.getBlob(id); if (!b) return;
    const docx = b.type === MIME_DOCX;
    if (!docx && !/^(image\/|application\/pdf)/.test(b.type || '')) return;
    const ext = docx ? '.docx' : b.type === 'application/pdf' ? '.pdf' : '.jpg';
    out.push({ blob: b.blob, name: `${pre}_${slug(name)}${name.toLowerCase().endsWith(ext) ? '' : ext}` });
  };
  if (r.type === 'ra') {
    for (const m of r.manufatti) for (const [k, f] of m.foto.entries()) await add(f, `${m.codice || 'manufatto'}_${k + 1}`);
  } else if (r.type === 'hs') {
    try { out.push({ blob: await hsBuildDocx(r, s, {}), name: `${pre}_${slug(hsFileBase(r))}.docx` }); } catch (e) { console.warn('hs word', e); }
    for (const [k, p] of hsFotoOrd(r).filter(p => p.g !== 'prev').entries()) await add(p.id, `Foto_${k + 1}${p.cap ? '_' + p.cap : ''}`);
    for (const [k, o] of (r.cgFoto || []).entries()) await add(o.id, `Inquadramento_${k + 1}`);
    for (const d of (r.documenti || [])) await add(d.blobId, d.nome.replace(/\.[^.]+$/, ''));
  } else if (r.type === 'radon') {
    pdf(await PdfGen.radonPdf(await loadTemplate('radon.pdf'), r), 'Scheda_radon');
    for (const [i, p] of r.punti.entries()) for (const [k, f] of p.foto.entries()) await add(f, `R${i + 1}_${k + 1}`);
    for (const d of r.rapporti) await add(d.blobId, d.nome.replace(/\.[^.]+$/, ''));
  } else if (r.type === 'vs') {
    for (const x of vsPhotos(r)) await add(x.id, x.name);
    if (await DB.get(TEMPLATES['vs.docx'].key)) try { out.push({ blob: await vsBuildDocx(r, s, {}), name: vsFileBase(r) + '.docx' }); } catch (e) { console.warn('vs word', e); }
  } else if (r.type === 'firme' || r.type === 'aria' || r.type === 'app') {
    // solo fogli firme / monitoraggio aria
  } else {
    for (const k of ['mca', 'fav']) if (r.campioni[k].length) pdf(await schedaCampioniPdfBytes(r, k, s), 'Scheda_campioni_' + k.toUpperCase());
    for (const x of r.recs) for (const [k, f] of x.foto.entries()) await add(f, `${x.nome}_${k + 1}`);
    for (const m of MATS) for (const c of r.campioni[m.k]) for (const [k, f] of (c.foto || []).entries()) await add(f, `${m.l}_${c.codice || 'campione'}_${k + 1}`);
    for (const x of ncOf(r)) for (const [k, f] of (x.foto || []).entries()) await add(f, `${x.codice}_${k + 1}`);
    for (const d of r.documenti) await add(d.blobId, d.nome.replace(/\.[^.]+$/, ''));
  }
  for (const [k, f] of (r.fotoAppunti || []).entries()) await add(f, `Appunti_${k + 1}`);
  for (const [k, f] of (r.fotoAppunti2 || []).entries()) await add(f, `Appunti_Fase2_${k + 1}`);
  for (const p of (r.planimetrie || [])) await add(p.mergedBlobId || p.blobId, 'Planimetria_' + p.nome + (p.mergedBlobId ? '_annotata' : ''));
  for (const f of (r.fogli || [])) if (foglioFirme(f)) pdf(await foglioPdf(r, f, s), foglioNome(f));
  for (const x of ariaPhotos(r)) await add(x.id, x.name);
  for (const d of ariaRapporti(r)) await add(d.blobId, 'Aria_' + d.nome.replace(/\.[^.]+$/, ''));
  for (const o of ariaOutputs(r, s)) { try { const b = await o.make(); out.push({ blob: b instanceof Blob ? b : new Blob([b], { type: 'application/pdf' }), name: `${pre}_${o.name}${o.ext}` }); } catch (e) { console.warn('aria', e); } }
  return out;
}

// Condivisione a gruppi: Chrome accetta al massimo 10 file e circa 50 MB per volta
async function sendToOneDrive(r, settings) {
  toast('Preparo i file…');
  let files;
  try { files = await recordFiles(r, settings); } catch (e) { fail('Non riesco a preparare i file', e); return; }
  if (!files.length) { toast('Nessun file da inviare'); return; }
  const groups = []; let g = [], size = 0;
  for (const f of files) {
    if (g.length && (g.length === 10 || size + f.blob.size > 45 * 1048576)) { groups.push(g); g = []; size = 0; }
    g.push(f); size += f.blob.size;
  }
  if (g.length) groups.push(g);
  for (const [i, grp] of groups.entries()) {
    const label = groups.length > 1 ? `Invio a OneDrive · gruppo ${i + 1} di ${groups.length}` : 'Invio a OneDrive';
    const res = await shareFiles(grp, label, { ask: true, label, noDownload: true });
    if (res === 'cancel') { toast('Invio interrotto'); return; }
    if (res === 'failed') { toast('Condivisione non disponibile: uso lo ZIP in Download'); await exportRecords([r], settings); return; }
  }
  toast('File inviati');
}

// Finestra "Salva con nome" di Android/PC (Chrome 132+ su Android): lì si può scegliere OneDrive.
// Va aperta subito dopo il tocco, prima di preparare lo ZIP.
async function pickSaveHandle(name) {
  if (!('showSaveFilePicker' in window)) return null;
  try { return await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Archivio ZIP', accept: { 'application/zip': ['.zip'] } }] }); }
  catch (e) { if (e.name === 'AbortError') return 'cancel'; console.warn('save picker', e); return null; }
}

async function exportRecords(records, settings, full) {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = full ? `Nembo_backup_${stamp}.zip` : records.length > 1 ? `Nembo_${records.length}_attivita_${stamp}.zip` : `${recordLabel(records[0])}_${stamp}.zip`;
  const handle = await pickSaveHandle(name);
  if (handle === 'cancel') return 'cancel';
  toast('Preparo lo ZIP…');
  try {
    const blob = await buildZip(records, settings || _settings, full);
    let res;
    if (handle) {
      const w = await handle.createWritable(); await w.write(blob); await w.close();
      res = 'saved'; toast(`ZIP salvato (${(blob.size / 1048576).toFixed(1)} MB)`);
    } else {
      res = await shareFiles([{ blob, name }], name);
      if (res === 'downloaded') toast('ZIP salvato in Download: caricalo su OneDrive dall\'app OneDrive');
    }
    if (full && res !== 'cancel') await DB.set('lastBackup', Date.now());
    return res;
  } catch (e) { fail('Esportazione non riuscita', e); }
}

// Ripristino con controlli: limiti sullo ZIP, impronta e tipo reale di ogni file, struttura di ogni attività,
// impostazioni solo con le chiavi note, modelli verificati. Quello che non passa viene scartato e riportato in esito.
const ZIP_MAX_VOCI = 20000, ZIP_MAX_BYTES = 4 * 1024 * 1048576, MANIFEST_MAX = 100 * 1048576;
const zipSize = f => (f && f._data && f._data.uncompressedSize) || 0;
async function importZip(file, opts = {}) {
  await needLib('jszip'); const zip = await JSZip.loadAsync(file);
  const voci = Object.values(zip.files);
  if (voci.length > ZIP_MAX_VOCI) throw new Error('lo ZIP contiene troppi file per essere un backup di Nembo');
  if (voci.reduce((a, v) => a + zipSize(v), 0) > ZIP_MAX_BYTES) throw new Error('lo ZIP è troppo grande una volta aperto');
  const mf = zip.file('manifest.json'); if (!mf) throw new Error('lo ZIP non contiene manifest.json');
  if (zipSize(mf) > MANIFEST_MAX) throw new Error('manifest.json troppo grande');
  const manText = await mf.async('string');
  let man; try { man = JSON.parse(manText); } catch (e) { throw new Error('manifest.json non leggibile'); }
  if (!isObj(man) || man.app !== 'nembo') throw new Error('file di un\'altra applicazione');
  if (!Array.isArray(man.records)) throw new Error('il backup non contiene attività');
  // firma: prima di toccare l'archivio
  const ff = zip.file('firma.json');
  let firma = 'assente';
  if (ff) { let fj = null; try { fj = JSON.parse(await ff.async('string')); } catch (e) { /* firma illeggibile */ } firma = await verificaFirma(manText, fj); }
  if (firma === 'non valida') throw Object.assign(new Error('la firma non corrisponde al contenuto: il backup è stato modificato dopo essere stato creato. Ripristino annullato'), { code: 'FIRMA' });
  const domanda = firma === 'sconosciuto' ? 'Il backup è firmato da un dispositivo che Nembo non riconosce tra i tuoi (per riconoscerli serve OneDrive collegato oppure lo stesso file di configurazione). Ripristinare comunque?'
    : firma === 'assente' ? 'Il backup non è firmato: è stato creato prima della v48 oppure la firma è stata tolta. Ripristinare comunque?' : '';
  if (domanda && opts.conferma && !opts.conferma(domanda)) throw Object.assign(new Error('ripristino annullato'), { code: 'ANNULLATO' });
  const esito = { firma, verificati: 0, senzaImpronta: 0, alterati: [], fileScartati: [], attScartate: [] };
  for (const [id, info] of Object.entries(isObj(man.files) ? man.files : {})) {
    if (!/^b_[A-Za-z0-9_]{1,60}$/.test(id) || !isObj(info) || typeof info.path !== 'string') { esito.fileScartati.push(String(id).slice(0, 60) + ' (voce non valida)'); continue; }
    const f = zip.file(info.path); if (!f) continue;
    if (zipSize(f) > ALLEGATO_MAX) { esito.fileScartati.push(info.path + ' (oltre 60 MB)'); continue; }
    const data = await f.async('uint8array');
    if (typeof info.sha256 === 'string') {
      if (await sha256(data) !== info.sha256) { esito.alterati.push(info.path); continue; }
      esito.verificati++;
    } else esito.senzaImpronta++;
    const tipo = await tipoFileArrivo(data, info);
    if (!tipo) { esito.fileScartati.push(info.path + ' (tipo non ammesso)'); continue; }
    await DB.putBlob({ id, blob: new Blob([data], { type: tipo }), type: tipo, name: String(info.name || '').slice(0, 200) });
  }
  const current = await DB.all();
  let added = 0, updated = 0, kept = 0;
  for (const raw of man.records) {
    const [r, perche] = pulisciRecord(raw);
    if (!r) { esito.attScartate.push(((isObj(raw) && (raw.codice || raw.id)) || 'attività senza nome') + ' (' + perche + ')'); continue; }
    const ex = current.find(x => x.id === r.id);
    if (!ex) { await DB.put(r); added++; }
    else if ((r.updatedAt || 0) > (ex.updatedAt || 0)) { await DB.put(r); updated++; }
    else kept++;
  }
  const templates = {};
  for (const [key, path] of Object.entries(isObj(man.templates) ? man.templates : {})) {
    const name = Object.keys(TEMPLATES).find(n => TEMPLATES[n].key === key);
    const f = name && typeof path === 'string' && zip.file(path); if (!f) continue;
    const buf = await f.async('arraybuffer');
    try { await checkTemplate(name, buf); templates[key] = buf; } catch (e) { esito.fileScartati.push(path + ' (modello non valido)'); }
  }
  return { added, updated, kept, settings: pulisciImpostazioni(man.settings), templates, esito };
}

/* ---------------- backup ---------------- */
// backup completo su OneDrive in _nembo/backup/: Nembo non cancella nulla, la pagina Backup mostra gli ultimi BACKUP_TIENI. La firma del tecnico non va nello ZIP.
const BACKUP_DIR = '_nembo/backup/', BACKUP_TIENI = 3;
const backupNomeOk = n => /^Nembo_backup_[\w-]+\.zip$/.test(n);
async function backupOdList() {
  return (await OD.list(BACKUP_DIR)).filter(f => backupNomeOk(f.name)).sort((a, b) => b.name.localeCompare(a.name)).slice(0, BACKUP_TIENI);
}
async function backupSuOneDrive(all, settings) {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const name = `Nembo_backup_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.zip`;
  const T = 'Backup su OneDrive', mb = n => Math.round(n / 1048576);
  _progress({ title: T, text: 'Preparo lo ZIP…', done: 0, total: 1 });
  try {
    const blob = await buildZip(all, { ...settings, firmaTecnico: '' }, true);
    await OD.putRaw(BACKUP_DIR + name, blob, 'application/zip', { onProgress: (n, t) => _progress({ title: T, text: 'MB inviati', done: mb(n), total: Math.max(1, mb(t)) }) });
    _progress(null);
    await DB.set('lastBackup', Date.now());
    toast(`Backup salvato su OneDrive (${(blob.size / 1048576).toFixed(1)} MB)`);
    notify('ok', 'Backup salvato su OneDrive', { detail: name });
    return true;
  } catch (e) { _progress(null); fail('Backup non salvato su OneDrive', e); return false; }
}
function Backup({ records, all, settings, reload, lastBackup }) {
  const inp = useRef(); const [busy, setBusy] = useState(false);
  const [persist, setPersist] = useState(null);
  const [est, setEst] = useState(null);
  const [odL, setOdL] = useState(null);
  const loadOd = () => { if (OD.account && navigator.onLine) backupOdList().then(setOdL).catch(e => { console.warn('backup su OneDrive', e); setOdL([]); }); };
  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(setPersist);
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(setEst);
    loadOd();
  }, []);
  const doExport = async () => {
    setBusy(true);
    if (OD.account && navigator.onLine) { await backupSuOneDrive(all || records, settings); loadOd(); }
    else { if (OD.account) toast('Sei offline: salvo lo ZIP sul dispositivo.'); await exportRecords(all || records, settings, true); }
    setBusy(false); reload();
  };
  const ripristina = async f => {
    try {
      const res = await importZip(f, { conferma: m => confirm(m) });
      const hasTpl = Object.keys(res.templates || {}).length > 0;
      if ((res.settings || hasTpl) && confirm('Il backup contiene anche impostazioni e modelli PDF. Sostituire quelli attuali?')) {
        // i backup su OneDrive non hanno la firma: resta quella del dispositivo
        if (res.settings) { const { firmaTecnico, ...rs } = res.settings; await DB.set('settings', { ...settings, ...rs, ...(firmaTecnico ? { firmaTecnico } : {}) }); }
        for (const [k, b] of Object.entries(res.templates || {})) await DB.set(k, b);
      }
      const E = res.esito, problemi = [...E.alterati.map(x => x + ' (modificato dopo il backup)'), ...E.fileScartati, ...E.attScartate];
      toast(`Importati: ${res.added} nuovi, ${res.updated} aggiornati, ${res.kept} già presenti${problemi.length ? ` · ${problemi.length} elementi scartati` : ''}`);
      notify(problemi.length ? 'warn' : 'ok', problemi.length ? `Ripristino: ${problemi.length} elementi scartati dai controlli` : 'Ripristino completato', {
        detail: `${FIRMA_ESITO[E.firma] || ''} Attività: ${res.added} nuove, ${res.updated} aggiornate, ${res.kept} già presenti. File con impronta verificata: ${E.verificati}${E.senzaImpronta ? `; senza impronta (backup precedenti alla v48): ${E.senzaImpronta}` : ''}.`,
        items: problemi });
      reload();
    } catch (err) { if (err.code === 'ANNULLATO') toast('Ripristino annullato'); else fail('Import non riuscito', err); }
  };
  const doImport = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy(true); await ripristina(f); setBusy(false);
  };
  const daOneDrive = async f => {
    if (!confirm(`Ripristinare il backup del ${quandoIt(f.lastModifiedDateTime)}?`)) return;
    setBusy(true);
    _progress({ title: 'Ripristino', text: 'Scarico il backup da OneDrive…', done: 0, total: 1 });
    let b = null;
    try { b = await OD.getRaw(BACKUP_DIR + f.name); } catch (e) { fail('Backup non scaricato', e); }
    _progress(null);
    if (b) await ripristina(b); else if (b === null) toast('Backup non trovato su OneDrive');
    setBusy(false);
  };
  return html`<div class="content form">
    <${LargeTitle} top title="Backup" />
    <div class="card">
      <h2 style="font-size:var(--fs-xl);font-weight:600">Backup su OneDrive</h2>
      <p class="lead lead-gap">${OD.account ? `Un unico file ZIP con tutte le attività, salvato nella cartella dell'app su OneDrive: qui trovi gli ultimi ${BACKUP_TIENI}. La firma non è inclusa.`
        : 'Un unico file ZIP con tutte le indagini e campagne, anche con centinaia di foto: cartelle con foto, allegati e PDF, più i dati in manifest.json per il ripristino. Nella finestra di salvataggio scegli OneDrive; se non compare, il file va in Download e lo carichi dall\'app OneDrive.'}</p>
      <button class="btn pri block" disabled=${busy || !records.length} onClick=${doExport}>${busy ? html`<div class="spin" />` : html`<${Icon} n="archive" s=${18} />`} ${OD.account ? 'Salva su OneDrive' : 'Crea backup completo'}</button>
      ${OD.account && html`<button class="btn outline block mt-2" disabled=${busy || !records.length} onClick=${async () => { setBusy(true); await odSync(records.filter(r => !r._new), settings); setBusy(false); }}><${Icon} n="share" s=${18} /> Carica tutto su OneDrive</button>`}
      <div class="lock mt-2">${lastBackup ? 'Ultimo backup: ' + quandoIt(lastBackup) : 'Nessun backup ancora'}</div>
    </div>
    <div class="card">
      <h2 style="font-size:var(--fs-xl);font-weight:600">Ripristina da backup</h2>
      <p class="lead" style="margin:var(--sp-2) 0 var(--sp-3)">Scegli lo ZIP da OneDrive o dal telefono. I record già presenti vengono sostituiti solo se quelli del backup sono più recenti.</p>
      ${OD.account && odL && odL.length > 0 && html`<div class="fld"><span>Backup su OneDrive</span></div>
        <div class="list mb-2">${odL.map(f => html`<button key=${f.name} class="prow" style="width:100%;border:0;text-align:left" disabled=${busy} onClick=${() => daOneDrive(f)}>
          <span class="sq plain"><${Icon} n="archive" s=${18} /></span><span class="t"><b>${quandoIt(f.lastModifiedDateTime)}</b><small>${(f.size / 1048576).toFixed(1)} MB</small></span><${Icon} n="right" s=${18} /></button>`)}</div>`}
      <button class="btn block" disabled=${busy} onClick=${() => inp.current.click()}>Scegli file ZIP</button>
      <input ref=${inp} type="file" accept="application/zip,application/x-zip-compressed,application/octet-stream,.zip" hidden onChange=${doImport} />
    </div>
    <div class="card tight">
      <div class="lock">${persist === true ? 'Archivio protetto: Chrome non cancella i dati da solo.' : persist === false ? 'Archivio non protetto: installa l\'app nella schermata Home per proteggerlo.' : ''}</div>
      ${est && html`<div class="lock mt-1">Spazio usato: ${(est.usage / 1048576).toFixed(1)} MB</div>`}
    </div>
  </div>`;
}
