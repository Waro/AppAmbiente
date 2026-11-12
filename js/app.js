/* Struttura dell'app: sincronizzazione dalla Home, navigazione, menu e avvio.
   Backup e ZIP in js/backup.js, configurazione in js/config.js, impostazioni e notifiche in js/impostazioni.js. */

let _settings = { ...DEFAULT_SETTINGS };
/* ---------------- sincronizzazione dalla Home ----------------
   Icona in Oggi al posto della campanella. Verde: sincronizzata da meno di SYNC_RECENTE; arancione: più vecchia,
   offline o mai fatta; rossa: non riuscita o accesso da rinnovare; grigia: OneDrive non collegato.
   Le notifiche: pallino rosso sul profilo (errori non letti) e voce «Notifiche» in cima alle Impostazioni.
   Al tocco sincronizza; se non riesce apre un foglio con l'errore e il collegamento a Impostazioni → OneDrive. */
const SYNC_RECENTE = 24 * 3600000;
function syncColore(s) {
  if (!OD.account) return ['var(--muted)', 'non collegato'];
  if (s.phase === 'err' || s.phase === 'login') return ['var(--danger)', 'non riuscita'];
  if (s.phase === 'ok' && s.last && Date.now() - s.last < SYNC_RECENTE) return ['var(--ok)', 'aggiornata'];
  return ['var(--warn)', 'da aggiornare'];
}
function SyncBtn({ onErr }) {
  const s = useSync(); const [, force] = useState(0);
  useEffect(() => OD.subscribe(() => force(x => x + 1)), []);
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 60000); return () => clearInterval(t); }, []);
  const run = s.phase === 'run';
  const [c, l] = syncColore(s);
  const tap = async () => {
    if (run) return;
    if (!OD.account) { onErr('Non sei collegato a OneDrive: accedi con Microsoft per sincronizzare.', 'OneDrive non collegato'); return; }
    if (!navigator.onLine) { onErr('Sei offline: la sincronizzazione riparte quando torna la rete.'); return; }
    await Sync.run();
    const x = Sync.state;
    if (x.phase === 'ok') toast(!x.text || x.text === 'Tutto aggiornato' ? 'Tutto già sincronizzato' : 'Sincronizzato: ' + x.text);
    else onErr(x.error || 'La sincronizzazione non è riuscita.');
  };
  const lab = 'Sincronizza ora · ' + (run ? 'in corso' : l + (s.last ? ', ultima ' + quandoIt(s.last) : ''));
  return html`<button class="btn-icon" aria-label=${lab} title=${lab} style=${'color:' + (run ? 'var(--blue)' : c)} onClick=${tap}>
    ${run ? html`<div class="spin" />` : html`<${Icon} n="sync" s=${21} w=${2.2} />`}</button>`;
}
function SyncErrSheet({ msg, title = 'Sincronizzazione non riuscita', onClose, onOd }) {
  useBackClose(onClose);
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="alertdialog" aria-label=${title}>
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>Sincronizzazione</b><span></span></div>
    <div class="sheet-body">
      <div class=${'notice mt-0' + (title === 'OneDrive non collegato' ? '' : ' err')}><b>${title}</b><br />${msg}</div>
      <div class="stack mt-4">
        <button class="btn pri block" onClick=${onOd}><${Icon} n="share" s=${18} /> Apri Impostazioni → OneDrive</button>
        <button class="btn block" onClick=${onClose}>Annulla</button>
      </div>
    </div></div></div>`;
}

// se una schermata va in errore resta l'app, con la possibilità di riprovare e di segnalarlo
function Boundary({ children }) {
  const [err, reset] = useErrorBoundary(e => reportAppError(e, 'schermata'));
  if (!err) return children;
  return html`<div class="content" style="padding:28px 20px;max-width:560px;margin:0 auto">
    <div class="lt-title" style="font-size:var(--fs-4xl)">Qualcosa non ha funzionato</div>
    <p class="lead">I tuoi dati sono salvati. L'errore è stato registrato nelle Notifiche con il codice APP-JS.</p>
    <div class="mono" style="font-size:var(--fs-sm);background:var(--fill-soft);border-radius:var(--r-sm);padding:8px;word-break:break-word;margin:10px 0 16px">${String(err && err.message || err)}</div>
    <button class="btn pri block" onClick=${() => { location.hash = ''; reset(); }}>Torna a Oggi</button>
    <button class="btn block mt-2" onClick=${() => location.reload()}>Ricarica l'app</button>
    <button class="btn block mt-2" onClick=${() => DB.get('settings').then(s => reportIssue(s))}>Segnala un problema</button>
  </div>`;
}

/* Sopra questa larghezza CSS, elenco e scheda sono affiancati (tablet in orizzontale, PC).
   Sotto, restano due schermate separate come su telefono e tablet in verticale. */
const WIDE_MQ = '(min-width: 1000px)';
function useWide() {
  const [w, setW] = useState(() => matchMedia(WIDE_MQ).matches);
  useEffect(() => {
    const mq = matchMedia(WIDE_MQ);
    const f = e => setW(e.matches);
    mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', f) : mq.removeListener(f));
  }, []);
  return w;
}
const LIST_OF = { cli: 'cliList', dda: 'ddaList', mappatura: 'mappaturaList', radon: 'radonList', ra: 'raList', hs: 'hsList', vs: 'vsList', firme: 'firmeList', aria: 'ariaList' };
const DETAIL_OF = { cliList: 'cli', ddaList: 'dda', mappaturaList: 'mappatura', radonList: 'radon', raList: 'ra', hsList: 'hs', vsList: 'vs', firmeList: 'firme', ariaList: 'aria' };
const TOP_ROUTES = ['home', 'agenda', 'ddaList', 'mappaturaList', 'raList', 'radonList', 'hsList', 'vsList', 'firmeList', 'ariaList'];
const ROUTE_TITLE = { home: 'Oggi', ddaList: 'Ambiente · DDA', mappaturaList: 'Mappatura MCA e FAV', raList: 'Sopralluogo RA', radonList: 'Campagne radon', ariaList: 'Monitoraggio aria', aria: 'Monitoraggio aria',
  hsList: 'Sopralluoghi HSE', hs: 'Sopralluogo HSE', vsList: 'Verbali HSE', vs: 'Verbale HSE', firmeList: 'Fogli firme', firme: 'Fogli firme', agenda: 'Programmazione', cerca: 'Cerca', cliList: 'Clienti', cli: 'Cliente', settings: 'Impostazioni', backup: 'Backup', notifiche: 'Notifiche', dda: 'DDA', mappatura: 'Mappatura', ra: 'Sopralluogo RA', radon: 'Campagna radon' };

/* ---------------- menu laterale (tablet in orizzontale e PC) ---------------- */
const NAV_AREAS = [
  { v: 'ddaList', d: 'dda', ic: 'leaf', l: 'Ambiente · DDA' },
  { v: 'mappaturaList', d: 'mappatura', ic: 'pin', l: 'Mappatura MCA e FAV' },
  { v: 'raList', d: 'ra', ic: 'shield', l: 'Sopralluogo RA' },
  { v: 'radonList', d: 'radon', ic: 'radon', l: 'Campagne radon' },
  { v: 'ariaList', d: 'aria', ic: 'air', l: 'Monitoraggio aria' },
];
const NAV_HS = [{ v: 'hsList', d: 'hs', ic: 'helmet', l: 'Sopralluoghi HSE' }, { v: 'vsList', d: 'vs', ic: 'note', l: 'Verbali HSE' }];
const NAV_TOOLS = [{ v: 'agenda', ic: 'clock', l: 'Programmazione' }, { v: 'cliList', d: 'cli', ic: 'building', l: 'Clienti' }, { v: 'firmeList', d: 'firme', ic: 'sign', l: 'Fogli firme' }, { v: 'backup', ic: 'archive', l: 'Backup' }];
// tab bar del telefono: Oggi + le quattro aree
const TABS = [{ v: 'home', ic: 'today', l: 'Oggi' }, { v: 'ddaList', ic: 'leaf', l: 'DDA' }, { v: 'mappaturaList', ic: 'pin', l: 'Mappature' },
  { v: 'raList', ic: 'shield', l: 'RA' }, { v: 'radonList', ic: 'radon', l: 'Radon' }];
// menu ridotto o esteso: la scelta dell'utente resta; altrimenti ridotto sotto i 1300 px
function useNavMin() {
  const [min, setMin] = useState(() => {
    try { const v = localStorage.getItem('nembo_nav'); if (v) return v === 'min'; } catch (e) {}
    return !matchMedia('(min-width: 1300px)').matches;
  });
  const toggle = () => setMin(m => { try { localStorage.setItem('nembo_nav', m ? 'full' : 'min'); } catch (e) {} return !m; });
  return [min, toggle];
}
// colori delle icone nel menu laterale esteso: gli stessi del foglio "Nuova attività"
const SN_COL = {
  home: 'var(--blue)', ddaList: TIPO_COL.dda, mappaturaList: TIPO_COL.mappatura, raList: TIPO_COL.ra, radonList: TIPO_COL.radon, ariaList: TIPO_COL.aria,
  hsList: TIPO_COL.hs, vsList: TIPO_COL.vs, agenda: 'var(--navy-ink)', firmeList: TIPO_COL.firme, cerca: 'var(--navy-ink)', cliList: TIPO_COL.dda,
  backup: 'var(--text2)', settings: 'var(--text2)',
};
function SideNav({ route, go, counts, settings, min, toggle, unreadErr = 0 }) {
  const nav = v => { if (route.v !== v) go({ v }); };
  const item = (x, n) => {
    const on = route.v === x.v || route.v === x.d;
    const col = SN_COL[x.v];
    return html`<button class=${'sn-it' + (on ? ' on' : '')} title=${min ? x.l : null} aria-current=${on ? 'page' : null} onClick=${() => nav(x.v)}>
      ${!min && col ? html`<span class="sn-ic tint" style=${'--c:' + col}><${Icon} n=${x.ic} s=${19} /></span>` : html`<${Icon} n=${x.ic} s=${21} />`}<span class="l">${x.l}</span>${n > 0 && html`<span class="n">${n}</span>`}</button>`;
  };
  const name = `${settings.tecnicoNome || ''} ${settings.tecnicoCognome || ''}`.trim();
  const initials = (((settings.tecnicoNome || '')[0] || '') + ((settings.tecnicoCognome || '')[0] || '')).toUpperCase();
  const ss = useSync(); const sync = OD.account && settings.odSync !== false ? syncLabel(ss) : ''; const syncPhase = ss.phase;
  return html`<aside class=${'sidenav' + (min ? ' min' : '')} aria-label="Aree di lavoro">
    <button class="sn-brand" title="Oggi" onClick=${() => nav('home')}><img class="logo" src="icons/icon-192.png" alt="" /><div><b>Nembo</b>${name && html`<small>${name}</small>`}</div></button>
    <div class="sn-sec">Oggi</div><div class="sn-div"></div>
    ${item({ v: 'home', ic: 'today', l: 'Oggi' }, 0)}
    ${item({ v: 'cerca', ic: 'search', l: 'Cerca' }, 0)}
    <div class="sn-sec">Aree di lavoro</div>
    ${NAV_AREAS.map(x => item(x, counts[x.d]))}
    <div class="sn-sec">HSE</div><div class="sn-div"></div>
    ${NAV_HS.map(x => item(x, counts[x.d]))}
    <div class="sn-sec">Strumenti</div><div class="sn-div"></div>
    ${NAV_TOOLS.map(x => item(x, x.d ? counts[x.d] : 0))}
    <div class="sn-grow"></div>
    <button class=${'sn-prof' + (route.v === 'settings' ? ' on' : '')} title=${min ? 'Impostazioni' : null} aria-label=${unreadErr ? `Profilo, impostazioni e notifiche, ${unreadErr} ${unreadErr === 1 ? 'errore non letto' : 'errori non letti'}` : 'Profilo, impostazioni e notifiche'} onClick=${() => nav('settings')}>
      <span class="ava">${initials || html`<${Icon} n="gear" s=${18} />`}${unreadErr > 0 && html`<span class="dot">${unreadErr}</span>`}</span><span class="l"><b>${name || 'Profilo'}</b><small>Impostazioni</small></span></button>
    <button class="sn-toggle" title=${min ? 'Espandi il menu' : 'Riduci il menu'} aria-expanded=${!min} onClick=${toggle}>
      <${Icon} n=${min ? 'expand' : 'collapse'} s=${19} /><span class="l">Riduci menu</span></button>
    <div class="sn-ver">${APP_VERSION}${sync && html`<br /><span class=${'sn-sync ' + syncPhase}>${sync}</span>`}</div>
  </aside>`;
}
const TABS_HS = [{ v: 'home', ic: 'today', l: 'Oggi' }, { v: 'hsList', ic: 'helmet', l: 'HSE' }, { v: 'vsList', ic: 'note', l: 'Verbali' }, { v: 'ddaList', ic: 'leaf', l: 'DDA' }, { v: 'raList', ic: 'shield', l: 'RA' }];
function TabBar({ route, tab, bu }) {
  const tabs = bu === 'hs' ? TABS_HS : TABS;
  return html`<nav class="tabbar" aria-label="Sezioni" style=${'grid-template-columns:repeat(' + tabs.length + ',1fr)'}>${tabs.map(t => html`<button class=${route.v === t.v ? 'on' : ''} aria-current=${route.v === t.v ? 'page' : null} onClick=${() => tab(t.v)}>
    <${Icon} n=${t.ic} s=${24} /><span>${t.l}</span></button>`)}</nav>`;
}

function App() {
  const wide = useWide();
  const [ready, setReady] = useState(false);
  const [allRecs, setRecords] = useState([]);
  // le attività; i clienti (tipo 'cli') sono a parte
  const records = useMemo(() => allRecs.filter(r => r.type !== 'cli'), [allRecs]);
  const clienti = useMemo(() => allRecs.filter(r => r.type === 'cli'), [allRecs]);
  setClienti(clienti);
  setRecsNum(records);
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [route, setRoute] = useState({ v: 'home' });
  const notifs = useNotifiche();
  const unreadErr = notifs.filter(n => !n.read && n.level === 'err').length;
  const [navMin, toggleNav] = useNavMin();
  useSel(); // la selezione di più attività ridisegna elenchi e «Da completare»
  const od = useOdSynced();
  const [lastBackup, setLastBackup] = useState(null);
  const [installEvt, setInstallEvt] = useState(null);
  const [tplOk, setTplOk] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [preset, setPreset] = useState(null);
  const [novita, setNovita] = useState(null);
  const [benvenuto, setBenvenuto] = useState(false);
  const [cfgRemota, setCfgRemota] = useState(null); // configurazione su OneDrive da proporre al primo avvio
  const [syncErr, setSyncErr] = useState(null);
  const [, odTick] = useState(0);
  useEffect(() => OD.subscribe(() => odTick(x => x + 1)), []);

  const reload = async () => {
    const rs = await DB.all(); setRecords(rs);
    const s = await DB.get('settings'); const st = { ...DEFAULT_SETTINGS, ...(s || {}) }; setSettingsState(st); _settings = st;
    setLastBackup(await DB.get('lastBackup'));
    const t = await Promise.all(Object.values(TEMPLATES).filter(x => x.bu === 'ambiente' && !x.xlsx).map(x => DB.get(x.key)));
    setTplOk(t.every(Boolean));
    OD.init(st).catch(e => console.warn('OneDrive', e));
    return rs;
  };
  useEffect(() => {
    reload().then(async rs => { setReady(true); const haDati = rs.some(r => r.type !== 'cli');
      if (await benvenutoDaMostrare(haDati, await DB.get('settings')).catch(() => false)) setBenvenuto(true);
      novitaDaMostrare(haDati).then(l => l && setNovita(l)).catch(e => console.warn('novità', e)); radonReminders(rs).then(n => n && DB.all().then(setRecords)); Sync.start(); });
    const offRec = Sync.onRecords(() => DB.all().then(setRecords));
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const bip = e => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', bip);
    return () => { window.removeEventListener('beforeinstallprompt', bip); offRec(); };
  }, []);

  const setSettings = s => { setSettingsState(s); _settings = s; DB.set('settings', s); chiaveUtenteNome(s).catch(e => console.warn('codice utente', e)); cfgOdSchedule(); };
  // collegato a OneDrive: dispositivo nuovo → propone il ripristino della configurazione; altrimenti la tiene aggiornata
  const odAcc = OD.account && OD.account.homeAccountId;
  useEffect(() => {
    if (!ready || !odAcc) return; let alive = true;
    (async () => {
      const st = await cfgOdStato();
      if (st.ok) { cfgOdSchedule(8000); return; }
      if (_settings.cfgOd === false || !navigator.onLine) return;
      const c = await cfgDaOneDrive().catch(() => null); if (!alive) return;
      if (c) { if (!st.nonOra) setCfgRemota(c); }
      else cfgSuOneDrive().catch(e => cfgOdSet({ err: e.message }));
    })();
    return () => { alive = false; };
  }, [ready, odAcc]);
  const go = next => { const prev = route; setRoute({ ...next, from: ROUTE_TITLE[prev.v] }); Back.push(() => setRoute(prev)); };
  const goBack = () => history.back();
  // tab bar: dalla Home si entra in un'area (Indietro torna a Oggi); tra un'area e l'altra si sostituisce la schermata
  const tab = v => {
    if (v === route.v) return;
    if (route.v === 'home') go({ v });
    else if (v === 'home') goBack();
    else setRoute({ v, from: 'Oggi' });
  };
  // nel doppio pannello, scegliere un’attività dall'elenco non è una "navigazione": niente storico
  const select = id => setRoute(r => ({ ...r, id }));

  // ruotando il tablet, passa dalla schermata piena al doppio pannello (e viceversa) senza perdere l’attività aperta
  useEffect(() => {
    setRoute(r => {
      if (wide && DETAIL_OF[LIST_OF[r.v]] === r.v) return { v: LIST_OF[r.v], id: r.id };
      if (!wide && DETAIL_OF[r.v] && r.id) { const list = r.v; Back.push(() => setRoute({ v: list })); return { v: DETAIL_OF[r.v], id: r.id, from: ROUTE_TITLE[list] }; }
      return r;
    });
  }, [wide]);

  const saveRec = useCallback(async rec => {
    await DB.put(rec);
    setRecords(rs => { const i = rs.findIndex(x => x.id === rec.id); if (i < 0) return [...rs, rec]; const c = rs.slice(); c[i] = rec; return c; });
    Sync.schedule();
  }, []);
  const delRec = async rec => {
    if (!confirm('Eliminare definitivamente? Foto e allegati vengono cancellati da questo telefono.')) return;
    for (const b of blobIds(rec)) await removeBlob(b);
    await DB.del(rec.id);
    Sync.markDeleted(rec.id);
    setRecords(rs => rs.filter(x => x.id !== rec.id));
    toast('Eliminato');
    if (wide) select(null); else goBack();
  };
  // eliminazione senza cambiare schermata (appuntamenti della Programmazione)
  const removeRec = async rec => {
    for (const b of blobIds(rec)) await removeBlob(b);
    await DB.del(rec.id); Sync.markDeleted(rec.id);
    setRecords(rs => rs.filter(x => x.id !== rec.id));
  };
  // colori dei tag coerenti in tutta l'app
  useEffect(() => { setTagList(Object.keys(collectTags(records))); }, [records]);
  // cambiando schermata la selezione si chiude
  useEffect(() => Sel.stop(), [route.v]);
  // l’attività aperta non viene sovrascritta dalla sincronizzazione
  useEffect(() => { Sync.busy = route.id || null; }, [route.id]);
  // uscendo da un record nuovo rimasto vuoto, lo scarto
  useEffect(() => {
    if (route.v === 'dda' || route.v === 'mappatura' || route.v === 'radon' || route.v === 'ra' || route.v === 'hs' || route.v === 'vs' || route.v === 'firme' || route.v === 'aria' || route.v === 'cli') return;
    const keep = route.id;
    const empties = allRecs.filter(r => r._new && r.id !== keep && (r.type === 'cli' ? clienteIsEmpty(r) : r.type === 'aria' ? ariaIsEmpty(r) : r.type === 'dda' ? ddaIsEmpty(r) : r.type === 'mappatura' ? mappaturaIsEmpty(r) : r.type === 'ra' ? raIsEmpty(r) : r.type === 'hs' ? hsIsEmpty(r) : r.type === 'vs' ? verbaleIsEmpty(r) : r.type === 'firme' ? firmeIsEmpty(r) : radonIsEmpty(r)));
    empties.forEach(r => DB.del(r.id));
    if (empties.length) setRecords(rs => rs.filter(r => !empties.includes(r)));
  }, [route.v, route.id]);

  // apre un’attività: nel doppio pannello dentro l'area, altrimenti a schermo pieno
  const openRec = r => {
    if (wide) { if (route.v === LIST_OF[r.type]) select(r.id); else go({ v: LIST_OF[r.type], id: r.id }); }
    else go({ v: r.type, id: r.id });
  };
  const create = (type, patch = {}) => {
    const base = type === 'cli' ? newCliente() : type === 'aria' ? newAria(records, settings) : type === 'dda' ? newDda(records, settings) : type === 'mappatura' ? newMappatura(records, settings) : type === 'ra' ? newRa(records, settings) : type === 'hs' ? newHs(records, settings, patch.formato) : type === 'vs' ? newVerbale(records, settings) : type === 'firme' ? newFirmeRec(records, settings) : newRadon(settings);
    let r = { ...base, ...patch, _new: true };
    if (type === 'hs' && !patch.cliente) r.cliente = base.cliente; // committente proposto nelle Impostazioni
    prepFirme(r, settings, patch.firme);
    // dalla Programmazione: per il radon data e ora vanno sul primo momento (posa)
    if (type === 'radon' && (patch.data || patch.ora)) { const { data, ora, ...rest } = patch; r = { ...base, ...rest, _new: true, momenti: base.momenti.map((m, i) => i ? m : { ...m, data: data || m.data, ora: ora || '' }) }; }
    // RA dello stesso immobile già in Nembo: riprendo i manufatti dell'anno precedente
    const prev = type === 'ra' ? raPrecedente(records, r) : null;
    if (prev) { raRiprendi(prev, r).then(p => { const x = { ...r, ...p }; saveRec(x); openRec(x); toast(`${p.manufatti.length === 1 ? 'Ripreso 1 manufatto' : 'Ripresi ' + p.manufatti.length + ' manufatti'} da ${prev.codice}`); }).catch(e => { fail('Ripresa non riuscita', e); saveRec(r); openRec(r); }); return; }
    saveRec(r); openRec(r);
  };
  const createDda = () => create('dda');
  const createMappatura = () => create('mappatura');
  const createRadon = () => create('radon');
  const createRa = () => create('ra');
  const createHs = () => setSheet('hs');
  const createFirme = () => create('firme');
  const createAria = () => create('aria');
  const createVs = () => create('vs');
  const createCli = () => create('cli');
  const importClienti = async nomi => {
    if (!confirm(`Aggiungo ${nomi.length === 1 ? 'il cliente «' + nomi[0] + '»' : nomi.length + ' clienti'} all'anagrafica?`)) return;
    for (const nome of nomi) await saveRec(newCliente({ nome }));
    toast(nomi.length === 1 ? 'Cliente aggiunto' : nomi.length + ' clienti aggiunti');
  };
  // un report HSE già pronto (aggiornamento per l'anno successivo): lo salvo e lo apro
  const openNewRec = r => { saveRec(r); openRec(r); toast('Nuovo sopralluogo creato: ' + r.codice); };

  const header = useCallback(() => {}, []); // le schede disegnano da sole la propria intestazione
  if (!ready) return html`<div class="shell"></div>`;
  const rec = route.id && allRecs.find(r => r.id === route.id);

  const initials = ((settings.tecnicoNome || '')[0] || '') + ((settings.tecnicoCognome || '')[0] || '');
  const syncBtn = html`<${SyncBtn} onErr=${(msg, title) => setSyncErr({ msg, title })} />`;
  const bell = html`<button class=${'btn-icon' + (route.v === 'notifiche' ? ' on' : '')} aria-label=${unreadErr ? `Notifiche, ${unreadErr} errori non letti` : 'Notifiche'}
    onClick=${() => route.v !== 'notifiche' && go({ v: 'notifiche' })}><${Icon} n="bell" s=${21} />${unreadErr > 0 && html`<span class="dot">${unreadErr}</span>`}</button>`;
  const plus = (fn, label) => html`<button class="btn-icon pri" aria-label=${label} onClick=${fn}><${Icon} n="plus" s=${22} w=${2.4} /></button>`;
  const listActs = (fn, label) => html`${!Sel.active && html`<span class="sel-pc"><${SelBtn} /></span>`}${plus(fn, label)}${bell}`;

  const split = (list, detail, emptyTxt) => wide ? html`<div class="split-body">
      <div class="split-list">${list}</div>
      <div class="split-detail">${detail || html`<div class="split-empty"><b>${emptyTxt[0]}</b>${emptyTxt[1]}</div>`}</div></div>` : list;
  const dRec = wide && route.id && allRecs.find(x => x.id === route.id);
  const formProps = r => ({ key: r.id, rec: r, records, settings, onDelete: delRec, onSettings: () => go({ v: 'settings' }), header, embedded: wide, onClose: wide ? () => select(null) : null });

  let body, wideCreate = null;
  if (route.v === 'home') {
    wideCreate = () => setSheet(true);
    body = html`<${Home} records=${records} settings=${settings} open=${openRec} newAct=${() => setSheet(true)} syncBtn=${syncBtn}
      avatar=${html`<button class="ava" aria-label=${unreadErr ? `Impostazioni e notifiche, ${unreadErr} ${unreadErr === 1 ? 'errore non letto' : 'errori non letti'}` : 'Impostazioni e notifiche'} onClick=${() => go({ v: 'settings' })}>${initials.toUpperCase() || html`<${Icon} n="gear" s=${20} />`}${unreadErr > 0 && html`<span class="dot">${unreadErr}</span>`}</button>`}
      tplOk=${tplOk} lastBackup=${lastBackup} goList=${v => go({ v })} goSettings=${p => go({ v: 'settings', p: typeof p === 'string' ? p : undefined })} goBackup=${() => go({ v: 'backup' })} goCerca=${() => go({ v: 'cerca' })}
      installEvt=${installEvt} onInstall=${async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }} />`;
  } else if (route.v === 'ddaList') {
    wideCreate = createDda;
    body = split(html`<${DdaList} records=${records} acts=${listActs(createDda, 'Nuova indagine')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'dda', id })} create=${createDda} />`,
      dRec && html`<${DdaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && ddaIsEmpty(r) })} />`,
      ['Nessuna attività selezionata', 'Toccane una dall\'elenco per aprirla qui.']);
  } else if (route.v === 'mappaturaList') {
    wideCreate = createMappatura;
    body = split(html`<${MappaturaList} records=${records} acts=${listActs(createMappatura, 'Nuova mappatura')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'mappatura', id })} create=${createMappatura} />`,
      dRec && html`<${MappaturaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && mappaturaIsEmpty(r) })} />`,
      ['Nessuna mappatura selezionata', 'Toccane una dall\'elenco per aprirla qui.']);
  } else if (route.v === 'raList') {
    wideCreate = createRa;
    body = split(html`<${RaList} records=${records} acts=${listActs(createRa, 'Nuovo sopralluogo RA')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'ra', id })} create=${createRa} />`,
      dRec && html`<${RaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && raIsEmpty(r) })} />`,
      ['Nessun sopralluogo selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'radonList') {
    wideCreate = createRadon;
    body = split(html`<${RadonList} records=${records} acts=${listActs(createRadon, 'Nuova campagna')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'radon', id })} create=${createRadon} />`,
      dRec && html`<${RadonForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && radonIsEmpty(r) })} />`,
      ['Nessuna campagna selezionata', 'Toccane una dall\'elenco per aprirla qui.']);
  } else if (route.v === 'hsList') {
    wideCreate = createHs;
    body = split(html`<${HsList} records=${records} acts=${listActs(createHs, 'Nuovo sopralluogo HSE')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'hs', id })} create=${createHs} />`,
      dRec && html`<${HsForm} ...${formProps(dRec)} onOpenNew=${openNewRec} onSave=${r => saveRec({ ...r, _new: r._new && hsIsEmpty(r) })} />`,
      ['Nessun sopralluogo selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'cerca') {
    body = html`<${Cerca} records=${records} openRec=${openRec} acts=${null} />`;
  } else if (route.v === 'agenda') {
    wideCreate = () => dispatchEvent(new Event('nembo-ag-add'));
    body = html`<${Agenda} records=${records} settings=${settings} saveRec=${saveRec} openRec=${openRec} bell=${bell} removeRec=${removeRec} />`;
  } else if (route.v === 'cliList') {
    wideCreate = createCli;
    body = split(html`<${ClientiList} records=${records} clienti=${clienti} onImport=${importClienti} acts=${listActs(createCli, 'Nuovo cliente')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'cli', id })} />`,
      dRec && html`<${ClienteForm} ...${formProps(dRec)} openRec=${openRec} onSave=${r => saveRec({ ...r, _new: r._new && clienteIsEmpty(r) })} />`,
      ['Nessun cliente selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'cli' && rec) {
    body = html`<${ClienteForm} ...${formProps(rec)} embedded=${false} onClose=${null} openRec=${openRec} onSave=${r => saveRec({ ...r, _new: r._new && clienteIsEmpty(r) })} />`;
  } else if (route.v === 'firmeList') {
    wideCreate = createFirme;
    body = split(html`<${FirmeList} records=${records} acts=${listActs(createFirme, 'Nuovo foglio firme')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'firme', id })} />`,
      dRec && html`<${FirmeForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && firmeIsEmpty(r) })} />`,
      ['Nessun foglio selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'vsList') {
    wideCreate = createVs;
    body = split(html`<${VerbaleList} records=${records} acts=${listActs(createVs, 'Nuovo verbale HSE')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'vs', id })} />`,
      dRec && html`<${VerbaleForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && verbaleIsEmpty(r) })} />`,
      ['Nessun verbale selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'vs' && rec) {
    body = html`<${VerbaleForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && verbaleIsEmpty(r) })} />`;
  } else if (route.v === 'ariaList') {
    wideCreate = createAria;
    body = split(html`<${AriaList} records=${records} acts=${listActs(createAria, 'Nuovo monitoraggio aria')} activeId=${wide ? route.id : null} open=${id => wide ? select(id) : go({ v: 'aria', id })} />`,
      dRec && html`<${AriaForm} ...${formProps(dRec)} onSave=${r => saveRec({ ...r, _new: r._new && ariaIsEmpty(r) })} />`,
      ['Nessun monitoraggio selezionato', 'Toccane uno dall\'elenco per aprirlo qui.']);
  } else if (route.v === 'aria' && rec) {
    body = html`<${AriaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && ariaIsEmpty(r) })} />`;
  } else if (route.v === 'firme' && rec) {
    body = html`<${FirmeForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && firmeIsEmpty(r) })} />`;
  } else if (route.v === 'hs' && rec) {
    body = html`<${HsForm} ...${formProps(rec)} embedded=${false} onClose=${null} onOpenNew=${openNewRec} onSave=${r => saveRec({ ...r, _new: r._new && hsIsEmpty(r) })} />`;
  } else if (route.v === 'dda' && rec) {
    body = html`<${DdaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && ddaIsEmpty(r) })} />`;
  } else if (route.v === 'mappatura' && rec) {
    body = html`<${MappaturaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && mappaturaIsEmpty(r) })} />`;
  } else if (route.v === 'ra' && rec) {
    body = html`<${RaForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && raIsEmpty(r) })} />`;
  } else if (route.v === 'radon' && rec) {
    body = html`<${RadonForm} ...${formProps(rec)} embedded=${false} onClose=${null} onSave=${r => saveRec({ ...r, _new: r._new && radonIsEmpty(r) })} />`;
  } else if (route.v === 'settings') {
    body = html`<${Settings} settings=${settings} setSettings=${setSettings} onTemplates=${reload} go=${go} page=${route.p} wide=${wide} unreadErr=${unreadErr} />`;
  } else if (route.v === 'notifiche') {
    body = html`<${Notifiche} settings=${settings} records=${records} openRec=${openRec} />`;
  } else if (route.v === 'backup') {
    body = html`<${Backup} records=${records} all=${allRecs} settings=${settings} reload=${reload} lastBackup=${lastBackup} />`;
  } else {
    body = html`<div class="content"><div class="empty"><b>Elemento non trovato</b>Potrebbe essere stato eliminato.</div></div>`;
  }

  const isTop = TOP_ROUTES.includes(route.v);
  const splitActive = wide && !!DETAIL_OF[route.v];
  // numeri del menu laterale: solo le attività aperte (i sopralluoghi conclusi non contano)
  const aperte = t => records.filter(r => r.type === t && attAperta(r, od)).length;
  const counts = { dda: aperte('dda'), mappatura: aperte('mappatura'), cli: clienti.length, ra: aperte('ra'), hs: aperte('hs'), vs: aperte('vs'), firme: aperte('firme'), aria: aperte('aria'), radon: aperte('radon') };
  return html`<div class=${'frame' + (wide ? ' wide' : '')}>
    ${wide && html`<${SideNav} route=${route} go=${go} counts=${counts} settings=${settings} min=${navMin} toggle=${toggleNav} unreadErr=${unreadErr} />`}
    <div class=${'shell' + (splitActive ? ' split' : '') + (!wide && isTop ? ' has-tabs' : '') + (Sel.active ? ' sel-on' : '')}>
    ${wide && html`<header class="wbar"><div class="tb-grow">${route.v === 'home' && html`<div class="lt-eye">${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`}<h1>${ROUTE_TITLE[route.v] || 'Nembo'}</h1></div>
      ${DETAIL_OF[route.v] && route.v !== 'cliList' && !Sel.active && html`<span class="sel-pc"><${SelBtn} /></span>`}
      ${route.v !== 'cerca' && html`<button class="btn-icon" aria-label="Cerca" title="Cerca" onClick=${() => go({ v: 'cerca' })}><${Icon} n="search" s=${20} /></button>`}${wideCreate && plus(wideCreate, 'Nuova')}${route.v === 'home' ? syncBtn : bell}</header>`}
    ${!wide && !isTop && html`<header class="navbar">
      <button class="nb-back" onClick=${goBack}><${Icon} n="back" s=${22} /> ${route.from || 'Indietro'}</button>
      <div class="nb-grow"></div>${route.v !== 'notifiche' && bell}</header>`}
    ${body}
    ${!wide && isTop && html`<${TabBar} route=${route} tab=${tab} bu=${settings.buDefault} />`}
    ${sheet && html`<${NewActivity} records=${records} settings=${settings} onOpenNew=${openNewRec} preset=${preset} bu=${sheet === 'hs' ? 'hs' : settings.buDefault} onClose=${() => { setSheet(false); setPreset(null); }} onCreate=${(t, patch) => { window.addEventListener('popstate', () => setTimeout(() => create(t, patch), 0), { once: true }); setSheet(false); }} />`}
    ${Sel.active && html`<${SelBars} records=${allRecs} settings=${settings} />`}
    <${ShareAsk} />
    <${ConcludiAsk} />
    <${Progress} />
    <${CameraHost} />
    ${cfgRemota && html`<${CfgRestoreSheet} cfg=${cfgRemota} settings=${settings} setSettings=${setSettings} onTemplates=${reload} avvio=${true} onClose=${() => setCfgRemota(null)} />`}
    ${syncErr && html`<${SyncErrSheet} msg=${syncErr.msg} title=${syncErr.title} onClose=${() => setSyncErr(null)}
      onOd=${() => { window.addEventListener('popstate', () => setTimeout(() => go({ v: 'settings', p: 'onedrive' }), 0), { once: true }); setSyncErr(null); }} />`}
    ${novita && !benvenuto && !cfgRemota && html`<${NovitaSheet} list=${novita} go=${go} onClose=${() => setNovita(null)} />`}
    ${benvenuto && !cfgRemota && html`<${BenvenutoSheet} settings=${settings} setSettings=${setSettings} onClose=${() => setBenvenuto(false)} />`}
    <${Toast} />
    </div>
  </div>`;
}


render(html`<${Boundary}><${App} /></${Boundary}>`, document.getElementById('root'));
fldSegnaposto();
const splash = document.getElementById('splash');
if (splash) requestAnimationFrame(() => requestAnimationFrame(() => { splash.classList.add('hide'); setTimeout(() => splash.remove(), 550); }));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
}


