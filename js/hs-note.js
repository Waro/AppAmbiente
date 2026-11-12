/* Sopralluogo HSE a note (primo sopralluogo, v53): stessa interfaccia del Verbale HSE.
   Schede Anagrafica · Note · Check-list · File. I tag proposti sono i capitoli del formato scelto (Esteso o Sintetico);
   quando una nota ha il tag di un capitolo compaiono i tag delle sue sottosezioni (Esteso) o delle sue voci (Sintetico).
   Il Word si compila come un report del formato scelto (hsNoteAOld). I report a schede o checklist restano in js/hs.js. */

/* ---------------- capitoli e tag ---------------- */
// Esteso: le 13 schede, sottosezioni = nomi delle sottosezioni
const HS_CAPI_E = HS_SCHEDE.map((s, i) => ({ k: s.k, n: i + 1, tag: s.s || s.l, subs: (s.subs || []).map(sb => ({ id: sb, tag: sb })) }));
// Sintetico: capitoli 3-7, sottosezioni = voci della checklist con numero e testo breve (es. «3.2 Recinzione deteriorata»)
const hsVoceTag = it => it.ref + ' ' + it.txt.replace(/\s*\(.*$/, '').split(/\s+/).slice(0, 5).join(' ').replace(/[,;:.…]+$/, '');
const HS_CAPI_S = Object.keys(HS_SINT_TIT).map(Number).map(c => ({ k: 'c' + c, n: c, tag: HS_SINT_TIT[c], subs: HS_SINT_ALL.filter(it => it.ref.split('.')[0] === String(c)).map(it => ({ id: it.id, ref: it.ref, tag: hsVoceTag(it) })) }));
// formatoLibero (v56): l'osservazione si raccoglie sempre con i capitoli dell'Esteso; Esteso o Sintetico si scelgono quando generi il report
const hsCapi = r => r.formato === 'sintetico' && !r.formatoLibero ? HS_CAPI_S : HS_CAPI_E;
// capitolo dell'Esteso → capitolo del Sintetico (3 Aree esterne, 4 Fabbricati, 5 Locali tecnici ed impianti, 6 Condizioni ambientali, 7 Gestione emergenze)
const HS_E2S = { agibilita: 4, prevenzione: 7, esterne: 3, involucro: 4, strutture: 4, interni: 4, elettrici: 5, meccanici: 5, antincendio: 7, sollevamento: 5, pericolosi: 6, ambientali: 6, emergenze: 7 };
// sopralluogo a formato libero → sopralluogo a note del Sintetico: il tag del capitolo diventa il capitolo del Sintetico; la sottosezione resta nel testo
function hsInSintetico(r) {
  const x = JSON.parse(JSON.stringify(r)); x.formatoLibero = false; x.formato = 'sintetico';
  x.noteSop = (r.noteSop || []).map(n => { const c = hsCapDi(n, HS_CAPI_E); if (!c) return n; const sb = hsSubDi(n, HS_CAPI_E);
    return { ...n, tag: [HS_SINT_TIT[HS_E2S[c.k]]], testo: sb && n.testo ? sb.tag + ': ' + n.testo : n.testo }; });
  // capitolo del Sintetico non pertinente solo se lo sono tutti i capitoli dell'Esteso che vi confluiscono
  const np = {}; Object.keys(HS_SINT_TIT).forEach(k => { const E = HS_CAPI_E.filter(c => HS_E2S[c.k] === +k); np['c' + k] = E.length > 0 && E.every(c => (r.np || {})[c.k]); });
  x.np = np; return x;
}
const ugT = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
// il primo tag di capitolo decide il capitolo; la sottosezione è il primo tag che corrisponde a una sua sottosezione (o voce)
const hsCapDi = (n, C) => { for (const t of (n && n.tag) || []) { const c = C.find(x => ugT(x.tag, t)); if (c) return c; } return null; };
const hsSubDi = (n, C) => {
  const c = hsCapDi(n, C); if (!c) return null;
  for (const t of n.tag || []) { const m = String(t).trim().match(/^(\d+\.\d+)(\s|$)/); const sb = c.subs.find(x => ugT(x.tag, t) || (m && x.ref === m[1])); if (sb) return sb; }
  return null;
};
const newNotaHs = (p = {}) => ({ id: uid('n'), titolo: '', testo: '', mig: '', tag: [], ...p });
const hsNoteDi = (r, c) => (r.noteSop || []).filter(n => { const x = hsCapDi(n, hsCapi(r)); return x && x.k === c.k; });
// stato del capitolo nella Check-list: verde con note, grigio «Non pertinente» (scelto a mano, vale solo senza note), rosso senza note
function hsStatoCap(r, c) {
  const L = hsNoteDi(r, c);
  if (L.length) return { st: 'st-ok', w: L.length + (L.length === 1 ? ' osservazione' : ' osservazioni') };
  return (r.np || {})[c.k] ? { st: 'st-off', w: 'Non pertinente' } : { st: 'st-err', w: 'Senza osservazioni' };
}
const hsCapRossi = r => hsCapi(r).filter(c => hsStatoCap(r, c).st === 'st-err');
// note in ordine di Word: capitoli nell'ordine del modello, poi quelle senza capitolo
function hsNoteGruppi(r) {
  const C = hsCapi(r), L = r.noteSop || [];
  const G = C.map(c => ({ c, note: L.filter(n => { const x = hsCapDi(n, C); return x && x.k === c.k; }) })).filter(g => g.note.length);
  const senza = L.filter(n => !hsCapDi(n, C));
  if (senza.length) G.push({ c: null, note: senza });
  return G;
}
// numero della nota: l'ordine in cui le note compaiono (capitoli nell'ordine del modello), non quello di inserimento
const hsNumNote = r => { const m = {}; hsNoteGruppi(r).flatMap(g => g.note).forEach((n, i) => { m[n.id] = i + 1; }); return m; };
// tag proposti a una nota (o a più note): prima le sottosezioni (o voci) del capitolo scelto, poi i capitoli
const hsTagFissi = (r, note) => {
  const C = hsCapi(r), caps = [...new Set(note.map(n => (hsCapDi(n, C) || {}).k))];
  const c = caps.length === 1 && caps[0] ? C.find(x => x.k === caps[0]) : null;
  return [...(c ? c.subs.map(x => x.tag) : []), ...C.map(x => x.tag)];
};
const NESSUNA = 'Nessuna criticità rilevata';
const hsTestoNota = n => [(n.testo || '').trim() || (n.titolo || '').trim(), (n.mig || '').trim()].filter(Boolean);

/* Sopralluogo a note → report del formato scelto, per compilare il Word con il motore di sempre.
   Esteso: le note del capitolo vanno nella sua scheda (prima quelle senza sottosezione), le attività di miglioramento in «Attività di
   miglioramento»; sezioni e sottosezioni senza note e capitoli non pertinenti: «Nessuna criticità rilevata». Tabella di rischio vuota.
   Sintetico: nota con capitolo e voce → annotazioni della voce; nota con il solo capitolo → «Condizioni generali» («Capitolo: testo»).
   Risposte Sì/No/N.A. e azioni vuote. Le foto seguono l'ordine dei capitoli e passano alla sezione o alla voce della nota;
   quelle delle note senza capitolo restano fuori dal Word, come le note. Una nota senza testo (solo foto o solo attività di
   miglioramento) non fa scrivere «Nessuna criticità rilevata». */
// perScheda: per il report a schede del sopralluogo periodico le note senza sottosezione di un capitolo con sottosezioni
// vanno nella prima sottosezione (come quando si rilegge il Word), perché nella scheda non c'è un campo per il capitolo
function hsNoteAOld(r, perScheda) {
  if (r.formatoLibero && r.formato === 'sintetico') r = hsInSintetico(r);
  const x = JSON.parse(JSON.stringify(r)), C = hsCapi(r), np = r.np || {}, ref = {}, ordine = {};
  hsNoteGruppi(r).forEach((g, gi) => g.note.forEach((n, k) => { ordine[n.id] = gi * 1000 + k; }));
  if (r.formato === 'sintetico') {
    const note = {}, descr = [];
    (r.noteSop || []).forEach(n => {
      const c = hsCapDi(n, C), sb = hsSubDi(n, C), t = hsTestoNota(n); if (!c) return;
      ref[n.id] = sb ? sb.id : ''; if (!t.length) return; // la foto di una nota senza testo resta collegata alla voce
      if (sb) note[sb.id] = (note[sb.id] ? note[sb.id] + '\n' : '') + t.join('\n');
      else descr.push(c.tag + ': ' + t.join(' '));
    });
    Object.assign(x, { note, descr: descr.join('\n'), risp: {}, azioni: [] });
  } else {
    x.schede = Object.fromEntries(HS_SCHEDE.map(s => [s.k, hsEmptyScheda(s)]));
    C.forEach(c => {
      const d = x.schede[c.k], L = hsNoteDi(r, c), testi = L2 => L2.map(n => hsTestoNota(n)[0] && ((n.testo || '').trim() || n.titolo)).filter(Boolean).join('\n');
      if (np[c.k] && !L.length) { if (c.subs.length) c.subs.forEach(sb => { d.subs[sb.id] = NESSUNA; }); else d.sit = NESSUNA; return; }
      const senza = L.filter(n => !hsSubDi(n, C));
      d.sit = testi(senza) || (c.subs.length || perScheda || senza.length ? '' : NESSUNA);
      senza.forEach(n => { ref[n.id] = 'sch.' + c.k + (perScheda && c.subs.length ? '.' + c.subs[0].id : ''); });
      c.subs.forEach(sb => { const Ls = L.filter(n => hsSubDi(n, C) === sb); d.subs[sb.id] = testi(Ls) || (perScheda || Ls.length ? '' : NESSUNA); Ls.forEach(n => { ref[n.id] = 'sch.' + c.k + '.' + sb.id; }); });
      if (perScheda && c.subs.length && d.sit) { const sb = c.subs[0].id; d.subs[sb] = d.subs[sb] ? d.sit + '\n' + d.subs[sb] : d.sit; d.sit = ''; }
      d.mig = L.map(n => (n.mig || '').trim()).filter(Boolean).join('\n');
    });
  }
  const tit = {}; (r.noteSop || []).forEach(n => { tit[n.id] = n.titolo || ''; });
  const nid = p => String(p.ref || '').startsWith('n.') ? p.ref.slice(2) : null;
  x.foto = (r.foto || []).map((p, i) => ({ p, i, o: nid(p) in ordine ? ordine[nid(p)] : 1e9 })).sort((a, b) => a.o - b.o || a.i - b.i)
    .map(({ p }) => { const id = nid(p); return id ? { ...p, ref: ref[id] || '', cap: p.cap || tit[id] || '', inc: id in ref ? p.inc : false } : p; });
  // nel Word del primo sopralluogo tutto è nero; nel periodico che parte da qui le righe nuove tornano rosse
  x.base = {}; if (perScheda) delete x.novitaRosso; else x.novitaRosso = false;
  delete x.aNote; delete x.noteSop; delete x.np;
  return x;
}
// nuovo sopralluogo a note
function newHsNote(records, settings, formato) { return { ...newHs(records, settings, formato), aNote: true, noteSop: [], np: {} }; }

/* ---------------- selezione di più note (anche nel Verbale HSE) ---------------- */
// tocco prolungato su una nota: si entra nella selezione; tocco = seleziona o togli
function useNoteSel() {
  const [sel, setSel] = useState(null); // null = nessuna selezione, altrimenti Set di id
  const t = useRef(null), p0 = useRef([0, 0]), skip = useRef(0); // skip: istante fino a cui non conta il tocco che chiude il tocco prolungato
  const cancel = () => { clearTimeout(t.current); t.current = null; };
  const toggle = id => setSel(s => { const x = new Set(s || []); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const press = (id, e) => {
    if (e.pointerType === 'mouse' || (e.target.closest && e.target.closest('input, textarea, select, button, label, a'))) return;
    cancel(); p0.current = [e.clientX, e.clientY];
    t.current = setTimeout(() => {
      t.current = null; skip.current = Date.now() + 4000;
      // la scheda premuta sparisce (al suo posto le righe): la fine del tocco si ascolta sulla finestra
      const fine = e => { skip.current = e.type === 'pointerdown' ? 0 : Date.now() + 80; EV.forEach(k => removeEventListener(k, fine, true)); };
      const EV = ['pointerup', 'pointercancel', 'pointerdown']; EV.forEach(k => addEventListener(k, fine, true));
      setSel(s => { const x = new Set(s || []); x.add(id); return x; }); try { navigator.vibrate && navigator.vibrate(18); } catch (err) { /* senza vibrazione */ }
    }, 480);
  };
  const props = id => ({
    onPointerDown: e => press(id, e), onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onPointerMove: e => { if (t.current && Math.hypot(e.clientX - p0.current[0], e.clientY - p0.current[1]) > 10) cancel(); },
    onContextMenu: e => { if (sel || t.current || Date.now() < skip.current) e.preventDefault(); },
  });
  const click = id => { if (Date.now() < skip.current) { skip.current = 0; return; } toggle(id); };
  return { sel, setSel, props, click, toggle, start: () => setSel(new Set()) };
}
// intestazione della selezione dentro la scheda: Annulla · N selezionate · Tutte
function NoteSelHead({ n, onStop, onAll }) {
  useBackClose(onStop);
  return html`<div class="selhead in" role="toolbar" aria-label="Selezione delle osservazioni">
    <button class="btn link" onClick=${onStop}>Annulla</button><b>${n} ${n === 1 ? 'selezionata' : 'selezionate'}</b>
    <button class="btn link" onClick=${onAll}>Tutte</button></div>`;
}
// «Seleziona» per il PC, dove il tocco prolungato non c'è (come negli elenchi)
const NoteSelBtn = ({ ns }) => html`<div class="sel-riga"><button class="btn link" onClick=${ns.start}>Seleziona</button></div>`;
// riga compatta di una nota durante la selezione
function NotaSelRiga({ n, i, on, onClick }) {
  return html`<button class=${'rcard sel-mode' + (on ? ' sel' : '')} key=${n.id} onClick=${onClick} aria-pressed=${on}>
    <span class="selck" aria-hidden="true">${on && html`<${Icon} n="check" s=${15} w=${3} />`}</span>
    <div class="r1"><span class="id">Osservazione ${i + 1}</span></div>
    <div class="ttl">${n.titolo || (n.testo || '').split('\n')[0] || '—'}</div>
    ${(n.tag || []).length > 0 && html`<div class="sum">${n.tag.map(t => html`<span key=${t} class="hs-tagtx" style=${'color:' + tagColor(t)}>#${t}</span>`)}</div>`}</button>`;
}
/* Tag di più note insieme: per ogni tag tutte (acceso), alcune (k/N) o nessuna; un tocco lo mette a tutte o lo toglie a tutte. */
function TagMultiSheet({ note, fissi, altri, onSet, onClose }) {
  useBackClose(onClose);
  const [q, setQ] = useState('');
  const N = note.length;
  const conta = t => note.filter(n => (n.tag || []).some(x => x.toLowerCase() === t.toLowerCase())).length;
  const tutti = [...fissi, ...altri.filter(t => !fissi.some(f => f.toLowerCase() === t.toLowerCase()))];
  const qq = q.trim().toLowerCase();
  const vis = tutti.filter(t => !qq || t.toLowerCase().includes(qq));
  const nuovo = q.trim() && !tutti.some(t => t.toLowerCase() === qq);
  const tocca = t => { const k = conta(t); onSet(note.map(n => n.id), n => {
    const has = (n.tag || []).some(x => x.toLowerCase() === t.toLowerCase());
    const tag = k === N ? (n.tag || []).filter(x => x.toLowerCase() !== t.toLowerCase()) : has ? n.tag : [...(n.tag || []), t];
    return { tag };
  }); };
  const riga = t => { const k = conta(t); return html`<button key=${t} class=${'tag' + (k ? '' : ' sugg')} role="checkbox" aria-checked=${k === N ? 'true' : k ? 'mixed' : 'false'}
    style=${k === N ? tagStyle(t, true) : k ? tagStyle(t) : 'color:' + tagColor(t)} onClick=${() => tocca(t)}>#${t}${k > 0 && k < N ? html` <span class="hs-tagk">${k}/${N}</span>` : null}</button>`; };
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet" role="dialog" aria-label=${'Tag (' + N + ')'}>
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>Tag (${N})</b><span></span></div>
    <div class="sheet-body">
      <input class="inp mt-1" value=${q} placeholder="Scrivi un tag o scegline uno" onInput=${e => setQ(e.target.value)}
        onKeyDown=${e => { if (e.key === 'Enter' && q.trim()) { e.preventDefault(); const t = tutti.find(x => x.toLowerCase() === qq) || q.trim().replace(/^#/, ''); if (conta(t) < N) tocca(t); setQ(''); } }} />
      <div class="tags-row mt-3">${nuovo && html`<button class="tag new" onClick=${() => { tocca(q.trim().replace(/^#/, '')); setQ(''); }}>Crea «${q.trim()}»</button>`}${vis.map(riga)}</div>
    </div></div></div>`;
}

/* ---------------- nota ---------------- */
function HsNotaCard({ n, i, r, up, updN, delN, move, primo, ultimo, selProps }) {
  const riform = (sit, mig) => updN(n.id, { testo: sit, mig: mig ? ((n.mig || '').replace(/\s+$/, '') + (n.mig && n.mig.trim() ? '\n' : '') + mig) : n.mig });
  return html`<div class="card vs-nota" id=${'n-' + n.id} ...${selProps}>
    <div class="vs-h"><span class="vs-n">Osservazione ${i + 1}</span><span class="tb-grow"></span>
      <button class="x" title="Prima" aria-label="Sposta prima" disabled=${primo} onClick=${() => move(n, -1)}>‹</button>
      <button class="x" title="Dopo" aria-label="Sposta dopo" disabled=${ultimo} onClick=${() => move(n, 1)}>›</button>
      <button class="x" title="Elimina l'osservazione" aria-label="Elimina l'osservazione" onClick=${() => delN(n)}><${Icon} n="trash" s=${15} /></button></div>
    <${Inp} label="Titolo" value=${n.titolo} set=${v => updN(n.id, { titolo: v })} placeholder="es. Uscita di emergenza lato nord" />
    <${HsText} label="Situazione rilevata" rows=${4} gruppo="Situazione rilevata" value=${n.testo} set=${v => updN(n.id, { testo: v })}
      onRiformula=${riform} foto=${{ r, up, rif: 'n.' + n.id, nome: n.titolo || 'Osservazione ' + (i + 1), togli: true }} />
    <${HsText} label="Attività di miglioramento" rows=${2} gruppo="Attività di miglioramento" value=${n.mig} set=${v => updN(n.id, { mig: v })} />
    <${TagPicker} tags=${n.tag || []} set=${t => updN(n.id, { tag: t })} fissi=${hsTagFissi(r, [n])} />
  </div>`;
}

/* ---------------- scheda Note ---------------- */
function HsNoteTab({ r, up, ns, filtro, setFiltro, addN, onRiep }) {
  const note = r.noteSop || [], C = hsCapi(r), num = hsNumNote(r);
  const tagsV = Object.keys(collectTags(note)).sort((a, b) => a.localeCompare(b, 'it'));
  const updN = (id, p) => up(q => ({ ...q, noteSop: (q.noteSop || []).map(n => n.id === id ? { ...n, ...p } : n) }));
  const delN = async n => {
    if (!confirm('Eliminare l\'osservazione' + (n.titolo ? ' «' + n.titolo + '»' : '') + '?')) return;
    const fs = (r.foto || []).filter(p => p.ref === 'n.' + n.id);
    for (const p of fs) await removeBlob(p.id);
    up(q => ({ ...q, noteSop: q.noteSop.filter(x => x.id !== n.id), foto: (q.foto || []).filter(p => p.ref !== 'n.' + n.id) }));
  };
  // ‹ › spostano la nota dentro il suo capitolo
  const move = (n, d) => up(q => {
    const L = q.noteSop.slice(), k = (hsCapDi(n, C) || {}).k || null;
    const stesso = L.filter(x => ((hsCapDi(x, C) || {}).k || null) === k && (!filtro || (x.tag || []).includes(filtro))); // con il filtro: solo fra le note visibili
    const a = stesso.findIndex(x => x.id === n.id), b = a + d; if (b < 0 || b >= stesso.length) return q;
    const i = L.indexOf(stesso[a]), j = L.indexOf(stesso[b]); [L[i], L[j]] = [L[j], L[i]]; return { ...q, noteSop: L };
  });
  const G = hsNoteGruppi(r).map(g => ({ ...g, note: g.note.filter(n => !filtro || (n.tag || []).includes(filtro)) })).filter(g => g.note.length);
  const nFoto = (r.foto || []).length;
  const caps = C.filter(c => hsStatoCap(r, c).st !== 'st-err').length;
  const ord = G.flatMap(g => g.note);
  return html`<div>
    ${ns.sel && html`<${NoteSelHead} n=${ord.filter(n => ns.sel.has(n.id)).length} onStop=${() => ns.setSel(null)} onAll=${() => ns.setSel(s => ord.every(n => s.has(n.id)) ? new Set() : new Set(ord.map(n => n.id)))} />`}
    <div class="card-navy"><div class="sum3">
      <div><b>${note.length}</b><span>${note.length === 1 ? 'osservazione' : 'osservazioni'}</span></div>
      <div><b>${caps}<small>/${C.length}</small></b><span>capitoli</span></div>
      <div><b>${nFoto}</b><span>foto</span></div></div>${onRiep && html`<${RiepGo} onOpen=${onRiep} />`}</div>
    ${tagsV.length > 0 && html`<div class="vs-filter mt-3"><button class=${'tag' + (!filtro ? ' on' : ' sugg')} onClick=${() => setFiltro(null)}>Tutte</button>
      ${tagsV.map(t => html`<button key=${t} class=${'tag' + (filtro === t ? ' on' : '')} style=${tagStyle(t, filtro === t)} onClick=${() => setFiltro(filtro === t ? null : t)}>#${t}</button>`)}</div>`}
    ${!note.length && html`<div class="card mt-3"><div class="empty" style="padding:var(--sp-4)">Nessuna osservazione. Tocca «Nuova osservazione» per aggiungerne una.</div></div>`}
    ${note.length > 0 && !ns.sel && html`<${NoteSelBtn} ns=${ns} />`}
    ${ns.sel ? G.map(g => html`<div key=${'g-' + (g.c ? g.c.k : '-')}>
      <div class="sec-h"><h3>${g.c ? g.c.n + '. ' + g.c.tag : 'Senza capitolo'}</h3><span class="hint">${g.note.length}</span></div>
      <div class="list">${g.note.map(n => html`<${NotaSelRiga} key=${n.id} n=${n} i=${num[n.id] - 1} on=${ns.sel.has(n.id)} onClick=${() => ns.click(n.id)} />`)}</div></div>`)
    // elenco piatto con le intestazioni dei capitoli: la nota che cambia capitolo si sposta senza richiudere la scelta dei tag
    : G.flatMap(g => [
      html`<div class="sec-h" key=${'h-' + (g.c ? g.c.k : '-')}><h3>${g.c ? g.c.n + '. ' + g.c.tag : 'Senza capitolo'}</h3><span class="hint">${g.note.length}</span></div>`,
      !g.c && html`<div class="notice mb-2" key="h-senza">Queste osservazioni non vanno nel Word: aggiungi il tag di un capitolo.</div>`,
      ...g.note.map((n, k) => html`<${HsNotaCard} key=${n.id} n=${n} i=${num[n.id] - 1} r=${r} up=${up} updN=${updN} delN=${delN} move=${move} primo=${k === 0} ultimo=${k === g.note.length - 1} selProps=${ns.props(n.id)} />`)]).filter(Boolean)}
    ${!ns.sel && html`<button class="btn dashed block mt-1" onClick=${() => addN()}>+ Nuova osservazione</button>`}
  </div>`;
}
// fotocamera nella barra: la foto apre una nota nuova
function HsNotaCam({ r, up, onNota }) {
  const inp = useRef();
  return html`<button class="btn-icon lg" aria-label="Foto in una nuova osservazione" title="Foto in una nuova osservazione" onClick=${() => camOpen(inp.current)}><${Icon} n="camera" s=${22} />
    <input ref=${inp} type="file" accept="image/*" capture="environment" hidden onClick=${e => e.stopPropagation()}
      onChange=${async e => {
        const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
        if ((r.foto || []).length >= HS_MAX_FOTO) { toast('Limite di ' + HS_MAX_FOTO + ' foto per report'); return; }
        const n = onNota(), k = await hsAddPhotos(fs, 'new', 'n.' + n.id, up, (r.foto || []).length);
        if (k) toast('Foto aggiunta in una nuova osservazione'); else up(q => ({ ...q, noteSop: (q.noteSop || []).filter(x => x.id !== n.id) })); // foto non salvata: la nota vuota non resta
      }} /></button>`;
}

/* ---------------- anagrafica (Esteso e Sintetico) ---------------- */
function HsDatiEst({ r, up }) {
  const setM = patch => up(p => ({ ...p, meta: { ...p.meta, ...patch } }));
  const setImg = (k, id) => up(p => ({ ...p, img: { ...(p.img || {}), [k]: id || undefined } }));
  return html`<div class="card"><div class="grid2">
      <${Inp} cls="full" label="Nome del sito" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} />
      <${Inp} cls="full" label="Indirizzo immobile" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} />
      <${Inp} label="Comune (piè di pagina)" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} label="Data sopralluogo" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} cls="full" label="Presenti al sopralluogo" value=${r.meta.presenti} set=${v => setM({ presenti: v })} imp=${impOf(r, 'meta.presenti')} />
      <${Inp} label="Proprietà" value=${r.meta.proprieta} set=${v => setM({ proprieta: v })} imp=${impOf(r, 'meta.proprieta')} />
      <${Inp} label="Committente" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Protocollo" value=${r.meta.protocollo} set=${v => setM({ protocollo: v })} imp=${impOf(r, 'meta.protocollo')} />
      <${Inp} label="Redatto da" value=${r.meta.redatto} set=${v => setM({ redatto: v })} imp=${impOf(r, 'meta.redatto')} />
      <${Inp} label="Verificato da" value=${r.meta.verificato} set=${v => setM({ verificato: v })} imp=${impOf(r, 'meta.verificato')} />
      <${Inp} label="Revisione" value=${r.meta.revisione} set=${v => setM({ revisione: v })} imp=${impOf(r, 'meta.revisione')} />
      <${Inp} label="Superficie immobile" value=${r.meta.superficie} set=${v => setM({ superficie: v })} imp=${impOf(r, 'meta.superficie')} placeholder="es. circa 30.000 mq" />
    </div><div class="divider"></div>
    <${ImgSlot} label="Foto di copertina" id=${(r.img || {}).copertina} set=${id => setImg('copertina', id)} />
    <div style="height:var(--sp-3)"></div><${ImgSlot} label="Firma / timbro (copertina)" id=${(r.img || {}).firma} set=${id => setImg('firma', id)} /></div>
    <div class="sec-h"><h3>Sopralluoghi precedenti</h3></div>
    <div class="card tight">${(r.visite || []).map((v, i) => html`<div class="stack mb-3" key=${i}><div class="row"><b class="tb-grow">Sopralluogo ${i + 1}</b><button class="x" aria-label="Elimina" onClick=${() => up(p => ({ ...p, visite: p.visite.filter((_, j) => j !== i) }))}>×</button></div>
        <label class="fld"><span>Data</span><input placeholder=" " value=${v.data} onInput=${e => up(p => ({ ...p, visite: p.visite.map((x, j) => j === i ? { ...x, data: e.target.value } : x) }))} /></label>
        <label class="fld"><span>Presenti</span><input placeholder=" " value=${v.presenti} onInput=${e => up(p => ({ ...p, visite: p.visite.map((x, j) => j === i ? { ...x, presenti: e.target.value } : x) }))} /></label></div>`)}
      <button class="btn dashed" onClick=${() => up(p => ({ ...p, visite: [...(p.visite || []), { data: '', presenti: '' }] }))}>+ Aggiungi sopralluogo precedente</button></div>`;
}
function HsAnagEst({ r, up }) {
  const B = r.base || {};
  return html`<div class="card"><div class="grid2">${HS_AN_KEYS.filter(([k]) => k !== 'descrizione').map(([k, l]) => HS_AN_OPT[k]
        ? html`<label class="fld" key=${k}><span>${l}</span><select value=${r.an[k] || ''} onChange=${e => up(p => ({ ...p, an: { ...p.an, [k]: e.target.value } }))}>
            ${[...new Set([...HS_AN_OPT[k], r.an[k] || ''])].map(o => html`<option value=${o}>${o || '—'}</option>`)}</select></label>`
        : html`<${Inp} key=${k} label=${l} value=${r.an[k]} imp=${impOf(r, 'an.' + k)} set=${v => up(p => ({ ...p, an: { ...p.an, [k]: v } }))} />`)}</div>
      <div class="divider"></div><${HsText} label="Descrizione sintetica dell'immobile" value=${r.an.descrizione} base=${B['an.descrizione']} set=${v => up(p => ({ ...p, an: { ...p.an, descrizione: v } }))} /></div>`;
}
function HsInqEst({ r, up }) {
  const B = r.base || {};
  const setImg = (k, id) => up(p => ({ ...p, img: { ...(p.img || {}), [k]: id || undefined } }));
  return html`<div class="card"><${HsText} label="Inquadramento" value=${r.inquadramento} base=${B.inquadramento} set=${v => up({ inquadramento: v })} placeholder="Ubicazione, accessi, organizzazione del complesso…" />
      <div class="divider"></div><${ImgSlot} label="Ubicazione dell'immobile (estratto cartografico)" id=${(r.img || {}).mappa} set=${id => setImg('mappa', id)} />
      <div style="height:var(--sp-3)"></div><${ImgSlot} label="Fotografia aerea di inquadramento" id=${(r.img || {}).aerea} set=${id => setImg('aerea', id)} /></div>
    <div class="sec-h"><h3>Riferimenti catastali</h3></div>
    <div class="card"><${ImgSlot} label="Planimetria catastale 1" id=${(r.img || {}).catasto1} set=${id => setImg('catasto1', id)} />
      <div style="height:var(--sp-3)"></div><${ImgSlot} label="Planimetria catastale 2" id=${(r.img || {}).catasto2} set=${id => setImg('catasto2', id)} />
      <div class="divider"></div><h4 class="sotto-t">Catasto fabbricati</h4>
      ${(r.catFab || []).map((c, i) => html`<div class="stack mt-2" key=${i}><div class="row"><b class="tb-grow">Riga ${i + 1}</b><button class="x" aria-label="Elimina" onClick=${() => up(p => ({ ...p, catFab: p.catFab.filter((_, j) => j !== i) }))}>×</button></div>
        ${['foglio', 'particella', 'sub', 'categoria'].map(k => html`<label class="fld" key=${k}><span>${k[0].toUpperCase() + k.slice(1)}</span><input placeholder=" " value=${c[k]} onInput=${e => up(p => ({ ...p, catFab: p.catFab.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x) }))} /></label>`)}</div>`)}
      <button class="btn dashed mt-2" onClick=${() => up(p => ({ ...p, catFab: [...(p.catFab || []), { foglio: '', particella: '', sub: '', categoria: '' }] }))}>+ Riga catasto fabbricati</button>
      <h4 class="sotto-t mt-4">Catasto terreni</h4>
      ${(r.catTer || []).map((c, i) => html`<div class="stack mt-2" key=${i}><div class="row"><b class="tb-grow">Riga ${i + 1}</b><button class="x" aria-label="Elimina" onClick=${() => up(p => ({ ...p, catTer: p.catTer.filter((_, j) => j !== i) }))}>×</button></div>
        <label class="fld"><span>Foglio</span><input placeholder=" " value=${c.foglio} onInput=${e => up(p => ({ ...p, catTer: p.catTer.map((x, j) => j === i ? { ...x, foglio: e.target.value } : x) }))} /></label>
        <label class="fld"><span>Mappali</span><input placeholder="es. 953, 1181" value=${c.mappale} onInput=${e => up(p => ({ ...p, catTer: p.catTer.map((x, j) => j === i ? { ...x, mappale: e.target.value } : x) }))} /></label></div>`)}
      <button class="btn dashed mt-2" onClick=${() => up(p => ({ ...p, catTer: [...(p.catTer || []), { foglio: '', mappale: '' }] }))}>+ Riga catasto terreni</button></div>`;
}
function HsAppunti({ r, up }) {
  return html`<div class="sec-h"><h3>Documenti allegati</h3></div>
    <div class="card"><${FileList} items=${r.documenti || []}
      onAdd=${d => up(p => ({ ...p, documenti: [...(p.documenti || []), d] }))}
      onRemove=${async d => { await removeBlob(d.blobId); up(p => ({ ...p, documenti: p.documenti.filter(x => x.id !== d.id) })); }} /></div>`;
}

function HsDatiSint({ r, up }) {
  const setM = patch => up(p => ({ ...p, meta: { ...p.meta, ...patch } }));
  const setImg = (k, id) => up(p => ({ ...p, img: { ...(p.img || {}), [k]: id || undefined } }));
  return html`<div class="card"><div class="grid2">
      <${Inp} label="Fondo" value=${r.meta.fondo} set=${v => setM({ fondo: v })} imp=${impOf(r, 'meta.fondo')} />
      <${Inp} label="Nome immobile" value=${r.sito} set=${v => up({ sito: v })} imp=${impOf(r, 'sito')} placeholder="es. codice immobile" />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} imp=${impOf(r, 'indirizzo')} placeholder="Via, CAP Comune (Prov.)" />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} imp=${impOf(r, 'citta')} />
      <${Inp} label="Data sopralluogo" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${OraDurata} ora=${r.ora} durata=${r.durata} stato=${r.stato} tipo=${r.type} set=${p => up(p)} />
      <${Inp} label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} imp=${impOf(r, 'commessa')} />
      <${Inp} label="Committente" value=${r.cliente} set=${v => up({ cliente: v })} imp=${impOf(r, 'cliente')} />
      <${Inp} label="Emissione" value=${r.meta.emissione} set=${v => setM({ emissione: v })} imp=${impOf(r, 'meta.emissione')} placeholder=${'automatica: ' + meseAnno(r.data)} />
      <${Inp} label="Revisione" value=${r.meta.revisione} set=${v => setM({ revisione: v })} imp=${impOf(r, 'meta.revisione')} />
      <${Inp} label="Protocollo" value=${r.meta.protocollo} set=${v => setM({ protocollo: v })} imp=${impOf(r, 'meta.protocollo')} />
      <${Inp} label="Redatto da" value=${r.meta.redatto} set=${v => setM({ redatto: v })} imp=${impOf(r, 'meta.redatto')} />
      <${Inp} label="Verificato da" value=${r.meta.verificato} set=${v => setM({ verificato: v })} imp=${impOf(r, 'meta.verificato')} />
      <${Inp} label="Approvato da" value=${r.meta.approvato} set=${v => setM({ approvato: v })} imp=${impOf(r, 'meta.approvato')} />
      <${Inp} cls="full" label="Il procuratore incaricato (firma)" value=${r.meta.firma} set=${v => setM({ firma: v })} imp=${impOf(r, 'meta.firma')} />
    </div><div class="divider"></div><${ImgSlot} label="Foto di copertina" id=${(r.img || {}).copertina} set=${id => setImg('copertina', id)} crop /></div>`;
}
function HsAnagSint({ r, up }) {
  const B = r.base || {};
  return html`<div class="card">${HS_SINT_AN.map((l, i) => i === 8 || i === 9
      ? html`<${HsText} key=${i} label=${l.replace(/:$/, '')} rows=${i === 8 ? 5 : 3} value=${r.anS[i]} base=${B['an.' + i]} set=${v => up(p => ({ ...p, anS: p.anS.map((x, j) => j === i ? v : x) }))} />`
      : html`<div key=${i} style="margin-bottom:var(--sp-3)"><${Inp} label=${l.replace(/:$/, '')} value=${r.anS[i] || ''} placeholder=${i === 0 ? r.indirizzo : i === 7 ? fmtD(r.data) : ''} imp=${impOf(r, 'anS.' + i)} set=${v => up(p => ({ ...p, anS: p.anS.map((x, j) => j === i ? v : x) }))} /></div>`)}</div>`;
}

/* ---------------- scheda Check-list: capitoli e stato ---------------- */
function HsChecklist({ r, up, aperto, setAperto, vaiNota, addN }) {
  const C = hsCapi(r);
  const c = aperto && C.find(x => x.k === aperto);
  if (c) {
    const L = hsNoteDi(r, c), S = hsStatoCap(r, c), np = !!(r.np || {})[c.k], num = hsNumNote(r);
    return html`<button class="btn link" style="margin:calc(-1 * var(--sp-2)) 0 var(--sp-2) calc(-1 * var(--sp-1))" onClick=${() => setAperto(null)}><${Icon} n="back" s=${18} /> Check-list</button>
      <div class="sec-h mt-0"><h3>${c.n}. ${c.tag}</h3><span class="hint">${S.w}</span></div>
      ${!L.length && html`<div class="card"><div class="optline" style="padding:0"><div class="t"><b>Non pertinente</b>${r.formato !== 'sintetico' && html`<small>Nel Word: «Nessuna criticità rilevata»</small>`}</div>
        <${Toggle} on=${np} set=${v => up(p => ({ ...p, np: { ...(p.np || {}), [c.k]: v } }))} label="Non pertinente" /></div></div>`}
      <div class="sec-h"><h3>Osservazioni · ${L.length}</h3></div>
      ${L.length > 0 && html`<div class="list">${L.map(n => { const sb = hsSubDi(n, C); return html`<button class="rcard" key=${n.id} onClick=${() => vaiNota(n.id)}>
        <div class="r1"><span class="id">Osservazione ${num[n.id]}</span></div>
        <div class="ttl">${n.titolo || (n.testo || '').split('\n')[0] || '—'}</div>${sb && html`<div class="sum">${sb.tag}</div>`}</button>`; })}</div>`}
      <button class="btn dashed block mt-2" onClick=${() => addN(c)}>+ Aggiungi un'osservazione</button>`;
  }
  return html`<div class="list">${C.map(x => { const S = hsStatoCap(r, x); return html`<button class=${'rcard st-bar ' + S.st} key=${x.k} onClick=${() => setAperto(x.k)}>
      <div class="r1"><span class="ttl hs-ckt">${x.n}. ${x.tag}</span><span class="dt">${S.w}</span></div></button>`; })}</div>`;
}
// prima di generare il Word: capitoli senza note
function HsSenzaNoteSheet({ r, up, onDone }) {
  useBackClose(() => onDone(false));
  const L = hsCapRossi(r);
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onDone(false)}><div class="sheet" role="dialog" aria-label=${L.length + ' capitoli senza osservazioni'}>
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${() => onDone(false)}>Annulla</button><b>${L.length === 1 ? '1 capitolo senza osservazioni' : L.length + ' capitoli senza osservazioni'}</b><span></span></div>
    <div class="sheet-body">
      <div class="list mt-1">${L.map(c => html`<div class="prow st-bar st-err" key=${c.k}><div class="t"><b>${c.n}. ${c.tag}</b>
        <div class="row mt-2"><button class="btn sm" onClick=${() => up(p => ({ ...p, np: { ...(p.np || {}), [c.k]: true } }))}>Non pertinente</button>
        <button class="btn sm" onClick=${() => onDone(false, c)}>Aggiungi un'osservazione</button></div></div></div>`)}</div>
      <button class="btn pri block mt-4" onClick=${() => onDone(true)}>${L.length ? 'Genera lo stesso' : 'Genera Word'}</button>
    </div></div></div>`;
}

/* ---------------- modello del report (formato libero, v56) ----------------
   Controllo a segmenti con sotto la descrizione; si parte dall'ultimo modello usato. L'Anagrafica mostra i campi del modello scelto. */
function HsFormatoSel({ r, up }) {
  if (!r.formatoLibero) return null;
  const set = f => { lsSet('nembo_hs_formato', f); up({ formato: f }); };
  const sint = r.formato === 'sintetico';
  return html`<div class="card"><div class="seg"><button class=${!sint ? 'on' : ''} onClick=${() => set('esteso')}>Esteso</button><button class=${sint ? 'on' : ''} onClick=${() => set('sintetico')}>Sintetico</button></div>
    <div class="mt-2"><b class="fw-6">${sint ? '5 capitoli' : '13 capitoli'}</b><div class="lead">${sint ? 'Un elenco di verifica compatto: ogni osservazione va nel capitolo che le corrisponde.' : 'Una relazione descrittiva, capitolo per capitolo, con le foto accanto al testo.'}</div></div></div>`;
}

/* ---------------- scheda del sopralluogo a note ---------------- */
function HsNoteForm({ rec: initial, settings, onSave, onDelete, onSettings, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [T, setT] = useSchede('hsN', ['anag', 'note', 'check', 'file'], initial._new, { 'n-': 'note' });
  const [filtro0, setFiltro] = useState(null);
  const filtro = filtro0 && (r.noteSop || []).some(n => (n.tag || []).includes(filtro0)) ? filtro0 : null; // il tag filtrato non c'è più: nessun filtro
  const [aperto, setAperto] = useState(null);
  const [riep, setRiep] = useState(false);
  const [chiedi, setChiedi] = useState(null); // attesa del foglio «capitoli senza note»
  const [hasTpl, setHasTpl] = useState(null);
  const ns = useNoteSel();
  const [tagSheet, setTagSheet] = useState(false);
  const sint = r.formato === 'sintetico';
  useEffect(() => { DB.get(TEMPLATES[sint ? 'hs_sintetico.docx' : 'hs_esteso.docx'].key).then(b => setHasTpl(!!b)); }, [sint]);
  useEffect(() => { if (T !== 'note') ns.setSel(null); }, [T]);
  const nuovaNota = c => {
    const n = newNotaHs({ tag: c ? [c.tag] : filtro ? [filtro] : [] }); setT('note'); setFiltro(null);
    up(q => ({ ...q, noteSop: [...(q.noteSop || []), n] })); setTimeout(() => scrollToId('n-' + n.id), 80); return n;
  };
  const vaiNota = id => { setT('note'); setFiltro(null); setTimeout(() => scrollToId('n-' + id), 80); };
  const setNote = (ids, fn) => up(q => ({ ...q, noteSop: (q.noteSop || []).map(n => ids.includes(n.id) ? { ...n, ...fn(n) } : n) }));
  const prima = () => hsCapRossi(r).length ? new Promise(res => setChiedi(() => res)) : true;
  const fineChiedi = (ok, c) => { const f = chiedi; setChiedi(null); f && f(ok); if (c) nuovaNota(c); };
  const upload = () => OD.account ? odSync([r], settings) : sendToOneDrive(r, settings);
  const selNote = ns.sel ? (r.noteSop || []).filter(n => ns.sel.has(n.id) && (!filtro || (n.tag || []).includes(filtro))) : [];
  const nRossi = hsCapRossi(r).length;
  return html`<div class="content form">
    <${DetailHead} conclusa=${r.conclusa} eye=${'Sopralluogo HSE · ' + HS_FMT[r.formato]} title=${r.codice} sub=${[r.commessa, r.cliente, placeAddr(r) || r.sito].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <${Schede} value=${T} set=${k => { setT(k); setAperto(null); }} tabs=${[{ k: 'anag', l: 'Anagrafica' }, { k: 'note', l: 'Osservazioni', n: (r.noteSop || []).length }, { k: 'check', l: 'Check-list', n: nRossi || undefined }, { k: 'file', l: 'File' }]} />
    ${T === 'anag' && html`${r.formatoLibero && html`<div class="sec-h mt-1"><h3>Modello del report</h3></div><${HsFormatoSel} r=${r} up=${up} />`}${sint ? html`<${HsDatiSint} r=${r} up=${up} /><div class="sec-h"><h3>Anagrafica immobile</h3></div><${HsAnagSint} r=${r} up=${up} />`
      : html`<${HsDatiEst} r=${r} up=${up} /><div class="sec-h"><h3>Anagrafica immobile</h3></div><${HsAnagEst} r=${r} up=${up} />
        <div class="sec-h"><h3>Inquadramento e catasto</h3></div><${HsInqEst} r=${r} up=${up} />`}
      ${hasTpl === false && html`<div class="notice err">Manca il modello Word ${HS_FMT[r.formato]}: caricalo in Impostazioni → Modelli. <button class="btn link" onClick=${onSettings}>Apri</button></div>`}`}
    ${T === 'note' && html`${SR_API && !ns.sel && html`<${Suggerimento} id="dettatura" />`}
      ${!ns.sel && html`<${Appunti} rec=${r} up=${up} rows=${3} label="Appunti (non vanno nel Word)" />`}
      <${HsNoteTab} r=${r} up=${up} ns=${ns} filtro=${filtro} setFiltro=${setFiltro} addN=${() => nuovaNota(null)} onRiep=${() => setRiep(true)} />
      ${!ns.sel && html`<${HsAppunti} r=${r} up=${up} />`}`}
    ${T === 'check' && html`<${HsChecklist} r=${r} up=${up} aperto=${aperto} setAperto=${setAperto} vaiNota=${vaiNota} addN=${c => nuovaNota(c)} />`}
    ${T === 'file' && html`<${FileTab} r=${r} up=${up} settings=${settings} />`}
    ${ns.sel ? html`<${ActionBar}><button class="btn pri" disabled=${!selNote.length} onClick=${() => setTagSheet(true)}><${Icon} n="tag" s=${20} /> Tag (${selNote.length})</button><//>`
    : html`<${BarraAtt} r=${r} settings=${settings}
      left=${html`<${HsNotaCam} r=${r} up=${up} onNota=${() => nuovaNota(null)} />`}
      center=${T === 'note' ? html`<button class="btn pri" onClick=${() => nuovaNota(null)}><${Icon} n="plus" s=${20} w=${2.4} /> Nuova osservazione</button>`
        : html`<${DocBtn} r=${r} up=${up} settings=${settings} k="hs_docx" prima=${prima} />`}
      gruppi=${[['Documenti', [{ ic: 'share', l: OD.account ? 'Carica su OneDrive' : 'Invia foto e Word a OneDrive', fn: upload }]],
        opzArchivio({ r, settings, onDelete, up, elimina: 'Elimina il sopralluogo' })]} />`}
    ${tagSheet && ns.sel && html`<${TagMultiSheet} note=${selNote} fissi=${hsTagFissi(r, selNote)} altri=${Object.keys(collectTags(r.noteSop || []))} onSet=${setNote} onClose=${() => setTagSheet(false)} />`}
    ${riep && html`<${RiepilogoPanel} r=${r} onClose=${() => setRiep(false)} scelta=${r.formatoLibero && html`<${HsFormatoSel} r=${r} up=${up} />`} azione=${html`<${DocBtn} r=${r} up=${up} settings=${settings} k="hs_docx" label="report" prima=${prima} />`} />`}
    ${chiedi && html`<${HsSenzaNoteSheet} r=${r} up=${up} onDone=${fineChiedi} />`}
  </div>`;
}
// file del report precedente: Word (.docx) o JSON della vecchia app HSE
async function hsLeggiFile(f) {
  if (/\.json$/i.test(f.name)) return hsReadOldJson(JSON.parse(await f.text()));
  if (/\.docx$/i.test(f.name)) return hsReadDocx(await f.arrayBuffer());
  throw new Error('scegli un file .docx (non .doc o PDF) oppure un .json');
}
