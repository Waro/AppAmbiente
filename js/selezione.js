/* Selezione di più attività negli elenchi e in «Da completare».
   Si entra con un tocco prolungato su un'attività (telefono e tablet) o con «Seleziona» in alto (PC).
   Durante la selezione un tocco seleziona o toglie, senza aprire; il tasto indietro la chiude.
   Azione unica in basso: «Carica su OneDrive (N)», oppure «Salva in un file ZIP (N)» se OneDrive non è collegato.
   Ogni attività resta nella sua cartella: l'invio è uno solo (odSync con più attività). */

const Sel = (() => {
  let active = false, ids = new Set(), timer = null, x0 = 0, y0 = 0;
  const subs = new Set();
  const emit = () => subs.forEach(f => f());
  const S = {
    skip: false, // il clic che segue un tocco prolungato non deve aprire né togliere
    get active() { return active; },
    get ids() { return [...ids]; },
    has: id => ids.has(id),
    start(id) { active = true; ids = new Set(id ? [id] : []); emit(); },
    stop() { if (!active) return; active = false; ids = new Set(); emit(); },
    toggle(id) { ids.has(id) ? ids.delete(id) : ids.add(id); emit(); },
    tutte(list) { const all = list.every(id => ids.has(id)); ids = all ? new Set() : new Set(list); emit(); },
    press(id, e) {
      S.cancel(); x0 = e.clientX; y0 = e.clientY;
      timer = setTimeout(() => {
        timer = null; S.skip = true;
        if (active) S.toggle(id); else S.start(id);
        try { navigator.vibrate && navigator.vibrate(18); } catch (err) { /* senza vibrazione */ }
      }, 480);
    },
    move(e) { if (timer && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) S.cancel(); },
    cancel() { clearTimeout(timer); timer = null; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
  };
  return S;
})();
function useSel() {
  const [, force] = useState(0);
  useEffect(() => Sel.subscribe(() => force(x => x + 1)), []);
  return Sel;
}
// proprietà da aggiungere alla riga di un'attività (elenchi e «Da completare»)
function selRow(r, open) {
  return {
    'data-sel': r.id,
    onClick: () => { if (Sel.skip) { Sel.skip = false; return; } if (Sel.active) Sel.toggle(r.id); else open(); },
    onPointerDown: e => { if (e.pointerType !== 'mouse') Sel.press(r.id, e); },
    onPointerMove: e => Sel.move(e),
    onPointerUp: () => Sel.cancel(), onPointerLeave: () => Sel.cancel(), onPointerCancel: () => Sel.cancel(),
    onContextMenu: e => { if (Sel.active || Sel.skip) e.preventDefault(); },
  };
}
const selCls = r => (Sel.active ? ' sel-mode' : '') + (Sel.has(r.id) ? ' sel' : '');
const selCk = r => Sel.active ? html`<span class="selck" aria-hidden="true">${Sel.has(r.id) && html`<${Icon} n="check" s=${15} w=${3} />`}</span>` : null;
// tasto «Seleziona» per il PC (in alto negli elenchi e in «Da completare»)
const SelBtn = () => html`<button class="btn link" onClick=${() => Sel.start(null)}>Seleziona</button>`;

// barre della selezione: in alto Annulla · N selezionate · Tutte, in basso l'azione
function SelBars({ records, settings }) {
  useBackClose(() => Sel.stop());
  const n = Sel.ids.length;
  const vis = () => [...document.querySelectorAll('.content [data-sel]')].map(el => el.getAttribute('data-sel'));
  const run = async () => {
    const rs = Sel.ids.map(id => records.find(r => r.id === id)).filter(Boolean);
    if (!rs.length) return;
    Sel.stop();
    if (OD.account) await odSync(rs, settings); else await exportRecords(rs, settings);
  };
  return html`<div class="selhead" role="toolbar" aria-label="Selezione">
      <button class="btn link" onClick=${() => Sel.stop()}>Annulla</button>
      <b>${n} ${n === 1 ? 'selezionata' : 'selezionate'}</b>
      <button class="btn link" onClick=${() => Sel.tutte(vis())}>Tutte</button></div>
    <div class="selbar"><button class="btn pri block" disabled=${!n} onClick=${run}>
      <${Icon} n=${OD.account ? 'share' : 'archive'} s=${20} /> ${OD.account ? `Carica su OneDrive (${n})` : `Salva in un file ZIP (${n})`}</button></div>`;
}
