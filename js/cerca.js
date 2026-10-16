/* Ricerca in tutte le attività: immobile, titolo, testo e tag. Tutto in locale, anche offline. */

const CERCA_AMBITI = [['tutto', 'Tutto'], ['immobile', 'Immobile'], ['titolo', 'Titolo'], ['testo', 'Testo'], ['tag', 'Tag']];
const normT = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// una parola cercata vale solo all'inizio di una parola del testo: «via» trova «Via Roma», non «Oviale»
const inizioParola = (t, i) => i === 0 || !/[a-z0-9]/.test(t[i - 1]);
const haParola = (t, w) => { for (let i = t.indexOf(w); i >= 0; i = t.indexOf(w, i + 1)) if (inizioParola(t, i)) return true; return false; };
const TIPO_NOME = r => r.type === 'dda' ? 'DDA Fase ' + (r.fase || 1) : r.type === 'hs' ? 'Sopralluogo HSE ' + (HS_FMT[r.formato] || '') : r.type === 'vs' ? 'Verbale HSE'
  : r.type === 'mappatura' ? 'Mappatura MCA e FAV' : r.type === 'ra' ? 'Sopralluogo RA' : r.type === 'radon' ? 'Campagna radon' : r.type === 'aria' ? 'Monitoraggio aria'
  : r.type === 'firme' ? 'Foglio firme' : r.type === 'app' ? 'Appuntamento' : r.type;

const CERCA_TAB = { dda: 'sop', mappatura: 'camp', ra: 'man', radon: 'punti', aria: 'punti', vs: 'note', hs: 'main' };
// voci ricercabili di un'attività: { ambito, etichetta, testo, anchor }
function cercaVoci(r) {
  const V = [], add = (ambito, etichetta, testo, anchor) => { if (testo && String(testo).trim()) V.push({ ambito, etichetta, testo: String(testo), anchor }); };
  const tags = (arr, etichetta, anchor) => (arr || []).forEach(t => add('tag', etichetta, t, anchor));
  add('immobile', 'Immobile', [r.sito, r.indirizzo, r.citta, r.insegna, r.provincia].filter(Boolean).join(' · '));
  add('immobile', 'Commessa e cliente', [r.codice, r.commessa, r.cliente].filter(Boolean).join(' · '));
  if (r.type === 'app') { add('titolo', 'Appuntamento', r.titolo); add('immobile', 'Luogo', r.luogo); add('testo', 'Note', r.note); }
  add('testo', 'Appunti', r.appunti); tags(r.tagAppunti, 'Appunti');
  add('testo', 'Appunti Fase 2', r.appunti2); tags(r.tagAppunti2, 'Appunti Fase 2');
  if (r.type === 'vs') (r.note || []).forEach((n, i) => {
    const et = `Nota ${i + 1}${n.titolo ? ' · ' + n.titolo : ''}`;
    add('titolo', et, n.titolo, 'n-' + n.id); add('testo', et, n.testo, 'n-' + n.id); tags(n.tag, et, 'n-' + n.id);
  });
  if (r.type === 'dda') {
    (r.recs || []).forEach(x => { add('titolo', 'Area ' + (x.nome || ''), x.nome, 'rec-' + x.id); add('testo', 'Area ' + (x.nome || ''), x.descrizione, 'rec-' + x.id); });
    Object.entries(r.checkNote || {}).forEach(([k, v]) => add('testo', 'Checklist', v));
    try { allCamp(r).forEach(c => { add('titolo', 'Campione ' + (c.codice || ''), [c.codice, c.descrizione].filter(Boolean).join(' · '), 's-' + c.id); add('testo', 'Campione ' + (c.codice || ''), [c.ubicazione, c.note].filter(Boolean).join(' · '), 's-' + c.id); }); } catch (e) { /* DDA senza campioni */ }
  }
  if (r.type === 'mappatura') { try { allCampMap(r).forEach(c => { add('titolo', 'Campione ' + (c.codice || ''), [c.codice, c.descrizione].filter(Boolean).join(' · '), 's-' + c.id); add('testo', 'Campione ' + (c.codice || ''), [c.ubicazione, c.note].filter(Boolean).join(' · '), 's-' + c.id); }); } catch (e) { /* vuota */ } }
  if (r.type === 'ra') (r.manufatti || []).forEach(m => {
    const et = 'Manufatto ' + (m.codice || '');
    add('titolo', et, [m.codice, m.descrizione, m.ubicazione].filter(Boolean).join(' · '), 'm-' + m.id); add('testo', et, [m.note, m.notePrec].filter(Boolean).join(' · '), 'm-' + m.id);
  });
  if (r.type === 'radon') (r.punti || []).forEach((p, i) => add('titolo', 'Punto R' + (i + 1), [p.piano, p.ubicazione].filter(Boolean).join(' · '), 'p-' + p.id));
  if (ariaHas(r)) ariaOf(r).punti.forEach(p => { add('titolo', 'Punto aria ' + (p.codice || ''), [p.codice, p.piano, p.postazione].filter(Boolean).join(' · '), 's-' + p.id); add('testo', 'Punto aria ' + (p.codice || ''), p.note, 's-' + p.id); });
  if (r.type === 'hs') {
    Object.entries(r.note || {}).forEach(([k, v]) => { const it = (typeof HS_SINT_ALL !== 'undefined' ? HS_SINT_ALL : []).find(x => x.id === k); add('testo', 'Voce ' + (it ? it.ref : k), v); });
    add('testo', 'Condizioni generali', r.descr);
    Object.entries(r.schede || {}).forEach(([k, d]) => { const s = HS_SCHEDE.find(x => x.k === k); const et = 'Scheda ' + (s ? s.l : k); add('testo', et, hsSchedaText(d)); add('testo', et, d.mig); });
    (r.azioni || []).forEach(a => add('testo', 'Azione ' + (a.cod || ''), [a.sit, a.az].filter(Boolean).join(' · ')));
    (r.foto || []).forEach(p => add('titolo', 'Didascalia foto', p.cap));
  }
  (r.fogli || []).forEach(f => add('titolo', 'Foglio firme', f.titolo, 'tab:firme'));
  if (r.type === 'radon') add('testo', 'Appunti generali', r.note);
  // senza un punto preciso si apre la scheda giusta: Anagrafica per i dati dell'immobile, altrimenti quella del contenuto
  V.forEach(v => { if (!v.anchor) v.anchor = v.ambito === 'immobile' ? 'tab:anag' : /Fase 2/.test(v.etichetta) ? 'tab:camp' : CERCA_TAB[r.type] && 'tab:' + CERCA_TAB[r.type]; });
  return V;
}
// risultati: attività con le voci che contengono tutte le parole cercate (o il tag scelto)
function cerca(records, q, ambito, tag) {
  const words = normT(q).split(/\s+/).filter(Boolean);
  if (!words.length && !tag) return [];
  const out = [];
  for (const r of records) {
    if (r._new) continue;
    const hits = cercaVoci(r).filter(v => {
      if (tag) return v.ambito === 'tag' && v.testo.toLowerCase() === tag.toLowerCase();
      if (ambito !== 'tutto' && v.ambito !== ambito) return false;
      const t = normT(v.testo); return words.every(w => haParola(t, w));
    });
    if (hits.length) out.push({ r, hits });
  }
  return out.sort((a, b) => (b.r.data || '').localeCompare(a.r.data || ''));
}
// evidenzia le parole cercate nel frammento
function Evid({ testo, q }) {
  const words = normT(q).split(/\s+/).filter(Boolean); const T = String(testo); const N = normT(T);
  let at = 0; if (words.length) { let k = N.indexOf(words[0]); while (k > 0 && !inizioParola(N, k)) k = N.indexOf(words[0], k + 1); at = Math.max(0, k - 40); }
  const s = (at ? '…' : '') + T.slice(at, at + 160) + (T.length > at + 160 ? '…' : '');
  if (!words.length) return s;
  const ns = normT(s), parts = []; let i = 0;
  while (i < s.length) {
    let hit = null; if (inizioParola(ns, i)) for (const w of words) if (ns.startsWith(w, i)) { hit = w; break; }
    if (hit) { parts.push(html`<mark>${s.slice(i, i + hit.length)}</mark>`); i += hit.length; }
    else { let j = i + 1; while (j < s.length && !(inizioParola(ns, j) && words.some(w => ns.startsWith(w, j)))) j++; parts.push(s.slice(i, j)); i = j; }
  }
  return parts;
}

// porta al punto trovato quando la scheda è pronta, e lo evidenzia per un attimo
function cercaVai(id, n = 0) {
  if (id.startsWith('tab:')) { [80, 400].forEach(t => setTimeout(() => dispatchEvent(new CustomEvent('nembo-goto', { detail: id })), t)); return; }
  if (n === 1 || n === 4) dispatchEvent(new CustomEvent('nembo-goto', { detail: id }));
  const el = document.getElementById(id);
  if (!el) { if (n < 25) setTimeout(() => cercaVai(id, n + 1), 120); return; }
  setTimeout(() => { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('cerca-flash'); setTimeout(() => el.classList.remove('cerca-flash'), 1800); }, 250);
}

function Cerca({ records, openRec, acts }) {
  const [q, setQ] = useState(() => { try { return sessionStorage.getItem('nembo_q') || ''; } catch (e) { return ''; } });
  const [ambito, setAmbito] = useState('tutto');
  const [tag, setTag] = useState(null);
  const inp = useRef();
  useEffect(() => { try { sessionStorage.setItem('nembo_q', q); } catch (e) {} }, [q]);
  useEffect(() => { setTimeout(() => inp.current && inp.current.focus(), 50); }, []);
  const cnt = collectTags(records), tutti = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b, 'it'));
  const res = cerca(records, q, ambito, tag);
  const nHit = res.reduce((a, x) => a + x.hits.length, 0);
  const apri = (r, anchor) => { openRec(r); if (anchor) cercaVai(anchor); };
  return html`<div class="content cerca">
    <${LargeTitle} top eye="Tutte le attività" title="Cerca" acts=${acts} />
    <div class="cerca-box"><${Icon} n="search" s=${19} />
      <input ref=${inp} class="inp" type="search" value=${q} placeholder="Indirizzo, città, titolo, testo…" onInput=${e => { setQ(e.target.value); setTag(null); }} aria-label="Cerca" />
      ${(q || tag) && html`<button class="x" aria-label="Cancella" onClick=${() => { setQ(''); setTag(null); inp.current.focus(); }}>×</button>`}</div>
    <div class="seg cerca-amb">${CERCA_AMBITI.map(([k, l]) => html`<button key=${k} class=${ambito === k && !tag ? 'on' : ''} onClick=${() => { setAmbito(k); setTag(null); }}>${l}</button>`)}</div>
    ${tutti.length > 0 && (ambito === 'tag' || tag || !q) && html`<div class="tags-row" style="margin:10px 2px 4px">${tutti.map(t => html`<button key=${t} class="tag" style=${tagStyle(t, tag === t)} onClick=${() => { setTag(tag === t ? null : t); setQ(''); }}>#${t} <small style="opacity:.7">${cnt[t]}</small></button>`)}</div>`}
    ${(q.trim() || tag) && html`<div class="lead" style="margin:10px 2px">${res.length ? `${res.length} attività · ${nHit} ${nHit === 1 ? 'risultato' : 'risultati'}` : 'Nessun risultato.'}</div>`}
    ${!q.trim() && !tag && html`<div class="empty" style="margin-top:16px"><b>Cerca in tutte le attività</b>Scrivi un indirizzo, una città, il titolo o il testo di una nota, oppure tocca un tag. La ricerca funziona anche offline.</div>`}
    <div class="list">${res.slice(0, 80).map(({ r, hits }) => html`<div class="cerca-res" key=${r.id}>
      <button class="cerca-h" onClick=${() => apri(r)}><span class="id">${r.codice || TIPO_NOME(r)}</span><span class="t">${TIPO_NOME(r)}</span><span class="dt">${fmtD(r.data)}</span></button>
      <div class="cerca-place">${[r.commessa, r.cliente, placeLabel(r) || r.luogo].filter(Boolean).join(' · ')}</div>
      ${hits.slice(0, 5).map((h, i) => html`<button key=${i} class="cerca-hit" onClick=${() => apri(r, h.anchor)}><small>${h.etichetta}</small>
        <span>${h.ambito === 'tag' ? html`<span class="tag" style=${tagStyle(h.testo)}>#${h.testo}</span>` : html`<${Evid} testo=${h.testo} q=${q} />`}</span></button>`)}
      ${hits.length > 5 && html`<div class="cerca-more">+${hits.length - 5} altri risultati</div>`}
    </div>`)}</div>
  </div>`;
}
