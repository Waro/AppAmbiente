/* Sopralluogo RA (Responsabile Amianto): checklist dei manufatti da mappatura o PMC,
   con stato di conservazione, note e fino a 3 foto per manufatto. */

// Classi del DM 06/09/1994, più due casi pratici del sopralluogo periodico
const RA_STATI = [
  { k: 'integro', l: 'Integro, non suscettibile di danneggiamento', s: 'Integro', b: 'b-ok', c: PRINT.integro, v: 'var(--ok)' },
  { k: 'suscettibile', l: 'Integro, suscettibile di danneggiamento', s: 'Suscettibile', b: 'b-f1', c: PRINT.suscettibile, v: 'var(--warn)' },
  { k: 'danneggiato', l: 'Danneggiato', s: 'Danneggiato', b: 'b-nc', c: PRINT.danneggiato, v: 'var(--danger)' },
  { k: 'nonispez', l: 'Non ispezionabile', s: 'Non ispez.', b: 'b-grey', c: PRINT.nonIspez, v: 'var(--muted)' },
  { k: 'rimosso', l: 'Rimosso o bonificato', s: 'Rimosso', b: 'b-viol', c: PRINT.rimosso, v: 'var(--t-ra)' },
];
const raStato = k => RA_STATI.find(x => x.k === k);
// anno di incarico: dal 01/04 al 31/03 dell'anno dopo
const dayBefore = iso => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() - 1); return x.toISOString().slice(0, 10); };

function newRa(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'ra' && (r.codice || '').startsWith('RA-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('ra'), type: 'ra', codice: `RA-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', citta: '', sito: '', indirizzo: '', data: today(), tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(),
    fonte: '', manufatti: [], appunti: '', planimetrie: [], incaricoDal: '', incaricoAl: '',
  };
}
const raIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.fotoAppunti || []).length && !r.manufatti.length && !r.appunti && !(r.planimetrie || []).length && !(r.fogli || []).length;
// foto da scorrere nel visualizzatore: prima quelle del sopralluogo precedente, poi le nuove
const gal = m => [...(m.fotoPrec || []), ...(m.foto || [])];
const lab = m => id => (m.fotoPrec || []).includes(id) ? 'Sopralluogo precedente' : 'Nuova foto';
const newManufatto = (x = {}) => ({ id: uid('m'), codice: '', ubicazione: '', descrizione: '', tipologia: '', quantita: '', statoPrec: '', notePrec: '', stato: '', note: '', foto: [], fotoPrec: [], ...x });

/* ---------------- import mappatura / PMC ----------------
   {
     "app": "nembo", "type": "ra-mappatura",
     "fonte": "PMC rev. 2 del 03/2025",
     "commessa": "…", "cliente": "…", "sito": "…", "indirizzo": "…",
     "firme": true,   (facoltativo: true = foglio firme pronto, false = nessuno, assente = preferenza del cliente)
     "manufatti": [
       { "codice": "M1", "ubicazione": "…", "descrizione": "…",
         "tipologia": "compatto|friabile", "quantita": "120 m²",
         "statoPrecedente": "…", "notePrecedenti": "…" }
     ]
   }
   I manufatti con un codice già presente non vengono toccati: si aggiungono solo i nuovi. */
const RA_TEMPLATE = {
  app: 'nembo', type: 'ra-mappatura', fonte: '',
  commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', incaricoDal: 'AAAA-MM-GG', incaricoAl: 'AAAA-MM-GG', firme: true,
  manufatti: [{ codice: 'M1', ubicazione: '', descrizione: '', tipologia: '', quantita: '', statoPrecedente: '', notePrecedenti: '',
    foto: ['data:image/jpeg;base64,...'] }],
};
// converte una data URI (o una stringa base64 pura, assunta JPEG) in Blob, per salvarla con saveImage
function dataUriToBlob(s) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s.trim());
  const mime = m ? m[1] : 'image/jpeg';
  const b64 = m ? m[2] : s.trim();
  const bin = atob(b64.replace(/\s/g, ''));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function importRa(text, rec) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (d.type && d.type !== 'ra-mappatura' && d.type !== 'dda-fase2') throw new Error('il file non è una mappatura/PMC né una DDA Fase 2 per il sopralluogo RA');
  // DDA Fase 2: i manufatti sono i campioni MCA non negativi e gli NC MCA, con codici, piano e ubicazione del documento
  const daF2 = d.type === 'dda-fase2';
  const ubi = x => [x.piano, x.ubicazione].map(v => (v == null ? '' : String(v)).trim()).filter(Boolean).join(' - ');
  const list = Array.isArray(d) ? d : daF2 ? [
    ...(Array.isArray(d.campioni) ? d.campioni : []).filter(c => c && String(c.matrice || '').toLowerCase() === 'mca' && String(c.esito || '').toLowerCase() !== 'negativo')
      .map(c => ({ codice: c.codice, ubicazione: ubi(c), descrizione: c.descrizione, tipologia: c.tipologia, quantita: c.quantita,
        notePrecedenti: [c.esito && 'Esito: ' + c.esito + (c.esitoDettaglio ? ' (' + c.esitoDettaglio + ')' : ''), c.note].filter(Boolean).join(' · '), foto: c.foto })),
    ...(Array.isArray(d.nc) ? d.nc : []).filter(c => c && String(c.matrice || 'mca').toLowerCase() === 'mca')
      .map(c => ({ codice: c.codice, ubicazione: ubi(c), descrizione: c.descrizione, quantita: c.quantita,
        notePrecedenti: [c.riferimento && 'Non campionato, riferito a ' + c.riferimento, c.note].filter(Boolean).join(' · '), foto: c.foto }))] : d.manufatti;
  if (!Array.isArray(list)) throw new Error('nel file manca l\'elenco "manufatti"');
  const patch = {}; let head = 0;
  if (!Array.isArray(d)) for (const k of ['fonte', 'commessa', 'cliente', 'citta', 'indirizzo', 'sito', 'incaricoDal', 'incaricoAl']) if (d[k] && !rec[k] && (!k.startsWith('incarico') || /^\d{4}-\d{2}-\d{2}$/.test(d[k]))) { patch[k] = String(d[k]); head++; }
  const known = new Set(rec.manufatti.map(m => (m.codice || '').trim().toLowerCase()).filter(Boolean));
  const add = []; let foto = 0;
  for (const x of list) {
    if (!x || typeof x !== 'object') continue;
    const codice = String(x.codice || x.id || '').trim() || 'M' + (rec.manufatti.length + add.length + 1);
    if (known.has(codice.toLowerCase())) continue;
    known.add(codice.toLowerCase());
    const s = v => (v == null ? '' : String(v));
    const ids = [];
    if (Array.isArray(x.foto)) {
      for (const ph of x.foto.slice(0, 3)) {
        if (typeof ph !== 'string' || !ph.trim()) continue;
        try { ids.push(await saveImage(dataUriToBlob(ph))); foto++; } catch (e) { /* immagine non valida: la salto */ }
      }
    }
    add.push(markImpSelf(newManufatto({ codice, ubicazione: s(x.ubicazione), descrizione: s(x.descrizione), tipologia: s(x.tipologia), quantita: s(x.quantita),
      statoPrec: s(x.statoPrecedente || x.stato), notePrec: s(x.notePrecedenti || x.note), fotoPrec: ids, fonte: (!Array.isArray(d) && d.fonte) || (daF2 ? 'DDA Fase 2' : 'mappatura o PMC') }), ['codice', 'ubicazione', 'descrizione', 'tipologia', 'quantita']));
  }
  if (add.length) patch.manufatti = [...rec.manufatti, ...add];
  if (head) { const t = markImp({ imp: rec.imp }, patch, IMP_ANAG); if (t.imp) patch.imp = t.imp; }
  const pl = Array.isArray(d) ? [] : await importPlanimetrie(d.planimetrie, rec.planimetrie || []);
  if (pl.length) patch.planimetrie = [...(rec.planimetrie || []), ...pl];
  if (!add.length && !head && !pl.length) throw new Error('nessun manufatto nuovo: i codici del file sono già tutti in elenco');
  // "firme": true nel file → foglio firme pronto (false: nessun foglio; assente: preferenza del cliente)
  if (!Array.isArray(d) && !(rec.fogli || []).length) { const x = prepFirme({ ...rec, ...patch }, _settings, typeof d.firme === 'boolean' ? d.firme : null); if (x.firme) Object.assign(patch, { firme: true, fogli: x.fogli }); }
  return { patch, nuovi: add.length, head, foto, plan: pl.length };
}

/* ---------------- manufatti da una Mappatura MCA o da una DDA Fase 2 ---------------- */
// stesso immobile: codice sito se c'è, altrimenti indirizzo (+ città)
function stessoImmobile(x, r) {
  const sito = normLuogo(r.sito), ind = normLuogo(r.indirizzo), cit = normLuogo(r.citta);
  if (!sito && !ind) return false;
  return sito && normLuogo(x.sito) ? normLuogo(x.sito) === sito : !!ind && normLuogo(x.indirizzo) === ind && (!cit || !normLuogo(x.citta) || normLuogo(x.citta) === cit);
}
// attività con campioni MCA da cui creare i manufatti: prima quelle dello stesso immobile, poi le più recenti
function raFontiCampioni(records, r) {
  return records.filter(x => !x._new && ((x.type === 'mappatura') || (x.type === 'dda' && x.fase === 2)) && ((x.campioni || {}).mca || []).length)
    .map(x => ({ x, same: stessoImmobile(x, r) })).sort((a, b) => (b.same - a.same) || (b.x.data || '').localeCompare(a.x.data || '')).map(o => o.x);
}
const fonteNome = x => (x.type === 'mappatura' ? 'Mappatura ' : 'DDA Fase 2 ') + (x.codice || '');
async function raDaCampioni(src, r) {
  const known = new Set(r.manufatti.map(m => (m.codice || '').trim().toLowerCase()).filter(Boolean));
  const add = [];
  for (const c of src.campioni.mca) {
    const codice = (c.codice || '').trim() || 'M' + (r.manufatti.length + add.length + 1);
    if (known.has(codice.toLowerCase())) continue; known.add(codice.toLowerCase());
    const fotoPrec = []; for (const f of (c.foto || []).slice(0, 3)) { const n = await dupBlob(f); if (n) fotoPrec.push(n); }
    add.push(markImpSelf(newManufatto({ codice, ubicazione: [c.piano, c.ubicazione].filter(Boolean).join(' - '), descrizione: c.descrizione || '', tipologia: c.tipo || '', quantita: c.quantita || '',
      notePrec: c.note || '', fotoPrec, fonte: fonteNome(src) }), ['codice', 'ubicazione', 'descrizione', 'tipologia', 'quantita']));
  }
  const patch = { manufatti: [...r.manufatti, ...add], fonte: r.fonte || fonteNome(src) };
  for (const k of ['commessa', 'cliente', 'citta', 'indirizzo', 'sito']) if (!r[k] && src[k]) patch[k] = src[k];
  return { patch, nuovi: add.length };
}

/* ---------------- ripresa dall'anno precedente ---------------- */
// stesso immobile: codice sito se c'è su entrambe, altrimenti indirizzo + città
const normLuogo = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function raPrecedente(records, r) {
  const sito = normLuogo(r.sito), ind = normLuogo(r.indirizzo), cit = normLuogo(r.citta);
  if (!sito && !ind) return null;
  return records.filter(x => x.type === 'ra' && x.id !== r.id && (x.manufatti || []).length && !x._new)
    .filter(x => sito && normLuogo(x.sito) ? normLuogo(x.sito) === sito : ind && normLuogo(x.indirizzo) === ind && (!cit || !normLuogo(x.citta) || normLuogo(x.citta) === cit))
    // la più recente prima della data della nuova RA; se non c'è, la più recente in assoluto
    .sort((a, b) => { const d = r.data || today(), pa = (a.data || '') <= d, pb = (b.data || '') <= d; return (pb - pa) || (b.data || '').localeCompare(a.data || '') || (b.updatedAt || 0) - (a.updatedAt || 0); })[0] || null;
}
// copia i file (foto, planimetrie) con nuovi id: eliminare un anno non tocca l'altro
async function dupBlob(id) { const b = id && await DB.getBlob(id); if (!b) return null; const nid = uid('b'); await DB.putBlob({ ...b, id: nid }); return nid; }
// patch per la nuova RA: manufatti con stato, note e foto dell'anno scorso come "precedenti"
async function raRiprendi(prev, r) {
  const map = {}; const manufatti = [];
  for (const m of prev.manufatti) {
    const st = raStato(m.stato);
    const fotoPrec = [];
    for (const f of ((m.foto || []).length ? m.foto : (m.fotoPrec || [])).slice(0, 3)) { const n = await dupBlob(f); if (n) fotoPrec.push(n); }
    const nm = markImpSelf(newManufatto({ codice: m.codice, ubicazione: m.ubicazione, descrizione: m.descrizione, tipologia: m.tipologia, quantita: m.quantita,
      statoPrec: st ? st.l : (m.statoPrec || ''), notePrec: m.note || m.notePrec || '', fotoPrec, fonte: 'RA ' + (prev.codice || 'precedente') }), ['codice', 'ubicazione', 'descrizione', 'tipologia', 'quantita']);
    map[m.id] = nm.id; manufatti.push(nm);
  }
  // monitoraggio aria: riprendo i punti (codice, piano, postazione) e la loro denominazione resta fissa, senza i prelievi dell'anno scorso
  let aria;
  if (ariaHas(prev)) {
    aria = emptyAria(true);
    for (const p of prev.aria.punti) { const np = newAriaPunto({ codice: p.codice, piano: p.piano, postazione: p.postazione, metodica: p.metodica, flusso: p.flusso, ripreso: true }); map[p.id] = np.id; aria.punti.push(np); }
  }
  const planimetrie = [];
  for (const pl of (prev.planimetrie || [])) {
    const blobId = await dupBlob(pl.blobId); if (!blobId) continue;
    const annot = JSON.parse(JSON.stringify(pl.annot || {}));
    for (const a of Object.values(annot)) a.labels = (a.labels || []).filter(l => map[l.ref]).map(l => ({ ...l, ref: map[l.ref] }));
    planimetrie.push({ id: uid('pl'), nome: pl.nome, blobId, annot });
  }
  const patch = { manufatti, planimetrie, fonte: `Ripreso da ${prev.codice} del ${fmtD(prev.data)}`, ripresoDa: prev.id, ...(aria ? { aria } : {}) };
  for (const k of ['cliente', 'citta', 'indirizzo', 'sito', 'commessa']) if (!r[k] && prev[k]) patch[k] = prev[k];
  if (!r.incaricoDal && prev.incaricoDal) patch.incaricoDal = addMonths(prev.incaricoDal, 12);
  if (!r.incaricoAl && prev.incaricoAl) patch.incaricoAl = addMonths(prev.incaricoAl, 12);
  return patch;
}

/* ---------------- elenco ---------------- */
function RaList({ records, open, create, activeId, acts }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'ra').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  all.forEach(r => { const c = r.cliente || 'Senza cliente', s = placeLabel(r); ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  return html`<div class="content">
    <${LargeTitle} top eye="Responsabile amianto" title="Sopralluoghi RA" sub="Verifica periodica dei manufatti" acts=${acts} />
    ${!all.length && html`<div class="empty"><b>Nessun sopralluogo</b>Tocca + e carica la mappatura o il PMC del sito.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">
        ${rs.map(r => {
          const tot = r.manufatti.length, fatti = r.manufatti.filter(m => m.stato).length, dann = r.manufatti.filter(m => m.stato === 'danneggiato').length;
          return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
            <div class="r1"><span class="id">${r.codice}</span>${r.drone && html`<${DroneIc} />`}
              <span class=${'badge ' + (tot && fatti === tot ? 'b-ok' : 'b-f2')}>${tot ? `${fatti}/${tot} verificati` : 'Da impostare'}</span><span class="dt">${fmtD(r.data)}</span></div>
            ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
            <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${tot} manufatti${r.fonte ? ' · ' + r.fonte : ''}</div>
            ${dann > 0 && html`<div class="due late">${dann} ${dann === 1 ? 'manufatto danneggiato' : 'manufatti danneggiati'}</div>`}
            <${OdBadge} map=${od} r=${r} />
          </button>`;
        })}</div></div>`)}</div>`)}
  </div>`;
}

/* ---------------- scheda manufatto ---------------- */
function ManufattoCard({ m, open, toggle, onUpd, onDel, conclusa }) {
  const st = raStato(m.stato);
  const set = patch => onUpd(m.id, patch);
  return html`<div class="punto" id=${'m-' + m.id}>
    <button class="punto-h" aria-expanded=${open} onClick=${toggle}>
      <span class=${'rtag' + (st ? ' tint' : '')} style=${st ? '--c:' + st.v : ''}>${m.codice || '—'}</span>
      <div class="t"><b>${m.ubicazione || 'Ubicazione da indicare'}</b><small>${m.stato && !(m.foto || []).length ? html`<span class="crit">Scatta la foto prima di uscire</span>` : m.descrizione || 'Descrizione da indicare'}</small></div>
      ${st ? html`<span class=${'badge ' + st.b}>${st.s}</span>` : html`<span class="badge st-none">${conclusa ? 'Non visionato' : 'Da verificare'}</span>`}
      <span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
    ${open && html`<div class="punto-b">
      <div class="grid2">
        <${Inp} label="Codice" value=${m.codice} set=${v => set({ codice: v })} imp=${impOf(m, 'codice')} />
        <${Inp} label="Tipologia" value=${m.tipologia} set=${v => set({ tipologia: v })} placeholder="compatto, friabile…" imp=${impOf(m, 'tipologia')} />
        <${InpGrow} cls="full" label="Ubicazione" value=${m.ubicazione} set=${v => set({ ubicazione: v })} imp=${impOf(m, 'ubicazione')} />
        <${Area} cls="full" label="Descrizione" rows=${2} value=${m.descrizione} set=${v => set({ descrizione: v })} imp=${impOf(m, 'descrizione')} />
        ${m.quantita && html`<${Inp} label="Quantità" value=${m.quantita} set=${v => set({ quantita: v })} imp=${impOf(m, 'quantita')} />`}
        ${m.fonte && html`<div class="lock full" style="margin-top:-4px"><${Icon} n="lock" s=${12} /> Dati da ${m.fonte}</div>`}
      </div>
      ${(m.statoPrec || m.notePrec || m.fotoPrec?.length > 0) && html`<div class="prev-box">
        ${(m.statoPrec || m.notePrec) && html`<div><b>Sopralluogo precedente:</b> ${[m.statoPrec, m.notePrec].filter(Boolean).join(' · ')}</div>`}
        ${m.fotoPrec?.length > 0 && html`<div style="margin-top:${(m.statoPrec || m.notePrec) ? '8px' : '0'}">
          <${PhotoStrip} ids=${m.fotoPrec} readonly gallery=${gal(m)} labelOf=${lab(m)} /></div>`}</div>`}
      <div class="fld"><span>Stato di conservazione</span></div>
      <div class="stati">${RA_STATI.map(s => html`<button class=${m.stato === s.k ? 'on' : ''} style=${'--sc:' + s.v} title=${s.l} onClick=${() => set({ stato: m.stato === s.k ? '' : s.k })}>${s.l}</button>`)}</div>
      <${Area} label="Note" rows=${3} value=${m.note} set=${v => set({ note: v })} placeholder="Condizioni rilevate, interventi consigliati…" />
      <div><div class="fld"><span>Foto (fino a 3)</span></div>
        <${PhotoStrip} ids=${m.foto} max=${3} gallery=${gal(m)} labelOf=${lab(m)} onAdd=${ids => set({ foto: [...m.foto, ...ids] })} onRemove=${async id => { await removeBlob(id); set({ foto: m.foto.filter(f => f !== id) }); }} /></div>
      <button class="btn sm danger" style="justify-self:start" onClick=${() => onDel(m)}>Elimina manufatto</button>
    </div>`}
  </div>`;
}

/* ---------------- form ---------------- */
function RaForm({ rec: initial, records, settings, onSave, onDelete, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [openM, setOpenM] = useState({});
  const [f, setF] = useState('tutti');
  useEffect(() => { const h = () => setF('tutti'); addEventListener('nembo-goto', h); return () => removeEventListener('nembo-goto', h); }, []);
  const imp = useRef();
  const firmeOn = !!r.firme || (r.fogli || []).length > 0;
  const [T, setT] = useSchede('ra', firmeOn ? ['anag', 'man', 'firme', 'file'] : ['anag', 'man', 'file'], initial._new, { 'm-': 'man', 's-': 'man', 'plan-': 'man' });

  const clienti = nomiClienti(records);
  const updM = (id, patch) => up(p => ({ ...p, manufatti: p.manufatti.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addM = () => { const m = newManufatto({ codice: 'M' + (r.manufatti.length + 1) }); up(p => ({ ...p, manufatti: [...p.manufatti, m] })); setOpenM({ [m.id]: true }); setF('tutti'); setTimeout(() => scrollToId('m-' + m.id), 80); };
  const delM = async m => {
    if (!confirm('Eliminare il manufatto ' + (m.codice || '') + '?')) return;
    for (const b of blobIds(m)) await removeBlob(b);
    up(p => ({ ...p, manufatti: p.manufatti.filter(x => x.id !== m.id) }));
  };
  const doImport = e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const { patch, nuovi, head, foto, plan } = await importRa(rd.result, r);
        up(patch);
        toast(`Importati ${nuovi} manufatti${foto ? ' con ' + foto + ' foto' : ''}${plan ? ', ' + plan + (plan === 1 ? ' planimetria' : ' planimetrie') : ''}${head ? ' e ' + head + ' dati del sito' : ''}`);
      } catch (err) { fail('Import non riuscito', err); }
    };
    rd.readAsText(file);
  };

  const prec = r.manufatti.length ? null : raPrecedente(records, r);
  const [riprendo, setRiprendo] = useState(false);
  const riprendi = async () => {
    setRiprendo(true);
    try { const p = await raRiprendi(prec, r); up(x => ({ ...x, ...p })); toast(`${p.manufatti.length === 1 ? 'Ripreso 1 manufatto' : 'Ripresi ' + p.manufatti.length + ' manufatti'} da ${prec.codice}`); }
    catch (e) { fail('Ripresa non riuscita', e); }
    setRiprendo(false);
  };
  const fonti = raFontiCampioni(records, r);
  const [fonteSel, setFonteSel] = useState('');
  const daCampioni = async src => {
    if (!src) return; setRiprendo(true);
    try { const { patch, nuovi } = await raDaCampioni(src, r); up(x => ({ ...x, ...patch })); toast(nuovi ? `${nuovi === 1 ? 'Creato 1 manufatto' : 'Creati ' + nuovi + ' manufatti'} da ${fonteNome(src)}` : 'Nessun manufatto nuovo: i codici sono già in elenco'); }
    catch (e) { fail('Manufatti non creati', e); }
    setRiprendo(false); setFonteSel('');
  };
  const tot = r.manufatti.length, fatti = r.manufatti.filter(m => m.stato).length;
  const list = r.manufatti.filter(m => f === 'tutti' || (f === 'da' ? !m.stato : !!m.stato));
  const dann = r.manufatti.filter(m => m.stato === 'danneggiato').length;
  const noFoto = r.manufatti.filter(m => m.stato && !(m.foto || []).length).length;
  const scad = r.incaricoAl; const gScad = scad ? daysBetween(today(), scad) : null;
  const nextM = () => {
    const m = r.manufatti.find(x => !x.stato); if (!m) return;
    setF('tutti'); setOpenM({ [m.id]: true }); setTimeout(() => scrollToId('m-' + m.id), 80);
  };
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);
  const labels = [...r.manufatti.map(m => { const st = raStato(m.stato); return { ref: m.id, text: m.codice || 'M', color: st ? st.c : PRINT.nc }; }), ...ariaLabels(r)];

  return html`<div class="content form">
    <${DetailHead} conclusa=${r.conclusa} eye="Sopralluogo RA" title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'man', l: 'Manufatti', n: tot }, firmeOn && { k: 'firme', l: 'Firme', n: (r.fogli || []).length }, { k: 'file', l: 'File' }].filter(Boolean)} />
    ${T === 'anag' && html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Cliente" req list="dl-cli-ra" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via e numero civico" />
      <${Inp} label="Sito / codice immobile" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="Facoltativo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} drone=${r.drone} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
      <${Inp} label="Incarico RA dal" type="date" value=${r.incaricoDal || ''} set=${v => up({ incaricoDal: v, ...(v && !r.incaricoAl ? { incaricoAl: dayBefore(addMonths(v, 12)) } : {}) })} imp=${impOf(r, 'incaricoDal')} />
      <${Inp} label="Incarico RA al" type="date" value=${r.incaricoAl || ''} set=${v => up({ incaricoAl: v })} imp=${impOf(r, 'incaricoAl')} />
      ${r.fonte && html`<${Inp} cls="full" label="Fonte dei dati" value=${r.fonte} set=${v => up({ fonte: v })} />`}
    </div><datalist id="dl-cli-ra">${clienti.map(c => html`<option value=${c} />`)}</datalist></div>
    `}
    ${T === 'man' && html`
    <div class="card-navy">
      <div class="sum3">
        <div><b>${fatti}<small>/${tot}</small></b><span>verificati</span></div>
        <div><b class=${dann ? 'crit' : ''}>${dann}</b><span>danneggiati</span></div>
        <div><b class=${noFoto ? 'crit' : ''}>${noFoto}</b><span>senza foto</span></div></div>
      ${scad && html`<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14);font-size:var(--fs-md)" class="nv2">
        Verifica entro <b style="color:var(--on-dark)">${fmtD(scad)}</b> · <span class=${gScad <= 30 && fatti < tot ? 'crit' : ''}>${gScad < 0 ? 'scaduta da ' + -gScad + ' gg' : gScad === 0 ? 'oggi' : 'tra ' + gScad + ' gg'}</span> (fine anno di incarico)</div>`}
    </div>

    ${!r.manufatti.length && prec && html`<div class="card tight alert-soft" style="margin-top:12px">
      <b style="font-weight:600">Stesso immobile di ${prec.codice} (${fmtD(prec.data)})</b>
      <p class="lead" style="margin:4px 0 10px">Riprendi ${prec.manufatti.length === 1 ? 'il manufatto' : 'i ' + prec.manufatti.length + ' manufatti'} con stato, note e foto dell'anno scorso come riferimento${(prec.planimetrie || []).length ? ', più le planimetrie' : ''}.</p>
      <button class="btn pri block" disabled=${riprendo} onClick=${riprendi}>${riprendo ? html`<div class="spin" />` : ''} Riprendi dall'anno precedente</button></div>`}
    ${!r.manufatti.length && !prec && fonti[0] && stessoImmobile(fonti[0], r) && html`<div class="card tight alert-soft" style="margin-top:12px">
      <b style="font-weight:600">Stesso immobile di ${fonteNome(fonti[0])} (${fmtD(fonti[0].data)})</b>
      <p class="lead" style="margin:4px 0 10px">Crea i manufatti dai ${fonti[0].campioni.mca.length === 1 ? 'campione' : fonti[0].campioni.mca.length + ' campioni'} MCA, con descrizione, ubicazione, quantità e foto come riferimento.</p>
      <button class="btn pri block" disabled=${riprendo} onClick=${() => daCampioni(fonti[0])}>${riprendo ? html`<div class="spin" />` : ''} Crea i manufatti</button></div>`}
    ${!tot && html`<div class="card tight"><p class="lead" style="margin:2px 0">Per creare i manufatti da un PMC o da una mappatura in JSON, o dai campioni MCA di un'altra attività, tocca <b>⋯ Opzioni</b> in basso.</p></div>`}

    <div class="sec-h"><h3>Manufatti · ${tot}</h3><span class="hint">${fatti} di ${tot} verificati</span></div>
    ${tot > 0 && html`<div class="track" style="margin:0 2px 12px"><i style=${'background:var(--ok);width:' + Math.round(fatti / tot * 100) + '%'}></i></div>
      <div class="pills">${[['tutti', 'Tutti', tot], ['da', r.conclusa ? 'Non visionati' : 'Da verificare', tot - fatti], ['fatti', 'Verificati', fatti]].map(([k, l, n]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${n}</span></button>`)}
        ${fatti < tot && !r.conclusa && html`<button class="pill nx" onClick=${nextM}>Prossimo da verificare ›</button>`}</div>`}
    ${list.map(m => html`<${ManufattoCard} key=${m.id} m=${m} open=${!!openM[m.id]} toggle=${() => setOpenM({ ...openM, [m.id]: !openM[m.id] })} onUpd=${updM} onDel=${delM} conclusa=${!!r.conclusa} />`)}
    ${f === 'da' && tot > 0 && !list.length && html`<div class="empty" style="padding:20px"><b>Tutti verificati</b>Controlla le note e carica tutto su OneDrive.</div>`}
    <button class="btn dashed" onClick=${addM}>+ Aggiungi manufatto</button>

    <${AriaInRa} r=${r} up=${up} settings=${settings} />

    <div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3><span class="hint">Etichette colorate per stato</span></div>
    <div class="card"><${PlanList} items=${r.planimetrie || []} labels=${labels}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>

    <div class="sec-h"><h3>Appunti</h3><span class="hint">Testo libero</span></div>
    <div class="card"><textarea class="inp" rows="4" placeholder="Note generali del sopralluogo" value=${r.appunti} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti"></textarea>
      <${NotePhotos} rec=${r} up=${up} /></div>

    `}
    ${T === 'firme' && html`<${FogliFirme} r=${r} up=${up} settings=${settings} />`}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    <input ref=${imp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${doImport} />
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { setT('man'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[['Manufatti', [
        prec && { ic: 'clock', l: 'Riprendi dall’anno precedente', s: prec.codice + ' · ' + fmtD(prec.data), fn: riprendi },
        { ic: 'file', l: 'Carica file JSON', s: 'Mappatura, PMC o DDA Fase 2: si aggiungono solo i codici nuovi', fn: () => imp.current.click() },
        { ic: 'paper', l: 'Scarica il modello JSON', fn: () => downloadBlob(new Blob([JSON.stringify(RA_TEMPLATE, null, 1)], { type: 'application/json' }), 'Nembo_modello_RA.json') },
        ...fonti.slice(0, 4).map(x => ({ ic: 'pin', l: 'Manufatti dai campioni MCA di ' + fonteNome(x), s: [x.cliente, placeLabel(x), x.campioni.mca.length + ' MCA'].filter(Boolean).join(' · '), fn: () => { setT('man'); daCampioni(x); } }))]],
        opzArchivio({ r, settings, onDelete, up, elimina: 'Elimina il sopralluogo', firme: !firmeOn && (() => { up(q => prepFirme({ ...q }, settings, true)); setT('firme'); }) })]} />
  </div>`;
}
