/* Riepilogo via email: testo e foto delle valutazioni, per un giro mail veloce senza relazione.
   Con «Condividi» il telefono apre Outlook (o un'altra app) con il testo nel messaggio e le foto allegate;
   «Copia testo e foto» mette in appunti il testo con le foto dentro, da incollare nel messaggio. */

const RIEP_MAX_FOTO = 12;
// dati per tipo di attività: intestazione, sintesi e voci (prima le critiche)
function riepilogoDati(r, s) {
  const tit = typeof TIPO_NOME === 'function' ? TIPO_NOME(r) : r.type;
  const testa = [[r.codice, r.commessa && 'Commessa ' + r.commessa].filter(Boolean).join(' · '), [r.cliente, placeDoc(r)].filter(Boolean).join(' · '),
    [fmtD(r.data), r.tecnico || `${s.tecnicoNome || ''} ${s.tecnicoCognome || ''}`.trim()].filter(Boolean).join(' · ')].filter(Boolean);
  let sintesi = '', voci = [];
  const conta = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  if (r.type === 'ra') {
    const M = r.manufatti || [];
    voci = M.map(m => { const st = raStato(m.stato); return { t: [m.codice, m.ubicazione].filter(Boolean).join(' – '), stato: st ? st.l : 'Da verificare', crit: m.stato === 'danneggiato',
      righe: [m.descrizione, m.note && 'Note: ' + m.note].filter(Boolean), foto: m.foto || [] }; });
    const n = k => M.filter(m => m.stato === k).length;
    sintesi = [conta(M.length, 'manufatto', 'manufatti'), M.filter(m => m.stato).length + ' verificati', n('danneggiato') && conta(n('danneggiato'), 'danneggiato', 'danneggiati'),
      n('suscettibile') && n('suscettibile') + ' suscettibili di danneggiamento', n('nonispez') && n('nonispez') + ' non ispezionabili', n('rimosso') && n('rimosso') + ' rimossi o bonificati'].filter(Boolean).join(', ');
    if (ariaHas(r)) voci.push(...ariaVoci(r));
  } else if (r.type === 'dda' || r.type === 'mappatura') {
    const mats = r.type === 'dda' ? MATS : MAP_MATS;
    if (r.type === 'dda') voci.push(...(r.recs || []).map(x => ({ t: x.nome || 'Area REC', stato: 'Area REC', righe: [x.descrizione].filter(Boolean), foto: x.foto || [] })));
    for (const m of mats) for (const c of (r.campioni[m.k] || [])) voci.push({ t: [c.codice, m.l].filter(Boolean).join(' – '), stato: 'Campione',
      righe: [c.descrizione, [c.piano, c.ubicazione, c.quantita].filter(Boolean).join(' · ')].filter(Boolean), foto: c.foto || [] });
    for (const x of ncOf(r)) { const m = MATS.find(y => y.k === x.k) || MATS[2], rc = ncRif(r, x); voci.push({ t: [x.codice, m.l].join(' – '), stato: 'Non campionato',
      righe: [x.descrizione, [x.piano, x.ubicazione, x.quantita].filter(Boolean).join(' · '), rc && 'Come campione ' + rc].filter(Boolean), foto: x.foto || [] }); }
    const nc = mats.reduce((a, m) => a + (r.campioni[m.k] || []).length, 0);
    sintesi = [r.type === 'dda' && r.recs.length && conta(r.recs.length, 'area REC', 'aree REC'), conta(nc, 'campione prelevato', 'campioni prelevati'), ncOf(r).length && conta(ncOf(r).length, 'manufatto non campionato', 'manufatti non campionati'),
      ...mats.filter(m => (r.campioni[m.k] || []).length).map(m => m.l + ' ' + r.campioni[m.k].length)].filter(Boolean).join(', ');
  } else if (r.type === 'aria') {
    voci = ariaVoci(r); const R = ariaRiepilogo(r);
    sintesi = [conta(R.tot, 'punto', 'punti'), R.fatti + ' eseguiti', R.non && R.non + ' non effettuati', R.esiti && R.esiti + ' esiti', R.over && R.over + ' oltre il limite'].filter(Boolean).join(', ');
  } else if (r.type === 'radon') {
    voci = r.punti.map((p, i) => { const v = mediaPunto(r, p); return { t: 'R' + (i + 1) + ' – ' + [p.piano, p.ubicazione].filter(Boolean).join(' · '), stato: v != null ? fmtN(v) + ' Bq/m³' : (p.codiceF1 ? 'Dosimetro ' + p.codiceF1 : 'Da posare'),
      crit: v != null && v > s.livelloRif, righe: [], foto: p.foto || [] }; });
    sintesi = conta(r.punti.length, 'punto di misura', 'punti di misura');
  } else if (r.type === 'hs') {
    voci = hsCriticita(r).map(c => ({ t: c.t, stato: 'Priorità ' + c.p, crit: c.p === 1, righe: [c.az && 'Azione: ' + c.az].filter(Boolean), foto: [] }));
    const F = hsFotoReport(r).filter(p => p.g !== 'prev');
    if (F.length) voci.push({ t: 'Foto del sopralluogo', stato: '', righe: [], foto: F.map(p => p.id), cap: Object.fromEntries(F.map(p => [p.id, p.cap || ''])) });
    sintesi = voci.filter(v => v.stato).length ? conta(voci.filter(v => v.stato).length, 'criticità', 'criticità') : 'Nessuna criticità di priorità 1 o 2';
  } else if (r.type === 'vs') {
    voci = (r.note || []).map((n, i) => ({ t: n.titolo || 'Nota ' + (i + 1), stato: (n.tag || []).map(t => '#' + t).join(' '), righe: [n.testo, n.mig && 'Attività di miglioramento: ' + n.mig].filter(Boolean), foto: n.foto || [] }));
    sintesi = conta(voci.length, 'nota', 'note');
  }
  voci.sort((a, b) => (b.crit ? 1 : 0) - (a.crit ? 1 : 0));
  return { tit, testa, sintesi, voci, appunti: r.appunti || r.note && r.type === 'radon' && r.note || '' };
}
function ariaVoci(r) {
  return ariaOf(r).punti.map(p => { const e = ariaEsito(p); return { t: [p.codice, [p.piano, p.postazione].filter(Boolean).join(' · ')].filter(Boolean).join(' – '),
    stato: p.stato === 'non' ? 'Monitoraggio non effettuato' : e ? e.txt + (e.over ? ' (oltre il limite)' : '') : p.stato === 'fatto' ? 'Prelevato' : 'Da eseguire',
    crit: !!(e && e.over), righe: [p.metodica, p.note && 'Note: ' + p.note].filter(Boolean), foto: p.foto || [] }; });
}
// testo semplice: una voce per blocco, foto indicate con il nome del file allegato
function riepilogoTesto(D, nomi) {
  const L = [D.tit, ...D.testa, '', 'Sintesi: ' + D.sintesi, ''];
  for (const v of D.voci) {
    L.push(v.t + (v.stato ? ' — ' + v.stato.toUpperCase() : ''));
    for (const x of v.righe) L.push(x);
    const f = v.foto.map(id => nomi[id]).filter(Boolean);
    if (f.length) L.push('Foto: ' + f.join(', '));
    L.push('');
  }
  if (D.appunti) L.push('Appunti: ' + D.appunti);
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const escH = t => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// foto ridotte per la posta (lato lungo 1024 px)
async function fotoMail(id, maxSide = 1024) {
  const b = await DB.getBlob(id); if (!b) return null;
  const blob = await shrinkImage(b.blob, maxSide);
  return blob;
}
const blobDataUrl = b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });

function RiepilogoSheet({ r, settings, onClose }) {
  useBackClose(onClose);
  const D = riepilogoDati(r, settings);
  const tutte = D.voci.flatMap(v => v.foto);
  // di partenza: le foto delle voci critiche, poi le altre, fino al massimo
  const [sel, setSel] = useState(() => new Set([...D.voci.filter(v => v.crit).flatMap(v => v.foto), ...tutte].slice(0, RIEP_MAX_FOTO)));
  const [busy, setBusy] = useState('');
  const nomi = {}; D.voci.forEach(v => v.foto.forEach((id, k) => { nomi[id] = slug((v.t.split(' – ')[0] || 'foto')) + (v.foto.length > 1 ? '_' + (k + 1) : '') + '.jpg'; }));
  const scelte = tutte.filter(id => sel.has(id));
  const testo = riepilogoTesto(D, Object.fromEntries(scelte.map(id => [id, nomi[id]])));
  const oggetto = [D.tit, r.commessa && 'Commessa ' + r.commessa, placeLabel(r)].filter(Boolean).join(' · ');
  const toggle = id => setSel(x => { const n = new Set(x); if (n.has(id)) n.delete(id); else if (n.size < RIEP_MAX_FOTO) n.add(id); else toast('Al massimo ' + RIEP_MAX_FOTO + ' foto'); return n; });
  const condividi = async () => {
    setBusy('share');
    try {
      const files = [];
      for (const id of scelte) { const b = await fotoMail(id); if (b) files.push(new File([b], nomi[id], { type: 'image/jpeg' })); }
      const data = { title: oggetto, text: oggetto + '\n\n' + testo, files };
      if (navigator.canShare && navigator.canShare(data)) { await navigator.share(data); }
      else if (navigator.share && !files.length) { await navigator.share({ title: oggetto, text: testo }); }
      else { await copiaTF(); toast('Condivisione non disponibile: testo e foto copiati, incollali nella mail'); location.href = `mailto:?subject=${encodeURIComponent(oggetto)}`; }
    } catch (e) { if (e.name !== 'AbortError') fail('Condivisione non riuscita', e); }
    setBusy('');
  };
  const copiaTF = async () => {
    const parts = [`<p><b>${escH(D.tit)}</b><br>${D.testa.map(escH).join('<br>')}</p><p><b>Sintesi:</b> ${escH(D.sintesi)}</p>`];
    for (const v of D.voci) {
      parts.push(`<p><b>${escH(v.t)}</b>${v.stato ? ' — <b style="color:' + (v.crit ? '#be222a' : '#1c1c1e') + '">' + escH(v.stato) + '</b>' : ''}${v.righe.map(x => '<br>' + escH(x)).join('')}</p>`);
      for (const id of v.foto.filter(x => sel.has(x))) { const b = await fotoMail(id, 800); if (b) parts.push(`<p><img src="${await blobDataUrl(b)}" width="400" alt="${escH(nomi[id])}"></p>`); }
    }
    if (D.appunti) parts.push(`<p><b>Appunti:</b> ${escH(D.appunti)}</p>`);
    const htmlTxt = parts.join('');
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([htmlTxt], { type: 'text/html' }), 'text/plain': new Blob([testo], { type: 'text/plain' }) })]);
    } else await navigator.clipboard.writeText(testo);
  };
  const copia = async soloTesto => {
    setBusy(soloTesto ? 'txt' : 'copy');
    try { if (soloTesto) await navigator.clipboard.writeText(oggetto + '\n\n' + testo); else await copiaTF(); toast(soloTesto ? 'Testo copiato' : 'Testo e foto copiati: incollali nel messaggio'); }
    catch (e) { fail('Copia non riuscita', e); }
    setBusy('');
  };
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}>
    <div class="sheet tall" role="dialog" aria-label="Riepilogo via email">
      <div class="sheet-grab"></div>
      <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>Riepilogo via email</b><span></span></div>
      <div class="sheet-body">
        <div class="card tight"><div class="rp-ogg">${oggetto}</div><pre class="rp-txt">${testo}</pre></div>
        ${tutte.length > 0 && html`<div class="sec-h"><h3>Foto · ${scelte.length} di ${tutte.length}</h3><span class="hint">tocca per togliere o aggiungere</span></div>
          <div class="rp-foto">${tutte.map(id => html`<button key=${id} class=${'rp-ph' + (sel.has(id) ? ' on' : '')} onClick=${() => toggle(id)}><${RpThumb} id=${id} /><span>${nomi[id]}</span></button>`)}</div>`}
        <div class="stack" style="margin-top:14px">
          <button class="btn pri block" disabled=${!!busy} onClick=${condividi}>${busy === 'share' ? html`<div class="spin" />` : html`<${Icon} n="share" s=${19} />`} Condividi${scelte.length ? ' con ' + scelte.length + ' foto' : ''}</button>
          <button class="btn block" disabled=${!!busy} onClick=${() => copia(false)}>${busy === 'copy' ? html`<div class="spin" />` : ''} Copia testo e foto</button>
          <button class="btn block" disabled=${!!busy} onClick=${() => copia(true)}>Copia solo il testo</button>
        </div>
        <p class="hint-p">Con «Condividi» scegli Outlook: il testo va nel messaggio e le foto in allegato. «Copia testo e foto» va incollato nel corpo della mail.</p>
      </div>
    </div></div>`;
}
function RpThumb({ id }) { const u = useBlobUrl(id); return u ? html`<img src=${u} alt="" />` : html`<i></i>`; }
