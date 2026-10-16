/* Sopralluoghi H&S (formati Esteso e Sintetico): elenco, scheda a sezioni, galleria foto, strumenti di scrittura. */

const HS_FMT = { esteso: 'Esteso', sintetico: 'Sintetico' };
const HS_VOCI = HS_SINT_ALL.length;

/* ---------------- elenco ---------------- */
function hsProgress(r) {
  if (r.formato === 'sintetico') return `${HS_SINT_ALL.filter(it => r.risp[it.id]).length}/${HS_VOCI} voci`;
  return `${HS_SCHEDE.filter(s => hsSchedaFatta(r.schede[s.k] || {})).length}/${HS_SCHEDE.length} schede`;
}
function HsList({ records, open, create, activeId, acts }) {
  const od = useOdSynced();
  const [f, setF] = useState('tutti');
  const all = records.filter(r => r.type === 'hs');
  const list = all.filter(r => f === 'tutti' || r.formato === f).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  list.forEach(r => { const c = r.cliente || 'Senza committente', s = placeLabel(r); ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  return html`<div class="content">
    <${LargeTitle} top eye="H&S" title="Sopralluoghi" sub=${`${all.length} ${all.length === 1 ? 'report' : 'report'}`} acts=${acts} />
    <div class="pills">${[['tutti', 'Tutti'], ['esteso', 'Esteso'], ['sintetico', 'Sintetico']].map(([k, l]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${all.filter(r => k === 'tutti' || r.formato === k).length}</span></button>`)}</div>
    ${!list.length && html`<div class="empty"><b>Nessun sopralluogo H&S</b>Tocca + e scegli il formato Esteso o Sintetico.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">
        ${rs.map(r => { const cr = hsCriticita(r).filter(x => x.p === 1).length; return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
          <div class="r1"><span class="id">${r.codice}</span><span class=${'badge ' + (r.formato === 'sintetico' ? 'b-f2' : 'b-f1')}>${HS_FMT[r.formato]}</span><span class="dt">${fmtD(r.data)}</span></div>
          ${(r.sito || r.commessa) && html`<div class="ttl">${[r.commessa, r.sito].filter(Boolean).join(' · ')}</div>`}
          <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${hsProgress(r)} · ${(r.foto || []).length} foto</div>
          ${cr > 0 && html`<div class="due late">${cr} ${cr === 1 ? 'criticità' : 'criticità'} ${r.formato === 'sintetico' ? 'di gravità alta' : 'con priorità 1'}</div>`}
          <${OdBadge} map=${od} r=${r} /></button>`; })}</div></div>`)}</div>`)}
  </div>`;
}

/* ---------------- strumenti di scrittura ---------------- */
const SR_API = window.SpeechRecognition || window.webkitSpeechRecognition;
let _recActive = null;
function useDictation(get, set) {
  const [on, setOn] = useState(false);
  const ref = useRef(); ref.current = { get, set };
  useEffect(() => () => { if (_recActive && _recActive._mine === ref) { try { _recActive.stop(); } catch (e) {} } }, []);
  const toggle = () => {
    if (!SR_API) { toast('Dettatura non disponibile: usa il microfono della tastiera'); return; }
    if (_recActive) { try { _recActive.stop(); } catch (e) {} if (_recActive && _recActive._mine === ref) return; }
    const rec = new SR_API(); rec._mine = ref;
    rec.lang = 'it-IT'; rec.continuous = true; rec.interimResults = false;
    rec.onresult = e => {
      let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (!t) return;
      const cur = ref.current.get() || '';
      ref.current.set(cur + (cur && !/\s$/.test(cur) ? ' ' : '') + t.charAt(0).toUpperCase() + t.slice(1));
    };
    rec.onerror = ev => { if (ev.error !== 'aborted') toast(ev.error === 'network' ? 'Dettatura: serve la connessione' : 'Dettatura interrotta (' + ev.error + ')'); };
    rec.onend = () => { setOn(false); if (_recActive === rec) _recActive = null; };
    try { rec.start(); _recActive = rec; setOn(true); } catch (e) { toast('Impossibile avviare la dettatura'); }
  };
  return [on, toggle];
}
// frasi ricorrenti: predefinite + personali (salvate sul dispositivo)
function FrasiSheet({ gruppo, onPick, onClose }) {
  useBackClose(onClose);
  const [mie, setMie] = useState({});
  const [nuova, setNuova] = useState('');
  useEffect(() => { DB.get('hs_frasi').then(x => setMie(x || {})); }, []);
  const salva = m => { setMie(m); DB.set('hs_frasi', m); };
  const lista = mie[gruppo] || [];
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="Frasi ricorrenti">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>Frasi ricorrenti</b><span></span></div>
    <div class="sheet-body">
      <div class="sec-h" style="margin-top:4px"><h3>${gruppo}</h3><span class="hint">tocca per aggiungere</span></div>
      <div class="list">${[...(HS_FRASI[gruppo] || []), ...lista].map((f, i) => html`<div class="prow" key=${i}>
        <button class="t" style="background:none;border:0;text-align:left;padding:0;font-size:15px" onClick=${() => { onPick(f); onClose(); }}>${f}</button>
        ${i >= (HS_FRASI[gruppo] || []).length && html`<button class="x" aria-label="Elimina frase" onClick=${() => salva({ ...mie, [gruppo]: lista.filter(x => x !== f) })}>×</button>`}</div>`)}</div>
      <div class="sec-h"><h3>Aggiungi una tua frase</h3></div>
      <div class="card tight"><textarea class="inp" rows="2" value=${nuova} onInput=${e => setNuova(e.target.value)} placeholder="Resta su questo dispositivo"></textarea>
        <button class="btn block" style="margin-top:8px" disabled=${!nuova.trim()} onClick=${() => { salva({ ...mie, [gruppo]: [...lista, nuova.trim()] }); setNuova(''); }}>Aggiungi</button></div>
    </div></div></div>`;
}
// proposta di riformulazione tecnica (regole fisse, offline): l'utente la rivede prima di applicarla
function RiformulaSheet({ prop, testo, onApply, onClose }) {
  useBackClose(onClose);
  const [sit, setSit] = useState(prop.sit); const [mig, setMig] = useState(prop.mig);
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label="Riformulazione tecnica">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Annulla</button><b>Riformulazione</b><span></span></div>
    <div class="sheet-body">
      ${!prop.sicura && html`<div class="notice" style="margin-top:0">La nota è ambigua: controlla che descriva davvero una criticità prima di applicare.</div>`}
      <div class="card tight" style="margin-top:12px"><div class="lt-eye" style="margin-bottom:4px">La tua nota</div><div style="font-size:15px">${testo}</div></div>
      <label class="fld"><span>Situazione rilevata</span><textarea rows="5" value=${sit} onInput=${e => setSit(e.target.value)}></textarea></label>
      ${prop.mig && html`<label class="fld" style="margin-top:12px"><span>Attività di miglioramento (in coda a quella presente)</span><textarea rows="5" value=${mig} onInput=${e => setMig(e.target.value)}></textarea></label>`}
      <button class="btn pri block" style="margin-top:14px" onClick=${() => { onApply(sit.trim(), (mig || '').trim()); onClose(); }}>Applica</button>
    </div></div></div>`;
}
// campo di testo con dettatura, frasi ricorrenti e (per la situazione rilevata) riformulazione
function HsText({ label, value, set, base, gruppo, rows = 4, onRiformula, placeholder }) {
  const [frasi, setFrasi] = useState(false);
  const [rif, setRif] = useState(null);
  const [rec, toggleRec] = useDictation(() => value, set);
  const changed = base != null && base !== '' && (value || '') !== base;
  return html`<div class="fld hs-text"><span>${label}</span>
    <textarea rows=${rows} value=${value || ''} placeholder=${placeholder || ''} onInput=${e => set(e.target.value)}></textarea>
    <div class="hs-tools">
      ${SR_API && html`<button class=${'chip-btn' + (rec ? ' rec' : '')} onClick=${toggleRec}><${Icon} n=${rec ? 'stop' : 'mic'} s=${15} /> ${rec ? 'Stop' : 'Detta'}</button>`}
      ${gruppo && html`<button class="chip-btn" onClick=${() => setFrasi(true)}><${Icon} n="list" s=${15} /> Frasi</button>`}
      ${onRiformula && html`<button class="chip-btn" onClick=${() => { const p = hsRiformula(value); if (!p) toast('Nessuna formulazione tecnica per questa nota'); else setRif(p); }}><${Icon} n="spark" s=${15} /> Riformula</button>`}
      ${base ? html`<span class="hs-base">${changed ? 'Modificato: le righe nuove escono in rosso' : 'Dal report precedente (nero nel Word)'}</span>` : null}
    </div>
    ${frasi && html`<${FrasiSheet} gruppo=${gruppo} onClose=${() => setFrasi(false)} onPick=${f => set((value || '').replace(/\s+$/, '') + (value && value.trim() ? '\n' : '') + f)} />`}
    ${rif && html`<${RiformulaSheet} prop=${rif} testo=${value} onClose=${() => setRif(null)} onApply=${(s, m) => onRiformula(s, m)} />`}
  </div>`;
}

/* ---------------- immagini singole (copertina, mappa, catasto…) ---------------- */
function ImgSlot({ label, id, set, crop }) {
  const inp = useRef(); const [busy, setBusy] = useState(false); const [view, setView] = useState(false);
  const pick = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy(true); try { if (id) await removeBlob(id); set(await saveImage(f, 2000)); } catch (err) { fail('Immagine non salvata', err); } setBusy(false);
  };
  return html`<div class="fld"><span>${label}</span>
    <div class="row" style="gap:10px">
      ${id ? html`<button class="img-slot" onClick=${() => setView(true)}><${Thumb44} id=${id} /></button>` : html`<span class="img-slot empty"><${Icon} n="camera" s=${20} /></span>`}
      <button class="btn sm" onClick=${() => inp.current.click()} disabled=${busy}>${busy ? html`<div class="spin" />` : id ? 'Sostituisci' : 'Aggiungi'}</button>
      ${id && html`<button class="btn sm danger" onClick=${async () => { if (!confirm('Rimuovere l\'immagine?')) return; await removeBlob(id); set(null); }}>Rimuovi</button>`}
      ${crop && html`<span class="lock">ritagliata al formato della copertina</span>`}
    </div>
    <input ref=${inp} type="file" accept="image/*" hidden onChange=${pick} />
    ${view && html`<${Viewer} ids=${[id]} index=${0} onClose=${() => setView(false)} />`}
  </div>`;
}

/* ---------------- galleria foto del report ---------------- */
const HS_GRUPPI = [{ g: 'prev', t: 'Sopralluogo precedente' }, { g: 'new', t: 'Questo sopralluogo' }];
async function hsAddPhotos(files, g, ref, up, cur) {
  const room = HS_MAX_FOTO - (cur || 0); const list = [...files].slice(0, Math.max(0, room)); const out = [];
  if (files.length > list.length) toast('Limite di ' + HS_MAX_FOTO + ' foto per report');
  for (const [i, f] of list.entries()) {
    if (list.length > 1) _progress({ title: 'Salvo le foto', text: `${i + 1} di ${list.length}`, done: i, total: list.length });
    try { out.push({ id: await saveImage(f), cap: '', inc: true, g, ref: ref || '', ts: new Date().toISOString() }); } catch (e) { fail('Foto non salvata', e); }
  }
  _progress(null);
  if (out.length) up(p => ({ ...p, foto: [...(p.foto || []), ...out] }));
}
function HsGallery({ r, up, items }) {
  const [view, setView] = useState(null);
  const [aperti, setAperti] = useState({ prev: true, new: true });
  const inp = useRef(), cam = useRef(); const target = useRef('new');
  const num = {}; hsFotoReport(r).forEach((p, i) => { num[p.id] = i + 1; });
  const ord = hsFotoOrd(r);
  const updF = (id, patch) => up(p => ({ ...p, foto: p.foto.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const move = (p, d) => up(q => {
    const same = q.foto.filter(x => (x.g === 'prev') === (p.g === 'prev'));
    const i = same.findIndex(x => x.id === p.id), j = i + d; if (j < 0 || j >= same.length) return q;
    const a = q.foto.indexOf(same[i]), b = q.foto.indexOf(same[j]); const f = q.foto.slice(); [f[a], f[b]] = [f[b], f[a]]; return { ...q, foto: f };
  });
  const del = async p => { if (!confirm('Eliminare la foto?')) return; await removeBlob(p.id); up(q => ({ ...q, foto: q.foto.filter(x => x.id !== p.id) })); };
  const delPrev = async () => {
    const L = (r.foto || []).filter(x => x.g === 'prev'); if (!L.length) return;
    if (!confirm(`Eliminare tutte le ${L.length} foto del sopralluogo precedente? Le foto del sopralluogo attuale restano.`)) return;
    for (const p of L) await removeBlob(p.id);
    up(q => ({ ...q, foto: q.foto.filter(x => x.g !== 'prev') })); toast('Foto del sopralluogo precedente eliminate');
  };
  const pick = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) hsAddPhotos(fs, target.current, '', up, (r.foto || []).length); };
  const refLab = id => { const it = items && items.find(x => x.id === id); return it ? it.ref : ''; };
  return html`<div>
    <div class="lead" style="margin:0 2px 12px">${Object.keys(num).length} foto nel report${ord.length - Object.keys(num).length ? ` · ${ord.length - Object.keys(num).length} escluse` : ''} · ${ord.length}/${HS_MAX_FOTO}. Nel Word prima quelle del sopralluogo precedente, poi le nuove, in quest'ordine.</div>
    ${HS_GRUPPI.map(G => { const L = ord.filter(p => (p.g === 'prev') === (G.g === 'prev')); return html`<div class="hsg-grp" key=${G.g}>
      <div class="sec-h"><h3>${G.t} · ${L.length}</h3>
        <button class="btn link sm" onClick=${() => setAperti(a => ({ ...a, [G.g]: !a[G.g] }))}>${aperti[G.g] ? 'Chiudi' : 'Apri'}</button></div>
      ${aperti[G.g] && html`<div class="row" style="margin-bottom:10px">
          ${G.g === 'new' && html`<button class="btn" style="flex:1" onClick=${() => { target.current = 'new'; cam.current.click(); }}><${Icon} n="camera" s=${18} /> Scatta</button>`}
          <button class="btn" style="flex:1" onClick=${() => { target.current = G.g; inp.current.click(); }}><${Icon} n="paper" s=${18} /> Dalla galleria</button></div>
        ${L.length > 0 && html`<div class="row" style="margin:-4px 0 8px;gap:4px"><span class="lock tb-grow">Nel report:</span>
          <button class="btn link sm" onClick=${() => up(q => ({ ...q, foto: q.foto.map(x => (x.g === 'prev') === (G.g === 'prev') ? { ...x, inc: true } : x) }))}>includi tutte</button>
          <button class="btn link sm" onClick=${() => up(q => ({ ...q, foto: q.foto.map(x => (x.g === 'prev') === (G.g === 'prev') ? { ...x, inc: false } : x) }))}>escludi tutte</button>
          ${G.g === 'prev' && html`<button class="btn link sm" style="color:var(--danger)" onClick=${delPrev}>elimina tutte</button>`}</div>`}
        ${!L.length ? html`<div class="card"><div class="empty" style="padding:16px">${G.g === 'prev' ? 'Le foto del report importato arrivano qui da sole.' : 'Nessuna foto scattata in questo sopralluogo.'}</div></div>`
        : html`<div class="hsg">${L.map((p, k) => html`<div class=${'hsg-card' + (num[p.id] ? '' : ' excl')} key=${p.id}>
          <button class="hsg-img" onClick=${() => setView(ord.indexOf(p))}><${HsThumb} id=${p.id} /><span class="hsg-n">${num[p.id] ? 'Foto ' + num[p.id] : 'Esclusa'}</span>${p.ref && html`<span class="hsg-ref mono">${refLab(p.ref)}</span>`}</button>
          <textarea class="inp" rows="2" placeholder="Didascalia" value=${p.cap} onInput=${e => updF(p.id, { cap: e.target.value })}></textarea>
          ${items && html`<select class="inp" value=${p.ref || ''} onChange=${e => updF(p.id, { ref: e.target.value })} aria-label="Voce collegata">
            <option value="">Nessuna voce collegata</option>${items.map(it => html`<option value=${it.id}>${it.ref} · ${it.txt.slice(0, 60)}</option>`)}</select>`}
          <label class="hsg-inc"><input type="checkbox" checked=${p.inc !== false} onChange=${e => updF(p.id, { inc: e.target.checked })} /> Nel report</label>
          <div class="hsg-act">
            <button class="x" title="Prima" disabled=${k === 0} onClick=${() => move(p, -1)}>‹</button>
            <button class="x" title="Dopo" disabled=${k === L.length - 1} onClick=${() => move(p, 1)}>›</button>
            <button class="x" title=${G.g === 'prev' ? 'Sposta in questo sopralluogo' : 'Sposta nel sopralluogo precedente'} onClick=${() => updF(p.id, { g: G.g === 'prev' ? 'new' : 'prev' })}>${G.g === 'prev' ? '↓' : '↑'}</button>
            <button class="x" title="Elimina" onClick=${() => del(p)}><${Icon} n="trash" s=${15} /></button>
          </div></div>`)}</div>`}`}
    </div>`; })}
    <input ref=${inp} type="file" accept="image/*" multiple hidden onChange=${pick} />
    <input ref=${cam} type="file" accept="image/*" capture="environment" hidden onChange=${pick} />
    ${view !== null && html`<${Viewer} ids=${ord.map(p => p.id)} index=${view} labelOf=${id => { const p = ord.find(x => x.id === id); return p && p.cap ? p.cap.slice(0, 40) : null; }} onClose=${() => setView(null)} />`}
  </div>`;
}
function HsThumb({ id }) { const u = useBlobUrl(id); return u ? html`<img src=${u} alt="" loading="lazy" />` : html`<span></span>`; }
// foto rapida (barra azioni o voce della checklist)
function HsCam({ up, r, refId, big, label = 'Scatta una foto' }) {
  const inp = useRef();
  return html`<button class=${'btn-icon' + (big ? ' lg' : '')} aria-label=${label} title=${label} onClick=${() => inp.current.click()}><${Icon} n="camera" s=${big ? 22 : 18} />
    <input ref=${inp} type="file" accept="image/*" capture="environment" hidden onClick=${e => e.stopPropagation()} onChange=${e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) hsAddPhotos(fs, 'new', refId, up, (r.foto || []).length).then(() => toast('Foto aggiunta' + (refId ? ' e collegata alla voce' : ''))); }} /></button>`;
}

// voce della checklist sintetica: codice, testo e SI/NO/N.A. su una riga (sotto se non ci stanno), foto e note a icone
function HsCheck({ it, r, up, base }) {
  const nota = r.note[it.id] || '';
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const ta = useRef();
  const setNota = v => up(p => ({ ...p, note: { ...p.note, [it.id]: v } }));
  const [rec, toggleRec] = useDictation(() => r.note[it.id] || '', setNota);
  const linked = (r.foto || []).filter(p => p.ref === it.id);
  useEffect(() => { if (open && ta.current) ta.current.focus(); }, [open]);
  const risp = k => up(p => { const rr = { ...p.risp }; if (rr[it.id] === k) delete rr[it.id]; else rr[it.id] = k; return { ...p, risp: rr }; });
  return html`<div class=${'ck' + (r.risp[it.id] ? ' done' : '')}>
    <span class="mono hs-ref ck-ref">${it.ref}</span>
    <div class="ck-txt">${it.txt}</div>
    <div class="seg sm ck-seg">${HS_RISP.map(([k, l]) => html`<button class=${r.risp[it.id] === k ? 'on' : ''} aria-pressed=${r.risp[it.id] === k} onClick=${() => risp(k)}>${l}</button>`)}</div>
    <div class="ck-act">
      <span class="ck-cam"><${HsCam} up=${up} r=${r} refId=${it.id} label=${'Foto per la voce ' + it.ref} />${linked.length > 0 && html`<i class="ck-badge">${linked.length}</i>`}</span>
      <button class=${'btn-icon' + (nota || open ? ' on' : '')} aria-label="Note" title="Note" aria-expanded=${open} onClick=${() => setOpen(!open)}><${Icon} n="note" s=${18} /></button>
    </div>
    ${(linked.length > 0 || (!open && nota)) ? html`<div class="ck-extra">
      ${linked.map((p, i) => html`<button key=${p.id} class="ck-th" aria-label=${'Foto ' + (i + 1)} onClick=${() => setView(i)}><${Thumb44} id=${p.id} /></button>`)}
      ${!open && nota ? html`<button class="ck-nota" onClick=${() => setOpen(true)}>${nota}</button>` : null}</div>` : null}
    ${open && html`<div class="ck-ed">
      <textarea ref=${ta} class="inp" rows="2" placeholder="Annotazioni" value=${nota} onInput=${e => setNota(e.target.value)}></textarea>
      <div class="hs-tools">
        ${SR_API && html`<button class=${'chip-btn' + (rec ? ' rec' : '')} onClick=${toggleRec}><${Icon} n=${rec ? 'stop' : 'mic'} s=${15} /> ${rec ? 'Stop' : 'Detta'}</button>`}
        ${base ? html`<span class="hs-base">${nota === base ? 'Dal report precedente (nero nel Word)' : 'Modificato: le righe nuove escono in rosso'}</span>` : null}
        <button class="btn link sm" style="margin-left:auto" onClick=${() => setOpen(false)}>Fatto</button>
      </div></div>`}
    ${view !== null && html`<${Viewer} ids=${linked.map(p => p.id)} index=${view} labelOf=${id => { const p = linked.find(x => x.id === id); return p && p.cap ? p.cap.slice(0, 40) : null; }} onClose=${() => setView(null)} />`}
  </div>`;
}

/* ---------------- sezioni ---------------- */
function hsSections(r) {
  if (r.formato === 'sintetico') return [
    { k: 'dati', l: 'Dati del report', ic: 'file' }, { k: 'anag', l: '2. Anagrafica immobile', ic: 'building' },
    ...HS_SINT_SEZ.map((s, i) => ({ k: 'c' + i, l: s.cap + '. ' + HS_SINT_TIT[s.cap], cap: s, ic: 'check' })),
    { k: 'descr', l: '8. Condizioni generali', ic: 'file' }, { k: 'azioni', l: '9. Azioni consigliate', ic: 'shield' },
    { k: 'foto', l: '10. Rilievo fotografico', ic: 'camera' }, { k: 'note', l: 'Appunti e allegati', ic: 'paper' }];
  return [
    { k: 'dati', l: 'Dati del report', ic: 'file' }, { k: 'anag', l: 'Anagrafica immobile', ic: 'building' }, { k: 'inq', l: 'Inquadramento e catasto', ic: 'map' },
    ...HS_SCHEDE.map((s, i) => ({ k: 's' + i, l: (i + 1) + '. ' + (s.s || s.l), sch: s, ic: 'check' })),
    { k: 'foto', l: 'Documentazione fotografica', ic: 'camera' }, { k: 'crit', l: 'Criticità e documenti mancanti', ic: 'shield' }, { k: 'note', l: 'Appunti e allegati', ic: 'paper' }];
}
function hsSecStato(r, s) {
  if (s.sch) { const d = r.schede[s.sch.k] || {}; return d.prio ? html`<span class=${'badge ' + (d.prio === 1 ? 'b-nc' : d.prio === 2 ? 'b-f1' : 'b-ok')}>P${d.prio}</span>` : hsSchedaFatta(d) ? html`<span class="badge b-ok">compilata</span>` : html`<span class="badge">da fare</span>`; }
  if (s.cap) { const n = hsCapFatti(r, s.cap), t = s.cap.items.length; return html`<span class=${'badge' + (n === t ? ' b-ok' : '')}>${n}/${t}</span>`; }
  if (s.k === 'foto') return html`<span class="badge">${(r.foto || []).length}</span>`;
  if (s.k === 'azioni') return html`<span class="badge">${(r.azioni || []).length}</span>`;
  if (s.k === 'crit') { const n = hsCriticita(r).length; return n ? html`<span class="badge b-nc">${n}</span>` : null; }
  return null;
}
// testi attuali come "base": servono per l'aggiornamento dell'anno successivo
function hsBaseOf(r) {
  const B = {};
  if (r.formato === 'sintetico') {
    (r.anS || []).forEach((v, i) => B['an.' + i] = v || ''); Object.entries(r.note || {}).forEach(([k, v]) => B['nt.' + k] = v || ''); B.descr = r.descr || '';
  } else {
    HS_SCHEDE.forEach(s => { const d = r.schede[s.k] || {}; if (s.subs) s.subs.forEach(sb => B['sch.' + s.k + '.' + sb] = (d.subs || {})[sb] || ''); else B['sch.' + s.k + '.sit'] = d.sit || ''; B['sch.' + s.k + '.mig'] = d.mig || ''; });
    B['an.descrizione'] = (r.an || {}).descrizione || ''; B.inquadramento = r.inquadramento || '';
  }
  (r.foto || []).forEach(p => B['cap.' + p.id] = p.cap || '');
  return B;
}
// nuovo report per il sopralluogo successivo: copia dati e testi (che diventano grigi) e duplica le foto
async function hsNextYear(r, records, settings) {
  const n = newHs(records, settings, r.formato);
  const copy = async id => { const b = id && await DB.getBlob(id); if (!b) return null; const nid = uid('b'); await DB.putBlob({ ...b, id: nid }); return nid; };
  const x = JSON.parse(JSON.stringify(r));
  const foto = [];
  for (const p of (x.foto || [])) { const id = await copy(p.id); if (id) foto.push({ ...p, id, g: 'prev', ts: p.ts || '' }); }
  const img = {}; for (const [k, v] of Object.entries(x.img || {})) { const id = await copy(v); if (id) img[k] = id; }
  const cgFoto = []; for (const o of (x.cgFoto || [])) { const id = await copy(o.id); if (id) cgFoto.push({ ...o, id }); }
  const out = { ...x, id: n.id, codice: n.codice, createdAt: Date.now(), updatedAt: Date.now(), data: today(), tecnico: n.tecnico,
    visite: hsVisite(r), foto, img, cgFoto, appunti: '', fotoAppunti: [], documenti: [], azioni: (x.azioni || []).map(a => ({ ...a, b: { cod: a.cod, sit: a.sit, risk: a.risk, grav: a.grav, az: a.az } })) };
  out.meta = { ...x.meta, presenti: '', emissione: '', redatto: n.meta.redatto };
  out.base = hsBaseOf({ ...out, foto });
  return out;
}

function HsForm({ rec: initial, records, settings, onSave, onDelete, onSettings, embedded, onClose, onOpenNew }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [sec, setSec] = useState(null);
  const [grigio, setGrigio] = useState(true);
  const [busy, setBusy] = useState(null);
  const [hasTpl, setHasTpl] = useState(null);
  const root = useRef(); const imp = useRef();
  const secs = hsSections(r);
  const cur = secs.findIndex(s => s.k === sec);
  const S = cur >= 0 ? secs[cur] : null;
  const tplKey = TEMPLATES[r.formato === 'sintetico' ? 'hs_sintetico.docx' : 'hs_esteso.docx'].key;
  useEffect(() => { DB.get(tplKey).then(b => setHasTpl(!!b)); }, [tplKey]);
  useEffect(() => { const c = root.current; if (c) c.scrollTop = 0; }, [sec]);
  const B = r.base || {};
  const setM = patch => up(p => ({ ...p, meta: { ...p.meta, ...patch } }));
  const setImg = (k, id) => up(p => ({ ...p, img: { ...(p.img || {}), [k]: id || undefined } }));
  const setSch = (k, patch) => up(p => ({ ...p, schede: { ...p.schede, [k]: { ...p.schede[k], ...patch } } }));
  const go = d => setSec(cur + d < 0 ? null : cur + d >= secs.length ? null : secs[cur + d].k);

  const doImport = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    setBusy('imp');
    try {
      let d;
      if (/\.json$/i.test(f.name)) d = await hsReadOldJson(JSON.parse(await f.text()));
      else if (/\.docx$/i.test(f.name)) d = await hsReadDocx(await f.arrayBuffer());
      else throw new Error('scegli un file .docx (non .doc o PDF) oppure il .json della vecchia app');
      if (d.formato !== r.formato && !confirm(`Il file è un report ${HS_FMT[d.formato]}: l’attività passa al formato ${HS_FMT[d.formato]}. Continuare?`)) { setBusy(null); return; }
      if (!hsIsEmpty(r) && !confirm('I testi dell’attività vengono sostituiti da quelli del file. Continuare?')) { setBusy(null); return; }
      const n = await hsApplyImport(r, d, (k, t) => _progress({ title: 'Importo il report', text: `Immagini ${k} di ${t}`, done: k, total: t }));
      _progress(null);
      up(() => n);
      toast(`Importato: ${(n.foto || []).filter(p => p.g === 'prev').length} foto nel sopralluogo precedente`);
    } catch (err) { _progress(null); fail('Import non riuscito', err, recordTitle(r)); }
    setBusy(null);
  };
  const word = async () => {
    const name = hsFileBase(r) + '.docx';
    const h = await pickSave(name, 'Documento Word', DOCX_MIME, '.docx'); if (h === 'cancel') return;
    setBusy('docx');
    try {
      const blob = await hsBuildDocx(r, settings, { grigio, onStep: (n, t) => _progress({ title: 'Preparo il Word', text: `Foto ${n} di ${t}`, done: n, total: t }) });
      _progress(null); await saveOffice(h, blob, name);
    } catch (e) { _progress(null); fail('Word non creato', e, recordTitle(r)); }
    setBusy(null);
  };
  const nextYear = async () => {
    if (!confirm('Creo un nuovo report per il prossimo sopralluogo: testi e foto di questo diventano "sopralluogo precedente": nel nuovo Word restano neri, le novità escono in rosso. Continuare?')) return;
    setBusy('next'); try { onOpenNew(await hsNextYear(r, records, settings)); } catch (e) { fail('Nuovo report non creato', e); } setBusy(null);
  };
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);

  /* ---- indice ---- */
  const crit = hsCriticita(r);
  const sint = r.formato === 'sintetico';
  const indice = html`
    <div class="card-navy"><div class="sum3">
      ${sint ? html`<div><b>${HS_SINT_ALL.filter(it => r.risp[it.id]).length}<small>/${HS_VOCI}</small></b><span>voci compilate</span></div>
        <div><b class=${crit.some(c => c.p === 1) ? 'crit' : ''}>${(r.azioni || []).length}</b><span>azioni consigliate</span></div>`
      : html`<div><b>${HS_SCHEDE.filter(s => hsSchedaFatta(r.schede[s.k] || {})).length}<small>/${HS_SCHEDE.length}</small></b><span>schede</span></div>
        <div><b class=${crit.some(c => c.p === 1) ? 'crit' : ''}>${crit.filter(c => c.p === 1).length}</b><span>priorità 1</span></div>`}
      <div><b>${hsFotoReport(r).length}</b><span>foto nel report</span></div></div></div>
    ${!Object.keys(B).length && html`<div class="card alert-soft"><div class="optline" style="padding:0">
      <div class="t"><b>Parti dal report precedente</b><small>Carica il Word dell'anno scorso (o il .json della vecchia app): testi e foto diventano la base: nel nuovo Word quello che aggiungi o modifichi esce in rosso.</small></div>
      <button class="btn sm" disabled=${busy === 'imp'} onClick=${() => imp.current.click()}>${busy === 'imp' ? html`<div class="spin" />` : 'Importa'}</button></div></div>`}
    <div class="sec-h"><h3>Sezioni</h3><span class="hint">${HS_FMT[r.formato]}</span></div>
    <div class="list">${secs.map(s => html`<button class="rcard hs-sec" key=${s.k} onClick=${() => setSec(s.k)}>
      <div class="r1"><span class="ttl" style="margin:0;font-size:16px">${s.l}</span><span class="dt">${hsSecStato(r, s)}</span></div></button>`)}</div>
    <div class="sec-h"><h3>Word e archivio</h3></div>
    <div class="card">
      ${hasTpl === false && html`<div class="notice err" style="margin:0 0 10px">Manca il modello Word ${HS_FMT[r.formato]}: caricalo in Impostazioni → Modelli. <button class="btn link" onClick=${onSettings}>Apri</button></div>`}
      <div class="optline" style="padding-top:0"><div class="t"><b>Novità in rosso</b><small>Righe nuove o modificate in rosso, testo dell'anno precedente in nero</small></div><${Toggle} on=${grigio} set=${setGrigio} label="Testo precedente in grigio" /></div>
      <div class="stack" style="margin-top:6px">
        <button class="btn outline block" onClick=${upload}><${Icon} n="share" s=${18} /> ${OD.account ? 'Carica su OneDrive' : 'Invia foto e Word a OneDrive'}</button>
        <button class="btn block" disabled=${busy === 'imp'} onClick=${() => imp.current.click()}><${Icon} n="paper" s=${18} /> Importa report precedente (Word o JSON)</button>
        <button class="btn block" disabled=${busy === 'next'} onClick=${nextYear}><${Icon} n="plus" s=${18} /> Nuovo report per il prossimo sopralluogo</button>
        <button class="btn block" onClick=${() => exportRecords([r], settings)}><${Icon} n="archive" s=${18} /> Salva tutto in un file ZIP</button>
        <button class="btn danger block" onClick=${() => onDelete(r)}><${Icon} n="trash" s=${18} /> Elimina report</button>
      </div></div>`;

  /* ---- singola sezione ---- */
  let body = null;
  if (S && S.k === 'dati') body = sint ? html`<div class="card"><div class="grid2">
      <${Inp} label="Fondo" value=${r.meta.fondo} set=${v => setM({ fondo: v })} />
      <${Inp} label="Nome immobile" value=${r.sito} set=${v => up({ sito: v })} placeholder="es. codice immobile" />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} placeholder="Via, CAP Comune (Prov.)" />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} />
      <${Inp} label="Data sopralluogo" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} />
      <${Inp} label="Committente" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Emissione" value=${r.meta.emissione} set=${v => setM({ emissione: v })} placeholder=${'automatica: ' + meseAnno(r.data)} />
      <${Inp} label="Revisione" value=${r.meta.revisione} set=${v => setM({ revisione: v })} />
      <${Inp} label="Protocollo" value=${r.meta.protocollo} set=${v => setM({ protocollo: v })} />
      <${Inp} label="Redatto da" value=${r.meta.redatto} set=${v => setM({ redatto: v })} />
      <${Inp} label="Verificato da" value=${r.meta.verificato} set=${v => setM({ verificato: v })} />
      <${Inp} label="Approvato da" value=${r.meta.approvato} set=${v => setM({ approvato: v })} />
      <${Inp} cls="full" label="Il procuratore incaricato (firma)" value=${r.meta.firma} set=${v => setM({ firma: v })} />
    </div><div class="divider"></div><${ImgSlot} label="Foto di copertina" id=${(r.img || {}).copertina} set=${id => setImg('copertina', id)} crop /></div>`
  : html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Nome del sito" value=${r.sito} set=${v => up({ sito: v })} />
      <${Inp} cls="full" label="Indirizzo immobile" value=${r.indirizzo} set=${v => up({ indirizzo: v })} />
      <${Inp} label="Comune (piè di pagina)" value=${r.citta} set=${v => up({ citta: v })} />
      <${Inp} label="Data sopralluogo" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} cls="full" label="Presenti al sopralluogo" value=${r.meta.presenti} set=${v => setM({ presenti: v })} />
      <${Inp} label="Proprietà" value=${r.meta.proprieta} set=${v => setM({ proprieta: v })} />
      <${Inp} label="Committente" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} />
      <${Inp} label="Protocollo" value=${r.meta.protocollo} set=${v => setM({ protocollo: v })} />
      <${Inp} label="Redatto da" value=${r.meta.redatto} set=${v => setM({ redatto: v })} />
      <${Inp} label="Verificato da" value=${r.meta.verificato} set=${v => setM({ verificato: v })} />
      <${Inp} label="Revisione" value=${r.meta.revisione} set=${v => setM({ revisione: v })} />
      <${Inp} label="Superficie immobile" value=${r.meta.superficie} set=${v => setM({ superficie: v })} placeholder="es. circa 30.000 mq" />
    </div><div class="divider"></div>
    <${ImgSlot} label="Foto di copertina" id=${(r.img || {}).copertina} set=${id => setImg('copertina', id)} />
    <div style="height:12px"></div><${ImgSlot} label="Firma / timbro (copertina)" id=${(r.img || {}).firma} set=${id => setImg('firma', id)} /></div>
    <div class="sec-h"><h3>Sopralluoghi precedenti</h3><span class="hint">nel Word con quello di oggi</span></div>
    <div class="card tight">${(r.visite || []).map((v, i) => html`<div class="row" key=${i} style="margin-bottom:8px">
        <input class="inp" style="max-width:150px" value=${v.data} placeholder="Data" onInput=${e => up(p => ({ ...p, visite: p.visite.map((x, j) => j === i ? { ...x, data: e.target.value } : x) }))} />
        <input class="inp" value=${v.presenti} placeholder="Presenti" onInput=${e => up(p => ({ ...p, visite: p.visite.map((x, j) => j === i ? { ...x, presenti: e.target.value } : x) }))} />
        <button class="x" aria-label="Elimina" onClick=${() => up(p => ({ ...p, visite: p.visite.filter((_, j) => j !== i) }))}>×</button></div>`)}
      <button class="btn dashed" onClick=${() => up(p => ({ ...p, visite: [...(p.visite || []), { data: '', presenti: '' }] }))}>+ Aggiungi sopralluogo precedente</button></div>`;
  else if (S && S.k === 'anag') body = sint ? html`<div class="card">${HS_SINT_AN.map((l, i) => i === 8 || i === 9
      ? html`<${HsText} key=${i} label=${l.replace(/:$/, '')} rows=${i === 8 ? 5 : 3} value=${r.anS[i]} base=${B['an.' + i]} set=${v => up(p => ({ ...p, anS: p.anS.map((x, j) => j === i ? v : x) }))} />`
      : html`<label class="fld" key=${i} style="margin-bottom:10px"><span>${l.replace(/:$/, '')}</span><input value=${r.anS[i] || ''} placeholder=${i === 0 ? r.indirizzo : i === 7 ? fmtD(r.data) : ''} onInput=${e => { const v = e.target.value; up(p => ({ ...p, anS: p.anS.map((x, j) => j === i ? v : x) })); }} /></label>`)}</div>`
    : html`<div class="card"><div class="grid2">${HS_AN_KEYS.filter(([k]) => k !== 'descrizione').map(([k, l]) => HS_AN_OPT[k]
        ? html`<label class="fld" key=${k}><span>${l}</span><select value=${r.an[k] || ''} onChange=${e => up(p => ({ ...p, an: { ...p.an, [k]: e.target.value } }))}>
            ${[...new Set([...HS_AN_OPT[k], r.an[k] || ''])].map(o => html`<option value=${o}>${o || '—'}</option>`)}</select></label>`
        : html`<${Inp} key=${k} label=${l} value=${r.an[k]} set=${v => up(p => ({ ...p, an: { ...p.an, [k]: v } }))} />`)}</div>
      <div class="divider"></div><${HsText} label="Descrizione sintetica dell'immobile" value=${r.an.descrizione} base=${B['an.descrizione']} set=${v => up(p => ({ ...p, an: { ...p.an, descrizione: v } }))} /></div>`;
  else if (S && S.k === 'inq') body = html`<div class="card"><${HsText} label="Inquadramento" value=${r.inquadramento} base=${B.inquadramento} set=${v => up({ inquadramento: v })} placeholder="Ubicazione, accessi, organizzazione del complesso…" />
      <div class="divider"></div><${ImgSlot} label="Ubicazione dell'immobile (estratto cartografico)" id=${(r.img || {}).mappa} set=${id => setImg('mappa', id)} />
      <div style="height:12px"></div><${ImgSlot} label="Fotografia aerea di inquadramento" id=${(r.img || {}).aerea} set=${id => setImg('aerea', id)} /></div>
    <div class="sec-h"><h3>Riferimenti catastali</h3></div>
    <div class="card"><${ImgSlot} label="Planimetria catastale 1" id=${(r.img || {}).catasto1} set=${id => setImg('catasto1', id)} />
      <div style="height:12px"></div><${ImgSlot} label="Planimetria catastale 2" id=${(r.img || {}).catasto2} set=${id => setImg('catasto2', id)} />
      <div class="divider"></div><div class="fld"><span>Catasto fabbricati</span></div>
      ${(r.catFab || []).map((c, i) => html`<div class="row" key=${i} style="margin-top:6px">${['foglio', 'particella', 'sub', 'categoria'].map(k => html`<input class="inp" placeholder=${k[0].toUpperCase() + k.slice(1)} value=${c[k]} onInput=${e => up(p => ({ ...p, catFab: p.catFab.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x) }))} />`)}
        <button class="x" aria-label="Elimina" onClick=${() => up(p => ({ ...p, catFab: p.catFab.filter((_, j) => j !== i) }))}>×</button></div>`)}
      <button class="btn dashed" style="margin-top:8px" onClick=${() => up(p => ({ ...p, catFab: [...(p.catFab || []), { foglio: '', particella: '', sub: '', categoria: '' }] }))}>+ Riga catasto fabbricati</button>
      <div class="fld" style="margin-top:14px"><span>Catasto terreni</span></div>
      ${(r.catTer || []).map((c, i) => html`<div class="row" key=${i} style="margin-top:6px"><input class="inp" style="max-width:110px" placeholder="Foglio" value=${c.foglio} onInput=${e => up(p => ({ ...p, catTer: p.catTer.map((x, j) => j === i ? { ...x, foglio: e.target.value } : x) }))} />
        <input class="inp" placeholder="Mappali (es. 953, 1181)" value=${c.mappale} onInput=${e => up(p => ({ ...p, catTer: p.catTer.map((x, j) => j === i ? { ...x, mappale: e.target.value } : x) }))} />
        <button class="x" aria-label="Elimina" onClick=${() => up(p => ({ ...p, catTer: p.catTer.filter((_, j) => j !== i) }))}>×</button></div>`)}
      <button class="btn dashed" style="margin-top:8px" onClick=${() => up(p => ({ ...p, catTer: [...(p.catTer || []), { foglio: '', mappale: '' }] }))}>+ Riga catasto terreni</button></div>`;
  else if (S && S.sch) {
    const s = S.sch, d = r.schede[s.k] || hsEmptyScheda(s);
    const riform = target => (sit, mig) => setSch(s.k, { ...(target ? { subs: { ...d.subs, [target]: sit } } : { sit }), mig: mig ? ((d.mig || '').replace(/\s+$/, '') + (d.mig && d.mig.trim() ? '\n' : '') + mig) : d.mig });
    body = html`<div class="card">
      ${s.subs ? s.subs.map(sb => html`<${HsText} key=${sb} label=${sb} rows=${5} gruppo="Situazione rilevata" value=${(d.subs || {})[sb]} base=${B['sch.' + s.k + '.' + sb]}
          set=${v => setSch(s.k, { subs: { ...d.subs, [sb]: v } })} onRiformula=${riform(sb)} placeholder=${'Cosa hai osservato: ' + sb.toLowerCase()} />`)
        : html`<${HsText} label="Situazione rilevata" rows=${7} gruppo="Situazione rilevata" value=${d.sit} base=${B['sch.' + s.k + '.sit']} set=${v => setSch(s.k, { sit: v })} onRiformula=${riform(null)} placeholder="Cosa hai osservato in sito…" />`}
      <div class="divider"></div>
      <${HsText} label="Attività di miglioramento" rows=${5} gruppo="Attività di miglioramento" value=${d.mig} base=${B['sch.' + s.k + '.mig']} set=${v => setSch(s.k, { mig: v })} placeholder="Vuoto = «Nessuna azione necessaria»" /></div>
    <div class="sec-h"><h3>Rischio</h3></div>
    <div class="card">
      <div class="fld"><span>Priorità di intervento</span></div>
      <div class="seg tall" style="margin-top:6px">${[1, 2, 3].map(n => html`<button class=${d.prio === n ? 'on' : ''} onClick=${() => setSch(s.k, { prio: d.prio === n ? null : n })}><b><i class="mdot" style=${'background:' + (n === 1 ? 'var(--danger)' : n === 2 ? 'var(--warn)' : 'var(--ok)')}></i> ${n}</b><small>${HS_PRIO[n]}</small></button>`)}</div>
      <div class="grid2" style="margin-top:12px">
        <label class="fld"><span>Natura del rischio</span><select value=${d.natura} onChange=${e => setSch(s.k, { natura: e.target.value })}>${[...new Set([...HS_NATURA, d.natura || ''])].map(o => html`<option value=${o}>${o || '—'}</option>`)}</select></label>
        <${Inp} label="Costo indicativo" value=${d.costo} set=${v => setSch(s.k, { costo: v })} placeholder="es. € 2.000 – 3.000" />
        <${Inp} label="ID rischio" value=${d.idr} set=${v => setSch(s.k, { idr: v })} placeholder="facoltativo" />
        <${Inp} label="Termine di completamento" value=${d.termine} set=${v => setSch(s.k, { termine: v })} placeholder="es. entro 6 mesi" />
      </div>
      <div class="fld" style="margin-top:12px"><span>Competenza</span></div>
      <div class="row" style="margin-top:6px">
        <label class="hsg-inc"><input type="checkbox" checked=${d.cProp} onChange=${e => setSch(s.k, { cProp: e.target.checked })} /> Proprietà</label>
        <label class="hsg-inc"><input type="checkbox" checked=${d.cCond} onChange=${e => setSch(s.k, { cCond: e.target.checked })} /> Conduttore</label></div>
    </div>`;
  }
  else if (S && S.cap) {
    let grp = null;
    const groups = [];
    S.cap.items.forEach(it => { if (it.grp !== grp) { grp = it.grp; groups.push({ grp, items: [] }); } groups[groups.length - 1].items.push(it); });
    body = html`<div>${groups.map(g => html`<div key=${g.grp}>
      <div class="sec-h" style="margin-top:16px"><h3>${g.grp}</h3><span class="hint">${g.items.filter(it => r.risp[it.id]).length}/${g.items.length}</span></div>
      <div class="card ck-list">${g.items.map(it => html`<${HsCheck} key=${it.id} it=${it} r=${r} up=${up} base=${B['nt.' + it.id]} />`)}</div>
    </div>`)}</div>`;
  }
  else if (S && S.k === 'descr') body = html`<div class="card"><${HsText} label="Condizioni generali dell'immobile" rows=${10} value=${r.descr} base=${B.descr} set=${v => up({ descr: v })} /></div>
    <div class="sec-h"><h3>Foto di inquadramento</h3><span class="hint">Sotto il capitolo 8</span></div>
    <div class="card"><${PhotoStrip} ids=${(r.cgFoto || []).map(o => o.id)} max=${8} onAdd=${ids => up(q => ({ ...q, cgFoto: [...(q.cgFoto || []), ...ids.map(id => ({ id, w: 16, h: 11 }))] }))}
      onRemove=${async id => { await removeBlob(id); up(q => ({ ...q, cgFoto: (q.cgFoto || []).filter(o => o.id !== id) })); }} />
      <p class="lead" style="margin:8px 0 0;font-size:13px">Restano nel report anche nei sopralluoghi successivi.</p></div>`;
  else if (S && S.k === 'azioni') body = html`<div>
    ${(r.azioni || []).map((a, i) => { const set = patch => up(p => ({ ...p, azioni: p.azioni.map((x, j) => j === i ? { ...x, ...patch } : x) })); return html`<div class="card" key=${i}>
      <div class="row"><label class="fld" style="max-width:120px"><span>Codice</span><input class="mono" list="hs-codes" value=${a.cod} onInput=${e => set({ cod: e.target.value })} placeholder="es. 3.2" /></label>
        <div class="tb-grow"></div><button class="x" aria-label="Elimina azione" onClick=${() => confirm('Eliminare l\'azione?') && up(p => ({ ...p, azioni: p.azioni.filter((_, j) => j !== i) }))}>×</button></div>
      <label class="fld" style="margin-top:10px"><span>Situazione rilevata</span><textarea rows="3" value=${a.sit} onInput=${e => set({ sit: e.target.value })}></textarea></label>
      <label class="fld" style="margin-top:10px"><span>Rischio evidenziato</span><textarea rows="2" value=${a.risk} onInput=${e => set({ risk: e.target.value })}></textarea></label>
      <div class="fld" style="margin-top:10px"><span>Gravità</span></div>
      <div class="seg sm" style="margin-top:6px">${HS_GRAV.map(g => html`<button class=${a.grav === g ? 'on' : ''} onClick=${() => set({ grav: a.grav === g ? '' : g })}>${g}</button>`)}</div>
      <label class="fld" style="margin-top:10px"><span>Azioni consigliate / misure di prevenzione</span><textarea rows="3" value=${a.az} onInput=${e => set({ az: e.target.value })}></textarea></label>
    </div>`; })}
    <datalist id="hs-codes">${HS_SINT_ALL.map(it => html`<option value=${it.ref} label=${it.grp + ' – ' + it.txt} />`)}</datalist>
    ${!(r.azioni || []).length && html`<div class="card"><div class="empty" style="padding:16px">Nessuna azione: nel Word la tabella riporta «N.A.».</div></div>`}
    <button class="btn dashed" onClick=${() => up(p => ({ ...p, azioni: [...(p.azioni || []), { cod: '', sit: '', risk: '', grav: '', az: '', b: {} }] }))}>+ Aggiungi azione</button></div>`;
  else if (S && S.k === 'foto') body = html`<${HsGallery} r=${r} up=${up} items=${sint ? HS_SINT_ALL : null} />`;
  else if (S && S.k === 'crit') { const docs = hsDocMancanti(r); body = html`<div>
    <div class="sec-h"><h3>Priorità 1 e 2</h3><span class="hint">${crit.length}</span></div>
    <div class="list">${crit.length ? crit.map((c, i) => html`<div class="prow" key=${i}><span class=${'badge ' + (c.p === 1 ? 'b-nc' : 'b-f1')}>P${c.p}</span>
      <div class="t"><b>${c.t}</b><small>${[c.costo, c.termine].filter(Boolean).join(' · ') || (c.az || '').slice(0, 120)}</small></div></div>`) : html`<div class="prow"><div class="t"><small>Nessuna scheda con priorità 1 o 2.</small></div></div>`}</div>
    <div class="sec-h"><h3>Documenti da chiedere o verificare</h3><span class="hint">${docs.length}</span></div>
    <div class="list">${docs.length ? docs.slice(0, 40).map((x, i) => html`<div class="prow" key=${i}><div class="t"><b>${x.n}. ${x.s}</b><small style="white-space:normal">${x.f}</small></div></div>`) : html`<div class="prow"><div class="t"><small>Nessun documento segnalato come mancante nelle schede.</small></div></div>`}</div></div>`; }
  else if (S && S.k === 'note') body = html`<div class="card"><${HsText} label="Appunti (non vanno nel Word)" rows=${6} value=${r.appunti} set=${v => up({ appunti: v })} />
      <${NotePhotos} rec=${r} up=${up} /></div>
    <div class="sec-h"><h3>Documenti allegati</h3><span class="hint">restano sul dispositivo e vanno su OneDrive</span></div>
    <div class="card"><${FileList} items=${r.documenti || []} accept="application/pdf,image/*"
      onAdd=${d => up(p => ({ ...p, documenti: [...(p.documenti || []), d] }))}
      onRemove=${async d => { await removeBlob(d.blobId); up(p => ({ ...p, documenti: p.documenti.filter(x => x.id !== d.id) })); }} /></div>`;

  return html`<div class="content form" ref=${root}>
    <${DetailHead} eye=${'H&S · ' + HS_FMT[r.formato]} title=${S ? S.l : r.codice} sub=${S ? [r.codice, r.sito].filter(Boolean).join(' · ') : [r.commessa, r.cliente, placeAddr(r) || r.sito].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    ${S && html`<button class="btn link" style="margin:-8px 0 8px -4px" onClick=${() => setSec(null)}><${Icon} n="back" s=${18} /> Indice delle sezioni</button>`}
    ${S ? body : indice}
    <input ref=${imp} type="file" accept=".docx,.json,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onChange=${doImport} />
    <${ActionBar}>
      <${HsCam} up=${up} r=${r} big />
      ${S ? html`<button class="btn-icon lg" aria-label="Sezione precedente" onClick=${() => go(-1)}><${Icon} n="back" s=${22} /></button>
        <button class="btn pri" onClick=${() => go(1)}>${cur === secs.length - 1 ? 'Torna all\'indice' : 'Successiva'} <${Icon} n="right" s=${20} /></button>`
      : html`<button class="btn pri" disabled=${busy === 'docx'} onClick=${word}>${busy === 'docx' ? html`<div class="spin" />` : html`<${Icon} n="file" s=${20} />`} Genera Word</button>`}
    <//>
  </div>`;
}
