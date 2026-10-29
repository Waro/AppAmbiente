/* Monitoraggio dell'aria (fibre aerodisperse): attività a sé o sezione facoltativa del sopralluogo RA.
   Dati in r.aria = { attivo, punti: [...], rapporti: [...] }. Laboratorio, offerta, email referti, prelevato/verificato
   sono quelli della scheda campioni; campionatori, addetto alla taratura e profili d'analisi stanno nel file di configurazione. */

// limiti di riferimento (DM 06/09/1994): SEM 2 ff/l, MOCF 20 ff/l; per le FAV nessun limite di legge
const ARIA_METODI = [
  { k: 'SEM', l: 'SEM', lim: 2, desc: 'Aria - SEM' },
  { k: 'MOCF', l: 'MOCF', lim: 20, desc: 'Aria - MOCF' },
  { k: 'FAV', l: 'FAV', lim: null, desc: 'Aria - FAV' },
];
const ariaMet = k => ARIA_METODI.find(m => m.k === k) || ARIA_METODI[0];
const newAriaPunto = (x = {}) => ({ id: uid('s'), codice: '', piano: '', postazione: '', foto: [], stato: '', data: '', oraInizio: '', oraFine: '',
  campionatore: '', membrana: '', metodica: 'SEM', flusso: '', volume: '', rdp: '', conc: '', note: '', ...x });
const emptyAria = (attivo = true) => ({ attivo, punti: [], rapporti: [] });
const ariaOf = r => r.aria || emptyAria(false);
const ariaOn = r => !!(r && r.aria && (r.type === 'aria' || r.aria.attivo));
const ariaHas = r => ariaOn(r) && r.aria.punti.length > 0;

// durata in minuti tra due orari HH:MM (anche a cavallo della mezzanotte)
function ariaMin(a, b) {
  if (!/^\d\d:\d\d$/.test(a || '') || !/^\d\d:\d\d$/.test(b || '')) return null;
  const m = (+b.slice(0, 2) * 60 + +b.slice(3)) - (+a.slice(0, 2) * 60 + +a.slice(3));
  return m <= 0 ? m + 1440 : m;
}
const numIt = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; };
// volume: quello scritto a mano, altrimenti flusso × durata
function ariaVol(p) {
  const v = numIt(p.volume); if (v != null) return v;
  const f = numIt(p.flusso), m = ariaMin(p.oraInizio, p.oraFine);
  return f != null && m != null ? Math.round(f * m) : null;
}
const fmtNum = v => v == null ? '' : Number(v).toLocaleString('it-IT', { maximumFractionDigits: 2 });
// esito: "<0,38" = sotto il limite di rivelabilità; superamento solo con un valore numerico oltre il limite
function ariaEsito(p) {
  const s = String(p.conc || '').trim(); if (!s) return null;
  const lt = /^[<≤]/.test(s), n = numIt(s.replace(/^[<>≤≥]\s*/, ''));
  const lim = ariaMet(p.metodica).lim;
  return { txt: s, n, lt, lim, over: lim != null && n != null && !lt && n > lim };
}
const ariaStatoPunto = p => p.stato === 'non' ? 'non' : p.stato === 'fatto' ? (p.conc ? 'esito' : 'prelevato') : 'da';
function ariaRiepilogo(r) {
  const P = ariaOf(r).punti;
  const fatti = P.filter(p => p.stato === 'fatto'), non = P.filter(p => p.stato === 'non');
  const esiti = fatti.filter(p => p.conc), over = fatti.filter(p => (ariaEsito(p) || {}).over);
  return { tot: P.length, fatti: fatti.length, non: non.length, chiusi: fatti.length + non.length, esiti: esiti.length, over: over.length };
}
// prefisso del punto: M per le MOCF, S per SEM e FAV; numerazione separata per prefisso
const ariaPref = k => k === 'MOCF' ? 'M' : 'S';
const ariaNextCode = (punti, k = 'SEM') => { const px = ariaPref(k), re = new RegExp('^' + px + '(\\d+)$', 'i');
  return px + (punti.map(p => +((String(p.codice || '').trim().match(re) || [])[1] || 0)).reduce((a, b) => Math.max(a, b), 0) + 1); };
// cambio di metodica: rinomino solo i punti nuovi con il codice proposto da Nembo (non quelli ripresi né quelli scritti a mano)
const ariaRecode = (punti, id, k) => punti.map(x => x.id !== id ? x : (x.ripreso || x.codiceMano || ariaPref(x.metodica) === ariaPref(k)) ? { ...x, metodica: k }
  : { ...x, metodica: k, codice: ariaNextCode(punti.filter(y => y.id !== id), k) });
const ariaProfilo = (s, k) => { const m = ariaMet(k); const c = ((s && s.ariaProfili) || {})[k] || ''; return c ? `${c} (${m.desc})` : m.desc; };
const ariaCampionatori = s => (Array.isArray(s.ariaCampionatori) ? s.ariaCampionatori : String(s.ariaCampionatori || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
const ariaLabels = r => ariaOn(r) ? ariaOf(r).punti.map(p => { const e = ariaEsito(p); return { ref: p.id, text: p.codice || ariaPref(p.metodica), color: e && e.over ? PRINT.ariaOver : PRINT.aria, piano: p.piano || '' }; }) : [];

/* ---------------- attività a sé ---------------- */
function newAria(records, s) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'aria' && (r.codice || '').startsWith('ARIA-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return { id: uid('ar'), type: 'aria', codice: `ARIA-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', citta: '', sito: '', indirizzo: '', data: today(), tecnico: `${s.tecnicoNome} ${s.tecnicoCognome}`.trim(),
    aria: emptyAria(true), planimetrie: [], fogli: [], appunti: '', fotoAppunti: [] };
}
const ariaIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !ariaOf(r).punti.length && !r.appunti && !(r.fotoAppunti || []).length && !(r.fogli || []).length;

/* ---------------- scheda del punto ---------------- */
function AriaPuntoCard({ p, open, toggle, onUpd, onMet, onDel, onScan, settings }) {
  const set = patch => onUpd(p.id, patch);
  const st = ariaStatoPunto(p), e = ariaEsito(p), m = ariaMet(p.metodica);
  const min = ariaMin(p.oraInizio, p.oraFine), vAuto = numIt(p.flusso) != null && min != null ? Math.round(numIt(p.flusso) * min) : null;
  const camp = ariaCampionatori(settings);
  const badge = st === 'non' ? html`<span class="badge b-grey">Non eseguito</span>`
    : st === 'esito' ? html`<span class=${'badge ' + (e && e.over ? 'b-nc' : 'b-ok')}>${e.txt} ff/l</span>`
    : st === 'prelevato' ? html`<span class="badge b-f2">Attesa esito</span>` : html`<span class="badge st-none">Da prelevare</span>`;
  return html`<div class="punto" id=${'s-' + p.id}>
    <button class="punto-h" aria-expanded=${open} onClick=${toggle}>
      <span class="rtag tint" style="--c:var(--t-aria)">${p.codice || ariaPref(p.metodica)}</span>
      <div class="t"><b>${[p.piano, p.postazione].filter(Boolean).join(' · ') || 'Postazione da indicare'}</b>
        <small>${st === 'non' ? 'Monitoraggio non eseguito' : p.stato === 'fatto' ? [fmtD(p.data), m.l, p.membrana && 'membrana ' + p.membrana].filter(Boolean).join(' · ') : 'Tocca per compilare'}</small></div>
      ${badge}<span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
    ${open && html`<div class="punto-b">
      <div class="grid2">
        <${Inp} label="Codice" value=${p.codice} set=${v => set({ codice: v, codiceMano: true })} />
        <${Inp} label="Piano" value=${p.piano} set=${v => set({ piano: v })} placeholder="es. Piano 2°" />
        <${InpGrow} cls="full" label="Postazione di prelievo" value=${p.postazione} set=${v => set({ postazione: v })} placeholder="es. Area vendita c/o scale mobili" />
      </div>
      <div class="fld"><span>Prelievo</span></div>
      <div class="seg">${[['fatto', 'Eseguito'], ['non', 'Non eseguito']].map(([k, l]) => html`<button class=${p.stato === k ? 'on' : ''} onClick=${() => set({ stato: p.stato === k ? '' : k, ...(k === 'fatto' && !p.data ? { data: today() } : {}) })}>${l}</button>`)}</div>
      ${p.stato === 'fatto' && html`<div class="grid2">
        <${Inp} label="Data" type="date" value=${p.data} set=${v => set({ data: v })} />
        <div class="fld"><span>Metodica</span><div class="seg" style="margin-top:6px">${ARIA_METODI.map(x => html`<button class=${p.metodica === x.k ? 'on' : ''} onClick=${() => onMet(p.id, x.k)}>${x.l}</button>`)}</div></div>
        <${Inp} label="Ora inizio" type="time" value=${p.oraInizio} set=${v => set({ oraInizio: v })} />
        <${Inp} label="Ora fine" type="time" value=${p.oraFine} set=${v => set({ oraFine: v })} />
        <label class="fld full"><span>Campionatore e matricola</span>
          <input class="inp" list=${'dl-camp-' + p.id} value=${p.campionatore} onInput=${ev => set({ campionatore: ev.target.value })} placeholder=${camp.length ? 'Scegli o scrivi' : 'es. Modello · S/N 0000'} />
          <datalist id=${'dl-camp-' + p.id}>${camp.map(c => html`<option value=${c} />`)}</datalist></label>
        <label class="fld full"><span>Membrana · ID supporto</span>
          <div class="row" style="gap:8px"><input class="inp" style="flex:1" value=${p.membrana} onInput=${ev => set({ membrana: ev.target.value })} placeholder="Codice sulla membrana" />
            <button class="btn" onClick=${() => onScan(p)}><${Icon} n="scan" s=${17} /> Scansiona</button></div></label>
        <${Inp} label="Flusso (l/min)" inputmode="decimal" value=${p.flusso} set=${v => set({ flusso: v })} />
        <${Inp} label="Litri prelevati" inputmode="decimal" value=${p.volume} set=${v => set({ volume: v })} placeholder=${vAuto != null ? fmtNum(vAuto) + ' (calcolato)' : 'flusso × durata'} />
      </div>
      ${min != null && html`<p class="lead" style="margin:-2px 2px 6px;font-size:var(--fs-sm)">Durata ${Math.floor(min / 60)} h ${min % 60} min${vAuto != null ? ` · ${fmtNum(numIt(p.flusso))} l/min × ${min} min = ${fmtNum(vAuto)} litri` : ''}</p>`}
      <div class="fld"><span>Esito di laboratorio</span></div>
      <div class="grid2">
        <${Inp} label="Rapporto di prova" value=${p.rdp} set=${v => set({ rdp: v })} placeholder="es. RdP 24/000123150" />
        <${Inp} label=${'Concentrazione (ff/l)' + (m.lim != null ? ' · limite ' + fmtNum(m.lim) : '')} value=${p.conc} set=${v => set({ conc: v })} placeholder="es. <0,38" />
      </div>
      ${e && e.over && html`<div class="notice err" style="margin-top:0">Valore oltre il limite di ${fmtNum(e.lim)} ff/l</div>`}`}
      <${Area} label="Note" rows=${2} value=${p.note} set=${v => set({ note: v })} />
      <div><div class="fld"><span>Foto della postazione</span></div>
        <${PhotoStrip} ids=${p.foto} max=${3} onAdd=${ids => set({ foto: [...p.foto, ...ids] })} onRemove=${async id => { await removeBlob(id); set({ foto: p.foto.filter(f => f !== id) }); }} /></div>
      <button class="btn sm danger" style="justify-self:start" onClick=${() => onDel(p)}>Elimina punto</button>
    </div>`}
  </div>`;
}

/* ---------------- sezione (attività a sé e dentro l'RA) ---------------- */
function AriaSection({ r, up, settings, inRa }) {
  const [openP, setOpenP] = useState({});
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState('');
  const A = ariaOf(r), P = A.punti, R = ariaRiepilogo(r);
  const recRef = useRef(r); recRef.current = r;
  const upA = fn => up(q => { const a = ariaOf(q); return { ...q, aria: { ...a, ...fn(a) } }; });
  const updP = (id, patch) => upA(a => ({ punti: a.punti.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const metP = (id, k) => upA(a => ({ punti: ariaRecode(a.punti, id, k) }));
  const addP = () => {
    const last = P[P.length - 1], met = last ? last.metodica : 'SEM';
    const np = newAriaPunto({ codice: ariaNextCode(P, met), metodica: met, flusso: last ? last.flusso : '' });
    upA(a => ({ punti: [...a.punti, np] })); setOpenP({ [np.id]: true }); setTimeout(() => scrollToId('s-' + np.id), 80);
  };
  const delP = async p => {
    if (!confirm('Eliminare il punto ' + (p.codice || '') + '?')) return;
    for (const b of blobIds(p)) await removeBlob(b);
    upA(a => ({ punti: a.punti.filter(x => x.id !== p.id) }));
  };
  const onScan = p => setScan({
    title: 'Membrana ' + (p.codice || ''), target: (p.codice || 'Punto') + ' · ID supporto',
    onCode: code => {
      const d = ariaOf(recRef.current).punti.find(x => x.id !== p.id && x.membrana === code);
      if (d) return { error: `${code} è già usato in ${d.codice}` };
      updP(p.id, { membrana: code }); return { msg: `${p.codice}: ${code}`, close: true };
    },
  });
  const nextP = () => { const p = P.find(x => !x.stato); if (!p) return; setOpenP({ [p.id]: true }); setTimeout(() => scrollToId('s-' + p.id), 80); };
  AriaSection.next = nextP;
  return html`<div id=${'aria-' + r.id}>
    <div class="sec-h"><h3>${inRa ? 'Monitoraggio aria' : 'Punti di monitoraggio'} · ${R.tot}</h3><span class="hint">${R.chiusi} di ${R.tot} fatti${R.esiti ? ' · ' + R.esiti + ' esiti' : ''}</span></div>
    ${R.tot > 0 && html`<div class="track" style="margin:0 2px 12px"><i style=${'background:var(--ok);width:' + Math.round(R.chiusi / R.tot * 100) + '%'}></i></div>`}
    ${!R.tot && html`<div class="card"><div class="empty" style="padding:16px">Aggiungi un punto per ogni postazione di prelievo (S1, S2…).</div></div>`}
    ${P.map(p => html`<${AriaPuntoCard} key=${p.id} p=${p} settings=${settings} open=${!!openP[p.id]} toggle=${() => setOpenP({ ...openP, [p.id]: !openP[p.id] })} onUpd=${updP} onMet=${metP} onDel=${delP} onScan=${onScan} />`)}
    <button class="btn dashed" onClick=${addP}>+ Aggiungi punto</button>
    ${R.over > 0 && html`<div class="notice err">${R.over === 1 ? '1 punto oltre il limite' : R.over + ' punti oltre il limite'}</div>`}

    <div class="sec-h"><h3>Rapporti di prova</h3><span class="hint">Referti del laboratorio</span></div>
    <div class="card"><${FileList} items=${A.rapporti || []} accept="application/pdf,image/*" label="Allega rapporto di prova"
      onAdd=${d => upA(a => ({ rapporti: [...(a.rapporti || []), d] }))}
      onRemove=${async d => { await removeBlob(d.blobId); upA(a => ({ rapporti: (a.rapporti || []).filter(x => x.id !== d.id) })); }} /></div>

    <div class="sec-h"><h3>Schede aria</h3></div>
    <div class="card"><p class="lead" style="margin:2px 0 10px">Scheda di prelievo ed esiti, in Excel e PDF, si generano nella scheda File.</p>
      <button class="btn" onClick=${() => dispatchEvent(new CustomEvent('nembo-goto', { detail: 'tab:file' }))}><${Icon} n="file" s=${16} /> Vai a File</button>
      ${!ariaCampionatori(settings).length && html`<p class="lead" style="margin:10px 2px 0;font-size:var(--fs-sm)">L'elenco dei campionatori e i codici d'analisi si impostano in Impostazioni → Monitoraggio aria.</p>`}
    </div>
    ${scan && html`<${Scanner} title=${scan.title} target=${scan.target} onCode=${scan.onCode} onClose=${() => setScan(null)} />`}
  </div>`;
}

// nel sopralluogo RA: sezione facoltativa
function AriaInRa({ r, up, settings }) {
  if (!ariaOn(r)) return html`<div class="sec-h"><h3>Monitoraggio aria</h3><span class="hint">Facoltativo</span></div>
    <div class="card tight"><p class="lead" style="margin:4px 0 10px">Campionamento delle fibre aerodisperse (SEM, MOCF, FAV) con scheda di prelievo e riepilogo degli esiti.</p>
      <button class="btn block" onClick=${() => up(q => ({ ...q, aria: { ...ariaOf(q), attivo: true, punti: ariaOf(q).punti.length ? ariaOf(q).punti : [newAriaPunto({ codice: 'S1' })] } }))}><${Icon} n="plus" s=${17} /> Aggiungi monitoraggio aria</button></div>`;
  const vuoto = !ariaOf(r).punti.some(p => p.stato || p.conc || (p.foto || []).length);
  return html`<${AriaSection} r=${r} up=${up} settings=${settings} inRa=${true} />
    ${vuoto && html`<button class="btn link sm" style="margin-top:4px" onClick=${() => up(q => ({ ...q, aria: { ...ariaOf(q), attivo: false, punti: [] } }))}>Togli il monitoraggio aria</button>`}`;
}

/* ---------------- elenco e scheda dell'attività ---------------- */
function AriaList({ records, open, activeId, acts }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'aria').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const inRa = records.filter(r => r.type === 'ra' && ariaHas(r)).length;
  const groups = {};
  all.forEach(r => { const c = r.cliente || 'Senza cliente'; (groups[c] = groups[c] || []).push(r); });
  return html`<div class="content">
    <${LargeTitle} top eye="Ambiente" title="Monitoraggio aria" sub="Fibre aerodisperse: prelievi, schede ed esiti" acts=${acts} />
    ${inRa > 0 && html`<p class="lead" style="margin:0 2px 12px">${inRa === 1 ? 'Un sopralluogo RA ha' : inRa + ' sopralluoghi RA hanno'} il monitoraggio aria nella propria scheda.</p>`}
    ${!all.length && html`<div class="empty"><b>Nessun monitoraggio</b>Tocca + e scegli “Monitoraggio aria”. Nei sopralluoghi RA c'è anche la sezione facoltativa.</div>`}
    ${Object.entries(groups).map(([c, rs]) => html`<div key=${c}><div class="grp-client">${c}</div><div class="list">
      ${rs.map(r => { const R = ariaRiepilogo(r); return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
        <div class="r1"><span class="id">${r.codice}</span><span class=${'badge ' + (!R.tot ? 'b-grey' : R.over ? 'b-nc' : R.chiusi < R.tot ? 'b-f2' : R.esiti < R.fatti ? 'b-f1' : 'b-ok')}>${!R.tot ? 'Da impostare' : R.chiusi < R.tot ? `${R.chiusi}/${R.tot} prelievi` : R.esiti < R.fatti ? 'Attesa esiti' : 'Completato'}</span><span class="dt">${fmtD(r.data)}</span></div>
        ${(r.commessa || placeLabel(r)) && html`<div class="ttl">${[r.commessa, placeLabel(r)].filter(Boolean).join(' · ')}</div>`}
        <div class="sum">${R.tot} ${R.tot === 1 ? 'punto' : 'punti'}${R.non ? ' · ' + R.non + ' non eseguiti' : ''}${R.esiti ? ' · ' + R.esiti + ' esiti' : ''}</div>
        ${R.over > 0 && html`<div class="due late">${R.over === 1 ? '1 punto oltre il limite' : R.over + ' punti oltre il limite'}</div>`}
        <${OdBadge} map=${od} r=${r} /></button>`; })}</div></div>`)}
  </div>`;
}

function AriaForm({ rec: initial, records, settings, onSave, onDelete, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const clienti = nomiClienti(records);
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);
  const R = ariaRiepilogo(r);
  const firmeOn = !!r.firme || (r.fogli || []).length > 0;
  const [T, setT] = useSchede('aria', firmeOn ? ['anag', 'punti', 'firme', 'file'] : ['anag', 'punti', 'file'], initial._new, { 's-': 'punti', 'plan-': 'punti', 'aria-': 'punti' });
  return html`<div class="content form">
    <${DetailHead} conclusa=${r.conclusa} eye="Monitoraggio aria" title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'punti', l: 'Punti', n: R.tot }, firmeOn && { k: 'firme', l: 'Firme', n: (r.fogli || []).length }, { k: 'file', l: 'File' }].filter(Boolean)} />
    ${T === 'anag' && html`    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Cliente" list="dl-cli-aria" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via e numero civico" />
      <${Inp} label="Sito / codice immobile" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="Facoltativo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div><datalist id="dl-cli-aria">${clienti.map(c => html`<option value=${c} />`)}</datalist></div>
    `}
    ${T === 'punti' && html`
    <div class="card-navy"><div class="sum3">
      <div><b>${R.chiusi}<small>/${R.tot}</small></b><span>prelievi fatti</span></div>
      <div><b>${R.esiti}<small>/${R.fatti}</small></b><span>esiti inseriti</span></div>
      <div><b class=${R.over ? 'crit' : ''}>${R.over}</b><span>oltre il limite</span></div></div></div>
    <${AriaSection} r=${r} up=${up} settings=${settings} />
    <div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3><span class="hint">Etichette dei punti di monitoraggio</span></div>
    <div class="card"><${PlanList} items=${r.planimetrie || []} labels=${ariaLabels(r)}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>
    <div class="sec-h"><h3>Appunti</h3><span class="hint">Testo libero</span></div>
    <div class="card"><textarea class="inp" rows="3" value=${r.appunti} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti"></textarea>
      <${NotePhotos} rec=${r} up=${up} /></div>
    `}
    ${T === 'firme' && html`<${FogliFirme} r=${r} up=${up} settings=${settings} />`}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { if (T !== 'punti') setT('punti'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${T === 'punti' ? (R.chiusi < R.tot ? html`<button class="btn pri" onClick=${() => AriaSection.next && AriaSection.next()}>Prossimo punto · ${R.tot - R.chiusi}</button>`
        : R.tot ? html`<button class="btn pri" onClick=${upload}><${Icon} n="share" s=${19} /> Carica su OneDrive</button>`
        : html`<button class="btn pri" onClick=${() => up(q => ({ ...q, aria: { ...ariaOf(q), punti: [...ariaOf(q).punti, newAriaPunto({ codice: ariaNextCode(ariaOf(q).punti, (ariaOf(q).punti.slice(-1)[0] || {}).metodica), metodica: (ariaOf(q).punti.slice(-1)[0] || {}).metodica || 'SEM' })] } }))}><${Icon} n="plus" s=${20} w=${2.4} /> Nuovo punto</button>`) : html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[opzArchivio({ r, settings, onDelete, up, elimina: 'Elimina il monitoraggio', firme: !firmeOn && (() => { up(q => prepFirme({ ...q }, settings, true)); setT('firme'); }) })]} />
  </div>`;
}

/* ---------------- impostazioni ---------------- */
function AriaSettings({ s, set }) {
  const pr = s.ariaProfili || {};
  return html`<div class="card">
    <p class="lead" style="margin:2px 0 10px">Laboratorio, offerta, email per i referti, «prelevato da» e «verificato da» sono quelli della scheda campioni.</p>
    <label class="fld"><span>Campionatori e matricole (uno per riga)</span>
      <textarea class="inp" rows="5" value=${ariaCampionatori(s).join('\n')} onInput=${e => set({ ariaCampionatori: e.target.value.split('\n') })} placeholder="Modello · S/N 0000"></textarea></label>
    <${Inp} label="Addetto verifica taratura" value=${s.ariaTaratura || ''} set=${v => set({ ariaTaratura: v })} placeholder="es. Geom. Nome Cognome" />
    <div class="grid2" style="margin-top:4px">${ARIA_METODI.map(m => html`<${Inp} label=${'Codice analisi ' + m.l} value=${pr[m.k] || ''} set=${v => set({ ariaProfili: { ...pr, [m.k]: v } })} placeholder="codice profilo del laboratorio" />`)}</div>
  </div>`;
}

/* ---------------- uscite: Excel e PDF ---------------- */
const ariaFileName = (r, kind) => (kind === 'scheda' ? 'Scheda_prelievo_aria_' : 'Riepilogo_monitoraggi_aria_') + slug(r.commessa || r.codice || 'aria');
function ariaInfo(r, s) {
  const P = ariaOf(r).punti;
  return {
    commessa: r.commessa || '', cliente: r.cliente || '', sito: placeDoc(r), email: s.emailReferti || '',
    lab: [s.labNome, s.labR1, s.labR2].filter(Boolean).join('\n'), offerta: [s.offerta, s.offertaRev].filter(Boolean).join(' - '),
    taratura: s.ariaTaratura || '', prelevatoDa: s.prelevatoDa || '', verificatoDa: s.verificatoDa || '',
    prelievi: P.filter(p => p.stato === 'fatto').map(p => ({ codice: p.codice, data: p.data, postazione: [p.piano, p.postazione].filter(Boolean).join('\n'),
      campionatore: p.campionatore, volume: ariaVol(p), flusso: numIt(p.flusso), analisi: ariaProfilo(s, p.metodica), membrana: p.membrana })),
    esiti: P.filter(p => p.stato).map(p => { const e = ariaEsito(p), m = ariaMet(p.metodica); return { codice: p.codice, postazione: [p.piano, p.postazione].filter(Boolean).join('\n'),
      non: p.stato === 'non', data: p.data || r.data, metodica: m.l, membrana: p.membrana, rdp: p.rdp, volume: ariaVol(p), limite: m.lim, conc: p.conc || '', over: !!(e && e.over) }; }),
  };
}
// con il modello delle schede di prelievo a 2 pagine la scheda aria è la pagina ARIA del modello; altrimenti l'impaginazione di Nembo
async function ariaSchedaPdf(r, s) {
  let tpl = null; try { tpl = await loadTemplate('scheda_campioni.pdf'); } catch (e) { /* modello assente */ }
  if (tpl && await PdfGen.isSchedeV46(tpl)) return PdfGen.schedePdf(tpl, 'aria', ariaInfo(r, s));
  return PdfGen.ariaPdf('scheda', ariaInfo(r, s));
}
async function ariaRiepilogoPdf(r, s) { return PdfGen.ariaPdf('riepilogo', ariaInfo(r, s)); }

async function ariaXlsxBase(title, cols) {
  await needLib('exceljs');
  const wb = new ExcelJS.Workbook(); wb.creator = 'Nembo'; wb.created = new Date();
  const ws = wb.addWorksheet(title.slice(0, 30), { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } } });
  ws.columns = cols.map(w => ({ width: w }));
  const thin = { style: 'thin', color: { argb: 'FF000000' } }, box = { top: thin, left: thin, bottom: thin, right: thin };
  const grey = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  const N = cols.length;
  const row = (vals, h) => { const x = ws.addRow(vals); x.height = h || 18; return x; };
  const full = (text, o = {}) => { const x = row([text], o.h); ws.mergeCells(x.number, 1, x.number, N); const c = x.getCell(1); c.font = { bold: !!o.b, size: o.sz || 10, italic: !!o.i }; c.alignment = { horizontal: o.center ? 'center' : 'left', vertical: 'middle', wrapText: true }; if (o.box) { c.border = box; } if (o.fill) c.fill = grey; return x; };
  const head = (label, value, h) => { const x = row([label, '', value], h || 22); ws.mergeCells(x.number, 1, x.number, 2); ws.mergeCells(x.number, 3, x.number, N);
    x.getCell(1).font = { bold: true, size: 10 }; x.getCell(1).fill = grey; x.getCell(3).font = { bold: true, size: 11 };
    [1, 3].forEach(c => { x.getCell(c).border = box; x.getCell(c).alignment = { vertical: 'middle', wrapText: true }; }); };
  const th = vals => { const x = row(vals, 34); x.eachCell(c => { c.font = { bold: true, italic: true, size: 10 }; c.fill = grey; c.border = box; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; }); };
  return { wb, ws, row, full, head, th, box, N };
}
const xDate = iso => iso ? new Date(iso + 'T12:00:00') : null;
const lines = t => Math.max(1, String(t || '').split('\n').length);

async function ariaSchedaXlsx(r, s) {
  const I = ariaInfo(r, s);
  const tpl = await schedaTplXlsx();
  if (tpl) { const z = await JSZip.loadAsync(tpl); if (/name="[^"]*ARIA/i.test(await z.file('xl/workbook.xml').async('string'))) return schedeXlsx(tpl, 'aria', I); }
  const { wb, ws, row, full, head, th, box } = await ariaXlsxBase('Scheda prelievo aria', [7, 13, 34, 30, 13, 13, 30]);
  full('SCHEDA DI PRELIEVO: CAMPIONI FIBRE AERODISPERSE', { b: true, sz: 14, center: true, h: 26 });
  row([]);
  head('COMMESSA - PROGETTO', [I.commessa, I.cliente].filter(Boolean).join(' · '));
  head('SITO', I.sito, 18 * lines(I.sito) + 6);
  head('REFERTI A', I.email);
  head('LABORATORIO', I.lab, 16 * lines(I.lab) + 6);
  head('OFFERTA', I.offerta);
  row([]);
  th(['#', 'Data prelievo', 'Postazione prelievo', 'Campionatore e matricola', "Litri d'aria prelevati", 'Flusso (litri/minuto)', 'Tipologia analisi richiesta']);
  for (const p of I.prelievi) {
    const x = row([p.codice, xDate(p.data), p.postazione, p.campionatore, p.volume, p.flusso, p.analisi], Math.max(30, 15 * Math.max(lines(p.postazione), lines(p.campionatore))));
    x.getCell(1).font = { bold: true }; x.getCell(2).numFmt = 'dd/mm/yyyy'; x.getCell(5).numFmt = '#,##0'; x.getCell(6).numFmt = '0.##';
    x.eachCell({ includeEmpty: true }, (c, n) => { c.border = box; c.alignment = { vertical: 'middle', wrapText: true, horizontal: n <= 2 || n === 5 || n === 6 ? 'center' : 'left' }; });
  }
  row([]);
  if (I.taratura) full('ADDETTO VERIFICA TARATURA: ' + I.taratura, { b: true });
  full('PRELEVATO DA: ' + I.prelevatoDa, { b: true });
  full('VERIFICATO DA: ' + I.verificatoDa, { b: true });
  return new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME });
}

async function ariaRiepilogoXlsx(r, s) {
  const I = ariaInfo(r, s);
  const { wb, ws, row, full, head, th, box } = await ariaXlsxBase('Riepilogo monitoraggi aria', [8, 34, 13, 11, 26, 13, 13, 15]);
  full('MONITORAGGI DELL\'ARIA: RIEPILOGO DEGLI ESITI', { b: true, sz: 14, center: true, h: 26 });
  row([]);
  head('COMMESSA - PROGETTO', [I.commessa, I.cliente].filter(Boolean).join(' · '));
  head('SITO', I.sito, 18 * lines(I.sito) + 6);
  row([]);
  th(['Punto', 'Postazione', 'Data', 'Metodica', 'Membrana / Rapporto di prova', 'Volume campionato (litri)', 'Limite di legge (fibre/litro)', 'Concentrazione (fibre/litro)']);
  for (const e of I.esiti) {
    const h = Math.max(30, 15 * lines(e.postazione));
    if (e.non) {
      const x = row([e.codice, e.postazione, xDate(e.data), 'MONITORAGGIO NON EFFETTUATO'], h); ws.mergeCells(x.number, 4, x.number, 8);
      x.getCell(3).numFmt = 'dd/mm/yyyy'; x.getCell(4).font = { bold: true, underline: true };
      for (let c = 1; c <= 8; c++) { const cell = x.getCell(c); cell.border = box; cell.alignment = { vertical: 'middle', wrapText: true, horizontal: c === 2 ? 'left' : 'center' }; }
      x.getCell(1).font = { bold: true };
      continue;
    }
    const x = row([e.codice, e.postazione, xDate(e.data), e.metodica, [e.membrana, e.rdp].filter(Boolean).join('\n'), e.volume, e.limite == null ? '—' : e.limite, e.conc || 'in attesa'], h);
    x.getCell(3).numFmt = 'dd/mm/yyyy'; x.getCell(6).numFmt = '#,##0'; x.getCell(7).numFmt = '0.0';
    x.eachCell({ includeEmpty: true }, (c, n) => { c.border = box; c.alignment = { vertical: 'middle', wrapText: true, horizontal: n === 2 ? 'left' : 'center' }; });
    x.getCell(1).font = { bold: true }; x.getCell(8).font = { bold: true, color: { argb: e.over ? 'FFC00000' : 'FF000000' } };
  }
  row([]);
  full('Limiti di riferimento DM 06/09/1994: 2 fibre/litro in SEM, 20 fibre/litro in MOCF.', { i: true, sz: 9 });
  return new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME });
}

// file per ZIP, OneDrive e condivisione
function ariaOutputs(r, s) {
  if (!ariaHas(r)) return [];
  const A = ariaOf(r), out = [];
  if (A.punti.some(p => p.stato === 'fatto')) {
    out.push({ kind: 'office', type: XLSX_MIME, name: ariaFileName(r, 'scheda'), ext: '.xlsx', make: () => ariaSchedaXlsx(r, s) });
    out.push({ kind: 'pdf', name: ariaFileName(r, 'scheda'), ext: '.pdf', make: () => ariaSchedaPdf(r, s) });
  }
  if (A.punti.some(p => p.stato)) {
    out.push({ kind: 'office', type: XLSX_MIME, name: ariaFileName(r, 'riep'), ext: '.xlsx', make: () => ariaRiepilogoXlsx(r, s) });
    out.push({ kind: 'pdf', name: ariaFileName(r, 'riep'), ext: '.pdf', make: () => ariaRiepilogoPdf(r, s) });
  }
  return out;
}
const ariaPhotos = r => ariaHas(r) ? ariaOf(r).punti.flatMap(p => (p.foto || []).map((f, k) => ({ id: f, name: `Aria_${p.codice || 'punto'}_${k + 1}` }))) : [];
const ariaRapporti = r => ariaOn(r) ? (ariaOf(r).rapporti || []) : [];
