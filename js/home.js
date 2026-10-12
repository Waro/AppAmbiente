/* Home "Oggi" e foglio "Nuova attività" */

const TYPE_LABEL = { dda: 'DDA', mappatura: 'Mappatura MCA e FAV', ra: 'Sopralluogo RA', radon: 'Campagna radon' };
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];
const isoDay = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };

// la pratica ha già dati raccolti sul campo?
function recDone(r) {
  if (r.type === 'dda') return r.fase === 1 ? (r.recs.length > 0 || Object.keys(r.check || {}).length > 0) : allCamp(r).length > 0;
  if (r.type === 'mappatura') return allCampMap(r).length > 0;
  if (r.type === 'ra') return r.manufatti.length > 0 && r.manufatti.every(m => m.stato);
  if (r.type === 'radon') return (r.momenti || []).some(m => m.data === today() && m.confermato);
  return false;
}
// elementi con foto (campioni, aree REC, manufatti, punti radon) di una pratica
function photoItems(r) {
  let items = [];
  if (r.type === 'dda') items = r.fase === 1 ? r.recs : allCamp(r);
  else if (r.type === 'mappatura') items = allCampMap(r);
  else if (r.type === 'ra') items = r.manufatti;
  else if (r.type === 'radon') items = r.punti;
  return { tot: items.length, ok: items.filter(x => (x.foto || []).length > 0).length };
}
// scadenza della verifica RA: fine dell'anno di incarico, non la data del sopralluogo precedente
function raScadenza(r) { return r.incaricoAl || ''; }
const raOpen = r => !(r.manufatti.length && r.manufatti.every(m => m.stato));

function recLine(r) {
  if (r.type === 'dda') {
    const n = allCamp(r).length;
    return r.fase === 1 ? `DDA Fase 1 · ${r.recs.length} aree REC` : `DDA Fase 2 · ${n} ${n === 1 ? 'campione' : 'campioni'}`;
  }
  if (r.type === 'mappatura') { const n = allCampMap(r).length; return `Mappatura MCA e FAV · ${n} ${n === 1 ? 'campione' : 'campioni'}`; }
  if (r.type === 'ra') return `Verifica RA · ${r.manufatti.filter(m => m.stato).length}/${r.manufatti.length} manufatti`;
  const s = radonStato(r);
  const m = s === 'da_iniziare' ? 0 : s === 'fase1' ? 1 : 2;
  return `Radon · ${MOMENTI[m]} · ${r.punti.length} dosimetri`;
}

// prossimo sopralluogo: pratiche con data da oggi in poi non ancora concluse, e ritiri radon (anche scaduti)
function nextVisit(records, od) {
  const t = today(), c = [];
  for (const r of records) {
    if (r.type === 'radon') {
      const s = radonStato(r);
      const d = s === 'fase1' || s === 'fase2' ? radonScadenza(r) : s === 'da_iniziare' && r.momenti[0].data ? r.momenti[0].data : '';
      if (d) c.push({ r, d });
    } else if (r.data && r.data >= t && odStatus(od, r) !== 'ok' && !(r.type === 'ra' && !raOpen(r))) c.push({ r, d: r.data });
  }
  c.sort((a, b) => a.d.localeCompare(b.d) || (b.r.updatedAt || 0) - (a.r.updatedAt || 0));
  return c[0] || null;
}
function whenLabel(d) {
  const g = daysBetween(today(), d);
  if (g < 0) return { l: `scaduto da ${-g} gg`, crit: true };
  if (g === 0) return { l: 'Oggi' }; if (g === 1) return { l: 'Domani' };
  return { l: g < 7 ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long' }) : fmtD(d) };
}

function Home({ records, settings, open, newAct, bell, avatar, tplOk, lastBackup, goList, goSettings, goBackup, installEvt, onInstall }) {
  const od = useOdSynced();
  const [bu, setBu] = useState(settings.buDefault || 'ambiente');
  const [per, setPer] = useState('w');
  useEffect(() => setBu(settings.buDefault || 'ambiente'), [settings.buDefault]);
  const t = today();
  const eye = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  // ---- oggi
  const todays = records.filter(r => r.type === 'radon' ? (r.momenti || []).some(m => m.data === t) : r.data === t);
  const done = todays.filter(recDone).length;
  const up = todays.filter(r => odStatus(od, r) === 'ok').length;
  const ph = todays.map(photoItems).reduce((a, b) => ({ tot: a.tot + b.tot, ok: a.ok + b.ok }), { tot: 0, ok: 0 });
  const rings = [
    { l: 'Sopralluoghi', a: done, b: todays.length, c: 'var(--blue)' },
    { l: 'Caricati su OneDrive', a: up, b: todays.length, c: 'var(--navy)' },
    { l: 'Elementi con foto', a: ph.ok, b: ph.tot, c: 'var(--blue-sky)' },
  ];

  // ---- andamento: pratiche caricate su OneDrive
  const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const upDays = Object.entries(od).filter(([id, e]) => e.ok && records.some(r => r.id === id)).map(([, e]) => isoDay(e.t));
  let bars;
  if (per === 'w') {
    bars = WEEKDAYS.map((l, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); const iso = isoDay(d); return { l, n: upDays.filter(x => x === iso).length, cur: iso === t }; });
  } else {
    const y = now.getFullYear(), m = now.getMonth(); const last = new Date(y, m + 1, 0).getDate();
    bars = [];
    for (let s = 1, k = 1; s <= last; s += 7, k++) {
      const from = isoDay(new Date(y, m, s)), to = isoDay(new Date(y, m, Math.min(s + 6, last)));
      bars.push({ l: 'S' + k, n: upDays.filter(x => x >= from && x <= to).length, cur: t >= from && t <= to });
    }
  }
  const totP = bars.reduce((a, b) => a + b.n, 0), maxB = Math.max(1, ...bars.map(b => b.n));

  // ---- widget radon
  const rad = records.filter(r => r.type === 'radon' && (radonStato(r) === 'fase1' || radonStato(r) === 'fase2'))
    .map(r => ({ r, d: radonScadenza(r), start: radonStato(r) === 'fase1' ? r.momenti[0].data : r.momenti[1].data }))
    .sort((a, b) => a.d.localeCompare(b.d));
  const rNext = rad[0];
  const rDays = rNext ? daysBetween(t, rNext.d) : null;
  const rExp = rNext && rNext.start ? Math.min(1, Math.max(0, daysBetween(rNext.start, t) / Math.max(1, daysBetween(rNext.start, rNext.d)))) : 0;
  const nDos = rad.reduce((a, x) => a + x.r.punti.length, 0);

  // ---- widget scadenze RA (anno di incarico)
  const ras = records.filter(r => r.type === 'ra');
  const y0 = String(now.getFullYear());
  const endNext = isoDay(new Date(now.getFullYear(), now.getMonth() + 2, 0));
  const raDue = ras.filter(r => raOpen(r) && raScadenza(r) && raScadenza(r) <= endNext);
  const raCrit = raDue.filter(r => daysBetween(t, raScadenza(r)) <= 30);
  const raYear = ras.filter(r => (r.data || '').startsWith(y0));
  const raDoneY = raYear.filter(r => !raOpen(r)).length;
  const raRest = Math.max(0, raYear.length - raDoneY - raCrit.length);

  const nx = nextVisit(records, od);
  const nxAddr = nx && (placeAddr(nx.r) || (nx.r.sito || '').trim());
  const when = nx && whenLabel(nx.d);
  const stale = records.length > 0 && (!lastBackup || Date.now() - lastBackup > 7 * 86400000);

  return html`<div class="content">
    <${LargeTitle} eye=${eye} title="Oggi" acts=${html`<button class="btn-icon pri" aria-label="Nuova attività" onClick=${newAct}><${Icon} n="plus" s=${22} w=${2.4} /></button>${bell}${avatar}`} />
    <div class="seg" style="margin-bottom:var(--gap)">${BUS.map(([k, l]) => html`<button class=${bu === k ? 'on' : ''} onClick=${() => setBu(k)}>${l}</button>`)}</div>

    ${bu !== 'ambiente' ? html`<div class="card"><div class="empty" style="padding:28px 10px"><b>Nessuna attività ${bu === 'hs' ? 'H&S' : 'Sicurezza'} in Nembo</b>Per ora l'app gestisce solo le attività Ambiente. Puoi scegliere la business unit predefinita in Impostazioni.</div></div>` : html`
    <div class="card-navy">
      ${nx ? html`
        <div class="row" style="justify-content:space-between"><span class="nv-eye">Prossimo sopralluogo</span>
          <span class=${'nv-eye' + (when.crit ? ' crit' : '')} style="text-transform:none;letter-spacing:0;font-size:14px">${when.l}</span></div>
        <div class="next-addr">${nxAddr || 'Indirizzo da indicare'}</div>
        <div class="next-line">${[recLine(nx.r), nx.r.cliente].filter(Boolean).join(' · ')}</div>
        <div class="next-acts">
          <button class="btn pri" onClick=${() => open(nx.r)}>Avvia sopralluogo</button>
          ${nxAddr && html`<a class="btn-icon glass" aria-label="Indicazioni stradali" href=${'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(nxAddr)} target="_blank" rel="noopener"><${Icon} n="nav" s=${20} /></a>`}
        </div>` : html`
        <span class="nv-eye">Prossimo sopralluogo</span>
        <div class="next-addr">Nessun sopralluogo in programma</div>
        <div class="next-line">Le pratiche con data da oggi in poi e i ritiri radon compaiono qui.</div>
        <div class="next-acts"><button class="btn pri" onClick=${newAct}>Nuova attività</button></div>`}
    </div>

    <div class="card">
      <div class="card-h"><h4>Attività di oggi</h4>${!todays.length && html`<span class="wg-lbl">nessuna pratica con data di oggi</span>`}</div>
      <div class="rings">
        <div class="ring-wrap" style="width:96px;height:96px">
          <${Ring} p=${rings[0].b ? rings[0].a / rings[0].b : 0} size=${96} w=${9} color=${rings[0].c} />
          <div style="position:absolute;inset:12px"><${Ring} p=${rings[1].b ? rings[1].a / rings[1].b : 0} size=${72} w=${9} color=${rings[1].c} /></div>
          <div style="position:absolute;inset:24px"><${Ring} p=${rings[2].b ? rings[2].a / rings[2].b : 0} size=${48} w=${9} color=${rings[2].c} /></div>
        </div>
        <div class="legend">${rings.map(x => html`<div><i class="mdot" style=${'background:' + x.c}></i><span>${x.l}</span><b>${x.a}/${x.b}</b></div>`)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h4>Andamento</h4>
        <div class="seg sm" style="width:170px"><button class=${per === 'w' ? 'on' : ''} onClick=${() => setPer('w')}>Settimana</button><button class=${per === 'm' ? 'on' : ''} onClick=${() => setPer('m')}>Mese</button></div></div>
      <div class="trend">
        <div class="bars">${bars.map(b => html`<div class=${b.cur ? 'cur' : ''} title=${b.n + ' caricate'}><i style=${'height:' + Math.round(b.n / maxB * 50 + 3) + 'px'}></i><small>${b.l}</small></div>`)}</div>
        <div class="tot" style="text-align:right"><b>${totP}</b><span>pratiche caricate</span></div>
      </div>
    </div>

    <div class="widgets">
      <button class="card" onClick=${() => goList('radonList')}>
        <span class="wg-ic" style="background:var(--warn-soft);color:var(--warn)"><${Icon} n="radon" s=${20} /></span>
        <div class="wg-num" style=${rDays != null && rDays <= 7 ? 'color:var(--danger)' : ''}>${rDays == null ? '–' : rDays < 0 ? -rDays : rDays}<small>gg</small></div>
        <div class="wg-lbl">${rDays == null ? 'nessun ritiro radon' : rDays < 0 ? 'di ritardo sul ritiro' : 'al prossimo ritiro'}</div>
        <div class="track"><i style=${'width:' + Math.round(rExp * 100) + '%'}></i></div>
        <div class="wg-sub">${nDos} dosimetri · ${rad.length} ${rad.length === 1 ? 'sito' : 'siti'}</div>
      </button>
      <button class="card" onClick=${() => goList('raList')}>
        <span class="wg-ic" style="background:var(--blue-soft);color:var(--blue)"><${Icon} n="shield" s=${20} /></span>
        <div class="wg-num" style=${raCrit.length ? 'color:var(--danger)' : ''}>${raDue.length}</div>
        <div class="wg-lbl">verifiche RA entro il mese prossimo</div>
        <div class="track">${raYear.length + raCrit.length > 0 && html`
          <i style=${'background:var(--navy);width:' + (raDoneY / Math.max(1, raYear.length + raCrit.length) * 100) + '%'}></i>
          <i style=${'background:var(--danger);width:' + (raCrit.length / Math.max(1, raYear.length + raCrit.length) * 100) + '%'}></i>
          <i style=${'background:var(--chev);width:' + (raRest / Math.max(1, raYear.length + raCrit.length) * 100) + '%'}></i>`}</div>
        <div class="wg-sub">${raDoneY} di ${raYear.length} fatte nell'anno</div>
      </button>
    </div>`}

    ${(!tplOk || !settings.tecnicoCognome) && html`<button class="notice" style="width:100%;text-align:left;border:0" onClick=${goSettings}>Prima di iniziare: in Impostazioni inserisci i tuoi dati e carica i due modelli PDF.</button>`}
    ${stale && html`<button class="notice" style="width:100%;text-align:left;border:0" onClick=${goBackup}>${lastBackup ? 'L\'ultimo backup ha più di una settimana.' : 'Non hai ancora fatto un backup.'} I dati stanno solo su questo dispositivo: salvane una copia su OneDrive.</button>`}
    ${installEvt && html`<button class="btn block" style="margin-top:12px" onClick=${onInstall}><${Icon} n="plus" s=${18} /> Installa l'app</button>`}
  </div>`;
}

/* ---------------- foglio "Nuova attività" ---------------- */
const NEW_OPTS = [
  { k: 'dda1', t: 'dda', patch: { fase: 1 }, l: 'DDA Fase 1', s: 'Sopralluogo, aree REC e documenti', ic: 'leaf', bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  { k: 'dda2', t: 'dda', patch: { fase: 2 }, l: 'DDA Fase 2', s: 'Campionamento e scheda campioni', ic: 'leaf', bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  { k: 'map', t: 'mappatura', patch: {}, l: 'Mappatura MCA e FAV', s: 'Censimento e campioni', ic: 'pin', bg: 'color-mix(in srgb, var(--mca) 12%, white)', fg: 'var(--mca)' },
  { k: 'ra', t: 'ra', patch: {}, l: 'RA · verifica annuale', s: 'Manufatti da mappatura o PMC', ic: 'shield', bg: 'color-mix(in srgb, var(--mca) 12%, white)', fg: 'var(--mca)' },
  { k: 'radon', t: 'radon', patch: {}, l: 'Campagna radon', s: 'Posa e ritiro dosimetri', ic: 'radon', bg: 'var(--ok-soft)', fg: 'var(--ok)' },
];
function NewActivity({ records, onClose, onCreate }) {
  useBackClose(onClose);
  const [k, setK] = useState('dda1');
  const [commessa, setCommessa] = useState('');
  const [citta, setCitta] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const opt = NEW_OPTS.find(o => o.k === k);
  // prossima scadenza RA non critica (oltre 30 giorni): avviso sobrio sulla riga
  const raNext = records.filter(r => r.type === 'ra' && raOpen(r) && raScadenza(r) && raScadenza(r) >= today()).map(raScadenza).sort()[0];
  const raSoft = raNext && daysBetween(today(), raNext) > 30;
  const start = () => onCreate(opt.t, { ...opt.patch, commessa: commessa.trim(), citta: citta.trim(), indirizzo: indirizzo.trim() });
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}>
    <div class="sheet" role="dialog" aria-label="Nuova attività">
      <div class="sheet-grab"></div>
      <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>Nuova attività</b><span></span></div>
      <div class="sheet-body">
        <div class="sec-h" style="margin-top:6px"><h3>Tipo di attività</h3></div>
        ${NEW_OPTS.map(o => html`<button class=${'opt' + (k === o.k ? ' on' : '') + (o.k === 'ra' && raSoft && k !== 'ra' ? ' alert-soft' : '')} onClick=${() => setK(o.k)} aria-pressed=${k === o.k}>
          <span class="oi" style=${`background:${o.bg};color:${o.fg}`}><${Icon} n=${o.ic} s=${21} /></span>
          <span class="ot"><b>${o.l}</b><small>${o.k === 'ra' && raNext ? html`${o.s} · <span style=${k === 'ra' ? '' : 'color:var(--blue)'}>prossima scadenza ${new Date(raNext + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}</span>` : o.s}</small></span>
          <span class="ck"><${Icon} n="check" s=${15} w=${3} /></span></button>`)}
        <div class="sec-h"><h3>Dati di partenza</h3><span class="hint">facoltativi</span></div>
        <div class="card tight">
          <label class="fld"><span>Commessa</span><input class="mono" value=${commessa} onInput=${e => setCommessa(e.target.value)} placeholder="es. 000/26" /></label>
          <div class="grid2" style="margin-top:10px">
            <label class="fld"><span>Città</span><input value=${citta} onInput=${e => setCitta(e.target.value)} /></label>
            <label class="fld"><span>Indirizzo</span><input value=${indirizzo} onInput=${e => setIndirizzo(e.target.value)} placeholder="Via e civico" /></label>
          </div>
        </div>
        <button class="btn pri block" style="margin-top:8px" onClick=${start}>Avvia ${opt.l.replace(' · verifica annuale', '')}</button>
      </div>
    </div>
  </div>`;
}

// Radon: promemoria "avvisa il conduttore" una settimana prima del ritiro (una notifica per ritiro)
async function radonReminders(records) {
  let n = 0;
  for (const r of records) {
    if (r.type !== 'radon' || !r.promemoria) continue;
    const d = radonScadenza(r); if (!d) continue;
    if (daysBetween(today(), d) > 7 || r.avvisoFatto === d) continue;
    await notify('info', 'Avvisa il conduttore del ritiro dosimetri', { record: recordTitle(r), detail: 'Ritiro previsto il ' + fmtD(d) + (r.telefono ? ' · tel. ' + r.telefono : '') });
    await DB.put({ ...r, avvisoFatto: d }); n++;
  }
  return n;
}
