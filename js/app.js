/* Esportazione, backup, impostazioni e struttura dell'app */

let _settings = { ...DEFAULT_SETTINGS };

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
  const pre = (r.type === 'dda' || r.type === 'mappatura' || r.type === 'hs' || r.type === 'vs' || r.type === 'ra' || r.type === 'firme' || r.type === 'aria') ? slug([r.codice, r.commessa].filter(Boolean).join('_')) : slug(['Radon', r.commessa || r.cliente].filter(Boolean).join('_'));
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
const BUS = [['ambiente', 'Ambiente'], ['hs', 'HSE'], ['sicurezza', 'Sicurezza']];
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
  return html`<div class="row" style="padding:10px 0;border-top:.5px solid var(--sep)">
    <div class="tb-grow"><div style="font-size:var(--fs-base);font-weight:600;white-space:normal">${t.label}</div>
      <div class=${'lock'} style=${has ? 'color:var(--ok)' : 'color:var(--nc)'}>${has === null ? '' : has ? 'Caricato su questo dispositivo' : 'Da caricare'}</div></div>
    <button class="btn sm" onClick=${() => inp.current.click()}>${has ? 'Sostituisci' : 'Carica'}</button>
    <input ref=${inp} type="file" accept=${t.docx ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : t.xlsx ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'} hidden onChange=${pick} /></div>`;
}

function Settings({ settings, setSettings, onTemplates, go }) {
  const [sig, setSig] = useState(false);
  const [k, setK] = useState(0);
  const [cacheVer, setCacheVer] = useState(null);
  const [theme, setThemeSt] = useState(getTheme());
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
    <${LargeTitle} top title="Impostazioni" />
    <div class="sec-h" style="margin-top:6px"><h3>Aspetto e avvio</h3></div>
    <div class="card">
      <div class="fld"><span>Tema grafico (solo su questo dispositivo)</span></div>
      <div class="seg tall theme-seg" style="margin-top:6px" role="radiogroup" aria-label="Tema grafico">${Object.entries(THEMES).map(([t, x]) => html`<button role="radio" aria-checked=${theme === t} class=${theme === t ? 'on' : ''} onClick=${() => { setTheme(t); setThemeSt(t); }}><${Icon} n=${x.ic} s=${22} /><small>${x.l}</small></button>`)}</div>
      <div class="fld" style="margin-top:14px"><span>Business unit mostrata in Oggi</span></div>
      <div class="seg" style="margin-top:6px">${BUS.map(([k2, l]) => html`<button class=${(s.buDefault || 'ambiente') === k2 ? 'on' : ''} onClick=${() => set({ buDefault: k2 })}>${l}</button>`)}</div>
    </div>
    <div class="sec-h"><h3>File di configurazione</h3></div>
    <div class="card tight">
      <p class="lead" style="margin:6px 0 10px">Un unico file .json con impostazioni e modelli PDF, da tenere su OneDrive o inviare a un collega. Non pubblicarlo mai sul sito.</p>
      <div class="row">
        <button class="btn" style="flex:1" onClick=${() => cfgInp.current.click()}>Carica .json</button>
        <button class="btn" style="flex:1" onClick=${() => exportConfig(s)}>Esporta .json</button>
      </div>
      <input ref=${cfgInp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${loadCfg} />
    </div>
    <div class="sec-h"><h3>OneDrive</h3></div>
    <${OneDriveSettings} settings=${s} set=${set} />
    <${SyncCard} settings=${s} set=${set} />
    <div class="sec-h"><h3>Modelli</h3></div>
    <div class="card tight"><p class="lead" style="margin:2px 0 6px">I moduli aziendali (PDF per l'Ambiente, Word per l'HSE) non sono nell'app pubblicata: caricali qui dal telefono o da OneDrive. Restano solo su questo dispositivo e finiscono nel file di configurazione e nel backup.</p>
      ${Object.entries(TEMPLATES).map(([name, t]) => html`<${TemplateRow} key=${name} name=${name} t=${t} onChange=${onTemplates} />`)}</div>
    <div class="sec-h"><h3>Tecnico</h3></div>
    <div class="card"><div class="grid2">
      <${Inp} label="Nome" value=${s.tecnicoNome} set=${v => set({ tecnicoNome: v })} />
      <${Inp} label="Cognome" value=${s.tecnicoCognome} set=${v => set({ tecnicoCognome: v })} />
    </div>
    <div class="fld" style="margin-top:10px"><span>Firma salvata (per i moduli radon)</span></div>
    <button class=${'sigbox' + (s.firmaTecnico ? ' has' : '')} onClick=${() => setSig(true)}>${s.firmaTecnico ? html`<img src=${s.firmaTecnico} alt="Firma salvata" />` : 'Tocca per salvare la tua firma'}</button>
    <div style="display:flex;margin-top:8px;gap:8px;flex-wrap:wrap"><${SigImageButton} onDone=${url => set({ firmaTecnico: url })} />
      ${s.firmaTecnico && html`<button class="btn sm" onClick=${() => set({ firmaTecnico: '' })}>Rimuovi firma salvata</button>`}</div>
    <p class="lead" style="margin:6px 2px 0;font-size:var(--fs-sm)">Puoi disegnarla o caricare una foto della tua firma su un foglio bianco: lo sfondo viene tolto da solo.</p>
    </div>

    <div class="sec-h"><h3>Foto</h3></div>
    <${CamSerieCard} />

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

    <div class="sec-h"><h3>Sopralluoghi HSE · valori proposti</h3></div>
    <div class="card"><p class="lead" style="margin:2px 0 10px">Compilano i nuovi report HSE; restano nel tuo file di configurazione, mai nel codice dell'app.</p><div class="grid2">
      <${Inp} label="Committente (Esteso)" value=${s.hsCommEsteso} set=${v => set({ hsCommEsteso: v })} />
      <${Inp} label="Committente (Sintetico)" value=${s.hsCommSint} set=${v => set({ hsCommSint: v })} />
      <${Inp} label="Verificato da" value=${s.hsVerificato} set=${v => set({ hsVerificato: v })} />
      <${Inp} label="Approvato da (Sintetico)" value=${s.hsApprovato} set=${v => set({ hsApprovato: v })} />
      <${Inp} cls="full" label="Firma procuratore (Sintetico)" value=${s.hsFirma} set=${v => set({ hsFirma: v })} />
      <${Inp} label="Developer (Sintetico)" value=${s.hsDeveloper} set=${v => set({ hsDeveloper: v })} />
      <${Inp} label="Property Manager (Sintetico)" value=${s.hsPropertyManager} set=${v => set({ hsPropertyManager: v })} />
      <${Inp} label="Procuratore HSE (Sintetico)" value=${s.hsProcuratore} set=${v => set({ hsProcuratore: v })} />
      <${Inp} label="Tecnici incaricati (Sintetico)" value=${s.hsTecnici} set=${v => set({ hsTecnici: v })} />
    </div></div>

    <div class="sec-h"><h3>Programmazione · durate tipiche</h3></div>
    <div class="card"><p class="lead" style="margin:2px 0 10px">Durata proposta per ogni nuova attività; nella singola attività si cambia quando serve.</p><div class="grid2">
      ${Object.keys(DURATE_BASE).map(k => html`<label class="fld" key=${k}><span>${TIPI_AG[k].l}</span>
        <select value=${String(durataBase(k, s))} onChange=${e => set({ durate: { ...(s.durate || {}), [k]: +e.target.value } })}>
          ${DUR_OPT.map(m => html`<option value=${m}>${fmtDur(m)}</option>`)}</select></label>`)}
    </div></div>

    <div class="sec-h"><h3>Fogli firme</h3></div>
    <${FirmeSettings} s=${s} set=${set} />

    <div class="sec-h"><h3>Monitoraggio aria</h3></div>
    <${AriaSettings} s=${s} set=${set} />

    <div class="sec-h"><h3>Radon</h3></div>
    <div class="card"><${Inp} label="Livello di riferimento (Bq/m³)" type="number" inputmode="numeric" value=${s.livelloRif} set=${v => set({ livelloRif: num(v) || 300 })} /></div>
    <p class="lead" style="margin:14px 2px">Le impostazioni si salvano da sole e restano su questo telefono.</p>
    ${sig && html`<${SignaturePadOverlay} title="La tua firma" allowImage=${true} onClose=${() => setSig(false)} onDone=${url => set({ firmaTecnico: url })} />`}

    <div class="sec-h"><h3>Assistenza</h3></div>
    <div class="card"><${Inp} label="Email per le segnalazioni" type="email" value=${s.supportEmail || ''} set=${v => set({ supportEmail: v.trim() })} /></div>
    <${IssueCard} settings=${s} />
    <div class="sec-h"><h3>Dati su questo dispositivo</h3></div>
    <${WipeCard} />
    <div class="sec-h"><h3>Novità</h3></div>
    <${NovitaCard} go=${go} />
    <div class="sec-h"><h3>Info app</h3></div>
    <div class="card tight" style="font-size:var(--fs-base);color:var(--text2)">
      <div style="display:flex;justify-content:space-between;padding:9px 2px"><span>Versione app</span><b class="mono" style="color:var(--text)">${APP_VERSION}</b></div>
      <div style="display:flex;justify-content:space-between;padding:9px 2px;border-top:.5px solid var(--sep)">
        <span>Cache offline attiva</span>
        <b style="color:${cacheVer && cacheVer !== APP_VERSION ? 'var(--warn)' : 'var(--text)'}">${cacheVer || '…'}</b>
      </div>
      ${cacheVer && cacheVer !== APP_VERSION && html`<p style="margin:8px 2px 2px;color:var(--warn)">Diverse dalla versione app: l'aggiornamento è a metà, chiudi e riapri l'app (o svuota la cache del sito) per completarlo.</p>`}
    </div>
  </div>`;
}

/* ---------------- segnala un problema ---------------- */
function IssueCard({ settings }) {
  return html`<div class="card tight" style="margin:4px 0 14px">
    <div style="font-weight:700">Qualcosa non funziona?</div>
    <p class="lead" style="margin:4px 0 10px">Prepara un'email con versione dell'app, dispositivo e ultimi errori: tu aggiungi cosa stavi facendo.</p>
    <div class="row"><button class="btn" style="flex:1" onClick=${() => reportIssue(settings)}><${Icon} n="bell" s=${17} /> Segnala un problema</button>
      <button class="btn" onClick=${copyIssue}>Copia</button></div>
  </div>`;
}
// se una schermata va in errore resta l'app, con la possibilità di riprovare e di segnalarlo
function Boundary({ children }) {
  const [err, reset] = useErrorBoundary(e => reportAppError(e, 'schermata'));
  if (!err) return children;
  return html`<div class="content" style="padding:28px 20px;max-width:560px;margin:0 auto">
    <div class="lt-title" style="font-size:var(--fs-4xl)">Qualcosa non ha funzionato</div>
    <p class="lead">I tuoi dati sono salvati. L'errore è stato registrato nelle Notifiche con il codice APP-JS.</p>
    <div class="mono" style="font-size:var(--fs-sm);background:var(--fill-soft);border-radius:var(--r-sm);padding:8px;word-break:break-word;margin:10px 0 16px">${String(err && err.message || err)}</div>
    <button class="btn pri block" onClick=${() => { location.hash = ''; reset(); }}>Torna a Oggi</button>
    <button class="btn block" style="margin-top:8px" onClick=${() => location.reload()}>Ricarica l'app</button>
    <button class="btn block" style="margin-top:8px" onClick=${() => DB.get('settings').then(s => reportIssue(s))}>Segnala un problema</button>
  </div>`;
}

/* ---------------- rimuovi i dati da questo dispositivo ---------------- */
async function wipeStatus() {
  const recs = ((await DB.all()) || []).filter(r => !r._new);
  const st = (await DB.get('sync_state')) || {};
  const del = Object.keys((await DB.get('sync_del')) || {}).length;
  const syncOn = Sync.enabled();
  const pending = syncOn ? recs.filter(r => !st[r.id] || (r.updatedAt || 0) > (st[r.id].v || 0)) : recs;
  return { total: recs.length, pending, del, syncOn };
}
async function wipeDevice() {
  if (Sync.enabled()) { toast('Controllo la sincronizzazione…'); try { await Sync.run(); } catch (e) {} }
  const w = await wipeStatus();
  const what = 'attività, foto, configurazione, modelli, firma salvata e accesso a Microsoft';
  if (!w.pending.length && !w.del) {
    if (!confirm(`Tutte le ${w.total} attività sono su OneDrive.\n\nDa questo dispositivo verranno rimossi: ${what}.\nSu OneDrive resta tutto: accedendo di nuovo le attività tornano.\n\nContinuare?`)) return;
  } else {
    const nomi = w.pending.slice(0, 5).map(r => '· ' + recordLabel(r)).join('\n') + (w.pending.length > 5 ? `\n· e altre ${w.pending.length - 5}` : '');
    const motivo = w.syncOn ? `${w.pending.length} attività non sono ancora su OneDrive${w.del ? ' e alcune eliminazioni non sono state inviate' : ''}` : `la sincronizzazione con OneDrive non è attiva: le ${w.total} attività sono solo qui`;
    const ans = prompt(`ATTENZIONE: ${motivo}.\n${nomi}\n\nSe continui andranno perse. Prima collega OneDrive o fai un backup ZIP.\n\nPer rimuovere comunque ${what}, scrivi ELIMINA.`);
    if ((ans || '').trim().toUpperCase() !== 'ELIMINA') { toast('Nessun dato rimosso'); return; }
  }
  try {
    await DB.wipe();
    const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
    ks.filter(k => /^nembo_|^msal\.|login\.microsoftonline|^[0-9a-f-]{36}\./i.test(k)).forEach(k => localStorage.removeItem(k));
    try { sessionStorage.clear(); } catch (e) {}
    location.hash = ''; location.reload();
  } catch (e) { fail('Dati non rimossi', e); }
}
function WipeCard() {
  const [w, setW] = useState(null);
  useEffect(() => { wipeStatus().then(setW); }, []);
  return html`<div class="card tight">
    <p class="lead" style="margin:6px 0 10px">Per cambiare dispositivo, restituirlo o prima della migrazione dell'account Microsoft: toglie da qui attività, foto, configurazione, modelli, firma e accesso a Microsoft. Quello che è su OneDrive resta.</p>
    ${w && html`<p style=${'margin:0 2px 10px;font-size:var(--fs-md);font-weight:600;color:' + (w.pending.length || w.del ? 'var(--danger)' : 'var(--ok)')}>
      ${!w.total ? 'Nessuna attività su questo dispositivo.' : w.pending.length || w.del ? (w.syncOn ? `${w.pending.length} attività su ${w.total} non ancora su OneDrive.` : `Sincronizzazione non attiva: le ${w.total} attività sono solo qui.`) : `Tutte le ${w.total} attività sono su OneDrive.`}</p>`}
    <button class="btn danger block" onClick=${wipeDevice}><${Icon} n="trash" s=${17} /> Rimuovi i dati da questo dispositivo</button>
  </div>`;
}

/* ---------------- notifiche ---------------- */
function Notifiche({ settings, records = [], openRec }) {
  const list = useNotifiche();
  const [open, setOpen] = useState({});
  const [f, setF] = useState('tutte');
  useEffect(() => { const t = setTimeout(notifMarkRead, 400); return () => clearTimeout(t); }, [list.length]);
  const shown = list.filter(n => f === 'tutte' || (f === 'err' ? n.level === 'err' : n.level !== 'err'));
  const nErr = list.filter(n => n.level === 'err').length;
  const COL = { ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--danger)', info: 'var(--blue)', new: 'var(--blue)' };
  const LBL = { ok: 'Completato', warn: 'Interrotto', err: 'Errore', info: 'Promemoria', new: 'Novità' };
  const copy = async n => {
    const txt = [new Date(n.t).toLocaleString('it-IT'), n.title, n.record && 'Attività: ' + n.record, n.code && 'Codice: ' + n.code, n.detail, ...(n.items || [])].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Dettagli copiati'); } catch (e) { toast('Copia non riuscita'); }
  };
  return html`<div class="content">
    <${LargeTitle} top title="Notifiche" />
    <p class="lead">Esiti dei caricamenti su OneDrive, promemoria ed errori dell'app, con il relativo codice. Restano su questo dispositivo (ultime ${NOTIF_MAX}).</p>
    <${IssueCard} settings=${settings} />
    ${list.length > 0 && html`<div class="row" style="margin:6px 0 12px">
      <div class="seg" style="flex:1">
        <button class=${f === 'tutte' ? 'on' : ''} onClick=${() => setF('tutte')}>Tutte · ${list.length}</button>
        <button class=${f === 'err' ? 'on' : ''} onClick=${() => setF('err')}>Errori · ${nErr}</button>
        <button class=${f === 'ok' ? 'on' : ''} onClick=${() => setF('ok')}>Esiti · ${list.length - nErr}</button>
      </div></div>`}
    ${!shown.length && html`<div class="empty"><b>Nessuna notifica</b>${list.length ? 'Niente in questa categoria.' : 'Qui compariranno gli esiti dei caricamenti e gli eventuali errori.'}</div>`}
    <div>${shown.map(n => html`<div class="card tight st-bar" key=${n.id} style=${'--st:' + COL[n.level] + ';padding:12px 14px 12px 18px'}>
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
        <b style=${'font-size:var(--fs-sm);font-weight:600;color:' + COL[n.level]}>${LBL[n.level]}</b>
        <span style="font-size:var(--fs-xs);color:var(--muted)">${new Date(n.t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
      <div style="font-weight:700;margin-top:3px">${n.title}</div>
      ${n.record && html`<div style="font-size:var(--fs-sm);color:var(--text2);margin-top:2px">${n.record}</div>`}
      ${(() => { const rs = (n.ids || []).map(id => records.find(r => r.id === id)).filter(Boolean); if (!rs.length || n.level === 'ok') return null;
        return html`<div class="ntf-act">
          ${html`<button class="btn sm pri" onClick=${() => odSync(rs, settings)}><${Icon} n="share" s=${15} /> Ricarica${rs.length > 1 ? ' tutte' : ''}</button>`}
          ${rs.map(r => html`<button class="btn sm" key=${r.id} onClick=${() => openRec(r)}>Apri ${rs.length > 1 ? r.codice || recordTitle(r) : 'attività'}</button>`)}</div>`; })()}
      ${n.detail && html`<div style="font-size:var(--fs-sm);margin-top:6px;word-break:break-word">${n.detail}</div>`}
      ${n.code && html`<div style="margin-top:8px"><span class="mono" style="font-size:var(--fs-sm);background:var(--fill-soft);border-radius:var(--r-xs);padding:2px 8px">Codice: ${n.code}</span></div>`}
      ${(n.items || []).length > 0 && html`<button class="btn sm" style="margin-top:8px" onClick=${() => setOpen(o => ({ ...o, [n.id]: !o[n.id] }))}>${open[n.id] ? 'Nascondi' : 'Mostra'} dettaglio file (${n.items.length})</button>
        ${open[n.id] && html`<div class="mono" style="margin-top:8px;font-size:var(--fs-sm);font-weight:500;background:var(--fill-soft);border-radius:var(--r-sm);padding:8px;max-height:260px;overflow:auto;word-break:break-word">${n.items.map(x => html`<div style="padding:3px 0;border-bottom:1px dashed var(--border)">${x}</div>`)}</div>`}`}
      ${(n.level === 'err' || n.level === 'warn') && html`<div style="margin-top:8px"><button class="btn sm" onClick=${() => copy(n)}>Copia dettagli</button></div>`}
    </div>`)}</div>
    ${list.length > 0 && html`<button class="btn danger block" style="margin-top:16px" onClick=${() => { if (confirm('Cancellare tutte le notifiche?')) notifClear(); }}><${Icon} n="trash" s=${17} /> Svuota notifiche</button>`}
  </div>`;
}

/* ---------------- backup ---------------- */
function Backup({ records, all, settings, reload, lastBackup }) {
  const inp = useRef(); const [busy, setBusy] = useState(false);
  const [persist, setPersist] = useState(null);
  const [est, setEst] = useState(null);
  useEffect(() => {
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(setPersist);
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(setEst);
  }, []);
  const doExport = async () => { setBusy(true); await exportRecords(all || records, settings, true); setBusy(false); reload(); };
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
    <${LargeTitle} top title="Backup" />
    <div class="card">
      <h2 style="font-size:var(--fs-xl);font-weight:600">Backup su OneDrive</h2>
      <p class="lead" style="margin:6px 0 12px">Un unico file ZIP con tutte le indagini e campagne, anche con centinaia di foto: cartelle con foto, allegati e PDF, più i dati in manifest.json per il ripristino. Nella finestra di salvataggio scegli OneDrive; se non compare, il file va in Download e lo carichi dall'app OneDrive.</p>
      <button class="btn pri block" disabled=${busy || !records.length} onClick=${doExport}>${busy ? html`<div class="spin" />` : html`<${Icon} n="archive" s=${18} />`} Crea backup completo</button>
      ${OD.account && html`<button class="btn outline block" style="margin-top:8px" disabled=${busy || !records.length} onClick=${async () => { setBusy(true); await odSync(records.filter(r => !r._new), settings); setBusy(false); }}><${Icon} n="share" s=${18} /> Carica tutto su OneDrive</button>`}
      <div class="lock" style="margin-top:8px">${lastBackup ? 'Ultimo backup: ' + new Date(lastBackup).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nessun backup ancora'}</div>
    </div>
    <div class="card">
      <h2 style="font-size:var(--fs-xl);font-weight:600">Ripristina da backup</h2>
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
const LIST_OF = { cli: 'cliList', dda: 'ddaList', mappatura: 'mappaturaList', radon: 'radonList', ra: 'raList', hs: 'hsList', vs: 'vsList', firme: 'firmeList', aria: 'ariaList' };
const DETAIL_OF = { cliList: 'cli', ddaList: 'dda', mappaturaList: 'mappatura', radonList: 'radon', raList: 'ra', hsList: 'hs', vsList: 'vs', firmeList: 'firme', ariaList: 'aria' };
const TOP_ROUTES = ['home', 'agenda', 'ddaList', 'mappaturaList', 'raList', 'radonList', 'hsList', 'vsList', 'firmeList', 'ariaList'];
const ROUTE_TITLE = { home: 'Oggi', ddaList: 'Ambiente · DDA', mappaturaList: 'Mappatura MCA e FAV', raList: 'Sopralluogo RA', radonList: 'Campagne radon', ariaList: 'Monitoraggio aria', aria: 'Monitoraggio aria',
  hsList: 'Sopralluoghi HSE', hs: 'Sopralluogo HSE', vsList: 'Verbali HSE', vs: 'Verbale HSE', firmeList: 'Fogli firme', firme: 'Fogli firme', agenda: 'Programmazione', cerca: 'Cerca', cliList: 'Clienti', cli: 'Cliente', settings: 'Impostazioni', backup: 'Backup', notifiche: 'Notifiche', dda: 'DDA', mappatura: 'Mappatura', ra: 'Sopralluogo RA', radon: 'Campagna radon' };

/* ---------------- menu laterale (tablet in orizzontale e PC) ---------------- */
const NAV_AREAS = [
  { v: 'ddaList', d: 'dda', ic: 'leaf', l: 'Ambiente · DDA' },
  { v: 'mappaturaList', d: 'mappatura', ic: 'pin', l: 'Mappatura MCA e FAV' },
  { v: 'raList', d: 'ra', ic: 'shield', l: 'Sopralluogo RA' },
  { v: 'radonList', d: 'radon', ic: 'radon', l: 'Campagne radon' },
  { v: 'ariaList', d: 'aria', ic: 'air', l: 'Monitoraggio aria' },
];
const NAV_HS = [{ v: 'hsList', d: 'hs', ic: 'helmet', l: 'Sopralluoghi HSE' }, { v: 'vsList', d: 'vs', ic: 'note', l: 'Verbali HSE' }];
const NAV_TOOLS = [{ v: 'agenda', ic: 'clock', l: 'Programmazione' }, { v: 'cliList', d: 'cli', ic: 'building', l: 'Clienti' }, { v: 'firmeList', d: 'firme', ic: 'sign', l: 'Fogli firme' }, { v: 'backup', ic: 'archive', l: 'Backup' }];
// tab bar del telefono: Oggi + le quattro aree
const TABS = [{ v: 'home', ic: 'today', l: 'Oggi' }, { v: 'ddaList', ic: 'leaf', l: 'DDA' }, { v: 'mappaturaList', ic: 'pin', l: 'Mappature' },
  { v: 'raList', ic: 'shield', l: 'RA' }, { v: 'radonList', ic: 'radon', l: 'Radon' }];
// menu ridotto o esteso: la scelta dell'utente resta; altrimenti ridotto sotto i 1300 px
function useNavMin() {
  const [min, setMin] = useState(() => {
    try { const v = localStorage.getItem('nembo_nav'); if (v) return v === 'min'; } catch (e) {}
    return !matchMedia('(min-width: 1300px)').matches;
  });
  const toggle = () => setMin(m => { try { localStorage.setItem('nembo_nav', m ? 'full' : 'min'); } catch (e) {} return !m; });
  return [min, toggle];
}
// colori delle icone nel menu laterale esteso: gli stessi del foglio "Nuova attività"
const SN_COL = {
  home: 'var(--blue)', ddaList: TIPO_COL.dda, mappaturaList: TIPO_COL.mappatura, raList: TIPO_COL.ra, radonList: TIPO_COL.radon, ariaList: TIPO_COL.aria,
  hsList: TIPO_COL.hs, vsList: TIPO_COL.vs, agenda: 'var(--navy-ink)', firmeList: TIPO_COL.firme, cerca: 'var(--navy-ink)', cliList: TIPO_COL.dda,
  backup: 'var(--text2)', settings: 'var(--text2)',
};
function SideNav({ route, go, counts, settings, min, toggle }) {
  const nav = v => { if (route.v !== v) go({ v }); };
  const item = (x, n) => {
    const on = route.v === x.v || route.v === x.d;
    const col = SN_COL[x.v];
    return html`<button class=${'sn-it' + (on ? ' on' : '')} title=${min ? x.l : null} aria-current=${on ? 'page' : null} onClick=${() => nav(x.v)}>
      ${!min && col ? html`<span class="sn-ic tint" style=${'--c:' + col}><${Icon} n=${x.ic} s=${19} /></span>` : html`<${Icon} n=${x.ic} s=${21} />`}<span class="l">${x.l}</span>${n > 0 && html`<span class="n">${n}</span>`}</button>`;
  };
  const name = `${settings.tecnicoNome || ''} ${settings.tecnicoCognome || ''}`.trim();
  const initials = (((settings.tecnicoNome || '')[0] || '') + ((settings.tecnicoCognome || '')[0] || '')).toUpperCase();
  const ss = useSync(); const sync = OD.account && settings.odSync !== false ? syncLabel(ss) : ''; const syncPhase = ss.phase;
  return html`<aside class=${'sidenav' + (min ? ' min' : '')} aria-label="Aree di lavoro">
    <button class="sn-brand" title="Oggi" onClick=${() => nav('home')}><img class="logo" src="icons/icon-192.png" alt="" /><div><b>Nembo</b>${name && html`<small>${name}</small>`}</div></button>
    <div class="sn-sec">Oggi</div><div class="sn-div"></div>
    ${item({ v: 'home', ic: 'today', l: 'Oggi' }, 0)}
    ${item({ v: 'cerca', ic: 'search', l: 'Cerca' }, 0)}
    <div class="sn-sec">Aree di lavoro</div>
    ${NAV_AREAS.map(x => item(x, counts[x.d]))}
    <div class="sn-sec">HSE</div><div class="sn-div"></div>
    ${NAV_HS.map(x => item(x, counts[x.d]))}
    <div class="sn-sec">Strumenti</div><div class="sn-div"></div>
    ${NAV_TOOLS.map(x => item(x, x.d ? counts[x.d] : 0))}
    <div class="sn-grow"></div>
    <button class=${'sn-prof' + (route.v === 'settings' ? ' on' : '')} title=${min ? 'Impostazioni' : null} aria-label="Profilo e impostazioni" onClick=${() => nav('settings')}>
      <span class="ava">${initials || html`<${Icon} n="gear" s=${18} />`}</span><span class="l"><b>${name || 'Profilo'}</b><small>Impostazioni</small></span></button>
    <button class="sn-toggle" title=${min ? 'Espandi il menu' : 'Riduci il menu'} aria-expanded=${!min} onClick=${toggle}>
      <${Icon} n=${min ? 'expand' : 'collapse'} s=${19} /><span class="l">Riduci menu</span></button>
    <div class="sn-ver">${APP_VERSION}${sync && html`<br /><span class=${'sn-sync ' + syncPhase}>${sync}</span>`}</div>
  </aside>`;
}
const TABS_HS = [{ v: 'home', ic: 'today', l: 'Oggi' }, { v: 'hsList', ic: 'helmet', l: 'HSE' }, { v: 'vsList', ic: 'note', l: 'Verbali' }, { v: 'ddaList', ic: 'leaf', l: 'DDA' }, { v: 'raList', ic: 'shield', l: 'RA' }];
function TabBar({ route, tab, bu }) {
  const tabs = bu === 'hs' ? TABS_HS : TABS;
  return html`<nav class="tabbar" aria-label="Sezioni" style=${'grid-template-columns:repeat(' + tabs.length + ',1fr)'}>${tabs.map(t => html`<button class=${route.v === t.v ? 'on' : ''} aria-current=${route.v === t.v ? 'page' : null} onClick=${() => tab(t.v)}>
    <${Icon} n=${t.ic} s=${24} /><span>${t.l}</span></button>`)}</nav>`;
}

function App() {
  const wide = useWide();
  const [ready, setReady] = useState(false);
  const [allRecs, setRecords] = useState([]);
  // le attività; i clienti (tipo 'cli') stanno a parte
  const records = useMemo(() => allRecs.filter(r => r.type !== 'cli'), [allRecs]);
  const clienti = useMemo(() => allRecs.filter(r => r.type === 'cli'), [allRecs]);
  setClienti(clienti);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [route, setRoute] = useState({ v: 'home' });
  const notifs = useNotifiche();
  const unreadErr = notifs.filter(n => !n.read && n.level === 'err').length;
  const [navMin, toggleNav] = useNavMin();
  const [lastBackup, setLastBackup] = useState(null);
  const [installEvt, setInstallEvt] = useState(null);
  const [tplOk, setTplOk] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [preset, setPreset] = useState(null);
  const [novita, setNovita] = useState(null);
  const [, odTick] = useState(0);
  useEffect(() => OD.subscribe(() => odTick(x => x + 1)), []);

  const reload = async () => {
    const rs = await DB.all(); setRecords(rs);
    const s = await DB.get('settings'); const st = { ...DEFAULT_SETTINGS, ...(s || {}) }; setSettingsState(st); _settings = st;
    setLastBackup(await DB.get('lastBackup'));
    const t = await Promise.all(Object.values(TEMPLATES).filter(x => x.bu === 'ambiente' && !x.xlsx).map(x => DB.get(x.key)));
    setTplOk(t.every(Boolean));
    OD.init(st).catch(e => console.warn('OneDrive', e));
    return rs;
  };
  useEffect(() => {
    reload().then(rs => { setReady(true); novitaDaMostrare(rs.some(r => r.type !== 'cli')).then(l => l && setNovita(l)).catch(e => console.warn('novità', e)); radonReminders(rs).then(n => n && DB.all().then(setRecords)); Sync.start(); });
    const offRec = Sync.onRecords(() => DB.all().then(setRecords));
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const bip = e => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', bip);
    return () => { window.removeEventListener('beforeinstallprompt', bip); offRec(); };
  }, []);

  const setSettings = s => { setSettingsState(s); _settings = s; DB.set('settings', s); };
  const go = next => { const prev = route; setRoute({ ...next, from: ROUTE_TITLE[prev.v] }); Back.push(() => setRoute(prev)); };
  const goBack = () => history.back();
  // tab bar: dalla Home si entra in un'area (Indietro torna a Oggi); tra un'area e l'altra si sostituisce la schermata
  const tab = v => {
    if (v === route.v) return;
    if (route.v === 'home') go({ v });
    else if (v === 'home') goBack();
    else setRoute({ v, from: 'Oggi' });
  };
  // nel doppio pannello, scegliere un’attività dall'elenco non è una "navigazione": niente storico
  const select = id => setRoute(r => ({ ...r, id }));

  // ruotando il tablet, passa dalla schermata piena al doppio pannello (e viceversa) senza perdere l’attività aperta
  useEffect(() => {
    setRoute(r => {
      if (wide && DETAIL_OF[LIST_OF[r.v]] === r.v) return { v: LIST_OF[r.v], id: r.id };
      if (!wide && DETAIL_OF[r.v] && r.id) { const list = r.v; Back.push(() => setRoute({ v: list })); return { v: DETAIL_OF[r.v], id: r.id, from: ROUTE_TITLE[list] }; }
      return r;
    });
  }, [wide]);

  const saveRec = useCallback(async rec => {
    await DB.put(rec);
    setRecords(rs => { const i = rs.findIndex(x => x.id === rec.id); if (i < 0) return [...rs, rec]; const c = rs.slice(); c[i] = rec; return c; });
    Sync.schedule();
  }, []);
  const delRec = async rec => {
    if (!confirm('Eliminare definitivamente? Foto e allegati vengono cancellati da questo telefono.')) return;
    for (const b of blobIds(rec)) await removeBlob(b);
    await DB.del(rec.id);
    Sync.markDeleted(rec.id);
    setRecords(rs => rs.filter(x => x.id !== rec.id));
    toast('Eliminato');
    if (wide) select(null); else goBack();
  };
  // eliminazione senza cambiare schermata (appuntamenti della Programmazione)
  const removeRec = async rec => {
    for (const b of blobIds(rec)) await removeBlob(b);
    await DB.del(rec.id); Sync.markDeleted(rec.id);
    setRecords(rs => rs.filter(x => x.id !== rec.id));
  };
  // colori dei tag coerenti in tutta l'app
  useEffect(() => { setTagList(Object.keys(collectTags(records))); }, [records]);
  // l’attività aperta non viene sovrascritta dalla sincronizzazione
  useEffect(() => { Sync.busy = route.id || null; }, [route.id]);
  // uscendo da un record nuovo rimasto vuoto, lo scarto
  useEffect(() => {
    if (route.v === 'dda' || route.v === 'mappatura' || route.v === 'radon' || route.v === 'ra' || route.v === 'hs' || route.v === 'vs' || route.v === 'firme' || route.v === 'aria' || route.v === 'cli') return;
    const keep = route.id;
    const empties = allRecs.filter(r => r._new && r.id !== keep && (r.type === 'cli' ? clienteIsEmpty(r) : r.type === 'aria' ? ariaIsEmpty(r) : r.type === 'dda' ? ddaIsEmpty(r) : r.type === 'mappatura' ? mappaturaIsEmpty(r) : r.type === 'ra' ? raIsEmpty(r) : r.type === 'hs' ? hsIsEmpty(r) : r.type === 'vs' ? verbaleIsEmpty(r) : r.type === 'firme' ? firmeIsEmpty(r) : radonIsEmpty(r)));
    empties.forEach(r => DB.del(r.id));
    if (empties.length) setRecords(rs => rs.filter(r => !empties.includes(r)));
  }, [route.v, route.id]);

  // apre un’attività: nel doppio pannello dentro l'area, altrimenti a schermo pieno
  const openRec = r => {
    if (wide) { if (route.v === LIST_OF[r.type]) select(r.id); else go({ v: LIST_OF[r.type], id: r.id }); }
    else go({ v: r.type, id: r.id });
  };
  const create = (type, patch = {}) => {
    const base = type === 'cli' ? newCliente() : type === 'aria' ? newAria(records, settings) : type === 'dda' ? newDda(records, settings) : type === 'mappatura' ? newMappatura(records, settings) : type === 'ra' ? newRa(records, settings) : type === 'hs' ? newHs(records, settings, patch.formato) : type === 'vs' ? newVerbale(records, settings) : type === 'firme' ? newFirmeRec(records, settings) : newRadon(settings);
    let r = { ...base, ...patch, _new: true };
    prepFirme(r, settings, patch.firme);
    // dalla Programmazione: per il radon data e ora vanno sul primo momento (posa)
    if (type === 'radon' && (patch.data || patch.ora)) { const { data, ora, ...rest } = patch; r = { ...base, ...rest, _new: true, momenti: base.momenti.map((m, i) => i ? m : { ...m, data: data || m.data, ora: ora || '' }) }; }
    // RA dello stesso immobile già in Nembo: riprendo i manufatti dell'anno precedente
    const prev = type === 'ra' ? raPrecedente(records, r) : null;
    if (prev) { raRiprendi(prev, r).then(p => { const x = { ...r, ...p }; saveRec(x); openRec(x); toast(`${p.manufatti.length === 1 ? 'Ripreso 1 manufatto' : 'Ripresi ' + p.manufatti.length + ' manufatti'} da ${prev.codice}`); }).catch(e => { fail('Ripresa non riuscita', e); saveRec(r); openRec(r); }); return; }
    saveRec(r); openRec(r);
  };
  const createDda = () => create('dda');
  const createMappatura = () => create('mappatura');
  const createRadon = () => create('radon');
  const createRa = () => create('ra');
  const createHs = () => setSheet('hs');
  const createFirme = () => create('firme');
  const createAria = () => create('aria');
  const createVs = () => create('vs');
  const createCli = () => create('cli');
  const importClienti = async nomi => {
    if (!confirm(`Aggiungo ${nomi.length === 1 ? 'il cliente «' + nomi[0] + '»' : nomi.length + ' clienti'} all'anagrafica?`)) return;
    for (const nome of nomi) await saveRec(newCliente({ nome }));
    toast(nomi.length === 1 ? 'Cliente aggiunto' : nomi.length + ' clienti aggiunti');
  };
  // un report HSE già pronto (aggiornamento per l'anno successivo): lo salvo e lo apro
  const openNewRec = r => { saveRec(r); openRec(r); toast('Nuovo report creato: ' + r.codice); };

  const header = useCallback(() => {}, []); // le schede disegnano da sole la propria intestazione
  if (!ready) return html`<div class="shell"></div>`;
  const rec = route.id && allRecs.find(r => r.id === route.id);

  const initials = ((settings.tecnicoNome || '')[0] || '') + ((settings.tecnicoCognome || '')[0] || '');
  const bell = html`<button class=${'btn-icon' + (route.v === 'notifiche' ? ' on' : '')} aria-label=${unreadErr ? `Notifiche, ${unreadErr} errori non letti` : 'Notifiche'}
    onClick=${() => route.v !== 'notifiche' && go({ v: 'notifiche' })}><${Icon} n="bell" s=${21} />${unreadErr > 0 && html`<span class="dot">${unreadErr}</span>`}</button>`;
  const plus = (fn, label) => html`<button class="btn-icon pri" aria-label=${label} onClick=${fn}><${Icon} n="plus" s=${22} w=${2.4} /></button>`;
  const listActs = (fn, label) => html`${plus(fn, label)}${bell}`;

  const split = (list, detail, emptyTxt) => wide ? html`<div class="split-body">
      <div class="split-list">${list}</div>
      <div class="split-detail">${detail || html`<div class="split-empty"><b>${emptyTxt[0]}</b>${emptyTxt[1]}</div>`}</div></div>` : list;
  const dRec = wide && route.id && allRecs.find(x => x.id === route.id);
  const formProps = r => ({ key: r.id, rec: r, records, settings, onDelete: delRec, onSettings: () => go({ v: 'settings' }), header, embedded: wide, onClose: wide ? () => select(null) : null });

  let body, wideCreate = null;
  if (route.v === 'home') {
    wideCreate = () => setSheet(true);
    body = html`<${Home} records=${records} settings=${settings} open=${openRec} newAct=${() => setSheet(true)} bell=${bell}
      avatar=${html`<button class="ava" aria-label="Impostazioni" onClick=${() => go({ v: 'settings' })}>${initials.toUpperCase() || html`<${Icon} n="gear" s=${20} />`}</button>`}
      tplOk=${tplOk} lastBackup=${lastBackup} goList=${v => go({ v })} goSettings=${() => go({ v: 'settings' })} goBackup=${() => go({ v: 'backup' })} goCerca=${() => go({ v: 'cerca' })}
      installEvt=${installEvt} onInstall=${async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }} />`;
  } else if (route.v === 'ddaList') {
    wideCreate = createDda;
    body = split(html`<${DdaList} records=${records} acts=${listActs(createDda, 'Nuova indagine')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'dda', id })} create=${createDda} />`,
      dRec && html`<${DdaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && ddaIsEmpty(r) })} />`,
      ['Nessuna attività selezionata', 'Toccane una dall\'elenco per aprirla qui.']);
  } else if (route.v === 'mappaturaList') {
    wideCreate = createMappatura;
    body = split(html`<${MappaturaList} records=${records} acts=${listActs(createMappatura, 'Nuova mappatura')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'mappatura', id })} create=${createMappatura} />`,
      dRec && html`<${MappaturaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && mappaturaIsEmpty(r) })} />`,
      ['Nessuna mappatura selezionata', 'Toccane una dall\'elenco per aprirla qui.']);
  } else if (route.v === 'raList') {
    wideCreate = createRa;
    body = split(html`<${RaList} records=${records} acts=${listActs(createRa, 'Nuovo sopralluogo RA')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'ra', id })} create=${createRa} />`,
      dRec && html`<${RaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && raIsEmpty(r) })} />`,
      ['Nessun sopralluogo selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'radonList') {
    wideCreate = createRadon;
    body = split(html`<${RadonList} records=${records} acts=${listActs(createRadon, 'Nuova campagna')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'radon', id })} create=${createRadon} />`,
      dRec && html`<${RadonForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && radonIsEmpty(r) })} />`,
      ['Nessuna campagna selezionata', 'Toccane una dall\'elenco per aprirla qui.']);
  } else if (route.v === 'hsList') {
    wideCreate = createHs;
    body = split(html`<${HsList} records=${records} acts=${listActs(createHs, 'Nuovo sopralluogo HSE')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'hs', id })} create=${createHs} />`,
      dRec && html`<${HsForm} ...${formProps(dRec)} onOpenNew=${openNewRec} onSave=${r => saveRec({ ...r, _new: r._new && hsIsEmpty(r) })} />`,
      ['Nessun report selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'cerca') {
    body = html`<${Cerca} records=${records} openRec=${openRec} acts=${null} />`;
  } else if (route.v === 'agenda') {
    wideCreate = () => dispatchEvent(new Event('nembo-ag-add'));
    body = html`<${Agenda} records=${records} settings=${settings} saveRec=${saveRec} openRec=${openRec} bell=${bell} removeRec=${removeRec} />`;
  } else if (route.v === 'cliList') {
    wideCreate = createCli;
    body = split(html`<${ClientiList} records=${records} clienti=${clienti} onImport=${importClienti} acts=${listActs(createCli, 'Nuovo cliente')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'cli', id })} />`,
      dRec && html`<${ClienteForm} ...${formProps(dRec)} openRec=${openRec} onSave=${r => saveRec({ ...r, _new: r._new && clienteIsEmpty(r) })} />`,
      ['Nessun cliente selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'cli' && rec) {
    body = html`<${ClienteForm} ...${formProps(rec)} embedded=${false} onClose=${null} openRec=${openRec} onSave=${r => saveRec({ ...r, _new: r._new && clienteIsEmpty(r) })} />`;
  } else if (route.v === 'firmeList') {
    wideCreate = createFirme;
    body = split(html`<${FirmeList} records=${records} acts=${listActs(createFirme, 'Nuovo foglio firme')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'firme', id })} />`,
      dRec && html`<${FirmeForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && firmeIsEmpty(r) })} />`,
      ['Nessun foglio selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'vsList') {
    wideCreate = createVs;
    body = split(html`<${VerbaleList} records=${records} acts=${listActs(createVs, 'Nuovo verbale HSE')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'vs', id })} />`,
      dRec && html`<${VerbaleForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && verbaleIsEmpty(r) })} />`,
      ['Nessun verbale selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'vs' && rec) {
    body = html`<${VerbaleForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && verbaleIsEmpty(r) })} />`;
  } else if (route.v === 'ariaList') {
    wideCreate = createAria;
    body = split(html`<${AriaList} records=${records} acts=${listActs(createAria, 'Nuovo monitoraggio aria')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'aria', id })} />`,
      dRec && html`<${AriaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && ariaIsEmpty(r) })} />`,
      ['Nessun monitoraggio selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'aria' && rec) {
    body = html`<${AriaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && ariaIsEmpty(r) })} />`;
  } else if (route.v === 'firme' && rec) {
    body = html`<${FirmeForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && firmeIsEmpty(r) })} />`;
  } else if (route.v === 'hs' && rec) {
    body = html`<${HsForm} ...${formProps(rec)} embedded=${false} onClose=${null} onOpenNew=${openNewRec} onSave=${r => saveRec({ ...r, _new: r._new && hsIsEmpty(r) })} />`;
  } else if (route.v === 'dda' && rec) {
    body = html`<${DdaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && ddaIsEmpty(r) })} />`;
  } else if (route.v === 'mappatura' && rec) {
    body = html`<${MappaturaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && mappaturaIsEmpty(r) })} />`;
  } else if (route.v === 'ra' && rec) {
    body = html`<${RaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && raIsEmpty(r) })} />`;
  } else if (route.v === 'radon' && rec) {
    body = html`<${RadonForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && radonIsEmpty(r) })} />`;
  } else if (route.v === 'settings') {
    body = html`<${Settings} settings=${settings} setSettings=${setSettings} onTemplates=${reload} go=${go} />`;
  } else if (route.v === 'notifiche') {
    body = html`<${Notifiche} settings=${settings} records=${records} openRec=${openRec} />`;
  } else if (route.v === 'backup') {
    body = html`<${Backup} records=${records} all=${allRecs} settings=${settings} reload=${reload} lastBackup=${lastBackup} />`;
  } else {
    body = html`<div class="content"><div class="empty"><b>Elemento non trovato</b>Potrebbe essere stato eliminato.</div></div>`;
  }

  const isTop = TOP_ROUTES.includes(route.v);
  const splitActive = wide && !!DETAIL_OF[route.v];
  const counts = { dda: records.filter(r => r.type === 'dda').length, mappatura: records.filter(r => r.type === 'mappatura').length,
    cli: clienti.length, ra: records.filter(r => r.type === 'ra').length, hs: records.filter(r => r.type === 'hs').length, vs: records.filter(r => r.type === 'vs').length, firme: records.filter(r => r.type === 'firme').length, aria: records.filter(r => r.type === 'aria').length, radon: records.filter(r => r.type === 'radon' && radonStato(r) !== 'terminata').length };
  return html`<div class=${'frame' + (wide ? ' wide' : '')}>
    ${wide && html`<${SideNav} route=${route} go=${go} counts=${counts} settings=${settings} min=${navMin} toggle=${toggleNav} />`}
    <div class=${'shell' + (splitActive ? ' split' : '') + (!wide && isTop ? ' has-tabs' : '')}>
    ${wide && html`<header class="wbar"><div class="tb-grow">${route.v === 'home' && html`<div class="lt-eye">${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`}<h1>${ROUTE_TITLE[route.v] || 'Nembo'}</h1></div>
      ${route.v !== 'cerca' && html`<button class="btn-icon" aria-label="Cerca" title="Cerca" onClick=${() => go({ v: 'cerca' })}><${Icon} n="search" s=${20} /></button>`}${wideCreate && plus(wideCreate, 'Nuova')}${bell}</header>`}
    ${!wide && !isTop && html`<header class="navbar">
      <button class="nb-back" onClick=${goBack}><${Icon} n="back" s=${22} /> ${route.from || 'Indietro'}</button>
      <div class="nb-grow"></div>${route.v !== 'notifiche' && bell}</header>`}
    ${body}
    ${!wide && isTop && html`<${TabBar} route=${route} tab=${tab} bu=${settings.buDefault} />`}
    ${sheet && html`<${NewActivity} records=${records} preset=${preset} bu=${sheet === 'hs' ? 'hs' : settings.buDefault} onClose=${() => { setSheet(false); setPreset(null); }} onCreate=${(t, patch) => { window.addEventListener('popstate', () => setTimeout(() => create(t, patch), 0), { once: true }); setSheet(false); }} />`}
    <${ShareAsk} />
    <${Progress} />
    <${CameraHost} />
    ${novita && html`<${NovitaSheet} list=${novita} go=${go} onClose=${() => setNovita(null)} />`}
    <${Toast} />
    </div>
  </div>`;
}


render(html`<${Boundary}><${App} /></${Boundary}>`, document.getElementById('root'));
const splash = document.getElementById('splash');
if (splash) requestAnimationFrame(() => requestAnimationFrame(() => { splash.classList.add('hide'); setTimeout(() => splash.remove(), 550); }));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
}
