/* Programmazione: ora e durata delle attività, vista a fasce orarie (stile calendario), JSON e file .ics.
   Ogni attività ha data + ora di inizio + durata (minuti); per il radon valgono i tre momenti (posa e ritiri). */

const DURATE_BASE = { dda: 180, mappatura: 180, ra: 120, radon: 60, aria: 300, hs: 180, vs: 120, firme: 60 };
const TIPI_AG = {
  dda: { l: 'DDA', c: 'var(--warn)' }, mappatura: { l: 'Mappatura', c: 'var(--mca)' }, ra: { l: 'RA', c: '#7a3db8' },
  radon: { l: 'Radon', c: 'var(--ok)' }, aria: { l: 'Aria', c: '#0a6ebd' }, hs: { l: 'HSE', c: 'var(--blue)' }, vs: { l: 'Verbale', c: '#2f7d5b' }, firme: { l: 'Firme', c: 'var(--navy)' },
  app: { l: 'Appuntamento', c: '#64748b' },
};
// appuntamento: impegno in agenda che non è un sopralluogo (riunione, consegna, telefonata…)
const newApp = (x = {}) => ({ id: uid('ap'), type: 'app', codice: '', titolo: '', luogo: '', note: '', data: today(), ora: '', durata: 60, stato: '', createdAt: Date.now(), updatedAt: Date.now(), ...x });
const durataBase = (tipo, s) => +(((s || _settings || {}).durate || {})[tipo]) || DURATE_BASE[tipo] || 60;
const hm2m = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };
const m2hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const fmtDur = m => m < 60 ? m + ' min' : (m % 60 ? `${Math.floor(m / 60)} h ${m % 60}` : `${m / 60} h`);
const DUR_OPT = [30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480];
// stato della programmazione: se non scelto, da programmare senza ora, in attesa con l'ora
const PROG = [['confermato', 'Confermato', 'var(--ok)'], ['in_attesa', 'In attesa', 'var(--warn)'], ['da_programmare', 'Da programmare', 'var(--muted)'], ['annullato', 'Annullato', 'var(--danger)']];
const progDi = (stato, ora) => stato && stato !== 'da_programmare' ? stato : (hm2m(ora) != null ? 'in_attesa' : 'da_programmare');
const progL = k => (PROG.find(x => x[0] === k) || PROG[2])[1];
// quando cambia l'ora, "da programmare" e "in attesa" si aggiornano da soli; confermato e annullato restano
const progPatch = (p, cur) => ('ora' in p && !('stato' in p) && cur !== 'confermato' && cur !== 'annullato') ? { ...p, stato: hm2m(p.ora) != null ? 'in_attesa' : 'da_programmare' } : p;

// campi Ora + Durata, da mettere accanto alla Data nelle schede
function OraDurata({ ora, durata, tipo, set, disabled, stato }) {
  const d = durata || durataBase(tipo);
  const st = progDi(stato, ora);
  const fine = hm2m(ora) != null ? m2hm(Math.min(hm2m(ora) + d, 24 * 60 - 1)) : '';
  return html`<label class="fld"><span>Ora${fine ? html` <small class="lock">· fine ${fine}</small>` : ''}</span>
      <input type="time" step="1800" value=${ora || ''} disabled=${disabled} onInput=${e => set(progPatch({ ora: e.target.value }, stato))} /></label>
    <label class="fld"><span>Durata prevista</span>
      <select value=${String(d)} disabled=${disabled} onChange=${e => set({ durata: +e.target.value })}>
        ${[...new Set([...DUR_OPT, d])].sort((a, b) => a - b).map(m => html`<option value=${m}>${fmtDur(m)}</option>`)}</select></label>
    <label class="fld"><span>Stato <i class="mdot" style=${'background:' + (PROG.find(x => x[0] === st) || PROG[2])[2]}></i></span>
      <select value=${st} disabled=${disabled} onChange=${e => set({ stato: e.target.value })}>${PROG.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>`;
}

/* ---------------- elementi in agenda ---------------- */
// { key, rec, i (momento radon o null), data, ora, durata, tipo, titolo, sub, previsto }
function agendaItems(records, s) {
  const out = [];
  for (const r of records) {
    if (r._new) continue;
    if (r.type === 'radon') {
      const next = r.momenti.findIndex(m => !m.confermato);
      r.momenti.forEach((m, i) => {
        let data = m.data, previsto = false;
        if (!data && i === next && i > 0) { data = addMonths(r.momenti[i - 1].data, 6); previsto = true; }
        if (!data || (!m.confermato && i !== next)) return;
        out.push({ key: r.id + ':' + i, rec: r, i, data, ora: m.ora || '', durata: m.durata || durataBase('radon', s), tipo: 'radon', previsto, stato: progDi(m.stato, m.ora),
          titolo: ['Radon', ['Posa', 'Ritiro F1', 'Ritiro F2'][i], r.commessa || r.insegna].filter(Boolean).join(' · '), sub: placeLabel(r) || r.cliente || '' });
      });
    } else if (r.type === 'app') {
      if (r.data) out.push({ key: r.id, rec: r, i: null, data: r.data, ora: r.ora || '', durata: r.durata || 60, tipo: 'app', stato: progDi(r.stato, r.ora), titolo: r.titolo || 'Appuntamento', sub: r.luogo || '' });
    } else if (r.data && TIPI_AG[r.type]) {
      out.push({ key: r.id, rec: r, i: null, data: r.data, ora: r.ora || '', durata: r.durata || durataBase(r.type, s), tipo: r.type, stato: progDi(r.stato, r.ora),
        titolo: [TIPI_AG[r.type].l + (r.type === 'dda' ? ' F' + r.fase : r.type === 'hs' ? ' ' + (r.formato === 'sintetico' ? 'Sintetico' : 'Esteso') : ''), r.commessa || r.codice].filter(Boolean).join(' · '),
        sub: [r.cliente, placeLabel(r)].filter(Boolean).join(' · ') });
    }
  }
  return out;
}
// nuova versione del record con data/ora/durata cambiate per quell'elemento
function agendaPatch(it, p) {
  const r = it.rec; p = progPatch(p, it.i == null ? r.stato : (r.momenti[it.i] || {}).stato);
  if (it.i == null) return { ...r, ...p, updatedAt: Date.now() };
  return { ...r, momenti: r.momenti.map((m, j) => j === it.i ? { ...m, ...p } : m), updatedAt: Date.now() };
}

/* ---------------- file .ics (Outlook, Google, telefono) ---------------- */
function icsEvents(items) {
  const esc = t => String(t || '').replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\r?\n/g, '\\n');
  const dt = (d, min) => { const x = new Date(d + 'T00:00:00'); x.setMinutes(min); const p = n => String(n).padStart(2, '0');
    return `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`; };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = items.map(it => {
    const st = hm2m(it.ora); const r = it.rec;
    const when = st == null ? [`DTSTART;VALUE=DATE:${it.data.replace(/-/g, '')}`] : [`DTSTART:${dt(it.data, st)}`, `DTEND:${dt(it.data, st + it.durata)}`];
    return ['BEGIN:VEVENT', `UID:${it.key.replace(/[^\w:-]/g, '')}-${it.data}@nembo`, `DTSTAMP:${stamp}`, ...when,
      `STATUS:${it.stato === 'confermato' ? 'CONFIRMED' : it.stato === 'annullato' ? 'CANCELLED' : 'TENTATIVE'}`, `SUMMARY:${esc((it.stato === 'annullato' ? 'ANNULLATO · ' : '') + it.titolo)}`, `LOCATION:${esc(r.type === 'app' ? r.luogo : placeDoc(r))}`, `DESCRIPTION:${esc(r.type === 'app' ? r.note : [r.codice, r.cliente, r.commessa && 'Commessa ' + r.commessa].filter(Boolean).join(' - '))}`, 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nembo//Programmazione//IT', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
async function shareIcs(items, name) {
  if (!items.length) { toast('Nessuna attività da esportare'); return; }
  await shareFiles([{ blob: new Blob([icsEvents(items)], { type: 'text/calendar' }), name }], name);
}

/* ---------------- JSON: PMC/mappatura in una fascia, oppure piano di più sopralluoghi ---------------- */
const PIANO_TIPI = { ra: ['ra', {}], dda1: ['dda', { fase: 1 }], dda2: ['dda', { fase: 2 }], mappatura: ['mappatura', {}], radon: ['radon', {}],
  hsE: ['hs', { formato: 'esteso' }], hsS: ['hs', { formato: 'sintetico' }], vs: ['vs', {}], firme: ['firme', {}], aria: ['aria', {}] };
const PIANO_MODELLO = { type: 'nembo-programmazione', attivita: [
  { tipo: 'ra', data: '2026-11-03', ora: '09:00', durata: 120, stato: 'confermato', commessa: '000/26', cliente: 'Cliente', citta: 'Città', indirizzo: 'Via e numero civico', sito: '', note: 'senza manufatti: Nembo li riprende dall\'RA precedente dello stesso immobile (codice sito, oppure indirizzo + città)' },
  { tipo: 'ra', data: '2026-11-04', ora: '09:00', durata: 120, commessa: '000/26', cliente: 'Cliente', citta: 'Città', indirizzo: 'Via e numero civico', sito: '', incaricoDal: '2026-04-01', incaricoAl: '2027-03-31', note: 'sito nuovo: manufatti come nel modello RA',
    manufatti: [{ codice: 'M1', ubicazione: 'Copertura', descrizione: 'Lastre in cemento-amianto', tipologia: 'compatto', quantita: '120 m²', statoPrecedente: '', notePrecedenti: '' }] },
  { tipo: 'dda1', data: '2026-11-03', ora: '14:00', durata: 180, commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', note: 'tipi: ra, dda1, dda2, mappatura, radon (posa), aria, hsE, hsS, vs, firme; stato (facoltativo): confermato, in_attesa, da_programmare, annullato' }] };
function newOfType(tipo, all, s, extra = {}) {
  const [t, p] = PIANO_TIPI[tipo] || [tipo, {}];
  const base = t === 'dda' ? newDda(all, s) : t === 'mappatura' ? newMappatura(all, s) : t === 'ra' ? newRa(all, s) : t === 'hs' ? newHs(all, s, p.formato) : t === 'firme' ? newFirmeRec(all, s) : t === 'aria' ? newAria(all, s) : t === 'vs' ? newVerbale(all, s) : newRadon(s);
  const r = { ...base, ...p };
  const { data, ora, durata, stato, ...rest } = extra;
  Object.assign(r, rest);
  const st = stato || progDi('', ora);
  if (t === 'radon') r.momenti = r.momenti.map((m, i) => i ? m : { ...m, data: data || '', ora: ora || '', durata, stato: st });
  else Object.assign(r, { data: data || r.data, ora: ora || '', durata, stato: st });
  return r;
}
// restituisce i record da salvare
async function agendaJson(text, slot, records, s) {
  let d; try { d = JSON.parse(text); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (d && d.type === 'nembo-programmazione') {
    const list = Array.isArray(d.attivita) ? d.attivita : [];
    const all = [...records], out = []; let saltate = 0, ripresi = 0, conMan = 0;
    for (const x of list) {
      if (!x || !PIANO_TIPI[x.tipo] || !/^\d{4}-\d{2}-\d{2}$/.test(x.data || '')) { saltate++; continue; }
      const str = v => (v == null ? '' : String(v)).trim();
      const ora = /^\d{1,2}:\d{2}$/.test(x.ora || '') ? x.ora.padStart(5, '0') : '';
      const dup = agendaItems(all, s).some(it => it.data === x.data && it.ora === ora && it.rec.indirizzo === str(x.indirizzo) && it.tipo === PIANO_TIPI[x.tipo][0]);
      if (dup) { saltate++; continue; }
      const stato = PROG.some(p => p[0] === x.stato) ? x.stato : progDi('', ora);
      const r = newOfType(x.tipo, all, s, { data: x.data, ora, stato, durata: +x.durata || durataBase(PIANO_TIPI[x.tipo][0], s),
        commessa: str(x.commessa), cliente: str(x.cliente), citta: str(x.citta), indirizzo: str(x.indirizzo), sito: str(x.sito) });
      if (x.note && 'appunti' in r) r.appunti = str(x.note);
      if (r.type === 'ra') {
        for (const k of ['fonte', 'incaricoDal', 'incaricoAl']) if (x[k]) r[k] = str(x[k]);
        if (Array.isArray(x.manufatti) && x.manufatti.length) {
          // manufatti nel piano (primo anno o sito nuovo): stesso formato dell'import RA
          try { const { patch } = await importRa(JSON.stringify({ manufatti: x.manufatti }), r); Object.assign(r, patch); conMan++; } catch (e) { /* riga senza manufatti validi */ }
        } else {
          const prev = raPrecedente(all, r);
          if (prev) { Object.assign(r, await raRiprendi(prev, r)); ripresi++; }
        }
      }
      all.push(r); out.push(r);
    }
    if (!out.length) throw new Error(saltate ? 'nessuna attività nuova: righe già presenti o senza tipo/data' : 'il piano non contiene attività');
    const det = [conMan && `${conMan} RA con i manufatti del piano`, ripresi && `${ripresi} RA con i manufatti ripresi dall'anno precedente`].filter(Boolean).join(', ');
    return { recs: out, msg: `${out.length} ${out.length === 1 ? 'attività programmata' : 'attività programmate'}${det ? ': ' + det : ''}${saltate ? ` (${saltate} saltate)` : ''}` };
  }
  if (Array.isArray(d) || (d && (d.type === 'ra-mappatura' || Array.isArray(d.manufatti)))) {
    if (!slot) throw new Error('scegli prima la fascia oraria in cui mettere il sopralluogo RA');
    const r = newOfType('ra', records, s, { data: slot.data, ora: slot.ora, durata: durataBase('ra', s) });
    const { patch, nuovi, foto } = await importRa(text, r);
    return { recs: [{ ...r, ...patch }], open: true, msg: `Sopralluogo RA programmato con ${nuovi} manufatti${foto ? ' e ' + foto + ' foto' : ''}` };
  }
  throw new Error('il file non è né un piano di programmazione né una mappatura/PMC per l\'RA');
}

/* ---------------- vista ---------------- */
const SLOT = 30, PX = 30; // 30 minuti = 30 px
const dayShift = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const mondayOf = d => { const x = new Date(d + 'T12:00:00'); const w = (x.getDay() + 6) % 7; return dayShift(d, -w); };
// colonne per i blocchi sovrapposti
function layout(items) {
  const ev = items.map(it => ({ it, s: hm2m(it.ora), e: hm2m(it.ora) + it.durata })).sort((a, b) => a.s - b.s || b.e - a.e);
  let group = [], end = -1; const out = [];
  const flush = () => { const cols = []; for (const x of group) { let c = cols.findIndex(e => e <= x.s); if (c < 0) { c = cols.length; cols.push(0); } cols[c] = x.e; x.col = c; } group.forEach(x => { x.n = cols.length; out.push(x); }); group = []; };
  for (const x of ev) { if (x.s >= end && group.length) flush(); group.push(x); end = Math.max(end, x.e); }
  if (group.length) flush();
  return out;
}

const VISTE = [['day', 'Giorno'], ['week', 'Settimana'], ['month', 'Mese']];
const monthShift = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(1); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };
const meseL = d => { const s = new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const giornoL = d => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
// scorrimento orizzontale col dito (sul telefono): sinistra = avanti, destra = indietro
function useSwipe(fn) {
  const st = useRef(null), swiped = useRef(false);
  return {
    swiped,
    on: {
      onPointerDown: e => { if (e.pointerType !== 'mouse') st.current = { x: e.clientX, y: e.clientY }; },
      onPointerUp: e => {
        const s0 = st.current; st.current = null; if (!s0) return;
        const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > 1.6 * Math.abs(dy)) { swiped.current = true; setTimeout(() => { swiped.current = false; }, 300); fn(dx < 0 ? 1 : -1); }
      },
      onPointerCancel: () => { st.current = null; },
    },
  };
}

function Agenda({ records, settings, saveRec, openRec, removeRec, bell }) {
  const [day, setDay] = useState(() => { try { return sessionStorage.getItem('nembo_ag') || today(); } catch (e) { return today(); } });
  const [view, setView] = useState(() => { try { return localStorage.getItem('nembo_ag_v') || 'day'; } catch (e) { return 'day'; } });
  const [sel, setSel] = useState(null);     // elemento toccato
  const [slot, setSlot] = useState(null);   // fascia vuota toccata { data, ora }
  const [add, setAdd] = useState(null);     // foglio "Nuovo": { data, ora, tab, rec }
  const [place, setPlace] = useState(null); // elemento da collocare
  const [drag, setDrag] = useState(null);
  const grid = useRef(), scroller = useRef(); const fileRef = useRef(); const pendingSlot = useRef(null); const dragged = useRef(false);
  useEffect(() => { try { sessionStorage.setItem('nembo_ag', day); } catch (e) {} }, [day]);
  useEffect(() => { try { localStorage.setItem('nembo_ag_v', view); } catch (e) {} }, [view]);
  // il + (anche quello della barra in alto su tablet e PC) apre "Nuovo"
  useEffect(() => { const f = () => setAdd({ data: day, ora: '', tab: 'app' }); addEventListener('nembo-ag-add', f); return () => removeEventListener('nembo-ag-add', f); }, [day]);
  const items = agendaItems(records, settings);
  const week = [...Array(7)].map((_, i) => dayShift(mondayOf(day), i));
  const cols = view === 'week' ? week : [day];
  const mFrom = day.slice(0, 8) + '01', mTo = monthShift(day, 1);
  const inCols = items.filter(it => view === 'month' ? it.data >= mFrom && it.data < mTo : cols.includes(it.data));
  const timed = inCols.filter(it => hm2m(it.ora) != null && cols.includes(it.data));
  const untimed = items.filter(it => hm2m(it.ora) == null && (view === 'month' ? it.data >= mFrom && it.data < mTo : cols.includes(it.data)));
  const last = view === 'month' ? dayShift(mTo, -1) : cols[cols.length - 1];
  const daProgr = items.filter(it => hm2m(it.ora) == null && it.data > last).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 12);
  const minH = Math.min(7, ...timed.map(it => Math.floor(hm2m(it.ora) / 60)));
  const maxH = Math.max(19, ...timed.map(it => Math.ceil((hm2m(it.ora) + it.durata) / 60)));
  const top0 = minH * 60;
  const nowM = cols.includes(today()) ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  const LEFT = view === 'week' ? 40 : 52;
  // la griglia scorre dentro il suo riquadro: la pagina resta in alto quando si cambia giorno o settimana
  useEffect(() => {
    const c = scroller.current; if (!c) return;
    const first = timed.length ? Math.min(...timed.map(it => hm2m(it.ora))) : 8 * 60;
    c.scrollTo({ top: Math.max(0, ((Math.max(first - 30, top0) - top0) / SLOT) * PX - 8), behavior: 'smooth' });
  }, [day, view]);

  const step = n => setDay(view === 'month' ? monthShift(day, n) : dayShift(day, n * (view === 'week' ? 7 : 1)));
  const swDay = useSwipe(step), swWeek = useSwipe(n => setDay(dayShift(day, 7 * n)));
  const put = async (it, p) => { await saveRec(agendaPatch(it, p)); };
  const minuteAt = clientY => { const r = grid.current.getBoundingClientRect(); return top0 + Math.max(0, Math.floor((clientY - r.top) / PX)) * SLOT; };
  const dayAt = clientX => { if (view !== 'week') return day; const r = grid.current.getBoundingClientRect(); const w = (r.width - LEFT) / 7; return week[Math.max(0, Math.min(6, Math.floor((clientX - r.left - LEFT) / w)))]; };
  const onGrid = e => {
    if (e.target.closest('.ag-ev') || dragged.current || swDay.swiped.current) return;
    const m = minuteAt(e.clientY), ora = m2hm(m), d = dayAt(e.clientX);
    if (place) { put(place, { data: d, ora }); toast(`${place.titolo} · ${fmtD(d)} ${ora}`); setPlace(null); return; }
    setSlot({ data: d, ora });
  };
  // mouse: trascino per spostare, maniglia in basso per la durata (sul telefono si usa il foglio)
  const startDrag = (e, it, mode) => {
    if (e.pointerType !== 'mouse' || view !== 'day') return;
    e.preventDefault(); e.stopPropagation();
    const y0 = e.clientY, s0 = hm2m(it.ora), d0 = it.durata;
    let moved = false;
    const mv = ev => { const dm = Math.round((ev.clientY - y0) / PX) * SLOT; if (dm) moved = true; setDrag({ key: it.key, s: mode === 'move' ? Math.max(0, s0 + dm) : s0, d: mode === 'size' ? Math.max(SLOT, d0 + dm) : d0 }); };
    const up = ev => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      const dm = Math.round((ev.clientY - y0) / PX) * SLOT; setDrag(null);
      if (!moved || !dm) return;
      dragged.current = true; setTimeout(() => { dragged.current = false; }, 250);
      put(it, mode === 'move' ? { ora: m2hm(Math.min(Math.max(0, s0 + dm), 23 * 60 + 30)) } : { durata: Math.max(SLOT, d0 + dm) });
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  const loadJson = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const res = await agendaJson(await f.text(), pendingSlot.current, records, settings);
      for (const r of res.recs) await saveRec(r);
      toast(res.msg);
      if (res.open && res.recs[0]) openRec(res.recs[0]);
      else if (res.recs[0] && res.recs[0].type !== 'radon') setDay(res.recs[0].data);
    } catch (err) { fail('JSON non caricato', err); }
    pendingSlot.current = null;
  };
  const pickJson = s => { pendingSlot.current = s || null; setSlot(null); setAdd(null); setTimeout(() => fileRef.current.click(), 0); };
  const openIt = it => { if (it.tipo === 'app') { setAdd({ rec: it.rec, tab: 'app' }); return; } openRec(it.rec); };
  const chip = (it, showDate) => html`<button key=${it.key} class=${'ag-chip' + (place && place.key === it.key ? ' on' : '')} style=${'--c:' + TIPI_AG[it.tipo].c} onClick=${() => { setPlace(it); if (view === 'month') setView('day'); }}>
    <b>${it.titolo}</b><small>${it.stato === 'annullato' ? 'Annullato · ' : ''}${showDate ? fmtD(it.data) + (it.previsto ? ' (previsto)' : '') + ' · ' : it.previsto ? 'ritiro previsto · ' : ''}${it.sub}</small></button>`;
  const plusBtn = html`<button class="btn-icon pri" aria-label="Nuovo appuntamento o attività da programmare" onClick=${() => setAdd({ data: day, ora: '', tab: 'app' })}><${Icon} n="plus" s=${22} w=${2.4} /></button>`;

  // ---- griglia oraria (giorno o settimana)
  const evBlock = ({ it, col, n }, ci) => {
    const dg = drag && drag.key === it.key ? drag : null; const s = dg ? dg.s : hm2m(it.ora), d = dg ? dg.d : it.durata;
    const cw = `(100% - ${LEFT + 4}px) / ${cols.length}`;
    return html`<div key=${it.key} class=${'ag-ev st-' + it.stato + (dg ? ' drag' : '') + (sel && sel.key === it.key ? ' on' : '') + (view === 'week' ? ' sm' : '')} role="button" tabindex="0"
      style=${`--c:${TIPI_AG[it.tipo].c};top:${(s - top0) / SLOT * PX + 1}px;height:${d / SLOT * PX - 2}px;left:calc(${LEFT}px + ${cw} * ${ci} + ${cw} * ${col / n});width:calc(${cw} / ${n} - 2px)`}
      onPointerDown=${e => startDrag(e, it, 'move')} onClick=${e => { e.stopPropagation(); if (!drag && !dragged.current) setSel(it); }} onKeyDown=${e => e.key === 'Enter' && setSel(it)}>
      <b>${it.stato === 'confermato' ? '✓ ' : ''}${view === 'week' ? '' : m2hm(s) + ' · '}${it.titolo}</b>${view === 'day' && d >= 60 && html`<small>${it.sub}</small>`}
      ${view === 'day' && html`<small class="ag-dur">${it.stato === 'confermato' ? '' : progL(it.stato) + ' · '}${fmtDur(d)}</small>`}
      ${view === 'day' && html`<span class="ag-rs" onPointerDown=${e => startDrag(e, it, 'size')}></span>`}</div>`;
  };
  const timeGrid = html`<div class="ag-scroll" ref=${scroller}>
    <div class="ag-grid" ref=${grid} style=${`height:${(maxH - minH) * 60 / SLOT * PX}px;--left:${LEFT}px`} onClick=${onGrid} ...${swDay.on}>
      ${[...Array(maxH - minH)].map((_, h) => html`<div class="ag-h" key=${h} style=${`top:${h * 2 * PX}px`}><span>${String(minH + h).padStart(2, '0')}:00</span></div>`)}
      ${view === 'week' && week.map((d, i) => i > 0 && html`<div key=${'v' + d} class="ag-vl" style=${`left:calc(${LEFT}px + (100% - ${LEFT + 4}px) / 7 * ${i})`}></div>`)}
      ${nowM != null && nowM >= top0 && nowM <= maxH * 60 && html`<div class="ag-now" style=${`top:${(nowM - top0) / SLOT * PX}px;${view === 'week' ? `left:calc(${LEFT}px + (100% - ${LEFT + 4}px) / 7 * ${week.indexOf(today())});right:auto;width:calc((100% - ${LEFT + 4}px) / 7)` : ''}`}></div>`}
      ${cols.map((d, ci) => layout(timed.filter(it => it.data === d)).map(x => evBlock(x, ci)))}
    </div></div>`;

  // ---- mese
  const monthGrid = () => {
    const first = mondayOf(mFrom); const days = [...Array(42)].map((_, i) => dayShift(first, i));
    const rows = days[35] >= mTo ? 5 : 6;
    return html`<div class="ag-month" ...${swDay.on}>
      ${['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(w => html`<div class="ag-mh" key=${w}>${w}</div>`)}
      ${days.slice(0, rows * 7).map(d => { const L = items.filter(it => it.data === d).sort((a, b) => (a.ora || '99').localeCompare(b.ora || '99')); const out = d < mFrom || d >= mTo;
        return html`<button key=${d} class=${'ag-mc' + (out ? ' out' : '') + (d === today() ? ' today' : '') + (d === day ? ' on' : '')} onClick=${() => { if (swDay.swiped.current) return; setDay(d); setView('day'); }}>
          <span class="ag-mn">${new Date(d + 'T12:00:00').getDate()}</span>
          ${L.slice(0, 3).map(it => html`<span key=${it.key} class=${'ag-mi st-' + it.stato} style=${'--c:' + TIPI_AG[it.tipo].c}>${it.ora ? it.ora + ' ' : ''}${it.titolo}</span>`)}
          ${L.length > 3 && html`<span class="ag-more">+${L.length - 3}</span>`}</button>`; })}
    </div>`;
  };

  return html`<div class="content ag">
    <${LargeTitle} top eye=${view === 'month' ? 'Mese' : view === 'week' ? 'Settimana' : new Date(day + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long' })} title="Programmazione" acts=${html`${plusBtn}${bell}`} />
    <div class="ag-bar">
      <div class="seg ag-views">${VISTE.map(([k, l]) => html`<button key=${k} class=${view === k ? 'on' : ''} onClick=${() => setView(k)}>${l}</button>`)}</div>
      ${!(view === 'day' ? day === today() : view === 'week' ? week.includes(today()) : today() >= mFrom && today() < mTo) && html`<button class="chip-btn" onClick=${() => setDay(today())}>Oggi</button>`}
    </div>
    <div class="ag-wrap"><div class="ag-main">
      <div class="ag-mon"><b>${meseL(view === 'week' || view === 'day' ? (week[0].slice(0, 7) === week[6].slice(0, 7) ? week[0] : day) : day)}</b>
        ${view !== 'day' && html`<div class="row" style="gap:6px"><button class="btn-icon" aria-label=${view === 'month' ? 'Mese precedente' : 'Settimana precedente'} onClick=${() => step(-1)}><${Icon} n="back" s=${18} /></button>
          <button class="btn-icon" aria-label=${view === 'month' ? 'Mese successivo' : 'Settimana successiva'} onClick=${() => step(1)}><${Icon} n="right" s=${18} /></button></div>`}</div>
      ${view !== 'month' && html`<div class=${'ag-week' + (view === 'week' ? ' wk' : '')} ...${swWeek.on}>
        ${view === 'day' && html`<button class="btn-icon" aria-label="Settimana precedente" onClick=${() => setDay(dayShift(day, -7))}><${Icon} n="back" s=${18} /></button>`}
        ${week.map(d => { const n = items.filter(it => it.data === d).length; const x = new Date(d + 'T12:00:00');
          return html`<button key=${d} class=${'ag-d' + (view === 'day' && d === day ? ' on' : '') + (d === today() ? ' today' : '')} onClick=${() => { if (swWeek.swiped.current) return; setDay(d); setView('day'); }}>
            <small>${x.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3)}</small><b>${x.getDate()}</b><i>${n ? '•'.repeat(Math.min(n, 3)) : ''}</i></button>`; })}
        ${view === 'day' && html`<button class="btn-icon" aria-label="Settimana successiva" onClick=${() => setDay(dayShift(day, 7))}><${Icon} n="right" s=${18} /></button>`}
      </div>`}
      ${view === 'day' && html`<div class="ag-dayh">
        <button class="btn-icon" aria-label="Giorno precedente" onClick=${() => step(-1)}><${Icon} n="back" s=${18} /></button>
        <b>${giornoL(day)}</b>
        <button class="btn-icon" aria-label="Giorno successivo" onClick=${() => step(1)}><${Icon} n="right" s=${18} /></button></div>`}
      ${place && html`<div class="ag-place"><span>Tocca la fascia per <b>${place.titolo}</b>; puoi anche cambiare giorno.</span><button class="btn link sm" onClick=${() => setPlace(null)}>Annulla</button></div>`}
      ${view === 'month' ? monthGrid() : timeGrid}
      <div class="ag-tools">
        <button class="chip-btn" onClick=${() => pickJson(null)}><${Icon} n="file" s=${15} /> Carica JSON</button>
        <button class="chip-btn" onClick=${() => shareIcs(inCols.filter(it => it.stato !== 'annullato'), `Nembo_${view === 'month' ? 'mese_' + mFrom.slice(0, 7) : view === 'week' ? 'settimana_' + week[0] : day}.ics`)}><${Icon} n="today" s=${15} /> ${view === 'month' ? 'Mese' : view === 'week' ? 'Settimana' : 'Giornata'} in calendario</button>
        <input ref=${fileRef} type="file" accept=".json,application/json" hidden onChange=${loadJson} />
      </div>
    </div>
    <aside class="ag-side">
      <div class="sec-h"><h3>Senza ora · ${untimed.length}</h3><span class="hint">${view === 'month' ? 'questo mese' : view === 'week' ? 'questa settimana' : 'questo giorno'}</span></div>
      ${untimed.length ? html`<div class="ag-chips">${untimed.map(it => chip(it, view !== 'day'))}</div>` : html`<div class="ag-empty">Nessuna attività senza ora.</div>`}
      <div class="sec-h"><h3>Prossime senza ora</h3><span class="hint">tocca e scegli la fascia</span></div>
      ${daProgr.length ? html`<div class="ag-chips">${daProgr.map(it => chip(it, true))}</div>` : html`<div class="ag-empty">Niente da programmare più avanti.</div>`}
    </aside></div>
    ${sel && html`<${AgEvSheet} it=${items.find(x => x.key === sel.key) || sel} onClose=${() => setSel(null)} put=${put}
      onOpen=${() => { const it = items.find(x => x.key === sel.key) || sel; setSel(null); openIt(it); }} onMove=${() => { setPlace(sel); setSel(null); }}
      onDelete=${async () => { if (!confirm('Eliminare l\'appuntamento?')) return; await removeRec(sel.rec); setSel(null); toast('Appuntamento eliminato'); }} />`}
    ${slot && html`<${AgSlotSheet} slot=${slot} senza=${[...untimed, ...daProgr]} onClose=${() => setSlot(null)}
      onPut=${it => { put(it, { data: slot.data, ora: slot.ora }); setSlot(null); }}
      onAdd=${tab => { setAdd({ data: slot.data, ora: slot.ora, tab }); setSlot(null); }} onJson=${() => pickJson(slot)}
      onModello=${() => downloadBlob(new Blob([JSON.stringify(PIANO_MODELLO, null, 1)], { type: 'application/json' }), 'Nembo_modello_programmazione.json')} />`}
    ${add && html`<${AgAddSheet} start=${add} records=${records} settings=${settings} onClose=${() => setAdd(null)} onJson=${() => pickJson(add.ora ? add : null)}
      onSave=${async (recs, msg) => { for (const r of recs) await saveRec(r); setAdd(null); toast(msg); const r0 = recs[0]; const d0 = r0.type === 'radon' ? r0.momenti[0].data : r0.data; if (d0) setDay(d0); }}
      onDelete=${add.rec ? async () => { if (!confirm('Eliminare l\'appuntamento?')) return; await removeRec(add.rec); setAdd(null); toast('Appuntamento eliminato'); } : null} />`}
  </div>`;
}

function AgEvSheet({ it, put, onOpen, onMove, onDelete, onClose }) {
  useBackClose(onClose);
  const s = hm2m(it.ora), app = it.tipo === 'app';
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label=${it.titolo}>
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>${TIPI_AG[it.tipo].l}</b><span></span></div>
    <div class="sheet-body">
      <div class="fg-hero"><div class="lt-eye">${fmtD(it.data)}${s != null ? ` · ${it.ora}–${m2hm(s + it.durata)}` : ' · senza ora'} · ${progL(it.stato)}</div><b>${it.titolo}</b>${it.sub && html`<small>${it.sub}</small>`}
        ${app && it.rec.note && html`<small style="white-space:pre-line">${it.rec.note}</small>`}</div>
      <div class="seg tall ag-st" style="margin-bottom:12px">${PROG.map(([k, l, c]) => html`<button key=${k} class=${it.stato === k ? 'on' : ''} onClick=${() => put(it, { stato: k })}><b><i class="mdot" style=${'background:' + c}></i></b><small>${l}</small></button>`)}</div>
      <div class="card tight"><div class="grid2">
        <label class="fld"><span>Ora</span><input type="time" step="1800" value=${it.ora || ''} onInput=${e => put(it, { ora: e.target.value })} /></label>
        <div class="fld"><span>Durata</span><${Stepper} n=${fmtDur(it.durata)} label="Durata" dec=${() => put(it, { durata: Math.max(SLOT, it.durata - SLOT) })} inc=${() => put(it, { durata: it.durata + SLOT })} /></div>
      </div></div>
      <div class="stack" style="margin-top:14px">
        <button class="btn pri block" onClick=${onOpen}>${app ? 'Modifica l\'appuntamento' : 'Apri l\'attività'}</button>
        <button class="btn block" onClick=${onMove}>Sposta in un'altra fascia o giorno</button>
        <button class="btn block" onClick=${() => shareIcs([it], `Nembo_${it.rec.codice || (app ? 'appuntamento' : 'attivita')}_${it.data}.ics`.replace(/[^\w.-]+/g, '_'))}><${Icon} n="today" s=${18} /> Aggiungi al calendario</button>
        ${s != null && html`<button class="btn block" onClick=${() => { put(it, { ora: '' }); onClose(); }}>Togli l'orario</button>`}
        ${app && html`<button class="btn block danger" onClick=${onDelete}>Elimina l'appuntamento</button>`}
      </div>
    </div></div></div>`;
}

function AgSlotSheet({ slot, senza, onPut, onAdd, onJson, onModello, onClose }) {
  useBackClose(onClose);
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="Fascia libera">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>${slot.ora}</b><span></span></div>
    <div class="sheet-body">
      <div class="fg-hero"><div class="lt-eye">${giornoL(slot.data)}</div><b>Fascia delle ${slot.ora}</b></div>
      <button class="opt" onClick=${() => onAdd('app')}><span class="oi" style="background:var(--fill-soft);color:var(--navy)"><${Icon} n="today" s=${21} /></span>
        <span class="ot"><b>Appuntamento</b><small>Riunione, consegna, telefonata: un impegno in agenda</small></span></button>
      <button class="opt" onClick=${() => onAdd('att')}><span class="oi" style="background:var(--blue-soft);color:var(--blue)"><${Icon} n="clock" s=${21} /></span>
        <span class="ot"><b>Programma un'attività</b><small>Un sopralluogo in questa fascia, da aprire quando parti</small></span></button>
      <button class="opt" onClick=${onJson}><span class="oi" style="background:var(--fill-soft);color:var(--navy)"><${Icon} n="file" s=${21} /></span>
        <span class="ot"><b>Carica JSON</b><small>Mappatura/PMC → sopralluogo RA in questa fascia; piano → più attività nei loro giorni</small></span></button>
      ${senza.length > 0 && html`<div class="sec-h"><h3>Metti qui un'attività senza ora</h3></div>
        <div class="list">${senza.map(it => html`<button key=${it.key} class="prow" style="width:100%;border:0;background:none;text-align:left" onClick=${() => onPut(it)}>
          <span class="mdot" style=${'background:' + TIPI_AG[it.tipo].c}></span><span class="t"><b>${it.titolo}</b><small>${fmtD(it.data)} · ${it.sub}</small></span></button>`)}</div>`}
      <p class="hint-p">Il piano è un file con più sopralluoghi (tipo, data, ora, durata, indirizzo…). <button class="btn link sm" style="padding:0;min-height:0" onClick=${onModello}>Scarica il modello</button></p>
    </div></div></div>`;
}

// "Nuovo" della Programmazione: un appuntamento oppure un'attività programmata (creata ma non aperta)
const AG_TIPI_NUOVI = [['ra', 'Sopralluogo RA'], ['dda1', 'DDA Fase 1'], ['dda2', 'DDA Fase 2'], ['mappatura', 'Mappatura MCA e FAV'], ['radon', 'Campagna radon (posa)'],
  ['aria', 'Monitoraggio aria'], ['hsE', 'HSE Esteso'], ['hsS', 'HSE Sintetico'], ['vs', 'Verbale sopralluogo'], ['firme', 'Foglio firme']];
function AgAddSheet({ start, records, settings, onSave, onDelete, onJson, onClose }) {
  useBackClose(onClose);
  const ed = start.rec || null;
  const [tab, setTab] = useState(ed ? 'app' : start.tab || 'app');
  const [f, setF] = useState(() => ed ? { titolo: ed.titolo, luogo: ed.luogo, note: ed.note, data: ed.data, ora: ed.ora, durata: ed.durata || 60, stato: ed.stato || '' }
    : { tipo: 'ra', titolo: '', luogo: '', note: '', data: start.data || today(), ora: start.ora || '', durata: 0, stato: '', commessa: '', cliente: '', citta: '', indirizzo: '' });
  const set = p => setF(x => ({ ...x, ...p }));
  const tipoT = (PIANO_TIPI[f.tipo] || ['ra'])[0];
  const dur = f.durata || (tab === 'app' ? 60 : durataBase(tipoT, settings));
  const st = progDi(f.stato, f.ora);
  const save = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data || '')) { toast('Indica la data'); return; }
    if (tab === 'app') {
      if (!(f.titolo || '').trim()) { toast('Scrivi un titolo'); return; }
      const r = ed ? { ...ed, titolo: f.titolo.trim(), luogo: f.luogo, note: f.note, data: f.data, ora: f.ora, durata: dur, stato: f.stato, updatedAt: Date.now() }
        : newApp({ titolo: f.titolo.trim(), luogo: f.luogo, note: f.note, data: f.data, ora: f.ora, durata: dur, stato: f.stato });
      onSave([r], ed ? 'Appuntamento aggiornato' : 'Appuntamento aggiunto');
      return;
    }
    let r = newOfType(f.tipo, records, settings, { data: f.data, ora: f.ora, durata: dur, stato: st, commessa: f.commessa.trim(), cliente: f.cliente.trim(), citta: f.citta.trim(), indirizzo: f.indirizzo.trim() });
    if (r.type === 'ra') { const prev = raPrecedente(records, r); if (prev) r = { ...r, ...(await raRiprendi(prev, r)) }; }
    onSave([r], `${(AG_TIPI_NUOVI.find(x => x[0] === f.tipo) || [, 'Attività'])[1]} programmato per il ${fmtD(f.data)}${f.ora ? ' alle ' + f.ora : ''}`);
  };
  const durSel = html`<label class="fld"><span>Durata</span><select value=${String(dur)} onChange=${e => set({ durata: +e.target.value })}>
    ${[...new Set([...DUR_OPT, dur])].sort((a, b) => a - b).map(m => html`<option value=${m}>${fmtDur(m)}</option>`)}</select></label>`;
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="Nuovo in programmazione">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>${ed ? 'Appuntamento' : 'Nuovo'}</b><button class="btn link" style="font-weight:600" onClick=${save}>Salva</button></div>
    <div class="sheet-body">
      ${!ed && html`<div class="seg" style="margin-bottom:12px"><button class=${tab === 'app' ? 'on' : ''} onClick=${() => setTab('app')}>Appuntamento</button><button class=${tab === 'att' ? 'on' : ''} onClick=${() => setTab('att')}>Attività</button></div>`}
      ${tab === 'att' && html`<p class="hint-p" style="margin:0 2px 10px">L'attività compare nella programmazione e nell'elenco della sua area: la apri quando inizi il sopralluogo.</p>`}
      <div class="card"><div class="grid2">
        ${tab === 'app' ? html`<${Inp} cls="full" label="Titolo *" value=${f.titolo} set=${v => set({ titolo: v })} placeholder="es. Riunione di cantiere" />`
          : html`<label class="fld full"><span>Tipo di attività</span><select value=${f.tipo} onChange=${e => set({ tipo: e.target.value, durata: 0 })}>${AG_TIPI_NUOVI.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>`}
        <${Inp} label="Data" type="date" value=${f.data} set=${v => set({ data: v })} />
        <label class="fld"><span>Ora</span><input type="time" step="1800" value=${f.ora || ''} onInput=${e => set({ ora: e.target.value })} /></label>
        ${durSel}
        <label class="fld"><span>Stato</span><select value=${st} onChange=${e => set({ stato: e.target.value })}>${PROG.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>
        ${tab === 'app' ? html`<${Inp} cls="full" label="Luogo" value=${f.luogo} set=${v => set({ luogo: v })} placeholder="Facoltativo" />
          <${Area} cls="full" label="Note" rows=${3} value=${f.note} set=${v => set({ note: v })} />`
          : html`<${Inp} label="Commessa" value=${f.commessa} set=${v => set({ commessa: v })} /><${Inp} label="Cliente" value=${f.cliente} set=${v => set({ cliente: v })} />
          <${Inp} label="Città" value=${f.citta} set=${v => set({ citta: v })} /><${Inp} label="Indirizzo" value=${f.indirizzo} set=${v => set({ indirizzo: v })} />`}
      </div></div>
      <div class="stack" style="margin-top:14px">
        <button class="btn pri block" onClick=${save}>${tab === 'app' ? (ed ? 'Salva l\'appuntamento' : 'Aggiungi l\'appuntamento') : 'Programma l\'attività'}</button>
        ${onDelete && html`<button class="btn block danger" onClick=${onDelete}>Elimina l'appuntamento</button>`}
        ${!ed && tab === 'att' && html`<button class="btn block" onClick=${onJson}><${Icon} n="file" s=${18} /> Programma da un file JSON</button>`}
      </div>
    </div></div></div>`;
}
