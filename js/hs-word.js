/* Sopralluoghi H&S — modello dati e motore Word (compilazione dei modelli caricati dall'utente,
   lettura dei report dell'anno precedente). Nessun testo aziendale: tutto sta nei modelli .docx. */

/* ---------------- struttura dei due formati ---------------- */
const HS_SCHEDE = [
  { k: 'agibilita', l: 'Agibilità', t: 'AGIBILITA’' },
  { k: 'prevenzione', l: 'Prevenzione incendi' },
  { k: 'esterne', l: 'Aree esterne', subs: ['Accessi', 'Aree di transito – Pavimentazione esterna', 'Facciata'] },
  { k: 'involucro', l: 'Involucro e copertura', subs: ['Copertura', 'Accesso alla copertura', 'Impianto anticaduta'] },
  { k: 'strutture', l: 'Strutture' },
  { k: 'interni', l: 'Interni' },
  { k: 'elettrici', l: 'Impianti elettrici e speciali', subs: ['Impianto elettrico', 'Illuminazione', 'Gruppo elettrogeno/UPS', 'Messa a terra', 'Protezione scariche atmosferiche'] },
  { k: 'meccanici', l: 'Impianti meccanici', subs: ['Impianto idrico sanitario', 'Impianto trattamento aria'] },
  { k: 'antincendio', l: 'Impianti e presidi antincendio' },
  { k: 'sollevamento', l: 'Impianti di sollevamento (ascensori, montacarichi, montascale, baie di carico)', s: 'Impianti di sollevamento', subs: ['Impianto ascensori, montacarichi, montascale', 'Baie di carico'] },
  { k: 'pericolosi', l: 'Materiali, apparecchiature, ambienti pericolosi' },
  { k: 'ambientali', l: 'Analisi ambientali e campionamenti', subs: ['Serbatoi (UST, AST)', 'Amianto/FAV', 'Autorizzazione agli scarichi', 'Rifiuti', 'Autorizzazione pozzi'] },
  { k: 'emergenze', l: 'Gestione delle emergenze' },
];
const HS_NATURA = ['', 'Penale', 'Amministrativa', 'Penale/Amministrativa', 'Nessuna'];
const HS_PRIO = { 1: 'non conforme', 2: 'da monitorare', 3: 'conforme' };
const HS_GRAV = ['Alto', 'Medio', 'Basso'];
const HS_RISP = [['si', 'Sì'], ['no', 'No'], ['na', 'N.A.']];
// capitoli del Sintetico: le tre tabelle "Fabbricati" sono un unico capitolo 4
const HS_SINT_SEZ = (() => {
  const out = [];
  HS_SINT_ITEMS.forEach(t => {
    let s = out.find(x => x.cap === t.cap);
    if (!s) { s = { cap: t.cap, titolo: t.sez, items: [] }; out.push(s); }
    s.items.push(...t.items);
  });
  return out;
})();
const HS_SINT_ALL = HS_SINT_SEZ.flatMap(s => s.items);
const HS_SINT_TIT = { 3: 'Aree esterne', 4: 'Fabbricati', 5: 'Locali tecnici ed impianti', 6: 'Condizioni ambientali', 7: 'Gestione emergenze' };
const HS_MAX_FOTO = 250;
const HS_AN_KEYS = [
  ['anno', 'Anno di costruzione'], ['destinazione', 'Destinazione d’uso'], ['stato', 'Stato occupazionale'], ['baie', 'Numero baie di carico'],
  ['descrizione', 'Descrizione sintetica dell’immobile'], ['parcheggiEst', 'Parcheggi esterni'], ['parcheggiInt', 'Parcheggi interni'],
  ['autorimesse', 'Autorimesse / Box'], ['fotovoltaico', 'Impianto fotovoltaico'], ['manutOrd', 'Manutenzione ordinaria'],
  ['manutStr', 'Manutenzione straordinaria'], ['adeguamenti', 'Adeguamenti normativi'], ['sismica', 'Classificazione sismica'], ['tenant', 'Ragione sociale Tenant'],
];
const HS_AN_OPT = {
  destinazione: ['', 'Logistica', 'Industriale - Logistica', 'Industriale', 'Direzionale / Uffici', 'Commerciale', 'Residenziale', 'Misto'],
  stato: ['', 'Occupato', 'Parzialmente occupato', 'Sfitto'], parcheggiEst: ['', 'Si', 'No'], parcheggiInt: ['', 'Si', 'No'], autorimesse: ['', 'Si', 'No'],
  fotovoltaico: ['', 'Presente', 'No'], manutOrd: ['', 'Tenant', 'Proprietà', 'Tenant / Proprietà'],
  manutStr: ['', 'Proprietà', 'Proprietà (per la parte relativa all’immobile)', 'Tenant'],
};

const hsEmptyScheda = s => ({ sit: '', subs: s.subs ? Object.fromEntries(s.subs.map(x => [x, ''])) : null, mig: '', natura: '', costo: '', idr: '', prio: null, cProp: false, cCond: false, termine: '' });
function newHs(records, settings, formato) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'hs' && (r.codice || '').startsWith('HS-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  const s = settings;
  const sint = formato === 'sintetico';
  return {
    id: uid('hs'), type: 'hs', formato: sint ? 'sintetico' : 'esteso', codice: `HS-${y}-${String(n).padStart(3, '0')}`,
    createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: sint ? (s.hsCommSint || '') : (s.hsCommEsteso || ''), citta: '', indirizzo: '', sito: '', data: today(),
    tecnico: `${s.tecnicoNome} ${s.tecnicoCognome}`.trim(),
    meta: { proprieta: '', redatto: `${s.tecnicoCognome} ${s.tecnicoNome}`.trim(), verificato: s.hsVerificato || '', approvato: s.hsApprovato || '',
      protocollo: '', revisione: sint ? '-' : '00', emissione: '', presenti: '', superficie: '', fondo: '', firma: s.hsFirma || '' },
    img: {}, foto: [], base: {}, visite: [],
    an: {}, inquadramento: '', catFab: [], catTer: [], schede: Object.fromEntries(HS_SCHEDE.map(x => [x.k, hsEmptyScheda(x)])),
    anS: HS_SINT_AN.map((l, i) => i === 10 ? (s.hsDeveloper || '') : i === 11 ? (s.hsPropertyManager || '') : i === 12 ? (s.hsProcuratore || '') : i === 13 ? (s.hsTecnici || '') : ''),
    risp: {}, note: {}, descr: '', azioni: [],
    appunti: '', fotoAppunti: [], documenti: [],
  };
}
const hsSchedaText = d => (d.subs ? Object.values(d.subs).join('\n') : d.sit || '');
function hsIsEmpty(r) {
  return !r.commessa && !r.sito && !r.indirizzo && !r.citta && !(r.foto || []).length && !r.appunti && !(r.documenti || []).length
    && !Object.values(r.schede || {}).some(d => hsSchedaText(d).trim() || d.mig || d.prio)
    && !Object.keys(r.risp || {}).length && !Object.values(r.note || {}).some(Boolean) && !r.descr && !(r.azioni || []).length;
}
// stato di compilazione di una scheda Esteso / di un capitolo Sintetico
const hsSchedaFatta = d => !!(hsSchedaText(d).trim() || d.prio);
const hsCapFatti = (r, sez) => sez.items.filter(it => r.risp[it.id]).length;
// criticità: Esteso priorità 1 e 2, Sintetico azioni con gravità
function hsCriticita(r) {
  if (r.formato === 'sintetico') return (r.azioni || []).filter(a => a.grav === 'Alto' || a.grav === 'Medio')
    .map(a => ({ p: a.grav === 'Alto' ? 1 : 2, t: [a.cod, a.sit].filter(Boolean).join(' · '), az: a.az }));
  return HS_SCHEDE.map((s, i) => ({ s, i, d: r.schede[s.k] })).filter(x => x.d && (x.d.prio === 1 || x.d.prio === 2))
    .map(x => ({ p: x.d.prio, t: (x.i + 1) + '. ' + (x.s.s || x.s.l), az: x.d.mig, costo: x.d.costo, termine: x.d.termine }))
    .sort((a, b) => a.p - b.p);
}
// documenti dichiarati mancanti nelle schede (recap per il sopralluogo)
const HS_RE_DOC = /(non\s+è\s+stat[ao]\s+(resa|reso|possibile|reperit|disponibile)|non\s+risulta\s+(disponibile|aggiornat)|mancant|assent|non\s+reperit|scadut)/i;
function hsDocMancanti(r) {
  const out = [];
  HS_SCHEDE.forEach((s, i) => {
    hsSchedaText(r.schede[s.k] || {}).replace(/\.\s+/g, '.\n').split(/\n/).forEach(fr => {
      const f = fr.replace(/\s+/g, ' ').trim();
      if (f.length > 25 && HS_RE_DOC.test(f)) out.push({ n: i + 1, s: s.s || s.l, f });
    });
  });
  return out;
}
const MESI_IT = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const meseAnno = iso => { const d = iso ? new Date(iso + 'T12:00:00') : new Date(); return isNaN(d) ? '' : MESI_IT[d.getMonth()] + ' ' + d.getFullYear(); };
const hsEmissione = r => r.meta.emissione || meseAnno(r.data);
function hsFileBase(r) {
  const pul = t => String(t || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const nome = r.formato === 'sintetico' ? [pul(r.meta.fondo), pul(r.sito)].filter(Boolean).join('_') : pul(r.citta || r.sito);
  return [pul(r.meta.protocollo), nome || 'Immobile', r.formato === 'sintetico' ? 'Report Procurato HS' : 'Report HS', hsEmissione(r)].filter(Boolean).join(' - ');
}

/* ---------------- confronto con il report precedente ----------------
   Le righe già presenti nel report importato escono in GRIGIO, quelle nuove o modificate in NERO. */
const HS_GRIGIO = '808080';
const hsNormLine = l => String(l || '').replace(/^[ \t]*[-•*]\s+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
function hsDiff(text, base) {
  const old = {};
  String(base || '').split('\n').forEach(l => { const k = hsNormLine(l); if (k) old[k] = (old[k] || 0) + 1; });
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.map(l => { const k = hsNormLine(l); const vecchia = !!(k && old[k]); if (vecchia) old[k]--; return { t: l, old: vecchia }; });
}

/* ---------------- zip e XML ---------------- */
async function hsUnzip(buf) {
  const z = await JSZip.loadAsync(buf); const files = {};
  for (const n of Object.keys(z.files)) if (!z.files[n].dir) files[n] = await z.files[n].async('uint8array');
  return files;
}
async function hsZip(files) {
  const z = new JSZip();
  Object.keys(files).sort((a, b) => (a === '[Content_Types].xml' ? -1 : b === '[Content_Types].xml' ? 1 : 0)).forEach(n => z.file(n, files[n]));
  return z.generateAsync({ type: 'blob', mimeType: DOCX_MIME, compression: 'DEFLATE' });
}
const dec8 = u => new TextDecoder().decode(u), enc8 = t => new TextEncoder().encode(t);
const xe = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
// Word a volte spezza un segnaposto su più run (correttore, formattazione): lo ricompongo nel primo run
function hsHeal(x) {
  return x.replace(/<w:p\b(?:(?!<w:p\b)[\s\S])*?<\/w:p>/g, p => {
    if (p.indexOf('@') < 0) return p;
    const txt = (p.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('');
    const want = txt.match(/@@[A-Z0-9_:]+@@/g) || [];
    if (!want.length || want.every(k => p.indexOf(k) >= 0)) return p;
    let first = true;
    return p.replace(/(<w:t(?: [^>]*)?>)[^<]*(<\/w:t>)/g, (m, a, b) => { if (first) { first = false; return '<w:t xml:space="preserve">' + txt + b; } return a + b; });
  });
}
// testo semplice al posto del segnaposto (anche dentro una frase); le righe diventano a capo
function hsFill(x, key, text, once) {
  const v = xe(text == null ? '' : text).split('\n').join('</w:t><w:br/><w:t xml:space="preserve">');
  return once ? x.replace('@@' + key + '@@', v) : x.split('@@' + key + '@@').join(v);
}
// confini del paragrafo che contiene il segnaposto
function hsPara(x, key) {
  const i = x.indexOf('@@' + key + '@@'); if (i < 0) return null;
  let s = i; for (;;) { s = x.lastIndexOf('<w:p', s - 1); if (s < 0) return null; const c = x.charAt(s + 4); if (c === '>' || c === ' ') break; }
  const e = x.indexOf('</w:p>', i) + 6;
  const para = x.slice(s, e);
  const ppr = (para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const before = para.slice(0, para.indexOf('@@' + key + '@@'));
  const rs = before.lastIndexOf('<w:r>') >= 0 || before.lastIndexOf('<w:r ') >= 0 ? Math.max(before.lastIndexOf('<w:r>'), before.lastIndexOf('<w:r ')) : -1;
  const rpr = rs >= 0 ? ((before.slice(rs).match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0]) : '';
  return { s, e, ppr, rpr, head: (para.match(/^<w:p\b[^>]*>/) || ['<w:p>'])[0] };
}
function hsReplacePara(x, key, xml) {
  const p = hsPara(x, key); if (!p) return x;
  return x.slice(0, p.s) + (xml || p.head + p.ppr + '</w:p>') + x.slice(p.e);
}
function hsRpr(rpr, color) {
  let inner = (rpr || '').replace(/^<w:rPr>/, '').replace(/<\/w:rPr>$/, '').replace(/<w:color\b[^>]*\/>/g, '');
  if (color) {
    const m = inner.search(/<w:(spacing|w|kern|position|sz|szCs|highlight|u|effect|bdr|shd|fitText|vertAlign|rtl|cs|em|lang|eastAsianLayout|specVanish|oMath)[ \/>]/);
    const tag = '<w:color w:val="' + color + '"/>';
    inner = m >= 0 ? inner.slice(0, m) + tag + inner.slice(m) : inner + tag;
  }
  return inner ? '<w:rPr>' + inner + '</w:rPr>' : '';
}
// testo su più paragrafi al posto del segnaposto: righe vecchie grigie, nuove nere, "- " = elenco
function hsFillBlock(x, key, text, base, opt = {}) {
  const p = hsPara(x, key); if (!p) return x;
  const lines = opt.grigio === false ? String(text || '').split('\n').map(t => ({ t, old: false })) : hsDiff(text, base);
  if (opt.extra) lines.push(...opt.extra);
  let out = '';
  lines.forEach(L => {
    let t = L.t, ppr = p.ppr;
    const bm = t.match(/^(\s*)[•\-*]\s+(.*)$/);
    if (bm && opt.lists !== false) {
      const lv = Math.min(3, Math.floor(bm[1].length / 2));
      let inner = ppr.replace(/^<w:pPr>/, '').replace(/<\/w:pPr>$/, '').replace(/<w:ind\b[^>]*\/>/, '').replace(/<w:numPr>[\s\S]*?<\/w:numPr>/, '');
      const ind = '<w:ind w:left="' + (360 + lv * 360) + '" w:hanging="240"/>';
      const at = inner.search(/<w:(contextualSpacing|mirrorIndents|suppressOverlap|jc|textDirection|textAlignment|textboxTightWrap|outlineLvl|divId|cnfStyle|rPr|sectPr|pPrChange)[ \/>]/);
      inner = at >= 0 ? inner.slice(0, at) + ind + inner.slice(at) : inner + ind;
      ppr = '<w:pPr>' + inner + '</w:pPr>'; t = '•\t' + bm[2];
    }
    const rp = hsRpr(p.rpr, L.old && opt.grigio !== false ? HS_GRIGIO : null);
    const runs = t.split('\t').map((piece, j) => (j ? '<w:r>' + rp + '<w:tab/></w:r>' : '') + (piece ? '<w:r>' + (L.b ? rp.replace('<w:rPr>', '<w:rPr><w:b/>') || '<w:rPr><w:b/></w:rPr>' : rp) + '<w:t xml:space="preserve">' + xe(piece) + '</w:t></w:r>' : '')).join('');
    out += p.head + ppr + runs + '</w:p>';
  });
  if (!out) out = p.head + p.ppr + '</w:p>';
  return x.slice(0, p.s) + out + x.slice(p.e);
}
// riga di tabella che contiene il segnaposto, ripetuta per ogni elemento
function hsCloneRows(x, key, items, fill) {
  const i = x.indexOf('@@' + key + '@@'); if (i < 0) return x;
  let s = i; for (;;) { s = x.lastIndexOf('<w:tr', s - 1); if (s < 0) return x; const c = x.charAt(s + 5); if (c === '>' || c === ' ') break; }
  const e = x.indexOf('</w:tr>', i) + 7;
  const row = x.slice(s, e).replace(/ w14:(paraId|textId)="[^"]*"/g, '');
  const rows = (items.length ? items : [null]).map((it, k) => fill(row, it, k)).join('');
  return x.slice(0, s) + rows + x.slice(e);
}

/* ---------------- immagini ---------------- */
function hsCtx(files) {
  const rels = dec8(files['word/_rels/document.xml.rels']);
  let ct = dec8(files['[Content_Types].xml']);
  ['jpeg', 'png'].forEach(ext => { if (!new RegExp('Extension="' + ext + '"', 'i').test(ct)) ct = ct.replace('<Types ', '<Types ').replace(/(<Types[^>]*>)/, '$1<Default Extension="' + ext + '" ContentType="image/' + ext + '"/>'); });
  files['[Content_Types].xml'] = enc8(ct);
  return { files, rels, n: 0, id: 4000 };
}
function hsAddMedia(ctx, u8, png) {
  ctx.n++;
  const nome = 'nembo_' + ctx.n + (png ? '.png' : '.jpeg');
  ctx.files['word/media/' + nome] = u8;
  const rid = 'rIdN' + ctx.n;
  ctx.rels = ctx.rels.replace('</Relationships>', '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + nome + '"/></Relationships>');
  return rid;
}
function hsImgRun(ctx, rid, w, h, maxCx, maxCy) {
  const ratio = w && h ? h / w : 0.75;
  let cx = maxCx, cy = Math.round(maxCx * ratio);
  if (cy > maxCy) { cy = maxCy; cx = Math.round(maxCy / ratio); }
  const id = ++ctx.id;
  return '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    '<wp:docPr id="' + id + '" name="Immagine ' + id + '"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:nvPicPr><pic:cNvPr id="0" name="img' + id + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
}
// immagine salvata nell'app → byte JPEG e dimensioni; ratio = porta al rapporto indicato aggiungendo bordi bianchi
async function hsImage(id, ratio, crop) {
  const b = id && await DB.getBlob(id); if (!b) return null;
  const bmp = await createImageBitmap(b.blob);
  try {
    let W = bmp.width, H = bmp.height, sx = 0, sy = 0, sw = W, sh = H, dx = 0, dy = 0;
    if (crop) { // ritaglio al centro (copertina Sintetico)
      if (W / H > crop) { sw = Math.round(H * crop); sx = Math.round((W - sw) / 2); } else { sh = Math.round(W / crop); sy = Math.round((H - sh) / 2); }
      W = sw; H = sh;
    } else if (ratio && Math.abs(W / H - ratio) > 0.02) {
      if (W / H > ratio) { H = Math.round(W / ratio); dy = Math.round((H - bmp.height) / 2); } else { W = Math.round(H * ratio); dx = Math.round((W - bmp.width) / 2); }
    } else return { u8: new Uint8Array(await b.blob.arrayBuffer()), w: W, h: H, png: b.type === 'image/png' };
    const k = Math.min(1, 1600 / Math.max(W, H));
    const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, sx, sy, sw, sh, dx * k, dy * k, sw * k, sh * k);
    const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); c.width = c.height = 0;
    return { u8: new Uint8Array(await out.arrayBuffer()), w: Math.round(W * k), h: Math.round(H * k) };
  } finally { bmp.close && bmp.close(); }
}
const CMx = 360000;
async function hsImgPara(ctx, id, wCm, hCm, ppr) {
  const im = await hsImage(id); if (!im) return '';
  return '<w:p>' + (ppr || '<w:pPr><w:spacing w:before="0" w:after="60"/><w:jc w:val="center"/></w:pPr>') + hsImgRun(ctx, hsAddMedia(ctx, im.u8, im.png), im.w, im.h, Math.round(wCm * CMx), Math.round(hCm * CMx)) + '</w:p>';
}
// foto del report: prima "sopralluogo precedente", poi "ultimo", solo quelle incluse
const hsFotoOrd = r => [...(r.foto || []).filter(p => p.g === 'prev'), ...(r.foto || []).filter(p => p.g !== 'prev')];
const hsFotoReport = r => hsFotoOrd(r).filter(p => p.inc !== false);

/* ---------------- tabelle generate (Esteso) ---------------- */
const TAH = '<w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/>';
function wRpr(o = {}) {
  return '<w:rPr>' + TAH + (o.b ? '<w:b/><w:bCs/>' : '') + (o.i ? '<w:i/>' : '') + (o.caps ? '<w:caps/>' : '') + (o.color ? '<w:color w:val="' + o.color + '"/>' : '') + (o.sz ? '<w:sz w:val="' + o.sz + '"/><w:szCs w:val="' + o.sz + '"/>' : '') + '</w:rPr>';
}
function wRuns(text, o) { const rp = wRpr(o); return String(text == null ? '' : text).split('\n').map((l, i) => (i ? '<w:r>' + rp + '<w:br/></w:r>' : '') + '<w:r>' + rp + '<w:t xml:space="preserve">' + xe(l) + '</w:t></w:r>').join(''); }
function wP(text, o = {}) {
  const sp = (o.before != null || o.after != null) ? '<w:spacing' + (o.before != null ? ' w:before="' + o.before + '"' : '') + (o.after != null ? ' w:after="' + o.after + '"' : '') + '/>' : '';
  return '<w:p><w:pPr>' + (o.style ? '<w:pStyle w:val="' + o.style + '"/>' : '') + (o.pShd ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.pShd + '"/>' : '') + sp +
    (o.align ? '<w:jc w:val="' + o.align + '"/>' : '') + (o.ind != null ? '<w:ind w:left="' + o.ind + '" w:hanging="240"/>' : '') + (o.keep ? '<w:keepNext/>' : '') + '</w:pPr>' + wRuns(text, o) + '</w:p>';
}
// testo di una scheda: righe dell'anno precedente grigie, nuove nere; "- " diventa elenco
function wBody(text, base, grigio, o = {}) {
  const lines = grigio ? hsDiff(text, base) : String(text || '').split('\n').map(t => ({ t, old: false }));
  let out = '', buf = null;
  const flush = () => { if (buf && buf.r.length) out += wP(buf.r.join('\n'), Object.assign({ before: 60, after: 60, align: 'both' }, o, buf.old ? { color: HS_GRIGIO } : {})); buf = null; };
  lines.forEach(L => {
    const m = L.t.match(/^([ \t]*)[-•*]\s+(.*)$/);
    if (m) { flush(); const lv = Math.min(3, Math.floor(m[1].replace(/\t/g, '    ').length / 4)); out += wP('•\t' + m[2], Object.assign({ before: 30, after: 30, align: 'both', ind: 600 + lv * 360 }, o, L.old ? { color: HS_GRIGIO } : {})); }
    else if (!L.t.trim()) flush();
    else { flush(); buf = { old: L.old, r: [L.t] }; flush(); }
  });
  flush();
  return out || wP('', { before: 60, after: 60 });
}
function wTC(inner, o = {}) {
  return '<w:tc><w:tcPr><w:tcW w:w="' + (o.w || 0) + '" w:type="' + (o.type || 'dxa') + '"/>' + (o.span ? '<w:gridSpan w:val="' + o.span + '"/>' : '') +
    (o.vm ? '<w:vMerge' + (o.vm === 'start' ? ' w:val="restart"' : '') + '/>' : '') + (o.borders ? '<w:tcBorders>' + o.borders + '</w:tcBorders>' : '') +
    (o.fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.fill + '"/>' : '') + (o.va ? '<w:vAlign w:val="' + o.va + '"/>' : '') + '</w:tcPr>' + (inner || wP('', { after: 0 })) + '</w:tc>';
}
const wCell = (text, o = {}) => wTC(wP(text, { sz: o.sz, b: o.b, i: o.i, align: o.align, before: o.pb == null ? 60 : o.pb, after: o.pa == null ? 60 : o.pa }), o);
const wTR = (cells, o = {}) => '<w:tr>' + ((o.hdr || o.h || o.cant || o.jc) ? '<w:trPr>' + (o.cant ? '<w:cantSplit/>' : '') + (o.h ? '<w:trHeight w:val="' + o.h + '"/>' : '') + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : '') + (o.hdr ? '<w:tblHeader/>' : '') + '</w:trPr>' : '') + cells + '</w:tr>';
function wTBL(rows, grid, o = {}) {
  const w = o.wType === 'pct' ? '<w:tblW w:w="' + o.w + '" w:type="pct"/>' : (o.w ? '<w:tblW w:w="' + o.w + '" w:type="dxa"/>' : '<w:tblW w:w="0" w:type="auto"/>');
  return '<w:tbl><w:tblPr><w:tblStyle w:val="Grigliatabella"/>' + w + (o.jc ? '<w:jc w:val="' + o.jc + '"/>' : '') +
    (o.cellMar ? '<w:tblCellMar><w:top w:w="57" w:type="dxa"/><w:bottom w:w="57" w:type="dxa"/></w:tblCellMar>' : '') +
    '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>' +
    grid.map(g => '<w:gridCol w:w="' + g + '"/>').join('') + '</w:tblGrid>' + rows + '</w:tbl>';
}
const wBreak = () => '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r>' + wRpr() + '<w:br w:type="page"/></w:r></w:p>';
const wEmpty = () => '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
const FILL = 'D9D9D9';
const dataIT = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ''); };
const hsComp = d => [d.cProp && 'Proprietà', d.cCond && 'Conduttore'].filter(Boolean).join(' / ') || '-';
const hsVuota = d => !d.prio && !d.natura;

function hsSchedeXml(r, grigio) {
  const B = r.base || {};
  const RW = [239, 1116, 612, 640, 743, 743, 907];
  const hc = (t, w) => wCell(t, { w, type: 'pct', fill: FILL, b: true, align: 'center', va: 'center', pb: 0, pa: 0 });
  const vc = (t, w) => wCell(t, { w, type: 'pct', align: 'center', va: 'center', pb: 0, pa: 0 });
  const hdr = wTR(hc('ID', RW[0]) + hc('Natura del rischio', RW[1]) + hc('Costo indicativo', RW[2]) + hc('Priorità di intervento', RW[3]) +
    hc('Competenza\nProprietà', RW[4]) + hc('Competenza\nConduttore', RW[5]) + hc('Termine di completamento', RW[6]), { jc: 'center', hdr: true });
  let doc = '';
  HS_SCHEDE.forEach((s, i) => {
    const d = r.schede[s.k] || hsEmptyScheda(s);
    doc += wBreak();
    doc += wP((s.t || s.l).toUpperCase(), { style: 'Titolo2', sz: 24, b: true });
    doc += wEmpty();
    let sit = '';
    if (s.subs) s.subs.forEach(sub => { sit += wP(sub.toUpperCase(), { style: 'Titolo3', sz: 22, align: 'both' }); sit += wBody((d.subs || {})[sub], B['sch.' + s.k + '.' + sub], grigio); });
    else sit = wBody(d.sit, B['sch.' + s.k + '.sit'], grigio);
    const mig = d.mig ? wBody(d.mig, B['sch.' + s.k + '.mig'], grigio) : wP('Nessuna azione necessaria', { align: 'both', before: 60, after: 60 });
    doc += wTBL(wTR(wCell('Situazione rilevata', { w: 1688, fill: FILL, b: true }) + wTC(sit, { w: 7940 })) +
      wTR(wCell('Attività di miglioramento ', { w: 1688, fill: FILL, b: true }) + wTC(mig, { w: 7940 })), [1688, 7940]);
    doc += wEmpty();
    const v = hsVuota(d);
    doc += wTBL(hdr + wTR(vc(v ? '' : (d.idr || '-'), RW[0]) + vc(v ? '' : (d.natura || '-'), RW[1]) + vc(v ? '' : (d.costo || '-'), RW[2]) +
      vc(v ? '' : (d.prio ? String(d.prio) : '-'), RW[3]) + vc(v ? '' : (d.cProp ? 'SI' : 'NO'), RW[4]) + vc(v ? '' : (d.cCond ? 'SI' : 'NO'), RW[5]) + vc(v ? '' : (d.termine || '-'), RW[6]), { jc: 'center' }),
      RW, { w: 5000, wType: 'pct', jc: 'center', cellMar: true });
  });
  return doc;
}
async function hsFotoXml(ctx, r, onStep) {
  const foto = hsFotoReport(r);
  if (!foto.length) return wP('Non è stata allegata documentazione fotografica.', { i: true });
  const FW = [5172, 2739, 1978], BB = '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>', NOLR = '<w:left w:val="nil"/><w:right w:val="nil"/>';
  let doc = '';
  for (let g = 0; g < foto.length; g += 3) {
    const grp = foto.slice(g, g + 3); let rows = '';
    for (let k = 0; k < grp.length; k++) {
      const p = grp[k], n = g + k + 1;
      onStep && onStep(n, foto.length);
      const im = await hsImage(p.id, 4 / 3);
      const imgP = im ? '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/></w:pPr>' + hsImgRun(ctx, hsAddMedia(ctx, im.u8, im.png), im.w, im.h, Math.round(8.6 * CMx), Math.round(6.45 * CMx)) + '</w:p>' : wEmpty();
      const dt = p.ts ? dataIT(p.ts.slice(0, 10)) : dataIT(r.data);
      rows += wTR(wTC(imgP, { w: 5136, vm: 'start', va: 'center' }) + wCell('Fotografia n.' + n, { w: 2766, fill: FILL, b: true, align: 'center', borders: BB, pb: 120, pa: 120 }) +
        wCell(dt, { w: 1987, b: true, align: 'center', borders: BB, pb: 120, pa: 120 }), { cant: true, h: 416 });
      rows += wTR(wTC('', { w: 5136, vm: 'cont' }) + wCell(r.indirizzo || '', { w: 4753, span: 2, b: true, align: 'center', va: 'center', borders: BB, pb: 0, pa: 0 }), { cant: true, h: 433 });
      rows += wTR(wTC('', { w: 5136, vm: 'cont', borders: BB }) + wTC(wBody(p.cap, (r.base || {})['cap.' + p.id], ctx.grigio, { before: 120, after: 120, align: 'left' }), { w: 4753, span: 2, borders: BB }), { cant: true, h: 1900 });
      if (k < grp.length - 1) rows += wTR(wTC(wEmpty(), { w: 5136, borders: NOLR }) + wTC(wEmpty(), { w: 4753, span: 2, borders: NOLR }), { cant: true });
    }
    doc += wTBL(rows, FW, { w: 9889 });
    if (g + 3 < foto.length) doc += wBreak();
  }
  return doc;
}
function hsRiepilogoXml(r) {
  const SW = [198, 1179, 794, 640, 541, 712, 936];
  const hd = (t, w) => wCell(t, { w, type: 'pct', fill: FILL, b: true, sz: 18, align: 'center', va: 'center' });
  const c = (t, w, al) => wCell(t, { w, type: 'pct', align: al, va: 'center' });
  let rows = wTR(hd('N.', SW[0]) + hd('SCHEDA', SW[1]) + hd('NATURA DEL RISCHIO', SW[2]) + hd('COSTO INDICATIVO', SW[3]) + hd('PRIORITA’ DI INTERVENTO', SW[4]) + hd('COMPETENZA', SW[5]) + hd('TERMINE DI COMPLETAMENTO', SW[6]), { hdr: true });
  HS_SCHEDE.forEach((s, i) => {
    const d = r.schede[s.k] || hsEmptyScheda(s), v = hsVuota(d);
    rows += wTR(c(String(i + 1), SW[0], 'center') + c((s.t || s.l).toUpperCase(), SW[1]) + c(v ? '-' : (d.natura || '-'), SW[2], 'center') + c(v ? '-' : (d.costo || '-'), SW[3], 'center') +
      c(v ? '-' : (d.prio ? String(d.prio) : '-'), SW[4], 'center') + c(v ? '-' : hsComp(d), SW[5], 'center') + c(v ? '-' : (d.termine || '-'), SW[6], 'center'));
  });
  return wTBL(rows, [577, 3430, 2310, 1862, 1574, 2072, 2723], { w: 5220, wType: 'pct' });
}
function hsVisite(r) {
  const v = (r.visite || []).slice();
  if (r.data && !v.some(x => x.data === r.data)) v.push({ data: r.data, presenti: r.meta.presenti || '' });
  return v;
}

/* ---------------- compilazione: Esteso ---------------- */
async function hsBuildEsteso(r, settings, tpl, opt = {}) {
  const files = await hsUnzip(tpl);
  const ctx = hsCtx(files); ctx.grigio = opt.grigio !== false;
  const m = r.meta, a = r.an || {}, B = r.base || {};
  let x = hsHeal(dec8(files['word/document.xml']));
  if (x.indexOf('@@SCHEDE@@') < 0) throw new Error('il modello Esteso non contiene il segnaposto @@SCHEDE@@');
  const T = { NOMESITO: r.sito, INDIRIZZO: r.indirizzo, PROPRIETA: m.proprieta, COMMITTENTE: r.cliente, DATAREPORT: meseAnno(r.data), REDATTO: m.redatto,
    VERIFICATO: m.verificato, PROTOCOLLO: m.protocollo, COMMESSA: r.commessa, AN_INDIRIZZO: r.indirizzo, AN_SUPERFICIE: m.superficie };
  HS_AN_KEYS.forEach(([k]) => { if (k !== 'descrizione') T['AN_' + k.toUpperCase()] = a[k]; });
  x = hsFillBlock(x, 'AN_DESCRIZIONE', a.descrizione, B['an.descrizione'], { grigio: ctx.grigio });
  x = hsFillBlock(x, 'INQUADRAMENTO', r.inquadramento, B.inquadramento, { grigio: ctx.grigio });
  Object.entries(T).forEach(([k, v]) => { x = hsFill(x, k, v || ''); });
  x = hsCloneRows(x, 'V_DATA', hsVisite(r), (row, v) => hsFill(hsFill(row, 'V_DATA', v ? dataIT(v.data) : ''), 'V_PRESENTI', v ? v.presenti : ''));
  x = hsCloneRows(x, 'CF_FOGLIO', r.catFab || [], (row, c) => ['FOGLIO', 'PARTICELLA', 'SUB', 'CATEGORIA'].reduce((t, k) => hsFill(t, 'CF_' + k, c ? c[k.toLowerCase()] : ''), row));
  const ter = (r.catTer || []).filter(t => t.foglio || t.mappale);
  x = hsReplacePara(x, 'CATASTO_TERRENI', ter.length ? wP('Catasto terreni', { b: true, after: 60, before: 120 }) +
    wTBL(wTR(wCell('Foglio:', { w: 2529, fill: FILL, b: true }) + wCell('Mappali:', { w: 7325, fill: FILL, b: true }), { hdr: true }) + ter.map(t => wTR(wCell(t.foglio, { w: 2529 }) + wCell(t.mappale, { w: 7325 }))).join(''), [2529, 7325]) : '');
  const IM = { COPERTINA: [17, 12.75], FIRMA: [5, 3], MAPPA: [17, 9.9], AEREA: [17, 9.9], CATASTO1: [15.3, 10.5], CATASTO2: [15.3, 11] };
  for (const [k, [w, h]] of Object.entries(IM)) {
    const id = (r.img || {})[k.toLowerCase()];
    const p = hsPara(x, 'IMG:' + k);
    x = hsReplacePara(x, 'IMG:' + k, id ? await hsImgPara(ctx, id, w, h, p && p.ppr) : '');
  }
  x = hsReplacePara(x, 'SCHEDE', hsSchedeXml(r, ctx.grigio));
  x = hsReplacePara(x, 'FOTO', await hsFotoXml(ctx, r, opt.onStep));
  x = hsReplacePara(x, 'RIEPILOGO', hsRiepilogoXml(r));
  hsFinish(ctx, x, { REVISIONE: m.revisione || '00', MESEANNO: meseAnno(r.data), COMUNE: r.citta || r.sito, COMMESSA: r.commessa });
  return hsZip(files);
}
// segnaposto nelle intestazioni e nei piè di pagina, controllo dei residui, impacchettamento
function hsFinish(ctx, x, foot) {
  const files = ctx.files;
  Object.keys(files).filter(n => /^word\/(header|footer)\d+\.xml$/.test(n)).forEach(n => {
    let f = hsHeal(dec8(files[n]));
    Object.entries(foot).forEach(([k, v]) => { f = hsFill(f, k, v || ''); });
    files[n] = enc8(f);
  });
  const left = [...new Set((x.match(/@@[A-Z0-9_:]+@@/g) || []))];
  if (left.length) throw new Error('il modello contiene segnaposto non riconosciuti: ' + left.slice(0, 4).join(', '));
  files['word/document.xml'] = enc8(x);
  files['word/_rels/document.xml.rels'] = enc8(ctx.rels);
  // Word aggiorna sommario e campi all'apertura
  if (files['word/settings.xml']) {
    let s = dec8(files['word/settings.xml']);
    if (s.indexOf('updateFields') < 0) s = s.replace(/(<w:settings\b[^>]*>)/, '$1<w:updateFields w:val="true"/>');
    files['word/settings.xml'] = enc8(s);
  }
}

/* ---------------- compilazione: Sintetico ---------------- */
async function hsBuildSintetico(r, settings, tpl, opt = {}) {
  const files = await hsUnzip(tpl);
  const ctx = hsCtx(files); const g = opt.grigio !== false; ctx.grigio = g;
  const m = r.meta, B = r.base || {};
  let x = hsHeal(dec8(files['word/document.xml']));
  if (x.indexOf('@@NT_0_1@@') < 0) throw new Error('il modello Sintetico non contiene le voci della checklist (@@NT_…@@)');
  const emis = hsEmissione(r);
  const T = { FONDO: m.fondo, NOME: r.sito, INDIRIZZO: r.indirizzo, DATACOP: emis, COMMESSA: r.commessa, COMMITTENTE: r.cliente, EMISSIONE: emis,
    REVISIONE: m.revisione, PROTOCOLLO: m.protocollo, REDATTO: m.redatto, VERIFICATO: m.verificato, APPROVATO: m.approvato, FILE: hsFileBase(r), FIRMA: m.firma };
  Object.entries(T).forEach(([k, v]) => { x = hsFill(x, k, v || ''); });
  (r.anS || []).forEach((v, i) => { x = hsFillBlock(x, 'AN' + i, v || (i === 0 ? r.indirizzo : i === 7 ? dataIT(r.data) : ''), B['an.' + i], { grigio: g }); });
  for (let i = (r.anS || []).length; i < 20; i++) x = hsFill(x, 'AN' + i, '');
  const K = ['si', 'no', 'na'];
  x = x.replace(/@@CK_(\d+_\d+)_(\d)@@/g, (mm, id, j) => r.risp[id] === K[+j] ? '1' : '0');
  x = x.replace(/@@GL_(\d+_\d+)_(\d)@@/g, (mm, id, j) => r.risp[id] === K[+j] ? '☒' : '☐');
  const rep = hsFotoReport(r);
  HS_SINT_ALL.forEach(it => {
    const nums = [], nuove = [];
    rep.forEach((p, i) => { if (p.ref === it.id) { nums.push(i + 1); if (p.g !== 'prev') nuove.push(i + 1); } });
    const extra = nums.length ? [{ t: 'ID Foto ' + nums.join(', '), old: g && !nuove.length, b: true }] : null;
    x = hsFillBlock(x, 'NT_' + it.id, r.note[it.id], B['nt.' + it.id], { grigio: g, extra });
  });
  x = hsFillBlock(x, 'DESCR', r.descr, B.descr, { grigio: g });
  const righe = (r.azioni || []).filter(a => a.cod || a.sit || a.risk || a.grav || a.az);
  const KZ = ['cod', 'sit', 'risk', 'grav', 'az'];
  x = hsCloneRows(x, 'AZ0', righe, (row, a) => KZ.reduce((t, k, i) => a ? hsFillBlock(t, 'AZ' + i, a[k], (a.b || {})[k], { grigio: g, lists: k !== 'cod' && k !== 'grav' }) : hsFill(t, 'AZ' + i, 'N.A.'), row));
  // rilievo fotografico: righe da due celle
  const pairs = []; for (let i = 0; i < Math.max(2, rep.length + rep.length % 2); i += 2) pairs.push([i, i + 1]);
  const cellsXml = [];
  for (const [a, b] of pairs) {
    const cs = [];
    for (const i of [a, b]) {
      const p = rep[i];
      if (p) { opt.onStep && opt.onStep(i + 1, rep.length); const im = await hsImage(p.id); cs.push({ p, n: i + 1, im }); } else cs.push(null);
    }
    cellsXml.push(cs);
  }
  x = hsCloneRows(x, 'FL', cellsXml, (row, cs) => {
    let t = row;
    (cs || [null, null]).forEach(c => {
      t = hsFill(t, 'FL', c ? 'Foto ' + c.n : '', true);
      if (c && c.im) {
        const maxCx = 2900000, maxCy = Math.round(maxCx * 0.78);
        t = t.replace(/<w:r>(?:(?!<w:r>)[\s\S])*?@@IMG@@[\s\S]*?<\/w:r>/, hsImgRun(ctx, hsAddMedia(ctx, c.im.u8, c.im.png), c.im.w, c.im.h, maxCx, maxCy));
      } else t = t.replace(/<w:r>(?:(?!<w:r>)[\s\S])*?@@IMG@@[\s\S]*?<\/w:r>/, '');
      t = c ? hsFillBlock(t, 'CAP', c.p.cap, B['cap.' + c.p.id], { grigio: g, lists: false }) : hsFill(t, 'CAP', '', true);
    });
    return t;
  });
  // foto di copertina: l'immagine del modello con testo alternativo @@COPERTINA@@
  const cov = (r.img || {}).copertina;
  const dm = x.match(/<w:drawing>(?:(?!<\/w:drawing>)[\s\S])*?descr="@@COPERTINA@@"[\s\S]*?<\/w:drawing>/);
  if (dm) {
    const rid = (dm[0].match(/r:embed="([^"]+)"/) || [])[1];
    if (cov && rid) {
      const im = await hsImage(cov, null, 6120715 / 4039737);
      if (im) {
        ctx.n++; const nome = 'nembo_cop_' + ctx.n + '.jpeg'; files['word/media/' + nome] = im.u8;
        ctx.rels = ctx.rels.replace(new RegExp('(<Relationship [^>]*Id="' + rid + '"[^>]*Target=")[^"]+(")'), '$1media/' + nome + '$2').replace(new RegExp('(<Relationship [^>]*Target=")[^"]+("[^>]*Id="' + rid + '")'), '$1media/' + nome + '$2');
      }
    }
    x = x.replace(dm[0], dm[0].replace(/\s*descr="@@COPERTINA@@"/, ''));
  }
  hsFinish(ctx, x, { NOME: r.sito, REVISIONE: m.revisione, EMISSIONE: emis });
  return hsZip(files);
}
async function hsBuildDocx(r, settings, opt) {
  const t = TEMPLATES[r.formato === 'sintetico' ? 'hs_sintetico.docx' : 'hs_esteso.docx'];
  const tpl = await DB.get(t.key);
  if (!tpl) throw new Error('carica prima il "' + t.label + '" in Impostazioni → Modelli');
  return r.formato === 'sintetico' ? hsBuildSintetico(r, settings, tpl, opt) : hsBuildEsteso(r, settings, tpl, opt);
}
// controllo del modello caricato
async function hsCheckTemplate(name, buf) {
  const f = await hsUnzip(buf);
  if (!f['word/document.xml']) throw new Error('il file non è un documento Word .docx');
  const x = hsHeal(dec8(f['word/document.xml']));
  if (name === 'hs_esteso.docx' && !/@@SCHEDE@@/.test(x)) throw new Error('non è il modello H&S Esteso (manca il segnaposto @@SCHEDE@@)');
  if (name === 'hs_sintetico.docx' && !/@@NT_0_1@@/.test(x)) throw new Error('non è il modello H&S Sintetico (mancano i segnaposto della checklist)');
}

/* ================= lettura del report dell'anno precedente =================
   Restituisce un oggetto con i campi della pratica; le immagini come Blob (le salva il chiamante).
   Tutto il testo letto diventa "base": nel nuovo Word esce in grigio finché non lo modifichi. */
const hsNorm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[’'`´]/g, '').replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const kidsW = (n, name) => [...(n.childNodes || [])].filter(c => c.nodeType === 1 && (!name || c.localName === name));
function walkW(node, fn) { kidsW(node).forEach(n => { if (n.localName === 'Fallback') return; fn(n); walkW(n, fn); }); }
function pText(p) { let o = ''; walkW(p, n => { if (n.localName === 't') o += n.textContent; else if (n.localName === 'tab') o += '\t'; else if (n.localName === 'br' && n.getAttribute('w:type') !== 'page') o += '\n'; }); return o; }
const isList = p => { const ppr = kidsW(p, 'pPr')[0]; const np = ppr && kidsW(ppr, 'numPr')[0]; if (!np) return null; const lv = kidsW(np, 'ilvl')[0]; return { lv: lv ? +lv.getAttribute('w:val') || 0 : 0 }; };
function cellLines(tc) {
  if (!tc) return '';
  return kidsW(tc, 'p').map(p => { const t = pText(p).replace(/ /g, ' ').trim().replace(/^\u2022\s*/, '- '); if (!t) return null; const li = isList(p); return li && !t.startsWith('- ') ? ' '.repeat(2 * li.lv) + '- ' + t : t; })
    .filter(x => x != null).join('\n').trim();
}
const rowsW = t => kidsW(t, 'tr');
const cellsW = tr => { const out = []; kidsW(tr).forEach(c => { if (c.localName === 'tc') out.push(c); else if (c.localName === 'sdt') kidsW(c, 'sdtContent').forEach(sc => kidsW(sc, 'tc').forEach(x => out.push(x))); }); return out; };
function hsImgCollector(files) {
  const relX = files['word/_rels/document.xml.rels'] ? dec8(files['word/_rels/document.xml.rels']) : '';
  const rel = {}; relX.replace(/<Relationship\b[^>]*>/g, t => { const id = (t.match(/Id="([^"]+)"/) || [])[1], tg = (t.match(/Target="([^"]+)"/) || [])[1]; if (id && tg) rel[id] = 'word/' + tg.replace(/^\.?\//, '').replace(/^word\//, ''); return t; });
  // immagini di un nodo, con dimensioni a video; scarta icone e loghetti
  return (node, all) => {
    const out = [], seen = {};
    walkW(node, n => {
      if (n.localName !== 'inline' && n.localName !== 'anchor') return;
      let cx = 0, cy = 0, rid = null;
      walkW(n, c => { if (!cx && c.localName === 'extent') { cx = +c.getAttribute('cx') || 0; cy = +c.getAttribute('cy') || 0; } if (!rid && c.localName === 'blip') rid = c.getAttribute('r:embed'); });
      const path = rid && rel[rid]; const u8 = path && files[path];
      if (!u8 || seen[rid]) return; seen[rid] = true;
      const ext = path.split('.').pop().toLowerCase();
      const type = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : null;
      if (!type) return;
      if (!all && (u8.length < 12000 || (cx > 0 && cx / CMx < 3 && cy / CMx < 3))) return;
      out.push({ blob: new Blob([u8], { type }), cx, cy });
    });
    return out;
  };
}
async function hsReadDocx(buf) {
  const files = await hsUnzip(buf);
  if (!files['word/document.xml']) throw new Error('documento Word non valido');
  const xml = dec8(files['word/document.xml']);
  const t = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toUpperCase();
  const sint = /CDP\s*65/.test(t) || (/FATTORE DI RISCHIO/.test(t) && /ANNOTAZIONI/.test(t));
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) throw new Error('struttura del documento non riconosciuta');
  return sint ? hsReadSintetico(files, doc, body) : hsReadEsteso(files, body);
}
function hsMatchScheda(testo) {
  const k = hsNorm(testo).replace(/^\d+(\s\d+)*\s/, '');
  if (!k) return null;
  let hit = HS_SCHEDE.find(s => hsNorm(s.l) === k);
  if (!hit && k.length > 4) hit = HS_SCHEDE.find(s => k.indexOf(hsNorm(s.l)) >= 0 || hsNorm(s.l).indexOf(k) >= 0);
  if (!hit && /^AGIBILITA/.test(k)) hit = HS_SCHEDE[0];
  if (!hit && /IMPIANTI DI SOLLEVAMENTO/.test(k)) hit = HS_SCHEDE[9];
  return hit || null;
}
function hsMatchSub(s, testo) {
  if (!s.subs) return null;
  const k = hsNorm(testo).replace(/^\d+(\s\d+)*\s/, '');
  return s.subs.find(sb => hsNorm(sb) === k) || s.subs.find(sb => { const n = hsNorm(sb); return Math.abs(n.length - k.length) <= 2 && (n.indexOf(k) === 0 || k.indexOf(n) === 0); }) || null;
}
function hsReadEsteso(files, body) {
  const imgs = hsImgCollector(files);
  const out = { formato: 'esteso', meta: {}, an: {}, schede: {}, foto: [], img: {}, visite: [], catFab: [], catTer: [], extraFoto: [] };
  HS_SCHEDE.forEach(s => out.schede[s.k] = hsEmptyScheda(s));
  const blocks = kidsW(body).filter(n => n.localName === 'p' || n.localName === 'tbl');
  let cur = null, sez = 'cop'; const testa = [], prime = [];
  const label = tbl => rowsW(tbl).map(r => hsNorm(cellLines(cellsW(r)[0])));
  for (const node of blocks) {
    if (node.localName === 'p') {
      const tx = pText(node).replace(/ /g, ' ').trim();
      if (sez !== 'foto') imgs(node).forEach(o => prime.push({ sez, ...o }));
      if (!tx) continue;
      const nk = hsNorm(tx);
      if (/DOCUMENTAZIONE FOTOGRAFICA/.test(nk)) { sez = 'foto'; cur = null; continue; }
      if (/^INQUADRAMENTO|\bINQUADRAMENTO$/.test(nk)) { sez = 'inq'; continue; }
      if (/RIFERIMENTI CATASTALI/.test(nk)) { sez = 'cat'; continue; }
      if (/RIEPILOGO SCHEDE/.test(nk)) { sez = 'fine'; cur = null; continue; }
      if (/SCOPO DEL LAVORO|ANAGRAFICA IMMOBILE/.test(nk)) { sez = 'testo'; cur = null; continue; }
      if (nk === 'SOMMARIO' || nk === 'SCHEDE') continue;
      const sc = tx.length < 90 && hsMatchScheda(tx);
      if (sc) { cur = sc; sez = 'schede'; continue; }
      if (sez === 'inq' && !/UBICAZIONE|FOTOGRAFIA AEREA/.test(nk)) out.inquadramento = (out.inquadramento ? out.inquadramento + '\n' : '') + tx;
      if (sez === 'cop' && testa.length < 4 && tx.length < 90 && !/REPORT H/i.test(tx)) testa.push(tx);
      continue;
    }
    const tbl = node, L = label(tbl), head = rowsW(tbl)[0] ? cellsW(rowsW(tbl)[0]).map(c => hsNorm(cellLines(c))) : [];
    if (rowsW(tbl).some(tr => cellsW(tr).some(c => /FOTOGRAFIA N/.test(hsNorm(cellLines(c)))))) {
      sez = 'foto'; let f = null;
      rowsW(tbl).forEach(tr => {
        const cs = cellsW(tr), testi = cs.map(cellLines), im = imgs(tr);
        const i = testi.findIndex(x => /FOTOGRAFIA N/.test(hsNorm(x)));
        if (i >= 0) { if (f) out.foto.push(f); const n = String(testi[i]).match(/(\d+)/); f = { blob: im[0] && im[0].blob, cap: '', data: (testi[i + 1] || '').trim(), riga: 0, ord: n ? +n[1] : 9999 }; return; }
        if (!f) return;
        if (im.length && !f.blob) f.blob = im[0].blob;
        const u = []; testi.forEach(x => { x = (x || '').trim(); if (x && u.indexOf(x) < 0) u.push(x); });
        const tt = u.join(' ').trim(); if (!tt) return;
        f.riga++; if (f.riga > 1) f.cap = (f.cap ? f.cap + ' ' : '') + tt;
      });
      if (f) out.foto.push(f);
      continue;
    }
    if (L.some(l => l.indexOf('PROPRIETA IMMOBILE') >= 0) || (L.some(l => l.indexOf('COMMITTENTE') >= 0) && L.some(l => l.indexOf('COMMESSA') >= 0))) {
      rowsW(tbl).forEach(tr => {
        const c = cellsW(tr); if (c.length < 2) return; const k = hsNorm(cellLines(c[0])), v = cellLines(c[1]);
        if (k.indexOf('PROPRIETA') >= 0) out.meta.proprieta = v; else if (k.indexOf('COMMITTENTE') >= 0) out.cliente = v;
        else if (k.indexOf('DATA REPORT') >= 0) out.dataReport = v; else if (k.indexOf('REDATTO') >= 0) out.meta.redatto = v;
        else if (k.indexOf('VERIFICATO') >= 0) out.meta.verificato = v; else if (k.indexOf('PROTOCOLLO') >= 0) out.meta.protocollo = v;
        else if (k.indexOf('COMMESSA') >= 0) out.commessa = v;
      });
      continue;
    }
    if (rowsW(tbl).length >= 5 && L.some(l => l.indexOf('INDIRIZZO IMMOBILE') >= 0 || l.indexOf('SUPERFICIE IMMOBILE') >= 0)) {
      const MAP = [['INDIRIZZO IMMOBILE', 'indirizzo'], ['SUPERFICIE', 'superficie'], ['ANNO DI COSTRUZIONE', 'anno'], ['DESTINAZIONE', 'destinazione'], ['STATO OCCUPAZIONALE', 'stato'],
        ['DESCRIZIONE SINTETICA', 'descrizione'], ['PARCHEGGI ESTERNI', 'parcheggiEst'], ['PARCHEGGI INTERNI', 'parcheggiInt'], ['AUTORIMESSE', 'autorimesse'], ['MANUTENZIONE ORDINARIA', 'manutOrd'],
        ['MANUTENZIONE STRAORDINARIA', 'manutStr'], ['ADEGUAMENTI', 'adeguamenti'], ['SISMICA', 'sismica'], ['FOTOVOLTAICO', 'fotovoltaico'], ['TENANT', 'tenant'], ['BAIE DI CARICO', 'baie']];
      rowsW(tbl).forEach(tr => {
        const c = cellsW(tr); if (c.length < 2) return; const k = hsNorm(cellLines(c[0])), v = cellLines(c[1]);
        const hit = MAP.find(([kk]) => k.indexOf(kk) >= 0); if (!hit) return;
        if (hit[1] === 'indirizzo') out.indirizzo = v; else if (hit[1] === 'superficie') out.meta.superficie = v; else out.an[hit[1]] = v;
      });
      continue;
    }
    if (head.some(h => h === 'FOGLIO') && head.some(h => h.indexOf('PARTICELLA') >= 0)) {
      rowsW(tbl).slice(1).forEach(tr => { const c = cellsW(tr).map(x => cellLines(x).trim()); if (c.some(Boolean)) out.catFab.push({ foglio: c[0] || '', particella: c[1] || '', sub: c[2] || '', categoria: c[3] || '' }); });
      continue;
    }
    if (head.some(h => h === 'FOGLIO') && head.some(h => h.indexOf('MAPPAL') >= 0)) {
      rowsW(tbl).slice(1).forEach(tr => { const c = cellsW(tr).map(x => cellLines(x).trim()); if (c.some(Boolean)) out.catTer.push({ foglio: c[0] || '', mappale: c[1] || '' }); });
      continue;
    }
    if (L.some(l => l === 'SOPRALLUOGHI') || (rowsW(tbl).length > 1 && L[0] === 'DATA')) {
      rowsW(tbl).forEach(tr => { const c = cellsW(tr); if (c.length < 2) return; const d = cellLines(c[0]), p = cellLines(c[1]); const k = hsNorm(d); if (k === 'DATA' || k === 'SOPRALLUOGHI' || (!d && !p)) return; out.visite.push({ data: d, presenti: p }); });
      continue;
    }
    if (L.some(l => l.indexOf('ASPETTI ESAMINATI') >= 0) || (head[0] === 'N' && head.some(h => h === 'SCHEDA'))) continue;
    if (cur && /SITUAZIONE RILEVATA/.test(L[0] || '')) {
      const d = out.schede[cur.k];
      rowsW(tbl).forEach(tr => {
        const c = cellsW(tr); if (c.length < 2) return; const k = hsNorm(cellLines(c[0]));
        if (k.indexOf('SITUAZIONE RILEVATA') >= 0) {
          if (cur.subs) {
            const res = Object.fromEntries(cur.subs.map(s => [s, []])); let sub = null; const pre = [];
            kidsW(c[1], 'p').forEach(p => {
              const raw = pText(p).replace(/ /g, ' ').trim().replace(/^\u2022\s*/, '- '); if (!raw) return;
              const m = !isList(p) && hsMatchSub(cur, raw); if (m) { sub = m; return; }
              const li = isList(p); const line = li && !raw.startsWith('- ') ? ' '.repeat(2 * li.lv) + '- ' + raw : raw;
              (sub ? res[sub] : pre).push(line);
            });
            if (pre.length) res[cur.subs[0]] = pre.concat(res[cur.subs[0]]);
            d.subs = Object.fromEntries(cur.subs.map(s => [s, res[s].join('\n').trim()]));
          } else d.sit = cellLines(c[1]);
          imgs(c[1]).forEach(o => out.extraFoto.push({ blob: o.blob, cap: cur.s || cur.l }));
        } else if (k.indexOf('ATTIVITA DI MIGLIORAMENTO') >= 0) {
          const v = cellLines(c[1]); d.mig = /^nessuna azione necessaria$/i.test(v) ? '' : v;
        }
      });
      continue;
    }
    if (cur && head.some(h => h === 'ID') && head.some(h => h.indexOf('NATURA DEL RISCHIO') >= 0)) {
      const dr = rowsW(tbl)[1]; if (!dr) continue;
      const vals = cellsW(dr).map(c => cellLines(c).trim()), d = out.schede[cur.k], nn = v => (v === '-' ? '' : v);
      head.forEach((h, i) => {
        const v = vals[i] || '';
        if (h === 'ID') d.idr = nn(v); else if (h.indexOf('NATURA') >= 0) d.natura = nn(v); else if (h.indexOf('COSTO') >= 0) d.costo = nn(v);
        else if (h.indexOf('PRIORITA') >= 0) { const n = parseInt(v, 10); d.prio = n >= 1 && n <= 3 ? n : null; }
        else if (h.indexOf('PROPRIETA') >= 0) d.cProp = /^SI$/i.test(v); else if (h.indexOf('CONDUTTORE') >= 0) d.cCond = /^SI$/i.test(v); else if (h.indexOf('TERMINE') >= 0) d.termine = nn(v);
      });
      continue;
    }
    imgs(tbl).forEach(o => prime.push({ sez, ...o }));
  }
  out.sito = testa[0] || ''; out.indirizzo = out.indirizzo || testa[1] || '';
  const mc = (out.indirizzo || '').match(/,\s*([^,(]+)\s*(\(|$)/); if (mc) out.citta = mc[1].trim();
  const cop = prime.filter(x => x.sez === 'cop').sort((a, b) => b.cx - a.cx), inq = prime.filter(x => x.sez === 'inq'), cat = prime.filter(x => x.sez === 'cat');
  if (cop[0]) out.img.copertina = cop[0].blob; if (cop[1]) out.img.firma = cop[1].blob;
  if (inq[0]) out.img.mappa = inq[0].blob; if (inq[1]) out.img.aerea = inq[1].blob;
  if (cat[0]) out.img.catasto1 = cat[0].blob; if (cat[1]) out.img.catasto2 = cat[1].blob;
  out.foto = out.foto.filter(f => f.blob).sort((a, b) => a.ord - b.ord);
  if (!HS_SCHEDE.some(s => hsSchedaFatta(out.schede[s.k]) || out.schede[s.k].natura)) throw new Error('nel documento non sono state riconosciute schede H&S');
  return out;
}
function hsReadSintetico(files, doc, body) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
  const imgs = hsImgCollector(files);
  const txt = n => { const ps = n.localName === 'p' ? [n] : [...n.getElementsByTagNameNS(W, 'p')]; return ps.map(p => pText(p).replace(/\t/g, ' ')).join('\n').replace(/[ \t]+\n/g, '\n').trim(); };
  const lines = c => [...c.getElementsByTagNameNS(W, 'p')].map(p => { const t = pText(p).replace(/ /g, ' ').trim().replace(/^\u2022\s*/, '- ').replace(/\t/g, ' '); if (!t) return null; return isList(p) && !t.startsWith('- ') ? '- ' + t : t; }).filter(x => x != null).join('\n').trim();
  const allT = [...body.getElementsByTagNameNS(W, 'tbl')];
  const out = { formato: 'sintetico', meta: {}, anS: HS_SINT_AN.map(() => ''), risp: {}, note: {}, descr: '', azioni: [], foto: [], img: {}, refFoto: {} };
  const risk = allT.filter(t => /fattore di rischio/i.test(txt(rowsW(t)[0] || t)));
  if (!risk.length) throw new Error('non sembra un report Sintetico (tabelle dei fattori di rischio non trovate)');
  risk.forEach((t, k) => {
    const cfg = HS_SINT_ITEMS[k]; if (!cfg) return;
    rowsW(t).slice(1).forEach((r, ri) => {
      const it = cfg.items[ri]; if (!it) return;
      const cbs = [...r.getElementsByTagNameNS(W14, 'checkbox')];
      cbs.slice(0, 3).forEach((cb, j) => { const ch = cb.getElementsByTagNameNS(W14, 'checked')[0]; const v = ch ? (ch.getAttributeNS(W14, 'val') || ch.getAttribute('w14:val')) : '0'; if (v === '1' || v === 'true') out.risp[it.id] = ['si', 'no', 'na'][j]; });
      const cs = cellsW(r);
      if (!cbs.length) [3, 4, 5].forEach((ci, j) => { if (cs[ci] && /[☒☑xX]/.test(txt(cs[ci]))) out.risp[it.id] = ['si', 'no', 'na'][j]; });
      if (!cs.length) return;
      let v = lines(cs[cs.length - 1]);
      // "ID Foto 1, 2" è generato dall'app: lo uso per ricollegare le foto alla voce
      v = v.split('\n').filter(l => { const m = l.match(/^ID Foto\s+([\d,\s]+)$/i); if (m) { m[1].split(/[,\s]+/).filter(Boolean).forEach(n => out.refFoto[+n] = it.id); return false; } return true; }).join('\n').trim();
      if (v && v !== 'Descrizione generica') out.note[it.id] = v;
    });
  });
  const an = allT.find(t => /^\s*indirizzo/i.test(txt(rowsW(t)[0] || t)));
  if (an) rowsW(an).forEach((r, i) => { if (i >= out.anS.length) return; const cs = cellsW(r); if (cs.length < 2) return; const v = lines(cs[cs.length - 1]); out.anS[i] = v === 'Nome/Cognome' ? '' : v; });
  const fr = allT.find(t => /commessa:/i.test(txt(rowsW(t)[0] || t)));
  if (fr) rowsW(fr).forEach(r => {
    const cs = cellsW(r); if (cs.length < 2) return;
    const lab = txt(cs[0]).toLowerCase(), v = txt(cs[cs.length - 1]).split('\n')[0].trim();
    if (lab.startsWith('commessa')) out.commessa = v; else if (lab.startsWith('committente')) out.cliente = v; else if (lab.startsWith('emissione')) out.meta.emissione = v;
    else if (lab.startsWith('revisione')) out.meta.revisione = v; else if (lab.startsWith('protocollo')) out.meta.protocollo = v; else if (lab.startsWith('redatto')) out.meta.redatto = v;
    else if (lab.startsWith('verificato')) out.meta.verificato = v; else if (lab.startsWith('approvato')) out.meta.approvato = v;
  });
  const tx = doc.getElementsByTagNameNS(W, 'txbxContent')[0];
  if (tx) out.meta.fondo = txt(tx).replace(/^FONDO\s*/i, '').replace(/\s+/g, ' ').trim();
  const cov = allT.find(t => { const R = rowsW(t); return R.length === 3 && R.every(r => cellsW(r).length === 1) && txt(R[0]); });
  if (cov) { const R = rowsW(cov); out.sito = txt(R[0]).replace(/\s+/g, ' '); out.indirizzo = txt(R[1]).replace(/\s+/g, ' '); }
  const paras = [...body.getElementsByTagNameNS(W, 'p')].filter(p => p.parentNode === body);
  const isHead = p => { const ppr = kidsW(p, 'pPr')[0]; if (!ppr) return false; if (kidsW(ppr, 'outlineLvl').length) return true; const ps = kidsW(ppr, 'pStyle')[0]; const v = ps ? ps.getAttribute('w:val') || '' : ''; return /heading|titolo/i.test(v) && !/sommario|toc/i.test(v); };
  const pageBr = p => [...p.getElementsByTagNameNS(W, 'br')].some(b => b.getAttribute('w:type') === 'page');
  const iCG = paras.findIndex(p => /^CONDIZIONI GENERALI DELL/i.test(txt(p)) && isHead(p));
  if (iCG >= 0) {
    const cg = [];
    for (let k = iCG + 1; k < paras.length; k++) { const p = paras[k]; if (isHead(p)) break; const t = pText(p).trim(); if (pageBr(p)) { if (t) cg.push(t); break; } if (t && t !== 'Breve descrizione') cg.push(isList(p) ? '- ' + t : t); }
    out.descr = cg.join('\n').trim();
  }
  const iF = paras.findIndex(p => /procuratore incaricato/i.test(txt(p)));
  if (iF >= 0 && paras[iF + 1]) { const t = txt(paras[iF + 1]); out.meta.firma = !t || t === 'Ing.' ? '' : t; }
  const dm = (out.anS[7] || '').match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (dm) out.data = dm[3] + '-' + dm[2].padStart(2, '0') + '-' + dm[1].padStart(2, '0');
  const az = allT.find(t => /situazione rilevata/i.test(txt(t)) && /rischio evidenziato/i.test(txt(t)));
  if (az) rowsW(az).slice(2).forEach(r => {
    const cs = cellsW(r); if (cs.length < 5) return;
    const v = cs.map(lines); if (v.every(x => !x || x === 'N.A.')) return;
    const a = { cod: v[0], sit: v[1], risk: v[2], grav: v[3], az: v[4] }; a.b = { ...a }; out.azioni.push(a);
  });
  const big = [...body.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing', 'extent')]
    .find(e => { const cx = +e.getAttribute('cx'), cy = +e.getAttribute('cy'); return cx > 5500000 && cy > 3500000 && cy < 4600000; });
  if (big) { const o = imgs(big.parentNode.parentNode, true)[0]; if (o) out.img.copertina = o.blob; }
  const ft = allT.filter(t => /^\s*foto\s*1\b/i.test(txt(t))).pop();
  if (ft) rowsW(ft).forEach(r => cellsW(r).forEach(c => {
    const o = imgs(c, true)[0]; if (!o) return;
    const n = (txt(c).match(/^\s*foto\s*(\d+)/i) || [])[1];
    const cap = lines(c).split('\n').filter(l => !/^\s*foto\s*\d+\s*$/i.test(l) && l.trim() !== 'Immettere la didascalia').join('\n').trim();
    out.foto.push({ blob: o.blob, cap, n: n ? +n : out.foto.length + 1 });
  }));
  return out;
}
// applica quanto letto (Word o JSON) a una pratica: i testi diventano la base grigia, le foto vanno in "precedente sopralluogo"
async function hsApplyImport(rec, d, onStep) {
  const save = async (blob, k, n) => { onStep && onStep(k, n); try { return await saveImage(blob); } catch (e) { return null; } };
  const r = JSON.parse(JSON.stringify(rec));
  r.formato = d.formato;
  ['commessa', 'cliente', 'sito', 'indirizzo', 'citta'].forEach(k => { if (d[k]) r[k] = d[k]; });
  if (d.fromJson && d.data) r.data = d.data;
  if (d.appunti && !r.appunti) r.appunti = d.appunti;
  Object.assign(r.meta, Object.fromEntries(Object.entries(d.meta || {}).filter(([, v]) => v)));
  const B = {};
  if (d.formato === 'esteso') {
    r.an = { ...r.an, ...d.an }; if (d.inquadramento) r.inquadramento = d.inquadramento;
    if ((d.catFab || []).length) r.catFab = d.catFab; if ((d.catTer || []).length) r.catTer = d.catTer;
    if ((d.visite || []).length) r.visite = d.visite;
    r.schede = JSON.parse(JSON.stringify(d.schede));
    HS_SCHEDE.forEach(s => { const x = r.schede[s.k]; if (s.subs) s.subs.forEach(sb => B['sch.' + s.k + '.' + sb] = x.subs[sb] || ''); else B['sch.' + s.k + '.sit'] = x.sit || ''; B['sch.' + s.k + '.mig'] = x.mig || ''; });
    B['an.descrizione'] = r.an.descrizione || ''; B.inquadramento = r.inquadramento || '';
  } else {
    const c = JSON.parse(JSON.stringify({ anS: d.anS, risp: d.risp, note: d.note, azioni: d.azioni }));
    r.anS = c.anS; r.risp = c.risp; r.note = c.note; r.descr = d.descr; r.azioni = c.azioni;
    r.anS.forEach((v, i) => B['an.' + i] = v); Object.entries(r.note).forEach(([k, v]) => B['nt.' + k] = v); B.descr = r.descr;
  }
  const tot = Object.keys(d.img || {}).length + (d.foto || []).length + (d.extraFoto || []).length; let k = 0;
  r.img = { ...r.img };
  for (const [key, blob] of Object.entries(d.img || {})) { const id = await save(blob, ++k, tot); if (id) r.img[key] = id; }
  const foto = [];
  for (const f of [...(d.foto || []), ...(d.extraFoto || [])].slice(0, HS_MAX_FOTO)) {
    const id = await save(f.blob, ++k, tot); if (!id) continue;
    const p = { id, cap: f.cap || '', inc: true, g: f.g || 'prev', ref: (d.refFoto || {})[f.n] || '', ts: '' };
    if (d.fromJson) { if (f.capBase != null) B['cap.' + id] = f.capBase; } else B['cap.' + id] = p.cap;
    foto.push(p);
  }
  r.foto = [...foto, ...(r.foto || []).filter(p => p.g !== 'prev')];
  r.base = d.baseMap ? Object.assign(d.baseMap, Object.fromEntries(Object.entries(B).filter(([k]) => k.startsWith('cap.')))) : B;
  return r;
}
// backup JSON della vecchia app H&S (entrambi i formati)
async function hsReadOldJson(o) {
  const fromUrl = async u => { try { return dataUriToBlob(u); } catch (e) { return null; } };
  if (o && o.site && o.site.meta && Array.isArray(o.site.an || [])) { // formato sintetico: dati in o.site
    const s = o.site, m = s.meta || {};
    const d = { formato: 'sintetico', meta: { fondo: m.fondo, emissione: m.emissione, revisione: m.revisione, protocollo: m.protocollo, redatto: m.redatto, verificato: m.verificato, approvato: m.approvato, firma: m.firma },
      sito: m.nome, indirizzo: m.indirizzo, commessa: m.commessa, cliente: m.committente, data: m.data,
      anS: HS_SINT_AN.map((_, i) => (s.an || [])[i] || ''), risp: s.risp || {}, note: s.note || {}, descr: s.descr || '',
      azioni: (s.azioni || []).map(a => ({ cod: a.cod || '', sit: a.sit || '', risk: a.risk || '', grav: a.grav || '', az: a.az || '', b: a.b || {} })), foto: [], img: {}, refFoto: {} };
    const sb = s.base || {}, B = {};
    (sb.an || []).forEach((v, i) => B['an.' + i] = v || ''); Object.entries(sb.note || {}).forEach(([k, v]) => B['nt.' + k] = v || ''); B.descr = sb.descr || '';
    d.baseMap = B; d.fromJson = true; d.capBase = sb.cap || {};
    if (m.coverPhoto) d.img.copertina = await fromUrl(m.coverPhoto);
    for (const [i, p] of (s.photos || []).entries()) if (p.dataUrl) { const b = await fromUrl(p.dataUrl); if (b) { d.foto.push({ blob: b, cap: p.caption || '', n: i + 1, g: p.gruppo === 'prev' ? 'prev' : 'new', capBase: (sb.cap || {})[p.id] }); if (p.ref) d.refFoto[i + 1] = p.ref; } }
    return d;
  }
  if (o && (o.app === 'sopralluogo-hs' || o.schede)) {
    const m = o.meta || {}, a = m.anagrafica || {};
    const d = { formato: 'esteso', meta: { proprieta: m.proprieta, redatto: m.redatto, verificato: m.verificato, protocollo: m.protocollo, revisione: m.revisione, presenti: m.presenti, superficie: m.superficie },
      sito: m.nomeSito, indirizzo: m.indirizzo, citta: m.comune, commessa: m.commessa, cliente: m.committente, data: m.data,
      an: Object.fromEntries(HS_AN_KEYS.map(([k]) => [k, a[k] || ''])), inquadramento: a.inquadramento || '', catFab: a.catastoFabbricati || [], catTer: a.catastoTerreni || [],
      visite: m.sopralluoghi || [], schede: {}, foto: [], img: {}, extraFoto: [] };
    HS_SCHEDE.forEach(s => {
      const x = (o.schede || {})[s.l] || {}; const e = hsEmptyScheda(s);
      if (s.subs) s.subs.forEach(sb => e.subs[sb] = (x.subs || {})[sb] || ''); else e.sit = x.situazione || '';
      Object.assign(e, { mig: x.miglioramento || '', natura: x.natura_rischio || '', costo: x.costo_indicativo || '', idr: x.idRischio || '', prio: x.priorita || null, cProp: !!x.comp_proprieta, cCond: !!x.comp_conduttore, termine: x.termine || '' });
      d.schede[s.k] = e;
    });
    const IMK = { coverPhoto: 'copertina', firmaPhoto: 'firma', mappaPhoto: 'mappa', inquadraPhoto: 'aerea', catastoPhoto: 'catasto1', catastoPhoto2: 'catasto2' };
    for (const [mk, k] of Object.entries(IMK)) if (m[mk]) d.img[k] = await fromUrl(m[mk]);
    for (const p of (o.foto || [])) if (p.dataUrl) { const b = await fromUrl(p.dataUrl); if (b) d.foto.push({ blob: b, cap: p.caption || '', g: p.gruppo === 'prev' ? 'prev' : 'new', capBase: p.gruppo === 'prev' ? p.caption || '' : undefined }); }
    if (o.taccuino && o.taccuino.testo) d.appunti = o.taccuino.testo;
    const B = {};
    HS_SCHEDE.forEach(sc => { const bb = ((o.schede || {})[sc.l] || {}).base || {}; if (sc.subs) sc.subs.forEach(sb => B['sch.' + sc.k + '.' + sb] = (bb.subs || {})[sb] || ''); else B['sch.' + sc.k + '.sit'] = bb.situazione || ''; B['sch.' + sc.k + '.mig'] = bb.miglioramento || ''; });
    d.baseMap = B; d.fromJson = true;
    return d;
  }
  throw new Error('il file JSON non è un backup dell\'app sopralluoghi H&S');
}
