/* Modulo Ambiente · DDA (Fase 1 sopralluogo, Fase 2 campionamento) */

const DDA_CHECK = [
  ['serbatoi', 'Serbatoi interrati o fuori terra'], ['rifiuti', 'Stoccaggio rifiuti'], ['scarichi', 'Scarichi, pozzetti e caditoie'],
  ['mca', 'Materiali contenenti amianto'], ['pcb', 'Trasformatori / PCB'], ['macchie', 'Macchie o sversamenti visibili'],
  ['vegetazione', 'Vegetazione stressata'], ['riporti', 'Riporti o terreni di riempimento'], ['pozzi', 'Pozzi o piezometri esistenti'],
];
const CHECK_ST = { presente: ['Presente', 'st-pres'], assente: ['Assente', 'st-ass'], nv: ['Non verificabile', 'st-nv'] };
const MATS = [
  { k: 'terreni', l: 'Terreni', c: 'var(--terreni)', h: PRINT.terreni, auto: null },
  { k: 'acque', l: 'Acque', c: 'var(--acque)', h: PRINT.acque, auto: null },
  { k: 'mca', l: 'MCA', c: 'var(--mca)', h: PRINT.mca, auto: 'A' },
  { k: 'fav', l: 'FAV', c: 'var(--fav)', h: PRINT.fav, auto: 'F' },
  { k: 'altro', l: 'Altro', c: 'var(--altro)', h: PRINT.altro, auto: null },
];
const CSC = [
  { p: 'Idrocarburi C>12', u: 'mg/kg', A: 50, B: 750, m: 'terreni' },
  { p: 'Piombo', u: 'mg/kg', A: 100, B: 1000, m: 'terreni' },
  { p: 'Arsenico', u: 'mg/kg', A: 20, B: 50, m: 'terreni' },
  { p: 'Toluene', u: 'mg/kg', A: 0.5, B: 50, m: 'terreni' },
  { p: 'Tetracloroetilene', u: 'µg/L', A: 1.1, B: 1.1, m: 'acque' },
  { p: 'Idrocarburi totali', u: 'µg/L', A: 350, B: 350, m: 'acque' },
];

const emptyCampioni = () => ({ terreni: [], acque: [], mca: [], fav: [], altro: [] });

/* ---------------- import Fase 1 da JSON ----------------
   Schema del file da importare (tutti i campi opzionali):
   {
     "app": "nembo", "type": "dda-fase1",
     "commessa": "…", "cliente": "…", "sito": "…",
     "usoAttuale": "…", "usoStorico": "…",
     "check": { "serbatoi": "presente|assente|nv", … (chiavi in DDA_CHECK) },
     "checkNote": { "serbatoi": "…", … },
     "recs": [ { "nome": "REC-1", "descrizione": "…" } ],
     "interviste": "…", "appunti": "…"
   }
   Compila solo i campi vuoti del record corrente: non sovrascrive mai un dato già inserito. */
const DDA1_TEMPLATE = {
  app: 'nembo', type: 'dda-fase1',
  commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', usoAttuale: '', usoStorico: '',
  check: Object.fromEntries(DDA_CHECK.map(([k]) => [k, ''])), checkNote: {}, recs: [{ nome: 'REC-1', descrizione: '' }],
  interviste: '', appunti: '',
};
function importDda1(json, rec) {
  let data;
  try { data = JSON.parse(json); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (data.type && data.type !== 'dda-fase1') throw new Error('il file non è un\'importazione Fase 1');
  const patch = {}; let n = 0;
  const str = k => { if (data[k] && !rec[k]) { patch[k] = String(data[k]); n++; } };
  ['commessa', 'cliente', 'citta', 'indirizzo', 'sito', 'usoAttuale', 'usoStorico', 'interviste', 'appunti'].forEach(str);
  { const t = markImp({ imp: rec.imp }, patch, IMP_ANAG); if (t.imp) patch.imp = t.imp; }
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
    patch.recs = data.recs.filter(x => x && (x.nome || x.descrizione)).map(x => ({ id: uid('rec'), nome: x.nome || 'REC-' + (n + 1), descrizione: x.descrizione || '', foto: [], lat: null, lon: null }));
    n += patch.recs.length;
  }
  if (!n) throw new Error('nessun campo nuovo da importare (i campi già compilati non vengono toccati)');
  return { patch, n };
}
function downloadDda1Template() {
  downloadBlob(new Blob([JSON.stringify(DDA1_TEMPLATE, null, 1)], { type: 'application/json' }), 'Nembo_modello_Fase1.json');
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
const ddaIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.fotoAppunti || []).length && !(r.fotoAppunti2 || []).length && !r.recs.length && !Object.keys(r.check).length && !MATS.some(m => r.campioni[m.k].length) && !r.usoAttuale && !r.interviste && !r.appunti && !r.appunti2 && !(r.checklist && r.checklist.length) && !(r.planimetrie && r.planimetrie.length) && !(r.fogli || []).length && !ncOf(r).length;
const allCamp = r => MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, k: m.k })));

function superamenti(r) {
  return (r.risultati || []).filter(x => {
    const p = CSC.find(c => c.p === x.parametro); const v = num(x.valore);
    return p && v != null && v > p[r.colonna || 'B'];
  });
}

/* ---------------- campioni: riepilogo, righe per piano (condivisi con la Mappatura) ---------------- */
const PIANI_COMUNI = ['Copertura', 'Sottotetto', 'Piano 2', 'Piano 1', 'Piano terra', 'Piano interrato', 'Esterno'];
const placedRefs = r => new Set((r.planimetrie || []).flatMap(p => Object.values(p.annot || {}).flatMap(a => (a.labels || []).map(l => l.ref))));
// campioni raggruppati per piano, nell'ordine in cui compaiono
function byPiano(list) {
  const g = new Map();
  for (const c of list) { const k = (c.piano || '').trim() || 'Piano non indicato'; if (!g.has(k)) g.set(k, []); g.get(k).push(c); }
  return [...g.entries()];
}
function CampSummary({ r, mats, todo = 0 }) {
  const [per, setPer] = useState('pratica');
  const all = mats.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, k: m.k })));
  const noFoto = all.filter(c => !(c.foto || []).length).length;
  const placed = placedRefs(r); const inP = all.filter(c => placed.has(c.id)).length;
  const shown = per === 'oggi' ? all.filter(c => c.data === today()) : all;
  const rows = mats.map(m => ({ m, n: shown.filter(c => c.k === m.k).length })).filter(x => x.n > 0 || mats.length <= 2);
  const max = Math.max(1, ...rows.map(x => x.n));
  return html`<div class="card-navy"><div class="sum3">
      <div><b>${all.length}${todo > 0 && html`<small>/${all.length + todo}</small>`}</b><span>prelevati</span></div>
      <div><b class=${noFoto ? 'crit' : ''}>${noFoto}</b><span>senza foto</span></div>
      <div><b>${inP}<small>/${all.length}</small></b><span>in pianta</span></div></div></div>
    ${all.length > 0 && html`<div class="card">
      <div class="card-h"><h4>Per matrice</h4><div class="seg sm" style="width:150px">
        <button class=${per === 'oggi' ? 'on' : ''} onClick=${() => setPer('oggi')}>Oggi</button><button class=${per === 'pratica' ? 'on' : ''} onClick=${() => setPer('pratica')}>Attività</button></div></div>
      ${rows.map(x => html`<div class="mbar"><span class="nm"><i class="mdot" style=${'background:' + x.m.c}></i>${x.m.l}</span>
        <div class="track"><i style=${'width:' + Math.round(x.n / max * 100) + '%'}></i></div><b>${x.n}</b></div>`)}</div>`}`;
}
// etichette per le planimetrie: campioni e NC, con il piano per il vassoio
const campPlanLabels = (r, mats) => [...mats.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ref: c.id, text: c.codice || m.l, color: m.h, piano: c.piano || '' }))),
  ...ncOf(r).map(x => ({ ref: x.id, text: x.codice, color: (MATS.find(m => m.k === x.k) || MATS[2]).h, piano: x.piano || '' }))];
// descrizione completa per schede e riepiloghi: «Piano - Ubicazione - Descrizione»
const campDesc = c => [c.piano, c.ubicazione, c.descrizione].map(x => String(x || '').trim()).filter(Boolean).join(' - ');
// campo Piano: il gruppo cambia solo a fine modifica (uscendo dal campo o con Invio), così il campo non perde il fuoco
function PianoInp({ value, set, list }) {
  return html`<input class="inp" list=${list} placeholder="Piano" defaultValue=${value || ''} aria-label="Piano"
    onChange=${e => { const v = e.target.value.trim(); if (v !== (value || '')) set(v); }} onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); }} />`;
}
// campi comuni del campione: Piano, Ubicazione, Descrizione
function CampFields({ c, upd, list, codice }) {
  return html`<div class="row">${codice}<${PianoInp} value=${c.piano} list=${list} set=${v => upd({ piano: v })} /></div>
    <input class="inp" placeholder="Ubicazione" value=${c.ubicazione || ''} onInput=${e => upd({ ubicazione: e.target.value })} aria-label="Ubicazione" />
    <textarea class="inp" rows="2" placeholder="Descrizione" value=${c.descrizione} onInput=${e => upd({ descrizione: e.target.value })} aria-label="Descrizione"></textarea>`;
}

/* ---------------- NC: manufatti non campionati (MCA e FAV, numerazione unica NC1, NC2…) ----------------
   r.nc = [{ id, codice, k: 'mca'|'fav', piano, ubicazione, descrizione, quantita, rif (id del campione di riferimento), foto }] */
const ncOf = r => r.nc || [];
const ncRenum = list => list.map((x, i) => ({ ...x, codice: 'NC' + (i + 1) }));
const ncRif = (r, x) => { const c = x.rif && (r.campioni[x.k] || []).find(y => y.id === x.rif); return c ? c.codice : ''; };
function NcSection({ r, up, mat, list }) {
  const [openN, setOpenN] = useState({});
  const L = ncOf(r).filter(x => x.k === mat.k);
  const camp = r.campioni[mat.k] || [];
  const setNc = fn => up(p => ({ ...p, nc: ncRenum(fn(ncOf(p))) }));
  const upd = (id, patch) => setNc(l => l.map(x => x.id === id ? { ...x, ...patch } : x));
  const add = () => { const id = uid('nc'); const last = L[L.length - 1];
    setNc(l => [...l, { id, codice: '', k: mat.k, piano: last ? last.piano : '', ubicazione: '', descrizione: '', quantita: '', rif: '', foto: [] }]);
    setOpenN({ [id]: true }); setTimeout(() => scrollToId('s-' + id), 80); };
  const del = async x => { if (!confirm('Eliminare ' + x.codice + '?')) return; for (const b of blobIds(x)) await removeBlob(b); setNc(l => l.filter(y => y.id !== x.id)); };
  const next = 'NC' + (ncOf(r).length + 1);
  return html`<div class="sec-h" style="margin-top:18px"><h3>Manufatti non campionati</h3><span class="hint">NC1, NC2… unica per MCA e FAV</span></div>
    ${L.length > 0 && html`<div class="list">${L.map(x => { const rc = ncRif(r, x); const cx = { ...x, descrizione: x.descrizione, quantita: [x.quantita, rc && 'come ' + rc].filter(Boolean).join(' · ') };
      return html`<${SampleRow} key=${x.id} c=${cx} mat=${mat} open=${!!openN[x.id]} toggle=${() => setOpenN(o => ({ ...o, [x.id]: !o[x.id] }))}
        onPhoto=${ids => upd(x.id, { foto: [...(x.foto || []), ...ids] })}>
        <${CampFields} c=${x} list=${list} upd=${patch => upd(x.id, patch)} codice=${html`<div class="code-auto" style=${'width:64px;flex-shrink:0;color:' + mat.c}>${x.codice}</div>`} />
        <div class="row">
          <input class="inp" placeholder="Quantità (es. 180 mq)" value=${x.quantita || ''} onInput=${e => upd(x.id, { quantita: e.target.value })} aria-label="Quantità" />
          <select class="inp" value=${x.rif || ''} onChange=${e => upd(x.id, { rif: e.target.value })} aria-label="Campione di riferimento">
            <option value="">Nessun campione di riferimento</option>${camp.map(c => html`<option value=${c.id}>Come ${c.codice}${c.descrizione ? ' · ' + c.descrizione.slice(0, 40) : ''}</option>`)}</select>
        </div>
        <${PhotoStrip} ids=${x.foto || []} max=${4} onAdd=${ids => upd(x.id, { foto: [...(x.foto || []), ...ids] })}
          onRemove=${async id => { await removeBlob(id); upd(x.id, { foto: x.foto.filter(f => f !== id) }); }} />
        <button class="btn sm danger" style="justify-self:start" onClick=${() => del(x)}>Elimina ${x.codice}</button>
      <//>`; })}</div>`}
    <button class="btn dashed" style="margin-top:10px" onClick=${add}>+ Aggiungi manufatto non campionato ${next}</button>`;
}

// riga campione: miniatura (o segnaposto rosso se manca la foto), sigla, descrizione; si apre per modificare
function SampleRow({ c, mat, open, toggle, onPhoto, children }) {
  const has = (c.foto || []).length > 0;
  const sub = [c.ubicazione, c.quantita, c.tipo, c.data && c.data !== today() ? fmtD(c.data) : ''].filter(Boolean).join(' · ');
  return html`<div class="srow" id=${'s-' + c.id}>
    <div class="srow-h" role="button" tabindex="0" aria-expanded=${open} onClick=${toggle} onKeyDown=${e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}>
      ${has ? html`<${Thumb44} id=${c.foto[0]} dot=${mat.c} />` : html`<${QuickPhoto} onAdd=${onPhoto} label=${'Scatta la foto di ' + (c.codice || 'questo campione')} />`}
      <div class="t"><b><span class="mono" style=${'color:' + mat.c}>${c.codice || '—'}</span>${c.descrizione || 'Descrizione da indicare'}</b>
        ${has ? html`<small>${sub || mat.l}</small>` : html`<small class="crit">Scatta la foto prima di uscire</small>`}</div>
      <span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></div>
    ${open && html`<div class="srow-b">${children}</div>`}
  </div>`;
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
        lines.push(html`<div class="l" style="color:var(--nc)"><span class="dot" style="background:var(--nc)"></span><span>${x.campione} · ${x.parametro}: ${x.valore} ${p.u} (CSC ${p[r.colonna || 'B']})</span></div>`);
      });
      const sch = Object.entries(r.schede || {}).map(([k, t]) => k.toUpperCase() + ' ' + new Date(t).toLocaleDateString('it-IT'));
      if (sch.length) lines.push(html`<div class="l" style="color:var(--ok)"><span class="dot" style="background:var(--ok)"></span><span>Scheda campioni: ${sch.join(', ')}</span></div>`);
    }
    return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
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
  const [busy, setBusy] = useState(null);
  const [openS, setOpenS] = useState({});
  const firmeOn = !!r.firme || (r.fogli || []).length > 0;
  const [T, setT] = useSchede('dda', firmeOn ? ['anag', 'sop', 'camp', 'firme', 'file'] : ['anag', 'sop', 'camp', 'file'], initial._new, { 's-': 'camp', 'rec-': 'sop' });
  // dalla ricerca: apre la matrice del campione trovato
  useEffect(() => { const h = e => { const c = allCamp(r).find(x => 's-' + x.id === e.detail); if (c) setTab(c.k); }; addEventListener('nembo-goto', h); return () => removeEventListener('nembo-goto', h); }, [r]);
  const importInp = useRef();
  const planLabels = [
    ...r.recs.map(x => ({ ref: x.id, text: x.nome || 'REC', color: PRINT.rec })),
    ...campPlanLabels(r, MATS),
  ];
  const plans = r.planimetrie || [];
  const planSection = html`<div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3><span class="hint">Disegno ed etichette dei campioni</span></div>
    <div class="card"><${PlanList} items=${plans} labels=${planLabels}
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
  const renum = (k, list) => { const m = MATS.find(x => x.k === k); return (!m.auto || r.congelati[k]) ? list : list.map((c, i) => ({ ...c, codice: m.auto + (i + 1) })); };
  const nextCode = k => { const m = MATS.find(x => x.k === k); if (!m.auto) return ''; const l = r.campioni[k]; if (!r.congelati[k]) return m.auto + (l.length + 1); return m.auto + (l.map(c => +c.codice.slice(1) || 0).reduce((a, b) => Math.max(a, b), 0) + 1); };
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
  const nextCode2 = k => { const m = MATS.find(x => x.k === k); if (!m.auto) return ''; const l = r.campioni[k]; if (!r.congelati[k]) return m.auto + (l.length + 1); return m.auto + (l.map(c => +c.codice.slice(1) || 0).reduce((a, b) => Math.max(a, b), 0) + 1); };

  const doImport1 = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { const { patch, n } = importDda1(rd.result, r); up(patch); toast(`Importati ${n} campi`); }
      catch (err) { fail('Import non riuscito', err); }
    };
    rd.readAsText(f);
  };

  const risCamp = allCamp(r).filter(c => (c.k === 'terreni' || c.k === 'acque') && c.codice);
  const addRis = () => up(p => ({ ...p, risultati: [...(p.risultati || []), { id: uid('x'), campione: risCamp[0] ? risCamp[0].codice : '', parametro: CSC[0].p, valore: '' }] }));
  const updRis = (id, patch) => up(p => ({ ...p, risultati: p.risultati.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const sup = superamenti(r);

  return html`<div class="content form">
    <${DetailHead} eye=${'DDA · Fase ' + r.fase} title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'sop', l: 'Sopralluogo', n: r.recs.length }, { k: 'camp', l: 'Campioni', n: allCamp(r).length }, firmeOn && { k: 'firme', l: 'Firme', n: (r.fogli || []).length }, { k: 'file', l: 'File' }].filter(Boolean)} />
    ${T === 'anag' && html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa - progetto" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} placeholder="es. 000/26" />
      <${Inp} label="Cliente" req list="dl-cli" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via e numero civico" />
      <${Inp} label="Sito / codice immobile" list="dl-siti" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="Facoltativo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} drone=${r.drone} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div>
    <datalist id="dl-cli">${clienti.map(c => html`<option value=${c} />`)}</datalist>
    <datalist id="dl-siti">${siti.map(c => html`<option value=${c} />`)}</datalist></div>

    <div class="sec-h"><h3>Fase dell'indagine</h3></div>
    <div class="seg" style="margin:0 0 6px">
      <button class=${r.fase === 1 ? 'on' : ''} onClick=${() => up({ fase: 1 })}>Fase 1 · Sopralluogo</button>
      <button class=${r.fase === 2 ? 'on' : ''} onClick=${() => up({ fase: 2 })}>Fase 2 · Campionamento</button>
    </div>
    <div class="sec-h"><h3>Documenti allegati</h3></div>
    <div class="card"><${FileList} items=${r.documenti}
      onAdd=${d => up(p => ({ ...p, documenti: [...p.documenti, d] }))}
      onRemove=${async d => { await removeBlob(d.blobId); up(p => ({ ...p, documenti: p.documenti.filter(x => x.id !== d.id) })); }} /></div>
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
          ${o && html`<div style="padding-bottom:12px"><div class="tri">
              <button class=${st === 'presente' ? 'on-p' : ''} onClick=${() => setCheck(k, 'presente')}>Presente</button>
              <button class=${st === 'assente' ? 'on-a' : ''} onClick=${() => setCheck(k, 'assente')}>Assente</button>
              <button class=${st === 'nv' ? 'on-n' : ''} onClick=${() => setCheck(k, 'nv')}>N.V.</button></div>
            <textarea class="inp" rows="3" placeholder="Note, ubicazione, evidenze…" value=${r.checkNote[k] || ''} onInput=${e => setNote(k, e.target.value)}></textarea></div>`}
        </div>`;
      })}</div>

      <div class="sec-h"><h3>Aree di potenziale contaminazione · ${r.recs.length}</h3></div>
      ${r.recs.map(x => html`<div class="card" key=${x.id} id=${'rec-' + x.id}>
        <div class="row" style="margin-bottom:8px"><span class="mdot" style="background:var(--rec)"></span>
          <input class="inp" style="font-weight:700" value=${x.nome} onInput=${e => updRec(x.id, { nome: e.target.value })} aria-label="Nome area" />
          <button class="x" aria-label="Elimina area" onClick=${() => delRec(x)}>×</button></div>
        <textarea class="inp" rows="2" placeholder="Descrizione" value=${x.descrizione} onInput=${e => updRec(x.id, { descrizione: e.target.value })}></textarea>
        <div style="margin-top:10px"><${PhotoStrip} ids=${x.foto} max=${6}
          onAdd=${async ids => { updRec(x.id, { foto: [...x.foto, ...ids] }); if (x.lat == null) { const g = await getPosition(); if (g) updRec(x.id, g); } }}
          onRemove=${async id => { await removeBlob(id); updRec(x.id, { foto: x.foto.filter(f => f !== id) }); }} /></div>
        <div style="margin-top:8px">${x.lat != null ? html`<span class="geo"><${Icon} n="pin" s=${14} /> ${x.lat}, ${x.lon}</span>` : html`<span class="lock">La posizione GPS si salva con la prima foto</span>`}</div>
      </div>`)}
      <button class="btn dashed" onClick=${addRec}>+ Aggiungi area</button>

      <div class="sec-h"><h3>Interviste e note</h3></div>
      <div class="card"><textarea class="inp" rows="4" value=${r.interviste} onInput=${e => up({ interviste: e.target.value })} aria-label="Interviste e note"></textarea></div>

      <div class="sec-h"><h3>Appunti Fase 1</h3><span class="hint">Testo libero</span></div>
      <div class="card"><textarea class="inp" rows="4" placeholder="Note sparse, promemoria…" value=${r.appunti || ''} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti Fase 1"></textarea>
        <${NotePhotos} rec=${r} field="fotoAppunti" up=${up} /></div>


      ${planSection}
    `}
    ${T === 'camp' && html`
      <div class="sec-h" style="margin-top:14px"><h3>Punti da campionare</h3><span class="hint">${(r.checklist || []).filter(c => !c.fatto).length} da fare</span></div>
      <div class="card tight">
        ${!(r.checklist || []).length && html`<p class="lead" style="margin:2px 0 4px">Segna qui cosa prevedi di campionare prima di uscire: manufatti, tipologia, dove si trovano. Man mano che preleva, spuntali.</p>`}
        ${(r.checklist || []).map((it, ci) => html`<div key=${it.id} style=${'padding:10px 0;display:grid;gap:6px' + (ci ? ';border-top:.5px solid var(--sep)' : '') + (it.fatto ? ';opacity:.55' : '')}>
          <div class="row">
            <input type="checkbox" checked=${it.fatto} aria-label="Fatto" onChange=${e => updCk(it.id, { fatto: e.target.checked })} style="width:20px;height:20px;flex-shrink:0" />
            <select class="inp" style=${'width:96px;flex-shrink:0;padding:8px 6px;font-weight:700;color:' + MATS.find(m => m.k === it.matrice).c} value=${it.matrice} onChange=${e => updCk(it.id, { matrice: e.target.value })}>
              ${MATS.map(m => html`<option value=${m.k}>${m.l}</option>`)}</select>
            <span class="tb-grow"></span>
            ${!it.fatto ? html`<button class="btn sm" style="flex-shrink:0" onClick=${() => preleva(it)}>Preleva</button>` : html`<span class="badge b-ok" style="flex-shrink:0">Fatto</span>`}
            <button class="x" aria-label="Elimina voce" onClick=${() => delCk(it.id)}>×</button>
          </div>
          <div class="row" style="padding-left:28px">
            <input class="inp" placeholder="Cosa" value=${it.descrizione} onInput=${e => updCk(it.id, { descrizione: e.target.value })} />
            <div style="flex:0 0 42%"><${InpGrow} placeholder="Dove" value=${it.ubicazione} set=${v => updCk(it.id, { ubicazione: v })} /></div>
          </div></div>`)}
        <div class="row" style="margin-top:8px">
          <button class="btn dashed" style="flex:1" onClick=${() => addCk()}>+ Aggiungi voce</button>
          ${r.recs.length > 0 && html`<button class="btn sm" onClick=${ckFromRecs}>Da aree REC</button>`}
        </div>
      </div>


      <div class="sec-h"><h3>Campioni</h3><span class="hint">${mat.auto ? (r.congelati[tab] ? 'Codici bloccati dalla scheda' : `Codici automatici ${mat.auto}1, ${mat.auto}2…`) : 'Codice libero'}</span></div>
      <${CampSummary} r=${r} mats=${MATS} todo=${(r.checklist || []).filter(c => !c.fatto).length} />
      <div class="mtabs" role="tablist">${MATS.map(m => html`<button role="tab" aria-selected=${tab === m.k} class=${tab === m.k ? 'on' : ''} onClick=${() => setTab(m.k)}>${m.l}<small><i class="mdot" style=${'background:' + m.c}></i>${r.campioni[m.k].length}</small></button>`)}</div>
      ${!camp.length && html`<div class="card"><div class="empty" style="padding:18px">Nessun campione ${mat.l}.</div></div>`}
      ${byPiano(camp).map(([piano, list]) => html`<div key=${piano}>
        <div class="sec-h" style="margin-top:14px"><h3>${piano}</h3><span class="hint">${list.length}</span></div>
        <div class="list">${list.map(c => html`<${SampleRow} key=${c.id} c=${c} mat=${mat} open=${!!openS[c.id]} toggle=${() => setOpenS(o => ({ ...o, [c.id]: !o[c.id] }))}
          onPhoto=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}>
          <${CampFields} c=${c} list="dl-piani-c" upd=${patch => updCamp(c.id, patch)} codice=${mat.auto ? html`<div class="code-auto" style=${'width:64px;flex-shrink:0;color:' + mat.c}>${c.codice}</div>`
              : html`<input class="inp code-free" style="width:90px;flex-shrink:0" value=${c.codice} placeholder="Codice" onInput=${e => updCamp(c.id, { codice: e.target.value })} aria-label="Codice campione" />`} />
          ${tab === 'altro' && html`<input class="inp" placeholder="Tipo di campione (es. rifiuto, aria, sedimento)" value=${c.tipo} onInput=${e => updCamp(c.id, { tipo: e.target.value })} />`}
          <div class="row">
            <input class="inp" type="date" style="max-width:180px" value=${c.data || ''} onInput=${e => updCamp(c.id, { data: e.target.value })} aria-label="Data prelievo" />
            ${(tab === 'mca' || tab === 'fav') && html`<input class="inp" placeholder="Quantità (es. 180 mq)" value=${c.quantita || ''} onInput=${e => updCamp(c.id, { quantita: e.target.value })} aria-label="Quantità" />`}
          </div>
          <${PhotoStrip} ids=${c.foto || []} max=${4} onAdd=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}
            onRemove=${async id => { await removeBlob(id); updCamp(c.id, { foto: c.foto.filter(f => f !== id) }); }} />
          <button class="btn sm danger" style="justify-self:start" onClick=${() => delCamp(c)}>Elimina campione</button>
        <//>`)}</div></div>`)}
      <datalist id="dl-piani-c">${[...new Set([...allCamp(r).map(c => c.piano).filter(Boolean), ...PIANI_COMUNI])].map(x => html`<option value=${x} />`)}</datalist>
      <button class="btn dashed" style="margin-top:10px" onClick=${addCamp}>+ Aggiungi campione ${mat.auto ? nextCode(tab) : ''}</button>
      ${(tab === 'mca' || tab === 'fav') && html`<${NcSection} r=${r} up=${up} mat=${mat} list="dl-piani-c" />`}
      <div style="height:10px"></div>

      <div class="sec-h"><h3>Appunti Fase 2</h3><span class="hint">Testo libero</span></div>
      <div class="card"><textarea class="inp" rows="3" placeholder="Note sparse, promemoria…" value=${r.appunti2 || ''} onInput=${e => up({ appunti2: e.target.value })} aria-label="Appunti Fase 2"></textarea>
        <${NotePhotos} rec=${r} field="fotoAppunti2" up=${up} /></div>

      ${planSection}

      ${(tab === 'mca' || tab === 'fav') && html`
        ${!r.commessa && html`<div class="notice">Indica la commessa in alto: compare nell'intestazione della scheda.</div>`}
      `}

      ${risCamp.length > 0 && html`
        <div class="sec-h"><h3>Risultati vs CSC</h3>
          <div class="seg" style="width:150px">${['A', 'B'].map(c => html`<button class=${r.colonna === c ? 'on' : ''} style="padding:6px" onClick=${() => up({ colonna: c })}>Col. ${c}</button>`)}</div></div>
        <div class="card tight">
          ${r.risultati.length ? html`<div class=${'notice' + (sup.length ? ' err' : '')} style="margin:0 0 10px;${sup.length ? '' : 'background:var(--ok-soft);border-color:var(--ok);color:var(--ok)'}">
            ${sup.length ? `${sup.length} superamenti rispetto alla colonna ${r.colonna}` : `Nessun superamento rispetto alla colonna ${r.colonna}`}</div>` : html`<p class="lead" style="margin:4px 0 10px">Inserisci i valori dai rapporti di prova del laboratorio.</p>`}
          ${r.risultati.map(x => {
            const p = CSC.find(c => c.p === x.parametro) || CSC[0]; const v = num(x.valore); const over = v != null && v > p[r.colonna];
            return html`<div key=${x.id} style="display:grid;grid-template-columns:80px 1fr 80px 28px;gap:6px;align-items:center;margin-bottom:6px">
              <select class="inp" style="padding:8px 4px" value=${x.campione} onChange=${e => updRis(x.id, { campione: e.target.value })}>${risCamp.map(c => html`<option value=${c.codice}>${c.codice}</option>`)}</select>
              <select class="inp" style="padding:8px 4px" value=${x.parametro} onChange=${e => updRis(x.id, { parametro: e.target.value })}>${CSC.map(c => html`<option value=${c.p}>${c.p} (${c.u}) · CSC ${c[r.colonna]}</option>`)}</select>
              <input class="inp" inputmode="decimal" style=${'text-align:right;padding:8px' + (over ? ';color:var(--nc);font-weight:700;background:rgba(190,34,42,.07)' : '')} value=${x.valore} placeholder="Valore" onInput=${e => updRis(x.id, { valore: e.target.value })} />
              <button class="x" aria-label="Elimina risultato" onClick=${() => up(pp => ({ ...pp, risultati: pp.risultati.filter(y => y.id !== x.id) }))}>×</button></div>`;
          })}
          <button class="btn dashed" onClick=${addRis}>+ Aggiungi risultato</button>
        </div>`}
    `}

    ${T === 'firme' && html`<${FogliFirme} r=${r} up=${up} settings=${settings} />`}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    <input ref=${importInp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${doImport1} />
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { if (T === 'anag' || T === 'firme') setT(r.fase === 2 ? 'camp' : 'sop'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${T === 'sop' ? html`<button class="btn pri" onClick=${addRec}><${Icon} n="plus" s=${20} w=${2.4} /> Nuova area REC</button>`
        : T === 'camp' ? html`<button class="btn pri" onClick=${addCamp}><${Icon} n="plus" s=${20} w=${2.4} /> Nuovo campione ${mat.auto ? nextCode(tab) : mat.l}</button>`
        : html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[['Documenti', [
        (r.campioni.mca.length || r.campioni.fav.length) && { ic: 'gear', l: 'Laboratorio, offerta, codici analisi', fn: onSettings },
        T !== 'anag' && { ic: 'share', l: OD.account ? 'Carica su OneDrive' : 'Invia a OneDrive', fn: () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings) }]],
        ['Dati', [
          { ic: 'file', l: 'Importa da un DDA precedente', s: 'File JSON: riempie solo i campi ancora vuoti', fn: () => importInp.current.click() },
          { ic: 'paper', l: 'Scarica il modello JSON', fn: downloadDda1Template }]],
        opzArchivio({ r, settings, onDelete, elimina: 'Elimina l’indagine', firme: !firmeOn && (() => { up(q => prepFirme({ ...q }, settings, true)); setT('firme'); }) })]} />
  </div>`;
}
