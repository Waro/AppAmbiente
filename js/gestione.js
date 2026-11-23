/* Attività da PC (v63): un solo elenco di tutte le attività, come tabella o Kanban, con filtri e dettaglio.
   Il dettaglio è il riepilogo in sola lettura; «Modifica» apre l'attività con le sue schede.
   Lo stato di avanzamento (Programmata … Conclusa) e i ToDo sono in js/todo.js. */

const ATT_BU = { ambiente: ['dda', 'mappatura', 'ra', 'radon', 'aria'], hs: ['hs', 'vs'] };
const ATT_TIPI_F = [['', 'Tutti'], ['dda1', 'DDA Fase 1'], ['dda2', 'DDA Fase 2'], ['mappatura', 'Mappatura'], ['ra', 'Sopralluogo RA'], ['radon', 'Campagna radon'], ['aria', 'Monitoraggio aria'], ['hs', 'Sopralluogo HSE'], ['vs', 'Verbale HSE']];
const ATT_PERIODI = [['30', 'Ultimi 30 giorni'], ['90', 'Ultimi 3 mesi'], ['365', 'Ultimo anno'], ['', 'Sempre']];
const attData = r => r.type === 'radon' ? ((r.momenti || [])[0] || {}).data || '' : r.data || '';
const attColore = r => r.type === 'dda' && r.fase === 2 ? 'var(--blue)' : TIPO_COL[r.type];
const attVia = r => (r.indirizzo || '').trim() || (r.sito || '').trim() || placeAddr(r) || 'Indirizzo da indicare';
const attContenuto = r => { const l = recLine(r); const i = l.indexOf(' · '); return i >= 0 ? l.slice(i + 3) : l; };

// lo stato non tocca i file: se l'attività era già tutta su OneDrive, resta «caricata»
async function odTieniCaricata(prev, next) {
  const m = (await DB.get('od_synced')) || {}; const e = m[prev.id];
  if (e && e.ok && (prev.updatedAt || 0) <= e.t) { m[prev.id] = { ...e, t: next.updatedAt }; await DB.set('od_synced', m); odSyncSubs.forEach(f => f()); }
}
function useSposta(todos, saveRec) {
  const [chiedi, setChiedi] = useState(null); // { r, st }
  const applica = async (r, st) => {
    const n = { ...r, avanzamento: st, avanzMan: true, updatedAt: Date.now() };
    await odTieniCaricata(r, n); await saveRec(n); toast(placeLabel(r) + ' · ' + avanzL(st));
  };
  const sposta = (r, st) => {
    if (avanzDi(r) === st) return;
    const aperti = todos.filter(t => t.att === r.id && !t.fatto);
    if (aperti.length) setChiedi({ r, st }); else applica(r, st);
  };
  const avviso = chiedi && html`<${AvvisoSposta} r=${chiedi.r} st=${chiedi.st} todos=${todos} saveRec=${saveRec}
    onAnnulla=${() => setChiedi(null)} onSposta=${() => { const c = chiedi; setChiedi(null); applica(c.r, c.st); }} />`;
  return { sposta, avviso };
}
// avviso: ToDo ancora aperti; si possono completare qui o spostare comunque
function AvvisoSposta({ r, st, todos, saveRec, onAnnulla, onSposta }) {
  useBackClose(onAnnulla);
  const L = todos.filter(t => t.att === r.id && (!t.fatto || Date.now() - t.fatto < 60000));
  const aperti = L.filter(t => !t.fatto).length;
  const nuovi = ((predefDi()[predefKey(r)] || {})[st] || []).length;
  return html`<div class="ov" onClick=${e => e.target === e.currentTarget && onAnnulla()}><div class="modal att-modal" role="alertdialog" aria-labelledby="sp-t">
    <h4 id="sp-t">Spostare in «${avanzL(st)}»?</h4>
    <p>${!aperti ? 'Tutti i ToDo di questa attività sono fatti.' : aperti === 1 ? `${placeLabel(r)} ha ancora 1 ToDo aperto. Puoi completarlo qui o spostare comunque: resta aperto e lo ritrovi in ToDo.`
      : `${placeLabel(r)} ha ancora ${aperti} ToDo aperti. Puoi completarli qui o spostare comunque: restano aperti e li ritrovi in ToDo.`}</p>
    <div class="card td-card st-bar st-warn">${L.map(t => html`<div class="td-row" key=${t.id}><${TodoCk} t=${t} onToggle=${x => saveRec({ ...x, fatto: x.fatto ? 0 : Date.now(), updatedAt: Date.now() })} />
      <span class=${'td-tx' + (t.fatto ? ' done' : '')}><b>${t.titolo}</b><${TodoMeta} t=${t} /></span></div>`)}</div>
    ${nuovi > 0 && _settings.todoAuto !== false && html`<p class="lead mt-2" style="font-size:var(--fs-sm)">Entrando in «${avanzL(st)}» si ${nuovi === 1 ? 'aggiunge 1 ToDo predefinito' : 'aggiungono ' + nuovi + ' ToDo predefiniti'}.</p>`}
    <div class="row mt-3"><button class="btn" style="flex:1" onClick=${onAnnulla}>Annulla</button><button class="btn pri" style="flex:2" onClick=${onSposta}>${aperti ? 'Sposta comunque' : 'Sposta'}</button></div>
  </div></div>`;
}

/* ---------------- dettaglio: riepilogo in sola lettura, ToDo, Modifica ---------------- */
function AttDettaglio({ r, records, todos, settings, saveRec, removeRec, openRec, sposta, onClose, onTodo }) {
  const D = riepilogoDati(r, settings);
  const st = avanzDi(r);
  const voci = D.voci || [];
  const ap = r.type === 'dda' ? [r.appunti, r.appunti2].filter(Boolean).join('\n\n') : r.appunti;
  return html`<div class="content form att-det">
    <div class="card att-dh">
      <div class="row" style="gap:var(--sp-2);flex-wrap:wrap"><span class="att-tt" style=${'--c:' + attColore(r)}><i></i>${TIPO_NOME(r)}</span>
        <span class="att-st" style=${'--s:' + avanzC(st)}><i></i>${avanzL(st)}</span>
        <span class="badge" style="margin-left:auto"><${Icon} n="lock" s=${12} /> Sola lettura</span>
        ${onClose && html`<button class="btn-icon" aria-label="Chiudi" onClick=${onClose}><${Icon} n="x" s=${18} /></button>`}</div>
      <div class="dh-title mt-2">${placeLabel(r)}</div>
      <div class="dh-sub">${[r.codice, fmtD(attData(r)), r.commessa && 'commessa ' + r.commessa, r.cliente].filter(Boolean).join(' · ')}</div>
      <div class="row mt-3" style="gap:var(--sp-2);flex-wrap:wrap">
        <button class="btn" onClick=${() => openRec(r)}><${Icon} n="pen" s=${18} /> Modifica</button>
        <label class="fld att-stsel"><span class="sr">Stato</span><select key=${st} value=${st} aria-label="Stato dell'attività" onChange=${e => sposta(r, e.target.value)}>${AVANZ.map(([k, l]) => html`<option value=${k}>${l}</option>`)}</select></label>
      </div>
    </div>
    <div class="card-navy mt-3"><span class="nv-eye">Riepilogo</span><div class="next-line" style="font-size:var(--fs-lg);color:var(--on-dark)">${D.sintesi || attContenuto(r)}</div></div>
    <${TodoCard} r=${r} todos=${todos} records=${records} saveRec=${saveRec} removeRec=${removeRec} onOpen=${onTodo} />
    ${voci.length > 0 && html`<div class="sec-h"><h3>Raccolto in campo · ${voci.length}</h3></div>
      <div class="list">${voci.slice(0, 60).map((v, i) => html`<div class="riep-row" key=${i}>
        ${(v.foto || []).length ? html`<${Thumb44} id=${v.foto[0]} />` : html`<span class="thumb44 vuota"><${Icon} n="image" s=${18} /></span>`}
        <div class="t"><b>${v.t}</b>${(v.righe || []).map(x => html`<small>${x}</small>`)}<small class=${'riep-meta' + (v.crit ? ' crit' : '')}>${[v.stato, (v.foto || []).length && v.foto.length + ' foto'].filter(Boolean).join(' · ')}</small></div></div>`)}
        ${voci.length > 60 && html`<div class="prow"><small>e altre ${voci.length - 60}: aprile con Modifica</small></div>`}</div>`}
    ${ap && html`<div class="sec-h"><h3>Appunti</h3></div><div class="card"><div class="riep-ap">${ap}</div></div>`}
    <${RiepCarico} r=${r} />
  </div>`;
}

/* ---------------- elenco: tabella e Kanban ---------------- */
function useFiltriAtt() {
  const leggi = () => { try { return JSON.parse(localStorage.getItem('nembo_att_f') || '{}'); } catch (e) { return {}; } };
  const [f, setF] = useState(() => ({ vista: 'tab', q: '', bu: '', tipo: '', stato: 'aperte', periodo: '90', ...leggi(), q: '' }));
  useEffect(() => { try { const { q, ...resto } = f; localStorage.setItem('nembo_att_f', JSON.stringify(resto)); } catch (e) {} }, [f]);
  return [f, p => setF(x => ({ ...x, ...p }))];
}
function filtraAtt(records, f, kanban) {
  const lim = f.periodo ? dayShift(today(), -(+f.periodo)) : '';
  const q = normT(f.q.trim());
  return records.filter(r => {
    if (!AVANZ_TIPI.includes(r.type) || r._new) return false;
    if (f.bu && !ATT_BU[f.bu].includes(r.type)) return false;
    if (f.tipo && predefKey(r) !== f.tipo) return false;
    const st = avanzDi(r);
    if (!kanban && f.stato === 'aperte' && st === 'conclusa') return false;
    if (!kanban && f.stato && f.stato !== 'aperte' && st !== f.stato) return false;
    // nel periodo: le attività future e quelle non concluse ci sono sempre
    if (lim && st === 'conclusa' && (attData(r) || '') < lim) return false;
    if (lim && !kanban && f.stato === '' && (attData(r) || '9999') < lim) return false;
    if (q && !normT([placeLabel(r), r.codice, r.cliente, r.commessa, TIPO_NOME(r), r.appunti].join(' ')).includes(q)
      && !(cercaVoci(r) || []).some(v => normT(v.testo || v.t || '').includes(q))) return false;
    return true;
  }).sort((a, b) => (attData(b) || '').localeCompare(attData(a) || ''));
}
function FiltriAtt({ f, set, kanban }) {
  const sel = (k, label, opts) => html`<label class="att-flt"><span>${label}</span><select value=${f[k]} onChange=${e => set({ [k]: e.target.value })}>${opts.map(([v, l]) => html`<option value=${v}>${l}</option>`)}</select></label>`;
  return html`<div class="att-tools">
    <label class="att-search"><${Icon} n="search" s=${18} /><input type="search" value=${f.q} placeholder="Cerca indirizzo, sigla, osservazione…" aria-label="Cerca nelle attività" onInput=${e => set({ q: e.target.value })} /></label>
    ${sel('bu', 'BU', [['', 'Tutte'], ['ambiente', 'Ambiente'], ['hs', 'HSE']])}
    ${sel('tipo', 'Tipo', ATT_TIPI_F)}
    ${!kanban && sel('stato', 'Stato', [['aperte', 'Aperte'], ['', 'Tutte'], ...AVANZ.map(([k, l]) => [k, l])])}
    ${sel('periodo', 'Periodo', ATT_PERIODI)}
  </div>`;
}
function AttTabella({ L, od, sel, onSel, todos }) {
  return html`<div class="card att-tab"><div class="att-scroll"><div class="att-rows" role="table" aria-label="Attività">
    <div class="att-hd" role="row"><span>Data</span><span>Indirizzo</span><span>Tipo</span><span>Stato</span><span>ToDo</span><span aria-label="OneDrive"></span></div>
    ${L.map(r => { const st = avanzDi(r), o = odStatus(od, r), T = todos.filter(t => t.att === r.id), ap = T.filter(t => !t.fatto), late = ap.some(todoScaduto);
      return html`<button type="button" role="row" key=${r.id} class=${'att-row' + (sel === r.id ? ' on' : '')} onClick=${() => onSel(r.id)}>
        <span class="att-d">${attData(r) ? fmtD(attData(r)).slice(0, 5) : '—'}</span>
        <span class="att-a"><b>${r.drone && html`<${DroneIc} s=${14} />`}${attVia(r)}</b><small>${[r.citta, attContenuto(r)].filter(Boolean).join(' · ')}</small></span>
        <span><span class="att-tt" style=${'--c:' + attColore(r)}><i></i>${TIPO_NOME(r)}</span></span>
        <span class="att-st" style=${'--s:' + avanzC(st)}><i></i>${avanzL(st)}</span>
        <span class=${'att-c' + (late ? ' att-late' : '')} title=${late ? 'ToDo scaduto' : null}>${T.length ? (T.length - ap.length) + '/' + T.length : '—'}</span>
        <span class=${'att-od od-' + (o || 'no')} title=${o === 'ok' ? 'Su OneDrive' : o === 'stale' ? 'Da ricaricare' : o === 'err' ? 'Invio incompleto' : 'Da caricare'}><${Icon} n="share" s=${17} /></span>
      </button>`; })}
    ${!L.length && html`<div class="empty"><b>Nessuna attività</b>Cambia i filtri o il periodo per vederne altre.</div>`}
  </div></div></div>`;
}
function AttKanban({ L, todos, onSel, sposta }) {
  const [drop, setDrop] = useState(null);
  const trascinata = useRef(null);
  return html`<div class="att-kb">${AVANZ.map(([k, l, c]) => { const C = L.filter(r => avanzDi(r) === k); const vis = k === 'conclusa' ? C.slice(0, 12) : C;
    return html`<section key=${k} class=${'kb-col' + (drop === k ? ' drop' : '')} aria-label=${l}
      onDragOver=${e => { e.preventDefault(); if (drop !== k) setDrop(k); }} onDragLeave=${e => { if (!e.currentTarget.contains(e.relatedTarget)) setDrop(null); }}
      onDrop=${e => { e.preventDefault(); setDrop(null); const r = L.find(x => x.id === trascinata.current); if (r) sposta(r, k); }}>
      <div class="kb-h"><i class="mdot" style=${'background:' + c}></i><b>${l}</b><span class="n">${C.length}</span></div>
      <div class="kb-auto">${k === 'programmata' ? 'Dalla Programmazione' : k === 'in_corso' ? 'Dal giorno del sopralluogo' : k === 'report' ? 'Con «Concludi attività»' : 'Trascinando la card'}</div>
      ${vis.map(r => { const T = todos.filter(t => t.att === r.id), f = T.filter(t => t.fatto).length, late = T.some(todoScaduto);
        return html`<button type="button" key=${r.id} class=${'kb-card' + (late ? ' st-bar st-warn' : '')} draggable="true"
          onDragStart=${e => { trascinata.current = r.id; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', r.id); } catch (x) {} }} onClick=${() => onSel(r.id)}>
          <span class="att-tt sm" style=${'--c:' + attColore(r)}><i></i>${TIPO_NOME(r)}</span>
          <b>${r.drone && html`<${DroneIc} s=${14} />`}${attVia(r)}</b>
          <small>${[r.citta, attData(r) && fmtD(attData(r))].filter(Boolean).join(' · ')}</small>
          ${T.length > 0 && html`<span class="kb-td"><span class=${late ? 'att-late' : ''}>${late ? 'ToDo scaduto · ' : 'ToDo '}${f}/${T.length}</span><span class="kb-bar"><i style=${'width:' + Math.round(f / T.length * 100) + '%'}></i></span></span>`}
        </button>`; })}
      ${C.length > vis.length && html`<div class="kb-more">e altre ${C.length - vis.length}: le trovi nella tabella</div>`}
      ${!C.length && html`<div class="kb-vuota">Nessuna attività</div>`}
    </section>`; })}</div>`;
}
function AttivitaView({ records, todos, settings, saveRec, removeRec, openRec, wide }) {
  const od = useOdSynced();
  const [f, set] = useFiltriAtt();
  const [sel, setSel] = useState(null);
  const [todo, setTodo] = useState(null);
  const kanban = f.vista === 'kb';
  const L = filtraAtt(records, f, kanban);
  const { sposta, avviso } = useSposta(todos, saveRec);
  const A = useTodoAzioni(saveRec, removeRec);
  const cur = sel && records.find(r => r.id === sel);
  const curTodo = todo && todos.find(t => t.id === todo);
  const det = cur && html`<${AttDettaglio} key=${cur.id} r=${cur} records=${records} todos=${todos} settings=${settings} saveRec=${saveRec} removeRec=${removeRec}
    openRec=${openRec} sposta=${sposta} onTodo=${t => setTodo(t.id)} onClose=${() => setSel(null)} />`;
  const testa = html`<div class="att-top">
    <div class="seg att-vista" role="tablist" aria-label="Vista">
      <button role="tab" aria-selected=${!kanban} class=${!kanban ? 'on' : ''} onClick=${() => set({ vista: 'tab' })}><${Icon} n="list" s=${17} /> Tabella</button>
      <button role="tab" aria-selected=${kanban} class=${kanban ? 'on' : ''} onClick=${() => set({ vista: 'kb' })}><${Icon} n="kanban" s=${17} /> Kanban</button></div>
    <span class="att-n">${L.length} ${L.length === 1 ? 'attività' : 'attività'}</span></div>`;
  const elenco = html`<div class="content att-view"><${Suggerimento} id="attivita" />${testa}<${FiltriAtt} f=${f} set=${set} kanban=${kanban} />
    ${kanban ? html`<${AttKanban} L=${L} todos=${todos} onSel=${setSel} sposta=${sposta} />` : html`<${AttTabella} L=${L} od=${od} sel=${sel} onSel=${setSel} todos=${todos} />`}</div>`;
  return html`${!kanban && wide ? html`<div class="split-body att-split"><div class="split-list">${elenco}</div>
      <div class="split-detail">${det || html`<div class="split-empty"><b>Nessuna attività selezionata</b>Cliccane una nella tabella: qui vedi cosa è stato raccolto in campo, senza generare il report.</div>`}</div></div>`
    : html`${elenco}${cur && html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && setSel(null)}><div class="sheet att-sheet" role="dialog" aria-label="Attività">
        <div class="sheet-grab"></div><div class="sheet-nav"><button class="btn link" onClick=${() => setSel(null)}>Chiudi</button><b>Attività</b><span></span></div>
        <div class="sheet-body">${det}</div></div></div>`}`}
    ${curTodo && html`<${TodoSheet} t=${curTodo} records=${records} onSave=${saveRec} onElimina=${A.elimina} onClose=${() => setTodo(null)} />`}
    ${avviso}`;
}
