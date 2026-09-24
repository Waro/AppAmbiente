/* Modulo Ambiente · DDA (Fase 1 sopralluogo, Fase 2 campionamento) */

const DDA_CHECK = [
  ['serbatoi', 'Serbatoi interrati o fuori terra'], ['rifiuti', 'Stoccaggio rifiuti'], ['scarichi', 'Scarichi, pozzetti e caditoie'],
  ['mca', 'Materiali contenenti amianto'], ['pcb', 'Trasformatori / PCB'], ['macchie', 'Macchie o sversamenti visibili'],
  ['vegetazione', 'Vegetazione stressata'], ['riporti', 'Riporti o terreni di riempimento'], ['pozzi', 'Pozzi o piezometri esistenti'],
];
const CHECK_ST = { presente: ['Presente', 'st-pres'], assente: ['Assente', 'st-ass'], nv: ['Non verificabile', 'st-nv'] };
const MATS = [
  { k: 'terreni', l: 'Terreni', c: 'var(--terreni)', auto: null },
  { k: 'acque', l: 'Acque', c: 'var(--acque)', auto: null },
  { k: 'mca', l: 'MCA', c: 'var(--mca)', auto: 'A' },
  { k: 'fav', l: 'FAV', c: 'var(--fav)', auto: 'F' },
  { k: 'altro', l: 'Altro', c: 'var(--altro)', auto: null },
];
const CSC = [
  { p: 'Idrocarburi C>12', u: 'mg/kg', A: 50, B: 750, m: 'terreni' },
  { p: 'Piombo', u: 'mg/kg', A: 100, B: 1000, m: 'terreni' },
  { p: 'Arsenico', u: 'mg/kg', A: 20, B: 50, m: 'terreni' },
  { p: 'Toluene', u: 'mg/kg', A: 0.5, B: 50, m: 'terreni' },
  { p: 'Tetracloroetilene', u: 'µg/L', A: 1.1, B: 1.1, m: 'acque' },
  { p: 'Idrocarburi totali', u: 'µg/L', A: 350, B: 350, m: 'acque' },
];

const emptyCampioni = () => ({ terreni: [], acque: [], mca: [], fav: [], altro: [] });
function newDda(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'dda' && (r.codice || '').startsWith('DDA-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('dda'), type: 'dda', codice: `DDA-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', sito: '', data: today(), tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(), fase: 1,
    usoAttuale: '', usoStorico: '', check: {}, checkNote: {}, recs: [], interviste: '', documenti: [],
    campioni: emptyCampioni(), congelati: {}, schede: {}, risultati: [], colonna: 'B',
  };
}
const ddaIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.recs.length && !Object.keys(r.check).length && !MATS.some(m => r.campioni[m.k].length) && !r.usoAttuale && !r.interviste;
const allCamp = r => MATS.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, k: m.k })));

function superamenti(r) {
  return (r.risultati || []).filter(x => {
    const p = CSC.find(c => c.p === x.parametro); const v = num(x.valore);
    return p && v != null && v > p[r.colonna || 'B'];
  });
}

/* ---------------- elenco ---------------- */
function DdaList({ records, open, create }) {
  const [f, setF] = useState('tutte');
  const all = records.filter(r => r.type === 'dda');
  const list = all.filter(r => f === 'tutte' || String(r.fase) === f).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  list.forEach(r => { const c = r.cliente || 'Senza cliente', s = r.sito || 'Sito da indicare'; ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  const card = r => {
    let sum, lines = [];
    if (r.fase === 1) {
      sum = `${r.recs.length} aree REC · ${r.documenti.length} documenti`;
      lines = r.recs.slice(0, 3).map(x => html`<div class="l"><span class="dot" style="background:#dfa11a"></span><span><b>${x.nome}</b>${x.descrizione ? ': ' + x.descrizione : ''}</span></div>`);
    } else {
      const cs = allCamp(r);
      const byM = MATS.filter(m => r.campioni[m.k].length).map(m => r.campioni[m.k].length + ' ' + m.l).join(', ');
      sum = `${cs.length} campioni${byM ? ' (' + byM + ')' : ''}`;
      lines = cs.filter(c => ['mca', 'fav', 'altro'].includes(c.k)).slice(0, 3).map(c => {
        const m = MATS.find(x => x.k === c.k);
        return html`<div class="l"><span class="dot" style=${'background:' + m.c}></span><span><b>${c.codice || '—'}</b> ${c.tipo ? c.tipo + ' · ' : ''}${c.descrizione}</span></div>`;
      });
      superamenti(r).slice(0, 3).forEach(x => {
        const p = CSC.find(c => c.p === x.parametro);
        lines.push(html`<div class="l" style="color:var(--nc)"><span class="dot" style="background:var(--nc)"></span><span>${x.campione} · ${x.parametro}: ${x.valore} ${p.u} (CSC ${p[r.colonna || 'B']})</span></div>`);
      });
      const sch = Object.entries(r.schede || {}).map(([k, t]) => k.toUpperCase() + ' ' + new Date(t).toLocaleDateString('it-IT'));
      if (sch.length) lines.push(html`<div class="l" style="color:var(--ok)"><span class="dot" style="background:var(--ok)"></span><span>Scheda campioni: ${sch.join(', ')}</span></div>`);
    }
    return html`<button class="rcard" key=${r.id} onClick=${() => open(r.id)}>
      <div class="r1"><span class="id">${r.codice}</span><span class=${'badge ' + (r.fase === 1 ? 'b-f1' : 'b-f2')}>Fase ${r.fase}</span><span class="dt">${fmtD(r.data)}</span></div>
      ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
      <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${sum}</div>${lines}</button>`;
  };
  const cnt = k => all.filter(r => k === 'tutte' || String(r.fase) === k).length;
  return html`<div class="content">
    <h2>Due Diligence Ambientale</h2><p class="lead">${all.length} ${all.length === 1 ? 'indagine' : 'indagini'}</p>
    <div class="pills">${[['tutte', 'Tutte'], ['1', 'Fase 1'], ['2', 'Fase 2']].map(([k, l]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${cnt(k)}</span></button>`)}</div>
    ${!list.length && html`<div class="empty"><b>Nessuna indagine</b>Tocca + per aprire il primo sopralluogo o campionamento.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">${rs.map(card)}</div></div>`)}</div>`)}
    <div class="fbar"><button class="fab" aria-label="Nuova indagine" onClick=${create}><${Icon} n="plus" s=${21} w=${2.4} /></button></div>
  </div>`;
}

/* ---------------- form ---------------- */
function DdaForm({ rec: initial, records, settings, onSave, onDelete, onSettings, header }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [openC, setOpenC] = useState({});
  const [tab, setTab] = useState(() => (MATS.find(m => initial.campioni[m.k].length) || MATS[0]).k);
  const [busy, setBusy] = useState(null);
  useEffect(() => header(r.codice, saved ? 'Salvato' : 'Salvataggio…'), [r.codice, saved]);

  const clienti = [...new Set(records.filter(x => x.cliente).map(x => x.cliente))];
  const siti = [...new Set(records.filter(x => x.sito && (!r.cliente || x.cliente === r.cliente)).map(x => x.sito))];

  const setCheck = (k, v) => up(p => ({ ...p, check: { ...p.check, [k]: p.check[k] === v ? undefined : v } }));
  const setNote = (k, v) => up(p => ({ ...p, checkNote: { ...p.checkNote, [k]: v } }));
  const updRec = (id, patch) => up(p => ({ ...p, recs: p.recs.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addRec = () => up(p => ({ ...p, recs: [...p.recs, { id: uid('rec'), nome: 'REC-' + (p.recs.length + 1), descrizione: '', foto: [], lat: null, lon: null }] }));
  const delRec = async x => { if (!confirm('Eliminare ' + x.nome + '?')) return; for (const b of blobIds(x)) await removeBlob(b); up(p => ({ ...p, recs: p.recs.filter(y => y.id !== x.id) })); };

  const mat = MATS.find(m => m.k === tab);
  const camp = r.campioni[tab] || [];
  const renum = (k, list) => { const m = MATS.find(x => x.k === k); return (!m.auto || r.congelati[k]) ? list : list.map((c, i) => ({ ...c, codice: m.auto + (i + 1) })); };
  const nextCode = k => { const m = MATS.find(x => x.k === k); if (!m.auto) return ''; const l = r.campioni[k]; if (!r.congelati[k]) return m.auto + (l.length + 1); return m.auto + (l.map(c => +c.codice.slice(1) || 0).reduce((a, b) => Math.max(a, b), 0) + 1); };
  const setCamp = (k, fn) => up(p => ({ ...p, campioni: { ...p.campioni, [k]: fn(p.campioni[k]) } }));
  const updCamp = (id, patch) => setCamp(tab, l => l.map(c => c.id === id ? { ...c, ...patch } : c));
  const addCamp = () => setCamp(tab, l => [...l, { id: uid('c'), codice: nextCode(tab), descrizione: '', tipo: '', data: r.data, foto: [] }]);
  const delCamp = async c => {
    if (!confirm('Eliminare il campione ' + (c.codice || '') + '?')) return;
    for (const b of blobIds(c)) await removeBlob(b);
    setCamp(tab, l => renum(tab, l.filter(x => x.id !== c.id)));
  };

  const scheda = async k => {
    const list = r.campioni[k]; if (!list.length) return;
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

  const risCamp = allCamp(r).filter(c => (c.k === 'terreni' || c.k === 'acque') && c.codice);
  const addRis = () => up(p => ({ ...p, risultati: [...(p.risultati || []), { id: uid('x'), campione: risCamp[0] ? risCamp[0].codice : '', parametro: CSC[0].p, valore: '' }] }));
  const updRis = (id, patch) => up(p => ({ ...p, risultati: p.risultati.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const sup = superamenti(r);

  return html`<div class="content form">
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa - progetto" value=${r.commessa} set=${v => up({ commessa: v })} placeholder="es. 171/26" />
      <${Inp} label="Cliente" req list="dl-cli" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Sito" req list="dl-siti" value=${r.sito} set=${v => up({ sito: v })} placeholder="Nome o indirizzo" />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
    </div>
    <datalist id="dl-cli">${clienti.map(c => html`<option value=${c} />`)}</datalist>
    <datalist id="dl-siti">${siti.map(c => html`<option value=${c} />`)}</datalist></div>

    <div class="seg" style="margin-bottom:6px">
      <button class=${r.fase === 1 ? 'on' : ''} onClick=${() => up({ fase: 1 })}>Fase 1 · Sopralluogo</button>
      <button class=${r.fase === 2 ? 'on' : ''} onClick=${() => up({ fase: 2 })}>Fase 2 · Campionamento</button>
    </div>

    ${r.fase === 1 ? html`
      <div class="sec-h"><h3>Uso del sito</h3></div>
      <div class="card"><${Area} label="Uso attuale del sito" value=${r.usoAttuale} set=${v => up({ usoAttuale: v })} />
        <div class="divider"></div><${Area} label="Uso storico" value=${r.usoStorico} set=${v => up({ usoStorico: v })} /></div>

      <div class="sec-h"><h3>Checklist sopralluogo</h3><span class="hint">${DDA_CHECK.filter(([k]) => r.check[k]).length} / ${DDA_CHECK.length}</span></div>
      <div class="card tight">${DDA_CHECK.map(([k, l]) => {
        const st = r.check[k]; const [sl, sc] = CHECK_ST[st] || ['Da compilare', 'st-none']; const o = openC[k];
        return html`<div class="chk" key=${k}>
          <button class="chk-h" aria-expanded=${!!o} onClick=${() => setOpenC({ ...openC, [k]: !o })}>
            <div class="tb-grow"><b>${l}</b>${!o && r.checkNote[k] && html`<small>${r.checkNote[k]}</small>`}</div>
            <span class=${'badge ' + sc}>${sl}</span><span class=${'chev' + (o ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
          ${o && html`<div style="padding-bottom:12px"><div class="tri">
              <button class=${st === 'presente' ? 'on-p' : ''} onClick=${() => setCheck(k, 'presente')}>Presente</button>
              <button class=${st === 'assente' ? 'on-a' : ''} onClick=${() => setCheck(k, 'assente')}>Assente</button>
              <button class=${st === 'nv' ? 'on-n' : ''} onClick=${() => setCheck(k, 'nv')}>N.V.</button></div>
            <textarea class="inp" rows="3" placeholder="Note, ubicazione, evidenze…" value=${r.checkNote[k] || ''} onInput=${e => setNote(k, e.target.value)}></textarea></div>`}
        </div>`;
      })}</div>

      <div class="sec-h"><h3 style="color:var(--amber)">Aree di potenziale contaminazione · ${r.recs.length}</h3></div>
      ${r.recs.map(x => html`<div class="card" key=${x.id}>
        <div class="row" style="margin-bottom:8px"><span style="width:10px;height:10px;border-radius:50%;background:#dfa11a;flex-shrink:0"></span>
          <input class="inp" style="font-weight:700" value=${x.nome} onInput=${e => updRec(x.id, { nome: e.target.value })} aria-label="Nome area" />
          <button class="x" aria-label="Elimina area" onClick=${() => delRec(x)}>×</button></div>
        <textarea class="inp" rows="2" placeholder="Descrizione" value=${x.descrizione} onInput=${e => updRec(x.id, { descrizione: e.target.value })}></textarea>
        <div style="margin-top:10px"><${PhotoStrip} ids=${x.foto} max=${6}
          onAdd=${async ids => { updRec(x.id, { foto: [...x.foto, ...ids] }); if (x.lat == null) { const g = await getPosition(); if (g) updRec(x.id, g); } }}
          onRemove=${async id => { await removeBlob(id); updRec(x.id, { foto: x.foto.filter(f => f !== id) }); }} /></div>
        <div style="margin-top:8px">${x.lat != null ? html`<span class="geo"><${Icon} n="pin" s=${14} /> ${x.lat}, ${x.lon}</span>` : html`<span class="lock">La posizione GPS si salva con la prima foto</span>`}</div>
      </div>`)}
      <button class="btn dashed" onClick=${addRec}>+ Aggiungi area</button>

      <div class="sec-h"><h3>Interviste e note</h3></div>
      <div class="card"><textarea class="inp" rows="4" value=${r.interviste} onInput=${e => up({ interviste: e.target.value })} aria-label="Interviste e note"></textarea></div>

      <div class="sec-h"><h3>Documenti allegati</h3></div>
      <div class="card"><${FileList} items=${r.documenti}
        onAdd=${d => up(p => ({ ...p, documenti: [...p.documenti, d] }))}
        onRemove=${async d => { await removeBlob(d.blobId); up(p => ({ ...p, documenti: p.documenti.filter(x => x.id !== d.id) })); }} /></div>
    ` : html`
      <div class="mtabs" role="tablist" style="margin-top:14px">${MATS.map(m => html`<button role="tab" aria-selected=${tab === m.k} class=${tab === m.k ? 'on' : ''} style=${tab === m.k ? 'color:' + m.c : ''} onClick=${() => setTab(m.k)}>${m.l}<small>${r.campioni[m.k].length}</small></button>`)}</div>
      <div class="sec-h" style="margin-top:4px"><h3>Campioni · ${mat.l}</h3><span class="hint">${mat.auto ? (r.congelati[tab] ? 'Codici bloccati dalla scheda' : `Codici automatici ${mat.auto}1, ${mat.auto}2…`) : 'Codice libero'}</span></div>
      <div class="card tight">
        ${!camp.length && html`<div class="empty" style="padding:18px">Nessun campione ${mat.l}.</div>`}
        ${camp.map(c => html`<div class="samp" key=${c.id}>
          ${mat.auto ? html`<div class="code-auto" style=${'color:' + mat.c + ';background:color-mix(in srgb,' + mat.c + ' 14%, white)'}>${c.codice}</div>`
            : html`<input class="inp code-free" value=${c.codice} placeholder="Codice" onInput=${e => updCamp(c.id, { codice: e.target.value })} aria-label="Codice campione" />`}
          <div class="stack">
            ${tab === 'altro' && html`<input class="inp" style="background:rgba(0,118,211,.07)" placeholder="Tipo di campione (es. rifiuto, aria, sedimento)" value=${c.tipo} onInput=${e => updCamp(c.id, { tipo: e.target.value })} />`}
            <textarea class="inp" rows="2" placeholder="Descrizione campione" value=${c.descrizione} onInput=${e => updCamp(c.id, { descrizione: e.target.value })}></textarea>
            <div class="row"><input class="inp" type="date" style="max-width:170px" value=${c.data || ''} onInput=${e => updCamp(c.id, { data: e.target.value })} aria-label="Data prelievo" /></div>
            <${PhotoStrip} ids=${c.foto || []} max=${4} onAdd=${ids => updCamp(c.id, { foto: [...(c.foto || []), ...ids] })}
              onRemove=${async id => { await removeBlob(id); updCamp(c.id, { foto: c.foto.filter(f => f !== id) }); }} />
          </div>
          <button class="x" aria-label="Elimina campione" onClick=${() => delCamp(c)}>×</button>
        </div>`)}
        <button class="btn dashed" style="margin-top:8px" onClick=${addCamp}>+ Aggiungi campione ${mat.auto ? nextCode(tab) : ''}</button>
      </div>

      ${(tab === 'mca' || tab === 'fav') && html`
        <button class="btn outline block" style="margin-top:4px" disabled=${!camp.length || busy} onClick=${() => scheda(tab)}>
          ${busy === tab ? html`<div class="spin" />` : html`<${Icon} n="file" s=${18} />`}
          ${r.schede[tab] ? 'Rigenera' : 'Genera'} scheda campioni ${mat.l} · ${camp.length}</button>
        ${r.schede[tab] && html`<div class="lock" style="margin:8px 2px;color:var(--ok)">Scheda generata il ${new Date(r.schede[tab]).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</div>`}
        ${!r.commessa && html`<div class="notice">Indica la commessa in alto: compare nell'intestazione della scheda.</div>`}
        <div style="margin-top:6px"><button class="btn sm" onClick=${onSettings}><${Icon} n="gear" s=${15} /> Laboratorio, offerta, codici analisi</button></div>`}

      ${risCamp.length > 0 && html`
        <div class="sec-h"><h3>Risultati vs CSC</h3>
          <div class="seg" style="width:150px">${['A', 'B'].map(c => html`<button class=${r.colonna === c ? 'on' : ''} style="padding:6px" onClick=${() => up({ colonna: c })}>Col. ${c}</button>`)}</div></div>
        <div class="card tight">
          ${r.risultati.length ? html`<div class=${'notice' + (sup.length ? ' err' : '')} style="margin:0 0 10px;${sup.length ? '' : 'background:#e9f7ef;border-color:#b7e2c8;color:#0b5a33'}">
            ${sup.length ? `${sup.length} superamenti rispetto alla colonna ${r.colonna}` : `Nessun superamento rispetto alla colonna ${r.colonna}`}</div>` : html`<p class="lead" style="margin:4px 0 10px">Inserisci i valori dai rapporti di prova del laboratorio.</p>`}
          ${r.risultati.map(x => {
            const p = CSC.find(c => c.p === x.parametro) || CSC[0]; const v = num(x.valore); const over = v != null && v > p[r.colonna];
            return html`<div key=${x.id} style="display:grid;grid-template-columns:80px 1fr 80px 28px;gap:6px;align-items:center;margin-bottom:6px">
              <select class="inp" style="padding:8px 4px" value=${x.campione} onChange=${e => updRis(x.id, { campione: e.target.value })}>${risCamp.map(c => html`<option value=${c.codice}>${c.codice}</option>`)}</select>
              <select class="inp" style="padding:8px 4px" value=${x.parametro} onChange=${e => updRis(x.id, { parametro: e.target.value })}>${CSC.map(c => html`<option value=${c.p}>${c.p} (${c.u}) · CSC ${c[r.colonna]}</option>`)}</select>
              <input class="inp" inputmode="decimal" style=${'text-align:right;padding:8px' + (over ? ';color:var(--nc);font-weight:700;background:rgba(190,34,42,.07)' : '')} value=${x.valore} placeholder="Valore" onInput=${e => updRis(x.id, { valore: e.target.value })} />
              <button class="x" aria-label="Elimina risultato" onClick=${() => up(pp => ({ ...pp, risultati: pp.risultati.filter(y => y.id !== x.id) }))}>×</button></div>`;
          })}
          <button class="btn dashed" onClick=${addRis}>+ Aggiungi risultato</button>
        </div>`}
    `}

    <div class="sec-h"><h3>Archivio</h3></div>
    <div class="stack">
      <button class="btn pri block" onClick=${() => sendToOneDrive(r, settings)}><${Icon} n="share" s=${18} /> Invia PDF e foto a OneDrive</button>
      <button class="btn block" onClick=${() => exportRecords([r], settings)}><${Icon} n="archive" s=${18} /> Esporta ZIP dell'indagine</button>
      <button class="btn danger block" onClick=${() => onDelete(r)}><${Icon} n="trash" s=${18} /> Elimina indagine</button>
    </div>
  </div>`;
}
