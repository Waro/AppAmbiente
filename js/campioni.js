/* Campioni e NC condivisi da DDA Fase 2 e Mappatura MCA e FAV: matrici, indagine precedente, numerazione che prosegue,
   riepilogo e righe dei campioni, manufatti non campionati. */

const MATS = [
  { k: 'terreni', l: 'Terreni', c: 'var(--terreni)', h: PRINT.terreni, auto: null },
  { k: 'acque', l: 'Acque', c: 'var(--acque)', h: PRINT.acque, auto: null },
  { k: 'mca', l: 'MCA', c: 'var(--mca)', h: PRINT.mca, auto: 'A' },
  { k: 'fav', l: 'FAV', c: 'var(--fav)', h: PRINT.fav, auto: 'F' },
  { k: 'altro', l: 'Altro', c: 'var(--altro)', h: PRINT.altro, auto: null },
];
const emptyCampioni = () => ({ terreni: [], acque: [], mca: [], fav: [], altro: [] });

/* ---------------- indagine precedente (Fase 2 o mappatura importata) ----------------
   I campioni e gli NC importati sono di riferimento; i nuovi campioni e NC proseguono la loro numerazione
   (es. dopo A1…A6 il primo campione integrativo è A7, dopo NC3 il primo NC è NC4). */
async function importPrecedente(data, rec, mats) {
  const s = v => (v == null ? '' : String(v)).trim();
  const fotoDi = async x => { const ids = []; if (Array.isArray(x.foto)) for (const ph of x.foto.slice(0, 3)) { if (typeof ph !== 'string' || !ph.trim()) continue; try { ids.push(await saveImage(dataUriToBlob(ph))); } catch (e) { /* immagine non valida */ } } return ids; };
  const prev = rec.precedente || { fonte: '', campioni: [], nc: [] };
  const out = { fonte: prev.fonte || s(data.fonte), campioni: [...(prev.campioni || [])], nc: [...(prev.nc || [])] };
  const keyC = new Set(out.campioni.map(c => c.k + '|' + c.codice.toLowerCase()));
  let camp = 0, nc = 0;
  for (const x of (Array.isArray(data.campioni) ? data.campioni : [])) {
    if (!x || typeof x !== 'object') continue;
    const k = s(x.matrice).toLowerCase(); if (!mats.some(m => m.k === k)) continue;
    const codice = s(x.codice) || (MATS.find(m => m.k === k).auto || 'C') + (out.campioni.filter(c => c.k === k).length + 1);
    if (keyC.has(k + '|' + codice.toLowerCase())) continue; keyC.add(k + '|' + codice.toLowerCase());
    const esito = s(x.esito).toLowerCase();
    out.campioni.push({ id: uid('cp'), k, codice, piano: s(x.piano), ubicazione: s(x.ubicazione), descrizione: s(x.descrizione), tipologia: s(x.tipologia), quantita: s(x.quantita),
      data: /^\d{4}-\d{2}-\d{2}$/.test(s(x.data)) ? s(x.data) : '', esito: esito === 'positivo' || esito === 'negativo' ? esito : '', esitoDettaglio: s(x.esitoDettaglio), note: s(x.note), foto: await fotoDi(x) });
    camp++;
  }
  const keyN = new Set(out.nc.map(c => c.codice.toLowerCase()));
  for (const x of (Array.isArray(data.nc) ? data.nc : [])) {
    if (!x || typeof x !== 'object') continue;
    const k = s(x.matrice).toLowerCase() === 'fav' ? 'fav' : 'mca';
    const codice = s(x.codice) || 'NC' + (out.nc.length + 1);
    if (keyN.has(codice.toLowerCase())) continue; keyN.add(codice.toLowerCase());
    out.nc.push({ id: uid('cp'), k, codice, piano: s(x.piano), ubicazione: s(x.ubicazione), descrizione: s(x.descrizione), quantita: s(x.quantita), riferimento: s(x.riferimento), note: s(x.note), foto: await fotoDi(x) });
    nc++;
  }
  const patch = {};
  // "numerazione": "nuova" = i nuovi campioni ripartono da 1; "prosegui" (o assente) = proseguono
  const num = data.numerazione === 'nuova' || data.numerazione === 'prosegui' ? data.numerazione : '';
  if (num && num !== (rec.numerazione || 'prosegui')) patch.numerazione = num;
  if (camp || nc || patch.numerazione) {
    if (camp || nc) patch.precedente = out;
    // campioni e NC già inseriti in questa attività: rinumerati secondo la nuova base (solo se i codici non sono bloccati dalla scheda)
    const q = { ...rec, ...patch, precedente: out }; const cc = { ...rec.campioni }; let ren = false;
    for (const m of mats) if (m.auto && !(rec.congelati || {})[m.k] && (cc[m.k] || []).length) { cc[m.k] = cc[m.k].map((c, i) => ({ ...c, codice: m.auto + (precBase(q, m.auto) + i + 1) })); ren = true; }
    if (ren) patch.campioni = cc;
    if (ncOf(rec).length) patch.nc = ncRenum(ncOf(rec), precBase(q, 'NC'));
  }
  return { patch, camp, nc };
}
// attività salvate in Nembo, per proseguire la numerazione delle Mappature e DDA Fase 2 precedenti dello stesso immobile
let _recsNum = [];
const setRecsNum = l => { _recsNum = l || []; };
// attività precedenti dello stesso immobile (Mappatura o DDA Fase 2), prima di r per data o per creazione
const precNembo = r => _recsNum.filter(x => x.id !== r.id && !x._new && (x.type === 'mappatura' || (x.type === 'dda' && x.fase === 2)) && stessoImmobile(x, r)
  && ((x.data || '') < (r.data || '') || ((x.data || '') === (r.data || '') && (x.createdAt || 0) < (r.createdAt || 0))));
// numero più alto con quel prefisso (A, F, NC) tra l'indagine importata da JSON e le attività precedenti dello stesso immobile:
// da lì prosegue la numerazione, salvo "numerazione": "nuova" nel JSON
function precBase(r, pre) {
  if (!pre || r.numerazione === 'nuova') return 0;
  return precBaseAll(r, pre);
}
// come precBase, ma senza la scelta «riparti da 1» (serve al controllo della numerazione)
function precBaseAll(r, pre) {
  const re = new RegExp('^' + pre + '\\s*(\\d+)$', 'i');
  const p = r.precedente || {};
  const codes = [...(p.campioni || []), ...(p.nc || [])].map(c => c.codice);
  for (const x of precNembo(r)) codes.push(...Object.values(x.campioni || {}).flat().map(c => c.codice), ...ncOf(x).map(c => c.codice));
  return codes.map(c => re.exec((c || '').trim())).filter(Boolean).map(m => +m[1]).reduce((a, b) => Math.max(a, b), 0);
}
// codice del prossimo campione di una matrice a codici automatici (DDA e Mappatura)
function nextCampCode(r, m) {
  if (!m.auto) return '';
  const l = r.campioni[m.k] || [], base = precBase(r, m.auto);
  if (!(r.congelati || {})[m.k]) return m.auto + (base + l.length + 1);
  return m.auto + (Math.max(base, l.map(c => +c.codice.slice(1) || 0).reduce((a, b) => Math.max(a, b), 0)) + 1);
}
// da dove prosegue la numerazione: l'indagine importata o l'ultima attività precedente dello stesso immobile (per il suggerimento accanto a «Campioni»)
function numFonte(r) {
  const prev = precNembo(r).sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
  if (prev) return prev.codice || (prev.type === 'mappatura' ? 'Mappatura' : 'DDA Fase 2') + (prev.data ? ' del ' + fmtD(prev.data) : '');
  const p = r.precedente;
  return p && ((p.campioni || []).length || (p.nc || []).length) ? (p.fonte || 'indagine importata') : '';
}
const numHint = (r, m) => { const n = precBase(r, m.auto); const f = n && numFonte(r); return n ? `Dopo ${m.auto}${n}${f ? ' · ' + f : ''}` : `Codici automatici ${m.auto}1, ${m.auto}2…`; };
// interruttore «Prosegui la numerazione» (Rilievo: riga con l'etichetta a sinistra), solo se c'è da cosa proseguire
function NumSection({ r, up, mats }) {
  const c = [...mats.filter(m => m.auto).map(m => m.auto), 'NC'].some(p => precBaseAll(r, p));
  if (!c) return null;
  const set = v => up(p => {
    const q = { ...p, numerazione: v ? 'prosegui' : 'nuova' }; const cc = { ...p.campioni };
    for (const m of mats) if (m.auto && !(p.congelati || {})[m.k] && (cc[m.k] || []).length) cc[m.k] = cc[m.k].map((x, i) => ({ ...x, codice: m.auto + (precBase(q, m.auto) + i + 1) }));
    return { ...q, campioni: cc, nc: ncRenum(ncOf(p), precBase(q, 'NC')) };
  });
  return html`<div class="card"><label class="fg-sw"><span>Prosegui la numerazione</span>
    <${Toggle} on=${r.numerazione !== 'nuova'} label="Prosegui la numerazione" set=${set} /></label></div>`;
}
const renumCamp = (r, m, list) => (!m.auto || (r.congelati || {})[m.k]) ? list : list.map((c, i) => ({ ...c, codice: m.auto + (precBase(r, m.auto) + i + 1) }));

function PrecSection({ r, onRicampiona }) {
  const p = r.precedente; const [open, setOpen] = useState(false);
  if (!p || !((p.campioni || []).length || (p.nc || []).length)) return null;
  const pos = (p.campioni || []).filter(c => c.esito === 'positivo').length;
  const ES = { positivo: ['Positivo', 'st-pres'], negativo: ['Negativo', 'st-ass'] };
  const row = (c, i, isNc) => {
    const m = MATS.find(x => x.k === c.k) || MATS[4]; const [el, ec] = ES[c.esito] || ['Esito n.d.', 'st-nv'];
    return html`<div key=${c.id} style=${'padding:var(--sp-3) 0;display:grid;gap:var(--sp-2)' + (i ? ';border-top:.5px solid var(--sep)' : '')}>
      <div class="row"><b style=${'min-width:52px;color:' + (isNc ? 'var(--danger)' : m.c)}>${c.codice}</b>
        <span class="tb-grow" style="min-width:0">${[c.piano, c.ubicazione].filter(Boolean).join(' · ') || m.l}</span>
        ${isNc ? html`<span class="badge st-nv">${c.riferimento ? 'NC → ' + c.riferimento : 'NC'}</span>` : html`<span class=${'badge ' + ec} title=${c.esitoDettaglio || ''}>${el}</span>`}
        <button class="btn sm" onClick=${() => onRicampiona(c)}>Ricampiona</button></div>
      ${(c.descrizione || c.quantita || c.esitoDettaglio || c.note) && html`<div class="lock" style="padding-left:60px">${[c.descrizione, c.quantita, c.esitoDettaglio, c.note].filter(Boolean).join(' · ')}</div>`}
      ${(c.foto || []).length > 0 && html`<div style="padding-left:60px"><${PhotoStrip} ids=${c.foto} readonly /></div>`}
    </div>`;
  };
  return html`<div class="sec-h mt-4"><h3>Indagine precedente</h3><span class="hint">${(p.campioni || []).length} campioni${pos ? ' · ' + pos + (pos === 1 ? ' positivo' : ' positivi') : ''}${(p.nc || []).length ? ' · ' + p.nc.length + ' NC' : ''}</span></div>
    <div class="card tight">
      <button class="chk-h" aria-expanded=${open} onClick=${() => setOpen(!open)}>
        <div class="tb-grow"><b>${p.fonte || 'Dati importati da JSON'}</b><small>Solo di riferimento, fuori dalla scheda per il laboratorio</small></div>
        <span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
      ${open && html`<div>${(p.campioni || []).map((c, i) => row(c, i, false))}${(p.nc || []).map((c, i) => row(c, i + (p.campioni || []).length, true))}</div>`}
    </div>`;
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
const ncRenum = (list, base = 0) => list.map((x, i) => ({ ...x, codice: 'NC' + (base + i + 1) }));
const ncRif = (r, x) => { const c = x.rif && [...(r.campioni[x.k] || []), ...((r.precedente || {}).campioni || [])].find(y => y.id === x.rif); return c ? c.codice : ''; };
function NcSection({ r, up, mat, list }) {
  const [openN, setOpenN] = useState({});
  const L = ncOf(r).filter(x => x.k === mat.k);
  const camp = r.campioni[mat.k] || [];
  const setNc = fn => up(p => ({ ...p, nc: ncRenum(fn(ncOf(p)), precBase(p, 'NC')) }));
  const upd = (id, patch) => setNc(l => l.map(x => x.id === id ? { ...x, ...patch } : x));
  const add = () => { const id = uid('nc'); const last = L[L.length - 1];
    setNc(l => [...l, { id, codice: '', k: mat.k, piano: last ? last.piano : '', ubicazione: '', descrizione: '', quantita: '', rif: '', foto: [] }]);
    setOpenN({ [id]: true }); setTimeout(() => scrollToId('s-' + id), 80); };
  const del = async x => { if (!confirm('Eliminare ' + x.codice + '?')) return; for (const b of blobIds(x)) await removeBlob(b); setNc(l => l.filter(y => y.id !== x.id)); };
  const next = 'NC' + (precBase(r, 'NC') + ncOf(r).length + 1);
  const precC = ((r.precedente || {}).campioni || []).filter(c => c.k === mat.k);
  return html`<div class="sec-h mt-4"><h3>Manufatti non campionati</h3><span class="hint">${precBase(r, 'NC') ? 'Dopo NC' + precBase(r, 'NC') + ' · MCA e FAV' : 'NC1, NC2… unica per MCA e FAV'}</span></div>
    ${L.length > 0 && html`<div class="list">${L.map(x => { const rc = ncRif(r, x); const cx = { ...x, descrizione: x.descrizione, quantita: [x.quantita, rc && 'come ' + rc].filter(Boolean).join(' · ') };
      return html`<${SampleRow} key=${x.id} c=${cx} mat=${mat} open=${!!openN[x.id]} toggle=${() => setOpenN(o => ({ ...o, [x.id]: !o[x.id] }))}
        onPhoto=${ids => upd(x.id, { foto: [...(x.foto || []), ...ids] })}>
        <${CampFields} c=${x} list=${list} upd=${patch => upd(x.id, patch)} codice=${html`<div class="code-auto" style=${'width:64px;flex-shrink:0;color:' + mat.c}>${x.codice}</div>`} />
        <div class="row">
          <input class="inp" placeholder="Quantità (es. 180 mq)" value=${x.quantita || ''} onInput=${e => upd(x.id, { quantita: e.target.value })} aria-label="Quantità" />
          <select class="inp" value=${x.rif || ''} onChange=${e => upd(x.id, { rif: e.target.value })} aria-label="Campione di riferimento">
            <option value="">Nessun campione di riferimento</option>${camp.map(c => html`<option value=${c.id}>Come ${c.codice}${c.descrizione ? ' · ' + c.descrizione.slice(0, 40) : ''}</option>`)}
            ${precC.length > 0 && html`<optgroup label="Indagine precedente">${precC.map(c => html`<option value=${c.id}>Come ${c.codice} (precedente)${c.esito ? ' · ' + c.esito : ''}${c.descrizione ? ' · ' + c.descrizione.slice(0, 30) : ''}</option>`)}</optgroup>`}</select>
        </div>
        <${PhotoStrip} ids=${x.foto || []} max=${4} onAdd=${ids => upd(x.id, { foto: [...(x.foto || []), ...ids] })}
          onRemove=${async id => { await removeBlob(id); upd(x.id, { foto: x.foto.filter(f => f !== id) }); }} />
        <button class="btn sm danger self-start" onClick=${() => del(x)}>Elimina ${x.codice}</button>
      <//>`; })}</div>`}
    <button class="btn dashed mt-3" onClick=${add}>+ Aggiungi manufatto non campionato ${next}</button>`;
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
