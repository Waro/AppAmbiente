/* OneDrive tramite Microsoft Graph.
   Permesso delegato Files.ReadWrite.AppFolder: l'app legge e scrive solo nella propria cartella
   (OneDrive › App › nome registrato in Entra ID per questa app). Non vede il resto del OneDrive e non cancella nulla.
   - cartelle leggibili per attività: "Carica su OneDrive" (foto, PDF, dati.json)
   - cartella _nembo/: copia per la sincronizzazione tra dispositivi (vedi sync.js) */

const OD = (() => {
  const SCOPES = ['User.Read', 'Files.ReadWrite.AppFolder'];
  const ROOT = 'https://graph.microsoft.com/v1.0/me/drive/special/approot';
  const MAX_SIZE = 60 * 1048576;
  let pca = null, account = null, initP = null, cfgKey = '', lastError = null;
  const listeners = new Set();
  const emit = () => listeners.forEach(f => f());

  const isGuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || '');
  const configured = s => !!s && isGuid(s.msClientId) && isGuid(s.msTenantId);
  const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');

  function init(s) {
    if (!configured(s) || !window.msal) return Promise.resolve(null);
    const key = s.msClientId + '|' + s.msTenantId;
    if (initP && cfgKey === key) return initP;
    cfgKey = key; account = null;
    initP = (async () => {
      pca = new msal.PublicClientApplication({
        auth: { clientId: s.msClientId, authority: 'https://login.microsoftonline.com/' + s.msTenantId, redirectUri: redirectUri(), navigateToLoginRequestUrl: false },
        cache: { cacheLocation: 'localStorage' },
      });
      await pca.initialize();
      try {
        const r = await pca.handleRedirectPromise();
        if (r && r.account) account = r.account;
      } catch (e) { lastError = describe(e); }
      if (!account) account = pca.getAllAccounts()[0] || null;
      emit();
      return account;
    })();
    return initP;
  }

  function describe(e) {
    const m = (e && (e.errorMessage || e.message)) || String(e);
    if (/AADSTS65001|consent/i.test(m)) return 'Serve il consenso amministratore per l\'app: chiedi all\'IT di concederlo.';
    if (/AADSTS50011|redirect/i.test(m)) return 'L\'indirizzo dell\'app non corrisponde all\'URI di reindirizzamento registrato.';
    if (/AADSTS50105|assigned/i.test(m)) return 'Il tuo utente non è abilitato a questa app.';
    return m.split('\n')[0].slice(0, 200);
  }

  async function login() { lastError = null; await pca.loginRedirect({ scopes: SCOPES, prompt: 'select_account' }); }
  async function logout() {
    const a = account; account = null; emit();
    try { await pca.logoutRedirect({ account: a, postLogoutRedirectUri: redirectUri() }); } catch (e) { console.warn(e); }
  }
  // silent: per la sincronizzazione automatica, mai una pagina di accesso non richiesta
  async function token(opt = {}) {
    if (!account) throw new Error('non sei collegato a OneDrive (Impostazioni → OneDrive → Accedi)');
    try { return (await pca.acquireTokenSilent({ scopes: SCOPES, account })).accessToken; }
    catch (e) {
      // Oltre a "serve interazione", su Chrome Android il rinnovo silenzioso avviene in un iframe nascosto
      // che spesso va in timeout o viene bloccato: anche in quei casi serve un nuovo accesso.
      const code = (e && (e.errorCode || e.code)) || '';
      const needLogin = (window.msal && e instanceof msal.InteractionRequiredAuthError)
        || /monitor_window_timeout|timed_out|iframe|no_tokens_found|login_required|consent_required|interaction_required/i.test(code + ' ' + (e && e.message));
      if (needLogin && opt.silent) { const err = new Error('accesso a Microsoft da rinnovare'); err.code = 'LOGIN'; throw err; }
      if (needLogin) {
        toast('Sessione Microsoft scaduta: ti riporto alla pagina di accesso, poi ripeti il caricamento');
        await pca.acquireTokenRedirect({ scopes: SCOPES, account });
      }
      const err = new Error(describe(e)); err.code = code || (e && e.name) || '';
      throw err;
    }
  }

  // ---- controlli sui file ----
  async function sniff(blob) {
    const b = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
    return null;
  }
  const EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'application/json': '.json',
    [XLSX_MIME]: '.xlsx', [DOCX_MIME]: '.docx' };
  const OFFICE = new Set([XLSX_MIME, DOCX_MIME]);
  // ogni segmento del percorso: niente separatori, niente "..", niente caratteri vietati da OneDrive
  function cleanSegment(s) {
    let x = String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\\/:*?"<>|#%\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').replace(/^[.\s_]+|[.\s]+$/g, '');
    x = x.replace(/\.{2,}/g, '.').slice(0, 80);
    return x || 'file';
  }
  function buildPath(segments, type) {
    const segs = segments.map(cleanSegment);
    let last = segs.pop().replace(/\.[a-z0-9]{1,5}$/i, '');
    segs.push(last + EXT[type]);
    return segs.map(encodeURIComponent).join('/');
  }

  async function gErr(r) {
    let msg = r.status + ' ' + r.statusText, gcode = '';
    try { const j = await r.json(); if (j.error) { gcode = j.error.code || ''; msg = (j.error.message || msg); } } catch (e) {}
    if (r.status === 401) msg = 'autorizzazione scaduta, accedi di nuovo';
    if (r.status === 403) msg = 'accesso negato alla cartella dell\'app (' + msg + ')';
    const err = new Error(msg); err.code = 'HTTP ' + r.status + (gcode ? ' · ' + gcode : '');
    return err;
  }

  // Unico punto di scrittura: sempre sotto la cartella dell'app
  async function upload(segments, blob, { type, replace }) {
    if (!EXT[type]) throw new Error('tipo di file non ammesso');
    if (OFFICE.has(type)) {
      // i file Office sono archivi ZIP: controllo la firma PK
      const b = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
      if (!(b[0] === 0x50 && b[1] === 0x4B && b[2] === 3 && b[3] === 4)) throw new Error('il contenuto non corrisponde a un file ' + EXT[type]);
    } else if (type !== 'application/json') {
      const real = await sniff(blob);
      if (real !== type) throw new Error('il contenuto non corrisponde a un file ' + EXT[type]);
    }
    if (blob.size > MAX_SIZE) throw new Error('file oltre 60 MB');
    const path = buildPath(segments, type);
    const conflict = replace ? 'replace' : 'rename';
    const t = await token();
    if (blob.size <= 4 * 1048576) {
      const r = await fetch(`${ROOT}:/${path}:/content?@microsoft.graph.conflictBehavior=${conflict}`, {
        method: 'PUT', headers: { Authorization: 'Bearer ' + t, 'Content-Type': type }, body: blob,
      });
      if (!r.ok) throw await gErr(r);
      return { path: decodeURIComponent(path), item: await r.json() };
    }
    const s = await fetch(`${ROOT}:/${path}:/createUploadSession`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': conflict } }),
    });
    if (!s.ok) throw await gErr(s);
    const { uploadUrl } = await s.json();
    if (!/^https:\/\/[a-z0-9.-]+\.(sharepoint\.com|microsoft\.com)\//i.test(uploadUrl)) throw new Error('indirizzo di caricamento inatteso');
    const CH = 10 * 327680; // multiplo di 320 KiB
    for (let o = 0; o < blob.size; o += CH) {
      const end = Math.min(o + CH, blob.size);
      const r = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${o}-${end - 1}/${blob.size}` }, body: blob.slice(o, end) });
      if (!r.ok && r.status !== 202) throw await gErr(r);
      if (end === blob.size) return { path: decodeURIComponent(path), item: await r.json() };
    }
  }

  /* ---- sincronizzazione: solo sotto _nembo/ della cartella dell'app ---- */
  const SYNC = '_nembo/';
  const okSync = p => typeof p === 'string' && p.startsWith(SYNC) && !p.includes('..') && /^[\w\-./]+$/.test(p);
  const enc = p => p.split('/').map(encodeURIComponent).join('/');
  async function putRaw(path, blob, type) {
    if (!okSync(path)) throw new Error('percorso non ammesso');
    if (blob.size > MAX_SIZE) throw new Error('file oltre 60 MB');
    const t = await OD.token({ silent: true });
    if (blob.size <= 4 * 1048576) {
      const r = await fetch(`${ROOT}:/${enc(path)}:/content?@microsoft.graph.conflictBehavior=replace`, {
        method: 'PUT', headers: { Authorization: 'Bearer ' + t, 'Content-Type': type || 'application/octet-stream' }, body: blob });
      if (!r.ok) throw await gErr(r);
      return r.json();
    }
    const s = await fetch(`${ROOT}:/${enc(path)}:/createUploadSession`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }) });
    if (!s.ok) throw await gErr(s);
    const { uploadUrl } = await s.json();
    if (!/^https:\/\/[a-z0-9.-]+\.(sharepoint\.com|microsoft\.com)\//i.test(uploadUrl)) throw new Error('indirizzo di caricamento inatteso');
    const CH = 10 * 327680;
    for (let o = 0; o < blob.size; o += CH) {
      const end = Math.min(o + CH, blob.size);
      const r = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${o}-${end - 1}/${blob.size}` }, body: blob.slice(o, end) });
      if (!r.ok && r.status !== 202) throw await gErr(r);
      if (end === blob.size) return r.json();
    }
  }
  // elenco dei file di una cartella: [{ name, size, lastModifiedDateTime }]; cartella assente = []
  async function list(dir) {
    if (!okSync(dir)) throw new Error('percorso non ammesso');
    const t = await OD.token({ silent: true });
    let url = `${ROOT}:/${enc(dir.replace(/\/$/, ''))}:/children?$select=name,size,lastModifiedDateTime&$top=999`;
    const out = [];
    while (url) {
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } });
      if (r.status === 404) return out;
      if (!r.ok) throw await gErr(r);
      const j = await r.json(); out.push(...(j.value || []));
      url = j['@odata.nextLink'] && j['@odata.nextLink'].startsWith('https://graph.microsoft.com/') ? j['@odata.nextLink'] : null;
    }
    return out;
  }
  // contenuto di un file (null se non esiste): prima l'indirizzo di scaricamento, poi il file senza credenziali
  async function getRaw(path) {
    if (!okSync(path)) throw new Error('percorso non ammesso');
    const t = await OD.token({ silent: true });
    const r = await fetch(`${ROOT}:/${enc(path)}`, { headers: { Authorization: 'Bearer ' + t } });
    if (r.status === 404) return null;
    if (!r.ok) throw await gErr(r);
    const meta = await r.json();
    const dl = meta['@microsoft.graph.downloadUrl'];
    if (!dl || !/^https:\/\/[a-z0-9.-]+\.(sharepoint\.com|microsoft\.com|live\.com|1drv\.com)\//i.test(dl)) throw new Error('indirizzo di scaricamento inatteso');
    const d = await fetch(dl);
    if (!d.ok) throw await gErr(d);
    return d.blob();
  }

  async function me() {
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,userPrincipalName', { headers: { Authorization: 'Bearer ' + await token() } });
    if (!r.ok) throw await gErr(r);
    return r.json();
  }

  return {
    configured, init, login, logout, token, upload, me, sniff, putRaw, list, getRaw,
    get account() { return account; },
    get error() { return lastError; },
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
  };
})();

/* ---------------- sincronizzazione di un record ---------------- */
// Foto e allegati: caricati una volta sola (registro per id). PDF e dati.json: sostituiti a ogni invio.
async function odRecordItems(r, settings) {
  const s = settings || _settings;
  const items = [];
  const photo = (id, dir, name) => id && items.push({ blobId: id, segs: [dir, name], kind: 'blob' });
  if (r.type === 'ra') {
    r.manufatti.forEach(m => m.foto.forEach((f, k) => photo(f, 'foto', `${m.codice || 'manufatto'}_${k + 1}`)));
  } else if (r.type === 'hs') {
    // le foto del sopralluogo precedente non vanno su OneDrive (sono già nel report dell'anno scorso)
    hsFotoOrd(r).filter(p => p.g !== 'prev').forEach((p, k) => photo(p.id, 'foto', `${String(k + 1).padStart(3, '0')}${p.cap ? '_' + p.cap.slice(0, 40) : ''}`));
    (r.cgFoto || []).forEach((o, k) => photo(o.id, 'immagini', `inquadramento_${k + 1}`));
    Object.entries(r.img || {}).forEach(([k, v]) => photo(v, 'immagini', k));
    (r.documenti || []).forEach(d => photo(d.blobId, 'documenti', d.nome));
  } else if (r.type === 'radon') {
    r.punti.forEach((p, i) => p.foto.forEach((f, k) => photo(f, 'foto', `R${i + 1}_${k + 1}`)));
    r.rapporti.forEach(d => photo(d.blobId, 'rapporti', d.nome));
  } else if (r.type === 'vs') {
    vsPhotos(r).forEach(x => photo(x.id, 'note', x.name));
    Object.entries(r.img || {}).forEach(([k, v]) => v && photo(v, 'immagini', k));
  } else if (r.type === 'firme' || r.type === 'aria' || r.type === 'app') {
    // solo fogli firme / monitoraggio aria: aggiunti sotto
  } else {
    r.recs.forEach(x => x.foto.forEach((f, k) => photo(f, 'foto', `${x.nome}_${k + 1}`)));
    MATS.forEach(m => r.campioni[m.k].forEach(c => (c.foto || []).forEach((f, k) => photo(f, 'foto', `${m.l}_${c.codice || 'campione'}_${k + 1}`))));
    ncOf(r).forEach(x => (x.foto || []).forEach((f, k) => photo(f, 'foto', `${x.codice}_${k + 1}`)));
    r.documenti.forEach(d => photo(d.blobId, 'documenti', d.nome));
  }
  (r.fotoAppunti || []).forEach((f, k) => photo(f, 'foto', `Appunti_${k + 1}`));
  (r.fotoAppunti2 || []).forEach((f, k) => photo(f, 'foto', `Appunti_Fase2_${k + 1}`));
  // planimetrie: la versione annotata viene rigenerata a ogni modifica, quindi va sostituita (non è nel registro "una volta sola")
  for (const p of (r.planimetrie || [])) {
    const id = p.mergedBlobId || p.blobId;
    items.push({ kind: 'pdfblob', blobId: id, segs: ['planimetrie', p.nome + (p.mergedBlobId ? '_annotata' : '')] });
  }
  ariaPhotos(r).forEach(x => photo(x.id, 'aria', x.name));
  ariaRapporti(r).forEach(d => photo(d.blobId, 'aria', d.nome));
  // documenti: quelli generati dalla scheda File vanno su così come sono (tutte le revisioni non ancora caricate);
  // quelli mai generati vengono preparati al momento, come prima
  for (const d of recDocs(r, s)) {
    const L = fileRevs(r, d);
    if (L.length) { for (const e of L) if (e.blobId) items.push({ kind: 'fileblob', blobId: e.blobId, type: d.type, segs: fileSegs(d, e.rev) }); continue; }
    if (d.tpl && !(await DB.get(d.tpl))) continue;
    items.push(d.type === PDF_MIME ? { kind: 'pdf', segs: fileSegs(d, 0), make: async () => new Uint8Array(await (await d.make()).arrayBuffer()) } : { kind: 'office', type: d.type, segs: fileSegs(d, 0), make: d.make });
  }
  const { _new, ...data } = r;
  items.push({ kind: 'json', segs: ['dati'], make: async () => JSON.stringify({ app: 'nembo', version: 1, record: data }, null, 1) });
  return items;
}

let _progress = () => {};
function Progress() {
  const [p, setP] = useState(null);
  _progress = setP;
  if (!p) return null;
  const pct = p.total ? Math.round(p.done / p.total * 100) : 0;
  return html`<div class="ov"><div class="modal" role="status" aria-live="polite">
    <h4>${p.title}</h4><p>${p.text}</p>
    <div style="height:8px;background:var(--track);border-radius:var(--r-xs);overflow:hidden"><div style=${'height:100%;background:var(--primary);width:' + pct + '%'}></div></div>
    <div class="lock" style="margin-top:8px">${p.done} / ${p.total}</div>
    ${p.onStop && html`<button class="btn block" style="margin-top:12px" onClick=${p.onStop}>Interrompi</button>`}
  </div></div>`;
}

async function odLog(entry) {
  const log = (await DB.get('od_log')) || [];
  log.unshift({ t: Date.now(), ...entry }); await DB.set('od_log', log.slice(0, 300));
}

/* stato di invio per attività: { [id]: { t, ok } } — t = momento dell'invio */
const odSyncSubs = new Set();
function useOdSynced() {
  const [m, setM] = useState({});
  useEffect(() => { const load = () => DB.get('od_synced').then(x => setM(x || {})); load(); odSyncSubs.add(load); return () => odSyncSubs.delete(load); }, []);
  return m;
}
// 'ok' (caricata e non più modificata) | 'stale' (modificata dopo l'invio) | 'err' (ultimo invio incompleto) | ''
function odStatus(map, r) {
  const e = map[r.id]; if (!e) return '';
  if (!e.ok) return 'err';
  return (r.updatedAt || 0) <= e.t ? 'ok' : 'stale';
}
const odCls = (map, r) => { const s = odStatus(map, r); return s ? ' od-' + s : ''; };
function OdBadge({ map, r }) {
  const s = odStatus(map, r); if (!s) return null;
  const d = new Date(map[r.id].t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
  if (s === 'ok') return html`<div class="od-tag ok">✓ Su OneDrive · ${d}</div>`;
  if (s === 'stale') return html`<div class="od-tag stale">Modificata dopo l'invio del ${d}: da ricaricare</div>`;
  return html`<div class="od-tag err">Invio del ${d} incompleto: vedi Notifiche</div>`;
}

async function odSync(records, settings) {
  if (!OD.account) { toast('Collega prima OneDrive in Impostazioni'); return; }
  if (!navigator.onLine) { toast('Sei offline: riprova quando c\'è rete'); return; }
  let stop = false, wake = null;
  const t0 = Date.now();
  try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  const sent = (await DB.get('od_sent')) || {};
  const folders = (await DB.get('od_folders')) || {};
  const plan = [];
  for (const r of records) {
    if (!folders[r.id]) folders[r.id] = recordLabel(r) || r.id;
    for (const it of await odRecordItems(r, settings)) {
      if ((it.kind === 'blob' || it.kind === 'fileblob') && sent[it.blobId]) continue;
      plan.push({ ...it, folder: folders[r.id], recId: r.id });
    }
  }
  await DB.set('od_folders', folders);
  // Verifico l'accesso una volta sola prima di iniziare: se va rinnovato, meglio fermarsi subito
  // che far fallire ogni file con lo stesso errore.
  try { await OD.token(); }
  catch (e) {
    if (wake) try { wake.release(); } catch (_) {}
    fail('OneDrive, accesso non riuscito', e, records.map(recordTitle).join(', '), records.map(r => r.id));
    return { done: 0, errors: [] };
  }
  let done = 0, errors = [];
  const show = text => _progress({ title: 'Caricamento su OneDrive', text, done, total: plan.length, onStop: () => { stop = true; } });
  for (const it of plan) {
    if (stop) break;
    show(it.folder + ' / ' + it.segs[it.segs.length - 1]);
    try {
      let blob, type, replace;
      if (it.kind === 'blob') {
        const b = await DB.getBlob(it.blobId); if (!b) { it._ok = true; done++; continue; }
        type = await OD.sniff(b.blob);
        if (!type) { errors.push({ path: it.folder + '/' + it.segs.join('/'), msg: 'tipo di file non ammesso, saltato', code: 'TIPO' }); done++; continue; }
        blob = b.blob; replace = false;
      } else if (it.kind === 'fileblob') {
        const b = await DB.getBlob(it.blobId); if (!b) { it._ok = true; done++; continue; }
        blob = b.blob; type = it.type; replace = true;
      } else if (it.kind === 'pdfblob') {
        const b = await DB.getBlob(it.blobId); if (!b) { it._ok = true; done++; continue; }
        blob = b.blob; type = 'application/pdf'; replace = true;
      } else if (it.kind === 'office') {
        blob = await it.make(); type = it.type; replace = true;
      } else if (it.kind === 'pdf') { blob = new Blob([await it.make()], { type: 'application/pdf' }); type = 'application/pdf'; replace = true; }
      else { blob = new Blob([await it.make()], { type: 'application/json' }); type = 'application/json'; replace = true; }
      const res = await OD.upload([it.folder, ...it.segs], blob, { type, replace });
      if (it.kind === 'blob') { sent[it.blobId] = res.path; await DB.set('od_sent', sent); }
      if (it.kind === 'fileblob') { await fileMarkSent(it.blobId, res); sent[it.blobId] = res.path; }
      await odLog({ path: res.path, size: blob.size });
      it._ok = true;
    } catch (e) {
      errors.push({ path: it.folder + '/' + it.segs.join('/'), msg: e.message, code: errCode(e) });
      if (/autorizzazione|accedi|negato/i.test(e.message)) break;
    }
    done++;
  }
  _progress(null);
  try { if (wake) wake.release(); } catch (e) {}
  // esito per attività: caricata solo se tutti i suoi file sono andati a buon fine
  const synced = (await DB.get('od_synced')) || {};
  for (const r of records) synced[r.id] = { t: t0, ok: plan.filter(i => i.recId === r.id).every(i => i._ok) };
  await DB.set('od_synced', synced); odSyncSubs.forEach(f => f());
  const rec = records.map(recordTitle).join(', ');
  const ok = done - errors.length;
  if (errors.length) {
    console.warn(errors);
    toast(`Caricati ${ok} file, ${errors.length} con errori: dettagli in Notifiche`);
    const codes = [...new Set(errors.map(x => x.code).filter(Boolean))];
    notify('err', `OneDrive: ${errors.length} file non caricati`, {
      record: rec, code: codes.join(', '), ids: records.filter(r => !synced[r.id].ok).map(r => r.id),
      detail: `Caricati ${ok} file su ${plan.length}. Primo errore: ${errors[0].msg}`,
      items: errors.map(x => `${x.path} — ${x.msg}${x.code ? ' [' + x.code + ']' : ''}`) });
  } else {
    const msg = stop ? `Interrotto: caricati ${done} file` : (plan.length ? `OneDrive aggiornato: ${done} file` : 'OneDrive già aggiornato: nessun file nuovo');
    toast(msg);
    notify(stop ? 'warn' : 'ok', msg, { record: rec, ids: stop ? records.filter(r => !synced[r.id].ok).map(r => r.id) : [] });
  }
  return { done, errors };
}

/* ---------------- sezione impostazioni ---------------- */
function OneDriveSettings({ settings, set }) {
  const [, force] = useState(0);
  const [log, setLog] = useState([]);
  const [who, setWho] = useState(null);
  useEffect(() => OD.subscribe(() => force(x => x + 1)), []);
  useEffect(() => { OD.init(settings).then(() => force(x => x + 1)); }, [settings.msClientId, settings.msTenantId]);
  useEffect(() => { DB.get('od_log').then(l => setLog((l || []).slice(0, 8))); }, []);
  useEffect(() => { if (OD.account) setWho(OD.account.name || OD.account.username); }, [OD.account]);
  const ok = OD.configured(settings);
  return html`<div class="card">
    <div class="grid2">
      <${Inp} cls="full" label="ID applicazione (client)" value=${settings.msClientId} set=${v => set({ msClientId: v.trim() })} placeholder="xxxxxxxx-xxxx-…" />
      <${Inp} cls="full" label="ID directory (tenant)" value=${settings.msTenantId} set=${v => set({ msTenantId: v.trim() })} placeholder="xxxxxxxx-xxxx-…" />
    </div>
    ${ok && html`<div style="margin-top:12px">
      ${OD.account ? html`<div class="row"><div class="tb-grow"><div style="font-size:var(--fs-md);font-weight:600">Collegato</div><div class="lock">${who}</div></div>
          <button class="btn sm" onClick=${() => confirm('Scollegare OneDrive?') && OD.logout()}>Esci</button></div>`
        : html`<button class="btn pri block" onClick=${() => OD.login().catch(e => toast(e.message))}>Accedi con Microsoft 365</button>`}
      ${OD.error && html`<div class="notice err">${OD.error}</div>`}
      <p class="lead" style="margin:10px 0 0">I file vanno nella cartella dedicata all'app dentro OneDrive › App, una cartella per indagine o campagna. L'app non vede né modifica il resto del tuo OneDrive.</p>
    </div>`}
    ${log.length > 0 && html`<div class="divider"></div><div class="fld"><span>Ultimi caricamenti</span></div>
      ${log.map(l => html`<div class="lock" style="display:block;margin-top:3px">${new Date(l.t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · ${l.path}</div>`)}`}
  </div>`;
}
