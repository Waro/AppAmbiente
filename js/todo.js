/* ToDo (v63): cose da fare personali o collegate a un'attività, come in Todoist.
   Sono record di tipo 'todo' nello store «records»: si sincronizzano tra i dispositivi come le attività,
   ma non vanno su OneDrive nella cartella delle attività, né nel backup ZIP come cartella.
   Stati delle attività (avanzamento) e ToDo predefiniti per tipo e stato: anche qui. */

/* ---------------- stato di avanzamento dell'attività ----------------
   Colonne del Kanban. Si muove da solo (Programmazione → Programmata, data arrivata → In corso, «Concludi attività» → Report)
   oppure a mano dal Kanban o dal dettaglio; dopo una scelta a mano vale quella. */
const AVANZ = [
  ['programmata', 'Programmata', 'var(--muted)'],
  ['in_corso', 'In corso', 'var(--blue)'],
  ['report', 'Report', 'var(--text2)'],
  ['da_revisionare', 'Da revisionare', 'var(--warn)'],
  ['inviata', 'Inviata', 'var(--text2)'],
  ['conclusa', 'Conclusa', 'var(--ok)'],
];
const AVANZ_K = AVANZ.map(x => x[0]);
const avanzL = k => (AVANZ.find(x => x[0] === k) || AVANZ[0])[1];
const avanzC = k => (AVANZ.find(x => x[0] === k) || AVANZ[0])[2];
// tipi che hanno un avanzamento (le attività di campo; non fogli firme, appuntamenti, clienti, ToDo)
const AVANZ_TIPI = ['dda', 'mappatura', 'ra', 'radon', 'aria', 'hs', 'vs'];
function avanzBase(r) {
  if (r.conclusa) return 'report';
  if (r.type === 'radon') { const s = radonStato(r); return s === 'da_iniziare' ? 'programmata' : s === 'esiti' || s === 'terminata' ? 'report' : 'in_corso'; }
  if (r.data && r.data > today()) return 'programmata';
  return 'in_corso';
}
function avanzDi(r) {
  const b = avanzBase(r), s = r.avanzamento;
  if (!AVANZ_K.includes(s)) return b;
  return r.avanzMan || AVANZ_K.indexOf(s) >= AVANZ_K.indexOf(b) ? s : b;
}
// chiave dei ToDo predefiniti: la DDA si distingue per fase
const predefKey = r => r.type === 'dda' ? 'dda' + (r.fase || 1) : r.type;
const PREDEF_TIPI = [['dda1', 'DDA Fase 1', 'var(--t-dda)'], ['dda2', 'DDA Fase 2', 'var(--blue)'], ['mappatura', 'Mappatura MCA e FAV', 'var(--t-map)'], ['ra', 'Sopralluogo RA', 'var(--t-ra)'],
  ['radon', 'Campagna radon', 'var(--t-radon)'], ['aria', 'Monitoraggio aria', 'var(--t-aria)'], ['hs', 'Sopralluogo HSE', 'var(--t-hse)'], ['vs', 'Verbale HSE', 'var(--t-vs)']];
// voce: [testo, giorni (da oggi; in «Programmata» rispetto alla data dell'attività), priorità 1-4]
const PREDEF_BASE = (() => {
  const prep = ['Scaricare planimetrie e documenti in locale', -1, 3];
  const rev = { da_revisionare: [['Revisione del report', 3, 2]], inviata: [['Verificare la ricezione del report', 7, 3]] };
  const camp = { programmata: [prep], report: [['Inviare la scheda campioni al laboratorio', 1, 1], ['Controllare le sigle in scheda e in planimetria', 1, 2], ['Preparare il Word', 5, 3]], ...rev };
  return {
    dda1: { programmata: [prep], report: [['Preparare la relazione', 5, 2]], ...rev },
    dda2: camp, mappatura: camp,
    ra: { programmata: [['Avvisare il referente in sito', -2, 2]], report: [['Preparare la relazione', 5, 2]], ...rev },
    radon: { report: [['Inviare i dosimetri al laboratorio', 1, 1]], ...rev },
    aria: { report: [['Inviare i filtri al laboratorio', 1, 1]], ...rev },
    hs: { report: [['Preparare il report', 5, 2]], ...rev },
    vs: { report: [['Inviare il verbale', 2, 2]] },
  };
})();
// impostazioni: vuote = valori di partenza; dopo la prima modifica valgono le proprie (con _v)
const predefDi = s => { const p = (s || _settings || {}).todoPredef; return p && p._v ? p : PREDEF_BASE; };

/* ---------------- record ToDo ---------------- */
const PRIO = { 1: 'var(--tag-1)', 2: 'var(--tag-6)', 3: 'var(--tag-4)', 4: 'var(--faint)' };
const PRIO_L = { 1: 'Priorità 1', 2: 'Priorità 2', 3: 'Priorità 3', 4: 'Nessuna' };
const RICORRE = [['', 'Mai'], ['settimana', 'Ogni settimana'], ['mese', 'Ogni mese'], ['anno', 'Ogni anno']];
const newTodo = (x = {}) => ({ id: uid('td'), type: 'todo', titolo: '', note: '', data: '', ora: '', prio: 4, lista: '', att: '', fatto: 0,
  sotto: [], origine: 'mano', origineNota: '', ricorre: '', schema: REC_SCHEMA, createdAt: Date.now(), updatedAt: Date.now(), ...x });
const todoAperto = t => !t.fatto;
const todoScaduto = t => !t.fatto && t.data && t.data < today();
function todoProssima(t) {
  const d = t.data || today();
  const n = t.ricorre === 'settimana' ? dayShift(d, 7) : t.ricorre === 'mese' ? addMonths(d, 1) : t.ricorre === 'anno' ? addMonths(d, 12) : '';
  return n ? newTodo({ ...t, id: uid('td'), data: n, fatto: 0, sotto: (t.sotto || []).map(x => ({ ...x, fatto: 0 })), createdAt: Date.now(), updatedAt: Date.now() }) : null;
}
// ToDo predefiniti per un'attività appena entrata in uno stato (id fisso: due dispositivi non li duplicano)
function todoPredefPer(r, stato, todos, s) {
  const L = ((predefDi(s)[predefKey(r)] || {})[stato]) || [];
  const esiste = new Set(todos.map(t => t.id));
  return L.map(([t, g, p], i) => {
    const id = ('td_' + r.id + '_' + stato + '_' + i).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
    if (esiste.has(id)) return null;
    const rif = stato === 'programmata' && r.data ? r.data : today();
    return newTodo({ id, titolo: t, data: dayShift(rif, +g || 0), prio: +p || 4, att: r.id, origine: 'auto', origineNota: 'Creato in automatico entrando in «' + avanzL(stato) + '»' });
  }).filter(Boolean);
}

/* ---------------- inserimento rapido ----------------
   «Chiamare il referente domani 9 #Telefonate p1 @Via Roma»: data, ora, lista, priorità e attività dal testo. */
const GIORNI_SETT = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
function rapidoLeggi(testo, records) {
  let t = ' ' + String(testo || '') + ' ';
  const out = { data: '', ora: '', prio: 4, lista: '', att: '', parti: [] };
  const togli = (re, fn) => { t = t.replace(re, (...m) => { fn(m); return ' '; }); };
  togli(/\s#([^\s#@]+)/, m => { out.lista = m[1]; out.parti.push('#' + m[1]); });
  togli(/\sp([1-4])(?=\s)/i, m => { out.prio = +m[1]; out.parti.push('Priorità ' + m[1]); });
  togli(/\s@([^#@]+?)(?=\s+(?:#|p[1-4]\s|oggi|domani|dopodomani)|\s*$)/i, m => {
    const q = normT(m[1].trim()); if (!q) return;
    const r = records.filter(x => AVANZ_TIPI.includes(x.type) && !x._new).find(x => normT([placeLabel(x), x.codice, x.cliente, x.commessa].join(' ')).includes(q));
    if (r) { out.att = r.id; out.parti.push(TIPO_NOME(r) + ' · ' + placeLabel(r)); }
  });
  const oggi = today(), nt = normT(t);
  let d = '';
  if (/\sdopodomani\s/.test(nt)) d = dayShift(oggi, 2);
  else if (/\sdomani\s/.test(nt)) d = dayShift(oggi, 1);
  else if (/\soggi\s/.test(nt)) d = oggi;
  else {
    const g = GIORNI_SETT.findIndex(w => new RegExp('\\s' + w + '\\s').test(nt));
    if (g >= 0) { const w = new Date(oggi + 'T12:00:00').getDay(); d = dayShift(oggi, ((g - w + 7) % 7) || 7); }
    const m = /\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s/.exec(t);
    if (!d && m) { const y = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : oggi.slice(0, 4); d = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; if (!m[3] && d < oggi) d = (+y + 1) + d.slice(4); }
  }
  if (d) {
    out.data = d;
    // ora subito dopo il giorno: «domani 9», «domani alle 9:30»
    const re = /\s(oggi|domani|dopodomani|luned[iì]|marted[iì]|mercoled[iì]|gioved[iì]|venerd[iì]|sabato|domenica|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)(?:\s+alle)?(?:\s+(\d{1,2})(?:[:.](\d{2}))?)?(?=\s)/i;
    togli(re, m => { if (m[2] && +m[2] < 24) out.ora = m[2].padStart(2, '0') + ':' + (m[3] || '00'); });
    const w = whenLabel(d).l; out.parti.unshift(w.charAt(0).toUpperCase() + w.slice(1) + (out.ora ? ' ' + out.ora : ''));
  }
  out.titolo = t.replace(/\s+/g, ' ').trim();
  return out;
}

/* ---------------- componenti ---------------- */
function TodoCk({ t, onToggle }) {
  return html`<button type="button" class=${'td-ck' + (t.prio === 1 ? ' p1' : '') + (t.fatto ? ' done' : '')} style=${'--p:' + PRIO[t.prio || 4]}
    aria-label=${t.fatto ? 'Segna come da fare' : 'Segna come fatto'} aria-pressed=${!!t.fatto} onClick=${e => { e.stopPropagation(); onToggle(t); }}>
    <i>${t.fatto ? html`<${Icon} n="check" s=${12} w=${3.4} />` : null}</i></button>`;
}
function todoQuando(t) {
  if (!t.data) return '';
  const w = whenLabel(t.data);
  return (todoScaduto(t) ? (daysBetween(t.data, today()) === 1 ? 'Ieri' : fmtD(t.data).slice(0, 5)) : w.l) + (t.ora ? ' ' + t.ora : '');
}
function TodoMeta({ t, att }) {
  const ns = (t.sotto || []).length, nf = (t.sotto || []).filter(x => x.fatto).length;
  return html`<span class="td-meta">
    ${att && html`<span class="td-att" style=${'--c:' + TIPO_COL[att.type]}><i></i>${placeLabel(att)}</span>`}
    ${t.data && html`<span class=${todoScaduto(t) ? 'td-late' : ''}>${todoQuando(t)}</span>`}
    ${ns > 0 && html`<span>${nf}/${ns}</span>`}${t.lista && html`<span>#${t.lista}</span>`}${t.ricorre && html`<span>${RICORRE.find(x => x[0] === t.ricorre)[1].toLowerCase()}</span>`}</span>`;
}
// riga: tocco = apre; sul telefono si scorre a sinistra per Rimanda ed Elimina (la riga si stacca come card a sé)
function TodoRiga({ t, att, on, aperta, onOpen, onToggle, onRimanda, onElimina, onSwipe }) {
  const x0 = useRef(null);
  const down = e => { if (e.pointerType === 'mouse') return; x0.current = { x: e.clientX, y: e.clientY }; };
  const move = e => {
    if (!x0.current) return;
    const dx = e.clientX - x0.current.x, dy = Math.abs(e.clientY - x0.current.y);
    if (dy > 24) { x0.current = null; return; }
    if (dx < -50) { x0.current = null; onSwipe(t.id); vibra('tocco'); } else if (dx > 50 && aperta) { x0.current = null; onSwipe(null); }
  };
  const corpo = html`<div class=${'td-row' + (on ? ' on' : '') + (aperta ? ' solo' : '')} onPointerDown=${down} onPointerMove=${move} onPointerUp=${() => { x0.current = null; }}>
    <${TodoCk} t=${t} onToggle=${onToggle} />
    <button type="button" class=${'td-tx' + (t.fatto ? ' done' : '')} onClick=${() => aperta ? onSwipe(null) : onOpen(t)}><b>${t.titolo || 'Senza titolo'}</b><${TodoMeta} t=${t} att=${att} /></button></div>`;
  if (!aperta) return corpo;
  return html`<div class="td-swrow">${corpo}
    <div class="td-sacts">
      <button type="button" class="btn" onClick=${() => onRimanda(t)}><${Icon} n="clock" s=${18} /> Rimanda</button>
      <button type="button" class="btn danger" onClick=${() => onElimina(t)}><${Icon} n="trash" s=${18} /> Elimina</button></div></div>`;
}
function TodoRapido({ records, onAdd, att, autoFocus, placeholder = 'Aggiungi un ToDo' }) {
  const [v, setV] = useState('');
  const P = v.trim() ? rapidoLeggi(v, records) : null;
  const salva = () => { if (!P || !P.titolo) return; onAdd(newTodo({ titolo: P.titolo, data: P.data, ora: P.ora, prio: P.prio, lista: P.lista, att: att || P.att })); setV(''); vibra('tocco'); };
  return html`<div class="td-qa">
    <label class="td-qa-in"><${Icon} n="plus" s=${20} w=${2.4} /><input value=${v} placeholder=${placeholder} aria-label=${placeholder} autofocus=${autoFocus}
      onInput=${e => setV(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') salva(); if (e.key === 'Escape') setV(''); }} /></label>
    ${P && html`<div class="td-qa-chips">${P.parti.map(p => html`<span class="badge" key=${p}>${p}</span>`)}
      <span class="td-qa-hint">Invio per aggiungere · Esc per annullare</span></div>`}
  </div>`;
}
// dettaglio di un ToDo: tutto modificabile, si salva da solo
function TodoDettaglio({ t, records, onSave, onElimina, onClose }) {
  const set = p => onSave({ ...t, ...p, updatedAt: Date.now() });
  const att = t.att && records.find(r => r.id === t.att);
  const [nuova, setNuova] = useState('');
  const attivita = records.filter(r => AVANZ_TIPI.includes(r.type) && !r._new && avanzDi(r) !== 'conclusa').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  return html`<div class="td-det">
    <div class="row" style="align-items:flex-start;gap:var(--sp-3)"><${TodoCk} t=${t} onToggle=${() => set({ fatto: t.fatto ? 0 : Date.now() })} />
      <div class="grow"><${InpGrow} label="Titolo" value=${t.titolo} set=${v => set({ titolo: v })} /></div>
      ${onClose && html`<button class="btn-icon" aria-label="Chiudi" onClick=${onClose}><${Icon} n="x" s=${18} /></button>`}</div>
    ${t.origineNota && html`<p class="lead mt-2" style="font-size:var(--fs-sm)">${t.origineNota}</p>`}
    ${att && html`<div class="card-navy td-nv mt-3"><span class="nv-eye">Collegato a</span><b>${TIPO_NOME(att)} · ${placeLabel(att)}</b>
      <span class="next-line">${[att.codice, att.commessa && 'commessa ' + att.commessa, avanzL(avanzDi(att))].filter(Boolean).join(' · ')}</span></div>`}
    <div class="grid2 mt-3">
      <${Inp} type="date" label="Data" value=${t.data} set=${v => set({ data: v })} />
      <${Inp} type="time" label="Ora" value=${t.ora} set=${v => set({ ora: v })} />
    </div>
    <div class="fld mt-3"><span>Priorità</span></div>
    <div class="seg mt-1">${[1, 2, 3, 4].map(p => html`<button key=${p} class=${(t.prio || 4) === p ? 'on' : ''} onClick=${() => set({ prio: p })}>
      <span class=${'td-pdot' + (p === 1 ? ' p1' : '')} style=${'--p:' + PRIO[p]}></span>${p === 4 ? 'Nessuna' : p}</button>`)}</div>
    <div class="grid2 mt-3">
      <${Inp} label="Lista" value=${t.lista} set=${v => set({ lista: v.replace(/^#/, '').trim() })} placeholder="es. Telefonate" />
      <label class="fld"><span>Ripeti</span><select value=${t.ricorre || ''} onChange=${e => set({ ricorre: e.target.value })}>${RICORRE.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>
    </div>
    <label class="fld mt-3"><span>Attività collegata</span><select value=${t.att || ''} onChange=${e => set({ att: e.target.value })}>
      <option value="">Nessuna</option>${att && !attivita.includes(att) && html`<option value=${att.id}>${TIPO_NOME(att)} · ${placeLabel(att)}</option>`}
      ${attivita.map(r => html`<option value=${r.id}>${TIPO_NOME(r)} · ${placeLabel(r)}${r.data ? ' · ' + fmtD(r.data) : ''}</option>`)}</select></label>
    <div class="sec-h"><h3>Sottoattività${(t.sotto || []).length > 0 && ' · ' + t.sotto.filter(x => x.fatto).length + '/' + t.sotto.length}</h3></div>
    <div class="card" style="padding:0 var(--sp-3)">
      ${(t.sotto || []).map((x, i) => html`<div class="td-sub" key=${x.id}>
        <button type="button" class=${'td-ck sm' + (x.fatto ? ' done' : '')} style="--p:var(--faint)" aria-label=${x.fatto ? 'Segna come da fare' : 'Segna come fatto'}
          onClick=${() => set({ sotto: t.sotto.map((y, j) => j === i ? { ...y, fatto: y.fatto ? 0 : Date.now() } : y) })}><i>${x.fatto ? html`<${Icon} n="check" s=${11} w=${3.4} />` : null}</i></button>
        <span class=${'grow' + (x.fatto ? ' td-done' : '')}>${x.t}</span>
        <button type="button" class="btn-icon" aria-label="Togli la sottoattività" onClick=${() => set({ sotto: t.sotto.filter((y, j) => j !== i) })}><${Icon} n="x" s=${16} /></button></div>`)}
      <label class="td-sub"><${Icon} n="plus" s=${18} /><input class="grow td-sub-in" value=${nuova} placeholder="Aggiungi una sottoattività" onInput=${e => setNuova(e.target.value)}
        onKeyDown=${e => { if (e.key === 'Enter' && nuova.trim()) { set({ sotto: [...(t.sotto || []), { id: uid('st'), t: nuova.trim(), fatto: 0 }] }); setNuova(''); } }} /></label>
    </div>
    <div class="mt-3"><${Area} label="Note" value=${t.note} set=${v => set({ note: v })} rows=${3} /></div>
    <button class="btn danger block mt-4" onClick=${() => onElimina(t)}><${Icon} n="trash" s=${18} /> Elimina il ToDo</button>
  </div>`;
}
function TodoSheet({ t, records, onSave, onElimina, onClose }) {
  useBackClose(onClose);
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="ToDo">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>ToDo</b><span></span></div>
    <div class="sheet-body"><${TodoDettaglio} t=${t} records=${records} onSave=${onSave} onElimina=${x => { onClose(); onElimina(x); }} /></div></div></div>`;
}

/* ---------------- azioni comuni (vista ToDo, card nell'attività, avviso del Kanban) ---------------- */
function useTodoAzioni(saveRec, removeRec) {
  const toggle = async t => {
    if (t.fatto) { await saveRec({ ...t, fatto: 0, updatedAt: Date.now() }); return; }
    await saveRec({ ...t, fatto: Date.now(), updatedAt: Date.now() }); vibra('ok');
    const n = todoProssima(t); if (n) { await saveRec(n); toast('Fatto · il prossimo è il ' + fmtD(n.data)); }
  };
  const rimanda = async t => { const d = dayShift(t.data && t.data > today() ? t.data : today(), 1); await saveRec({ ...t, data: d, updatedAt: Date.now() }); toast(d === dayShift(today(), 1) ? 'Rimandato a domani' : 'Rimandato al ' + fmtD(d)); };
  const elimina = t => eliminaConAnnulla({ msg: 'ToDo eliminato', togli: () => removeRec(t), rimetti: () => saveRec({ ...t, updatedAt: Date.now() }) });
  return { toggle, rimanda, elimina };
}

/* ---------------- vista ToDo ---------------- */
const TD_VISTE = [['oggi', 'Oggi'], ['sett', '7 giorni'], ['tutti', 'Tutti'], ['att', 'Per attività']];
function TodoView({ records, todos, settings, saveRec, removeRec, wide, openRec, acts }) {
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('nembo_td_v') || 'oggi'; } catch (e) { return 'oggi'; } });
  const [lista, setLista] = useState('');
  const [sel, setSel] = useState(null);
  const [sw, setSw] = useState(null);
  const [fatti, setFatti] = useState(() => new Set()); // fatti in questa visita: restano visibili, barrati
  useEffect(() => { try { localStorage.setItem('nembo_td_v', vista); } catch (e) {} }, [vista]);
  const A = useTodoAzioni(saveRec, removeRec);
  const toggle = t => { if (!t.fatto) setFatti(s => new Set([...s, t.id])); A.toggle(t); };
  const byId = useMemo(() => Object.fromEntries(records.map(r => [r.id, r])), [records]);
  const t0 = today(), t7 = dayShift(t0, 7);
  const liste = [...new Set(todos.map(t => t.lista).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  const vis = todos.filter(t => (todoAperto(t) || fatti.has(t.id)) && (!lista || t.lista === lista));
  const ord = (a, b) => (a.data || '9999').localeCompare(b.data || '9999') || (a.ora || '99').localeCompare(b.ora || '99') || (a.prio || 4) - (b.prio || 4);
  let gruppi;
  if (vista === 'att') {
    const G = {};
    vis.forEach(t => { const k = t.att && byId[t.att] ? t.att : ''; (G[k] = G[k] || []).push(t); });
    gruppi = Object.entries(G).sort((a, b) => (a[0] ? 0 : 1) - (b[0] ? 0 : 1)).map(([k, L]) => ({ k, h: k ? TIPO_NOME(byId[k]) + ' · ' + placeLabel(byId[k]) : 'Senza attività', L: L.sort(ord), c: k ? TIPO_COL[byId[k].type] : null }));
  } else {
    const fino = vista === 'oggi' ? t0 : vista === 'sett' ? t7 : '9999';
    const L = vis.filter(t => vista === 'tutti' || (t.data && t.data <= fino));
    gruppi = [
      { k: 'scad', h: 'Scaduti', w: true, L: L.filter(t => t.data && t.data < t0).sort(ord) },
      { k: 'oggi', h: 'Oggi', L: L.filter(t => t.data === t0).sort(ord) },
      ...(vista === 'oggi' ? [] : [...new Set(L.filter(t => t.data > t0).map(t => t.data))].sort().map(d => ({ k: d, h: whenLabel(d).l, L: L.filter(t => t.data === d).sort(ord) }))),
      ...(vista === 'tutti' ? [{ k: 'senza', h: 'Senza data', L: L.filter(t => !t.data).sort(ord) }] : []),
    ].filter(g => g.L.length);
  }
  const nOggi = todos.filter(t => todoAperto(t) && t.data && t.data <= t0).length;
  const cur = sel && todos.find(t => t.id === sel);
  const apri = t => { setSw(null); setSel(t.id); };
  const add = t => { saveRec(t); toast(t.data ? 'Aggiunto · ' + whenLabel(t.data).l : 'Aggiunto'); };
  // la riga scorsa si stacca dal gruppo e diventa una card a sé, con i pulsanti a lato
  const riga = t => html`<${TodoRiga} key=${t.id} t=${t} att=${byId[t.att]} on=${wide && sel === t.id} aperta=${!wide && sw === t.id} onOpen=${apri} onToggle=${toggle}
    onRimanda=${x => { setSw(null); A.rimanda(x); }} onElimina=${x => { setSw(null); A.elimina(x); }} onSwipe=${setSw} />`;
  const elenco = html`<div class="content form td-view">
    ${!wide && html`<${LargeTitle} top title="ToDo" sub=${nOggi ? nOggi + ' da fare oggi' : 'Niente in scadenza oggi'} acts=${acts} />`}
    <${Suggerimento} id="todo" />
    <div class="seg mb-2">${TD_VISTE.map(([k, l]) => html`<button key=${k} class=${vista === k ? 'on' : ''} onClick=${() => { setVista(k); setSw(null); }}>${l}</button>`)}</div>
    ${liste.length > 0 && html`<div class="tags-row mb-2" role="group" aria-label="Liste">
      ${liste.map(l => html`<button key=${l} class="tag" aria-pressed=${lista === l} style=${tagStyle(l, lista === l)} onClick=${() => setLista(lista === l ? '' : l)}>#${l}</button>`)}</div>`}
    <${TodoRapido} records=${records} onAdd=${add} />
    ${!gruppi.length ? html`<div class="card ok-card mt-3"><span class="t"><b>${vista === 'oggi' ? 'Niente da fare oggi' : 'Nessun ToDo'}</b><small>Scrivi qui sopra cosa c'è da fare: «domani 9», «#lista», «p1» e «@indirizzo» si riconoscono da soli.</small></span><span class="ok-ic"><${Icon} n="check" s=${20} w=${2.4} /></span></div>`
      : gruppi.map(g => html`<div key=${g.k}><div class=${'td-gh' + (g.w ? ' w' : '')}>${g.c && html`<i class="mdot" style=${'background:' + g.c}></i>`}${g.h}<span>${g.L.length}</span></div>
        ${g.L.filter(t => !wide && sw === t.id).map(riga)}
        ${g.L.some(t => wide || sw !== t.id) && html`<div class="card td-card">${g.L.filter(t => wide || sw !== t.id).map(riga)}</div>`}</div>`)}
    ${!wide && gruppi.length > 0 && html`<p class="lead mt-3" style="font-size:var(--fs-sm);text-align:center">Scorri a sinistra per rimandare o eliminare</p>`}
  </div>`;
  if (!wide) return html`${elenco}${cur && html`<${TodoSheet} t=${cur} records=${records} onSave=${saveRec} onElimina=${A.elimina} onClose=${() => setSel(null)} />`}`;
  return html`<div class="split-body">
    <div class="split-list">${elenco}</div>
    <div class="split-detail">${cur ? html`<div class="content form"><${TodoDettaglio} key=${cur.id} t=${cur} records=${records} onSave=${saveRec} onElimina=${x => { setSel(null); A.elimina(x); }} onClose=${() => setSel(null)} />
      ${cur.att && byId[cur.att] && html`<button class="btn block mt-2" onClick=${() => openRec(byId[cur.att])}>Apri l'attività</button>`}</div>`
      : html`<div class="split-empty"><b>Nessun ToDo selezionato</b>Toccane uno dall'elenco per vederlo qui. Q apre l'inserimento rapido da qualunque schermata.</div>`}</div></div>`;
}

// card «ToDo» dentro un'attività (dettaglio da PC e Riepilogo)
function TodoCard({ r, todos, records, saveRec, removeRec, onOpen }) {
  const A = useTodoAzioni(saveRec, removeRec);
  const L = todos.filter(t => t.att === r.id).sort((a, b) => (a.fatto ? 1 : 0) - (b.fatto ? 1 : 0) || (a.data || '9999').localeCompare(b.data || '9999'));
  const fatti = L.filter(t => t.fatto).length;
  return html`<div class="sec-h"><h3>ToDo${L.length > 0 && ' · ' + fatti + '/' + L.length}</h3></div>
    <div class="card td-card">
      ${L.map(t => html`<${TodoRiga} key=${t.id} t=${t} att=${null} onOpen=${onOpen} onToggle=${A.toggle} onSwipe=${() => {}} />`)}
      <${TodoRapido} records=${records} att=${r.id} onAdd=${t => { saveRec(t); toast('ToDo aggiunto'); }} placeholder="Aggiungi un ToDo a questa attività" />
    </div>`;
}

/* ---------------- impostazioni: ToDo predefiniti ---------------- */
function TodoPredefCard({ s, set }) {
  const [tipo, setTipo] = useState('mappatura');
  const P = predefDi(s);
  const salva = nuovo => set({ todoPredef: { ...nuovo, _v: 1 } });
  const cur = P[tipo] || {};
  const cambia = (stato, L) => salva({ ...P, [tipo]: { ...cur, [stato]: L } });
  return html`<div class="card"><label class="fg-sw"><span>Aggiungi in automatico</span><${Toggle} on=${s.todoAuto !== false} label="Aggiungi in automatico" set=${v => set({ todoAuto: v })} /></label>
      <p class="lead" style="margin:var(--sp-2) 0 0;font-size:var(--fs-sm)">Quando un'attività entra in uno stato, Nembo aggiunge questi ToDo collegati a lei. La scadenza parte dal giorno in cui cambia lo stato (in «Programmata» dalla data dell'attività). Spostare un'attività con ToDo aperti mostra solo un avviso.</p></div>
    <label class="fld mt-3"><span>Tipo di attività</span><select value=${tipo} onChange=${e => setTipo(e.target.value)}>${PREDEF_TIPI.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>
    ${AVANZ.map(([k, l, c]) => { const L = cur[k] || []; return html`<div key=${tipo + k}><div class="sec-h"><h3><i class="mdot" style=${'background:' + c}></i> Entrando in «${l}»</h3></div>
      <div class="card td-pre">
        ${L.map((v, i) => html`<div class="td-pre-row" key=${i}>
          <input class="inp grow" value=${v[0]} aria-label="Testo del ToDo" onChange=${e => cambia(k, L.map((x, j) => j === i ? [e.target.value, x[1], x[2]] : x))} />
          <label class="td-pre-g"><input class="inp" type="number" value=${v[1]} aria-label=${k === 'programmata' ? 'Giorni rispetto alla data dell\'attività' : 'Entro quanti giorni'} onChange=${e => cambia(k, L.map((x, j) => j === i ? [x[0], +e.target.value || 0, x[2]] : x))} /><span>gg</span></label>
          <select class="inp td-pre-p" value=${String(v[2])} aria-label="Priorità" onChange=${e => cambia(k, L.map((x, j) => j === i ? [x[0], x[1], +e.target.value] : x))}>${[1, 2, 3, 4].map(p => html`<option value=${p}>${PRIO_L[p]}</option>`)}</select>
          <button class="btn-icon" aria-label="Togli la voce" onClick=${() => cambia(k, L.filter((x, j) => j !== i))}><${Icon} n="x" s=${16} /></button></div>`)}
        ${!L.length && html`<p class="lead" style="font-size:var(--fs-sm);margin:var(--sp-2) 0">Nessun ToDo per questo stato.</p>`}
        <button class="btn dashed mt-2" onClick=${() => cambia(k, [...L, ['Nuovo ToDo', 1, 3]])}><${Icon} n="plus" s=${18} /> Aggiungi voce</button></div></div>`; })}
    ${s.todoPredef && s.todoPredef._v && html`<button class="btn block mt-4" onClick=${() => { if (confirm('Ripristinare i ToDo predefiniti di partenza per tutti i tipi?')) set({ todoPredef: {} }); }}>Ripristina i valori di partenza</button>`}`;
}

/* ---------------- ToDo predefiniti: quando un'attività cambia stato ----------------
   Il registro «todo_visti» (kv) ricorda l'ultimo stato visto per ogni attività. Al primo avvio della v63
   si registra lo stato di tutte le attività senza creare nulla, così non arrivano ToDo per il lavoro già fatto. */
function useTodoPredef(records, todos, settings, saveRec, ready) {
  const busy = useRef(false);
  useEffect(() => {
    if (!ready || busy.current) return;
    busy.current = true;
    (async () => {
      const visti = await DB.get('todo_visti'); const primo = !visti; const v = { ...(visti || {}) }; let cambiati = false; const nuovi = [];
      for (const r of records) {
        if (!AVANZ_TIPI.includes(r.type) || r._new) continue;
        const st = avanzDi(r);
        if (v[r.id] === st) continue;
        if (!primo && settings.todoAuto !== false) nuovi.push(...todoPredefPer(r, st, [...todos, ...nuovi], settings));
        v[r.id] = st; cambiati = true;
      }
      if (cambiati) await DB.set('todo_visti', v);
      for (const t of nuovi) await saveRec(t);
      if (nuovi.length) toast(nuovi.length === 1 ? 'Aggiunto 1 ToDo predefinito' : 'Aggiunti ' + nuovi.length + ' ToDo predefiniti');
    })().catch(e => console.warn('ToDo predefiniti', e)).finally(() => { busy.current = false; });
  }, [records, ready]);
}
