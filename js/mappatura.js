/* Modulo Mappatura MCA e FAV: come la Fase 2 della DDA, ma solo per censimenti/campionamenti
   MCA e FAV indipendenti da un fascicolo DDA completo (niente Fase 1, niente altre matrici). */

const MAP_MATS = MATS.filter(m => m.k === 'mca' || m.k === 'fav');

function newMappatura(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'mappatura' && (r.codice || '').startsWith('MAP-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('map'), type: 'mappatura', codice: `MAP-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', citta: '', indirizzo: '', sito: '', data: today(), tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(), tab: 'mca',
    campioni: emptyCampioni(), congelati: {}, schede: {}, planimetrie: [], appunti: '',
    recs: [], documenti: [], // vuoti: servono solo perché ZIP/OneDrive riusano lo stesso codice della DDA
  };
}
const mappaturaIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.fotoAppunti || []).length && !MAP_MATS.some(m => (r.campioni[m.k] || []).length) && !(r.planimetrie || []).length && !r.appunti && !(r.fogli || []).length && !ncOf(r).length;
// import di un'indagine precedente (JSON "dda-fase2", anche da una relazione di mappatura): solo MCA e FAV
async function importMappatura(json, rec) {
  let data;
  try { data = JSON.parse(json); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (data.type && data.type !== 'dda-fase2') throw new Error('il file non è un\'indagine precedente (DDA Fase 2 o mappatura)');
  const patch = {}; let n = 0;
  for (const k of ['commessa', 'cliente', 'citta', 'indirizzo', 'sito', 'appunti']) if (data[k] && !rec[k]) { patch[k] = String(data[k]); n++; }
  { const t = markImp({ imp: rec.imp }, patch, IMP_ANAG); if (t.imp) patch.imp = t.imp; }
  const x = await importPrecedente(data, rec, MAP_MATS); Object.assign(patch, x.patch);
  const pl = await importPlanimetrie(data.planimetrie, rec.planimetrie || []);
  if (pl.length) patch.planimetrie = [...(rec.planimetrie || []), ...pl];
  if (!n && !x.camp && !x.nc && !pl.length && !x.patch.numerazione) throw new Error('nessun dato nuovo da importare (i campi già compilati non vengono toccati)');
  return { patch, msg: 'Importati ' + [n && `${n} campi`, x.camp && `${x.camp} campioni precedenti`, x.nc && `${x.nc} NC`, pl.length && `${pl.length} ${pl.length === 1 ? 'planimetria' : 'planimetrie'}`].filter(Boolean).join(', ') };
}
const allCampMap = r => MAP_MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, k: m.k })));

/* ---------------- elenco ---------------- */
function MappaturaList({ records, open, create, activeId, acts }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'mappatura');
  const list = all.slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  list.forEach(r => { const c = r.cliente || 'Senza cliente', s = placeLabel(r); ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  const card = r => {
    const cs = allCampMap(r);
    const byM = MAP_MATS.filter(m => (r.campioni[m.k] || []).length).map(m => (r.campioni[m.k] || []).length + ' ' + m.l).join(', ');
    const lines = cs.slice(0, 3).map(c => {
      const m = MAP_MATS.find(x => x.k === c.k);
      return html`<div class="l"><span class="dot" style=${'background:' + m.c}></span><span><b>${c.codice || '—'}</b> ${c.descrizione}${c.quantita ? ' · ' + c.quantita : ''}</span></div>`;
    });
    const sch = Object.entries(r.schede || {}).map(([k, t]) => k.toUpperCase() + ' ' + new Date(t).toLocaleDateString('it-IT'));
    if (sch.length) lines.push(html`<div class="l" style="color:var(--ok)"><span class="dot" style="background:var(--ok)"></span><span>Scheda campioni: ${sch.join(', ')}</span></div>`);
    return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
      <div class="r1"><span class="id">${r.codice}</span>${r.drone && html`<${DroneIc} />`}<span class="dt">${fmtD(r.data)}</span></div>
      ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
      <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${cs.length} campioni${byM ? ' (' + byM + ')' : ''}</div>${lines}<${OdBadge} map=${od} r=${r} /></button>`;
  };
  return html`<div class="content">
    <${LargeTitle} top eye="MCA e FAV" title="Mappature" sub=${`${all.length} ${all.length === 1 ? 'censimento' : 'censimenti'}`} acts=${acts} />
    ${!list.length && html`<div class="empty"><b>Nessuna mappatura</b>Tocca + per iniziare un censimento o campionamento MCA/FAV.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">${rs.map(card)}</div></div>`)}</div>`)}
  </div>`;
}

/* ---------------- form ---------------- */
function MappaturaForm({ rec: initial, records, settings, onSave, onDelete, onSettings, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [busy, setBusy] = useState(null);
  const [openS, setOpenS] = useState({});
  const firmeOn = !!r.firme || (r.fogli || []).length > 0;
  const [T, setT] = useSchede('mappatura', firmeOn ? ['anag', 'camp', 'firme', 'file'] : ['anag', 'camp', 'file'], initial._new, { 's-': 'camp', 'plan-': 'camp' });

  const clienti = nomiClienti(records);
  const siti = [...new Set(records.filter(x => x.sito && (!r.cliente || x.cliente === r.cliente)).map(x => x.sito))];

  const tab = r.tab === 'fav' ? 'fav' : 'mca';
  const setTab = k => up({ tab: k });
  useEffect(() => { const h = e => { const c = allCampMap(r).find(x => 's-' + x.id === e.detail); if (c && c.k !== tab) setTab(c.k); }; addEventListener('nembo-goto', h); return () => removeEventListener('nembo-goto', h); }, [r]);
  const mat = MAP_MATS.find(m => m.k === tab);
  const camp = r.campioni[tab] || [];

  const renum = (k, list) => renumCamp(r, MAP_MATS.find(x => x.k === k), list);
  const nextCode = k => nextCampCode(r, MAP_MATS.find(x => x.k === k));
  const setCamp = (k, fn) => up(p => ({ ...p, campioni: { ...p.campioni, [k]: fn(p.campioni[k] || []) } }));
  const updCamp = (id, patch) => setCamp(tab, l => l.map(c => c.id === id ? { ...c, ...patch } : c));
  const lastPiano = () => { const l = r.campioni[tab] || []; return l.length ? l[l.length - 1].piano || '' : ''; };
  const addCamp = () => { const id = uid('c'); setCamp(tab, l => [...l, { id, codice: nextCode(tab), descrizione: '', quantita: '', piano: lastPiano(), ubicazione: '', data: today(), foto: [] }]); setOpenS({ [id]: true }); setTimeout(() => scrollToId('s-' + id), 80); };
  const delCamp = async c => {
    if (!confirm('Eliminare il campione ' + (c.codice || '') + '?')) return;
    for (const b of blobIds(c)) await removeBlob(b);
    setCamp(tab, l => renum(tab, l.filter(x => x.id !== c.id)));
  };

  const importInp = useRef();
  const doImport = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => importMappatura(rd.result, r).then(({ patch, msg }) => { up(patch); toast(msg); }).catch(err => fail('Import non riuscito', err));
    rd.readAsText(f);
  };

  const planLabels = campPlanLabels(r, MAP_MATS);
  const plans = r.planimetrie || [];
  const planSection = html`<div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3><span class="hint">Disegno ed etichette dei campioni</span></div>
    <div class="card"><${PlanList} items=${plans} labels=${planLabels}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>`;

  return html`<div class="content form">
    <${DetailHead} eye="Mappatura MCA e FAV" title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'camp', l: 'Campioni', n: allCampMap(r).length }, firmeOn && { k: 'firme', l: 'Firme', n: (r.fogli || []).length }, { k: 'file', l: 'File' }].filter(Boolean)} />
    ${T === 'anag' && html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa - progetto" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} placeholder="es. 000/26" />
      <${Inp} label="Cliente" req list="dl-cli-map" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via e numero civico" />
      <${Inp} label="Sito / codice immobile" list="dl-siti-map" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="Facoltativo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} drone=${r.drone} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div>
    <datalist id="dl-cli-map">${clienti.map(c => html`<option value=${c} />`)}</datalist>
    <datalist id="dl-siti-map">${siti.map(c => html`<option value=${c} />`)}</datalist></div>
    `}
    ${T === 'camp' && html`

    <${PrecSection} r=${r} onRicampiona=${c => { const m = MAP_MATS.find(x => x.k === c.k) || mat; const id = uid('c'); if (tab !== m.k) setTab(m.k);
      setCamp(m.k, l => [...l, { id, codice: nextCode(m.k), descrizione: c.descrizione || '', quantita: c.quantita || '', piano: c.piano || '', ubicazione: c.ubicazione || '', data: today(), foto: [] }]);
      setOpenS({ [id]: true }); setTimeout(() => scrollToId('s-' + id), 120); toast('Nuovo campione ' + nextCode(m.k) + ' da ' + c.codice); }} />
    <div class="sec-h"><h3>Campioni</h3><span class="hint">${r.congelati[tab] ? 'Codici bloccati dalla scheda' : precBase(r, mat.auto) ? `Prosegue dopo ${mat.auto}${precBase(r, mat.auto)}` : `Codici automatici ${mat.auto}1, ${mat.auto}2…`}</span></div>
    <${NumSection} r=${r} up=${up} mats=${MAP_MATS} />
    <${CampSummary} r=${r} mats=${MAP_MATS} />
    <div class="seg" style="margin-bottom:6px">${MAP_MATS.map(m => html`
      <button class=${tab === m.k ? 'on' : ''} onClick=${() => setTab(m.k)}><i class="mdot" style=${'background:' + m.c}></i>${m.l}<span class="n">${(r.campioni[m.k] || []).length}</span></button>`)}</div>
    ${!camp.length && html`<div class="card" style="margin-top:12px"><div class="empty" style="padding:18px">Nessun campione ${mat.l}.</div></div>`}
    ${byPiano(camp).map(([piano, list]) => html`<div key=${piano}>
      <div class="sec-h" style="margin-top:14px"><h3>${piano}</h3><span class="hint">${list.length}</span></div>
      <div class="list">${list.map(c => html`<${SampleRow} key=${c.id} c=${c} mat=${mat} open=${!!openS[c.id]} toggle=${() => setOpenS(o => ({ ...o, [c.id]: !o[c.id] }))}
        onPhoto=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}>
        <${CampFields} c=${c} list="dl-piani-m" upd=${patch => updCamp(c.id, patch)} codice=${html`<div class="code-auto" style=${'width:64px;flex-shrink:0;color:' + mat.c}>${c.codice}</div>`} />
        <div class="row">
          <input class="inp" type="date" style="max-width:180px" value=${c.data || ''} onInput=${e => updCamp(c.id, { data: e.target.value })} aria-label="Data prelievo" />
          <input class="inp" placeholder="Quantità (es. 180 mq)" value=${c.quantita || ''} onInput=${e => updCamp(c.id, { quantita: e.target.value })} aria-label="Quantità" />
        </div>
        <${PhotoStrip} ids=${c.foto || []} max=${4} onAdd=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}
          onRemove=${async id => { await removeBlob(id); updCamp(c.id, { foto: c.foto.filter(f => f !== id) }); }} />
        <button class="btn sm danger" style="justify-self:start" onClick=${() => delCamp(c)}>Elimina campione</button>
      <//>`)}</div></div>`)}
    <datalist id="dl-piani-m">${[...new Set([...allCampMap(r).map(c => c.piano).filter(Boolean), ...PIANI_COMUNI])].map(x => html`<option value=${x} />`)}</datalist>
    <button class="btn dashed" style="margin:10px 0 12px" onClick=${addCamp}>+ Aggiungi campione ${nextCode(tab)}</button>
    <${NcSection} r=${r} up=${up} mat=${mat} list="dl-piani-m" />
    <div style="height:12px"></div>

    ${planSection}

    ${!r.commessa && html`<div class="notice">Indica la commessa in alto: compare nell'intestazione della scheda.</div>`}


    <div class="sec-h"><h3>Appunti</h3></div>
    <div class="card"><${Area} rows=${4} value=${r.appunti} set=${v => up({ appunti: v })} placeholder="Note generali del censimento" />
      <${NotePhotos} rec=${r} up=${up} /></div>

    `}
    ${T === 'firme' && html`<${FogliFirme} r=${r} up=${up} settings=${settings} />`}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    <input ref=${importInp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${doImport} />
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { if (T !== 'camp') setT('camp'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${T === 'camp' ? html`<button class="btn pri" onClick=${addCamp}><${Icon} n="plus" s=${20} w=${2.4} /> Nuovo campione ${nextCode(tab)}</button>` : html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[['Documenti', [
        { ic: 'gear', l: 'Laboratorio, offerta, codici analisi', fn: onSettings },
        T !== 'anag' && { ic: 'share', l: OD.account ? 'Carica su OneDrive' : 'Invia a OneDrive', fn: () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings) }]],
        ['Dati', [
          { ic: 'file', l: 'Importa l’indagine precedente', s: 'JSON di Fase 2 o di mappatura: campioni MCA e FAV, NC e planimetrie', fn: () => importInp.current.click() },
          { ic: 'paper', l: 'Scarica il modello JSON', fn: downloadDda2Template }]],
        opzArchivio({ r, settings, onDelete, elimina: 'Elimina la mappatura', firme: !firmeOn && (() => { up(q => prepFirme({ ...q }, settings, true)); setT('firme'); }) })]} />
  </div>`;
}
