/* Verbale HSE: note con titolo, testo, foto e tag. */

function newVerbale(records, s) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'vs' && (r.codice || '').startsWith('VS-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return { id: uid('vs'), type: 'vs', codice: `VS-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', citta: '', sito: '', indirizzo: '', data: today(), tecnico: `${s.tecnicoNome} ${s.tecnicoCognome}`.trim(),
    note: [], appunti: '', fotoAppunti: [], visite: [], img: {},
    meta: { titolo: '', fondo: '', dataReport: '', redatto: `${s.tecnicoNome} ${s.tecnicoCognome}`.trim(), verificato: '', protocollo: '', procura: '', revisione: '00', presenti: '', descrArea: '' } };
}
const newNotaVs = () => ({ id: uid('n'), titolo: '', testo: '', mig: '', foto: [], tag: [] });
const verbaleIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.note || []).some(n => n.titolo || n.testo || n.foto.length) && !r.appunti && !(r.fotoAppunti || []).length;
const vsPhotos = r => r.type === 'vs' ? (r.note || []).flatMap((n, i) => (n.foto || []).map((f, k) => ({ id: f, name: `Nota_${i + 1}_${(n.titolo || 'senza_titolo').slice(0, 40)}_${k + 1}` }))) : [];

function VerbaleList({ records, open, activeId, acts }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'vs').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  all.forEach(r => { const c = r.cliente || 'Senza cliente'; (groups[c] = groups[c] || []).push(r); });
  return html`<div class="content">
    <${LargeTitle} top eye="HSE" title="Verbali HSE" sub=${`${all.length} ${all.length === 1 ? 'verbale' : 'verbali'}`} acts=${acts} />
    ${!all.length && html`<div class="empty"><b>Nessun verbale</b>Tocca + e scegli “Verbale HSE”.</div>`}
    ${Object.entries(groups).map(([c, rs]) => html`<div key=${c}><div class="grp-client">${c}</div><div class="list">
      ${rs.map(r => { const N = (r.note || []).length, tg = Object.keys(collectTags(r.note || [])); return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
        <div class="r1"><span class="id">${r.codice}</span><span class=${'badge ' + (N ? 'b-ok' : 'b-grey')}>${N ? N + (N === 1 ? ' nota' : ' note') : 'Da compilare'}</span><span class="dt">${fmtD(r.data)}</span></div>
        ${(r.commessa || placeLabel(r)) && html`<div class="ttl">${[r.commessa, placeLabel(r)].filter(Boolean).join(' · ')}</div>`}
        ${tg.length > 0 && html`<div class="sum">${tg.slice(0, 6).map(t => html`<span key=${t} style=${'color:' + tagColor(t) + ';margin-right:6px'}>#${t}</span>`)}</div>`}
        <${OdBadge} map=${od} r=${r} /></button>`; })}</div></div>`)}
  </div>`;
}

function VerbaleForm({ rec: initial, records, settings, onSave, onDelete, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [filtro, setFiltro] = useState(null);
  const [T, setT] = useSchede('vs', ['anag', 'note', 'file'], initial._new, { 'n-': 'note' });
  const clienti = nomiClienti(records);
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);
  const note = r.note || [];
  const tagsV = Object.keys(collectTags(note)).sort((a, b) => a.localeCompare(b, 'it'));
  const updN = (id, p) => up(q => ({ ...q, note: (q.note || []).map(n => n.id === id ? { ...n, ...p } : n) }));
  const addN = () => { const n = newNotaVs(); setT('note'); up(q => ({ ...q, note: [...(q.note || []), n] })); setFiltro(null); setTimeout(() => scrollToId('n-' + n.id), 80); };
  const delN = async n => { if (!confirm('Eliminare la nota' + (n.titolo ? ' «' + n.titolo + '»' : '') + '?')) return; for (const f of n.foto || []) await removeBlob(f); up(q => ({ ...q, note: q.note.filter(x => x.id !== n.id) })); };
  const move = (n, d) => up(q => { const L = q.note.slice(); const i = L.findIndex(x => x.id === n.id), j = i + d; if (j < 0 || j >= L.length) return q; [L[i], L[j]] = [L[j], L[i]]; return { ...q, note: L }; });
  const vis = note.filter(n => !filtro || (n.tag || []).includes(filtro));
  const nFoto = note.reduce((a, n) => a + (n.foto || []).length, 0);
  const m = r.meta || {};
  const setM = patch => up(q => ({ ...q, meta: { ...(q.meta || {}), ...patch } }));
  const setImg = (k, id) => up(q => ({ ...q, img: { ...(q.img || {}), [k]: id || undefined } }));
  const visite = r.visite || [];
  const setV = (i, patch) => up(q => ({ ...q, visite: (q.visite || []).map((x, j) => j === i ? { ...x, ...patch } : x) }));
  const [tplOk, setTplOk] = useState(null);
  useEffect(() => { DB.get(TEMPLATES['vs.docx'].key).then(b => setTplOk(!!b)); }, []);
  return html`<div class="content form">
    <${DetailHead} eye="Verbale HSE" title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'note', l: 'Note', n: note.length }, { k: 'file', l: 'File' }]} />
    ${T === 'anag' && html`    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Cliente" list="dl-cli-vs" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via e numero civico" />
      <${Inp} label="Nome asset / codice immobile" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="Nel piè di pagina del Word" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div><datalist id="dl-cli-vs">${clienti.map(c => html`<option value=${c} />`)}</datalist></div>
    <div class="sec-h"><h3>Dati del report</h3><span class="hint">Copertina del Word</span></div>
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Titolo del sopralluogo" value=${m.titolo} set=${v => setM({ titolo: v })} placeholder=${r.sito || 'es. Sopralluogo HSE'} />
      <${Inp} label="Fondo" value=${m.fondo} set=${v => setM({ fondo: v })} />
      <${Inp} label="Data report" value=${m.dataReport} set=${v => setM({ dataReport: v })} placeholder=${'automatica: ' + dataIT(r.data)} />
      <${Inp} label="Redatto da" value=${m.redatto} set=${v => setM({ redatto: v })} />
      <${Inp} label="Verificato da" value=${m.verificato} set=${v => setM({ verificato: v })} />
      <${Inp} label="Protocollo" value=${m.protocollo} set=${v => setM({ protocollo: v })} />
      <${Inp} label="Revisione" value=${m.revisione} set=${v => setM({ revisione: v })} placeholder="00" />
      <${Inp} cls="full" label="Procura" value=${m.procura} set=${v => setM({ procura: v })} />
    </div><div class="divider"></div><${ImgSlot} label="Foto di copertina" id=${(r.img || {}).copertina} set=${id => setImg('copertina', id)} /></div>
    <div class="sec-h"><h3>Identificazione dell'asset</h3></div>
    <div class="card"><${HsText} label="Descrizione area" rows=${3} value=${m.descrArea} set=${v => setM({ descrArea: v })} />
      <${Inp} label="Presenti al sopralluogo" value=${m.presenti} set=${v => setM({ presenti: v })} placeholder="Nomi e ruoli" />
      <div class="divider"></div><${ImgSlot} label="Inquadramento (ubicazione dell'asset)" id=${(r.img || {}).inquadramento} set=${id => setImg('inquadramento', id)} /></div>
    <div class="sec-h"><h3>Sopralluoghi precedenti</h3><span class="hint">nel Word con quello di oggi</span></div>
    <div class="card tight">${visite.map((v, i) => html`<div class="row" key=${i} style="margin-bottom:8px">
        <input class="inp" type="date" style="max-width:170px" value=${v.data} onInput=${e => setV(i, { data: e.target.value })} aria-label="Data" />
        <input class="inp" value=${v.presenti} placeholder="Presenti" onInput=${e => setV(i, { presenti: e.target.value })} />
        <button class="x" aria-label="Elimina" onClick=${() => up(q => ({ ...q, visite: q.visite.filter((_, j) => j !== i) }))}>×</button></div>`)}
      <button class="btn dashed" onClick=${() => up(q => ({ ...q, visite: [...(q.visite || []), { data: '', presenti: '' }] }))}>+ Aggiungi sopralluogo precedente</button></div>
    ${tplOk === false && html`<div class="notice">Per il Word carica il «Modello Word Verbale HSE» in Impostazioni → Modelli.</div>`}
`}
    ${T === 'note' && html`
    <div class="card-navy"><div class="sum3">
      <div><b>${note.length}</b><span>${note.length === 1 ? 'nota' : 'note'}</span></div>
      <div><b>${nFoto}</b><span>foto</span></div>
      <div><b>${tagsV.length}</b><span>tag</span></div></div></div>
    <div class="sec-h"><h3>Note · ${note.length}</h3><span class="hint">Titolo, testo, foto e tag</span></div>
    ${tagsV.length > 0 && html`<div class="vs-filter"><button class=${'tag' + (!filtro ? ' on' : ' sugg')} onClick=${() => setFiltro(null)}>Tutte</button>
      ${tagsV.map(t => html`<button key=${t} class=${'tag' + (filtro === t ? ' on' : '')} style=${tagStyle(t, filtro === t)} onClick=${() => setFiltro(filtro === t ? null : t)}>#${t}</button>`)}</div>`}
    ${!note.length && html`<div class="card"><div class="empty" style="padding:16px">Nessuna nota. Tocca “Nuova nota” per aggiungerne una.</div></div>`}
    ${vis.map(n => { const i = note.indexOf(n); return html`<div class="card vs-nota" key=${n.id} id=${'n-' + n.id}>
      <div class="vs-h"><span class="vs-n">Nota ${i + 1}</span><span class="tb-grow"></span>
        <button class="x" title="Prima" disabled=${i === 0} onClick=${() => move(n, -1)}>‹</button>
        <button class="x" title="Dopo" disabled=${i === note.length - 1} onClick=${() => move(n, 1)}>›</button>
        <button class="x" title="Elimina la nota" onClick=${() => delN(n)}><${Icon} n="trash" s=${15} /></button></div>
      <${Inp} label="Titolo" value=${n.titolo} set=${v => updN(n.id, { titolo: v })} placeholder="es. Uscita di emergenza lato nord" />
      <${HsText} label="Situazione rilevata" rows=${4} value=${n.testo} set=${v => updN(n.id, { testo: v })} />
      <${HsText} label="Attività di miglioramento" rows=${2} value=${n.mig} set=${v => updN(n.id, { mig: v })} />
      <div class="fld"><span>Foto</span></div>
      <${PhotoStrip} ids=${n.foto || []} max=${20} onAdd=${ids => updN(n.id, { foto: [...(n.foto || []), ...ids] })}
        onRemove=${async id => { await removeBlob(id); up(q => ({ ...q, note: q.note.map(x => x.id === n.id ? { ...x, foto: x.foto.filter(f => f !== id) } : x) })); }} />
      <${TagPicker} tags=${n.tag || []} set=${t => updN(n.id, { tag: t })} />
    </div>`; })}
    <button class="btn dashed block" style="margin-top:4px" onClick=${addN}>+ Nuova nota</button>
    <div class="sec-h"><h3>Appunti</h3><span class="hint">Testo libero</span></div>
    <div class="card"><textarea class="inp" rows="3" value=${r.appunti} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti"></textarea>
      <${NotePhotos} rec=${r} up=${up} /></div>
    `}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<${VsCam} onAdd=${ids => { const nn = { ...newNotaVs(), foto: ids }; setT('note'); up(q => ({ ...q, note: [...(q.note || []), nn] })); setFiltro(null); setTimeout(() => scrollToId('n-' + nn.id), 80); }} />`}
      center=${T === 'note' ? html`<button class="btn pri" onClick=${addN}><${Icon} n="plus" s=${20} w=${2.4} /> Nuova nota</button>`
        : html`<${DocBtn} r=${r} up=${up} settings=${settings} k="vs_docx" />`}
      gruppi=${[['Documenti', [{ ic: 'share', l: OD.account ? 'Carica su OneDrive' : 'Invia a OneDrive', fn: upload }]], opzArchivio({ r, settings, onDelete, elimina: 'Elimina il verbale' })]} />
  </div>`;
}

// fotocamera nella barra azioni: la foto apre una nota nuova
function VsCam({ onAdd }) {
  const inp = useRef();
  return html`<button class="btn-icon lg" aria-label="Foto in una nuova nota" title="Foto in una nuova nota" onClick=${() => camOpen(inp.current)}><${Icon} n="camera" s=${22} />
    <input ref=${inp} type="file" accept="image/*" capture="environment" hidden onClick=${e => e.stopPropagation()}
      onChange=${async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { await onAdd([await saveImage(f)]); toast('Foto aggiunta in una nuova nota'); } catch (err) { fail('Foto non salvata', err); } }} /></button>`;
}
