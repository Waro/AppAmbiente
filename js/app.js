/* Esportazione, backup, impostazioni e struttura dell'app */

let _settings = { ...DEFAULT_SETTINGS };

// nome leggibile della pratica (notifiche, messaggi): codice · cliente · indirizzo
function recordTitle(r) {
  const id = r.codice || (r.type === 'radon' ? ['Radon', r.commessa].filter(Boolean).join(' ') : r.commessa);
  return [id, r.cliente, placeLabel(r)].filter(Boolean).join(' · ');
}
function recordLabel(r) {
  return r.type === 'dda' || r.type === 'mappatura' || r.type === 'ra' ? slug([r.codice, r.cliente, r.sito || placeAddr(r)].filter(Boolean).join('_'))
    : slug(['Radon', r.commessa, r.cliente, r.citta].filter(Boolean).join('_')) || r.id;
}

// Costruisce lo ZIP: cartelle leggibili (foto, documenti, PDF) + manifest.json per il ripristino
async function buildZip(records, settings, withSettings) {
  const zip = new JSZip();
  const files = {};
  const used = new Set();
  const uniq = p => { let q = p, i = 2; while (used.has(q)) q = p.replace(/(\.[^.]+)$/, `_${i++}$1`); used.add(q); return q; };
  const addBlob = async (id, path) => {
    if (!id || files[id]) return;
    const b = await DB.getBlob(id); if (!b) return;
    const ext = (b.name && b.name.includes('.')) ? b.name.slice(b.name.lastIndexOf('.')) : (b.type === 'image/jpeg' ? '.jpg' : '');
    const full = uniq(path.includes('.') ? path : path + ext);
    zip.file(full, b.blob); files[id] = { path: full, type: b.type, name: b.name };
  };
  for (const r of records) {
    const dir = recordLabel(r) + '/';
    if (r.type === 'ra') {
      for (const m of r.manufatti) for (const [k, f] of m.foto.entries()) await addBlob(f, `${dir}foto/${slug(m.codice) || 'manufatto'}_${k + 1}.jpg`);
    } else if (r.type === 'radon') {
      for (const [i, p] of r.punti.entries()) for (const [k, f] of p.foto.entries()) await addBlob(f, `${dir}foto/R${i + 1}_${k + 1}.jpg`);
      for (const d of r.rapporti) await addBlob(d.blobId, `${dir}rapporti/${d.nome}`);
      try {
        const bytes = await PdfGen.radonPdf(await loadTemplate('radon.pdf'), r);
        zip.file(uniq(`${dir}Scheda_radon_${slug(r.commessa || 'campagna')}.pdf`), bytes);
      } catch (e) { console.warn(e); }
    } else {
      for (const x of r.recs) for (const [k, f] of x.foto.entries()) await addBlob(f, `${dir}foto/${slug(x.nome)}_${k + 1}.jpg`);
      for (const m of MATS) for (const c of r.campioni[m.k]) for (const [k, f] of (c.foto || []).entries()) await addBlob(f, `${dir}foto/${m.l}_${slug(c.codice) || 'campione'}_${k + 1}.jpg`);
      for (const d of r.documenti) await addBlob(d.blobId, `${dir}documenti/${d.nome}`);
      try {
        for (const k of ['mca', 'fav']) if (r.campioni[k].length) zip.file(uniq(`${dir}Scheda_campioni_${k.toUpperCase()}.xlsx`), await schedaCampioniXlsx(r, k, settings));
        if (allCamp(r).length) zip.file(uniq(`${dir}Riepilogo_campioni.docx`), await riepilogoCampioniDocx(r, settings));
      } catch (e) { console.warn('office', e); }
      for (const k of ['mca', 'fav']) if (r.campioni[k].length) {
        try {
          const s = settings;
          const bytes = await PdfGen.schedaCampioniPdf(await loadTemplate('scheda_campioni.pdf'), {
            commessa: r.commessa, sito: placeDoc(r), campioni: r.campioni[k],
            analisi: k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc },
            lab: { nome: s.labNome, r1: s.labR1, r2: s.labR2 }, offerta: s.offerta, offertaRev: s.offertaRev, email: s.emailReferti,
            prelevatoDa: s.prelevatoDa, verificatoDa: s.verificatoDa });
          zip.file(uniq(`${dir}Scheda_campioni_${k.toUpperCase()}.pdf`), bytes);
        } catch (e) { console.warn(e); }
      }
    }
    for (const p of (r.planimetrie || [])) {
      await addBlob(p.blobId, `${dir}planimetrie/${slug(p.nome)}.pdf`);
      if (p.mergedBlobId) await addBlob(p.mergedBlobId, `${dir}planimetrie/${slug(p.nome)}_annotata.pdf`);
    }
    // eventuali file non ancora inclusi
    for (const [k, f] of (r.fotoAppunti || []).entries()) await addBlob(f, `${dir}foto/Appunti_${k + 1}.jpg`);
    for (const [k, f] of (r.fotoAppunti2 || []).entries()) await addBlob(f, `${dir}foto/Appunti_Fase2_${k + 1}.jpg`);
    for (const id of blobIds(r)) await addBlob(id, `${dir}altri/${id}`);
  }
  const manifest = { app: 'nembo', version: 1, exportedAt: new Date().toISOString(), records, files };
  if (withSettings) {
    manifest.settings = settings; manifest.templates = {};
    for (const [name, t] of Object.entries(TEMPLATES)) {
      const b = await DB.get(t.key);
      if (b) { zip.file('_modelli/' + name, b); manifest.templates[t.key] = '_modelli/' + name; }
    }
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 1));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

// Tutti i PDF, le foto e gli allegati (PDF/immagini) di un record, con nomi leggibili
async function recordFiles(r, settings) {
  const s = settings || _settings;
  const pre = (r.type === 'dda' || r.type === 'mappatura') ? slug([r.codice, r.commessa].filter(Boolean).join('_')) : slug(['Radon', r.commessa || r.cliente].filter(Boolean).join('_'));
  const out = [];
  const pdf = (bytes, name) => out.push({ blob: new Blob([bytes], { type: 'application/pdf' }), name: `${pre}_${name}.pdf` });
  const add = async (id, name) => {
    const b = id && await DB.getBlob(id); if (!b) return;
    if (!/^(image\/|application\/pdf)/.test(b.type || '')) return;
    const ext = b.type === 'application/pdf' ? '.pdf' : '.jpg';
    out.push({ blob: b.blob, name: `${pre}_${slug(name)}${name.toLowerCase().endsWith(ext) ? '' : ext}` });
  };
  if (r.type === 'ra') {
    for (const m of r.manufatti) for (const [k, f] of m.foto.entries()) await add(f, `${m.codice || 'manufatto'}_${k + 1}`);
  } else if (r.type === 'radon') {
    pdf(await PdfGen.radonPdf(await loadTemplate('radon.pdf'), r), 'Scheda_radon');
    for (const [i, p] of r.punti.entries()) for (const [k, f] of p.foto.entries()) await add(f, `R${i + 1}_${k + 1}`);
    for (const d of r.rapporti) await add(d.blobId, d.nome.replace(/\.[^.]+$/, ''));
  } else {
    for (const k of ['mca', 'fav']) if (r.campioni[k].length) pdf(await PdfGen.schedaCampioniPdf(await loadTemplate('scheda_campioni.pdf'), {
      commessa: r.commessa, sito: placeDoc(r), campioni: r.campioni[k],
      analisi: k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc },
      lab: { nome: s.labNome, r1: s.labR1, r2: s.labR2 }, offerta: s.offerta, offertaRev: s.offertaRev, email: s.emailReferti,
      prelevatoDa: s.prelevatoDa, verificatoDa: s.verificatoDa }), 'Scheda_campioni_' + k.toUpperCase());
    for (const x of r.recs) for (const [k, f] of x.foto.entries()) await add(f, `${x.nome}_${k + 1}`);
    for (const m of MATS) for (const c of r.campioni[m.k]) for (const [k, f] of (c.foto || []).entries()) await add(f, `${m.l}_${c.codice || 'campione'}_${k + 1}`);
    for (const d of r.documenti) await add(d.blobId, d.nome.replace(/\.[^.]+$/, ''));
  }
  for (const [k, f] of (r.fotoAppunti || []).entries()) await add(f, `Appunti_${k + 1}`);
  for (const [k, f] of (r.fotoAppunti2 || []).entries()) await add(f, `Appunti_Fase2_${k + 1}`);
  for (const p of (r.planimetrie || [])) await add(p.mergedBlobId || p.blobId, 'Planimetria_' + p.nome + (p.mergedBlobId ? '_annotata' : ''));
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
  const name = full ? `Nembo_backup_${stamp}.zip` : `${recordLabel(records[0])}_${stamp}.zip`;
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

async function importZip(file) {
  const zip = await JSZip.loadAsync(file);
  const mf = zip.file('manifest.json'); if (!mf) throw new Error('lo ZIP non contiene manifest.json');
  const man = JSON.parse(await mf.async('string'));
  if (man.app !== 'nembo') throw new Error('file di un\'altra applicazione');
  for (const [id, info] of Object.entries(man.files || {})) {
    const f = zip.file(info.path); if (!f) continue;
    const blob = new Blob([await f.async('uint8array')], { type: info.type || '' });
    await DB.putBlob({ id, blob, type: info.type, name: info.name });
  }
  const current = await DB.all();
  let added = 0, updated = 0, kept = 0;
  for (const r of man.records || []) {
    const ex = current.find(x => x.id === r.id);
    if (!ex) { await DB.put(r); added++; }
    else if ((r.updatedAt || 0) > (ex.updatedAt || 0)) { await DB.put(r); updated++; }
    else kept++;
  }
  const templates = {};
  for (const [key, path] of Object.entries(man.templates || {})) { const f = zip.file(path); if (f) templates[key] = await f.async('arraybuffer'); }
  return { added, updated, kept, settings: man.settings, templates };
}

/* ---------------- file di configurazione ---------------- */
async function exportConfig(settings) {
  const { firmaTecnico, ...rest } = settings; // la firma resta personale
  const name = `Nembo_config_${slug(settings.tecnicoCognome || 'modello')}.json`;
  // finestra "Salva con nome" subito dopo il tocco: si può scegliere OneDrive
  let handle = null;
  if ('showSaveFilePicker' in window) {
    try { handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Configurazione JSON', accept: { 'application/json': ['.json'] } }] }); }
    catch (e) { if (e.name === 'AbortError') return; handle = null; }
  }
  const cfg = { app: 'nembo', type: 'config', version: 1, createdAt: new Date().toISOString(), settings: rest, templates: {} };
  for (const t of Object.values(TEMPLATES)) { const b = await DB.get(t.key); if (b) cfg.templates[t.key] = bufToB64(b); }
  const blob = new Blob([JSON.stringify(cfg, null, 1)], { type: 'application/json' });
  if (handle) {
    if (!/\.json$/i.test(handle.name)) toast('Attenzione: il file salvato non ha estensione .json');
    const w = await handle.createWritable(); await w.write(blob); await w.close();
    toast('Configurazione salvata: ' + handle.name);
  } else { downloadBlob(blob, name); toast('Configurazione salvata in Download'); }
}
async function importConfig(file, current) {
  if (!/\.json$/i.test(file.name || '')) throw new Error('seleziona un file .json (hai scelto "' + (file.name || 'file senza nome') + '")');
  let cfg;
  try { cfg = JSON.parse(await file.text()); } catch (e) { throw new Error('il file non è una configurazione valida'); }
  if (cfg.app !== 'nembo' || cfg.type !== 'config') throw new Error('il file non è una configurazione di questa app');
  const tpl = {};
  for (const [name, t] of Object.entries(TEMPLATES)) {
    if (!cfg.templates || !cfg.templates[t.key]) continue;
    const buf = b64ToBuf(cfg.templates[t.key]); await checkTemplate(name, buf); tpl[t.key] = buf;
  }
  for (const [k, b] of Object.entries(tpl)) await DB.set(k, b);
  const known = Object.keys(DEFAULT_SETTINGS);
  const incoming = Object.fromEntries(Object.entries(cfg.settings || {}).filter(([k]) => known.includes(k) && k !== 'firmaTecnico'));
  return { settings: { ...current, ...incoming }, nTpl: Object.keys(tpl).length };
}

/* ---------------- impostazioni ---------------- */
function TemplateRow({ name, t, onChange }) {
  const [has, setHas] = useState(null); const inp = useRef();
  useEffect(() => { DB.get(t.key).then(b => setHas(!!b)); }, []);
  const pick = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const bytes = await f.arrayBuffer();
      await checkTemplate(name, bytes);
      await DB.set(t.key, bytes); setHas(true); toast('Modello salvato'); onChange && onChange();
    } catch (err) { fail('Modello non valido', err); }
  };
  return html`<div class="row" style="padding:8px 0;border-top:1px solid var(--border)">
    <div class="tb-grow"><div style="font-size:13.5px;font-weight:600;white-space:normal">${t.label}</div>
      <div class=${'lock'} style=${has ? 'color:var(--ok)' : 'color:var(--nc)'}>${has === null ? '' : has ? 'Caricato su questo dispositivo' : 'Da caricare'}</div></div>
    <button class="btn sm" onClick=${() => inp.current.click()}>${has ? 'Sostituisci' : 'Carica'}</button>
    <input ref=${inp} type="file" accept="application/pdf" hidden onChange=${pick} /></div>`;
}

function Settings({ settings, setSettings, onTemplates }) {
  const [sig, setSig] = useState(false);
  const [k, setK] = useState(0);
  const [cacheVer, setCacheVer] = useState(null);
  useEffect(() => { if (window.caches) caches.keys().then(ks => setCacheVer(ks[0] || '—')); }, []);
  const cfgInp = useRef();
  const s = settings; const set = patch => setSettings({ ...s, ...patch });
  const loadCfg = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!/\.json$/i.test(f.name || '')) { toast('Seleziona un file .json (hai scelto "' + (f.name || 'file senza nome') + '")'); return; }
    if (!confirm('Caricare la configurazione? Sostituisce le impostazioni e i modelli presenti (la firma salvata resta).')) return;
    try {
      const res = await importConfig(f, s);
      setSettings(res.settings); setK(x => x + 1); onTemplates && onTemplates();
      toast(`Configurazione caricata${res.nTpl ? ' con ' + res.nTpl + ' modelli' : ''}`);
    } catch (err) { fail('Configurazione non caricata', err); }
  };
  return html`<div class="content form" key=${k}>
    <div class="card tight">
      <h2 style="font-size:16px;margin-top:2px">File di configurazione</h2>
      <p class="lead" style="margin:6px 0 10px">Un unico file .json con impostazioni e modelli PDF, da tenere su OneDrive o inviare a un collega. Non pubblicarlo mai sul sito.</p>
      <div class="row">
        <button class="btn" style="flex:1" onClick=${() => cfgInp.current.click()}>Carica .json</button>
        <button class="btn" style="flex:1" onClick=${() => exportConfig(s)}>Esporta .json</button>
      </div>
      <input ref=${cfgInp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${loadCfg} />
    </div>
    <div class="sec-h"><h3>OneDrive</h3></div>
    <${OneDriveSettings} settings=${s} set=${set} />
    <div class="sec-h"><h3>Modelli PDF</h3></div>
    <div class="card tight"><p class="lead" style="margin:2px 0 6px">I moduli aziendali non sono nell'app pubblicata: caricali qui dal telefono o da OneDrive. Restano solo su questo dispositivo e finiscono nel backup.</p>
      ${Object.entries(TEMPLATES).map(([name, t]) => html`<${TemplateRow} key=${name} name=${name} t=${t} onChange=${onTemplates} />`)}</div>
    <div class="sec-h"><h3>Tecnico</h3></div>
    <div class="card"><div class="grid2">
      <${Inp} label="Nome" value=${s.tecnicoNome} set=${v => set({ tecnicoNome: v })} />
      <${Inp} label="Cognome" value=${s.tecnicoCognome} set=${v => set({ tecnicoCognome: v })} />
    </div>
    <div class="fld" style="margin-top:10px"><span>Firma salvata (per i moduli radon)</span></div>
    <button class=${'sigbox' + (s.firmaTecnico ? ' has' : '')} onClick=${() => setSig(true)}>${s.firmaTecnico ? html`<img src=${s.firmaTecnico} alt="Firma salvata" />` : 'Tocca per salvare la tua firma'}</button>
    ${s.firmaTecnico && html`<button class="btn sm" style="margin-top:6px" onClick=${() => set({ firmaTecnico: '' })}>Rimuovi firma salvata</button>`}
    </div>

    <div class="sec-h"><h3>Scheda campioni</h3></div>
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Prelevato da" value=${s.prelevatoDa} set=${v => set({ prelevatoDa: v })} placeholder="es. Tec. Amb. Nome Cognome" />
      <${Inp} cls="full" label="Verificato da" value=${s.verificatoDa} set=${v => set({ verificatoDa: v })} />
      <${Inp} cls="full" label="Email per i referti" value=${s.emailReferti} set=${v => set({ emailReferti: v })} />
      <${Inp} cls="full" label="Laboratorio" value=${s.labNome} set=${v => set({ labNome: v })} />
      <${Inp} cls="full" label="Indirizzo laboratorio" value=${s.labR1} set=${v => set({ labR1: v })} />
      <${Inp} cls="full" label="CAP e città laboratorio" value=${s.labR2} set=${v => set({ labR2: v })} />
      <${Inp} label="Offerta" value=${s.offerta} set=${v => set({ offerta: v })} placeholder="Offerta n. …" />
      <${Inp} label="Revisione offerta" value=${s.offertaRev} set=${v => set({ offertaRev: v })} placeholder="Rev.0 del …" />
      <${Inp} label="Codice analisi MCA" value=${s.mcaCodice} set=${v => set({ mcaCodice: v })} />
      <${Inp} label="Descrizione analisi MCA" value=${s.mcaDesc} set=${v => set({ mcaDesc: v })} />
      <${Inp} label="Codice analisi FAV" value=${s.favCodice} set=${v => set({ favCodice: v })} />
      <${Inp} label="Descrizione analisi FAV" value=${s.favDesc} set=${v => set({ favDesc: v })} />
    </div></div>

    <div class="sec-h"><h3>Radon</h3></div>
    <div class="card"><${Inp} label="Livello di riferimento (Bq/m³)" type="number" inputmode="numeric" value=${s.livelloRif} set=${v => set({ livelloRif: num(v) || 300 })} /></div>
    <p class="lead" style="margin:14px 2px">Le impostazioni si salvano da sole e restano su questo telefono.</p>
    ${sig && html`<${SignaturePadOverlay} title="La tua firma" onClose=${() => setSig(false)} onDone=${url => set({ firmaTecnico: url })} />`}

    <div class="sec-h"><h3>Info app</h3></div>
    <div class="card tight" style="font-size:12.5px;color:var(--text2)">
      <div style="display:flex;justify-content:space-between;padding:9px 2px"><span>Versione app</span><b style="color:var(--text)">${APP_VERSION}</b></div>
      <div style="display:flex;justify-content:space-between;padding:9px 2px;border-top:1px solid var(--border)">
        <span>Cache offline attiva</span>
        <b style="color:${cacheVer && cacheVer !== APP_VERSION ? 'var(--warn, #9a5a00)' : 'var(--text)'}">${cacheVer || '…'}</b>
      </div>
      ${cacheVer && cacheVer !== APP_VERSION && html`<p style="margin:8px 2px 2px;color:var(--warn, #9a5a00)">Diverse dalla versione app: l'aggiornamento è a metà, chiudi e riapri l'app (o svuota la cache del sito) per completarlo.</p>`}
    </div>
  </div>`;
}

/* ---------------- notifiche ---------------- */
function Notifiche() {
  const list = useNotifiche();
  const [open, setOpen] = useState({});
  const [f, setF] = useState('tutte');
  useEffect(() => { const t = setTimeout(notifMarkRead, 400); return () => clearTimeout(t); }, [list.length]);
  const shown = list.filter(n => f === 'tutte' || (f === 'err' ? n.level === 'err' : n.level !== 'err'));
  const nErr = list.filter(n => n.level === 'err').length;
  const COL = { ok: 'var(--ok)', warn: '#b26b00', err: 'var(--nc)' };
  const LBL = { ok: 'Completato', warn: 'Interrotto', err: 'Errore' };
  const copy = async n => {
    const txt = [new Date(n.t).toLocaleString('it-IT'), n.title, n.record && 'Pratica: ' + n.record, n.code && 'Codice: ' + n.code, n.detail, ...(n.items || [])].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Dettagli copiati'); } catch (e) { toast('Copia non riuscita'); }
  };
  return html`<div class="content">
    <h2>Notifiche</h2><p class="lead">Esiti dei caricamenti su OneDrive ed errori dell'app, con il relativo codice. Restano su questo dispositivo (ultime ${NOTIF_MAX}).</p>
    ${list.length > 0 && html`<div class="row" style="margin:6px 0 12px">
      <div class="seg" style="flex:1">
        <button class=${f === 'tutte' ? 'on' : ''} onClick=${() => setF('tutte')}>Tutte · ${list.length}</button>
        <button class=${f === 'err' ? 'on' : ''} onClick=${() => setF('err')}>Errori · ${nErr}</button>
        <button class=${f === 'ok' ? 'on' : ''} onClick=${() => setF('ok')}>Esiti · ${list.length - nErr}</button>
      </div></div>`}
    ${!shown.length && html`<div class="empty"><b>Nessuna notifica</b>${list.length ? 'Niente in questa categoria.' : 'Qui compariranno gli esiti dei caricamenti e gli eventuali errori.'}</div>`}
    <div class="list">${shown.map(n => html`<div class="card tight" key=${n.id} style=${'border-left:4px solid ' + COL[n.level] + ';padding:12px 14px'}>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
        <b style=${'font-size:12px;color:' + COL[n.level]}>${LBL[n.level]}</b>
        <span style="font-size:12px;color:var(--muted)">${new Date(n.t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
      <div style="font-weight:700;margin-top:3px">${n.title}</div>
      ${n.record && html`<div style="font-size:12.5px;color:var(--text2);margin-top:2px">${n.record}</div>`}
      ${n.detail && html`<div style="font-size:13px;margin-top:6px;word-break:break-word">${n.detail}</div>`}
      ${n.code && html`<div style="margin-top:8px"><span style="font-family:ui-monospace,Menlo,monospace;font-size:12px;background:#f1f4f8;border:1px solid var(--border);border-radius:6px;padding:2px 7px">Codice: ${n.code}</span></div>`}
      ${(n.items || []).length > 0 && html`<button class="btn sm" style="margin-top:8px" onClick=${() => setOpen(o => ({ ...o, [n.id]: !o[n.id] }))}>${open[n.id] ? 'Nascondi' : 'Mostra'} dettaglio file (${n.items.length})</button>
        ${open[n.id] && html`<div style="margin-top:8px;font-size:12px;font-family:ui-monospace,Menlo,monospace;background:#f7f9fc;border-radius:8px;padding:8px;max-height:260px;overflow:auto;word-break:break-word">${n.items.map(x => html`<div style="padding:3px 0;border-bottom:1px dashed var(--border)">${x}</div>`)}</div>`}`}
      ${n.level !== 'ok' && html`<div style="margin-top:8px"><button class="btn sm" onClick=${() => copy(n)}>Copia dettagli</button></div>`}
    </div>`)}</div>
    ${list.length > 0 && html`<button class="btn danger block" style="margin-top:16px" onClick=${() => { if (confirm('Cancellare tutte le notifiche?')) notifClear(); }}><${Icon} n="trash" s=${17} /> Svuota notifiche</button>`}
  </div>`;
}

/* ---------------- backup ---------------- */
function Backup({ records, settings, reload, lastBackup }) {
  const inp = useRef(); const [busy, setBusy] = useState(false);
  const [persist, setPersist] = useState(null);
  const [est, setEst] = useState(null);
  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(setPersist);
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(setEst);
  }, []);
  const doExport = async () => { setBusy(true); await exportRecords(records, settings, true); setBusy(false); reload(); };
  const doImport = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy(true);
    try {
      const res = await importZip(f);
      const hasTpl = Object.keys(res.templates || {}).length > 0;
      if ((res.settings || hasTpl) && confirm('Il backup contiene anche impostazioni e modelli PDF. Sostituire quelli attuali?')) {
        if (res.settings) await DB.set('settings', res.settings);
        for (const [k, b] of Object.entries(res.templates || {})) await DB.set(k, b);
      }
      toast(`Importati: ${res.added} nuovi, ${res.updated} aggiornati, ${res.kept} già presenti`);
      reload();
    } catch (err) { fail('Import non riuscito', err); }
    setBusy(false);
  };
  return html`<div class="content form">
    <div class="card">
      <h2 style="font-size:16px">Backup su OneDrive</h2>
      <p class="lead" style="margin:6px 0 12px">Un unico file ZIP con tutte le indagini e campagne, anche con centinaia di foto: cartelle con foto, allegati e PDF, più i dati in manifest.json per il ripristino. Nella finestra di salvataggio scegli OneDrive; se non compare, il file va in Download e lo carichi dall'app OneDrive.</p>
      <button class="btn pri block" disabled=${busy || !records.length} onClick=${doExport}>${busy ? html`<div class="spin" />` : html`<${Icon} n="archive" s=${18} />`} Crea backup completo</button>
      ${OD.account && html`<button class="btn outline block" style="margin-top:8px" disabled=${busy || !records.length} onClick=${async () => { setBusy(true); await odSync(records.filter(r => !r._new), settings); setBusy(false); }}><${Icon} n="share" s=${18} /> Carica tutto su OneDrive</button>`}
      <div class="lock" style="margin-top:8px">${lastBackup ? 'Ultimo backup: ' + new Date(lastBackup).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nessun backup ancora'}</div>
    </div>
    <div class="card">
      <h2 style="font-size:16px">Ripristina da backup</h2>
      <p class="lead" style="margin:6px 0 12px">Scegli lo ZIP da OneDrive o dal telefono. I record già presenti vengono sostituiti solo se quelli del backup sono più recenti.</p>
      <button class="btn block" disabled=${busy} onClick=${() => inp.current.click()}>Scegli file ZIP</button>
      <input ref=${inp} type="file" accept="application/zip,application/x-zip-compressed,application/octet-stream,.zip" hidden onChange=${doImport} />
    </div>
    <div class="card tight">
      <div class="lock">${persist === true ? 'Archivio protetto: Chrome non cancella i dati da solo.' : persist === false ? 'Archivio non protetto: installa l\'app nella schermata Home per proteggerlo.' : ''}</div>
      ${est && html`<div class="lock" style="margin-top:4px">Spazio usato: ${(est.usage / 1048576).toFixed(1)} MB</div>`}
    </div>
  </div>`;
}

/* Sopra questa larghezza CSS, elenco e scheda stanno affiancati (tablet in orizzontale, PC).
   Sotto, restano due schermate separate come su telefono e tablet in verticale. */
const WIDE_MQ = '(min-width: 1000px)';
function useWide() {
  const [w, setW] = useState(() => matchMedia(WIDE_MQ).matches);
  useEffect(() => {
    const mq = matchMedia(WIDE_MQ);
    const f = e => setW(e.matches);
    mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', f) : mq.removeListener(f));
  }, []);
  return w;
}
const LIST_OF = { dda: 'ddaList', mappatura: 'mappaturaList', radon: 'radonList', ra: 'raList' };
const DETAIL_OF = { ddaList: 'dda', mappaturaList: 'mappatura', radonList: 'radon', raList: 'ra' };

/* ---------------- app ---------------- */
/* ---------------- menu laterale (tablet in orizzontale e PC) ---------------- */
const NAV_AREAS = [
  { v: 'ddaList', d: 'dda', ic: 'leaf', l: 'Ambiente · DDA' },
  { v: 'mappaturaList', d: 'mappatura', ic: 'pin', l: 'Mappatura MCA e FAV' },
  { v: 'raList', d: 'ra', ic: 'shield', l: 'Sopralluogo RA' },
  { v: 'radonList', d: 'radon', ic: 'radon', l: 'Campagne radon' },
];
const NAV_TOOLS = [{ v: 'backup', ic: 'archive', l: 'Backup' }, { v: 'settings', ic: 'gear', l: 'Impostazioni' }];
// menu ridotto o esteso: la scelta dell'utente resta; altrimenti ridotto sotto i 1300 px
function useNavMin() {
  const [min, setMin] = useState(() => {
    try { const v = localStorage.getItem('nembo_nav'); if (v) return v === 'min'; } catch (e) {}
    return !matchMedia('(min-width: 1300px)').matches;
  });
  const toggle = () => setMin(m => { try { localStorage.setItem('nembo_nav', m ? 'full' : 'min'); } catch (e) {} return !m; });
  return [min, toggle];
}
function SideNav({ route, go, counts, settings, min, toggle }) {
  const nav = v => { if (route.v !== v) go({ v }); };
  const item = (x, n) => {
    const on = route.v === x.v || route.v === x.d;
    return html`<button class=${'sn-it' + (on ? ' on' : '')} title=${min ? x.l : null} aria-current=${on ? 'page' : null} onClick=${() => nav(x.v)}>
      <${Icon} n=${x.ic} s=${21} /><span class="l">${x.l}</span>${n > 0 && html`<span class="n">${n}</span>`}</button>`;
  };
  const name = `${settings.tecnicoNome || ''} ${settings.tecnicoCognome || ''}`.trim();
  return html`<aside class=${'sidenav' + (min ? ' min' : '')} aria-label="Aree di lavoro">
    <button class="sn-brand" title="Home" onClick=${() => nav('home')}><span class="logo">N</span><div><b>Nembo</b>${name && html`<small>${name}</small>`}</div></button>
    <div class="sn-sec">Aree di lavoro</div>
    ${NAV_AREAS.map(x => item(x, counts[x.d]))}
    <div class="sn-sec">Strumenti</div><div class="sn-div"></div>
    ${NAV_TOOLS.map(x => item(x, 0))}
    <div class="sn-grow"></div>
    <button class="sn-toggle" title=${min ? 'Espandi il menu' : 'Riduci il menu'} aria-expanded=${!min} onClick=${toggle}>
      <${Icon} n=${min ? 'expand' : 'collapse'} s=${19} /><span class="l">Riduci menu</span></button>
    <div class="sn-ver">${APP_VERSION}</div>
  </aside>`;
}

function App() {
  const wide = useWide();
  const [ready, setReady] = useState(false);
  const [records, setRecords] = useState([]);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [route, setRoute] = useState({ v: 'home' });
  const notifs = useNotifiche();
  const unreadErr = notifs.filter(n => !n.read && n.level === 'err').length;
  const [navMin, toggleNav] = useNavMin();
  const [hdr, setHdr] = useState(['', '']);
  const [lastBackup, setLastBackup] = useState(null);
  const [installEvt, setInstallEvt] = useState(null);
  const [tplOk, setTplOk] = useState(true);
  const [, odTick] = useState(0);
  useEffect(() => OD.subscribe(() => odTick(x => x + 1)), []);

  const reload = async () => {
    const rs = await DB.all(); setRecords(rs);
    const s = await DB.get('settings'); const st = { ...DEFAULT_SETTINGS, ...(s || {}) }; setSettingsState(st); _settings = st;
    setLastBackup(await DB.get('lastBackup'));
    const t = await Promise.all(Object.values(TEMPLATES).map(x => DB.get(x.key)));
    setTplOk(t.every(Boolean));
    OD.init(st).catch(e => console.warn('OneDrive', e));
  };
  useEffect(() => {
    reload().then(() => setReady(true));
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const bip = e => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', bip);
    return () => window.removeEventListener('beforeinstallprompt', bip);
  }, []);

  const setSettings = s => { setSettingsState(s); _settings = s; DB.set('settings', s); };
  const go = next => { const prev = route; setRoute(next); Back.push(() => setRoute(prev)); };
  const goBack = () => history.back();
  // nel doppio pannello, scegliere una pratica dall'elenco non è una "navigazione": niente storico,
  // il tasto Indietro del telefono/browser deve uscire dall'area, non scorrere tra le pratiche aperte
  const select = id => setRoute(r => ({ ...r, id }));
  const [splitHdr, setSplitHdr] = useState(['', '']);

  // ruotando il tablet, passa dalla schermata piena al doppio pannello (e viceversa) senza perdere la pratica aperta
  useEffect(() => {
    setRoute(r => {
      if (wide && DETAIL_OF[LIST_OF[r.v]] === r.v) return { v: LIST_OF[r.v], id: r.id };
      if (!wide && DETAIL_OF[r.v] && r.id) { const list = r.v; Back.push(() => setRoute({ v: list })); return { v: DETAIL_OF[r.v], id: r.id }; }
      return r;
    });
  }, [wide]);

  const saveRec = useCallback(async rec => {
    await DB.put(rec);
    setRecords(rs => { const i = rs.findIndex(x => x.id === rec.id); if (i < 0) return [...rs, rec]; const c = rs.slice(); c[i] = rec; return c; });
  }, []);
  const delRec = async rec => {
    if (!confirm('Eliminare definitivamente? Foto e allegati vengono cancellati da questo telefono.')) return;
    for (const b of blobIds(rec)) await removeBlob(b);
    await DB.del(rec.id);
    setRecords(rs => rs.filter(x => x.id !== rec.id));
    toast('Eliminato'); goBack();
  };
  // uscendo da un record nuovo rimasto vuoto, lo scarto
  useEffect(() => {
    if (route.v === 'dda' || route.v === 'mappatura' || route.v === 'radon' || route.v === 'ra') return;
    const empties = records.filter(r => r._new && (r.type === 'dda' ? ddaIsEmpty(r) : r.type === 'mappatura' ? mappaturaIsEmpty(r) : r.type === 'ra' ? raIsEmpty(r) : radonIsEmpty(r)));
    empties.forEach(r => DB.del(r.id));
    if (empties.length) setRecords(rs => rs.filter(r => !empties.includes(r)));
  }, [route.v]);

  const createDda = () => { const r = { ...newDda(records, settings), _new: true }; saveRec(r); wide ? select(r.id) : go({ v: 'dda', id: r.id }); };
  const createMappatura = () => { const r = { ...newMappatura(records, settings), _new: true }; saveRec(r); wide ? select(r.id) : go({ v: 'mappatura', id: r.id }); };
  const createRadon = () => { const r = { ...newRadon(settings), _new: true }; saveRec(r); wide ? select(r.id) : go({ v: 'radon', id: r.id }); };
  const createRa = () => { const r = { ...newRa(records, settings), _new: true }; saveRec(r); wide ? select(r.id) : go({ v: 'ra', id: r.id }); };

  const header = useCallback((t, s) => setHdr([t, s]), []);
  if (!ready) return html`<div class="shell"></div>`;
  const rec = route.id && records.find(r => r.id === route.id);

  let title = 'Nembo', sub = settings.tecnicoNome ? `${settings.tecnicoNome} ${settings.tecnicoCognome}` : '', body;
  if (route.v === 'home') {
    const nDda = records.filter(r => r.type === 'dda').length;
    const nMap = records.filter(r => r.type === 'mappatura').length;
    const act = records.filter(r => r.type === 'radon' && radonStato(r) !== 'terminata');
    const late = act.filter(r => { const d = radonScadenza(r); return d && daysBetween(today(), d) <= 30; });
    const stale = records.length > 0 && (!lastBackup || Date.now() - lastBackup > 7 * 86400000);
    const hour = new Date().getHours();
    body = html`<div class="content">
      <h1>${hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'}${settings.tecnicoNome ? ', ' + settings.tecnicoNome : ''}</h1>
      <p class="lead">Scegli l'area di lavoro</p>
      <div class="tiles">
        <button class="tile" onClick=${() => go({ v: 'ddaList' })}><span class="ic" style="background:linear-gradient(135deg,#2b97b8,#1b6e8c)"><${Icon} n="leaf" s=${24} /></span>
          <div><b>Ambiente · DDA</b><small>Sopralluogo Fase 1, campionamento Fase 2 e scheda campioni · ${nDda} ${nDda === 1 ? 'indagine' : 'indagini'}</small></div><span class="chev"><${Icon} n="right" s=${18} /></span></button>
        <button class="tile" onClick=${() => go({ v: 'mappaturaList' })}><span class="ic" style="background:linear-gradient(135deg,#c9b1ab,#977a74)"><${Icon} n="pin" s=${24} /></span>
          <div><b>Mappatura MCA e FAV</b><small>Censimento e campionamento indipendente da una DDA · ${nMap} ${nMap === 1 ? 'censimento' : 'censimenti'}</small></div><span class="chev"><${Icon} n="right" s=${18} /></span></button>
        <button class="tile" onClick=${() => go({ v: 'raList' })}><span class="ic" style="background:linear-gradient(135deg,#3b4d80,#243257)"><${Icon} n="shield" s=${24} /></span>
          <div><b>Sopralluogo RA</b><small>Verifica dei manufatti in amianto da mappatura o PMC · ${records.filter(r => r.type === 'ra').length} sopralluoghi</small></div><span class="chev"><${Icon} n="right" s=${18} /></span></button>
        <button class="tile" onClick=${() => go({ v: 'radonList' })}><span class="ic" style="background:linear-gradient(135deg,#1f7e9d,#243257)"><${Icon} n="radon" s=${24} /></span>
          <div><b>Campagne radon</b><small>Posa e ritiro dosimetri, firme e scheda raccolta dati · ${act.length} in corso</small></div><span class="chev"><${Icon} n="right" s=${18} /></span></button>
      </div>
      ${(!tplOk || !settings.tecnicoCognome) && html`<div class="notice">Prima di iniziare: in Impostazioni inserisci i tuoi dati e carica i due modelli PDF.</div>`}
      ${late.length > 0 && html`<div class="notice">${late.length === 1 ? '1 campagna radon ha' : late.length + ' campagne radon hanno'} il ritiro entro 30 giorni o già scaduto.</div>`}
      ${stale && html`<div class="notice">${lastBackup ? 'L\'ultimo backup ha più di una settimana.' : 'Non hai ancora fatto un backup.'} I dati stanno solo su questo telefono: salvane una copia su OneDrive.</div>`}
      <div class="home-links">
        <button class="linkbtn" onClick=${() => go({ v: 'backup' })}><${Icon} n="archive" s=${17} /> Backup</button>
        <button class="linkbtn" onClick=${() => go({ v: 'settings' })}><${Icon} n="gear" s=${17} /> Impostazioni</button>
        ${installEvt && html`<button class="linkbtn" onClick=${async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }}><${Icon} n="plus" s=${17} /> Installa app</button>`}
      </div>
    </div>`;
  } else if (route.v === 'ddaList') {
    title = 'Ambiente · DDA';
    const list = html`<${DdaList} records=${records} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'dda', id })} create=${createDda} />`;
    if (wide) {
      const dRec = route.id && records.find(x => x.id === route.id);
      body = html`<div class="split-body">
        <div class="split-list">${list}</div>
        <div class="split-detail">${dRec
          ? html`<${DdaForm} key=${dRec.id} embedded onClose=${() => select(null)} rec=${dRec} records=${records} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && ddaIsEmpty(r) })} onDelete=${delRec} onSettings=${() => go({ v: 'settings' })} header=${header} />`
          : html`<div class="split-empty"><b>Nessuna pratica selezionata</b>Toccane una dall'elenco per aprirla qui.</div>`}</div>
      </div>`;
    } else body = list;
  } else if (route.v === 'mappaturaList') {
    title = 'Mappatura MCA e FAV';
    const list = html`<${MappaturaList} records=${records} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'mappatura', id })} create=${createMappatura} />`;
    if (wide) {
      const dRec = route.id && records.find(x => x.id === route.id);
      body = html`<div class="split-body">
        <div class="split-list">${list}</div>
        <div class="split-detail">${dRec
          ? html`<${MappaturaForm} key=${dRec.id} embedded onClose=${() => select(null)} rec=${dRec} records=${records} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && mappaturaIsEmpty(r) })} onDelete=${delRec} onSettings=${() => go({ v: 'settings' })} header=${header} />`
          : html`<div class="split-empty"><b>Nessuna mappatura selezionata</b>Toccane una dall'elenco per aprirla qui.</div>`}</div>
      </div>`;
    } else body = list;
  } else if (route.v === 'mappatura' && rec) {
    [title, sub] = hdr;
    body = html`<${MappaturaForm} key=${rec.id} rec=${rec} records=${records} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && mappaturaIsEmpty(r) })} onDelete=${delRec} onSettings=${() => go({ v: 'settings' })} header=${header} />`;
  } else if (route.v === 'raList') {
    title = 'Sopralluogo RA';
    const list = html`<${RaList} records=${records} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'ra', id })} create=${createRa} />`;
    if (wide) {
      const dRec = route.id && records.find(x => x.id === route.id);
      body = html`<div class="split-body">
        <div class="split-list">${list}</div>
        <div class="split-detail">${dRec
          ? html`<${RaForm} key=${dRec.id} embedded onClose=${() => select(null)} rec=${dRec} records=${records} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && raIsEmpty(r) })} onDelete=${delRec} header=${header} />`
          : html`<div class="split-empty"><b>Nessun sopralluogo selezionato</b>Toccane uno dall'elenco per aprirlo qui.</div>`}</div>
      </div>`;
    } else body = list;
  } else if (route.v === 'ra' && rec) {
    [title, sub] = hdr;
    body = html`<${RaForm} key=${rec.id} rec=${rec} records=${records} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && raIsEmpty(r) })} onDelete=${delRec} header=${header} />`;
  } else if (route.v === 'radonList') {
    title = 'Campagne radon';
    const list = html`<${RadonList} records=${records} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'radon', id })} create=${createRadon} />`;
    if (wide) {
      const dRec = route.id && records.find(x => x.id === route.id);
      body = html`<div class="split-body">
        <div class="split-list">${list}</div>
        <div class="split-detail">${dRec
          ? html`<${RadonForm} key=${dRec.id} embedded onClose=${() => select(null)} rec=${dRec} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && radonIsEmpty(r) })} onDelete=${delRec} header=${header} />`
          : html`<div class="split-empty"><b>Nessuna campagna selezionata</b>Toccane una dall'elenco per aprirla qui.</div>`}</div>
      </div>`;
    } else body = list;
  } else if (route.v === 'dda' && rec) {
    [title, sub] = hdr;
    body = html`<${DdaForm} key=${rec.id} rec=${rec} records=${records} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && ddaIsEmpty(r) })} onDelete=${delRec} onSettings=${() => go({ v: 'settings' })} header=${header} />`;
  } else if (route.v === 'radon' && rec) {
    [title, sub] = hdr;
    body = html`<${RadonForm} key=${rec.id} rec=${rec} settings=${settings} onSave=${r => saveRec({ ...r, _new: r._new && radonIsEmpty(r) })} onDelete=${delRec} header=${header} />`;
  } else if (route.v === 'settings') {
    title = 'Impostazioni'; sub = ''; body = html`<${Settings} settings=${settings} setSettings=${setSettings} onTemplates=${reload} />`;
  } else if (route.v === 'notifiche') {
    title = 'Notifiche'; sub = ''; body = html`<${Notifiche} />`;
  } else if (route.v === 'backup') {
    title = 'Backup'; sub = ''; body = html`<${Backup} records=${records} settings=${settings} reload=${reload} lastBackup=${lastBackup} />`;
  } else {
    body = html`<div class="content"><div class="empty"><b>Elemento non trovato</b>Potrebbe essere stato eliminato.</div></div>`;
  }

  const splitActive = wide && (route.v === 'ddaList' || route.v === 'mappaturaList' || route.v === 'radonList' || route.v === 'raList');
  const counts = { dda: records.filter(r => r.type === 'dda').length, mappatura: records.filter(r => r.type === 'mappatura').length,
    ra: records.filter(r => r.type === 'ra').length, radon: records.filter(r => r.type === 'radon' && radonStato(r) !== 'terminata').length };
  return html`<div class=${'frame' + (wide ? ' wide' : '')}>
    ${wide && html`<${SideNav} route=${route} go=${go} counts=${counts} settings=${settings} min=${navMin} toggle=${toggleNav} />`}
    <div class=${'shell' + (splitActive ? ' split' : '')}>
    <header class="topbar">
      ${wide ? null : route.v === 'home' ? html`<span class="logo">N</span>` : html`<button class="back" aria-label="Indietro" onClick=${goBack}><${Icon} n="back" s=${18} /></button>`}
      <div class="tb-grow"><div class="tb-title">${title}</div>${sub && html`<div class="tb-sub">${sub}</div>`}</div>
      <button class=${'tb-bell' + (route.v === 'notifiche' ? ' on' : '')} aria-label=${unreadErr ? `Notifiche, ${unreadErr} errori non letti` : 'Notifiche'}
        onClick=${() => route.v !== 'notifiche' && go({ v: 'notifiche' })}><${Icon} n="bell" s=${20} />${unreadErr > 0 && html`<span class="dot">${unreadErr}</span>`}</button>
    </header>
    ${body}
    <${ShareAsk} />
    <${Progress} />
    <${Toast} />
    </div>
  </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
const splash = document.getElementById('splash');
if (splash) requestAnimationFrame(() => requestAnimationFrame(() => { splash.classList.add('hide'); setTimeout(() => splash.remove(), 550); }));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
}
