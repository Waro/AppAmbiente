/* Modulo Campagne Radon */

const MOMENTI = ['Posizionamento Fase 1', 'Ritiro Fase 1 e posizionamento Fase 2', 'Ritiro Fase 2'];
const STATI = {
  da_iniziare: ['Da iniziare', 'b-viol'], fase1: ['Fase 1', 'b-f1'], fase2: ['Fase 2', 'b-f2'],
  esiti: ['Attesa esiti', 'b-grey'], terminata: ['Terminata', 'b-ok'],
};
const YN = [['accesso', "Accesso dall'esterno"], ['apertura', "Apertura verso l'esterno"], ['clima', 'Impianto di climatizzazione']];

const emptyMomento = s => ({ data: '', tecnicoCognome: s.tecnicoCognome, tecnicoNome: s.tecnicoNome, firmaTecnico: '', referenteCognome: '', referenteNome: '', firmaReferente: '', confermato: false });
const newPunto = (x = {}) => ({ id: uid('p'), piano: '', ubicazione: '', accesso: null, apertura: null, clima: null, codiceF1: '', codiceF2: '', foto: [], valoreF1: '', valoreF2: '', ...x });
function newRadon(settings) {
  return {
    id: uid('rad'), type: 'radon', createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', insegna: '', codice: '', citta: '', provincia: '', indirizzo: '', altro: '', telefono: '', note: '',
    momenti: [emptyMomento(settings), emptyMomento(settings), emptyMomento(settings)], punti: [], rapporti: [], planimetrie: [],
  };
}
const radonIsEmpty = r => !r.commessa && !r.cliente && !r.citta && !(r.fotoAppunti || []).length && !r.punti.length && !(r.planimetrie || []).length && !r.note && !(r.momenti || []).some(m => m.appunti);

function radonStato(c) {
  const m = c.momenti;
  if (!m[0].confermato) return 'da_iniziare';
  if (!m[1].confermato) return 'fase1';
  if (!m[2].confermato) return 'fase2';
  const done = c.punti.length && c.punti.every(p => num(p.valoreF1) != null && num(p.valoreF2) != null);
  return done ? 'terminata' : 'esiti';
}
function radonScadenza(c) {
  const s = radonStato(c);
  if (s === 'fase1') return addMonths(c.momenti[0].data, 6);
  if (s === 'fase2') return addMonths(c.momenti[1].data, 6);
  return null;
}
// media annua pesata sui giorni di esposizione delle due fasi
function mediaPunto(c, p) {
  const v1 = num(p.valoreF1), v2 = num(p.valoreF2);
  if (v1 == null || v2 == null) return null;
  const [a, b, d] = c.momenti.map(m => m.data);
  const g1 = a && b ? daysBetween(a, b) : 0, g2 = b && d ? daysBetween(b, d) : 0;
  return g1 > 0 && g2 > 0 ? (v1 * g1 + v2 * g2) / (g1 + g2) : (v1 + v2) / 2;
}
function mediaMax(c) {
  let best = null;
  c.punti.forEach((p, i) => { const m = mediaPunto(c, p); if (m != null && (!best || m > best.v)) best = { v: m, n: i + 1 }; });
  return best;
}
function dueLine(c) {
  const s = radonStato(c);
  if (s === 'da_iniziare') return html`<div class="due ok">Dosimetri da posizionare</div>`;
  if (s === 'esiti') return html`<div class="due ok">In attesa dei risultati di laboratorio</div>`;
  if (s === 'terminata') { const m = mediaMax(c); return m && html`<div class=${'due ' + (m.v > 300 ? 'late' : 'ok')}>Media più alta ${fmtN(m.v)} Bq/m³ (R${m.n})</div>`; }
  const d = radonScadenza(c), g = daysBetween(today(), d);
  const cls = g < 0 ? 'late' : g <= 30 ? 'soon' : 'ok';
  return html`<div class=${'due ' + cls}>Ritiro previsto ${fmtD(d)} · ${g < 0 ? 'scaduto da ' + -g + ' gg' : g === 0 ? 'oggi' : 'tra ' + g + ' gg'}</div>`;
}

/* ---------------- elenco ---------------- */
function RadonList({ records, open, create, activeId, acts }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'radon');
  const [f, setF] = useState('attive');
  const match = (r, k) => k === 'attive' ? radonStato(r) !== 'terminata' : k === 'tutte' || radonStato(r) === k;
  const list = all.filter(r => match(r, f)).sort((a, b) => {
    const da = radonScadenza(a), db = radonScadenza(b);
    if (da && db) return da.localeCompare(db); if (da) return -1; if (db) return 1;
    return b.updatedAt - a.updatedAt;
  });
  const pills = [['attive', 'In corso'], ['da_iniziare', 'Da iniziare'], ['fase1', 'Fase 1'], ['fase2', 'Fase 2'], ['esiti', 'Attesa esiti'], ['terminata', 'Terminate'], ['tutte', 'Tutte']];
  return html`<div class="content">
    <${LargeTitle} top eye="Radon" title="Campagne" sub="Due fasi da circa 6 mesi negli stessi punti" acts=${acts} />
    <div class="pills">${pills.map(([k, l]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${all.filter(r => match(r, k)).length}</span></button>`)}</div>
    ${!list.length && html`<div class="empty"><b>Nessuna campagna qui</b>Tocca + per registrare una nuova campagna.</div>`}
    <div class="list">${list.map(r => {
      const s = radonStato(r);
      return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
        <div class="r1"><span class="id">${r.commessa || 'Commessa da indicare'}</span><span class=${'badge ' + STATI[s][1]}>${STATI[s][0]}</span><span class="dt">${r.punti.length} punti</span></div>
        <div class="ttl">${[r.cliente, r.insegna].filter(Boolean).join(' · ') || 'Cliente da indicare'}</div>
        <div class="sum">${[r.citta && r.citta + (r.provincia ? ' (' + r.provincia + ')' : ''), r.indirizzo].filter(Boolean).join(', ')}</div>
        ${dueLine(r)}<${OdBadge} map=${od} r=${r} /></button>`;
    })}</div>
  </div>`;
}

/* ---------------- punto di misura ---------------- */
function PuntoCard({ p, n, open, toggle, lockPos, lockF2, onUpd, onDel, onScan }) {
  const set = patch => onUpd(p.id, patch);
  const miss = [!p.codiceF1 && 'dosimetro', !p.foto.length && 'foto'].filter(Boolean);
  return html`<div class="punto" id=${'p-' + p.id}>
    <button class="punto-h" aria-expanded=${open} onClick=${toggle}>
      <span class="rtag">R${n}</span>
      <div class="t"><b>${[p.piano, p.ubicazione].filter(Boolean).join(' · ') || 'Posizione da descrivere'}</b>
        <small><span class="mono">${p.codiceF1 || '—'}${p.codiceF2 ? '  →  ' + p.codiceF2 : ''}</span>${miss.length && !lockPos ? html`  ·  <span class="crit">manca ${miss.join(' e ')}</span>` : ''}</small></div>
      <span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
    ${open && html`<div class="punto-b">
      <div class="grid2">
        <${Inp} label="Piano" value=${p.piano} set=${v => set({ piano: v })} disabled=${lockPos} list="dl-piani" />
        <${InpGrow} cls="full" label="Ubicazione" value=${p.ubicazione} set=${v => set({ ubicazione: v })} disabled=${lockPos} />
      </div>
      <div class="yn">${YN.map(([k, l]) => html`<span>${l}</span><div class="two">
        ${['si', 'no'].map(v => html`<button class=${p[k] === v ? 'on' : ''} disabled=${lockPos} onClick=${() => set({ [k]: p[k] === v ? null : v })}>${v === 'si' ? 'Sì' : 'No'}</button>`)}</div>`)}</div>
      <div class="dosim"><${Inp} label="Dosimetro Fase 1" value=${p.codiceF1} set=${v => set({ codiceF1: v.trim() })} disabled=${lockPos} />
        ${!lockPos && html`<button class="sq" aria-label="Scansiona dosimetro Fase 1" onClick=${() => onScan(p.id, 'codiceF1')}><${Icon} n="scan" s=${20} /></button>`}</div>
      <div class="dosim"><${Inp} label="Dosimetro Fase 2" value=${p.codiceF2} set=${v => set({ codiceF2: v.trim() })} disabled=${lockF2 || !lockPos} placeholder=${!lockPos ? 'Al ritiro della Fase 1' : ''} />
        ${lockPos && !lockF2 && html`<button class="sq" aria-label="Scansiona dosimetro Fase 2" onClick=${() => onScan(p.id, 'codiceF2')}><${Icon} n="scan" s=${20} /></button>`}</div>
      <div><div class="fld"><span>Foto (1–3)</span></div>
        <${PhotoStrip} ids=${p.foto} max=${3} onAdd=${ids => set({ foto: [...p.foto, ...ids] })} onRemove=${async id => { await removeBlob(id); set({ foto: p.foto.filter(f => f !== id) }); }} /></div>
      ${lockPos ? html`<span class="lock"><${Icon} n="lock" s=${13} /> Dati di posa bloccati dopo la firma</span>`
        : html`<button class="btn sm danger" style="justify-self:start" onClick=${() => onDel(p)}>Elimina punto</button>`}
    </div>`}
  </div>`;
}

/* ---------------- form campagna ---------------- */
function RadonForm({ rec: initial, settings, onSave, onDelete, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const recRef = useRef(r); recRef.current = r;
  const [openP, setOpenP] = useState(() => initial.punti.length ? {} : {});
  const [scan, setScan] = useState(null);
  const [sig, setSig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [T, setT] = useSchede('radon', ['anag', 'punti', 'firme'], initial._new, { 'p-': 'punti', 'plan-': 'punti', 'mom-': 'firme' });
  const stato = radonStato(r);

  const m = r.momenti;
  const lockPos = m[0].confermato, lockF2 = m[1].confermato;
  const setM = (i, patch) => up(p => ({ ...p, momenti: p.momenti.map((x, j) => j === i ? { ...x, ...patch } : x) }));
  const updP = (id, patch) => up(p => ({ ...p, punti: p.punti.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addP = () => { const np = newPunto(); up(p => ({ ...p, punti: [...p.punti, np] })); setOpenP({ [np.id]: true }); };
  const delP = async pt => {
    if (!confirm('Eliminare il punto? I punti successivi vengono rinumerati.')) return;
    for (const b of blobIds(pt)) await removeBlob(b);
    up(p => ({ ...p, punti: p.punti.filter(x => x.id !== pt.id) }));
  };

  // controllo doppioni sui codici dosimetro
  const dupOf = (code, selfId, field) => {
    const c = code.trim().toLowerCase();
    for (const [i, pt] of recRef.current.punti.entries()) {
      for (const f of ['codiceF1', 'codiceF2']) {
        if (pt.id === selfId && f === field) continue;
        if ((pt[f] || '').toLowerCase() === c) return `R${i + 1} ${f === 'codiceF1' ? 'Fase 1' : 'Fase 2'}`;
      }
    }
    return null;
  };

  const scanOne = (id, field) => {
    const n = recRef.current.punti.findIndex(x => x.id === id) + 1;
    setScan({
      title: 'Dosimetro R' + n, target: `R${n} · ${field === 'codiceF1' ? 'Fase 1' : 'Fase 2'}`,
      onCode: code => {
        const d = dupOf(code, id, field); if (d) return { error: `${code} è già usato in ${d}` };
        updP(id, { [field]: code }); return { msg: `R${n}: ${code}`, close: true };
      },
    });
  };

  const scanSeq = () => {
    const field = !lockPos ? 'codiceF1' : 'codiceF2';
    const label = field === 'codiceF1' ? 'Fase 1' : 'Fase 2';
    const firstEmpty = () => recRef.current.punti.find(x => !x[field]);
    let cur = firstEmpty();
    if (!cur) {
      if (field === 'codiceF2') { toast('Tutti i punti hanno già il dosimetro di Fase 2'); return; }
      cur = newPunto(); const np = cur; up(p => ({ ...p, punti: [...p.punti, np] }));
    }
    const num0 = () => recRef.current.punti.findIndex(x => x.id === cur.id) + 1 || recRef.current.punti.length + 1;
    const seq = { cur };
    setScan({
      title: 'Posa in sequenza · ' + label, target: `R${num0()} · ${label}`,
      onCode: code => {
        const d = dupOf(code, seq.cur.id, field); if (d) return { error: `${code} è già usato in ${d}` };
        const id = seq.cur.id;
        const idx = recRef.current.punti.findIndex(x => x.id === id);
        const n = idx >= 0 ? idx + 1 : recRef.current.punti.length;
        // aggiorno subito anche la copia locale per il prossimo controllo
        recRef.current = { ...recRef.current, punti: recRef.current.punti.map(x => x.id === id ? { ...x, [field]: code } : x) };
        updP(id, { [field]: code });
        const nx = recRef.current.punti.find(x => !x[field]);
        if (nx) { seq.cur = nx; return { msg: `R${n}: ${code}`, next: `R${recRef.current.punti.indexOf(nx) + 1} · ${label}` }; }
        if (field === 'codiceF2') return { msg: `R${n}: ${code} — tutti i punti completati`, close: true };
        const np = newPunto(); seq.cur = np;
        recRef.current = { ...recRef.current, punti: [...recRef.current.punti, np] };
        up(p => ({ ...p, punti: [...p.punti, np] }));
        return { msg: `R${n}: ${code}`, next: `R${recRef.current.punti.length} · ${label} (nuovo punto)` };
      },
      onEnd: () => {
        // rimuovo l'ultimo punto creato in sequenza se è rimasto vuoto
        const last = recRef.current.punti[recRef.current.punti.length - 1];
        if (field === 'codiceF1' && last && !last.codiceF1 && !last.piano && !last.ubicazione && !last.foto.length)
          up(p => ({ ...p, punti: p.punti.filter(x => x.id !== last.id) }));
      },
    });
  };

  const conferma = i => {
    const mm = m[i];
    if (!mm.data) { toast('Indica la data'); return; }
    if (!mm.firmaTecnico) { toast('Manca la firma del tecnico'); return; }
    const warn = [];
    if (!mm.firmaReferente) warn.push('manca la firma del referente');
    if (i === 0) {
      if (!r.punti.length) { toast('Aggiungi almeno un punto di misura'); return; }
      const noCode = r.punti.filter(p => !p.codiceF1).length; if (noCode) warn.push(`${noCode} punti senza dosimetro`);
      const noFoto = r.punti.filter(p => !p.foto.length).length; if (noFoto) warn.push(`${noFoto} punti senza foto`);
    }
    if (i === 1) { const no2 = r.punti.filter(p => !p.codiceF2).length; if (no2) warn.push(`${no2} punti senza dosimetro di Fase 2`); }
    if (i > 0 && m[i - 1].data && mm.data < m[i - 1].data) { toast('La data è precedente a quella del momento prima'); return; }
    if (warn.length && !confirm('Attenzione: ' + warn.join(', ') + '.\nConfermare comunque?')) return;
    setM(i, { confermato: true });
    toast(MOMENTI[i] + ' confermato');
  };
  const sblocca = i => {
    if (!confirm('Sbloccare per modificare? Le firme di questo momento vengono cancellate e andranno raccolte di nuovo.')) return;
    setM(i, { confermato: false, firmaTecnico: '', firmaReferente: '' });
  };

  const pdf = async () => {
    setBusy(true);
    try {
      const bytes = await PdfGen.radonPdf(await loadTemplate('radon.pdf'), r);
      const name = `Scheda_radon_${slug(r.commessa || r.cliente || 'campagna')}.pdf`;
      await shareFiles([{ blob: new Blob([bytes], { type: 'application/pdf' }), name }], name);
    } catch (e) { fail('PDF non creato', e); }
    setBusy(false);
  };

  const scad = radonScadenza(r);
  const best = mediaMax(r);
  // anello: giorni di esposizione della fase in corso
  const fStart = stato === 'fase1' ? m[0].data : stato === 'fase2' ? m[1].data : '';
  const gTot = fStart && scad ? Math.max(1, daysBetween(fStart, scad)) : 0;
  const gNow = fStart ? Math.max(0, Math.min(gTot, daysBetween(fStart, today()))) : 0;
  const field = stato === 'fase2' ? 'codiceF2' : 'codiceF1';
  const posati = r.punti.filter(p => p[field]).length;
  const avviso = scad ? (() => { const x = new Date(scad + 'T12:00:00'); x.setDate(x.getDate() - 7); return x.toISOString().slice(0, 10); })() : '';
  // dosimetri per piano: lo stepper aggiunge o toglie punti vuoti su quel piano
  const piani = [...new Set(r.punti.map(p => (p.piano || '').trim()))];
  const [nuovoPiano, setNuovoPiano] = useState('');
  const incP = piano => { const np = newPunto({ piano }); up(q => ({ ...q, punti: [...q.punti, np] })); };
  const decP = piano => {
    const l = r.punti.filter(p => (p.piano || '').trim() === piano);
    const empty = [...l].reverse().find(p => !p.codiceF1 && !p.foto.length && !p.ubicazione);
    if (!empty) { toast('I punti di questo piano hanno già dati: eliminali dalla loro scheda'); return; }
    up(q => ({ ...q, punti: q.punti.filter(x => x.id !== empty.id) }));
  };
  const lastCode = [...r.punti].reverse().map(p => p.codiceF2 || p.codiceF1).find(Boolean);
  const curMom = m.findIndex((x, i) => !x.confermato && (i === 0 || m[i - 1].confermato));
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);
  const over = r.punti.filter(p => { const v = mediaPunto(r, p); return v != null && v > settings.livelloRif; }).length;

  return html`<div class="content form">
    <${DetailHead} eye=${'Campagna radon · ' + STATI[stato][0]} title=${r.commessa || 'Nuova campagna'} sub=${[[r.cliente, r.insegna].filter(Boolean).join(' · '), placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'punti', l: 'Punti', n: r.punti.length }, { k: 'firme', l: 'Firme', n: m.filter(x => x.confermato).length }]} />
    ${T === 'anag' && html`    <div class="card-navy"><div class="row" style="gap:18px;align-items:center">
      <div class="ring-wrap" style="width:112px;height:112px">
        <${Ring} p=${gTot ? gNow / gTot : stato === 'esiti' || stato === 'terminata' ? 1 : 0} size=${112} w=${10} color="#38a3f0" track="rgba(255,255,255,.14)" />
        <div class="ring-c">${gTot ? html`<b>${gNow}</b><span>di ${gTot} gg</span>` : html`<b style="font-size:16px">${stato === 'da_iniziare' ? 'Da posare' : stato === 'esiti' ? 'Esiti' : 'Fine'}</b>`}</div>
      </div>
      <div class="kv" style="flex:1;min-width:0">
        <div><span class="nv-eye">${scad ? 'Ritiro previsto' : stato === 'da_iniziare' ? 'Posa' : 'Stato'}</span><b class=${scad && daysBetween(today(), scad) < 0 ? 'crit' : ''}>${scad ? fmtD(scad) : stato === 'da_iniziare' ? (m[0].data ? fmtD(m[0].data) : 'da programmare') : STATI[stato][0]}</b></div>
        <div><span class="nv-eye">Dosimetri</span><b>${posati}${r.punti.length ? ' / ' + r.punti.length : ''} ${stato === 'da_iniziare' ? 'pronti' : 'posati'}</b></div>
      </div></div></div>
    ${scad && html`<div class="card tight alert-soft"><div class="row" style="gap:12px">
      <span class="sq" style="width:36px;height:36px"><${Icon} n="bell" s=${18} /></span>
      <div class="tb-grow"><div style="font-size:15.5px;font-weight:600;white-space:normal">Avviso al conduttore il ${fmtD(avviso)}</div>
        <div style="font-size:13.5px;color:var(--muted);white-space:normal">Una settimana prima del ritiro, nelle notifiche</div></div>
      <${Toggle} on=${!!r.promemoria} set=${v => up({ promemoria: v })} label="Promemoria per il conduttore" /></div></div>`}

    <div class="card"><div class="grid2">
      <${Inp} label="Commessa" req value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Codice" value=${r.codice} set=${v => up({ codice: v })} placeholder="es. codice punto vendita" />
      <${Inp} cls="full" label="Cliente" req value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} cls="full" label="Insegna" value=${r.insegna} set=${v => up({ insegna: v })} imp=${impOf(r, 'insegna')} />
      <${Inp} label="Città" req value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} label="Provincia" value=${r.provincia} set=${v => up({ provincia: v.toUpperCase() })} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} />
      <${Inp} label="Telefono" type="tel" value=${r.telefono} set=${v => up({ telefono: v })} />
      <${Inp} label="Altro" value=${r.altro} set=${v => up({ altro: v })} />
    </div></div>
`}

    ${T === 'punti' && html`
    ${!lockPos && html`<div class="sec-h"><h3>Dosimetri per piano</h3><span class="hint">${r.punti.length} in tutto</span></div>
      <div class="list">
        ${piani.map(pi => { const n = r.punti.filter(p => (p.piano || '').trim() === pi).length; return html`<div class="prow" key=${pi}>
          <div class="t"><b>${pi || 'Piano non indicato'}</b><small>${r.punti.filter(p => (p.piano || '').trim() === pi && p.codiceF1).length} con codice</small></div>
          <${Stepper} n=${n} label=${'Dosimetri ' + (pi || 'senza piano')} dec=${() => decP(pi)} inc=${() => incP(pi)} /></div>`; })}
        <div class="prow"><input class="inp" list="dl-piani" placeholder="Aggiungi un piano (es. Primo piano)" value=${nuovoPiano} onInput=${e => setNuovoPiano(e.target.value)} />
          <button class="btn sm" disabled=${!nuovoPiano.trim()} onClick=${() => { incP(nuovoPiano.trim()); setNuovoPiano(''); }}>Aggiungi</button></div>
      </div>
      ${lastCode && html`<div class="lock" style="margin:8px 16px 0">Ultimo codice letto <span class="mono" style="color:var(--text)">${lastCode}</span></div>`}`}

    <div class="sec-h"><h3>Punti di misura · ${r.punti.length}</h3>${r.punti.length > 20 && html`<span class="hint">Oltre R20 il PDF aggiunge pagine</span>`}</div>
    ${r.punti.map((p, i) => html`<${PuntoCard} key=${p.id} p=${p} n=${i + 1} open=${!!openP[p.id]} toggle=${() => setOpenP({ ...openP, [p.id]: !openP[p.id] })}
      lockPos=${lockPos} lockF2=${lockF2} onUpd=${updP} onDel=${delP} onScan=${scanOne} />`)}
    ${!lockPos && html`<button class="btn dashed" onClick=${addP}>+ Aggiungi punto R${r.punti.length + 1}</button>`}
    <datalist id="dl-piani">${['Piano terra', 'Piano interrato', 'Piano seminterrato', 'Primo piano'].map(x => html`<option value=${x} />`)}</datalist>
        ${lockPos && html`
      <div class="sec-h"><h3>Esiti di laboratorio</h3><span class="hint">Bq/m³ · media pesata sui giorni</span></div>
      <div class="card tight">
        ${best && html`<div class="bigstat" style="margin-bottom:6px"><b style=${best.v > settings.livelloRif ? 'color:var(--nc)' : ''}>${fmtN(best.v)}</b><span class="lock">Bq/m³ media più alta (R${best.n}) · ${over ? over + ' punti oltre ' + settings.livelloRif : 'nessun punto oltre ' + settings.livelloRif}</span></div>`}
        <div class="res-row h"><span></span><span>Fase 1</span><span>Fase 2</span><span style="text-align:right">Media</span></div>
        ${r.punti.map((p, i) => { const v = mediaPunto(r, p); return html`<div class="res-row" key=${p.id}><b>R${i + 1}</b>
          <input class="inp" inputmode="decimal" value=${p.valoreF1} onInput=${e => updP(p.id, { valoreF1: e.target.value })} aria-label=${'R' + (i + 1) + ' Fase 1'} />
          <input class="inp" inputmode="decimal" value=${p.valoreF2} disabled=${!lockF2} onInput=${e => updP(p.id, { valoreF2: e.target.value })} aria-label=${'R' + (i + 1) + ' Fase 2'} />
          <span class=${'mean' + (v != null && v > settings.livelloRif ? ' over' : '')}>${fmtN(v)}</span></div>`; })}
        <div class="divider"></div>
        <${FileList} items=${r.rapporti} accept="application/pdf,image/*" label="Allega rapporto di prova"
          onAdd=${d => up(p => ({ ...p, rapporti: [...p.rapporti, d] }))}
          onRemove=${async d => { await removeBlob(d.blobId); up(p => ({ ...p, rapporti: p.rapporti.filter(x => x.id !== d.id) })); }} />
      </div>`}

    <div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3><span class="hint">Disegno ed etichette dei punti</span></div>
    <div class="card"><${PlanList} items=${r.planimetrie || []} labels=${r.punti.map((p, i) => ({ ref: p.id, text: 'R' + (i + 1), color: '#0061c5' }))}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>

    <div class="sec-h"><h3>Appunti generali</h3></div>
    <div class="card"><textarea class="inp" rows="3" value=${r.note} onInput=${e => up({ note: e.target.value })} aria-label="Note"></textarea>
      <${NotePhotos} rec=${r} up=${up} /></div>

`}

    ${T === 'firme' && html`<div class="sec-h"><h3>Sopralluoghi e firme</h3></div>
    ${m.map((mm, i) => {
      const enabled = i === 0 || m[i - 1].confermato;
      const cls = mm.confermato ? ' done' : enabled ? ' cur' : '';
      const ro = mm.confermato || !enabled;
      const prevista = i === 1 && m[0].data ? addMonths(m[0].data, 6) : i === 2 && m[1].data ? addMonths(m[1].data, 6) : null;
      return html`<div class=${'mom' + cls} key=${i} id=${i === curMom ? 'mom-cur-' + r.id : null}>
        <div class="mom-h"><span class="n">${i + 1}</span><b>${MOMENTI[i]}</b>
          ${mm.confermato && html`<span class="badge b-ok">Confermato</span>`}</div>
        ${!enabled ? html`<div class="lock">Si compila dopo aver confermato il momento ${i}${prevista ? ' · previsto ' + fmtD(prevista) : ''}</div>` : html`
          <div class="grid2">
            <${Inp} label="Data" type="date" value=${mm.data} disabled=${ro} set=${v => setM(i, { data: v })} />
            <${OraDurata} ora=${mm.ora} durata=${mm.durata} stato=${mm.stato} tipo="radon" disabled=${ro} set=${p => setM(i, p)} />
            <div class="fld"><span>${prevista ? 'Previsto' : ''}</span>${prevista && html`<div style="padding:10px 0;font-size:14px">${fmtD(prevista)}</div>`}</div>
          </div>
          <div class="who">TECNICO</div>
          <div class="grid2">
            <${Inp} label="Cognome" value=${mm.tecnicoCognome} disabled=${ro} set=${v => setM(i, { tecnicoCognome: v })} />
            <${Inp} label="Nome" value=${mm.tecnicoNome} disabled=${ro} set=${v => setM(i, { tecnicoNome: v })} />
          </div>
          <div class="row" style="margin-top:8px">
            <button class=${'sigbox' + (mm.firmaTecnico ? ' has' : '')} disabled=${ro} onClick=${() => setSig({ i, who: 'firmaTecnico', title: 'Firma tecnico · ' + [mm.tecnicoNome, mm.tecnicoCognome].join(' ') })}>
              ${mm.firmaTecnico ? html`<img src=${mm.firmaTecnico} alt="Firma tecnico" />` : html`<span><${Icon} n="sign" s=${18} /> Tocca per firmare</span>`}</button>
          </div>
          ${!ro && !mm.firmaTecnico && settings.firmaTecnico && html`<button class="btn sm" style="margin-top:6px" onClick=${() => setM(i, { firmaTecnico: settings.firmaTecnico })}>Usa la firma salvata</button>`}
          <div class="who">REFERENTE CLIENTE</div>
          <div class="grid2">
            <${Inp} label="Cognome" value=${mm.referenteCognome} disabled=${ro} set=${v => setM(i, { referenteCognome: v })} />
            <${Inp} label="Nome" value=${mm.referenteNome} disabled=${ro} set=${v => setM(i, { referenteNome: v })} />
          </div>
          <div class="row" style="margin-top:8px">
            <button class=${'sigbox' + (mm.firmaReferente ? ' has' : '')} disabled=${ro} onClick=${() => setSig({ i, who: 'firmaReferente', title: 'Firma referente · ' + [mm.referenteNome, mm.referenteCognome].join(' ') })}>
              ${mm.firmaReferente ? html`<img src=${mm.firmaReferente} alt="Firma referente" />` : html`<span><${Icon} n="sign" s=${18} /> Fai firmare il referente</span>`}</button>
          </div>
          <div class="who">APPUNTI</div>
          <textarea class="inp" rows="2" placeholder="Note di questo sopralluogo" value=${mm.appunti || ''} onInput=${e => setM(i, { appunti: e.target.value })} aria-label=${'Appunti ' + MOMENTI[i]}></textarea>
          <div class="row" style="margin-top:12px;justify-content:flex-end">
            ${mm.confermato ? (i === 2 || !m[i + 1].confermato) && html`<button class="btn sm" onClick=${() => sblocca(i)}><${Icon} n="lock" s=${14} /> Sblocca</button>`
              : html`<button class="btn outline" onClick=${() => conferma(i)}><${Icon} n="lock" s=${17} /> Conferma e blocca</button>`}
          </div>`}
      </div>`;
    })}

    `}
    <${BarraAtt} r=${r} settings=${settings}
      left=${T === 'punti' && !lockF2 ? html`<button class="btn-icon lg" aria-label="Scansiona i dosimetri" title="Scansiona i dosimetri" onClick=${scanSeq}><${Icon} n="scan" s=${22} /></button>`
        : html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { if (T !== 'punti') setT('punti'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${T !== 'anag' && curMom >= 0 ? html`<button class="btn pri" onClick=${() => { setT('firme'); setTimeout(() => scrollToId('mom-cur-' + r.id), 80); }}><${Icon} n="sign" s=${19} /> Salva e firma</button>`
        : html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[['Documenti', [{ ic: 'file', l: 'Scheda raccolta dati radon (PDF)', fn: pdf },
        T !== 'punti' && !lockF2 && { ic: 'scan', l: 'Scansiona i dosimetri', fn: () => { setT('punti'); scanSeq(); } }]],
        opzArchivio({ r, settings, onDelete, elimina: 'Elimina la campagna' })]} />

    ${scan && html`<${Scanner} title=${scan.title} target=${scan.target} onCode=${scan.onCode} onClose=${() => { if (scan.onEnd) scan.onEnd(); setScan(null); }} />`}
    ${sig && html`<${SignaturePadOverlay} title=${sig.title} allowImage=${sig.who === 'firmaTecnico'} onClose=${() => setSig(null)} onDone=${url => setM(sig.i, { [sig.who]: url })} />`}
  </div>`;
}
