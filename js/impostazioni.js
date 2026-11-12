/* Impostazioni, segnala un problema, dati su questo dispositivo e Notifiche. */

/* ---------------- impostazioni ---------------- */
const BUS = [['ambiente', 'Ambiente'], ['hs', 'HSE'], ['sicurezza', 'Sicurezza']];
function TemplateRow({ name, t, onChange }) {
  const [has, setHas] = useState(null); const inp = useRef();
  useEffect(() => { DB.get(t.key).then(b => setHas(!!b)); }, []);
  const pick = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const bytes = await f.arrayBuffer();
      await checkTemplate(name, bytes);
      await DB.set(t.key, bytes); setHas(true); toast('Modello salvato'); onChange && onChange(); cfgOdSchedule();
    } catch (err) { fail('Modello non valido', err); }
  };
  return html`<div class="row" style="padding:var(--sp-3) 0;border-top:.5px solid var(--sep)">
    <div class="tb-grow"><div style="font-size:var(--fs-base);font-weight:600;white-space:normal">${t.label}</div>
      <div class=${'lock'} style=${has ? 'color:var(--ok)' : 'color:var(--danger)'}>${has === null ? '' : has ? 'Caricato su questo dispositivo' : 'Da caricare'}</div></div>
    <button class="btn sm" onClick=${() => inp.current.click()}>${has ? 'Sostituisci' : 'Carica'}</button>
    <input ref=${inp} type="file" accept=${t.docx ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : t.xlsx ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'} hidden onChange=${pick} /></div>`;
}

/* Impostazioni: un elenco a gruppi (come le Impostazioni di iPhone) e una pagina per voce.
   Telefono: ogni voce apre la sua pagina (route p), il tasto indietro torna all'elenco.
   Tablet in orizzontale e PC: elenco a sinistra e pagina a destra. */
const SET_PAGES = {
  tecnico: { l: 'Tecnico', ic: 'sign' },
  aspetto: { l: 'Aspetto e avvio', ic: 'sun' },
  foto: { l: 'Foto', ic: 'camera' },
  novita: { l: 'Novità', ic: 'spark' },
  config: { l: 'File di configurazione', ic: 'file' },
  onedrive: { l: 'OneDrive', ic: 'share' },
  modelli: { l: 'Modelli', ic: 'paper' },
  dispositivo: { l: 'Dati su questo dispositivo', ic: 'archive' },
  campioni: { l: 'Scheda campioni', ic: 'pin', c: 'var(--t-map)' },
  hse: { l: 'Sopralluoghi HSE', sub: 'Valori proposti', t: 'Sopralluoghi HSE · valori proposti', ic: 'helmet', c: 'var(--t-hse)' },
  programmazione: { l: 'Programmazione', sub: 'Durate tipiche', t: 'Programmazione · durate tipiche', ic: 'today', c: 'var(--t-app)' },
  firme: { l: 'Fogli firme', ic: 'pen', c: 'var(--t-firme)' },
  aria: { l: 'Monitoraggio aria', ic: 'air', c: 'var(--t-aria)' },
  radon: { l: 'Radon', ic: 'radon', c: 'var(--t-radon)' },
  guida: { l: 'Guida', ic: 'note' },
  assistenza: { l: 'Assistenza', ic: 'bell' },
  info: { l: 'Info app', ic: 'gear' },
};
const SET_GROUPS = [
  { h: 'Generali', items: ['aspetto', 'foto', 'novita'] },
  { h: 'Dati e OneDrive', items: ['config', 'onedrive', 'modelli', 'dispositivo'] },
  { h: 'Attività', items: ['campioni', 'hse', 'programmazione', 'firme', 'aria', 'radon'] },
  { h: 'Supporto', items: ['guida', 'assistenza', 'info'] },
];

function Settings({ settings, setSettings, onTemplates, go, page, wide, unreadErr = 0 }) {
  const [sig, setSig] = useState(false);
  const [cfgR, setCfgR] = useState(null); // configurazione da OneDrive da ripristinare
  const [k, setK] = useState(0);
  const [cacheVer, setCacheVer] = useState(null);
  const [look, setLookSt] = useState(getLook());
  const [sel, setSel] = useState(page || 'aspetto');
  useEffect(() => { if (window.caches) caches.keys().then(ks => setCacheVer(ks[0] || '—')); }, []);
  const cfgInp = useRef();
  const s = settings; const set = patch => setSettings({ ...s, ...patch });
  const pickLook = patch => setLookSt(setLook(patch));
  const loadCfg = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (!/\.json$/i.test(f.name || '')) { toast('Seleziona un file .json (hai scelto "' + (f.name || 'file senza nome') + '")'); return; }
    if (!confirm('Caricare la configurazione? Sostituisce le impostazioni e i modelli presenti (la firma salvata resta).')) return;
    try {
      const res = await importConfig(f, s);
      setSettings(res.settings); setK(x => x + 1); onTemplates && onTemplates();
      toast(`Configurazione caricata${res.nTpl ? ' con ' + res.nTpl + ' modelli' : ''}`);
    } catch (err) { fail('Configurazione non caricata', err); }
  };
  const cercaCfg = async () => {
    if (!navigator.onLine) { toast('Sei offline: riprova quando c\'è rete'); return; }
    try { const c = await cfgDaOneDrive(); if (c) setCfgR(c); else toast('Su OneDrive non c’è ancora una configurazione'); }
    catch (e) { fail('Configurazione non letta da OneDrive', e); }
  };
  const nome = [s.tecnicoNome, s.tecnicoCognome].filter(Boolean).join(' ');
  // valore mostrato a destra della voce, quando aiuta a capire senza aprirla
  const val = id => id === 'aspetto' ? `${STYLES[look.style].l} · ${MODES[look.mode].l}`
    : id === 'radon' ? `${s.livelloRif || 300} Bq/m³` : id === 'info' ? APP_VERSION.replace('nembo-', '') : '';
  const open = id => { if (wide) setSel(id); else go({ v: 'settings', p: id }); };
  const cur = wide ? sel : page;

  const segLook = (map, key, label) => html`<div class="seg tall theme-seg mt-2" role="radiogroup" aria-label=${label}>${Object.entries(map).map(([t, x]) => html`<button role="radio" aria-checked=${look[key] === t} class=${look[key] === t ? 'on' : ''} onClick=${() => pickLook({ [key]: t })}><${Icon} n=${x.ic} s=${22} /><small>${x.l}</small></button>`)}</div>`;

  const body = id => {
    switch (id) {
      case 'tecnico': return html`<div class="card"><div class="grid2">
      <${Inp} label="Nome" value=${s.tecnicoNome} set=${v => set({ tecnicoNome: v })} />
      <${Inp} label="Cognome" value=${s.tecnicoCognome} set=${v => set({ tecnicoCognome: v })} />
    </div>
    <div class="fld mt-3"><span>Firma salvata (per i moduli radon)</span></div>
    <button class=${'sigbox' + (s.firmaTecnico ? ' has' : '')} onClick=${() => setSig(true)}>${s.firmaTecnico ? html`<img src=${s.firmaTecnico} alt="Firma salvata" />` : 'Tocca per salvare la tua firma'}</button>
    <div style="display:flex;margin-top:var(--sp-2);gap:var(--sp-2);flex-wrap:wrap"><${SigImageButton} onDone=${url => set({ firmaTecnico: url })} />
      ${s.firmaTecnico && html`<button class="btn sm" onClick=${() => set({ firmaTecnico: '' })}>Rimuovi firma salvata</button>`}</div>
    <p class="lead" style="margin:var(--sp-2) var(--sp-1) 0;font-size:var(--fs-sm)">Puoi disegnarla o caricare una foto della tua firma su un foglio bianco: lo sfondo viene tolto da solo.</p>
    </div>`;
      case 'aspetto': return html`<div class="card">
      <div class="fld"><span>Stile</span></div>
      ${segLook(STYLES, 'style', 'Stile')}
      <div class="fld mt-4"><span>Aspetto</span></div>
      ${segLook(MODES, 'mode', 'Aspetto')}
      <p class="lead" style="margin:var(--sp-2) var(--sp-1) 0;font-size:var(--fs-sm)">Automatico segue il tema chiaro o scuro del dispositivo. Stile e aspetto valgono solo su questo dispositivo.</p>
      <div class="fld mt-4"><span>Business unit mostrata in Oggi</span></div>
      <div class="seg mt-2">${BUS.map(([k2, l]) => html`<button class=${(s.buDefault || 'ambiente') === k2 ? 'on' : ''} onClick=${() => set({ buDefault: k2 })}>${l}</button>`)}</div>
    </div>`;
      case 'foto': return html`<${CamSerieCard} />`;
      case 'novita': return html`<${NovitaCard} go=${go} />`;
      case 'config': return html`<div class="card tight">
      <p class="lead" style="margin:var(--sp-2) 0 var(--sp-3)">Un unico file .json con impostazioni e modelli PDF, da tenere su OneDrive o inviare a un collega. Non pubblicarlo mai sul sito.</p>
      <div class="row">
        <button class="btn grow" onClick=${() => cfgInp.current.click()}>Carica .json</button>
        <button class="btn grow" onClick=${() => exportConfig(s)}>Esporta .json</button>
      </div>
      <input ref=${cfgInp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${loadCfg} />
    </div>
    <${CfgOdCard} settings=${s} set=${set} onRestore=${cercaCfg} />`;
      case 'onedrive': return html`<${OneDriveSettings} settings=${s} set=${set} />
    <${SyncCard} settings=${s} set=${set} />`;
      case 'modelli': return html`<div class="card tight"><p class="lead" style="margin:var(--sp-1) 0 var(--sp-2)">I moduli aziendali (PDF per l'Ambiente, Word per l'HSE) non sono nell'app pubblicata: caricali qui dal telefono o da OneDrive. Restano solo su questo dispositivo e finiscono nel file di configurazione e nel backup.</p>
      ${Object.entries(TEMPLATES).map(([name, t]) => html`<${TemplateRow} key=${name} name=${name} t=${t} onChange=${onTemplates} />`)}</div>`;
      case 'dispositivo': return html`<${ArchiviaCard} />
        <${WipeCard} />`;
      case 'campioni': return html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Prelevato da" value=${s.prelevatoDa} set=${v => set({ prelevatoDa: v })} placeholder="es. Tec. Amb. Nome Cognome" />
      <${Inp} cls="full" label="Verificato da" value=${s.verificatoDa} set=${v => set({ verificatoDa: v })} />
      <${Inp} cls="full" label="Email per i referti" value=${s.emailReferti} set=${v => set({ emailReferti: v })} />
      <${Inp} cls="full" label="Laboratorio" value=${s.labNome} set=${v => set({ labNome: v })} />
      <${Inp} cls="full" label="Indirizzo laboratorio" value=${s.labR1} set=${v => set({ labR1: v })} />
      <${Inp} cls="full" label="CAP e città laboratorio" value=${s.labR2} set=${v => set({ labR2: v })} />
      <${Inp} label="Offerta" value=${s.offerta} set=${v => set({ offerta: v })} placeholder="Offerta n. …" />
      <${Inp} label="Revisione offerta" value=${s.offertaRev} set=${v => set({ offertaRev: v })} placeholder="Rev.0 del …" />
      <${Inp} label="Codice analisi MCA" value=${s.mcaCodice} set=${v => set({ mcaCodice: v })} />
      <${Inp} label="Descrizione analisi MCA" value=${s.mcaDesc} set=${v => set({ mcaDesc: v })} />
      <${Inp} label="Codice analisi FAV" value=${s.favCodice} set=${v => set({ favCodice: v })} />
      <${Inp} label="Descrizione analisi FAV" value=${s.favDesc} set=${v => set({ favDesc: v })} />
    </div></div>`;
      case 'hse': return html`<div class="card"><p class="lead lead-gap">Compilano i nuovi report HSE; restano nel tuo file di configurazione, mai nel codice dell'app.</p><div class="grid2">
      <${Inp} label="Committente (Esteso)" value=${s.hsCommEsteso} set=${v => set({ hsCommEsteso: v })} />
      <${Inp} label="Committente (Sintetico)" value=${s.hsCommSint} set=${v => set({ hsCommSint: v })} />
      <${Inp} label="Verificato da" value=${s.hsVerificato} set=${v => set({ hsVerificato: v })} />
      <${Inp} label="Approvato da (Sintetico)" value=${s.hsApprovato} set=${v => set({ hsApprovato: v })} />
      <${Inp} cls="full" label="Firma procuratore (Sintetico)" value=${s.hsFirma} set=${v => set({ hsFirma: v })} />
      <${Inp} label="Developer (Sintetico)" value=${s.hsDeveloper} set=${v => set({ hsDeveloper: v })} />
      <${Inp} label="Property Manager (Sintetico)" value=${s.hsPropertyManager} set=${v => set({ hsPropertyManager: v })} />
      <${Inp} label="Procuratore HSE (Sintetico)" value=${s.hsProcuratore} set=${v => set({ hsProcuratore: v })} />
      <${Inp} label="Tecnici incaricati (Sintetico)" value=${s.hsTecnici} set=${v => set({ hsTecnici: v })} />
    </div></div>`;
      case 'programmazione': return html`<div class="card"><p class="lead lead-gap">Durata proposta per ogni nuova attività; nella singola attività si cambia quando serve.</p><div class="grid2">
      ${Object.keys(DURATE_BASE).map(k => html`<label class="fld" key=${k}><span>${TIPI_AG[k].l}</span>
        <select value=${String(durataBase(k, s))} onChange=${e => set({ durate: { ...(s.durate || {}), [k]: +e.target.value } })}>
          ${DUR_OPT.map(m => html`<option value=${m}>${fmtDur(m)}</option>`)}</select></label>`)}
    </div></div>`;
      case 'firme': return html`<${FirmeSettings} s=${s} set=${set} />`;
      case 'aria': return html`<${AriaSettings} s=${s} set=${set} />`;
      case 'radon': return html`<div class="card"><${Inp} label="Livello di riferimento (Bq/m³)" type="number" inputmode="numeric" value=${s.livelloRif} set=${v => set({ livelloRif: num(v) || 300 })} /></div>`;
      case 'guida': return html`<${GuidaCard} settings=${s} setSettings=${setSettings} />`;
      case 'assistenza': return html`<div class="card"><${Inp} label="Email per le segnalazioni" type="email" value=${s.supportEmail || ''} set=${v => set({ supportEmail: v.trim() })} /></div>
    <${IssueCard} settings=${s} />`;
      case 'info': return html`<div class="card tight" style="font-size:var(--fs-base);color:var(--text2)">
      <div style="display:flex;justify-content:space-between;padding:9px var(--sp-1)"><span>Versione app</span><b class="mono" style="color:var(--text)">${APP_VERSION}</b></div>
      <div style="display:flex;justify-content:space-between;padding:9px var(--sp-1);border-top:.5px solid var(--sep)">
        <span>Cache offline attiva</span>
        <b style="color:${cacheVer && cacheVer !== APP_VERSION ? 'var(--warn)' : 'var(--text)'}">${cacheVer || '…'}</b>
      </div>
      ${cacheVer && cacheVer !== APP_VERSION && html`<p style="margin:var(--sp-2) var(--sp-1) var(--sp-1);color:var(--warn)">Diverse dalla versione app: l'aggiornamento è a metà, chiudi e riapri l'app (o svuota la cache del sito) per completarlo.</p>`}
    </div>`;
    }
    return null;
  };

  const row = id => { const x = SET_PAGES[id]; const v = val(id);
    return html`<button class=${'set-row' + (wide && cur === id ? ' on' : '')} key=${id} aria-current=${wide && cur === id ? 'page' : null} onClick=${() => open(id)}>
      <span class=${'set-ic' + (x.c ? ' tint' : '')} style=${x.c ? '--c:' + x.c : null}><${Icon} n=${x.ic} s=${19} /></span>
      <span class="set-t"><b>${x.l}</b>${x.sub && html`<small>${x.sub}</small>`}</span>
      ${v && html`<span class="set-v">${v}</span>`}<${Icon} n="right" s=${18} /></button>`; };

  const list = html`<div class="set-list">
    <button class=${'set-prof' + (wide && cur === 'tecnico' ? ' on' : '')} aria-current=${wide && cur === 'tecnico' ? 'page' : null} onClick=${() => open('tecnico')}>
      <span class="ava">${(((s.tecnicoNome || '')[0] || '') + ((s.tecnicoCognome || '')[0] || '')).toUpperCase() || html`<${Icon} n="gear" s=${20} />`}</span>
      <span class="set-t"><b>${nome || 'Tecnico'}</b><small>${s.firmaTecnico ? 'Firma salvata' : 'Nome, cognome e firma'}</small></span><${Icon} n="right" s=${18} /></button>
    <div class="set-group mt-3"><button class="set-row" onClick=${() => go({ v: 'notifiche' })}>
      <span class="set-ic"><${Icon} n="bell" s=${19} /></span><span class="set-t"><b>Notifiche</b><small>Esiti, promemoria ed errori</small></span>
      ${unreadErr > 0 && html`<span class="count crit">${unreadErr}</span>`}<${Icon} n="right" s=${18} /></button></div>
    ${SET_GROUPS.map(g => html`<div class="sec-h" key=${g.h}><h3>${g.h}</h3></div><div class="set-group">${g.items.map(row)}</div>`)}
    <p class="lead" style="margin:var(--sp-4) var(--sp-1)">Le impostazioni si salvano da sole e restano su questo telefono.</p>
  </div>`;

  const pageView = id => { const x = SET_PAGES[id]; if (!x) return null;
    return html`<div class="set-page">
      ${wide ? html`<div class="set-ph">${x.t || x.l}</div>` : html`<${LargeTitle} title=${x.t || x.l} />`}
      ${body(id)}</div>`; };

  return html`<div class="content form" key=${k + (wide ? '' : '-' + (page || ''))}>
    ${!(page && !wide) && html`<${LargeTitle} top title="Impostazioni" />`}
    ${wide ? html`<div class="set-wide">${list}${pageView(cur)}</div>` : page ? pageView(page) : list}
    ${cfgR && html`<${CfgRestoreSheet} cfg=${cfgR} settings=${s} setSettings=${x => { setSettings(x); setK(n => n + 1); }} onTemplates=${onTemplates} onClose=${() => setCfgR(null)} />`}
    ${sig && html`<${SignaturePadOverlay} title="La tua firma" allowImage=${true} onClose=${() => setSig(false)} onDone=${url => set({ firmaTecnico: url })} />`}
  </div>`;
}

/* ---------------- segnala un problema ---------------- */
function IssueCard({ settings }) {
  return html`<div class="card tight" style="margin:var(--sp-1) 0 var(--sp-4)">
    <div style="font-weight:700">Qualcosa non funziona?</div>
    <p class="lead lead-gap">Prepara un'email con versione dell'app, dispositivo e ultimi errori: tu aggiungi cosa stavi facendo.</p>
    <div class="row"><button class="btn grow" onClick=${() => reportIssue(settings)}><${Icon} n="bell" s=${17} /> Segnala un problema</button>
      <button class="btn" onClick=${copyIssue}>Copia</button></div>
  </div>`;
}

/* ---------------- rimuovi i dati da questo dispositivo ---------------- */
async function wipeStatus() {
  const recs = ((await DB.all()) || []).filter(r => !r._new);
  const st = (await DB.get('sync_state')) || {};
  const del = Object.keys((await DB.get('sync_del')) || {}).length;
  const syncOn = Sync.enabled();
  const pending = syncOn ? recs.filter(r => !st[r.id] || (r.updatedAt || 0) > (st[r.id].v || 0)) : recs;
  return { total: recs.length, pending, del, syncOn };
}
async function wipeDevice() {
  if (Sync.enabled()) { toast('Controllo la sincronizzazione…'); try { await Sync.run(); } catch (e) {} }
  const w = await wipeStatus();
  const what = 'attività, foto, configurazione, modelli, firma salvata e accesso a Microsoft';
  if (!w.pending.length && !w.del) {
    if (!confirm(`Tutte le ${w.total} attività sono su OneDrive.\n\nDa questo dispositivo verranno rimossi: ${what}.\nSu OneDrive resta tutto: accedendo di nuovo le attività tornano.\n\nContinuare?`)) return;
  } else {
    const nomi = w.pending.slice(0, 5).map(r => '· ' + recordLabel(r)).join('\n') + (w.pending.length > 5 ? `\n· e altre ${w.pending.length - 5}` : '');
    const motivo = w.syncOn ? `${w.pending.length} attività non sono ancora su OneDrive${w.del ? ' e alcune eliminazioni non sono state inviate' : ''}` : `la sincronizzazione con OneDrive non è attiva: le ${w.total} attività sono solo qui`;
    const ans = prompt(`ATTENZIONE: ${motivo}.\n${nomi}\n\nSe continui andranno perse. Prima collega OneDrive o fai un backup ZIP.\n\nPer rimuovere comunque ${what}, scrivi ELIMINA.`);
    if ((ans || '').trim().toUpperCase() !== 'ELIMINA') { toast('Nessun dato rimosso'); return; }
  }
  try {
    await DB.wipe();
    const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i));
    ks.filter(k => /^nembo_|^msal\.|login\.microsoftonline|^[0-9a-f-]{36}\./i.test(k)).forEach(k => localStorage.removeItem(k));
    try { sessionStorage.clear(); } catch (e) {}
    location.hash = ''; location.reload();
  } catch (e) { fail('Dati non rimossi', e); }
}
/* ---------------- attività vecchie: togli da questo dispositivo (DAT-01) ----------------
   Solo attività concluse, già sincronizzate su OneDrive senza modifiche successive e non toccate da N mesi.
   Si tolgono dati e file dal dispositivo (non è un'eliminazione: su OneDrive restano). L'elenco «archiviate» dice alla
   sincronizzazione di non riscaricarle; «Riporta sul dispositivo» lo svuota e le attività tornano al giro successivo. */
const ARCH_MESI = [[6, '6 mesi'], [12, '1 anno'], [24, '2 anni']];
async function archiviabili(records, mesi, od) {
  if (!Sync.enabled()) return [];
  const st = (await DB.get('sync_state')) || {}, lim = Date.now() - mesi * 30.44 * 86400000;
  return records.filter(r => !r._new && r.type !== 'cli' && r.type !== 'app' && !attAperta(r, od) && (r.updatedAt || 0) < lim
    && st[r.id] && !st[r.id].deleted && (r.updatedAt || 0) <= (st[r.id].v || 0));
}
function ArchiviaCard() {
  const od = useOdSynced();
  const [records, setRecs] = useState([]);
  useEffect(() => { DB.all().then(setRecs); }, []);
  const [mesi, setMesi] = useState(12);
  const [L, setL] = useState(null); const [mb, setMb] = useState(0); const [arch, setArch] = useState({}); const [busy, setBusy] = useState(false);
  const on = Sync.enabled();
  useEffect(() => { DB.get('archiviate').then(a => setArch(a || {})); }, []);
  useEffect(() => { let ok = true; archiviabili(records, mesi, od).then(async l => {
    let tot = 0; for (const r of l) for (const id of new Set(blobIds(r))) { const b = await DB.getBlob(id); if (b && b.blob) tot += b.blob.size; }
    if (ok) { setL(l); setMb(tot / 1048576); } }); return () => { ok = false; }; }, [records, mesi, od]);
  const togli = async () => {
    if (!L || !L.length || !confirm(`Togliere ${L.length} ${L.length === 1 ? 'attività' : 'attività'} da questo dispositivo? Restano su OneDrive e tornano con «Riporta sul dispositivo».`)) return;
    setBusy(true);
    const a = { ...((await DB.get('archiviate')) || {}) };
    for (const r of L) { for (const id of new Set(blobIds(r))) await removeBlob(id); await DB.del(r.id); a[r.id] = { il: Date.now(), codice: r.codice || '' }; }
    await DB.set('archiviate', a); setArch(a); setBusy(false);
    toast(`${L.length} ${L.length === 1 ? 'attività tolta' : 'attività tolte'} da questo dispositivo`);
    location.reload();
  };
  const riporta = async () => {
    const st = (await DB.get('sync_state')) || {};
    for (const id of Object.keys(arch)) delete st[id];
    await DB.set('sync_state', st); await DB.set('archiviate', {}); setArch({});
    toast('Le attività tornano con la prossima sincronizzazione'); Sync.schedule(500);
  };
  const nA = Object.keys(arch).length;
  return html`<div class="card tight">
    <p class="lead lead-gap">Le attività concluse e già sincronizzate su OneDrive si possono togliere da questo dispositivo per liberare spazio: restano su OneDrive e tornano quando vuoi.</p>
    ${!on ? html`<p class="lead lead-gap">Serve la sincronizzazione con OneDrive attiva: senza, le attività sarebbero solo nei backup.</p>` : html`
      <div class="fld"><span>Non modificate da</span></div>
      <div class="seg mt-1" role="radiogroup" aria-label="Non modificate da">${ARCH_MESI.map(([m, l]) => html`<button role="radio" aria-checked=${mesi === m} class=${mesi === m ? 'on' : ''} onClick=${() => setMesi(m)}>${l}</button>`)}</div>
      <p class="lock mt-2">${L == null ? '' : L.length ? `${L.length} ${L.length === 1 ? 'attività' : 'attività'} · ${mb.toFixed(1).replace('.', ',')} MB` : 'Nessuna attività da togliere'}</p>
      <button class="btn block mt-2" disabled=${busy || !L || !L.length} onClick=${togli}><${Icon} n="archive" s=${17} /> ${L && L.length ? `Togli ${L.length} ${L.length === 1 ? 'attività' : 'attività'} da questo dispositivo` : 'Togli da questo dispositivo'}</button>`}
    ${nA > 0 && html`<button class="btn block mt-2" onClick=${riporta}>Riporta sul dispositivo (${nA})</button>`}
  </div>`;
}
function WipeCard() {
  const [w, setW] = useState(null);
  useEffect(() => { wipeStatus().then(setW); }, []);
  return html`<div class="card tight">
    <p class="lead" style="margin:var(--sp-2) 0 var(--sp-3)">Per cambiare dispositivo, restituirlo o prima della migrazione dell'account Microsoft: toglie da qui attività, foto, configurazione, modelli, firma e accesso a Microsoft. Quello che è su OneDrive resta.</p>
    ${w && html`<p style=${'margin:0 2px 10px;font-size:var(--fs-md);font-weight:600;color:' + (w.pending.length || w.del ? 'var(--danger)' : 'var(--ok)')}>
      ${!w.total ? 'Nessuna attività su questo dispositivo.' : w.pending.length || w.del ? (w.syncOn ? `${w.pending.length} attività su ${w.total} non ancora su OneDrive.` : `Sincronizzazione non attiva: le ${w.total} attività sono solo qui.`) : `Tutte le ${w.total} attività sono su OneDrive.`}</p>`}
    <button class="btn danger block" onClick=${wipeDevice}><${Icon} n="trash" s=${17} /> Rimuovi i dati da questo dispositivo</button>
  </div>`;
}

/* ---------------- notifiche ---------------- */
function Notifiche({ settings, records = [], openRec }) {
  const list = useNotifiche();
  const [open, setOpen] = useState({});
  const [f, setF] = useState('tutte');
  useEffect(() => { const t = setTimeout(notifMarkRead, 400); return () => clearTimeout(t); }, [list.length]);
  const shown = list.filter(n => f === 'tutte' || (f === 'err' ? n.level === 'err' : n.level !== 'err'));
  const nErr = list.filter(n => n.level === 'err').length;
  const COL = { ok: 'var(--ok)', warn: 'var(--warn)', err: 'var(--danger)', info: 'var(--blue)', new: 'var(--blue)' };
  const LBL = { ok: 'Completato', warn: 'Interrotto', err: 'Errore', info: 'Promemoria', new: 'Novità' };
  const copy = async n => {
    const txt = [new Date(n.t).toLocaleString('it-IT'), n.title, n.record && 'Attività: ' + n.record, n.code && 'Codice: ' + n.code, n.detail, ...(n.items || [])].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('Dettagli copiati'); } catch (e) { toast('Copia non riuscita'); }
  };
  return html`<div class="content">
    <${LargeTitle} top title="Notifiche" />
    <p class="lead">Esiti dei caricamenti su OneDrive, promemoria ed errori dell'app, con il relativo codice. Restano su questo dispositivo (ultime ${NOTIF_MAX}).</p>
    <${IssueCard} settings=${settings} />
    ${list.length > 0 && html`<div class="row" style="margin:var(--sp-2) 0 var(--sp-3)">
      <div class="seg grow">
        <button class=${f === 'tutte' ? 'on' : ''} onClick=${() => setF('tutte')}>Tutte · ${list.length}</button>
        <button class=${f === 'err' ? 'on' : ''} onClick=${() => setF('err')}>Errori · ${nErr}</button>
        <button class=${f === 'ok' ? 'on' : ''} onClick=${() => setF('ok')}>Esiti · ${list.length - nErr}</button>
      </div></div>`}
    ${!shown.length && html`<div class="empty"><b>Nessuna notifica</b>${list.length ? 'Niente in questa categoria.' : 'Qui compariranno gli esiti dei caricamenti e gli eventuali errori.'}</div>`}
    <div>${shown.map(n => html`<div class="card tight st-bar" key=${n.id} style=${'--st:' + COL[n.level] + ';padding:12px 14px 12px 18px'}>
      <div style="display:flex;justify-content:space-between;gap:var(--sp-3);align-items:baseline">
        <b style=${'font-size:var(--fs-sm);font-weight:600;color:' + COL[n.level]}>${LBL[n.level]}</b>
        <span style="font-size:var(--fs-xs);color:var(--muted)">${new Date(n.t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
      <div style="font-weight:700;margin-top:var(--sp-1)">${n.title}</div>
      ${n.record && html`<div style="font-size:var(--fs-sm);color:var(--text2);margin-top:var(--sp-1)">${n.record}</div>`}
      ${(() => { const rs = (n.ids || []).map(id => records.find(r => r.id === id)).filter(Boolean); if (!rs.length || n.level === 'ok') return null;
        return html`<div class="ntf-act">
          ${html`<button class="btn sm pri" onClick=${() => odSync(rs, settings)}><${Icon} n="share" s=${15} /> Ricarica${rs.length > 1 ? ' tutte' : ''}</button>`}
          ${rs.map(r => html`<button class="btn sm" key=${r.id} onClick=${() => openRec(r)}>Apri ${rs.length > 1 ? r.codice || recordTitle(r) : 'attività'}</button>`)}</div>`; })()}
      ${n.detail && html`<div style="font-size:var(--fs-sm);margin-top:var(--sp-2);word-break:break-word">${n.detail}</div>`}
      ${n.code && html`<div class="mt-2"><span class="mono" style="font-size:var(--fs-sm);background:var(--fill-soft);border-radius:var(--r-xs);padding:var(--sp-1) var(--sp-2)">Codice: ${n.code}</span></div>`}
      ${(n.items || []).length > 0 && html`<button class="btn sm mt-2" onClick=${() => setOpen(o => ({ ...o, [n.id]: !o[n.id] }))}>${open[n.id] ? 'Nascondi' : 'Mostra'} dettaglio file (${n.items.length})</button>
        ${open[n.id] && html`<div class="mono" style="margin-top:var(--sp-2);font-size:var(--fs-sm);font-weight:500;background:var(--fill-soft);border-radius:var(--r-sm);padding:var(--sp-2);max-height:260px;overflow:auto;word-break:break-word">${n.items.map(x => html`<div style="padding:var(--sp-1) 0;border-bottom:1px dashed var(--sep)">${x}</div>`)}</div>`}`}
      ${(n.level === 'err' || n.level === 'warn') && html`<div class="mt-2"><button class="btn sm" onClick=${() => copy(n)}>Copia dettagli</button></div>`}
    </div>`)}</div>
    ${list.length > 0 && html`<button class="btn danger block mt-4" onClick=${() => { if (confirm('Cancellare tutte le notifiche?')) notifClear(); }}><${Icon} n="trash" s=${17} /> Svuota notifiche</button>`}
  </div>`;
}
