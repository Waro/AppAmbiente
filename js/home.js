/* Home "Oggi" e foglio "Nuova attività" */

const TYPE_LABEL = { dda: 'DDA', mappatura: 'Mappatura MCA e FAV', ra: 'Sopralluogo RA', radon: 'Campagna radon' };
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];
const isoDay = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };

// l’attività ha già dati raccolti sul campo?
function recDone(r) {
  if (r.type === 'dda') return r.fase === 1 ? (r.recs.length > 0 || Object.keys(r.check || {}).length > 0) : allCamp(r).length > 0;
  if (r.type === 'mappatura') return allCampMap(r).length > 0;
  if (r.type === 'ra') return r.manufatti.length > 0 && r.manufatti.every(m => m.stato);
  if (r.type === 'radon') return (r.momenti || []).some(m => m.data === today() && m.confermato);
  if (r.type === 'aria') { const R = ariaRiepilogo(r); return R.tot > 0 && R.chiusi === R.tot; }
  if (r.type === 'vs') return (r.note || []).length > 0;
  if (r.type === 'hs') return r.formato === 'sintetico' ? Object.keys(r.risp || {}).length > 0 : HS_SCHEDE.some(s => hsSchedaFatta(r.schede[s.k] || {}));
  return false;
}
// elementi con foto (campioni, aree REC, manufatti, punti radon) di un’attività
function photoItems(r) {
  let items = [];
  if (r.type === 'dda') items = r.fase === 1 ? r.recs : allCamp(r);
  else if (r.type === 'mappatura') items = allCampMap(r);
  else if (r.type === 'ra') items = r.manufatti;
  else if (r.type === 'radon') items = r.punti;
  else if (r.type === 'aria') items = ariaOf(r).punti.filter(p => p.stato !== 'non');
  else if (r.type === 'vs') items = r.note || [];
  else if (r.type === 'hs') return { tot: 1, ok: (r.foto || []).some(p => p.g !== 'prev') ? 1 : 0 };
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
  if (r.type === 'hs') return `HSE ${HS_FMT[r.formato]} · ${hsProgress(r)}`;
  if (r.type === 'vs') { const n = (r.note || []).length; return `Verbale HSE · ${n} ${n === 1 ? 'nota' : 'note'}`; }
  if (r.type === 'aria') { const R = ariaRiepilogo(r); return `Monitoraggio aria · ${R.chiusi}/${R.tot} punti`; }
  if (r.type !== 'radon') return r.codice || '';
  const s = radonStato(r);
  const m = s === 'da_iniziare' ? 0 : s === 'fase1' ? 1 : 2;
  return `Radon · ${MOMENTI[m]} · ${r.punti.length} dosimetri`;
}

// prossimo sopralluogo: attività con data da oggi in poi non ancora concluse, e ritiri radon (anche scaduti)
function nextVisit(records, od) {
  const t = today(), c = [];
  for (const r of records) {
    if (r.type === 'radon') {
      const s = radonStato(r);
      if (s !== 'da_iniziare' && s !== 'fase1' && s !== 'fase2') continue;
      const i = s === 'fase1' ? 1 : s === 'fase2' ? 2 : 0, mm = r.momenti[i] || {};
      const d = mm.data || (s === 'fase1' || s === 'fase2' ? radonScadenza(r) : '');
      if (d && mm.stato !== 'annullato') c.push({ r, d, o: mm.ora || '' });
    } else if (r.data && r.data >= t && r.stato !== 'annullato' && odStatus(od, r) !== 'ok' && !(r.type === 'ra' && !raOpen(r))) c.push({ r, d: r.data, o: r.ora || '' });
  }
  c.sort((a, b) => a.d.localeCompare(b.d) || (a.o || '99').localeCompare(b.o || '99') || (b.r.updatedAt || 0) - (a.r.updatedAt || 0));
  return c[0] || null;
}
function whenLabel(d) {
  const g = daysBetween(today(), d);
  if (g < 0) return { l: `scaduto da ${-g} gg`, crit: true };
  if (g === 0) return { l: 'Oggi' }; if (g === 1) return { l: 'Domani' };
  return { l: g < 7 ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long' }) : fmtD(d) };
}

/* ---------------- primi passi (finché non sono completati o nascosti) ---------------- */
const onbHidden = () => { try { return localStorage.getItem('nembo_onb') === 'hide'; } catch (e) { return false; } };
function PrimiPassi({ settings, tplOk, goSettings, installEvt, onInstall }) {
  const [, force] = useState(0);
  const [hide, setHide] = useState(onbHidden);
  useEffect(() => OD.subscribe(() => force(x => x + 1)), []);
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const steps = [
    { ok: !!(settings.tecnicoCognome && tplOk), l: 'Carica la configurazione', s: 'Impostazioni → File di configurazione → Carica .json', go: goSettings },
    { ok: !!settings.firmaTecnico, l: 'Salva la tua firma', s: 'Impostazioni → Tecnico', go: goSettings },
    { ok: !!OD.account, l: 'Collega OneDrive', s: 'Impostazioni → OneDrive → Accedi', go: goSettings },
    { ok: installed, l: "Installa l'app", s: installEvt ? 'Tocca per installarla' : 'Menu ⋮ di Chrome → Installa app', go: installEvt ? onInstall : null },
  ];
  const n = steps.filter(x => x.ok).length;
  if (hide || n === steps.length) return null;
  const close = () => { try { localStorage.setItem('nembo_onb', 'hide'); } catch (e) {} setHide(true); };
  return html`<div class="card onb">
    <div class="onb-h"><b>Primi passi</b><span>${n} di ${steps.length}</span></div>
    ${steps.map(x => html`<button class=${'onb-it' + (x.ok ? ' ok' : '')} disabled=${x.ok || !x.go} onClick=${x.go}>
      <span class="onb-ck">${x.ok && html`<${Icon} n="check" s=${14} w=${2.6} />`}</span>
      <span class="t"><b>${x.l}</b>${!x.ok && html`<small>${x.s}</small>`}</span>${!x.ok && x.go && html`<${Icon} n="right" s=${16} />`}</button>`)}
    <button class="btn link" style="margin-top:4px;font-size:13px" onClick=${close}>Nascondi</button>
  </div>`;
}

function Home({ records: allRecords, settings, open, newAct, bell, avatar, tplOk, lastBackup, goList, goSettings, goBackup, installEvt, onInstall }) {
  const od = useOdSynced();
  const [bu, setBu] = useState(settings.buDefault || 'ambiente');
  const [per, setPer] = useState('w');
  useEffect(() => setBu(settings.buDefault || 'ambiente'), [settings.buDefault]);
  // ogni business unit vede le proprie attività
  const records = allRecords.filter(r => bu === 'hs' ? r.type === 'hs' || r.type === 'vs' : bu === 'ambiente' ? r.type !== 'hs' && r.type !== 'firme' && r.type !== 'app' : false);
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

  // ---- andamento: attività caricate su OneDrive
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
  const agT = agendaItems(allRecords, settings).filter(it => it.data === today() && it.stato !== 'annullato');
  const agOggi = { n: agT.length, first: agT.map(it => it.ora).filter(Boolean).sort()[0] };
  const hsAll = records.filter(r => r.type === 'hs').map(hsCriticita);
  const hsP1 = hsAll.reduce((a, c) => a + c.filter(x => x.p === 1).length, 0), hsCrit = hsAll.reduce((a, c) => a + c.length, 0);
  const hsDaCaricare = records.filter(r => r.type === 'hs' && odStatus(od, r) !== 'ok').length;
  const [hsTplOk, setHsTplOk] = useState(null);
  useEffect(() => { Promise.all(['tpl_hs_esteso', 'tpl_hs_sintetico'].map(k => DB.get(k))).then(x => setHsTplOk(x.every(Boolean))); }, []);
  const nxAddr = nx && (placeAddr(nx.r) || (nx.r.sito || '').trim());
  const when = nx && whenLabel(nx.d);
  const stale = records.length > 0 && (!lastBackup || Date.now() - lastBackup > 7 * 86400000);

  return html`<div class="content">
    <${LargeTitle} eye=${eye} title="Oggi" acts=${html`<button class="btn-icon pri" aria-label="Nuova attività" onClick=${newAct}><${Icon} n="plus" s=${22} w=${2.4} /></button>${bell}${avatar}`} />
    <div class="seg" style="margin-bottom:var(--gap)">${BUS.map(([k, l]) => html`<button class=${bu === k ? 'on' : ''} onClick=${() => setBu(k)}>${l}</button>`)}</div>
    <${PrimiPassi} settings=${settings} tplOk=${tplOk} goSettings=${goSettings} installEvt=${installEvt} onInstall=${onInstall} />

    ${bu === 'sicurezza' ? html`<div class="card"><div class="empty" style="padding:28px 10px"><b>Nessuna attività Sicurezza in Nembo</b>Per ora l'app gestisce le attività Ambiente e HSE. Puoi scegliere la business unit predefinita in Impostazioni.</div></div>` : html`
    <div class="card-navy">
      ${nx ? html`
        <div class="row" style="justify-content:space-between"><span class="nv-eye">Prossimo sopralluogo</span>
          <span class=${'nv-eye' + (when.crit ? ' crit' : '')} style="text-transform:none;letter-spacing:0;font-size:14px">${when.l}${nx.o ? ' · ' + nx.o : ''}</span></div>
        <div class="next-addr">${nxAddr || 'Indirizzo da indicare'}</div>
        <div class="next-line">${[recLine(nx.r), nx.r.cliente, nx.r.type !== 'radon' && nx.r.stato && progL(progDi(nx.r.stato, nx.r.ora))].filter(Boolean).join(' · ')}</div>
        <div class="next-acts">
          <button class="btn pri" onClick=${() => open(nx.r)}>Avvia sopralluogo</button>
          ${nxAddr && html`<a class="btn-icon glass" aria-label="Indicazioni stradali" href=${'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(nxAddr)} target="_blank" rel="noopener"><${Icon} n="nav" s=${20} /></a>`}
        </div>` : html`
        <span class="nv-eye">Prossimo sopralluogo</span>
        <div class="next-addr">Nessun sopralluogo in programma</div>
        <div class="next-line">Le attività con data da oggi in poi e i ritiri radon compaiono qui.</div>
        <div class="next-acts"><button class="btn pri" onClick=${newAct}>Nuova attività</button></div>`}
    </div>
    <div class="card" style="padding:0"><button class="prow" style="width:100%;border:0;background:none;text-align:left" onClick=${() => goList('agenda')}>
      <span class="sq"><${Icon} n="clock" s=${20} /></span><span class="t"><b>Programmazione</b><small>${agOggi.n ? `${agOggi.n} ${agOggi.n === 1 ? 'attività' : 'attività'} oggi${agOggi.first ? ' · la prima alle ' + agOggi.first : ''}` : 'Giornate a fasce orarie, JSON e calendario'}</small></span><${Icon} n="right" s=${18} /></button></div>

    <div class="card">
      <div class="card-h"><h4>Attività di oggi</h4>${!todays.length && html`<span class="wg-lbl">nessuna attività con data di oggi</span>`}</div>
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
        <div class="tot" style="text-align:right"><b>${totP}</b><span>attività caricate</span></div>
      </div>
    </div>

    ${bu === 'hs' ? html`<div class="widgets">
      <button class="card" onClick=${() => goList('hsList')}>
        <span class="wg-ic" style="background:var(--danger-soft);color:var(--danger)"><${Icon} n="shield" s=${20} /></span>
        <div class="wg-num" style=${hsP1 ? 'color:var(--danger)' : ''}>${hsP1}</div>
        <div class="wg-lbl">criticità urgenti (priorità 1 o gravità alta)</div>
        <div class="wg-sub">${hsCrit} criticità aperte in tutto</div>
      </button>
      <button class="card" onClick=${() => goList('hsList')}>
        <span class="wg-ic" style="background:var(--blue-soft);color:var(--blue)"><${Icon} n="helmet" s=${20} /></span>
        <div class="wg-num">${hsDaCaricare}</div>
        <div class="wg-lbl">report da caricare su OneDrive</div>
        <div class="wg-sub">${records.length} report HSE in archivio</div>
      </button>
    </div>` : html`<div class="widgets">
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
    </div>`}`}

    ${bu === 'hs' && hsTplOk === false && html`<button class="notice" style="width:100%;text-align:left;border:0" onClick=${goSettings}>Per generare i report carica i modelli Word HSE (Esteso e Sintetico) in Impostazioni → Modelli.</button>`}
    ${bu === 'ambiente' && onbHidden() && (!tplOk || !settings.tecnicoCognome) && html`<button class="notice" style="width:100%;text-align:left;border:0" onClick=${goSettings}>Prima di iniziare: in Impostazioni inserisci i tuoi dati e carica i due modelli PDF.</button>`}
    ${bu === 'ambiente' && allRecords.some(r => r.type === 'aria') && html`<div class="card" style="margin-top:12px;padding:0"><button class="prow" style="width:100%;border:0;background:none;text-align:left" onClick=${() => goList('ariaList')}>
      <span class="sq"><${Icon} n="air" s=${20} /></span><span class="t"><b>Monitoraggio aria</b><small>${allRecords.filter(r => r.type === 'aria').length} attività</small></span><${Icon} n="right" s=${18} /></button></div>`}
    ${allRecords.some(r => r.type === 'firme') && html`<div class="card" style="margin-top:12px;padding:0"><button class="prow" style="width:100%;border:0;background:none;text-align:left" onClick=${() => goList('firmeList')}>
      <span class="sq"><${Icon} n="sign" s=${20} /></span><span class="t"><b>Fogli firme</b><small>${allRecords.filter(r => r.type === 'firme').length} fuori dalle attività</small></span><${Icon} n="right" s=${18} /></button></div>`}
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
  { k: 'aria', t: 'aria', patch: {}, l: 'Monitoraggio aria', s: 'Fibre aerodisperse: prelievi, scheda ed esiti', ic: 'air', bg: 'var(--blue-soft)', fg: '#0a6ebd' },
  { k: 'hsE', t: 'hs', bu: 'hs', patch: { formato: 'esteso' }, l: 'HSE · Esteso', s: '13 schede, rischio e priorità, documentazione fotografica', ic: 'helmet', bg: 'var(--blue-soft)', fg: 'var(--blue)' },
  { k: 'firme', t: 'firme', bu: 'altro', patch: {}, l: 'Foglio firme', s: 'Presenze, informative, consegne fuori da un’attività', ic: 'sign', bg: 'var(--fill-soft)', fg: 'var(--blue)' },
  { k: 'hsS', t: 'hs', bu: 'hs', patch: { formato: 'sintetico' }, l: 'HSE · Sintetico', s: 'Checklist Sì/No/N.A., azioni consigliate, rilievo fotografico', ic: 'helmet', bg: 'var(--fill-soft)', fg: 'var(--navy)' },
  { k: 'vs', t: 'vs', bu: 'hs', patch: {}, l: 'Verbale HSE', s: 'Note con titolo, testo, foto e tag', ic: 'note', bg: 'var(--ok-soft)', fg: 'var(--ok)' },
];
function NewActivity({ records, onClose, onCreate, bu, preset }) {
  useBackClose(onClose);
  const [k, setK] = useState(bu === 'hs' ? 'hsE' : 'dda1');
  const gruppi = [['Ambiente', NEW_OPTS.filter(o => !o.bu)], ['HSE', NEW_OPTS.filter(o => o.bu === 'hs')]];
  if (bu === 'hs') gruppi.reverse();
  gruppi.push(['Altro', NEW_OPTS.filter(o => o.bu === 'altro')]);
  const [commessa, setCommessa] = useState('');
  const [citta, setCitta] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const opt = NEW_OPTS.find(o => o.k === k);
  // prossima scadenza RA non critica (oltre 30 giorni): avviso sobrio sulla riga
  const raNext = records.filter(r => r.type === 'ra' && raOpen(r) && raScadenza(r) && raScadenza(r) >= today()).map(raScadenza).sort()[0];
  const raSoft = raNext && daysBetween(today(), raNext) > 30;
  const start = () => onCreate(opt.t, { ...opt.patch, ...(preset || {}), commessa: commessa.trim(), citta: citta.trim(), indirizzo: indirizzo.trim() });
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}>
    <div class="sheet" role="dialog" aria-label="Nuova attività">
      <div class="sheet-grab"></div>
      <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>Nuova attività</b><span></span></div>
      ${preset && preset.data && html`<div class="notice" style="margin:0 var(--gutter) 4px">Programmata per ${new Date(preset.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}${preset.ora ? ' alle ' + preset.ora : ''}</div>`}
      <div class="sheet-body">
        ${gruppi.map(([gl, opts], gi) => html`<div class="sec-h" style=${gi ? '' : 'margin-top:6px'}><h3>${gl}</h3></div>
        ${opts.map(o => html`<button class=${'opt' + (k === o.k ? ' on' : '') + (o.k === 'ra' && raSoft && k !== 'ra' ? ' alert-soft' : '')} onClick=${() => setK(o.k)} aria-pressed=${k === o.k}>
          <span class="oi" style=${`background:${o.bg};color:${o.fg}`}><${Icon} n=${o.ic} s=${21} /></span>
          <span class="ot"><b>${o.l}</b><small>${o.k === 'ra' && raNext ? html`${o.s} · <span style=${k === 'ra' ? '' : 'color:var(--blue)'}>prossima scadenza ${new Date(raNext + 'T12:00:00').toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}</span>` : o.s}</small></span>
          </button>`)}`)}
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
