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
const mappaturaIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !(r.fotoAppunti || []).length && !MAP_MATS.some(m => (r.campioni[m.k] || []).length) && !(r.planimetrie || []).length && !r.appunti && !(r.fogli || []).length;
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
      <div class="r1"><span class="id">${r.codice}</span><span class="dt">${fmtD(r.data)}</span></div>
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
  const [T, setT] = useSchede('mappatura', firmeOn ? ['anag', 'camp', 'firme'] : ['anag', 'camp'], initial._new, { 's-': 'camp', 'plan-': 'camp' });

  const clienti = nomiClienti(records);
  const siti = [...new Set(records.filter(x => x.sito && (!r.cliente || x.cliente === r.cliente)).map(x => x.sito))];

  const tab = r.tab === 'fav' ? 'fav' : 'mca';
  const setTab = k => up({ tab: k });
  useEffect(() => { const h = e => { const c = allCampMap(r).find(x => 's-' + x.id === e.detail); if (c && c.k !== tab) setTab(c.k); }; addEventListener('nembo-goto', h); return () => removeEventListener('nembo-goto', h); }, [r]);
  const mat = MAP_MATS.find(m => m.k === tab);
  const camp = r.campioni[tab] || [];

  const renum = (k, list) => { const m = MAP_MATS.find(x => x.k === k); return (!m.auto || r.congelati[k]) ? list : list.map((c, i) => ({ ...c, codice: m.auto + (i + 1) })); };
  const nextCode = k => { const m = MAP_MATS.find(x => x.k === k); const l = r.campioni[k] || []; if (!r.congelati[k]) return m.auto + (l.length + 1); return m.auto + (l.map(c => +c.codice.slice(1) || 0).reduce((a, b) => Math.max(a, b), 0) + 1); };
  const setCamp = (k, fn) => up(p => ({ ...p, campioni: { ...p.campioni, [k]: fn(p.campioni[k] || []) } }));
  const updCamp = (id, patch) => setCamp(tab, l => l.map(c => c.id === id ? { ...c, ...patch } : c));
  const lastPiano = () => { const l = r.campioni[tab] || []; return l.length ? l[l.length - 1].piano || '' : ''; };
  const addCamp = () => { const id = uid('c'); setCamp(tab, l => [...l, { id, codice: nextCode(tab), descrizione: '', quantita: '', piano: lastPiano(), data: today(), foto: [] }]); setOpenS({ [id]: true }); setTimeout(() => scrollToId('s-' + id), 80); };
  const delCamp = async c => {
    if (!confirm('Eliminare il campione ' + (c.codice || '') + '?')) return;
    for (const b of blobIds(c)) await removeBlob(b);
    setCamp(tab, l => renum(tab, l.filter(x => x.id !== c.id)));
  };

  const planLabels = MAP_MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ref: c.id, text: c.codice || m.l, color: m.h })));
  const plans = r.planimetrie || [];
  const planSection = html`<div class="sec-h" id=${'plan-' + r.id}><h3>Planimetrie</h3><span class="hint">Disegno ed etichette dei campioni</span></div>
    <div class="card"><${PlanList} items=${plans} labels=${planLabels}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>`;

  const scheda = async k => {
    const list = r.campioni[k] || []; if (!list.length) return;
    setBusy(k);
    try {
      const s = settings;
      const bytes = await PdfGen.schedaCampioniPdf(await loadTemplate('scheda_campioni.pdf'), {
        commessa: r.commessa, sito: placeDoc(r), campioni: list,
        analisi: k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc },
        lab: { nome: s.labNome, r1: s.labR1, r2: s.labR2 }, offerta: s.offerta, offertaRev: s.offertaRev, email: s.emailReferti,
        prelevatoDa: s.prelevatoDa, verificatoDa: s.verificatoDa,
      });
      up(p => ({ ...p, congelati: { ...p.congelati, [k]: true }, schede: { ...p.schede, [k]: Date.now() } }));
      const name = `Scheda_campioni_${k.toUpperCase()}_${slug(r.commessa || r.codice)}.pdf`;
      await shareFiles([{ blob: new Blob([bytes], { type: 'application/pdf' }), name }], name);
    } catch (e) { fail('PDF non creato', e); }
    setBusy(null);
  };
  const xlsx = async k => {
    const name = `Scheda_campioni_${k.toUpperCase()}_${slug(r.commessa || r.codice)}.xlsx`;
    const h = await pickSave(name, 'Cartella di lavoro Excel', XLSX_MIME, '.xlsx'); if (h === 'cancel') return;
    setBusy('x' + k);
    try { await saveOffice(h, await schedaCampioniXlsx(r, k, settings), name); } catch (e) { fail('Excel non creato', e); }
    setBusy(null);
  };
  const riepilogo = async () => {
    const name = `Riepilogo_campioni_${slug(r.commessa || r.codice)}.docx`;
    const h = await pickSave(name, 'Documento Word', DOCX_MIME, '.docx'); if (h === 'cancel') return;
    setBusy('docx'); toast('Preparo il riepilogo con le foto…');
    try { await saveOffice(h, await riepilogoCampioniDocx(r, settings), name); } catch (e) { fail('Word non creato', e); }
    setBusy(null);
  };

  return html`<div class="content form">
    <${DetailHead} eye="Mappatura MCA e FAV" title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r)].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${setT} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'camp', l: 'Campioni', n: allCampMap(r).length }, firmeOn && { k: 'firme', l: 'Firme', n: (r.fogli || []).length }].filter(Boolean)} />
    ${T === 'anag' && html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa - progetto" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} placeholder="es. 000/26" />
      <${Inp} label="Cliente" req list="dl-cli-map" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via e numero civico" />
      <${Inp} label="Sito / codice immobile" list="dl-siti-map" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="Facoltativo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div>
    <datalist id="dl-cli-map">${clienti.map(c => html`<option value=${c} />`)}</datalist>
    <datalist id="dl-siti-map">${siti.map(c => html`<option value=${c} />`)}</datalist></div>
    `}
    ${T === 'camp' && html`

    <div class="sec-h"><h3>Campioni</h3><span class="hint">${r.congelati[tab] ? 'Codici bloccati dalla scheda' : `Codici automatici ${mat.auto}1, ${mat.auto}2…`}</span></div>
    <${CampSummary} r=${r} mats=${MAP_MATS} />
    <div class="seg" style="margin-bottom:6px">${MAP_MATS.map(m => html`
      <button class=${tab === m.k ? 'on' : ''} onClick=${() => setTab(m.k)}><i class="mdot" style=${'background:' + m.c}></i>${m.l}<span class="n">${(r.campioni[m.k] || []).length}</span></button>`)}</div>
    ${!camp.length && html`<div class="card" style="margin-top:12px"><div class="empty" style="padding:18px">Nessun campione ${mat.l}.</div></div>`}
    ${byPiano(camp).map(([piano, list]) => html`<div key=${piano}>
      <div class="sec-h" style="margin-top:14px"><h3>${piano}</h3><span class="hint">${list.length}</span></div>
      <div class="list">${list.map(c => html`<${SampleRow} key=${c.id} c=${c} mat=${mat} open=${!!openS[c.id]} toggle=${() => setOpenS(o => ({ ...o, [c.id]: !o[c.id] }))}
        onPhoto=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}>
        <div class="row"><div class="code-auto" style=${'width:64px;flex-shrink:0;color:' + mat.c}>${c.codice}</div>
          <input class="inp" list="dl-piani-m" placeholder="Piano" value=${c.piano || ''} onInput=${e => updCamp(c.id, { piano: e.target.value })} aria-label="Piano" /></div>
        <textarea class="inp" rows="2" placeholder="Descrizione campione" value=${c.descrizione} onInput=${e => updCamp(c.id, { descrizione: e.target.value })}></textarea>
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

    ${planSection}

    ${r.schede[tab] && html`<div class="lock" style="margin:8px 2px;color:var(--ok)">Scheda generata il ${new Date(r.schede[tab]).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</div>`}
    ${!r.commessa && html`<div class="notice">Indica la commessa in alto: compare nell'intestazione della scheda.</div>`}


    <div class="sec-h"><h3>Appunti</h3></div>
    <div class="card"><${Area} rows=${4} value=${r.appunti} set=${v => up({ appunti: v })} placeholder="Note generali del censimento" />
      <${NotePhotos} rec=${r} up=${up} /></div>

    `}
    ${T === 'firme' && html`<${FogliFirme} r=${r} up=${up} settings=${settings} />`}
    <${BarraAtt} r=${r} settings=${settings}
      left=${html`<button class="btn-icon lg" aria-label="Planimetrie" title="Planimetrie" onClick=${() => { if (T !== 'camp') setT('camp'); setTimeout(() => scrollToId('plan-' + r.id), 120); }}><${Icon} n="map" s=${22} /></button>`}
      center=${T === 'camp' ? html`<button class="btn pri" onClick=${addCamp}><${Icon} n="plus" s=${20} w=${2.4} /> Nuovo campione ${nextCode(tab)}</button>` : html`<${OdBtn} r=${r} settings=${settings} />`}
      gruppi=${[['Documenti', [
        ...MAP_MATS.filter(m => (r.campioni[m.k] || []).length).flatMap(m => [
          { ic: 'file', l: (r.schede[m.k] ? 'Rigenera' : 'Genera') + ' la scheda campioni ' + m.l, s: r.campioni[m.k].length + ' campioni · PDF per il laboratorio', fn: () => scheda(m.k) },
          { ic: 'file', l: 'Scheda campioni ' + m.l + ' in Excel', fn: () => xlsx(m.k) }]),
        allCampMap(r).length > 0 && { ic: 'file', l: 'Riepilogo campioni (Word)', fn: riepilogo },
        { ic: 'gear', l: 'Laboratorio, offerta, codici analisi', fn: onSettings },
        T !== 'anag' && { ic: 'share', l: OD.account ? 'Carica su OneDrive' : 'Invia a OneDrive', fn: () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings) }]],
        opzArchivio({ r, settings, onDelete, elimina: 'Elimina la mappatura', firme: !firmeOn && (() => { up(q => prepFirme({ ...q }, settings, true)); setT('firme'); }) })]} />
  </div>`;
}
