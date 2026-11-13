/* Modulo Ambiente · DDA (Fase 1 sopralluogo, Fase 2 campionamento). Campioni e NC, condivisi con la Mappatura, in js/campioni.js. */

const DDA_CHECK = [
  ['serbatoi', 'Serbatoi interrati o fuori terra'], ['rifiuti', 'Stoccaggio rifiuti'], ['scarichi', 'Scarichi, pozzetti e caditoie'],
  ['mca', 'Materiali contenenti amianto'], ['pcb', 'Trasformatori / PCB'], ['macchie', 'Macchie o sversamenti visibili'],
  ['vegetazione', 'Vegetazione stressata'], ['riporti', 'Riporti o terreni di riempimento'], ['pozzi', 'Pozzi o piezometri esistenti'],
];
const CHECK_ST = { presente: ['Presente', 'st-pres'], assente: ['Assente', 'st-ass'], nv: ['Non verificabile', 'st-nv'] };
const CSC = [
  { p: 'Idrocarburi C>12', u: 'mg/kg', A: 50, B: 750, m: 'terreni' },
  { p: 'Piombo', u: 'mg/kg', A: 100, B: 1000, m: 'terreni' },
  { p: 'Arsenico', u: 'mg/kg', A: 20, B: 50, m: 'terreni' },
  { p: 'Toluene', u: 'mg/kg', A: 0.5, B: 50, m: 'terreni' },
  { p: 'Tetracloroetilene', u: 'µg/L', A: 1.1, B: 1.1, m: 'acque' },
  { p: 'Idrocarburi totali', u: 'µg/L', A: 350, B: 350, m: 'acque' },
];


/* ---------------- import da JSON: Fase 1 e Fase 2 ----------------
   Fase 1 ("type": "dda-fase1", tutti i campi opzionali):
     commessa, cliente, citta, indirizzo, sito, usoAttuale, usoStorico,
     check { serbatoi: "presente|assente|nv", … chiavi in DDA_CHECK }, checkNote { … },
     recs [ { nome, descrizione } ], interviste, appunti, planimetrie [ … ]
   Fase 2 ("type": "dda-fase2"), base per le integrazioni:
     fonte, commessa, cliente, citta, indirizzo, sito, appunti,
     campioni [ { codice, matrice: terreni|acque|mca|fav|altro, piano, ubicazione, descrizione, tipologia, quantita, data, esito: positivo|negativo|"", esitoDettaglio, note, foto [] } ],
     nc [ { codice, matrice: mca|fav, piano, ubicazione, descrizione, quantita, riferimento, note, foto [] } ],
     planimetrie [ { nome, piano, didascalia, origine: "storica", fonte, formato, dati } ]
   I campioni della Fase 2 vanno in "Indagine precedente": sono di riferimento e non entrano nella scheda per il laboratorio.
   Compila solo i campi vuoti del record corrente: non sovrascrive mai un dato già inserito. */
const DDA1_TEMPLATE = {
  app: 'nembo', type: 'dda-fase1',
  commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', usoAttuale: '', usoStorico: '',
  check: Object.fromEntries(DDA_CHECK.map(([k]) => [k, ''])), checkNote: {}, recs: [{ nome: 'REC-1', descrizione: '' }],
  interviste: '', appunti: '',
  planimetrie: [{ nome: '', piano: '', didascalia: '', origine: 'storica', fonte: '', formato: 'jpeg', dati: '' }],
};
const DDA2_TEMPLATE = {
  app: 'nembo', type: 'dda-fase2', fonte: '', numerazione: 'prosegui',
  commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', appunti: '',
  campioni: [{ codice: 'A1', matrice: 'mca', piano: '', ubicazione: '', descrizione: '', tipologia: '', quantita: '', data: '', esito: '', esitoDettaglio: '', note: '', foto: [] }],
  nc: [{ codice: 'NC1', matrice: 'mca', piano: '', ubicazione: '', descrizione: '', quantita: '', riferimento: 'A1', note: '', foto: [] }],
  planimetrie: [{ nome: '', piano: '', didascalia: '', origine: 'storica', fonte: '', formato: 'jpeg', dati: '' }],
};
async function importDda(json, rec) {
  let data;
  try { data = JSON.parse(json); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (data.type && data.type !== 'dda-fase1' && data.type !== 'dda-fase2') throw new Error('il file non è un\'importazione DDA Fase 1 o Fase 2');
  const patch = {}; let n = 0;
  const str = k => { if (data[k] && !rec[k]) { patch[k] = String(data[k]); n++; } };
  ['commessa', 'cliente', 'citta', 'indirizzo', 'sito'].forEach(str);
  { const t = markImp({ imp: rec.imp }, patch, IMP_ANAG); if (t.imp) patch.imp = t.imp; }
  let camp = 0, nc = 0;
  if (data.type === 'dda-fase2') {
    if (data.appunti && !rec.appunti2) { patch.appunti2 = String(data.appunti); n++; }
    if (rec.fase !== 2) patch.fase = 2;
    const x = await importPrecedente(data, rec, MATS);
    Object.assign(patch, x.patch); camp = x.camp; nc = x.nc; n += camp + nc;
  } else {
    ['usoAttuale', 'usoStorico', 'interviste', 'appunti'].forEach(str);
    if (data.check && typeof data.check === 'object') {
      const valid = new Set(['presente', 'assente', 'nv']); const chk = { ...rec.check }; const nt = { ...rec.checkNote };
      for (const [k, v] of Object.entries(data.check)) {
        if (!DDA_CHECK.some(([kk]) => kk === k) || chk[k]) continue;
        if (valid.has(v)) { chk[k] = v; n++; }
      }
      if (data.checkNote) for (const [k, v] of Object.entries(data.checkNote)) if (!nt[k] && v) { nt[k] = String(v); n++; }
      patch.check = chk; patch.checkNote = nt;
    }
    if (Array.isArray(data.recs) && data.recs.length && !rec.recs.length) {
      patch.recs = data.recs.filter(x => x && (x.nome || x.descrizione)).map((x, i) => ({ id: uid('rec'), nome: x.nome || 'REC-' + (i + 1), descrizione: x.descrizione || '', foto: [], lat: null, lon: null }));
      n += patch.recs.length;
    }
  }
  const pl = await importPlanimetrie(data.planimetrie, rec.planimetrie || []);
  if (pl.length) patch.planimetrie = [...(rec.planimetrie || []), ...pl];
  if (!n && !pl.length && !patch.numerazione) throw new Error('nessun campo nuovo da importare (i campi già compilati non vengono toccati)');
  const msg = [n - camp - nc > 0 && `${n - camp - nc} campi`, camp && `${camp} campioni precedenti`, nc && `${nc} NC`, pl.length && `${pl.length} ${pl.length === 1 ? 'planimetria' : 'planimetrie'}`].filter(Boolean).join(', ');
  return { patch, n, msg: 'Importati ' + msg };
}
function downloadDda1Template() {
  downloadBlob(new Blob([JSON.stringify(DDA1_TEMPLATE, null, 1)], { type: 'application/json' }), 'Nembo_modello_Fase1.json');
}
function downloadDda2Template() {
  downloadBlob(new Blob([JSON.stringify(DDA2_TEMPLATE, null, 1)], { type: 'application/json' }), 'Nembo_modello_Fase2.json');
}

function newDda(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'dda' && (r.codice || '').startsWith('DDA-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('dda'), type: 'dda', codice: `DDA-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', data: today(), tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(), fase: 1,
    usoAttuale: '', usoStorico: '', check: {}, checkNote: {}, recs: [], interviste: '', documenti: [], appunti: '', appunti2: '', planimetrie: [],
    campioni: emptyCampioni(), congelati: {}, schede: {}, risultati: [], colonna: 'B', checklist: [],
  };
}
const ddaIsEmpty = r => senzaAllegati(r) && !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.fotoAppunti || []).length && !(r.fotoAppunti2 || []).length && !r.recs.length && !Object.keys(r.check).length && !MATS.some(m => r.campioni[m.k].length) && !r.usoAttuale && !r.interviste && !r.appunti && !r.appunti2 && !(r.checklist && r.checklist.length) && !(r.planimetrie && r.planimetrie.length) && !(r.fogli || []).length && !ncOf(r).length;
const allCamp = r => MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, k: m.k })));

function superamenti(r) {
  return (r.risultati || []).filter(x => {
    const p = CSC.find(c => c.p === x.parametro); const v = num(x.valore);
    return p && v != null && v > p[r.colonna || 'B'];
  });
}

/* ---------------- elenco ---------------- */
function DdaList({ records, open, create, activeId, acts }) {
  const od = useOdSynced();
  const [f, setF] = useState('tutte');
  const all = records.filter(r => r.type === 'dda');
  const list = all.filter(r => f === 'tutte' || String(r.fase) === f).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  list.forEach(r => { const c = r.cliente || 'Senza cliente', s = placeLabel(r); ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  const card = r => {
    let sum, lines = [];
    if (r.fase === 1) {
      sum = `${r.recs.length} ${r.recs.length === 1 ? 'area' : 'aree'} REC · ${r.documenti.length} documenti`;
      lines = r.recs.slice(0, 3).map(x => html`<div class="l"><span class="dot" style="background:var(--rec)"></span><span><b>${x.nome}</b>${x.descrizione ? ': ' + x.descrizione : ''}</span></div>`);
    } else {
      const cs = allCamp(r);
      const byM = MATS.filter(m => r.campioni[m.k].length).map(m => r.campioni[m.k].length + ' ' + m.l).join(', ');
      sum = `${cs.length} campioni${byM ? ' (' + byM + ')' : ''}`;
      lines = cs.filter(c => ['mca', 'fav', 'altro'].includes(c.k)).slice(0, 3).map(c => {
        const m = MATS.find(x => x.k === c.k);
        return html`<div class="l"><span class="dot" style=${'background:' + m.c}></span><span><b>${c.codice || '—'}</b> ${c.tipo ? c.tipo + ' · ' : ''}${c.descrizione}</span></div>`;
      });
      superamenti(r).slice(0, 3).forEach(x => {
        const p = CSC.find(c => c.p === x.parametro);
        lines.push(html`<div class="l" style="color:var(--danger)"><span class="dot" style="background:var(--danger)"></span><span>${x.campione} · ${x.parametro}: ${x.valore} ${p.u} (CSC ${p[r.colonna || 'B']})</span></div>`);
      });
      const sch = Object.entries(r.schede || {}).map(([k, t]) => k.toUpperCase() + ' ' + new Date(t).toLocaleDateString('it-IT'));
      if (sch.length) lines.push(html`<div class="l" style="color:var(--ok)"><span class="dot" style="background:var(--ok)"></span><span>Scheda campioni: ${sch.join(', ')}</span></div>`);
    }
    return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r) + selCls(r)} key=${r.id} ...${selRow(r, () => open(r.id))}>${selCk(r)}
      <div class="r1"><span class="id">${r.codice}</span>${r.drone && html`<${DroneIc} />`}<span class=${'badge ' + (r.fase === 1 ? 'b-f1' : 'b-f2')}>Fase ${r.fase}</span><span class="dt">${fmtD(r.data)}</span></div>
      ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
      <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${sum}</div>${lines}<${OdBadge} map=${od} r=${r} /></button>`;
  };
  const cnt = k => all.filter(r => k === 'tutte' || String(r.fase) === k).length;
  return html`<div class="content">
    <${LargeTitle} top eye="Ambiente" title="DDA" sub=${`${all.length} ${all.length === 1 ? 'indagine' : 'indagini'}`} acts=${acts} />
    <div class="pills">${[['tutte', 'Tutte'], ['1', 'Fase 1'], ['2', 'Fase 2']].map(([k, l]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${cnt(k)}</span></button>`)}</div>
    ${!list.length && html`<div class="empty"><b>Nessuna indagine</b>Tocca + per aprire il primo sopralluogo o campionamento.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">${rs.map(card)}</div></div>`)}</div>`)}
  </div>`;
}

/* ---------------- form ---------------- */
function DdaForm({ rec: initial, records, settings, onSave, onDelete, onSettings, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [openC, setOpenC] = useState({});
  const [tab, setTab] = useState(() => (MATS.find(m => initial.campioni[m.k].length) || MATS[0]).k);
  const [openS, setOpenS] = useState({});
  const firmeOn = !!r.firme || (r.fogli || []).length > 0;
  const [T, setT] = useSchede('dda', firmeOn ? ['anag', 'sop', 'camp', 'firme', 'file'] : ['anag', 'sop', 'camp', 'file'], initial._new, { 's-': 'camp', 'rec-': 'sop' });
  // dalla ricerca: apre la matrice del campione trovato
  useEffect(() => { const h = e => { const c = allCamp(r).find(x => 's-' + x.id === e.detail); if (c) setTab(c.k); }; addEventListener('nembo-goto', h); return () => removeEventListener('nembo-goto', h); }, [r]);
  const importInp = useRef();
  // tasto Planimetria della scheda Campioni: apre la pianta del piano dell'ultimo campione, senza aggiungere campioni
  const [planReq, setPlanReq] = useState(null);
  const [riep, setRiep] = useState(false);
  const apriPlan = (list, ref) => { if (!(r.planimetrie || []).length) { scrollToId('plan-' + r.id); toast('Carica prima una planimetria'); return; }
    const u = (list || [])[(list || []).length - 1]; setPlanReq({ n: Date.now(), piano: u ? u.piano : '', ref: ref || null }); };
  const planLabels = [
    ...r.recs.map(x => ({ ref: x.id, text: x.nome || 'REC', color: PRINT.rec })),
    ...campPlanLabels(r, MATS),
  ];
  const plans = r.planimetrie || [];
  const planSection = html`<div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3></div>
    <div class="card"><${PlanList} items=${plans} labels=${planLabels} apri=${planReq}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>`;
  const clienti = nomiClienti(records);
  const siti = [...new Set(records.filter(x => x.sito && (!r.cliente || x.cliente === r.cliente)).map(x => x.sito))];

  const setCheck = (k, v) => up(p => ({ ...p, check: { ...p.check, [k]: p.check[k] === v ? undefined : v } }));
  const setNote = (k, v) => up(p => ({ ...p, checkNote: { ...p.checkNote, [k]: v } }));
  const updRec = (id, patch) => up(p => ({ ...p, recs: p.recs.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addRec = () => { const id = uid('rec'); up(p => ({ ...p, recs: [...p.recs, { id, nome: 'REC-' + (p.recs.length + 1), descrizione: '', foto: [], lat: null, lon: null }] })); setTimeout(() => scrollToId('rec-' + id), 80); };
  const delRec = async x => { if (!confirm('Eliminare ' + x.nome + '?')) return; for (const b of blobIds(x)) await removeBlob(b); up(p => ({ ...p, recs: p.recs.filter(y => y.id !== x.id) })); };

  const mat = MATS.find(m => m.k === tab);
  const camp = r.campioni[tab] || [];
  const renum = (k, list) => renumCamp(r, MATS.find(x => x.k === k), list);
  const nextCode = k => nextCampCode(r, MATS.find(x => x.k === k));
  const setCamp = (k, fn) => up(p => ({ ...p, campioni: { ...p.campioni, [k]: fn(p.campioni[k]) } }));
  const updCamp = (id, patch) => setCamp(tab, l => l.map(c => c.id === id ? { ...c, ...patch } : c));
  const lastPiano = () => { const l = r.campioni[tab] || []; return l.length ? l[l.length - 1].piano || '' : ''; };
  const addCamp = () => { const id = uid('c'); setCamp(tab, l => [...l, { id, codice: nextCode(tab), descrizione: '', tipo: '', quantita: '', piano: lastPiano(), ubicazione: '', data: today(), foto: [] }]); setOpenS({ [id]: true }); setTimeout(() => scrollToId('s-' + id), 80); };
  const delCamp = async c => {
    if (!confirm('Eliminare il campione ' + (c.codice || '') + '?')) return;
    for (const b of blobIds(c)) await removeBlob(b);
    setCamp(tab, l => renum(tab, l.filter(x => x.id !== c.id)));
  };

  // checklist Fase 2: punti previsti da campionare, spuntati man mano che si preleva
  const addCk = (patch = {}) => up(p => ({ ...p, checklist: [...(p.checklist || []), { id: uid('ck'), matrice: 'mca', descrizione: '', ubicazione: '', fatto: false, ...patch }] }));
  const updCk = (id, patch) => up(p => ({ ...p, checklist: (p.checklist || []).map(x => x.id === id ? { ...x, ...patch } : x) }));
  const delCk = id => up(p => ({ ...p, checklist: (p.checklist || []).filter(x => x.id !== id) }));
  const ckFromRecs = () => {
    const nuovi = r.recs.filter(x => !(r.checklist || []).some(c => c.daRec === x.id)).map(x => ({ id: uid('ck'), matrice: 'mca', descrizione: x.descrizione || x.nome, ubicazione: '', fatto: false, daRec: x.id }));
    if (!nuovi.length) { toast('Nessuna area REC nuova da riprendere'); return; }
    up(p => ({ ...p, checklist: [...(p.checklist || []), ...nuovi] }));
  };
  const preleva = it => {
    setTab(it.matrice); addCamp2(it.matrice, it.descrizione, it.ubicazione);
    updCk(it.id, { fatto: true });
  };
  const addCamp2 = (k, descrizione, ubicazione) => { const id = uid('c'); setCamp(k, l => [...l, { id, codice: nextCode2(k), descrizione, piano: '', ubicazione: ubicazione || '', tipo: '', quantita: '', data: today(), foto: [] }]); setOpenS({ [id]: true }); };
  const nextCode2 = nextCode;

  const doImport1 = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      importDda(rd.result, r).then(({ patch, msg }) => { up(patch); toast(msg); }).catch(err => fail('Import non riuscito', err));
    };
    rd.readAsText(f);
  };

  const risCamp = allCamp(r).filter(c => (c.k === 'terreni' || c.k === 'acque') && c.codice);
  const addRis = () => up(p => ({ ...p, risultati: [...(p.risultati || []), { id: uid('x'), campione: risCamp[0] ? risCamp[0].codice : '', parametro: CSC[0].p, valore: '' }] }));
  const updRis = (id, patch) => up(p => ({ ...p, risultati: p.risultati.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const sup = superamenti(r);

  return html`<div class="content form">
    <${DetailHead} conclusa=${r.conclusa} eye=${'DDA · Fase ' + r.fase} title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'sop', l: 'Sopralluogo', n: r.recs.length }, { k: 'camp', l: 'Campioni', n: allCamp(r).length }, firmeOn && { k: 'firme', l: 'Firme', n: (r.fogli || []).length }, { k: 'file', l: 'File' }].filter(Boolean)} />
    ${T === 'anag' && html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" placeholder="es. 000/26" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Cliente" req list="dl-cli" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" placeholder="Via e numero civico" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} />
      <${Inp} label="Sito / codice immobile" placeholder="Facoltativo" list="dl-siti" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} drone=${r.drone} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div>
    <datalist id="dl-cli">${clienti.map(c => html`<option value=${c} />`)}</datalist>
    <datalist id="dl-siti">${siti.map(c => html`<option value=${c} />`)}</datalist></div>

    <div class="sec-h"><h3>Fase dell'indagine</h3></div>
    <div class="seg" style="margin:0 0 var(--sp-2)">
      <button class=${r.fase === 1 ? 'on' : ''} onClick=${() => up({ fase: 1 })}>Fase 1 · Sopralluogo</button>
      <button class=${r.fase === 2 ? 'on' : ''} onClick=${() => up({ fase: 2 })}>Fase 2 · Campionamento</button>
    </div>
`}

    ${T === 'sop' && html`
      <div class="sec-h"><h3>Uso del sito</h3></div>
      <div class="card"><${Area} label="Uso attuale del sito" value=${r.usoAttuale} set=${v => up({ usoAttuale: v })} />
        <div class="divider"></div><${Area} label="Uso storico" value=${r.usoStorico} set=${v => up({ usoStorico: v })} /></div>

      <div class="sec-h"><h3>Checklist sopralluogo</h3><span class="hint">${DDA_CHECK.filter(([k]) => r.check[k]).length} / ${DDA_CHECK.length}</span></div>
      <div class="card tight">${DDA_CHECK.map(([k, l]) => {
        const st = r.check[k]; const [sl, sc] = CHECK_ST[st] || ['Da compilare', 'st-none']; const o = openC[k];
        return html`<div class="chk" key=${k}>
          <button class="chk-h" aria-expanded=${!!o} onClick=${() => setOpenC({ ...openC, [k]: !o })}>
            <div class="tb-grow"><b>${l}</b>${!o && r.checkNote[k] && html`<small>${r.checkNote[k]}</small>`}</div>
            <span class=${'badge ' + sc}>${sl}</span><span class=${'chev' + (o ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
          ${o && html`<div style="padding-bottom:var(--sp-3)"><div class="tri">
              <button class=${st === 'presente' ? 'on-p' : ''} onClick=${() => setCheck(k, 'presente')}>Presente</button>
              <button class=${st === 'assente' ? 'on-a' : ''} onClick=${() => setCheck(k, 'assente')}>Assente</button>
              <button class=${st === 'nv' ? 'on-n' : ''} onClick=${() => setCheck(k, 'nv')}>N.V.</button></div>
            <label class="fld mt-2"><span>Note, ubicazione, evidenze</span><textarea rows="3" placeholder=" " value=${r.checkNote[k] || ''} onInput=${e => setNote(k, e.target.value)}></textarea></label></div>`}
        </div>`;
      })}</div>

      <div class="sec-h"><h3>Aree di potenziale contaminazione · ${r.recs.length}</h3></div>
      ${r.recs.map(x => html`<div class="card" key=${x.id} id=${'rec-' + x.id}>
        <div class="row mb-2"><span class="mdot" style="background:var(--rec)"></span><span class="tb-grow"></span>
          <button class="x" aria-label="Elimina area" onClick=${() => delRec(x)}>×</button></div>
        <div class="stack"><label class="fld"><span>Nome</span><input placeholder=" " value=${x.nome} onInput=${e => updRec(x.id, { nome: e.target.value })} /></label>
        <${Appunti} rec=${x} up=${p => updRec(x.id, p)} k="descrizione" foto=${null} rows=${2} label="Descrizione" nudo /></div>
        <div class="mt-3"><${PhotoStrip} ids=${x.foto} max=${6}
          onAdd=${async ids => { updRec(x.id, { foto: [...x.foto, ...ids] }); if (x.lat == null) { const g = await getPosition(); if (g) updRec(x.id, g); } }}
          onRemove=${async id => { await removeBlob(id); updRec(x.id, { foto: x.foto.filter(f => f !== id) }); }} /></div>
        <div class="mt-2">${x.lat != null ? html`<span class="geo"><${Icon} n="pin" s=${14} /> ${x.lat}, ${x.lon}</span>` : html`<span class="lock">La posizione GPS si salva con la prima foto</span>`}</div>
      </div>`)}
      <button class="btn dashed" onClick=${addRec}>+ Aggiungi area</button>

      <div class="sec-h"><h3>Interviste e note</h3></div>
      <${Appunti} rec=${r} up=${up} k="interviste" foto=${null} label="Interviste e note" />

      <div class="sec-h"><h3>Appunti Fase 1</h3></div>
      <${Appunti} rec=${r} up=${up} label="Appunti Fase 1" placeholder="Note sparse, promemoria…" />


      ${planSection}
    `}
    ${T === 'camp' && html`
      <${PrecSection} r=${r} onRicampiona=${c => { addCk({ matrice: c.k, descrizione: [c.codice, c.descrizione].filter(Boolean).join(' · '), ubicazione: [c.piano, c.ubicazione].filter(Boolean).join(' - ') }); toast(c.codice + ' aggiunto ai punti da campionare'); }} />
      <div class="sec-h mt-4"><h3>Punti da campionare</h3><span class="hint">${(r.checklist || []).filter(c => !c.fatto).length} da fare</span></div>
      <div class="card tight">
        ${!(r.checklist || []).length && html`<p class="lead" style="margin:var(--sp-1) 0 var(--sp-1)">Segna qui cosa prevedi di campionare prima di uscire: manufatti, tipologia, dove si trovano. Man mano che preleva, spuntali.</p>`}
        ${(r.checklist || []).map((it, ci) => html`<div key=${it.id} style=${'padding:10px 0;display:grid;gap:6px' + (ci ? ';border-top:.5px solid var(--sep)' : '') + (it.fatto ? ';opacity:.55' : '')}>
          <div class="row">
            <input type="checkbox" checked=${it.fatto} aria-label="Fatto" onChange=${e => updCk(it.id, { fatto: e.target.checked })} style="width:20px;height:20px;flex-shrink:0" />
            <span class="tb-grow"></span>
            ${!it.fatto ? html`<button class="btn sm" style="flex-shrink:0" onClick=${() => preleva(it)}>Preleva</button>` : html`<span class="badge b-ok" style="flex-shrink:0">Fatto</span>`}
            <button class="x" aria-label="Elimina voce" onClick=${() => delCk(it.id)}>×</button>
          </div>
          <label class="fld"><span>Matrice</span><select value=${it.matrice} onChange=${e => updCk(it.id, { matrice: e.target.value })}>
              ${MATS.map(m => html`<option value=${m.k}>${m.l}</option>`)}</select></label>
          <label class="fld"><span>Cosa</span><input placeholder=" " value=${it.descrizione} onInput=${e => updCk(it.id, { descrizione: e.target.value })} /></label>
          <${InpGrow} label="Dove" value=${it.ubicazione} set=${v => updCk(it.id, { ubicazione: v })} /></div>`)}
        <div class="row mt-2">
          <button class="btn dashed grow" onClick=${() => addCk()}>+ Aggiungi voce</button>
          ${r.recs.length > 0 && html`<button class="btn sm" onClick=${ckFromRecs}>Da aree REC</button>`}
        </div>
      </div>


      <div class="sec-h"><h3>Campioni</h3>${mat.auto && (r.congelati[tab] || numHint(r, mat)) && html`<span class="hint">${r.congelati[tab] ? 'Codici bloccati dalla scheda' : numHint(r, mat)}</span>`}</div>
      <${Suggerimento} id="campioni" />
      ${r.fase === 2 && html`<${NumSection} r=${r} up=${up} mats=${MATS} />`}
      <${CampSummary} r=${r} mats=${MATS} onRiep=${() => setRiep(true)} todo=${(r.checklist || []).filter(c => !c.fatto).length} />
      <div class="mtabs" role="tablist">${MATS.map(m => html`<button role="tab" aria-selected=${tab === m.k} class=${tab === m.k ? 'on' : ''} onClick=${() => setTab(m.k)}>${m.l}<small><i class="mdot" style=${'background:' + m.c}></i>${r.campioni[m.k].length}</small></button>`)}</div>
      ${!camp.length && html`<div class="card"><div class="empty" style="padding:var(--sp-5)">Nessun campione ${mat.l}.</div></div>`}
      <button class="btn block mt-3" onClick=${() => apriPlan(camp)}><${Icon} n="map" s=${20} /> Planimetria</button>
      ${byPiano(camp).map(([piano, list]) => html`<div key=${piano}>
        <div class="list mt-3"><div class="list-h"><b>${piano}</b><span>${list.length}</span></div>${list.map(c => html`<${SampleRow} key=${c.id} c=${c} mat=${mat} open=${!!openS[c.id]} toggle=${() => setOpenS(o => ({ ...o, [c.id]: !o[c.id] }))}
          onPhoto=${ids => { dopoFoto(r, c, apriPlan); updCamp(c.id, { foto: [...(c.foto || []), ...ids] }); }}>
          <${CampFields} c=${c} list="dl-piani-c" upd=${patch => updCamp(c.id, patch)} codice=${mat.auto ? html`<${SiglaAuto} codice=${c.codice} c=${mat.c} />`
              : html`<label class="fld"><span>Sigla</span><input class="code-free" value=${c.codice} placeholder=" " onInput=${e => updCamp(c.id, { codice: e.target.value })} /></label>`} />
          ${tab === 'altro' && html`<label class="fld"><span>Tipo di campione</span><input placeholder="es. rifiuto, aria, sedimento" value=${c.tipo} onInput=${e => updCamp(c.id, { tipo: e.target.value })} /></label>`}
          <label class="fld"><span>Data prelievo</span><input type="date" value=${c.data || ''} onInput=${e => updCamp(c.id, { data: e.target.value })} /></label>
          ${(tab === 'mca' || tab === 'fav') && html`<label class="fld"><span>Quantità</span><input placeholder="es. 180 mq" value=${c.quantita || ''} onInput=${e => updCamp(c.id, { quantita: e.target.value })} /></label>`}
          <${PhotoStrip} ids=${c.foto || []} max=${4} onAdd=${ids => { dopoFoto(r, c, apriPlan); updCamp(c.id, { foto: [...(c.foto || []), ...ids] }); }}
            onRemove=${async id => { await removeBlob(id); updCamp(c.id, { foto: c.foto.filter(f => f !== id) }); }} />
          <button class="btn sm danger self-start" onClick=${() => delCamp(c)}>Elimina campione</button>
        <//>`)}</div></div>`)}
      <datalist id="dl-piani-c">${[...new Set([...allCamp(r).map(c => c.piano).filter(Boolean), ...PIANI_COMUNI])].map(x => html`<option value=${x} />`)}</datalist>
      <button class="btn dashed mt-3" onClick=${addCamp}>+ Aggiungi campione ${mat.auto ? nextCode(tab) : ''}</button>
      ${(tab === 'mca' || tab === 'fav') && html`<${NcSection} r=${r} up=${up} mat=${mat} list="dl-piani-c" />`}
      <div style="height:10px"></div>

      <div class="sec-h"><h3>Appunti Fase 2</h3></div>
      <${Appunti} rec=${r} up=${up} k="appunti2" foto="fotoAppunti2" rows=${3} label="Appunti Fase 2" placeholder="Note sparse, promemoria…" />

      ${planSection}

      ${(tab === 'mca' || tab === 'fav') && html`
        ${!r.commessa && html`<div class="notice">Indica la commessa in alto: compare nell'intestazione della scheda.</div>`}
      `}

      ${risCamp.length > 0 && html`
        <div class="sec-h"><h3>Risultati vs CSC</h3>
          <div class="seg" style="width:150px">${['A', 'B'].map(c => html`<button class=${r.colonna === c ? 'on' : ''} style="padding:var(--sp-2)" onClick=${() => up({ colonna: c })}>Col. ${c}</button>`)}</div></div>
        <div class="card tight">
          ${r.risultati.length ? html`<div class=${'notice' + (sup.length ? ' err' : '')} style="margin:0 0 10px;${sup.length ? '' : 'background:var(--ok-soft);border-color:var(--ok);color:var(--ok)'}">
            ${sup.length ? `${sup.length} superamenti rispetto alla colonna ${r.colonna}` : `Nessun superamento rispetto alla colonna ${r.colonna}`}</div>` : html`<p class="lead lead-gap">Inserisci i valori dai rapporti di prova del laboratorio.</p>`}
          ${r.risultati.map(x => {
            const p = CSC.find(c => c.p === x.parametro) || CSC[0]; const v = num(x.valore); const over = v != null && v > p[r.colonna];
            return html`<div key=${x.id} style="display:grid;grid-template-columns:80px 1fr 80px 28px;gap:var(--sp-2);align-items:center;margin-bottom:var(--sp-2)">
              <select class="inp" style="padding:var(--sp-2) var(--sp-1)" value=${x.campione} onChange=${e => updRis(x.id, { campione: e.target.value })}>${risCamp.map(c => html`<option value=${c.codice}>${c.codice}</option>`)}</select>
              <select class="inp" style="padding:var(--sp-2) var(--sp-1)" value=${x.parametro} onChange=${e => updRis(x.id, { parametro: e.target.value })}>${CSC.map(c => html`<option value=${c.p}>${c.p} (${c.u}) · CSC ${c[r.colonna]}</option>`)}</select>
              <input class="inp" inputmode="decimal" style=${'text-align:right;padding:8px' + (over ? ';color:var(--danger);font-weight:700;background:rgba(190,34,42,.07)' : '')} value=${x.valore} placeholder="Valore" onInput=${e => updRis(x.id, { valore: e.target.value })} />
              <button class="x" aria-label="Elimina risultato" onClick=${() => up(pp => ({ ...pp, risultati: pp.risultati.filter(y => y.id !== x.id) }))}>×</button></div>`;
          })}
          <button class="btn dashed" onClick=${addRis}>+ Aggiungi risultato</button>
        </div>`}
    `}

    ${T === 'firme' && html`<${FogliFirme} r=${r} up=${up} settings=${settings} />`}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    <input ref=${importInp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${doImport1} />
    ${riep && html`<${RiepilogoPanel} r=${r} mats=${MATS} onClose=${() => setRiep(false)} onFile=${() => setT('file')} />`}
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { if (T === 'anag' || T === 'firme') setT(r.fase === 2 ? 'camp' : 'sop'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${T === 'sop' ? html`<button class="btn pri" onClick=${addRec}><${Icon} n="plus" s=${20} w=${2.4} /> Nuova area REC</button>`
        : T === 'camp' ? html`<button class="btn pri" onClick=${addCamp}><${Icon} n="plus" s=${20} w=${2.4} /> Nuovo campione ${mat.auto ? nextCode(tab) : mat.l}</button>`
        : html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[['Documenti', [
        (r.campioni.mca.length || r.campioni.fav.length) && { ic: 'gear', l: 'Laboratorio, offerta, codici analisi', fn: onSettings },
        T !== 'anag' && { ic: 'share', l: OD.account ? 'Carica su OneDrive' : 'Invia a OneDrive', fn: () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings) }]],
        ['Dati', [
          { ic: 'file', l: 'Importa da un DDA precedente', s: 'JSON di Fase 1 o Fase 2: riempie solo i campi ancora vuoti', fn: () => importInp.current.click() },
          { ic: 'paper', l: 'Scarica il modello JSON Fase 1', fn: downloadDda1Template },
          { ic: 'paper', l: 'Scarica il modello JSON Fase 2', fn: downloadDda2Template }]],
        opzArchivio({ r, settings, onDelete, up, elimina: 'Elimina l’indagine', firme: !firmeOn && (() => { up(q => prepFirme({ ...q }, settings, true)); setT('firme'); }) })]} />
  </div>`;
}
