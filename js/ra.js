/* Sopralluogo RA (Responsabile Amianto): checklist dei manufatti da mappatura o PMC,
   con stato di conservazione, note e fino a 3 foto per manufatto. */

// Classi del DM 06/09/1994, più due casi pratici del sopralluogo periodico
const RA_STATI = [
  { k: 'integro', l: 'Integro, non suscettibile di danneggiamento', s: 'Integro', b: 'b-ok', c: '#007e46' },
  { k: 'suscettibile', l: 'Integro, suscettibile di danneggiamento', s: 'Suscettibile', b: 'b-f1', c: '#a45f00' },
  { k: 'danneggiato', l: 'Danneggiato', s: 'Danneggiato', b: 'b-nc', c: '#be222a' },
  { k: 'nonispez', l: 'Non ispezionabile', s: 'Non ispez.', b: 'b-grey', c: '#6f7278' },
  { k: 'rimosso', l: 'Rimosso o bonificato', s: 'Rimosso', b: 'b-viol', c: '#5b3cb0' },
];
const raStato = k => RA_STATI.find(x => x.k === k);

function newRa(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'ra' && (r.codice || '').startsWith('RA-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('ra'), type: 'ra', codice: `RA-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', sito: '', indirizzo: '', data: today(), tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(),
    fonte: '', manufatti: [], appunti: '', planimetrie: [],
  };
}
const raIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.manufatti.length && !r.appunti && !(r.planimetrie || []).length;
const newManufatto = (x = {}) => ({ id: uid('m'), codice: '', ubicazione: '', descrizione: '', tipologia: '', quantita: '', statoPrec: '', notePrec: '', stato: '', note: '', foto: [], ...x });

/* ---------------- import mappatura / PMC ----------------
   {
     "app": "nembo", "type": "ra-mappatura",
     "fonte": "PMC rev. 2 del 03/2025",
     "commessa": "…", "cliente": "…", "sito": "…", "indirizzo": "…",
     "manufatti": [
       { "codice": "M1", "ubicazione": "…", "descrizione": "…",
         "tipologia": "compatto|friabile", "quantita": "120 m²",
         "statoPrecedente": "…", "notePrecedenti": "…" }
     ]
   }
   I manufatti con un codice già presente non vengono toccati: si aggiungono solo i nuovi. */
const RA_TEMPLATE = {
  app: 'nembo', type: 'ra-mappatura', fonte: '',
  commessa: '', cliente: '', sito: '', indirizzo: '',
  manufatti: [{ codice: 'M1', ubicazione: '', descrizione: '', tipologia: '', quantita: '', statoPrecedente: '', notePrecedenti: '',
    foto: ['data:image/jpeg;base64,...'] }],
};
// converte una data URI (o una stringa base64 pura, assunta JPEG) in Blob, per salvarla con saveImage
function dataUriToBlob(s) {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s.trim());
  const mime = m ? m[1] : 'image/jpeg';
  const b64 = m ? m[2] : s.trim();
  const bin = atob(b64.replace(/\s/g, ''));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
async function importRa(text, rec) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (d.type && d.type !== 'ra-mappatura') throw new Error('il file non è una mappatura per il sopralluogo RA');
  const list = Array.isArray(d) ? d : d.manufatti;
  if (!Array.isArray(list)) throw new Error('nel file manca l\'elenco "manufatti"');
  const patch = {}; let head = 0;
  if (!Array.isArray(d)) for (const k of ['fonte', 'commessa', 'cliente', 'sito', 'indirizzo']) if (d[k] && !rec[k]) { patch[k] = String(d[k]); head++; }
  const known = new Set(rec.manufatti.map(m => (m.codice || '').trim().toLowerCase()).filter(Boolean));
  const add = []; let foto = 0;
  for (const x of list) {
    if (!x || typeof x !== 'object') continue;
    const codice = String(x.codice || x.id || '').trim() || 'M' + (rec.manufatti.length + add.length + 1);
    if (known.has(codice.toLowerCase())) continue;
    known.add(codice.toLowerCase());
    const s = v => (v == null ? '' : String(v));
    const ids = [];
    if (Array.isArray(x.foto)) {
      for (const ph of x.foto.slice(0, 3)) {
        if (typeof ph !== 'string' || !ph.trim()) continue;
        try { ids.push(await saveImage(dataUriToBlob(ph))); foto++; } catch (e) { /* immagine non valida: la salto */ }
      }
    }
    add.push(newManufatto({ codice, ubicazione: s(x.ubicazione), descrizione: s(x.descrizione), tipologia: s(x.tipologia), quantita: s(x.quantita),
      statoPrec: s(x.statoPrecedente || x.stato), notePrec: s(x.notePrecedenti || x.note), foto: ids }));
  }
  if (add.length) patch.manufatti = [...rec.manufatti, ...add];
  if (!add.length && !head) throw new Error('nessun manufatto nuovo: i codici del file sono già tutti in elenco');
  return { patch, nuovi: add.length, head, foto };
}

/* ---------------- elenco ---------------- */
function RaList({ records, open, create, activeId }) {
  const all = records.filter(r => r.type === 'ra').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  all.forEach(r => { const c = r.cliente || 'Senza cliente', s = r.sito || 'Sito da indicare'; ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  return html`<div class="content">
    <h2>Sopralluoghi RA</h2><p class="lead">Verifica periodica dei manufatti contenenti amianto</p>
    ${!all.length && html`<div class="empty"><b>Nessun sopralluogo</b>Tocca + e carica la mappatura o il PMC del sito.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">
        ${rs.map(r => {
          const tot = r.manufatti.length, fatti = r.manufatti.filter(m => m.stato).length, dann = r.manufatti.filter(m => m.stato === 'danneggiato').length;
          return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '')} key=${r.id} onClick=${() => open(r.id)}>
            <div class="r1"><span class="id">${r.codice}</span>
              <span class=${'badge ' + (tot && fatti === tot ? 'b-ok' : 'b-f2')}>${tot ? `${fatti}/${tot} verificati` : 'Da impostare'}</span><span class="dt">${fmtD(r.data)}</span></div>
            ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
            <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${tot} manufatti${r.fonte ? ' · ' + r.fonte : ''}</div>
            ${dann > 0 && html`<div class="due late">${dann} ${dann === 1 ? 'manufatto danneggiato' : 'manufatti danneggiati'}</div>`}
          </button>`;
        })}</div></div>`)}</div>`)}
    <div class="fbar"><button class="fab" aria-label="Nuovo sopralluogo RA" onClick=${create}><${Icon} n="plus" s=${21} w=${2.4} /></button></div>
  </div>`;
}

/* ---------------- scheda manufatto ---------------- */
function ManufattoCard({ m, open, toggle, onUpd, onDel }) {
  const st = raStato(m.stato);
  const set = patch => onUpd(m.id, patch);
  return html`<div class="punto">
    <button class="punto-h" aria-expanded=${open} onClick=${toggle}>
      <span class="rtag" style=${st ? `background:${st.c}1f;color:${st.c}` : ''}>${m.codice || '—'}</span>
      <div class="t"><b>${m.ubicazione || 'Ubicazione da indicare'}</b><small>${m.descrizione || 'Descrizione da indicare'}</small></div>
      ${st ? html`<span class=${'badge ' + st.b}>${st.s}</span>` : html`<span class="badge st-none">Da verificare</span>`}
      <span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
    ${open && html`<div class="punto-b">
      <div class="grid2">
        <${Inp} label="Codice" value=${m.codice} set=${v => set({ codice: v })} />
        <${Inp} label="Tipologia" value=${m.tipologia} set=${v => set({ tipologia: v })} placeholder="compatto, friabile…" />
        <${Inp} cls="full" label="Ubicazione" value=${m.ubicazione} set=${v => set({ ubicazione: v })} />
        <${Area} cls="full" label="Descrizione" rows=${2} value=${m.descrizione} set=${v => set({ descrizione: v })} />
        ${m.quantita && html`<${Inp} label="Quantità" value=${m.quantita} set=${v => set({ quantita: v })} />`}
      </div>
      ${(m.statoPrec || m.notePrec) && html`<div class="notice" style="margin:0;background:#eef4fb;border-color:#cfe0f2;color:#23405f">
        <b>Sopralluogo precedente:</b> ${[m.statoPrec, m.notePrec].filter(Boolean).join(' · ')}</div>`}
      <div class="fld"><span>Stato di conservazione</span></div>
      <div class="stati">${RA_STATI.map(s => html`<button class=${m.stato === s.k ? 'on' : ''} style=${'--sc:' + s.c} title=${s.l} onClick=${() => set({ stato: m.stato === s.k ? '' : s.k })}>${s.l}</button>`)}</div>
      <${Area} label="Note" rows=${3} value=${m.note} set=${v => set({ note: v })} placeholder="Condizioni rilevate, interventi consigliati…" />
      <div><div class="fld"><span>Foto (fino a 3)</span></div>
        <${PhotoStrip} ids=${m.foto} max=${3} onAdd=${ids => set({ foto: [...m.foto, ...ids] })} onRemove=${async id => { await removeBlob(id); set({ foto: m.foto.filter(f => f !== id) }); }} /></div>
      <button class="btn sm danger" style="justify-self:start" onClick=${() => onDel(m)}>Elimina manufatto</button>
    </div>`}
  </div>`;
}

/* ---------------- form ---------------- */
function RaForm({ rec: initial, records, settings, onSave, onDelete, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [openM, setOpenM] = useState({});
  const [f, setF] = useState('tutti');
  const imp = useRef();
  useEffect(() => { if (!embedded) header(r.codice, saved ? 'Salvato' : 'Salvataggio…'); }, [r.codice, saved, embedded]);

  const clienti = [...new Set(records.filter(x => x.cliente).map(x => x.cliente))];
  const updM = (id, patch) => up(p => ({ ...p, manufatti: p.manufatti.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const addM = () => { const m = newManufatto({ codice: 'M' + (r.manufatti.length + 1) }); up(p => ({ ...p, manufatti: [...p.manufatti, m] })); setOpenM({ [m.id]: true }); setF('tutti'); };
  const delM = async m => {
    if (!confirm('Eliminare il manufatto ' + (m.codice || '') + '?')) return;
    for (const b of blobIds(m)) await removeBlob(b);
    up(p => ({ ...p, manufatti: p.manufatti.filter(x => x.id !== m.id) }));
  };
  const doImport = e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const { patch, nuovi, head, foto } = await importRa(rd.result, r);
        up(patch);
        toast(`Importati ${nuovi} manufatti${foto ? ' con ' + foto + ' foto' : ''}${head ? ' e ' + head + ' dati del sito' : ''}`);
      } catch (err) { toast('Import non riuscito: ' + err.message); }
    };
    rd.readAsText(file);
  };

  const tot = r.manufatti.length, fatti = r.manufatti.filter(m => m.stato).length;
  const list = r.manufatti.filter(m => f === 'tutti' || (f === 'da' ? !m.stato : !!m.stato));
  const labels = r.manufatti.map(m => { const st = raStato(m.stato); return { ref: m.id, text: m.codice || 'M', color: st ? st.c : '#52555b' }; });

  return html`<div class="content form">
    ${embedded && html`<div class="embed-hdr"><div><div class="tb-title">${r.codice}</div><div class="tb-sub">${saved ? 'Salvato' : 'Salvataggio…'}</div></div><button class="x" aria-label="Chiudi" onClick=${onClose}>×</button></div>`}
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} />
      <${Inp} label="Cliente" req list="dl-cli-ra" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Sito" req value=${r.sito} set=${v => up({ sito: v })} />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} />
      <${Inp} label="Data" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
      ${r.fonte && html`<${Inp} cls="full" label="Fonte dei dati" value=${r.fonte} set=${v => up({ fonte: v })} />`}
    </div><datalist id="dl-cli-ra">${clienti.map(c => html`<option value=${c} />`)}</datalist></div>

    <div class="sec-h"><h3>Mappatura o PMC</h3></div>
    <div class="card tight">
      <p class="lead" style="margin:2px 0 10px">Fatti preparare da Claude il file JSON dalla mappatura o dal Piano di Manutenzione e Controllo, poi caricalo: crea la lista dei manufatti. Ricaricando un file si aggiungono solo i codici nuovi.</p>
      <div class="row"><button class="btn" style="flex:1" onClick=${() => imp.current.click()}>Carica .json</button>
        <button class="btn" style="flex:1" onClick=${() => downloadBlob(new Blob([JSON.stringify(RA_TEMPLATE, null, 1)], { type: 'application/json' }), 'Nembo_modello_RA.json')}>Scarica modello</button></div>
      <input ref=${imp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${doImport} />
    </div>

    <div class="sec-h"><h3>Manufatti · ${tot}</h3><span class="hint">${fatti} di ${tot} verificati</span></div>
    ${tot > 0 && html`<div style="height:8px;background:#e1e8ef;border-radius:6px;overflow:hidden;margin:0 2px 10px"><div style=${'height:100%;background:var(--ok);width:' + Math.round(fatti / tot * 100) + '%'}></div></div>
      <div class="pills">${[['tutti', 'Tutti', tot], ['da', 'Da verificare', tot - fatti], ['fatti', 'Verificati', fatti]].map(([k, l, n]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${n}</span></button>`)}</div>`}
    ${list.map(m => html`<${ManufattoCard} key=${m.id} m=${m} open=${!!openM[m.id]} toggle=${() => setOpenM({ ...openM, [m.id]: !openM[m.id] })} onUpd=${updM} onDel=${delM} />`)}
    ${f === 'da' && tot > 0 && !list.length && html`<div class="empty" style="padding:20px"><b>Tutti verificati</b>Controlla le note e carica tutto su OneDrive.</div>`}
    <button class="btn dashed" onClick=${addM}>+ Aggiungi manufatto</button>

    <div class="sec-h"><h3>Planimetrie</h3><span class="hint">Etichette colorate per stato</span></div>
    <div class="card"><${PlanList} items=${r.planimetrie || []} labels=${labels}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>

    <div class="sec-h"><h3>Appunti</h3><span class="hint">Testo libero</span></div>
    <div class="card"><textarea class="inp" rows="4" placeholder="Note generali del sopralluogo" value=${r.appunti} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti"></textarea></div>

    <div class="sec-h"><h3>Archivio</h3></div>
    <div class="stack">
      ${OD.account ? html`<button class="btn pri block" onClick=${() => odSync([r], settings)}><${Icon} n="share" s=${18} /> Carica su OneDrive</button>`
        : html`<button class="btn pri block" onClick=${() => sendToOneDrive(r, settings)}><${Icon} n="share" s=${18} /> Invia PDF e foto a OneDrive</button>`}
      <button class="btn block" onClick=${() => exportRecords([r], settings)}><${Icon} n="archive" s=${18} /> Salva tutto in un file ZIP</button>
      <button class="btn danger block" onClick=${() => onDelete(r)}><${Icon} n="trash" s=${18} /> Elimina sopralluogo</button>
    </div>
  </div>`;
}
