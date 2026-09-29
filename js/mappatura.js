/* Modulo Mappatura MCA e FAV: come la Fase 2 della DDA, ma solo per censimenti/campionamenti
   MCA e FAV indipendenti da un fascicolo DDA completo (niente Fase 1, niente altre matrici). */

const MAP_MATS = MATS.filter(m => m.k === 'mca' || m.k === 'fav');

function newMappatura(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'mappatura' && (r.codice || '').startsWith('MAP-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('map'), type: 'mappatura', codice: `MAP-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', sito: '', data: today(), tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(), tab: 'mca',
    campioni: emptyCampioni(), congelati: {}, schede: {}, planimetrie: [], appunti: '',
    recs: [], documenti: [], // vuoti: servono solo perché ZIP/OneDrive riusano lo stesso codice della DDA
  };
}
const mappaturaIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !MAP_MATS.some(m => (r.campioni[m.k] || []).length) && !(r.planimetrie || []).length && !r.appunti;
const allCampMap = r => MAP_MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, k: m.k })));

/* ---------------- elenco ---------------- */
function MappaturaList({ records, open, create, activeId }) {
  const all = records.filter(r => r.type === 'mappatura');
  const list = all.slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  list.forEach(r => { const c = r.cliente || 'Senza cliente', s = r.sito || 'Sito da indicare'; ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  const card = r => {
    const cs = allCampMap(r);
    const byM = MAP_MATS.filter(m => (r.campioni[m.k] || []).length).map(m => (r.campioni[m.k] || []).length + ' ' + m.l).join(', ');
    const lines = cs.slice(0, 3).map(c => {
      const m = MAP_MATS.find(x => x.k === c.k);
      return html`<div class="l"><span class="dot" style=${'background:' + m.c}></span><span><b>${c.codice || '—'}</b> ${c.descrizione}${c.quantita ? ' · ' + c.quantita : ''}</span></div>`;
    });
    const sch = Object.entries(r.schede || {}).map(([k, t]) => k.toUpperCase() + ' ' + new Date(t).toLocaleDateString('it-IT'));
    if (sch.length) lines.push(html`<div class="l" style="color:var(--ok)"><span class="dot" style="background:var(--ok)"></span><span>Scheda campioni: ${sch.join(', ')}</span></div>`);
    return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '')} key=${r.id} onClick=${() => open(r.id)}>
      <div class="r1"><span class="id">${r.codice}</span><span class="dt">${fmtD(r.data)}</span></div>
      ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
      <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${cs.length} campioni${byM ? ' (' + byM + ')' : ''}</div>${lines}</button>`;
  };
  return html`<div class="content">
    <h2>Mappatura MCA e FAV</h2><p class="lead">${all.length} ${all.length === 1 ? 'censimento' : 'censimenti'}</p>
    ${!list.length && html`<div class="empty"><b>Nessuna mappatura</b>Tocca + per iniziare un censimento o campionamento MCA/FAV.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">${rs.map(card)}</div></div>`)}</div>`)}
    <div class="fbar"><button class="fab" aria-label="Nuova mappatura" onClick=${create}><${Icon} n="plus" s=${21} w=${2.4} /></button></div>
  </div>`;
}

/* ---------------- form ---------------- */
function MappaturaForm({ rec: initial, records, settings, onSave, onDelete, onSettings, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [busy, setBusy] = useState(null);
  useEffect(() => { if (!embedded) header(r.codice, saved ? 'Salvato' : 'Salvataggio…'); }, [r.codice, saved, embedded]);

  const clienti = [...new Set(records.filter(x => x.cliente).map(x => x.cliente))];
  const siti = [...new Set(records.filter(x => x.sito && (!r.cliente || x.cliente === r.cliente)).map(x => x.sito))];

  const tab = r.tab === 'fav' ? 'fav' : 'mca';
  const setTab = k => up({ tab: k });
  const mat = MAP_MATS.find(m => m.k === tab);
  const camp = r.campioni[tab] || [];

  const renum = (k, list) => { const m = MAP_MATS.find(x => x.k === k); return (!m.auto || r.congelati[k]) ? list : list.map((c, i) => ({ ...c, codice: m.auto + (i + 1) })); };
  const nextCode = k => { const m = MAP_MATS.find(x => x.k === k); const l = r.campioni[k] || []; if (!r.congelati[k]) return m.auto + (l.length + 1); return m.auto + (l.map(c => +c.codice.slice(1) || 0).reduce((a, b) => Math.max(a, b), 0) + 1); };
  const setCamp = (k, fn) => up(p => ({ ...p, campioni: { ...p.campioni, [k]: fn(p.campioni[k] || []) } }));
  const updCamp = (id, patch) => setCamp(tab, l => l.map(c => c.id === id ? { ...c, ...patch } : c));
  const addCamp = () => setCamp(tab, l => [...l, { id: uid('c'), codice: nextCode(tab), descrizione: '', quantita: '', data: r.data, foto: [] }]);
  const delCamp = async c => {
    if (!confirm('Eliminare il campione ' + (c.codice || '') + '?')) return;
    for (const b of blobIds(c)) await removeBlob(b);
    setCamp(tab, l => renum(tab, l.filter(x => x.id !== c.id)));
  };

  const planLabels = MAP_MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ref: c.id, text: c.codice || m.l, color: m.h })));
  const plans = r.planimetrie || [];
  const planSection = html`<div class="sec-h"><h3>Planimetrie</h3><span class="hint">Disegno ed etichette dei campioni</span></div>
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
        commessa: r.commessa, sito: r.sito, campioni: list,
        analisi: k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc },
        lab: { nome: s.labNome, r1: s.labR1, r2: s.labR2 }, offerta: s.offerta, offertaRev: s.offertaRev, email: s.emailReferti,
        prelevatoDa: s.prelevatoDa, verificatoDa: s.verificatoDa,
      });
      up(p => ({ ...p, congelati: { ...p.congelati, [k]: true }, schede: { ...p.schede, [k]: Date.now() } }));
      const name = `Scheda_campioni_${k.toUpperCase()}_${slug(r.commessa || r.codice)}.pdf`;
      await shareFiles([{ blob: new Blob([bytes], { type: 'application/pdf' }), name }], name);
    } catch (e) { toast('PDF non creato: ' + e.message); console.error(e); }
    setBusy(null);
  };
  const xlsx = async k => {
    const name = `Scheda_campioni_${k.toUpperCase()}_${slug(r.commessa || r.codice)}.xlsx`;
    const h = await pickSave(name, 'Cartella di lavoro Excel', XLSX_MIME, '.xlsx'); if (h === 'cancel') return;
    setBusy('x' + k);
    try { await saveOffice(h, await schedaCampioniXlsx(r, k, settings), name); } catch (e) { toast('Excel non creato: ' + e.message); console.error(e); }
    setBusy(null);
  };
  const riepilogo = async () => {
    const name = `Riepilogo_campioni_${slug(r.commessa || r.codice)}.docx`;
    const h = await pickSave(name, 'Documento Word', DOCX_MIME, '.docx'); if (h === 'cancel') return;
    setBusy('docx'); toast('Preparo il riepilogo con le foto…');
    try { await saveOffice(h, await riepilogoCampioniDocx(r, settings), name); } catch (e) { toast('Word non creato: ' + e.message); console.error(e); }
    setBusy(null);
  };

  return html`<div class="content form">
    ${embedded && html`<div class="embed-hdr"><div><div class="tb-title">${r.codice}</div><div class="tb-sub">${saved ? 'Salvato' : 'Salvataggio…'}</div></div><button class="x" aria-label="Chiudi" onClick=${onClose}>×</button></div>`}
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa - progetto" value=${r.commessa} set=${v => up({ commessa: v })} placeholder="es. 171/26" />
      <${Inp} label="Cliente" req list="dl-cli-map" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Sito" req list="dl-siti-map" value=${r.sito} set=${v => up({ sito: v })} placeholder="Nome o indirizzo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div>
    <datalist id="dl-cli-map">${clienti.map(c => html`<option value=${c} />`)}</datalist>
    <datalist id="dl-siti-map">${siti.map(c => html`<option value=${c} />`)}</datalist></div>

    <div class="seg" style="margin-bottom:6px">${MAP_MATS.map(m => html`
      <button class=${tab === m.k ? 'on' : ''} style=${tab === m.k ? `background:${m.c};border-color:transparent` : ''} onClick=${() => setTab(m.k)}>
        ${m.l}<span class="n" style=${'margin-left:6px;opacity:.85'}>${(r.campioni[m.k] || []).length}</span></button>`)}</div>

    ${planSection}

    <div class="sec-h" style="margin-top:4px"><h3>Campioni · ${mat.l}</h3><span class="hint">${r.congelati[tab] ? 'Codici bloccati dalla scheda' : `Codici automatici ${mat.auto}1, ${mat.auto}2…`}</span></div>
    <div class="card tight">
      ${!camp.length && html`<div class="empty" style="padding:18px">Nessun campione ${mat.l}.</div>`}
      ${camp.map(c => html`<div class="samp" key=${c.id}>
        <div class="code-auto" style=${'color:' + mat.c + ';background:color-mix(in srgb,' + mat.c + ' 14%, white)'}>${c.codice}</div>
        <div class="stack">
          <textarea class="inp" rows="2" placeholder="Descrizione campione" value=${c.descrizione} onInput=${e => updCamp(c.id, { descrizione: e.target.value })}></textarea>
          <div class="row">
            <input class="inp" type="date" style="max-width:170px" value=${c.data || ''} onInput=${e => updCamp(c.id, { data: e.target.value })} aria-label="Data prelievo" />
            <input class="inp" style="max-width:150px" placeholder="Quantità (es. 180 mq)" value=${c.quantita || ''} onInput=${e => updCamp(c.id, { quantita: e.target.value })} aria-label="Quantità" />
          </div>
          <${PhotoStrip} ids=${c.foto || []} max=${4} onAdd=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}
            onRemove=${async id => { await removeBlob(id); updCamp(c.id, { foto: c.foto.filter(f => f !== id) }); }} />
        </div>
        <button class="x" aria-label="Elimina campione" onClick=${() => delCamp(c)}>×</button>
      </div>`)}
      <button class="btn dashed" style="margin-top:8px" onClick=${addCamp}>+ Aggiungi campione ${nextCode(tab)}</button>
    </div>

    <button class="btn outline block" style="margin-top:4px" disabled=${!camp.length || busy} onClick=${() => scheda(tab)}>
      ${busy === tab ? html`<div class="spin" />` : html`<${Icon} n="file" s=${18} />`}
      ${r.schede[tab] ? 'Rigenera' : 'Genera'} scheda campioni ${mat.l} · ${camp.length}</button>
    ${r.schede[tab] && html`<div class="lock" style="margin:8px 2px;color:var(--ok)">Scheda generata il ${new Date(r.schede[tab]).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</div>`}
    ${!r.commessa && html`<div class="notice">Indica la commessa in alto: compare nell'intestazione della scheda.</div>`}
    <button class="btn block" style="margin-top:8px" disabled=${!camp.length || busy} onClick=${() => xlsx(tab)}>
      ${busy === 'x' + tab ? html`<div class="spin" />` : html`<${Icon} n="file" s=${18} />`} Scheda campioni ${mat.l} in Excel</button>
    <div style="margin-top:6px"><button class="btn sm" onClick=${onSettings}><${Icon} n="gear" s=${15} /> Laboratorio, offerta, codici analisi</button></div>

    <div class="sec-h"><h3>Appunti</h3></div>
    <div class="card"><${Area} rows=${4} value=${r.appunti} set=${v => up({ appunti: v })} placeholder="Note generali del censimento" /></div>

    <div class="sec-h"><h3>Archivio</h3></div>
    <div class="stack">
      ${allCampMap(r).length > 0 && html`<button class="btn outline block" disabled=${busy === 'docx'} onClick=${riepilogo}>${busy === 'docx' ? html`<div class="spin" />` : html`<${Icon} n="file" s=${18} />`} Riepilogo campioni (Word)</button>`}
      ${OD.account ? html`<button class="btn pri block" onClick=${() => odSync([r], settings)}><${Icon} n="share" s=${18} /> Carica su OneDrive</button>`
        : html`<button class="btn pri block" onClick=${() => sendToOneDrive(r, settings)}><${Icon} n="share" s=${18} /> Invia PDF e foto a OneDrive</button>`}
      <button class="btn block" onClick=${() => exportRecords([r], settings)}><${Icon} n="archive" s=${18} /> Salva tutto in un file ZIP</button>
      <button class="btn danger block" onClick=${() => onDelete(r)}><${Icon} n="trash" s=${18} /> Elimina mappatura</button>
    </div>
  </div>`;
}
