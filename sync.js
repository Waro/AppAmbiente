/* Sincronizzazione tra dispositivi tramite la cartella dell'app su OneDrive (_nembo/).
   - _nembo/records/<id>.json : { app, kind: 'sync', version, record, blobs: {id: {type, name}}, savedAt }
                                 oppure, per un’attività eliminata, { app, kind: 'sync', deleted: true, id, deletedAt }
   - _nembo/blobs/<id>         : foto e allegati, uno per id (caricati una volta sola)
   Regole: vince la modifica più recente; se un’attività è cambiata su due dispositivi, l'altra versione
   diventa una copia. Un’attività eliminata sparisce ovunque, i suoi file restano su OneDrive.
   L’attività aperta sullo schermo non viene sovrascritta: si aggiorna al giro successivo. */

const Sync = (() => {
  const REC = '_nembo/records/', BLOB = '_nembo/blobs/';
  let running = null, again = false, busyId = null, timer = null;
  const state = { phase: 'idle', text: '', last: null, error: null, done: 0, total: 0 };
  const subs = new Set(); const recSubs = new Set();
  const emit = () => subs.forEach(f => f({ ...state }));
  const set = patch => { Object.assign(state, patch); emit(); };
  const enabled = () => !!(OD.account && (_settings.odSync !== false));
  const kv = async (k, d) => (await DB.get(k)) || d;

  // attività eliminata qui: la segno, la lapide parte al prossimo giro
  async function markDeleted(id) {
    const del = await kv('sync_del', {}); del[id] = Date.now(); await DB.set('sync_del', del);
    schedule(3000);
  }

  // copia di un’attività con file propri (così eliminare l'una non tocca le foto dell'altra)
  async function copia(rec, nota) {
    const map = {};
    for (const id of [...new Set(blobIds(rec))]) {
      const b = await DB.getBlob(id); if (!b) continue;
      const nid = uid('b'); await DB.putBlob({ ...b, id: nid }); map[id] = nid;
    }
    const json = JSON.stringify(rec).replace(/"(b_[^"]+)"/g, (m, id) => map[id] ? `"${map[id]}"` : m);
    const c = JSON.parse(json);
    Object.assign(c, { id: uid(rec.type || 'rec'), codice: (rec.codice || '') + ' · copia', copiaDi: rec.id, copiaNota: nota, updatedAt: Date.now() });
    delete c._new;
    await DB.put(c);
    return c;
  }

  async function pushBlobs(rec, sent, prog) {
    const metas = {}; let ok = true;
    for (const id of [...new Set(blobIds(rec))]) {
      const b = await DB.getBlob(id); if (!b) continue;
      metas[id] = { type: b.type || b.blob.type || '', name: b.name || '' };
      if (sent[id]) continue;
      try { await OD.putRaw(BLOB + id, b.blob, metas[id].type); sent[id] = 1; await DB.set('sync_blobs', sent); }
      catch (e) { ok = false; if (e.code === 'LOGIN' || /autorizzazione|negato/i.test(e.message)) throw e; console.warn('blob', id, e); }
      prog();
    }
    return { metas, ok };
  }
  async function pushRecord(rec, st, sent, prog) {
    const { metas, ok } = await pushBlobs(rec, sent, prog);
    if (!ok) return false; // l’attività va su solo quando tutti i suoi file sono su
    const { _new, ...record } = rec;
    const item = await OD.putRaw(REC + rec.id + '.json', new Blob([JSON.stringify({ app: 'nembo', kind: 'sync', version: 1, record, blobs: metas, savedAt: Date.now() })], { type: 'application/json' }), 'application/json');
    st[rec.id] = { v: rec.updatedAt || 0, m: item && item.lastModifiedDateTime };
    return true;
  }
  async function pullBlobs(remote, sent) {
    let missing = 0;
    for (const id of [...new Set(blobIds(remote.record))]) {
      if (await DB.getBlob(id)) continue;
      const b = await OD.getRaw(BLOB + id);
      if (!b) { missing++; continue; }
      const meta = (remote.blobs || {})[id] || {};
      await DB.putBlob({ id, blob: meta.type ? new Blob([b], { type: meta.type }) : b, type: meta.type || b.type, name: meta.name || '' });
      sent[id] = 1;
    }
    return missing;
  }

  async function run(opts = {}) {
    if (!OD.account) { if (opts.manual) toast('Collega prima OneDrive in Impostazioni'); return; }
    if (!navigator.onLine) { set({ phase: 'offline', text: 'Offline: riprovo quando torna la rete' }); return; }
    if (running) { again = true; return running; }
    running = (async () => {
      const esito = { su: 0, giu: 0, copie: [], tolte: 0, tolteSu: 0, mancanti: 0, rinviate: 0 };
      try {
        set({ phase: 'run', text: 'Controllo OneDrive…', error: null, done: 0, total: 0 });
        await OD.token({ silent: true });
        const st = await kv('sync_state', {}), sent = await kv('sync_blobs', {}), del = await kv('sync_del', {});
        // 1. eliminazioni fatte qui
        for (const [id, t] of Object.entries(del)) {
          await OD.putRaw(REC + id + '.json', new Blob([JSON.stringify({ app: 'nembo', kind: 'sync', version: 1, deleted: true, id, deletedAt: t })], { type: 'application/json' }), 'application/json');
          st[id] = { v: t, deleted: true }; delete del[id]; esito.tolteSu++;
        }
        await DB.set('sync_del', del); await DB.set('sync_state', st);
        // 2. cosa c'è su OneDrive
        const remoteList = (await OD.list(REC)).filter(f => /\.json$/.test(f.name));
        const locals = await DB.all(); const byId = Object.fromEntries(locals.map(r => [r.id, r]));
        let changed = false;
        for (const f of remoteList) {
          const id = f.name.replace(/\.json$/, '');
          const s0 = st[id];
          if (s0 && s0.m === f.lastModifiedDateTime) continue; // già visto
          if (id === busyId) { esito.rinviate++; continue; }
          set({ text: 'Scarico ' + id });
          const b = await OD.getRaw(REC + f.name); if (!b) continue;
          let remote; try { remote = JSON.parse(await b.text()); } catch (e) { continue; }
          if (!remote || remote.app !== 'nembo' || remote.kind !== 'sync') continue;
          const base = s0 ? s0.v : null, L = byId[id];
          if (remote.deleted) {
            if (L && (L.updatedAt || 0) <= remote.deletedAt) {
              for (const bid of blobIds(L)) await removeBlob(bid);
              await DB.del(id); delete byId[id]; esito.tolte++; changed = true;
            }
            st[id] = { v: remote.deletedAt, deleted: true, m: f.lastModifiedDateTime };
            continue;
          }
          const R = remote.record; if (!R || R.id !== id) continue;
          const rV = R.updatedAt || 0;
          if (!L) {
            esito.mancanti += await pullBlobs(remote, sent);
            await DB.put(R); byId[id] = R; esito.giu++; changed = true;
          } else if ((L.updatedAt || 0) === rV) {
            // uguali: niente da fare
          } else {
            const lChanged = base == null || (L.updatedAt || 0) > base, rChanged = base == null || rV > base;
            if (rChanged && !lChanged) {
              esito.mancanti += await pullBlobs(remote, sent);
              await DB.put(R); byId[id] = R; esito.giu++; changed = true;
            } else if (rChanged && lChanged) {
              // conflitto: vince la più recente, l'altra diventa una copia
              esito.mancanti += await pullBlobs(remote, sent);
              const when = new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
              if (rV > (L.updatedAt || 0)) {
                const c = await copia(L, `Versione di questo dispositivo, sostituita il ${when} da una modifica più recente`);
                await DB.put(R); byId[id] = R; byId[c.id] = c; esito.giu++; esito.copie.push(c.codice);
              } else {
                const c = await copia(R, `Versione di un altro dispositivo, sostituita il ${when} da una modifica più recente`);
                esito.copie.push(c.codice); byId[c.id] = c;
                st[id] = { v: rV, m: f.lastModifiedDateTime }; // la mia versione partirà al punto 3
                continue;
              }
              changed = true;
            }
            // solo locale cambiata: parte al punto 3
          }
          st[id] = { v: rV, m: f.lastModifiedDateTime };
        }
        await DB.set('sync_state', st); await DB.set('sync_blobs', sent);
        if (changed || esito.copie.length) recSubs.forEach(fn => fn());
        // 3. cosa va su
        const toPush = Object.values(byId).filter(r => !r._new && r.id !== busyId && (!st[r.id] || st[r.id].deleted || (r.updatedAt || 0) > (st[r.id].v || 0)));
        const total = toPush.reduce((a, r) => a + new Set(blobIds(r)).size + 1, 0);
        let done = 0; const prog = () => set({ done: ++done, total, text: `Invio ${done} di ${total}` });
        for (const r of toPush) {
          if (await pushRecord(r, st, sent, prog)) esito.su++;
          prog(); await DB.set('sync_state', st);
        }
        if (busyId && byId[busyId] && (!st[busyId] || (byId[busyId].updatedAt || 0) > (st[busyId].v || 0))) esito.rinviate++;
        const last = Date.now(); await DB.set('sync_last', last);
        const parts = [esito.giu && `${esito.giu} ricevute`, esito.su && `${esito.su} inviate`, esito.tolte && `${esito.tolte} eliminate`, esito.tolteSu && (esito.tolteSu === 1 ? '1 eliminazione inviata' : `${esito.tolteSu} eliminazioni inviate`)].filter(Boolean);
        set({ phase: 'ok', last, text: parts.length ? parts.join(', ') : 'Tutto aggiornato', done: 0, total: 0 });
        if (esito.copie.length) notify('warn', 'Sincronizzazione: ' + (esito.copie.length === 1 ? 'un’attività era cambiata su due dispositivi' : esito.copie.length + ' attività erano cambiate su due dispositivi'), {
          detail: 'È rimasta la modifica più recente; l\'altra versione è stata salvata come copia. Controllale e cancella quella che non serve.', items: esito.copie });
        if (esito.mancanti) notify('warn', `Sincronizzazione: ${esito.mancanti} file non trovati su OneDrive`, { detail: 'Le attività sono arrivate, ma alcune foto o allegati non erano ancora stati caricati dall\'altro dispositivo. Riapri Nembo su quel dispositivo con la rete attiva.' });
        if (opts.manual) toast(parts.length ? 'Sincronizzato: ' + parts.join(', ') : 'Tutto già sincronizzato');
      } catch (e) {
        const login = e.code === 'LOGIN';
        set({ phase: login ? 'login' : 'err', error: login ? 'Accesso a Microsoft da rinnovare: Impostazioni → OneDrive' : e.message, text: '' });
        if (opts.manual) { if (login) await OD.token().catch(() => {}); else fail('Sincronizzazione non riuscita', e); }
        else if (!login && !state.notified) { state.notified = true; notify('err', 'Sincronizzazione non riuscita', { detail: e.message, code: errCode(e) }); }
      } finally {
        running = null;
        if (again) { again = false; schedule(2000); }
      }
    })();
    return running;
  }
  function schedule(ms = 20000) {
    if (!enabled()) return;
    clearTimeout(timer); timer = setTimeout(() => run(), ms);
  }
  // avvio: al collegamento con OneDrive, al ritorno della rete e quando l'app torna in primo piano
  let started = false;
  function start() {
    if (started) return; started = true;
    DB.get('sync_last').then(t => t && set({ last: t, phase: 'ok', text: '' }));
    OD.subscribe(() => { if (enabled()) schedule(2500); });
    addEventListener('online', () => schedule(1500));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (!state.last || Date.now() - state.last > 120000)) schedule(1500); });
  }
  return {
    run, schedule, start, markDeleted, enabled,
    set busy(id) { const was = busyId; busyId = id || null; if (was && was !== busyId) schedule(4000); },
    get state() { return { ...state }; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    onRecords(f) { recSubs.add(f); return () => recSubs.delete(f); },
  };
})();

function useSync() {
  const [s, setS] = useState(Sync.state);
  useEffect(() => Sync.subscribe(setS), []);
  return s;
}
function syncLabel(s) {
  if (s.phase === 'run') return s.total ? `Sincronizzazione · ${s.done}/${s.total}` : 'Sincronizzazione…';
  if (s.phase === 'login') return 'Accesso da rinnovare';
  if (s.phase === 'err') return 'Sincronizzazione non riuscita';
  if (s.phase === 'offline') return 'Offline';
  if (s.last) return 'Sincronizzato ' + new Date(s.last).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  return '';
}

// riquadro in Impostazioni (dentro OneDrive) e in Backup
function SyncCard({ settings, set }) {
  const s = useSync();
  const [, force] = useState(0);
  useEffect(() => OD.subscribe(() => force(x => x + 1)), []);
  const on = settings.odSync !== false;
  if (!OD.configured(settings)) return null;
  return html`<div class="card">
    <label class="fg-sw"><span><b style="font-weight:600">Sincronizza tra i dispositivi</b><br /><small class="lock">All'apertura, quando torna la rete e poco dopo ogni modifica</small></span>
      <${Toggle} on=${on} label="Sincronizzazione automatica" set=${v => { set({ odSync: v }); if (v) Sync.schedule(1000); }} /></label>
    ${OD.account ? html`<div class="sync-st ${s.phase}">${syncLabel(s)}${s.text && s.phase !== 'run' ? ' · ' + s.text : ''}</div>
        ${s.error && html`<div class="notice err">${s.error}</div>`}
        <button class="btn block" style="margin-top:10px" disabled=${s.phase === 'run'} onClick=${() => Sync.run({ manual: true })}>${s.phase === 'run' ? html`<div class="spin" />` : html`<${Icon} n="share" s=${18} />`} Sincronizza ora</button>`
      : html`<p class="lead" style="margin:8px 0 0">Accedi con Microsoft 365 qui sopra per attivarla.</p>`}
    <p class="lead" style="margin:10px 0 0">Su un dispositivo nuovo basta accedere: le attività arrivano da sole. Vince la modifica più recente; se un’attività è cambiata su due dispositivi, l'altra versione resta come copia. Le attività eliminate spariscono ovunque, i file restano nella cartella dell'app su OneDrive.</p>
  </div>`;
}
