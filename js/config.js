/* File di configurazione: esportazione, import e copia su OneDrive (con la firma cifrata dal PIN). */

/* ---------------- file di configurazione ---------------- */
// opzioni: utente = codice utente (solo nel file esportato, mai su OneDrive); firma = firma cifrata con il PIN (solo su OneDrive)
async function cfgDati(settings, o = {}) {
  const { firmaTecnico, ...rest } = settings; // la firma in chiaro non esce mai dal dispositivo
  const cfg = { app: 'nembo', type: 'config', version: 1, createdAt: new Date().toISOString(), settings: rest, templates: {} };
  // codice utente: riconosce come tuoi i backup degli altri tuoi dispositivi; legato a nome e cognome del tecnico
  if (o.utente) { const u = await chiaveUtente(true); cfg.utente = { per: u.per, k: u.k }; }
  if (o.firma) { const f = await firmaCifra(firmaTecnico); if (f) cfg.firma = f; }
  for (const t of Object.values(TEMPLATES)) { const b = await DB.get(t.key); if (b) cfg.templates[t.key] = bufToB64(b); }
  return cfg;
}
async function exportConfig(settings) {
  const name = `Nembo_config_${slug(settings.tecnicoCognome || 'modello')}.json`;
  // finestra "Salva con nome" subito dopo il tocco: si può scegliere OneDrive
  let handle = null;
  if ('showSaveFilePicker' in window) {
    try { handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Configurazione JSON', accept: { 'application/json': ['.json'] } }] }); }
    catch (e) { if (e.name === 'AbortError') return; handle = null; }
  }
  const cfg = await cfgDati(settings, { utente: true });
  const blob = new Blob([JSON.stringify(cfg, null, 1)], { type: 'application/json' });
  if (handle) {
    if (!/\.json$/i.test(handle.name)) toast('Attenzione: il file salvato non ha estensione .json');
    const w = await handle.createWritable(); await w.write(blob); await w.close();
    toast('Configurazione salvata: ' + handle.name);
  } else { downloadBlob(blob, name); toast('Configurazione salvata in Download'); }
}
// carica una configurazione (file o OneDrive). firma: 'ok' ripristinata · 'pin' PIN errato · 'senza' PIN non inserito · '' nessuna firma nel file
async function applicaConfig(cfg, current, pin) {
  if (!isObj(cfg) || cfg.app !== 'nembo' || cfg.type !== 'config') throw new Error('il file non è una configurazione di questa app');
  const tpl = {};
  for (const [name, t] of Object.entries(TEMPLATES)) {
    if (!cfg.templates || typeof cfg.templates[t.key] !== 'string') continue;
    const buf = b64ToBuf(cfg.templates[t.key]); await checkTemplate(name, buf); tpl[t.key] = buf;
  }
  for (const [k, b] of Object.entries(tpl)) await DB.set(k, b);
  const { firmaTecnico, ...incoming } = pulisciImpostazioni(cfg.settings) || {}; // la firma in chiaro non arriva mai da un file
  let firma = current.firmaTecnico || '', esito = '';
  if (cfg.firma) {
    if (!pin) esito = 'senza';
    else try { firma = await firmaDecifra(cfg.firma, pin); esito = 'ok'; } catch (e) { esito = 'pin'; }
  }
  const settings = { ...current, ...incoming, firmaTecnico: firma };
  await chiaveUtenteDaConfig(cfg.utente, settings);
  return { settings, nTpl: Object.keys(tpl).length, firma: esito };
}
async function importConfig(file, current) {
  if (!/\.json$/i.test(file.name || '')) throw new Error('seleziona un file .json (hai scelto "' + (file.name || 'file senza nome') + '")');
  let cfg;
  try { cfg = JSON.parse(await file.text()); } catch (e) { throw new Error('il file non è una configurazione valida'); }
  return applicaConfig(cfg, current);
}
/* ---------------- configurazione su OneDrive (dalla v50) ----------------
   _nembo/config/configurazione.json: impostazioni, modelli e firma cifrata con il PIN, sostituito poco dopo ogni modifica;
   _nembo/config/configurazione_AAAA-MM.json: il primo salvataggio di ogni mese, per tornare indietro dopo un errore.
   Un dispositivo salva solo se è «collegato» (stato cfg_od.ok): dopo aver ripristinato la configurazione da OneDrive,
   oppure se su OneDrive non ce n'era ancora una. Così un dispositivo nuovo non sovrascrive quella buona. */
const CFG_DIR = '_nembo/config/', CFG_PATH = CFG_DIR + 'configurazione.json';
const cfgSubs = new Set();
let cfgTimer = null;
const cfgOdStato = async () => (await DB.get('cfg_od')) || {}; // { ok, last, mese, err, nonOra, firmaRemota }
async function cfgOdSet(p) { const s = { ...(await cfgOdStato()), ...p }; await DB.set('cfg_od', s); cfgSubs.forEach(f => f(s)); return s; }
function useCfgOd() {
  const [s, setS] = useState({});
  useEffect(() => { cfgOdStato().then(setS); cfgSubs.add(setS); return () => cfgSubs.delete(setS); }, []);
  return s;
}
async function cfgDaOneDrive() {
  const b = await OD.getRaw(CFG_PATH); if (!b) return null;
  try { const c = JSON.parse(await b.text()); return isObj(c) && c.app === 'nembo' && c.type === 'config' ? c : null; } catch (e) { return null; }
}
async function cfgSuOneDrive() {
  const s = _settings;
  if (!OD.account || !navigator.onLine || s.cfgOd === false) return false;
  const st = await cfgOdStato();
  if (!st.ok) {
    if (await cfgDaOneDrive()) return false; // c'è già una configurazione: prima va ripristinata
    await cfgOdSet({ ok: true });
  }
  const cfg = await cfgDati(s, { firma: true });
  // firma non cifrabile da qui (PIN non inserito al ripristino): resta quella già su OneDrive
  if (!cfg.firma && st.firmaRemota) cfg.firma = st.firmaRemota;
  cfg.savedAt = Date.now();
  const blob = new Blob([JSON.stringify(cfg)], { type: 'application/json' });
  await OD.putRaw(CFG_PATH, blob, 'application/json');
  const mese = new Date(cfg.savedAt).toISOString().slice(0, 7);
  if (st.mese !== mese) await OD.putRaw(CFG_DIR + 'configurazione_' + mese + '.json', blob, 'application/json');
  await cfgOdSet({ ok: true, last: cfg.savedAt, mese, err: '' });
  return true;
}
function cfgOdSchedule(ms = 5000) {
  clearTimeout(cfgTimer);
  cfgTimer = setTimeout(() => { cfgSuOneDrive().catch(e => { console.warn('configurazione su OneDrive', e); cfgOdSet({ err: e.message }); }); }, ms);
}
const quandoIt = t => new Date(t).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
// ripristino da OneDrive: al primo avvio (avvio = true) o da Impostazioni → File di configurazione
function CfgRestoreSheet({ cfg, settings, setSettings, onTemplates, avvio, onClose }) {
  useBackClose(onClose);
  const [pin, setPin] = useState(''); const [busy, setBusy] = useState(false);
  const quando = cfg.savedAt ? quandoIt(cfg.savedAt) : fmtD(String(cfg.createdAt || '').slice(0, 10));
  const nonOra = () => { if (avvio) cfgOdSet({ nonOra: Date.now() }); onClose(); };
  const go = async () => {
    if (cfg.firma && pin && !pinOk(pin)) { toast('Il PIN ha 6 cifre'); return; }
    setBusy(true);
    try {
      const res = await applicaConfig(cfg, settings, pin);
      await cfgOdSet({ ok: true, nonOra: null, err: '', firmaRemota: res.firma === 'ok' ? null : cfg.firma || null });
      setSettings(res.settings); onTemplates && onTemplates();
      toast(res.firma === 'pin' ? 'PIN non corretto: la firma non è stata ripristinata, il resto sì.'
        : res.firma === 'senza' ? 'Configurazione ripristinata senza la firma'
        : `Configurazione ripristinata${res.nTpl ? ' con ' + res.nTpl + ' modelli' : ''}`);
      onClose();
    } catch (e) { fail('Configurazione non ripristinata', e); }
    setBusy(false);
  };
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && nonOra()}><div class="sheet" role="dialog" aria-label="Configurazione su OneDrive">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${nonOra}>Non ora</button><b>Configurazione</b><span></span></div>
    <div class="sheet-body">
      <p class="lead lead-gap">Su OneDrive c'è la tua configurazione del ${quando}. Ripristinarla? Ritrovi impostazioni, modelli e firma.</p>
      ${cfg.firma && html`<div class="card tight"><label class="fld"><span>Inserisci il PIN della firma.</span>
        <input type="password" inputmode="numeric" autocomplete="off" maxlength="6" value=${pin} onInput=${e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label></div>`}
      <div class="stack mt-4">
        <button class="btn pri block" disabled=${busy} onClick=${go}>${busy ? html`<div class="spin" />` : ''} Ripristina</button>
        <button class="btn block" disabled=${busy} onClick=${nonOra}>Non ora</button>
      </div>
    </div></div></div>`;
}
function PinSheet({ onClose }) {
  useBackClose(onClose);
  const [a, setA] = useState(''), [b, setB] = useState(''), [busy, setBusy] = useState(false);
  const cifre = v => v.replace(/\D/g, '').slice(0, 6);
  const ok = pinOk(a) && a === b;
  const save = async () => {
    if (!ok) { toast(pinOk(a) ? 'I due PIN non coincidono' : 'Il PIN ha 6 cifre'); return; }
    setBusy(true);
    try { await pinImposta(a); await cfgOdSet({ firmaRemota: null }); cfgOdSchedule(1000); toast('PIN salvato'); onClose(); }
    catch (e) { fail('PIN non salvato', e); }
    setBusy(false);
  };
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="PIN della firma">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>PIN della firma</b><span></span></div>
    <div class="sheet-body">
      <p class="lead lead-gap">Scegli un PIN di 6 cifre per proteggere la firma su OneDrive. Ti servirà solo per ripristinarla.</p>
      <div class="card tight"><div class="grid2">
        <label class="fld"><span>PIN</span><input type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" value=${a} onInput=${e => setA(cifre(e.target.value))} /></label>
        <label class="fld"><span>Ripeti il PIN</span><input type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" value=${b} onInput=${e => setB(cifre(e.target.value))} /></label>
      </div></div>
      <button class="btn pri block mt-4" disabled=${busy || !ok} onClick=${save}>Salva il PIN</button>
    </div></div></div>`;
}
// Impostazioni → File di configurazione: salvataggio su OneDrive, PIN e ripristino
function CfgOdCard({ settings, set, onRestore }) {
  const st = useCfgOd();
  const [pinSet, setPinSet] = useState(null), [pinOpen, setPinOpen] = useState(false), [, force] = useState(0);
  useEffect(() => OD.subscribe(() => force(x => x + 1)), []);
  useEffect(() => { pinImpostato().then(setPinSet); }, [pinOpen]);
  if (!OD.configured(settings)) return null;
  const on = settings.cfgOd !== false;
  return html`<div class="card">
    <label class="fg-sw"><span><b class="fw-6">Salva su OneDrive</b><br /><small class="lock">Impostazioni, modelli e firma restano nella cartella dell'app. Su un dispositivo nuovo li ritrovi accedendo con Microsoft.</small></span>
      <${Toggle} on=${on} label="Salva su OneDrive" set=${v => { set({ cfgOd: v }); if (v) cfgOdSchedule(1000); }} /></label>
    ${!OD.account ? html`<p class="lead mt-2 mb-0">Accedi con Microsoft in Impostazioni → OneDrive per attivarlo.</p>` : html`
      ${on && html`<div class="lock mt-2">${st.last ? 'Ultimo salvataggio: ' + quandoIt(st.last) : st.ok ? '' : 'Su OneDrive c’è una configurazione: ripristinala per collegare questo dispositivo.'}</div>`}
      ${st.err && html`<div class="notice err">${st.err}</div>`}
      ${on && settings.firmaTecnico && pinSet === false && html`<p class="lead mt-3 mb-0">Scegli un PIN di 6 cifre per proteggere la firma su OneDrive. Ti servirà solo per ripristinarla.</p>`}
      ${on && settings.firmaTecnico && pinSet !== null && html`<button class="btn block mt-2" onClick=${() => setPinOpen(true)}><${Icon} n="lock" s=${17} /> ${pinSet ? 'Cambia il PIN della firma' : 'Scegli il PIN della firma'}</button>`}
      <button class="btn block mt-2" onClick=${onRestore}><${Icon} n="share" s=${17} /> Ripristina da OneDrive</button>`}
    ${pinOpen && html`<${PinSheet} onClose=${() => setPinOpen(false)} />`}
  </div>`;
}
