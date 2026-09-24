/* Caricamento su OneDrive tramite Microsoft Graph.
   Permesso delegato Files.ReadWrite.AppFolder: l'app scrive solo nella propria cartella
   (OneDrive › App › AppVerbali Ambiente). Non legge e non cancella nulla. */

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
  async function token() {
    if (!account) throw new Error('non sei collegato a OneDrive (Impostazioni → OneDrive → Accedi)');
    try { return (await pca.acquireTokenSilent({ scopes: SCOPES, account })).accessToken; }
    catch (e) {
      if (window.msal && e instanceof msal.InteractionRequiredAuthError) {
        toast('Sessione scaduta: accedi di nuovo');
        await pca.acquireTokenRedirect({ scopes: SCOPES, account });
      }
      throw new Error(describe(e));
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
  const EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'application/json': '.json' };
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
    let msg = r.status + ' ' + r.statusText;
    try { const j = await r.json(); if (j.error) msg = (j.error.code || '') + ': ' + (j.error.message || ''); } catch (e) {}
    if (r.status === 401) msg = 'autorizzazione scaduta, accedi di nuovo';
    if (r.status === 403) msg = 'accesso negato alla cartella dell\'app (' + msg + ')';
    return new Error(msg);
  }

  // Unico punto di scrittura: sempre sotto la cartella dell'app
  async function upload(segments, blob, { type, replace }) {
    if (!EXT[type]) throw new Error('tipo di file non ammesso');
    if (type !== 'application/json') {
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

  async function me() {
    const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,userPrincipalName', { headers: { Authorization: 'Bearer ' + await token() } });
    if (!r.ok) throw await gErr(r);
    return r.json();
  }

  return {
    configured, init, login, logout, token, upload, me, sniff,
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
  if (r.type === 'radon') {
    r.punti.forEach((p, i) => p.foto.forEach((f, k) => photo(f, 'foto', `R${i + 1}_${k + 1}`)));
    r.rapporti.forEach(d => photo(d.blobId, 'rapporti', d.nome));
    items.push({ kind: 'pdf', segs: ['Scheda_radon_' + (r.commessa || 'campagna')], make: async () => PdfGen.radonPdf(await loadTemplate('radon.pdf'), r) });
  } else {
    r.recs.forEach(x => x.foto.forEach((f, k) => photo(f, 'foto', `${x.nome}_${k + 1}`)));
    MATS.forEach(m => r.campioni[m.k].forEach(c => (c.foto || []).forEach((f, k) => photo(f, 'foto', `${m.l}_${c.codice || 'campione'}_${k + 1}`))));
    r.documenti.forEach(d => photo(d.blobId, 'documenti', d.nome));
    ['mca', 'fav'].forEach(k => {
      if (!r.campioni[k].length) return;
      items.push({ kind: 'pdf', segs: ['Scheda_campioni_' + k.toUpperCase()], make: async () => PdfGen.schedaCampioniPdf(await loadTemplate('scheda_campioni.pdf'), {
        commessa: r.commessa, sito: r.sito, campioni: r.campioni[k],
        analisi: k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc },
        lab: { nome: s.labNome, r1: s.labR1, r2: s.labR2 }, offerta: s.offerta, offertaRev: s.offertaRev, email: s.emailReferti,
        prelevatoDa: s.prelevatoDa, verificatoDa: s.verificatoDa }) });
    });
  }
  const { _new, ...data } = r;
  items.push({ kind: 'json', segs: ['dati'], make: async () => JSON.stringify({ app: 'appverbali-ambiente', version: 1, record: data }, null, 1) });
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
    <div style="height:8px;background:#e7edf3;border-radius:6px;overflow:hidden"><div style=${'height:100%;background:var(--primary);width:' + pct + '%'}></div></div>
    <div class="lock" style="margin-top:8px">${p.done} / ${p.total}</div>
    ${p.onStop && html`<button class="btn block" style="margin-top:12px" onClick=${p.onStop}>Interrompi</button>`}
  </div></div>`;
}

async function odLog(entry) {
  const log = (await DB.get('od_log')) || [];
  log.unshift({ t: Date.now(), ...entry }); await DB.set('od_log', log.slice(0, 300));
}

async function odSync(records, settings) {
  if (!OD.account) { toast('Collega prima OneDrive in Impostazioni'); return; }
  if (!navigator.onLine) { toast('Sei offline: riprova quando c\'è rete'); return; }
  let stop = false, wake = null;
  try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  const sent = (await DB.get('od_sent')) || {};
  const folders = (await DB.get('od_folders')) || {};
  const plan = [];
  for (const r of records) {
    if (!folders[r.id]) folders[r.id] = recordLabel(r) || r.id;
    for (const it of await odRecordItems(r, settings)) {
      if (it.kind === 'blob' && sent[it.blobId]) continue;
      plan.push({ ...it, folder: folders[r.id] });
    }
  }
  await DB.set('od_folders', folders);
  let done = 0, errors = [];
  const show = text => _progress({ title: 'Caricamento su OneDrive', text, done, total: plan.length, onStop: () => { stop = true; } });
  for (const it of plan) {
    if (stop) break;
    show(it.folder + ' / ' + it.segs[it.segs.length - 1]);
    try {
      let blob, type, replace;
      if (it.kind === 'blob') {
        const b = await DB.getBlob(it.blobId); if (!b) { done++; continue; }
        type = await OD.sniff(b.blob);
        if (!type) { errors.push(it.segs.join('/') + ': tipo non ammesso, saltato'); done++; continue; }
        blob = b.blob; replace = false;
      } else if (it.kind === 'pdf') { blob = new Blob([await it.make()], { type: 'application/pdf' }); type = 'application/pdf'; replace = true; }
      else { blob = new Blob([await it.make()], { type: 'application/json' }); type = 'application/json'; replace = true; }
      const res = await OD.upload([it.folder, ...it.segs], blob, { type, replace });
      if (it.kind === 'blob') { sent[it.blobId] = res.path; await DB.set('od_sent', sent); }
      await odLog({ path: res.path, size: blob.size });
    } catch (e) {
      errors.push(it.segs.join('/') + ': ' + e.message);
      if (/autorizzazione|accedi|negato/i.test(e.message)) break;
    }
    done++;
  }
  _progress(null);
  try { if (wake) wake.release(); } catch (e) {}
  if (errors.length) { console.warn(errors); toast(`Caricati ${done - errors.length} file, ${errors.length} con errori: ${errors[0]}`); }
  else toast(stop ? `Interrotto: caricati ${done} file` : `OneDrive aggiornato: ${done} file`);
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
      ${OD.account ? html`<div class="row"><div class="tb-grow"><div style="font-size:13.5px;font-weight:600">Collegato</div><div class="lock">${who}</div></div>
          <button class="btn sm" onClick=${() => confirm('Scollegare OneDrive?') && OD.logout()}>Esci</button></div>`
        : html`<button class="btn pri block" onClick=${() => OD.login().catch(e => toast(e.message))}>Accedi con Microsoft 365</button>`}
      ${OD.error && html`<div class="notice err">${OD.error}</div>`}
      <p class="lead" style="margin:10px 0 0">I file vanno in OneDrive › App › AppVerbali Ambiente, una cartella per indagine o campagna. L'app non vede né modifica il resto del tuo OneDrive.</p>
    </div>`}
    ${log.length > 0 && html`<div class="divider"></div><div class="fld"><span>Ultimi caricamenti</span></div>
      ${log.map(l => html`<div class="lock" style="display:block;margin-top:3px">${new Date(l.t).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })} · ${l.path}</div>`)}`}
  </div>`;
}
