/* Scheda «File» delle attività: i documenti da generare (schede di prelievo, riepiloghi Word, scheda radon, schede aria,
   report e verbale HSE, fogli firme). Stato del tasto: grigio = da generare, verde = generato (tocco = apre il file),
   ambra = dati cambiati dopo la generazione. «Rigenera» crea un file nuovo con suffisso _rev1, _rev2… senza sovrascrivere.
   I file generati restano sul dispositivo e vanno su OneDrive subito (se collegato e in rete) o al primo caricamento.
   r.files = { [chiave]: [{ t, sig, rev, blobId, name }] } (in ordine di revisione) */

const PDF_MIME = 'application/pdf';
const FILE_FMT = { [PDF_MIME]: ['PDF', '.pdf'], [XLSX_MIME]: ['Excel', '.xlsx'], [DOCX_MIME]: ['Word', '.docx'] };
const pdfBlob = async p => new Blob([await p], { type: PDF_MIME });

// documenti dell'attività: { key, label, sub, type, base, dir, make, dep, after, tpl }
function recDocs(r, s) {
  s = s || _settings;
  const D = [], ana = [r.commessa, r.cliente, placeDoc(r)];
  if (r.type === 'dda' || r.type === 'mappatura') {
    for (const k of ['mca', 'fav']) {
      const L = r.campioni[k] || []; if (!L.length) continue;
      const K = k.toUpperCase(), sub = L.length + (L.length === 1 ? ' campione' : ' campioni') + ' · per il laboratorio';
      const after = p => ({ ...p, congelati: { ...p.congelati, [k]: true }, schede: { ...p.schede, [k]: Date.now() } });
      const dep = () => [ana, L.map(c => [c.codice, c.data, campDesc(c)])];
      D.push({ key: 'sc_' + k + '_pdf', label: 'Scheda campioni ' + K, sub, type: PDF_MIME, tpl: 'tpl_scheda', base: 'Scheda_campioni_' + K, dep, after, make: () => pdfBlob(schedaCampioniPdfBytes(r, k, s)) });
      D.push({ key: 'sc_' + k + '_xlsx', label: 'Scheda campioni ' + K, sub, type: XLSX_MIME, base: 'Scheda_campioni_' + K, dep, after, make: () => schedaCampioniXlsx(r, k, s) });
    }
    if (allCamp(r).length) D.push({ key: 'riep_docx', label: 'Riepilogo campioni', sub: 'Con foto, quantità e manufatti non campionati', type: DOCX_MIME, base: 'Riepilogo_campioni',
      dep: () => [ana, r.campioni, ncOf(r)], make: () => riepilogoCampioniDocx(r, s) });
  }
  if (r.type === 'radon') D.push({ key: 'radon_pdf', label: 'Scheda raccolta dati radon', type: PDF_MIME, tpl: 'tpl_radon', base: 'Scheda_radon_' + (r.commessa || 'campagna'),
    make: async () => pdfBlob(PdfGen.radonPdf(await loadTemplate('radon.pdf'), r)) });
  if (r.type === 'hs') D.push({ key: 'hs_docx', label: 'Report HSE', sub: 'Modello Word ' + (r.formato === 'sintetico' ? 'Sintetico' : 'Esteso'), type: DOCX_MIME, base: hsFileBase(r),
    tpl: TEMPLATES[r.formato === 'sintetico' ? 'hs_sintetico.docx' : 'hs_esteso.docx'].key,
    make: () => hsBuildDocx(r, s, { grigio: r.novitaRosso !== false, onStep: (n, t) => _progress({ title: 'Preparo il Word', text: `Foto ${n} di ${t}`, done: n, total: t }) }) });
  if (r.type === 'vs') D.push({ key: 'vs_docx', label: 'Verbale HSE', sub: 'Ogni nota diventa una scheda del verbale', type: DOCX_MIME, base: vsFileBase(r), tpl: TEMPLATES['vs.docx'].key,
    make: () => vsBuildDocx(r, s, { onStep: (n, t) => _progress({ title: 'Preparo il Word', text: `Foto ${n} di ${t}`, done: n, total: t }) }) });
  for (const o of ariaOutputs(r, s)) {
    const sch = o.name.startsWith('Scheda'), type = o.kind === 'office' ? o.type : PDF_MIME;
    D.push({ key: 'aria_' + (sch ? 'sch' : 'riep') + '_' + o.ext.slice(1), label: sch ? 'Scheda di prelievo aria' : 'Riepilogo monitoraggi aria', type, base: o.name, dir: 'aria',
      dep: () => [ana, ariaOf(r).punti], make: async () => o.kind === 'office' ? o.make() : pdfBlob(o.make()) });
  }
  for (const f of (r.fogli || [])) if (foglioFirme(f)) D.push({ key: 'firme_' + f.id, label: 'Foglio firme · ' + (f.titolo || 'presenze'), sub: fmtD(f.data), type: PDF_MIME, base: foglioNome(f), dir: 'firme',
    dep: () => [ana, f], make: () => pdfBlob(foglioPdf(r, f, s)) });
  return D;
}

// impronta dei dati da cui dipende il documento: se cambia, il tasto diventa ambra
const FILE_SKIP = new Set(['updatedAt', 'createdAt', 'files', 'schede', 'congelati', 'tab', '_new', 'stato']);
function fileSig(r, d) {
  const src = JSON.stringify(d.dep ? d.dep() : r, (k, v) => FILE_SKIP.has(k) ? undefined : v) || '';
  let h = 2166136261; for (let i = 0; i < src.length; i++) { h ^= src.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
const fileRevs = (r, d) => ((r.files || {})[d.key] || []);
function fileState(r, d) {
  const L = fileRevs(r, d); if (!L.length) return 'grey';
  return L[L.length - 1].sig === fileSig(r, d) ? 'green' : 'amber';
}
const fileName = (d, rev) => d.base + (rev ? '_rev' + rev : '');
const fileSegs = (d, rev) => [...(d.dir ? [d.dir] : []), fileName(d, rev)];

// genera una nuova revisione, la salva sul dispositivo e (se si può) su OneDrive
async function fileGenerate(r, up, s, d) {
  const L = fileRevs(r, d), rev = L.length ? L[L.length - 1].rev + 1 : 0;
  const sig = fileSig(r, d);
  const blob = await d.make(); _progress(null);
  const [, ext] = FILE_FMT[d.type];
  const name = fileName(d, rev) + ext;
  const blobId = await saveFile(new File([blob], name, { type: d.type }));
  const e = { t: Date.now(), sig, rev, blobId, name };
  up(p => { const f = { ...(p.files || {}) }; f[d.key] = [...(f[d.key] || []), e]; const q = { ...p, files: f }; return d.after ? d.after(q) : q; });
  // sul dispositivo restano le ultime due revisioni (le precedenti, già su OneDrive, si liberano)
  const sent = (await DB.get('od_sent')) || {};
  for (const old of L.slice(0, -1)) if (old.blobId && sent[old.blobId]) await removeBlob(old.blobId);
  if (OD.account && navigator.onLine) fileUpload(r, d, e, blob).catch(err => notify('warn', 'File non caricato su OneDrive: lo carico al prossimo invio', { record: recordTitle(r), detail: err.message, ids: [r.id] }));
  return e;
}
async function fileUpload(r, d, e, blob) {
  const folders = (await DB.get('od_folders')) || {};
  if (!folders[r.id]) { folders[r.id] = recordLabel(r) || r.id; await DB.set('od_folders', folders); }
  const res = await OD.upload([folders[r.id], ...fileSegs(d, e.rev)], blob, { type: d.type, replace: true });
  await fileMarkSent(e.blobId, res);
  toast('Caricato su OneDrive: ' + e.name);
}
async function fileMarkSent(blobId, res) {
  const sent = (await DB.get('od_sent')) || {}; sent[blobId] = res.path; await DB.set('od_sent', sent);
  const urls = (await DB.get('od_files')) || {}; urls[blobId] = res.item && res.item.webUrl || ''; await DB.set('od_files', urls);
  fileSubs.forEach(f => f());
}
const fileSubs = new Set();
function useOdFiles() {
  const [m, setM] = useState({ urls: {}, sent: {} });
  useEffect(() => { const load = () => Promise.all([DB.get('od_files'), DB.get('od_sent')]).then(([u, s]) => setM({ urls: u || {}, sent: s || {} })); load(); fileSubs.add(load); return () => fileSubs.delete(load); }, []);
  return m;
}
// apre l'ultima revisione: da OneDrive se c'è rete, altrimenti dal dispositivo
async function fileOpen(e) {
  const urls = (await DB.get('od_files')) || {};
  if (urls[e.blobId] && navigator.onLine && /^https:\/\//.test(urls[e.blobId])) { window.open(urls[e.blobId], '_blank', 'noopener'); return; }
  const b = e.blobId && await DB.getBlob(e.blobId);
  if (!b) { toast('Il file non è più su questo dispositivo: aprilo da OneDrive'); return; }
  if (b.type === PDF_MIME) { const w = window.open(URL.createObjectURL(b.blob), '_blank'); if (w) return; }
  await shareFiles([{ blob: b.blob, name: e.name }], e.name);
}

function FileTab({ r, up, settings }) {
  const docs = recDocs(r, settings);
  const od = useOdFiles();
  const [busy, setBusy] = useState(null);
  const run = async (d, nuovo) => {
    if (busy) return;
    const L = fileRevs(r, d);
    if (L.length && !nuovo) { fileOpen(L[L.length - 1]); return; }
    if (d.tpl && !(await DB.get(d.tpl))) { toast('Carica prima il modello in Impostazioni → Modelli'); return; }
    setBusy(d.key);
    try { const e = await fileGenerate(r, up, settings, d); toast((e.rev ? 'Nuova revisione: ' : 'Generato: ') + e.name); }
    catch (err) { _progress(null); fail('File non creato', err, recordTitle(r)); }
    setBusy(null);
  };
  const quando = t => new Date(t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  return html`<div>
    <div class="sec-h" style="margin-top:4px"><h3>File</h3><span class="hint">Si salvano anche su OneDrive</span></div>
    ${!docs.length ? html`<div class="card"><div class="empty" style="padding:18px">Ancora nessun file da generare: compaiono qui quando l'attività ha i dati che servono.</div></div>`
    : html`<div class="card files">${docs.map(d => {
      const st = fileState(r, d), L = fileRevs(r, d), last = L[L.length - 1], [fmt] = FILE_FMT[d.type];
      const su = last && od.sent[last.blobId];
      const info = st === 'grey' ? 'Da generare' : st === 'amber' ? `Dati cambiati dopo il ${quando(last.t)}: rigenera`
        : `Generato il ${quando(last.t)}${last.rev ? ' · rev' + last.rev : ''}${su ? ' · su OneDrive' : OD.account ? ' · da caricare su OneDrive' : ''}`;
      return html`<div class="frow" key=${d.key}>
        <button class=${'fbtn ' + st} disabled=${!!busy} onClick=${() => run(d)} aria-label=${(L.length ? 'Apri ' : 'Genera ') + d.label + ' ' + fmt}>
          <span class="fic">${busy === d.key ? html`<div class="spin" />` : html`<${Icon} n=${st === 'grey' ? 'file' : 'check'} s=${19} />`}<small>${fmt}</small></span>
          <span class="t"><b>${d.label}</b><small>${info}</small>${d.sub && st === 'grey' && html`<small>${d.sub}</small>`}</span></button>
        ${L.length > 0 && html`<button class=${'btn sm' + (st === 'amber' ? ' pri' : '')} disabled=${!!busy} onClick=${() => run(d, true)}>Rigenera</button>`}
      </div>`; })}</div>
    <p class="hint-p" style="margin:10px 4px">Grigio: da generare · verde: generato, tocca per aprirlo · ambra: dati cambiati, rigenera. Rigenera crea un nuovo file (_rev1, _rev2…) senza cancellare il precedente.</p>`}
  </div>`;
}
// tasto principale nella barra (HSE, Verbale): genera / apri / aggiorna il Word
function DocBtn({ r, up, settings, k, label = 'Word' }) {
  const d = recDocs(r, settings).find(x => x.key === k); const [busy, setBusy] = useState(false);
  if (!d) return null;
  const st = fileState(r, d);
  const go = async () => {
    const L = fileRevs(r, d);
    if (st === 'green') { fileOpen(L[L.length - 1]); return; }
    if (d.tpl && !(await DB.get(d.tpl))) { toast('Carica prima il modello in Impostazioni → Modelli'); return; }
    setBusy(true); try { await fileGenerate(r, up, settings, d); } catch (err) { _progress(null); fail('Word non creato', err, recordTitle(r)); } setBusy(false);
  };
  return html`<button class=${'btn pri' + (st === 'amber' ? ' amber' : '')} disabled=${busy} onClick=${go}>${busy ? html`<div class="spin" />` : html`<${Icon} n="file" s=${20} />`}
    ${st === 'grey' ? 'Genera ' + label : st === 'green' ? 'Apri ' + label : 'Rigenera ' + label}</button>`;
}
