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
    voci = M.map(m => { const st = raStato(m.stato); return { t: [m.codice, m.ubicazione].filter(Boolean).join(' – '), stato: st ? st.l : r.conclusa ? 'Non visionato' : 'Da verificare', crit: m.stato === 'danneggiato',
      righe: [m.descrizione, m.note && 'Note: ' + m.note].filter(Boolean), foto: m.foto || [] }; });
    const n = k => M.filter(m => m.stato === k).length;
    sintesi = [conta(M.length, 'manufatto', 'manufatti'), M.filter(m => m.stato).length + ' verificati', r.conclusa && M.some(m => !m.stato) && conta(M.filter(m => !m.stato).length, 'non visionato', 'non visionati'), n('danneggiato') && conta(n('danneggiato'), 'danneggiato', 'danneggiati'),
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
  } else if (r.type === 'hs' && r.aNote) {
    // sopralluogo a note: una voce per nota, nell'ordine dei capitoli, con le sue foto
    const C = hsCapi(r), num = hsNumNote(r);
    voci = hsNoteGruppi(r).flatMap(g => g.note.map(n => { const sb = g.c && hsSubDi(n, C), F = (r.foto || []).filter(p => p.ref === 'n.' + n.id);
      return { t: n.titolo || 'Osservazione ' + num[n.id], stato: g.c ? g.c.n + '. ' + g.c.tag + (sb ? ' · ' + sb.tag : '') : 'Senza capitolo',
        righe: [n.testo, n.mig && 'Attività di miglioramento: ' + n.mig].filter(Boolean), foto: F.map(p => p.id), cap: Object.fromEntries(F.map(p => [p.id, p.cap || ''])) }; }));
    sintesi = conta(voci.length, 'osservazione', 'osservazioni');
  } else if (r.type === 'hs') {
    voci = hsCriticita(r).map(c => ({ t: c.t, stato: 'Priorità ' + c.p, crit: c.p === 1, righe: [c.az && 'Azione: ' + c.az].filter(Boolean), foto: [] }));
    const F = hsFotoReport(r).filter(p => p.g !== 'prev');
    if (F.length) voci.push({ t: 'Foto del sopralluogo', stato: '', righe: [], foto: F.map(p => p.id), cap: Object.fromEntries(F.map(p => [p.id, p.cap || ''])) });
    sintesi = voci.filter(v => v.stato).length ? conta(voci.filter(v => v.stato).length, 'criticità', 'criticità') : 'Nessuna criticità di priorità 1 o 2';
  } else if (r.type === 'vs') {
    voci = (r.note || []).map((n, i) => ({ t: n.titolo || 'Osservazione ' + (i + 1), stato: (n.tag || []).map(t => '#' + t).join(' '), righe: [n.testo, n.mig && 'Attività di miglioramento: ' + n.mig].filter(Boolean), foto: n.foto || [] }));
    sintesi = conta(voci.length, 'osservazione', 'osservazioni');
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
      parts.push(`<p><b>${escH(v.t)}</b>${v.stato ? ' — <b style="color:' + (v.crit ? PRINT.critico : PRINT.testo) + '">' + escH(v.stato) + '</b>' : ''}${v.righe.map(x => '<br>' + escH(x)).join('')}</p>`);
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
        ${tutte.length > 0 && html`<div class="sec-h"><h3>Foto · ${scelte.length} di ${tutte.length}</h3></div>
          <div class="rp-foto">${tutte.map(id => html`<button key=${id} class=${'rp-ph' + (sel.has(id) ? ' on' : '')} onClick=${() => toggle(id)}><${RpThumb} id=${id} /><span>${nomi[id]}</span></button>`)}</div>`}
        <div class="stack mt-4">
          <button class="btn pri block" disabled=${!!busy} onClick=${condividi}>${busy === 'share' ? html`<div class="spin" />` : html`<${Icon} n="share" s=${19} />`} Condividi${scelte.length ? ' con ' + scelte.length + ' foto' : ''}</button>
          <button class="btn block" disabled=${!!busy} onClick=${() => copia(false)}>${busy === 'copy' ? html`<div class="spin" />` : ''} Copia testo e foto</button>
          <button class="btn block" disabled=${!!busy} onClick=${() => copia(true)}>Copia solo il testo</button>
        </div>
        <p class="hint-p">Con «Condividi» scegli Outlook: il testo va nel messaggio e le foto in allegato. «Copia testo e foto» va incollato nel corpo della mail.</p>
      </div>
    </div></div>`;
}
function RpThumb({ id }) { const u = useBlobUrl(id); return u ? html`<img src=${u} alt="" />` : html`<i></i>`; }

/* ---------------- Riepilogo del sopralluogo (v56) ----------------
   Pannello che sale dal basso, solo consultazione: per modificare si torna alla scheda.
   HSE a note: check-list dei capitoli, osservazioni per capitolo con le foto, appunti; in fondo «Genera report».
   Campioni (DDA Fase 2, Mappatura): campioni per matrice, avvisi (senza foto, non in pianta), campioni per piano, appunti; in fondo «Genera file». */
function RiepilogoPanel({ r, mats, onClose, onFile, azione, scelta }) {
  useBackClose(onClose);
  const hs = r.type === 'hs';
  const fotoN = hs ? (r.foto || []).length : 0;
  let corpo, sub;
  if (hs) {
    const C = hsCapi(r), num = hsNumNote(r), G = hsNoteGruppi(r), note = r.noteSop || [];
    sub = note.length + (note.length === 1 ? ' osservazione' : ' osservazioni') + ' · ' + fotoN + ' foto';
    corpo = html`<div class="sec-h mt-1"><h3>Check-list</h3></div>
      <div class="list">${C.map(c => { const S = hsStatoCap(r, c); return html`<div class=${'rcard st-bar ' + S.st} key=${c.k}><div class="r1"><span class="ttl hs-ckt">${c.n}. ${c.tag}</span><span class="dt">${S.w}</span></div></div>`; })}</div>
      ${G.map(g => html`<div key=${'g-' + (g.c ? g.c.k : '-')}><div class="list mt-3"><div class="list-h"><b>${g.c ? g.c.n + '. ' + g.c.tag : 'Senza capitolo'}</b><span>${g.note.length}</span></div>
        ${g.note.map(n => { const F = (r.foto || []).filter(p => p.ref === 'n.' + n.id); return html`<div class="riep-row" key=${n.id}>
          ${F.length ? html`<${Thumb44} id=${F[0].id} />` : html`<span class="thumb44 vuota"><${Icon} n="image" s=${18} /></span>`}
          <div class="t"><b>${n.titolo || 'Osservazione ' + num[n.id]}</b>${n.testo && html`<small>${n.testo}</small>`}<small class="riep-meta">${F.length ? F.length + ' foto' : 'Nessuna foto'}</small></div></div>`; })}</div></div>`)}`;
  } else {
    const all = mats.flatMap(m => (r.campioni[m.k] || []).map(c => ({ ...c, m })));
    const placed = placedRefs(r), noFoto = all.filter(c => !(c.foto || []).length), noPlan = all.filter(c => !placed.has(c.id));
    sub = all.length + (all.length === 1 ? ' campione' : ' campioni') + ' · ' + all.reduce((a, c) => a + (c.foto || []).length, 0) + ' foto';
    corpo = html`<div class="riep-mat mt-1">${mats.filter(m => (r.campioni[m.k] || []).length).map(m => html`<div key=${m.k} style=${'--c:' + m.c}><b>${r.campioni[m.k].length}</b><span><i class="mdot" style=${'background:' + m.c}></i>${m.l}</span></div>`)}</div>
      ${noFoto.length > 0 && html`<div class="card st-bar st-warn riep-av"><b>${noFoto.length === 1 ? '1 campione senza foto' : noFoto.length + ' campioni senza foto'}</b><small>${noFoto.map(c => c.codice).join(', ')}</small></div>`}
      ${noPlan.length > 0 && html`<div class="card st-bar st-warn riep-av"><b>${noPlan.length === 1 ? '1 campione non posizionato' : noPlan.length + ' campioni non posizionati'}</b><small>${noPlan.map(c => c.codice).join(', ')}</small></div>`}
      ${byPiano(all).map(([piano, list]) => html`<div class="list mt-3" key=${piano}><div class="list-h"><b>${piano}</b><span>${list.length}</span></div>
        ${list.map(c => html`<div class="riep-row" key=${c.id}>${(c.foto || []).length ? html`<${Thumb44} id=${c.foto[0]} dot=${c.m.c} />` : html`<span class="thumb44 vuota"><${Icon} n="image" s=${18} /></span>`}
          <div class="t"><b><span class="mono" style=${'color:' + c.m.c}>${c.codice || '—'}</span> ${c.descrizione || 'Descrizione da indicare'}</b><small>${[c.ubicazione, c.m.l].filter(Boolean).join(' · ')}</small></div></div>`)}</div>`)}`;
  }
  const ap = r.type === 'dda' ? r.appunti2 : r.appunti, apF = (r.type === 'dda' ? r.fotoAppunti2 : r.fotoAppunti) || [];
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}><div class="sheet riep-sheet" role="dialog" aria-label="Riepilogo">
    <div class="sheet-grab"></div>
    <div class="sheet-nav"><button class="btn link" onClick=${onClose}>Chiudi</button><b>Riepilogo</b><span></span></div>
    <div class="sheet-body">
      <div class="notice mt-0">Solo consultazione. Per modificare, torna alla scheda.</div>
      <p class="lead lead-gap">${sub}</p>
      ${corpo}
      ${(ap || apF.length > 0) && html`<div class="sec-h"><h3>Appunti</h3></div><div class="card">${ap && html`<div class="riep-ap">${ap}</div>`}
        ${apF.length > 0 && html`<div class="hs-fotos">${apF.map(id => html`<${Thumb44} key=${id} id=${id} />`)}</div>`}
        ${hs && html`<div class="mt-2"><span class="badge b-grey">Non va nel Word</span></div>`}</div>`}
      <${RiepCarico} r=${r} />
      ${scelta && html`<div class="sec-h"><h3>Modello del report</h3></div>${scelta}`}
      <div class="riep-dock">${azione || html`<button class="btn pri block" onClick=${() => { onClose(); onFile(); }}>Genera file</button>`}</div>
    </div></div></div>`;
}
/* stato del caricamento su OneDrive nel Riepilogo (v58): foto, video, documenti e file generati.
   Stesso elenco di «Invia a OneDrive» (odRecordItems) e stesso registro (od_sent). */
const RIEP_GRUPPI = { foto: 'Foto', immagini: 'Foto', note: 'Foto', video: 'Video', documenti: 'Documenti', rapporti: 'Documenti', aria: 'Monitoraggio aria' };
function RiepCarico({ r }) {
  const od = useOdFiles(); const [S, setS] = useState(null);
  useEffect(() => { let ok = true; (async () => {
    const sent = (await DB.get('od_sent')) || {}, items = await odRecordItems(r, _settings), G = {}, visti = new Set();
    for (const it of items) {
      if ((it.kind !== 'blob' && it.kind !== 'video') || visti.has(it.blobId)) continue; visti.add(it.blobId);
      const k = RIEP_GRUPPI[it.segs[0]] || 'Altri file'; G[k] = G[k] || { n: 0, su: 0 }; G[k].n++; if (sent[it.blobId]) G[k].su++;
    }
    const file = recDocs(r, _settings).map(d => { const L = fileRevs(r, d), e = L[L.length - 1];
      return { l: d.label + ' (' + FILE_FMT[d.type][0] + ')', st: !e ? 'Da generare' : sent[e.blobId] ? 'Su OneDrive' + (e.rev ? ' · rev' + e.rev : '') : 'Generato, da caricare', ok: !!(e && sent[e.blobId]), gen: !!e }; });
    if (ok) setS({ G, file });
  })(); return () => { ok = false; }; }, [r, od]);
  if (!S) return null;
  const righe = Object.entries(S.G);
  if (!righe.length && !S.file.length) return null;
  return html`<div class="sec-h"><h3>Caricamento su OneDrive</h3></div>
    ${!OD.account && html`<div class="notice mt-0">OneDrive non è collegato: foto, video e file sono solo su questo dispositivo.</div>`}
    <div class="list">${righe.map(([k, g]) => html`<div class=${'prow st-bar ' + (g.su === g.n ? 'st-ok' : 'st-warn')} key=${k}><div class="t"><b>${k}</b>
        <small>${g.su === g.n ? (g.n === 1 ? 'Su OneDrive' : 'Tutti su OneDrive') + ' (' + g.n + ')' : g.su + ' di ' + g.n + ' su OneDrive, ' + (g.n - g.su) + ' da caricare'}</small></div></div>`)}
      ${S.file.map(f => html`<div class=${'prow st-bar ' + (f.ok ? 'st-ok' : f.gen ? 'st-warn' : 'st-off')} key=${f.l}><div class="t"><b>${f.l}</b><small>${f.st}</small></div></div>`)}</div>`;
}
// tasto «Riepilogo» nel blocco navy dei contatori
const RiepGo = ({ onOpen }) => html`<button type="button" class="riep-go" onClick=${onOpen}>Riepilogo <${Icon} n="chev" s=${16} /></button>`;
