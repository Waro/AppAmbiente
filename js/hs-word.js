/* Sopralluoghi HSE — motore Word: compilazione dei modelli caricati dall'utente. Nessun testo aziendale: tutto è nei modelli .docx.
   Struttura dei formati e modello dell'attività in js/hs-data.js; lettura dei report precedenti in js/hs-leggi.js. */

/* ---------------- confronto con il report precedente ----------------
   Le righe già presenti nel report importato restano in NERO (colore del modello), quelle nuove o modificate escono in ROSSO.
   Senza report precedente (nessuna base) non c'è confronto: tutto resta nero. */
const HS_ROSSO = 'FF0000';
const hsHasBase = r => !!(r && r.base && Object.values(r.base).some(v => String(v || '').trim()));
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
  await needLib('jszip');
  const z = await JSZip.loadAsync(buf); const files = {};
  for (const n of Object.keys(z.files)) if (!z.files[n].dir) files[n] = await z.files[n].async('uint8array');
  return files;
}
async function hsZip(files) {
  await needLib('jszip');
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
// testo su più paragrafi al posto del segnaposto: righe nuove rosse, vecchie nere, "- " = elenco
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
    const rp = hsRpr(p.rpr, !L.old && opt.grigio !== false ? HS_ROSSO : null);
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
// testo di una scheda: righe nuove rosse, dell'anno precedente nere; "- " diventa elenco
function wBody(text, base, grigio, o = {}) {
  const lines = grigio ? hsDiff(text, base) : String(text || '').split('\n').map(t => ({ t, old: false }));
  let out = '', buf = null;
  const red = L => grigio && !L.old ? { color: HS_ROSSO } : {};
  const flush = () => { if (buf && buf.r.length) out += wP(buf.r.join('\n'), Object.assign({ before: 60, after: 60, align: 'both' }, o, red(buf))); buf = null; };
  lines.forEach(L => {
    const m = L.t.match(/^([ \t]*)[-•*]\s+(.*)$/);
    if (m) { flush(); const lv = Math.min(3, Math.floor(m[1].replace(/\t/g, '    ').length / 4)); out += wP('•\t' + m[2], Object.assign({ before: 30, after: 30, align: 'both', ind: 600 + lv * 360 }, o, red(L))); }
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
  // «ID Foto 3, 4» sotto il testo della sezione con le foto collegate (numeri del rilievo fotografico); rosso se c'è una foto nuova
  const rep = hsFotoReport(r);
  const idFoto = ref => {
    const nums = [], nuove = [];
    rep.forEach((p, i) => { if (p.ref === ref) { nums.push(i + 1); if (p.g !== 'prev') nuove.push(i + 1); } });
    return nums.length ? wP('ID Foto ' + nums.join(', '), Object.assign({ before: 60, after: 60, align: 'both', b: true }, grigio && nuove.length ? { color: HS_ROSSO } : {})) : '';
  };
  HS_SCHEDE.forEach((s, i) => {
    const d = r.schede[s.k] || hsEmptyScheda(s);
    doc += wBreak();
    doc += wP((s.t || s.l).toUpperCase(), { style: 'Titolo2', sz: 24, b: true });
    doc += wEmpty();
    let sit = '';
    if (s.subs && (d.sit || '').trim()) sit += wBody(d.sit, B['sch.' + s.k + '.sit'], grigio) + idFoto('sch.' + s.k);
    if (s.subs) s.subs.forEach(sub => { sit += wP(sub.toUpperCase(), { style: 'Titolo3', sz: 22, align: 'both' }); sit += wBody((d.subs || {})[sub], B['sch.' + s.k + '.' + sub], grigio) + idFoto('sch.' + s.k + '.' + sub); });
    else sit = wBody(d.sit, B['sch.' + s.k + '.sit'], grigio) + idFoto('sch.' + s.k);
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
  const ctx = hsCtx(files); ctx.grigio = opt.grigio !== false && hsHasBase(r);
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
  const ctx = hsCtx(files); const g = opt.grigio !== false && hsHasBase(r); ctx.grigio = g;
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
  { const i = x.indexOf('@@DESCR@@'), e = i < 0 ? -1 : x.indexOf('</w:p>', i); if (e > 0) x = x.slice(0, e + 6) + '<w:p><w:r><w:t>@@CGFOTO@@</w:t></w:r></w:p>' + x.slice(e + 6); }
  x = hsFillBlock(x, 'DESCR', r.descr, B.descr, { grigio: g });
  { // foto di inquadramento sotto il capitolo 8, con le dimensioni che avevano nel report
    let ps = '';
    for (const o of (r.cgFoto || [])) {
      const im = await hsImage(o.id); if (!im) continue;
      const w = Math.min(o.w || 16, 16.5), h = Math.min(o.h || 11, 23);
      ps += '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/></w:pPr>' + hsImgRun(ctx, hsAddMedia(ctx, im.u8, im.png), im.w, im.h, Math.round(w * CMx), Math.round(h * CMx)) + '</w:p>';
    }
    x = x.replace('<w:p><w:r><w:t>@@CGFOTO@@</w:t></w:r></w:p>', ps);
  }
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
  if (r.aNote) r = hsNoteAOld(r); // sopralluogo a note: si compila come un report del formato scelto
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
  if (name === 'hs_esteso.docx' && !/@@SCHEDE@@/.test(x)) throw new Error('non è il modello HSE Esteso (manca il segnaposto @@SCHEDE@@)');
  if (name === 'hs_sintetico.docx' && !/@@NT_0_1@@/.test(x)) throw new Error('non è il modello HSE Sintetico (mancano i segnaposto della checklist)');
  if (name === 'vs.docx' && !/@@S_TITOLO@@/.test(x)) throw new Error('non è il modello del Verbale HSE (manca il segnaposto @@S_TITOLO@@)');
}
