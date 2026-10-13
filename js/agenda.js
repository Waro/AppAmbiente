/* Programmazione: ora e durata delle attività, vista a fasce orarie (stile calendario), JSON e file .ics.
   Ogni attività ha data + ora di inizio + durata (minuti); per il radon valgono i tre momenti (posa e ritiri). */

const DURATE_BASE = { dda: 180, mappatura: 180, ra: 120, radon: 60, hs: 180, firme: 60 };
const TIPI_AG = {
  dda: { l: 'DDA', c: 'var(--warn)' }, mappatura: { l: 'Mappatura', c: 'var(--mca)' }, ra: { l: 'RA', c: '#7a3db8' },
  radon: { l: 'Radon', c: 'var(--ok)' }, hs: { l: 'H&S', c: 'var(--blue)' }, firme: { l: 'Firme', c: 'var(--navy)' },
};
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
      `STATUS:${it.stato === 'confermato' ? 'CONFIRMED' : it.stato === 'annullato' ? 'CANCELLED' : 'TENTATIVE'}`, `SUMMARY:${esc((it.stato === 'annullato' ? 'ANNULLATO · ' : '') + it.titolo)}`, `LOCATION:${esc(placeDoc(r))}`, `DESCRIPTION:${esc([r.codice, r.cliente, r.commessa && 'Commessa ' + r.commessa].filter(Boolean).join(' - '))}`, 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nembo//Programmazione//IT', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
async function shareIcs(items, name) {
  if (!items.length) { toast('Nessuna attività da esportare'); return; }
  await shareFiles([{ blob: new Blob([icsEvents(items)], { type: 'text/calendar' }), name }], name);
}

/* ---------------- JSON: PMC/mappatura in una fascia, oppure piano di più sopralluoghi ---------------- */
const PIANO_TIPI = { ra: ['ra', {}], dda1: ['dda', { fase: 1 }], dda2: ['dda', { fase: 2 }], mappatura: ['mappatura', {}], radon: ['radon', {}],
  hsE: ['hs', { formato: 'esteso' }], hsS: ['hs', { formato: 'sintetico' }], firme: ['firme', {}] };
const PIANO_MODELLO = { type: 'nembo-programmazione', attivita: [
  { tipo: 'ra', data: '2026-11-03', ora: '09:00', durata: 120, stato: 'confermato', commessa: '000/26', cliente: 'Cliente', citta: 'Città', indirizzo: 'Via e numero civico', sito: '', note: 'senza manufatti: Nembo li riprende dall\'RA precedente dello stesso immobile (codice sito, oppure indirizzo + città)' },
  { tipo: 'ra', data: '2026-11-04', ora: '09:00', durata: 120, commessa: '000/26', cliente: 'Cliente', citta: 'Città', indirizzo: 'Via e numero civico', sito: '', incaricoDal: '2026-04-01', incaricoAl: '2027-03-31', note: 'sito nuovo: manufatti come nel modello RA',
    manufatti: [{ codice: 'M1', ubicazione: 'Copertura', descrizione: 'Lastre in cemento-amianto', tipologia: 'compatto', quantita: '120 m²', statoPrecedente: '', notePrecedenti: '' }] },
  { tipo: 'dda1', data: '2026-11-03', ora: '14:00', durata: 180, commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', note: 'tipi: ra, dda1, dda2, mappatura, radon (posa), hsE, hsS, firme; stato (facoltativo): confermato, in_attesa, da_programmare, annullato' }] };
function newOfType(tipo, all, s, extra = {}) {
  const [t, p] = PIANO_TIPI[tipo] || [tipo, {}];
  const base = t === 'dda' ? newDda(all, s) : t === 'mappatura' ? newMappatura(all, s) : t === 'ra' ? newRa(all, s) : t === 'hs' ? newHs(all, s, p.formato) : t === 'firme' ? newFirmeRec(all, s) : newRadon(s);
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

function Agenda({ records, settings, saveRec, openRec, onNew, acts }) {
  const [day, setDay] = useState(() => { try { return sessionStorage.getItem('nembo_ag') || today(); } catch (e) { return today(); } });
  const [sel, setSel] = useState(null);     // elemento toccato
  const [slot, setSlot] = useState(null);   // fascia vuota toccata { data, ora }
  const [place, setPlace] = useState(null); // elemento da collocare
  const [drag, setDrag] = useState(null);
  const grid = useRef(); const fileRef = useRef(); const pendingSlot = useRef(null); const dragged = useRef(false);
  useEffect(() => { try { sessionStorage.setItem('nembo_ag', day); } catch (e) {} }, [day]);
  const items = agendaItems(records, settings);
  const ofDay = items.filter(it => it.data === day);
  const timed = ofDay.filter(it => hm2m(it.ora) != null), untimed = ofDay.filter(it => hm2m(it.ora) == null);
  const daProgr = items.filter(it => hm2m(it.ora) == null && it.data > day).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 12);
  const minH = Math.min(7, ...timed.map(it => Math.floor(hm2m(it.ora) / 60)));
  const maxH = Math.max(19, ...timed.map(it => Math.ceil((hm2m(it.ora) + it.durata) / 60)));
  const top0 = minH * 60;
  const week = [...Array(7)].map((_, i) => dayShift(mondayOf(day), i));
  const nowM = day === today() ? new Date().getHours() * 60 + new Date().getMinutes() : null;
  // scorro alla prima attività (o alle 8) quando cambio giorno
  useEffect(() => {
    const c = grid.current && grid.current.closest('.content'); if (!c) return;
    const first = timed.length ? Math.min(...timed.map(it => hm2m(it.ora))) : 8 * 60;
    const y = grid.current.offsetTop + ((Math.max(first - 30, top0) - top0) / SLOT) * PX - 8;
    c.scrollTo({ top: Math.max(0, y - 120), behavior: 'smooth' });
  }, [day]);

  const put = async (it, p) => { await saveRec(agendaPatch(it, p)); };
  const minuteAt = clientY => { const r = grid.current.getBoundingClientRect(); return top0 + Math.max(0, Math.floor((clientY - r.top) / PX)) * SLOT; };
  const onGrid = e => {
    if (e.target.closest('.ag-ev') || dragged.current) return;
    const m = minuteAt(e.clientY), ora = m2hm(m);
    if (place) { put(place, { data: day, ora }); toast(`${place.titolo} · ${fmtD(day)} ${ora}`); setPlace(null); return; }
    setSlot({ data: day, ora });
  };
  // mouse: trascino per spostare, maniglia in basso per la durata (sul telefono si usa il foglio)
  const startDrag = (e, it, mode) => {
    if (e.pointerType !== 'mouse') return;
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
  const pickJson = s => { pendingSlot.current = s || null; setSlot(null); setTimeout(() => fileRef.current.click(), 0); };
  const dl = new Date(day + 'T12:00:00');

  return html`<div class="content ag">
    <${LargeTitle} top eye=${dl.toLocaleDateString('it-IT', { weekday: 'long' })} title="Programmazione" sub=${dl.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} acts=${acts} />
    <div class="ag-week">
      <button class="btn-icon" aria-label="Settimana precedente" onClick=${() => setDay(dayShift(day, -7))}><${Icon} n="back" s=${18} /></button>
      ${week.map(d => { const n = items.filter(it => it.data === d).length; const x = new Date(d + 'T12:00:00');
        return html`<button key=${d} class=${'ag-d' + (d === day ? ' on' : '') + (d === today() ? ' today' : '')} onClick=${() => setDay(d)}>
          <small>${x.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3)}</small><b>${x.getDate()}</b><i>${n ? '•'.repeat(Math.min(n, 3)) : ''}</i></button>`; })}
      <button class="btn-icon" aria-label="Settimana successiva" onClick=${() => setDay(dayShift(day, 7))}><${Icon} n="right" s=${18} /></button>
    </div>
    <div class="ag-tools">
      ${day !== today() && html`<button class="chip-btn" onClick=${() => setDay(today())}>Oggi</button>`}
      <button class="chip-btn" onClick=${() => pickJson(null)}><${Icon} n="file" s=${15} /> Carica JSON</button>
      <button class="chip-btn" onClick=${() => shareIcs(timed.concat(untimed).filter(it => it.stato !== 'annullato'), `Nembo_${day}.ics`)}><${Icon} n="today" s=${15} /> Giornata in calendario</button>
      <input ref=${fileRef} type="file" accept=".json,application/json" hidden onChange=${loadJson} />
    </div>
    ${place && html`<div class="ag-place"><span>Tocca la fascia per <b>${place.titolo}</b>; puoi anche cambiare giorno.</span><button class="btn link sm" onClick=${() => setPlace(null)}>Annulla</button></div>`}
    ${untimed.length > 0 && html`<div class="sec-h" style="margin-top:12px"><h3>Senza ora · ${untimed.length}</h3><span class="hint">tocca e scegli la fascia</span></div>
      <div class="ag-chips">${untimed.map(it => html`<button key=${it.key} class=${'ag-chip' + (place && place.key === it.key ? ' on' : '')} style=${'--c:' + TIPI_AG[it.tipo].c} onClick=${() => setPlace(it)}>
        <b>${it.titolo}</b><small>${it.stato === 'annullato' ? 'Annullato · ' : ''}${it.previsto ? 'ritiro previsto · ' : ''}${it.sub}</small></button>`)}</div>`}
    <div class="ag-grid" ref=${grid} style=${`height:${(maxH - minH) * 60 / SLOT * PX}px`} onClick=${onGrid}>
      ${[...Array(maxH - minH)].map((_, h) => html`<div class="ag-h" key=${h} style=${`top:${h * 2 * PX}px`}><span>${String(minH + h).padStart(2, '0')}:00</span></div>`)}
      ${nowM != null && nowM >= top0 && nowM <= maxH * 60 && html`<div class="ag-now" style=${`top:${(nowM - top0) / SLOT * PX}px`}></div>`}
      ${layout(timed).map(({ it, col, n }) => { const dg = drag && drag.key === it.key ? drag : null; const s = dg ? dg.s : hm2m(it.ora), d = dg ? dg.d : it.durata;
        return html`<div key=${it.key} class=${'ag-ev st-' + it.stato + (dg ? ' drag' : '') + (sel && sel.key === it.key ? ' on' : '')} role="button" tabindex="0"
          style=${`--c:${TIPI_AG[it.tipo].c};top:${(s - top0) / SLOT * PX + 1}px;height:${d / SLOT * PX - 2}px;left:calc(52px + (100% - 56px) * ${col / n});width:calc((100% - 56px) / ${n} - 3px)`}
          onPointerDown=${e => startDrag(e, it, 'move')} onClick=${e => { e.stopPropagation(); if (!drag && !dragged.current) setSel(it); }} onKeyDown=${e => e.key === 'Enter' && setSel(it)}>
          <b>${it.stato === 'confermato' ? '✓ ' : ''}${m2hm(s)} · ${it.titolo}</b>${d >= 60 && html`<small>${it.sub}</small>`}<small class="ag-dur">${it.stato === 'confermato' ? '' : progL(it.stato) + ' · '}${fmtDur(d)}</small>
          <span class="ag-rs" onPointerDown=${e => startDrag(e, it, 'size')}></span></div>`; })}
    </div>
    ${daProgr.length > 0 && html`<div class="sec-h"><h3>Prossime senza ora</h3><span class="hint">tocca per programmarle in questa giornata</span></div>
      <div class="ag-chips">${daProgr.map(it => html`<button key=${it.key} class="ag-chip" style=${'--c:' + TIPI_AG[it.tipo].c} onClick=${() => setPlace(it)}>
        <b>${it.titolo}</b><small>${fmtD(it.data)}${it.previsto ? ' (previsto)' : ''} · ${it.sub}</small></button>`)}</div>`}
    ${sel && html`<${AgEvSheet} it=${items.find(x => x.key === sel.key) || sel} onClose=${() => setSel(null)} put=${put}
      onOpen=${() => { const r = sel.rec; setSel(null); openRec(r); }} onMove=${() => { setPlace(sel); setSel(null); }} />`}
    ${slot && html`<${AgSlotSheet} slot=${slot} senza=${[...untimed, ...daProgr]} onClose=${() => setSlot(null)}
      onPut=${it => { put(it, { data: slot.data, ora: slot.ora }); setSlot(null); }}
      onNew=${() => { const p = { data: slot.data, ora: slot.ora }; setSlot(null); onNew(p); }} onJson=${() => pickJson(slot)}
      onModello=${() => downloadBlob(new Blob([JSON.stringify(PIANO_MODELLO, null, 1)], { type: 'application/json' }), 'Nembo_modello_programmazione.json')} />`}
  </div>`;
}

function AgEvSheet({ it, put, onOpen, onMove, onClose }) {
  useBackClose(onClose);
  const s = hm2m(it.ora);
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label=${it.titolo}>
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>${TIPI_AG[it.tipo].l}</b><span></span></div>
    <div class="sheet-body">
      <div class="fg-hero"><div class="lt-eye">${fmtD(it.data)}${s != null ? ` · ${it.ora}–${m2hm(s + it.durata)}` : ' · senza ora'} · ${progL(it.stato)}</div><b>${it.titolo}</b>${it.sub && html`<small>${it.sub}</small>`}</div>
      <div class="seg tall ag-st" style="margin-bottom:12px">${PROG.map(([k, l, c]) => html`<button key=${k} class=${it.stato === k ? 'on' : ''} onClick=${() => put(it, { stato: k })}><b><i class="mdot" style=${'background:' + c}></i></b><small>${l}</small></button>`)}</div>
      <div class="card tight"><div class="grid2">
        <label class="fld"><span>Ora</span><input type="time" step="1800" value=${it.ora || ''} onInput=${e => put(it, { ora: e.target.value })} /></label>
        <div class="fld"><span>Durata</span><${Stepper} n=${fmtDur(it.durata)} label="Durata" dec=${() => put(it, { durata: Math.max(SLOT, it.durata - SLOT) })} inc=${() => put(it, { durata: it.durata + SLOT })} /></div>
      </div></div>
      <div class="stack" style="margin-top:14px">
        <button class="btn pri block" onClick=${onOpen}>Apri l'attività</button>
        <button class="btn block" onClick=${onMove}>Sposta in un'altra fascia o giorno</button>
        <button class="btn block" onClick=${() => shareIcs([it], `Nembo_${it.rec.codice || 'attivita'}_${it.data}.ics`.replace(/[^\w.-]+/g, '_'))}><${Icon} n="today" s=${18} /> Aggiungi al calendario</button>
        ${s != null && html`<button class="btn block" onClick=${() => { put(it, { ora: '' }); onClose(); }}>Togli l'orario</button>`}
      </div>
    </div></div></div>`;
}

function AgSlotSheet({ slot, senza, onPut, onNew, onJson, onModello, onClose }) {
  useBackClose(onClose);
  const d = new Date(slot.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="Fascia libera">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>${slot.ora}</b><span></span></div>
    <div class="sheet-body">
      <div class="fg-hero"><div class="lt-eye">${d}</div><b>Fascia delle ${slot.ora}</b></div>
      <button class="opt" onClick=${onNew}><span class="oi" style="background:var(--blue-soft);color:var(--blue)"><${Icon} n="plus" s=${21} /></span>
        <span class="ot"><b>Nuova attività qui</b><small>Scegli il tipo: parte già con data e ora</small></span></button>
      <button class="opt" onClick=${onJson}><span class="oi" style="background:var(--fill-soft);color:var(--navy)"><${Icon} n="file" s=${21} /></span>
        <span class="ot"><b>Carica JSON</b><small>Mappatura/PMC → sopralluogo RA in questa fascia; piano → più attività nei loro giorni</small></span></button>
      ${senza.length > 0 && html`<div class="sec-h"><h3>Metti qui un'attività senza ora</h3></div>
        <div class="list">${senza.map(it => html`<button key=${it.key} class="prow" style="width:100%;border:0;background:none;text-align:left" onClick=${() => onPut(it)}>
          <span class="mdot" style=${'background:' + TIPI_AG[it.tipo].c}></span><span class="t"><b>${it.titolo}</b><small>${fmtD(it.data)} · ${it.sub}</small></span></button>`)}</div>`}
      <p class="hint-p">Il piano è un file con più sopralluoghi (tipo, data, ora, durata, indirizzo…). <button class="btn link sm" style="padding:0;min-height:0" onClick=${onModello}>Scarica il modello</button></p>
    </div></div></div>`;
}
