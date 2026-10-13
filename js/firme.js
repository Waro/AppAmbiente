/* Fogli firme: presenze, informative, consegne. Uno strumento unico, usato dentro le pratiche (DDA, Mappatura, RA)
   o come attività a sé. I testi stanno nei modelli (Impostazioni / file di configurazione); il PDF lo impagina Nembo. */

// Modelli di partenza: testi generici, senza nomi. {committente} {immobile} {indirizzo} {citta} {commessa} {data} {relatore} si compilano da soli.
const FIRME_MODELLI_BASE = [
  { id: 'informativa-amianto', titolo: 'Verbale informativa amianto', sottotitolo: 'ai sensi del DM 6 settembre 1994', per: ['ra'], manufatti: true,
    testo: 'In riferimento agli adempimenti di cui al Pt.4 del D.M. 6/9/94, si è tenuto il presente incontro allo scopo di informare le persone operanti nei locali di competenza della committente {committente}, circa la presenza di MCA (Materiali Contenenti Amianto), sui rischi che possono generare tali manufatti, sulle procedure comportamentali da adottare e sulle misure di prevenzione e protezione che devono essere utilizzate.',
    documenti: ['Informativa amianto', "Procedure di sicurezza, procedure d'emergenza e registro attività di emergenza"],
    note: "Nel corso del sopralluogo eseguito, alla luce dello stato di fatto dei manufatti presenti e della loro ubicazione, non è stato ritenuto necessario eseguire monitoraggi dell'aria." },
  { id: 'presenze', titolo: 'Presenze al sopralluogo', sottotitolo: '', per: [], testo: 'Persone presenti al sopralluogo del {data}.', documenti: [], note: '' },
  { id: 'consegna', titolo: 'Consegna documentazione', sottotitolo: '', per: [], testo: 'In data {data} sono stati consegnati i documenti elencati di seguito.', documenti: [], note: '' },
  { id: 'libero', titolo: 'Foglio firme', sottotitolo: '', per: [], testo: '', documenti: [], note: '' },
];
const firmeModelli = s => (s && Array.isArray(s.firmeModelli) && s.firmeModelli.length ? s.firmeModelli : FIRME_MODELLI_BASE);
const fmtIt = iso => iso ? iso.split('-').reverse().join('/') : '';
function firmeCtx(r) {
  return { committente: r.cliente || '', immobile: placeDoc(r) || '', indirizzo: r.indirizzo || '', citta: r.citta || '', commessa: r.commessa || '', data: fmtIt(r.data || today()) };
}
const fillTpl = (t, c) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (k in c ? c[k] : m));
function newFoglio(r, s, mod) {
  const rel = (s.prelevatoDa || `${s.tecnicoNome || ''} ${s.tecnicoCognome || ''}`).trim();
  const c = { ...firmeCtx({ ...r, data: today() }), relatore: rel };
  return { id: uid('fg'), modello: mod.id, titolo: mod.titolo, sottotitolo: fillTpl(mod.sottotitolo, c), data: today(), luogo: r.citta || '', relatore: rel, responsabile: '',
    testo: fillTpl(mod.testo, c), documenti: (mod.documenti || []).map(t => ({ t: fillTpl(t, c), ok: true })), note: fillTpl(mod.note, c),
    inclMan: !!mod.manufatti && r.type === 'ra', manSel: null, partecipanti: [], firmaRelatore: '', chiuso: null, createdAt: Date.now() };
}
const foglioFirme = f => (f.partecipanti || []).filter(p => p.firma).length;
// manufatti da riportare (solo RA): tutti o quelli scelti
function foglioManufatti(r, f) {
  if (r.type !== 'ra' || !f.inclMan) return [];
  const st = k => { const x = typeof raStato === 'function' && raStato(k); return x ? x.s : ''; };
  return (r.manufatti || []).filter(m => !f.manSel || f.manSel.includes(m.id))
    .map(m => ({ codice: m.codice, descrizione: m.descrizione, tipologia: m.tipologia, ubicazione: m.ubicazione, stato: st(m.stato), note: m.note || '' }));
}
async function foglioPdf(r, f, s) {
  return PdfGen.foglioFirmePdf({ ...f, manufatti: foglioManufatti(r, f) },
    { ente: (s || _settings).firmeEnte || '', committente: r.cliente, sito: placeDoc(r), commessa: r.commessa, codice: r.codice });
}
const foglioNome = f => ['Firme', slug(f.titolo || 'foglio').slice(0, 30), f.data || ''].filter(Boolean).join('_');

/* ---------------- sezione nelle pratiche ---------------- */
function FogliFirme({ r, up, settings }) {
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState(null);
  const fogli = r.fogli || [];
  const setF = (id, fn) => up(p => ({ ...p, fogli: (p.fogli || []).map(x => x.id === id ? (typeof fn === 'function' ? fn(x) : { ...x, ...fn }) : x) }));
  const add = mod => { const f = newFoglio(r, settings, mod); up(p => ({ ...p, fogli: [...(p.fogli || []), f] })); setOpen(f.id); };
  const del = id => { if (!confirm('Eliminare il foglio firme e le firme raccolte?')) return; setOpen(null); up(p => ({ ...p, fogli: (p.fogli || []).filter(x => x.id !== id) })); };
  const cur = fogli.find(x => x.id === open);
  return html`<div class="sec-h" id=${'firme-' + r.id}><h3>Firme</h3><span class="hint">Presenze, informative, consegne</span></div>
    ${fogli.length > 0 && html`<div class="list" style="margin-bottom:8px">${fogli.map(f => { const n = foglioFirme(f); return html`<button class="rcard fg-card" key=${f.id} onClick=${() => setOpen(f.id)}>
      <div class="r1"><span class="ttl" style="margin:0">${f.titolo || 'Foglio firme'}</span>
        <span class=${'badge ' + (f.chiuso ? 'b-ok' : n ? 'b-f2' : 'b-grey')}>${f.chiuso ? 'Chiuso' : n ? 'In corso' : 'Da firmare'}</span><span class="dt">${fmtD(f.data)}</span></div>
      <div class="sum">${n} ${n === 1 ? 'firma' : 'firme'}${f.firmaRelatore ? ' + relatore' : ''}${f.inclMan ? ' · con elenco manufatti' : ''}</div></button>`; })}</div>`}
    <button class="btn dashed" onClick=${() => setPick(true)}><${Icon} n="sign" s=${18} /> Nuovo foglio firme</button>
    ${pick && html`<${FoglioModelli} r=${r} settings=${settings} onClose=${() => setPick(false)} onPick=${m => { setPick(false); setTimeout(() => add(m), 0); }} />`}
    ${cur && html`<${FoglioSheet} r=${r} f=${cur} settings=${settings} set=${fn => setF(cur.id, fn)} onDelete=${() => del(cur.id)} onClose=${() => setOpen(null)} />`}`;
}

function FoglioModelli({ r, settings, onPick, onClose }) {
  useBackClose(onClose);
  const mods = [...firmeModelli(settings)].sort((a, b) => ((b.per || []).includes(r.type) ? 1 : 0) - ((a.per || []).includes(r.type) ? 1 : 0));
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="Nuovo foglio firme">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>Nuovo foglio firme</b><span></span></div>
    <div class="sheet-body">
      <div class="sec-h" style="margin-top:6px"><h3>Scegli il modello</h3><span class="hint">i testi restano modificabili</span></div>
      ${mods.map(m => html`<button class="opt" key=${m.id} onClick=${() => onPick(m)}>
        <span class="oi" style="background:var(--blue-soft);color:var(--blue)"><${Icon} n="sign" s=${21} /></span>
        <span class="ot"><b>${m.titolo}</b><small>${m.sottotitolo || (m.testo ? fillTpl(m.testo, firmeCtx(r)).slice(0, 90) + (m.testo.length > 90 ? '…' : '') : 'Solo nomi e firme')}</small></span></button>`)}
      <p class="hint-p">I modelli si modificano in Impostazioni → Fogli firme e viaggiano con il file di configurazione.</p>
    </div></div></div>`;
}

/* ---------------- foglio: compilazione e firme ---------------- */
function FoglioSheet({ r, f, settings, set, onDelete, onClose }) {
  useBackClose(onClose);
  const [sig, setSig] = useState(null); // { who: 'rel' | id }
  const [passa, setPassa] = useState(false);
  const [showMan, setShowMan] = useState(false);
  const ro = !!f.chiuso;
  const n = foglioFirme(f);
  const setP = (id, patch) => set(x => ({ ...x, partecipanti: x.partecipanti.map(p => p.id === id ? { ...p, ...patch } : p) }));
  const addP = () => set(x => ({ ...x, partecipanti: [...x.partecipanti, { id: uid('p'), nome: '', societa: '', ruolo: '', firma: '', ts: null }] }));
  const delP = p => { if ((p.firma || p.nome) && !confirm('Togliere ' + (p.nome || 'questa persona') + ' dal foglio?')) return; set(x => ({ ...x, partecipanti: x.partecipanti.filter(y => y.id !== p.id) })); };
  const setDoc = (i, patch) => set(x => ({ ...x, documenti: x.documenti.map((d, j) => j === i ? { ...d, ...patch } : d) }));
  const man = r.type === 'ra' ? (r.manufatti || []) : [];
  const sel = id => !f.manSel || f.manSel.includes(id);
  const toggleMan = id => set(x => { const all = man.map(m => m.id); const cur = x.manSel || all; const nx = cur.includes(id) ? cur.filter(y => y !== id) : [...cur, id]; return { ...x, manSel: nx.length === all.length ? null : nx }; });
  const chiudi = () => {
    if (!n) { toast('Serve almeno una firma'); return; }
    const vuote = f.partecipanti.filter(p => !p.firma).length;
    if (vuote && !confirm(`${vuote} ${vuote === 1 ? 'persona non ha' : 'persone non hanno'} firmato e ${vuote === 1 ? 'verrà tolta' : 'verranno tolte'}. Chiudere il foglio?`)) return;
    set(x => ({ ...x, partecipanti: x.partecipanti.filter(p => p.firma), chiuso: Date.now() }));
    toast('Foglio chiuso: le firme sono bloccate');
  };
  const riapri = () => { if (!confirm('Riaprendo il foglio le firme raccolte vengono cancellate. Continuare?')) return; set(x => ({ ...x, chiuso: null, firmaRelatore: '', partecipanti: x.partecipanti.map(p => ({ ...p, firma: '', ts: null })) })); };
  const scarica = async () => {
    const name = `${foglioNome(f)}.pdf`;
    const h = await pickSave(name, 'PDF', 'application/pdf', '.pdf'); if (h === 'cancel') return;
    try { const bytes = await foglioPdf(r, f, settings); await saveOffice(h, new Blob([bytes], { type: 'application/pdf' }), name); }
    catch (e) { fail('PDF non generato', e); }
  };
  const societa = [...new Set(f.partecipanti.map(p => p.societa).filter(Boolean))];
  const dl = 'dl-soc-' + f.id;

  if (passa) return html`<${PassaTelefono} f=${f} r=${r} societa=${societa}
    onAdd=${p => set(x => ({ ...x, partecipanti: [...x.partecipanti.filter(y => y.nome || y.firma), p] }))} onClose=${() => setPassa(false)} />`;

  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet tall" role="dialog" aria-label=${f.titolo}>
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Fine</button><b>${ro ? 'Foglio chiuso' : 'Foglio firme'}</b>
      <button class="btn link" style="justify-self:end;font-size:15px" onClick=${scarica}>PDF</button></div>
    <div class="sheet-body">
      ${ro && html`<div class="notice" style="margin-top:0">Chiuso il ${new Date(f.chiuso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}: i dati e le firme non si modificano più.</div>`}
      <div class="card tight"><div class="grid2">
        <${Inp} cls="full" label="Titolo" value=${f.titolo} disabled=${ro} set=${v => set({ titolo: v })} />
        <${Inp} cls="full" label="Sottotitolo" value=${f.sottotitolo} disabled=${ro} set=${v => set({ sottotitolo: v })} placeholder="Facoltativo" />
        <${Inp} label="Data" type="date" value=${f.data} disabled=${ro} set=${v => set({ data: v })} />
        <${Inp} label="Luogo" value=${f.luogo} disabled=${ro} set=${v => set({ luogo: v })} />
        <${Inp} label="Relatore" value=${f.relatore} disabled=${ro} set=${v => set({ relatore: v })} />
        <${Inp} label="Responsabile di commessa" value=${f.responsabile} disabled=${ro} set=${v => set({ responsabile: v })} placeholder="Facoltativo" />
      </div></div>
      <div class="sec-h"><h3>Oggetto</h3></div>
      <div class="card tight"><textarea class="inp" rows="5" disabled=${ro} value=${f.testo} onInput=${e => set({ testo: e.target.value })} aria-label="Oggetto" placeholder="Testo letto o spiegato ai presenti (facoltativo)"></textarea></div>

      <div class="sec-h"><h3>Documenti consegnati</h3><span class="hint">vanno nel PDF quelli spuntati</span></div>
      <div class="card tight">
        ${f.documenti.map((d, i) => html`<div class="fg-doc" key=${i}>
          <input type="checkbox" checked=${d.ok} disabled=${ro} onChange=${e => setDoc(i, { ok: e.target.checked })} aria-label="Consegnato" />
          <input class="inp" value=${d.t} disabled=${ro} onInput=${e => setDoc(i, { t: e.target.value })} aria-label="Documento" />
          ${!ro && html`<button class="x" aria-label="Togli documento" onClick=${() => set(x => ({ ...x, documenti: x.documenti.filter((_, j) => j !== i) }))}>×</button>`}</div>`)}
        ${!ro && html`<button class="btn link sm" onClick=${() => set(x => ({ ...x, documenti: [...x.documenti, { t: '', ok: true }] }))}>+ Aggiungi documento</button>`}
        ${!f.documenti.length && ro && html`<div class="hint-p" style="margin:0">Nessun documento</div>`}
      </div>

      ${man.length > 0 && html`<div class="sec-h"><h3>Manufatti nel PDF</h3><span class="hint">${f.inclMan ? man.filter(m => sel(m.id)).length + ' di ' + man.length : 'non inclusi'}</span></div>
        <div class="card tight">
          <label class="fg-sw"><span>Allega l'elenco dei manufatti della pratica</span><${Toggle} on=${f.inclMan} label="Allega i manufatti" set=${v => !ro && set({ inclMan: v })} /></label>
          ${f.inclMan && html`<button class="btn link sm" onClick=${() => setShowMan(!showMan)}>${showMan ? 'Nascondi' : 'Scegli quali'}</button>
            ${showMan && man.map(m => html`<label class="fg-man" key=${m.id}><input type="checkbox" checked=${sel(m.id)} disabled=${ro} onChange=${() => toggleMan(m.id)} />
              <span class="mono">${m.codice}</span><span>${[m.descrizione, m.ubicazione].filter(Boolean).join(' · ')}</span></label>`)}`}
        </div>`}

      <div class="sec-h"><h3>Persone · ${f.partecipanti.length}</h3><span class="hint">${n} ${n === 1 ? 'firma' : 'firme'}</span></div>
      ${!ro && html`<button class="btn pri block" style="margin-bottom:10px" onClick=${() => setPassa(true)}><${Icon} n="sign" s=${19} /> Passa il telefono</button>`}
      <div class="list">${f.partecipanti.map((p, i) => html`<div class="card tight fg-p" key=${p.id}>
        <div class="fg-ph"><span class="fg-n">${i + 1}</span><b>${p.nome || 'Senza nome'}</b>${!ro && html`<button class="x" aria-label="Togli persona" onClick=${() => delP(p)}>×</button>`}</div>
        ${!ro ? html`<div class="grid2">
          <${Inp} cls="full" label="Nome e cognome" value=${p.nome} set=${v => setP(p.id, { nome: v })} />
          <${Inp} label="Società / ditta" list=${dl} value=${p.societa} set=${v => setP(p.id, { societa: v })} />
          <${Inp} label="Ruolo" value=${p.ruolo} set=${v => setP(p.id, { ruolo: v })} /></div>`
        : html`<div class="sum">${[p.societa, p.ruolo].filter(Boolean).join(' · ')}</div>`}
        <button class=${'sigbox' + (p.firma ? ' has' : '')} style="margin-top:8px" disabled=${ro} onClick=${() => setSig({ who: p.id, title: 'Firma · ' + (p.nome || 'partecipante') })}>
          ${p.firma ? html`<img src=${p.firma} alt=${'Firma di ' + p.nome} />` : html`<span><${Icon} n="sign" s=${18} /> Tocca per firmare</span>`}</button>
      </div>`)}</div>
      ${!ro && html`<button class="btn dashed" onClick=${addP}>+ Aggiungi persona</button>`}
      <datalist id=${dl}>${societa.map(c => html`<option value=${c} />`)}</datalist>

      <div class="sec-h"><h3>Note</h3></div>
      <div class="card tight"><textarea class="inp" rows="3" disabled=${ro} value=${f.note} onInput=${e => set({ note: e.target.value })} aria-label="Note" placeholder="Es. monitoraggi dell'aria, osservazioni (facoltativo)"></textarea></div>

      <div class="sec-h"><h3>Firma del relatore</h3><span class="hint">${f.relatore || ''}</span></div>
      <button class=${'sigbox' + (f.firmaRelatore ? ' has' : '')} disabled=${ro} onClick=${() => setSig({ who: 'rel', title: 'Firma relatore · ' + (f.relatore || '') })}>
        ${f.firmaRelatore ? html`<img src=${f.firmaRelatore} alt="Firma del relatore" />` : html`<span><${Icon} n="sign" s=${18} /> Tocca per firmare</span>`}</button>
      ${!ro && !f.firmaRelatore && settings.firmaTecnico && html`<button class="btn sm" style="margin-top:6px" onClick=${() => set({ firmaRelatore: settings.firmaTecnico })}>Usa la firma salvata</button>`}

      <div class="stack" style="margin-top:20px">
        ${ro ? html`<button class="btn pri block" onClick=${scarica}><${Icon} n="file" s=${18} /> Scarica il PDF</button>
            <button class="btn block" onClick=${riapri}>Riapri (cancella le firme)</button>`
          : html`<button class="btn pri block" onClick=${chiudi}><${Icon} n="lock" s=${18} /> Chiudi il foglio</button>
            <button class="btn block" onClick=${scarica}><${Icon} n="file" s=${18} /> Anteprima PDF</button>`}
        <button class="btn danger block" onClick=${onDelete}><${Icon} n="trash" s=${18} /> Elimina foglio</button>
      </div>
    </div></div>
    ${sig && html`<${SignaturePadOverlay} title=${sig.title} onClose=${() => setSig(null)}
      onDone=${url => sig.who === 'rel' ? set({ firmaRelatore: url }) : setP(sig.who, { firma: url, ts: Date.now() })} />`}
  </div>`;
}

/* ---------------- passa il telefono: una persona alla volta, ognuno vede solo la propria riga ---------------- */
function PassaTelefono({ f, r, societa, onAdd, onClose }) {
  useBackClose(onClose);
  const vuoto = { nome: '', societa: '', ruolo: '', firma: '' };
  const [p, setP] = useState(vuoto);
  const [sig, setSig] = useState(false);
  const [leggi, setLeggi] = useState(false);
  const [fatti, setFatti] = useState(0);
  const nome = useRef();
  const ok = p.nome.trim() && p.firma;
  const salva = () => {
    if (!p.nome.trim()) { toast('Scrivi nome e cognome'); return; }
    if (!p.firma) { toast('Manca la firma'); return; }
    onAdd({ id: uid('p'), nome: p.nome.trim(), societa: p.societa.trim(), ruolo: p.ruolo.trim(), firma: p.firma, ts: Date.now() });
    setFatti(fatti + 1); setP({ ...vuoto, societa: p.societa }); setLeggi(false);
    setTimeout(() => nome.current && nome.current.focus(), 50);
    toast('Firma salvata: passa il telefono');
  };
  const tot = foglioFirme(f);
  return html`<div class="sheet-ov"><div class="sheet tall" role="dialog" aria-label="Raccolta firme">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Fine</button><b>Raccolta firme</b><span class="fg-cnt">${tot} ${tot === 1 ? 'firma' : 'firme'}</span></div>
    <div class="sheet-body">
      <div class="fg-hero"><div class="lt-eye">${[r.cliente, placeDoc(r)].filter(Boolean).join(' · ')}</div><b>${f.titolo}</b>${f.sottotitolo && html`<small>${f.sottotitolo}</small>`}</div>
      ${f.testo && html`<div class="card tight"><div class=${'fg-testo' + (leggi ? ' open' : '')}>${f.testo}</div>
        <button class="btn link sm" onClick=${() => setLeggi(!leggi)}>${leggi ? 'Riduci' : 'Leggi tutto'}</button></div>`}
      <div class="card tight" style="margin-top:12px">
        <label class="fld"><span>Nome e cognome</span><input ref=${nome} value=${p.nome} onInput=${e => setP({ ...p, nome: e.target.value })} autocomplete="off" /></label>
        <div class="grid2" style="margin-top:10px">
          <${Inp} label="Società / ditta" list="dl-passa" value=${p.societa} set=${v => setP({ ...p, societa: v })} />
          <${Inp} label="Ruolo" value=${p.ruolo} set=${v => setP({ ...p, ruolo: v })} />
        </div>
        <datalist id="dl-passa">${societa.map(c => html`<option value=${c} />`)}</datalist>
        <button class=${'sigbox' + (p.firma ? ' has' : '')} style="margin-top:12px;min-height:90px" onClick=${() => setSig(true)}>
          ${p.firma ? html`<img src=${p.firma} alt="Firma" />` : html`<span><${Icon} n="sign" s=${20} /> Tocca per firmare</span>`}</button>
      </div>
      <button class="btn pri block" style="margin-top:14px" disabled=${!ok} onClick=${salva}>Conferma e passa al prossimo</button>
      <p class="hint-p">${fatti ? `${fatti} ${fatti === 1 ? 'firma raccolta' : 'firme raccolte'} in questo giro. ` : ''}Chi firma vede solo i propri dati. Tocca “Fine” quando hanno firmato tutti.</p>
    </div></div>
    ${sig && html`<${SignaturePadOverlay} title=${'Firma · ' + (p.nome || '')} onClose=${() => setSig(false)} onDone=${url => setP(x => ({ ...x, firma: url }))} />`}
  </div>`;
}

/* ---------------- foglio firme come attività a sé ---------------- */
function newFirmeRec(records, s) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'firme' && (r.codice || '').startsWith('FIR-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return { id: uid('fir'), type: 'firme', codice: `FIR-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', citta: '', sito: '', indirizzo: '', data: today(), tecnico: `${s.tecnicoNome} ${s.tecnicoCognome}`.trim(), fogli: [], appunti: '' };
}
const firmeIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.fogli || []).length && !r.appunti;

function FirmeList({ records, open, activeId, acts }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'firme').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  all.forEach(r => { const c = r.cliente || 'Senza cliente'; (groups[c] = groups[c] || []).push(r); });
  return html`<div class="content">
    <${LargeTitle} top eye="Strumenti" title="Fogli firme" sub="Presenze, informative e consegne fuori da una pratica" acts=${acts} />
    ${!all.length && html`<div class="empty"><b>Nessun foglio firme</b>Tocca + e scegli “Foglio firme”. Dentro DDA, Mappature e RA c'è anche la sezione Firme.</div>`}
    ${Object.entries(groups).map(([c, rs]) => html`<div key=${c}><div class="grp-client">${c}</div><div class="list">
      ${rs.map(r => { const fg = r.fogli || [], n = fg.reduce((a, f) => a + foglioFirme(f), 0); return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
        <div class="r1"><span class="id">${r.codice}</span><span class=${'badge ' + (fg.length && fg.every(f => f.chiuso) ? 'b-ok' : n ? 'b-f2' : 'b-grey')}>${!fg.length ? 'Vuoto' : fg.every(f => f.chiuso) ? 'Chiuso' : n ? 'In corso' : 'Da firmare'}</span><span class="dt">${fmtD(r.data)}</span></div>
        ${(r.commessa || placeLabel(r)) && html`<div class="ttl">${[r.commessa, placeLabel(r)].filter(Boolean).join(' · ')}</div>`}
        <div class="sum">${fg.length ? fg.map(f => f.titolo).join(', ') : 'Nessun foglio'} · ${n} ${n === 1 ? 'firma' : 'firme'}</div>
        <${OdBadge} map=${od} r=${r} /></button>`; })}</div></div>`)}
  </div>`;
}

function FirmeForm({ rec: initial, records, settings, onSave, onDelete, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const clienti = [...new Set(records.filter(x => x.cliente).map(x => x.cliente))];
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);
  return html`<div class="content form">
    <${DetailHead} eye="Fogli firme" title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} />
      <${Inp} label="Cliente" list="dl-cli-fir" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} placeholder="Via e numero civico" />
      <${Inp} label="Sito / codice immobile" value=${r.sito} set=${v => up({ sito: v })} placeholder="Facoltativo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
    </div><datalist id="dl-cli-fir">${clienti.map(c => html`<option value=${c} />`)}</datalist></div>
    <${FogliFirme} r=${r} up=${up} settings=${settings} />
    <div class="sec-h"><h3>Appunti</h3><span class="hint">Testo libero</span></div>
    <div class="card"><textarea class="inp" rows="3" value=${r.appunti} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti"></textarea></div>
    <div class="sec-h"><h3>Archivio</h3></div>
    <div class="stack">
      <button class="btn outline block" onClick=${upload}><${Icon} n="share" s=${18} /> ${OD.account ? 'Carica su OneDrive' : 'Invia PDF a OneDrive'}</button>
      <button class="btn block" onClick=${() => exportRecords([r], settings)}><${Icon} n="archive" s=${18} /> Salva tutto in un file ZIP</button>
      <button class="btn danger block" onClick=${() => onDelete(r)}><${Icon} n="trash" s=${18} /> Elimina</button>
    </div>
  </div>`;
}

/* ---------------- impostazioni: ente e modelli ---------------- */
function FirmeSettings({ s, set }) {
  const [ed, setEd] = useState(null); // indice del modello in modifica, -1 = nuovo
  const mods = firmeModelli(s);
  const save = (i, m) => { const l = [...mods]; if (i < 0) l.push({ ...m, id: uid('mod') }); else l[i] = m; set({ firmeModelli: l }); };
  const del = i => { if (!confirm('Eliminare il modello "' + mods[i].titolo + '"?')) return; set({ firmeModelli: mods.filter((_, j) => j !== i) }); };
  return html`<div class="card">
    <label class="fld"><span>Intestazione del PDF (chi conduce)</span>
      <textarea rows="3" value=${s.firmeEnte || ''} onInput=${e => set({ firmeEnte: e.target.value })} placeholder="Ragione sociale nella prima riga, indirizzo nella seconda"></textarea></label>
    <div class="sec-h" style="margin:16px 0 6px"><h3>Modelli</h3><span class="hint">${s.firmeModelli && s.firmeModelli.length ? 'personalizzati' : 'di partenza'}</span></div>
    <div class="list">${mods.map((m, i) => html`<div class="prow" key=${m.id}><button class="t" style="background:none;border:0;text-align:left;padding:0" onClick=${() => setEd(i)}><b>${m.titolo}</b><small>${(m.testo || 'Solo nomi e firme').length > 70 ? m.testo.slice(0, 70) + '…' : (m.testo || 'Solo nomi e firme')}</small></button>
      <button class="x" aria-label="Elimina modello" onClick=${() => del(i)}>×</button></div>`)}</div>
    <div class="row" style="margin-top:10px;gap:8px">
      <button class="btn sm" onClick=${() => setEd(-1)}>+ Nuovo modello</button>
      ${s.firmeModelli && s.firmeModelli.length > 0 && html`<button class="btn sm" onClick=${() => confirm('Tornare ai modelli di partenza?') && set({ firmeModelli: [] })}>Modelli di partenza</button>`}
    </div>
    <p class="hint-p">Nei testi puoi usare {committente}, {immobile}, {indirizzo}, {citta}, {commessa}, {data}, {relatore}: si compilano da soli.</p>
    ${ed !== null && html`<${ModelloSheet} m=${ed < 0 ? { titolo: '', sottotitolo: '', testo: '', documenti: [], note: '', per: [], manufatti: false } : mods[ed]} onClose=${() => setEd(null)} onSave=${m => { save(ed, m); setEd(null); }} />`}
  </div>`;
}
function ModelloSheet({ m, onSave, onClose }) {
  useBackClose(onClose);
  const [x, setX] = useState({ ...m, docs: (m.documenti || []).join('\n') });
  const done = () => { if (!x.titolo.trim()) { toast('Serve un titolo'); return; } const { docs, ...rest } = x; onSave({ ...rest, titolo: x.titolo.trim(), documenti: docs.split('\n').map(t => t.trim()).filter(Boolean) }); };
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet tall" role="dialog" aria-label="Modello foglio firme">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>Modello</b><button class="btn link" style="justify-self:end;font-weight:600" onClick=${done}>Salva</button></div>
    <div class="sheet-body"><div class="card tight">
      <${Inp} label="Titolo" value=${x.titolo} set=${v => setX({ ...x, titolo: v })} />
      <${Inp} label="Sottotitolo" value=${x.sottotitolo} set=${v => setX({ ...x, sottotitolo: v })} placeholder="Facoltativo, es. riferimento normativo" />
      <label class="fld"><span>Oggetto</span><textarea rows="6" value=${x.testo} onInput=${e => setX({ ...x, testo: e.target.value })}></textarea></label>
      <label class="fld"><span>Documenti consegnati (uno per riga)</span><textarea rows="3" value=${x.docs} onInput=${e => setX({ ...x, docs: e.target.value })}></textarea></label>
      <label class="fld"><span>Note in fondo</span><textarea rows="3" value=${x.note} onInput=${e => setX({ ...x, note: e.target.value })}></textarea></label>
      <label class="fg-sw" style="margin-top:10px"><span>Nei sopralluoghi RA allega l'elenco dei manufatti</span><${Toggle} on=${!!x.manufatti} label="Elenco manufatti" set=${v => setX({ ...x, manufatti: v, per: v ? ['ra'] : (x.per || []).filter(t => t !== 'ra') })} /></label>
    </div></div></div></div>`;
}
