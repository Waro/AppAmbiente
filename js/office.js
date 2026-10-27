/* File Office: scheda campioni in Excel (ExcelJS) e riepilogo campioni con foto in Word (docx). */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Finestra "Salva con nome" (lì si può scegliere OneDrive); se non c'è, va in Download.
// Va chiamata subito dopo il tocco, prima di preparare il file.
async function pickSave(name, desc, mime, ext) {
  if (!('showSaveFilePicker' in window)) return null;
  try { return await window.showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [mime]: [ext] } }] }); }
  catch (e) { return e.name === 'AbortError' ? 'cancel' : null; }
}
async function saveOffice(handle, blob, name) {
  if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); toast('Salvato: ' + handle.name); }
  else { downloadBlob(blob, name); toast(name + ' salvato in Download'); }
}

/* ---------------- schede di prelievo (campioni massivi e aria) dal modello aziendale ----------------
   Modello Excel (fogli MASSIVI e ARIA) e modello PDF (2 pagine) caricati in Impostazioni → Modelli: nel codice nessun dato aziendale.
   Laboratorio, offerta ed email per i referti sono sempre quelli delle Impostazioni. 30 righe per foglio: dal campione 31 un foglio in più. */
function schedaInfo(r, k, s) {
  return { commessa: r.commessa, sito: placeDoc(r), campioni: (r.campioni[k] || []).map(c => ({ ...c, descrizione: campDesc(c) })),
    analisi: k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc },
    lab: { nome: s.labNome, r1: s.labR1, r2: s.labR2 }, offerta: s.offerta, offertaRev: s.offertaRev, email: s.emailReferti,
    prelevatoDa: s.prelevatoDa, verificatoDa: s.verificatoDa };
}
async function schedaCampioniPdfBytes(r, k, s) {
  const tpl = await loadTemplate('scheda_campioni.pdf'); const info = schedaInfo(r, k, s);
  return (await PdfGen.isSchedeV46(tpl)) ? PdfGen.schedePdf(tpl, 'massivi', info) : PdfGen.schedaCampioniPdf(tpl, info);
}
const xEsc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const xAttr = (tag, a) => { const m = tag.match(new RegExp('\\s' + a.replace(':', '\\:') + '="([^"]*)"')); return m ? m[1] : null; };
// kind: 'massivi' | 'aria'; info come per il PDF (schedaInfo / ariaInfo)
async function schedeXlsx(tplBuf, kind, info) {
  const zip = await JSZip.loadAsync(tplBuf);
  const rd = async n => { const f = zip.file(n); return f ? f.async('string') : null; };
  const norm = t => t.replace(/^\//, '').replace(/^(?!xl\/)/, 'xl/');
  let wb = await rd('xl/workbook.xml'), wbRels = await rd('xl/_rels/workbook.xml.rels'), ct = await rd('[Content_Types].xml');
  const want = kind === 'aria' ? 'ARIA' : 'MASSIVI';
  const sheets = [...wb.matchAll(/<sheet\b[^>]*\/>/g)].map(m => ({ name: xAttr(m[0], 'name'), rid: xAttr(m[0], 'r:id') }));
  const relOf = id => { const m = [...wbRels.matchAll(/<Relationship\b[^>]*\/>/g)].map(x => x[0]).find(t => xAttr(t, 'Id') === id); return m ? norm(xAttr(m, 'Target')) : null; };
  const sh = sheets.find(x => (x.name || '').toUpperCase().includes(want));
  if (!sh) throw new Error('nel modello Excel manca il foglio ' + want);
  const srcPath = relOf(sh.rid), srcRelsPath = srcPath.replace(/([^/]+)$/, '_rels/$1.rels');
  const src = await rd(srcPath), srcRels = await rd(srcRelsPath);
  const sst = await rd('xl/sharedStrings.xml');
  const strs = sst ? [...sst.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')) : [];
  const cellRe = ref => new RegExp('<c r="' + ref + '"(?:\\s[^>]*)?(?:/>|>[\\s\\S]*?</c>)');
  const textOf = (x, ref) => { const m = x.match(cellRe(ref)); if (!m) return '';
    if (/t="s"/.test(m[0])) { const v = m[0].match(/<v>(\d+)<\/v>/); return v ? strs[+v[1]] || '' : ''; }
    return [...m[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); };
  const set = (x, ref, v, num) => { const m = x.match(cellRe(ref)); if (!m) return x; const st = xAttr(m[0].match(/<c\b[^>]*>/)[0], 's');
    const sA = st != null ? ` s="${st}"` : '';
    const cell = v == null || v === '' ? `<c r="${ref}"${sA}/>` : num ? `<c r="${ref}"${sA}><v>${+v}</v></c>` : `<c r="${ref}"${sA} t="inlineStr"><is><t xml:space="preserve">${xEsc(v)}</t></is></c>`;
    return x.replace(m[0], cell); };
  // righe: intestazione con «#» in colonna B; dati = righe successive con lo stesso stile della prima; firme = cella con «PRELEVATO»
  const rowsB = [...src.matchAll(/<c r="B(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g)].map(m => ({ n: +m[1], tag: m[0] }));
  const head = rowsB.find(x => textOf(src, 'B' + x.n).trim() === '#'); if (!head) throw new Error('nel modello Excel non trovo la riga di intestazione «#»');
  const st0 = xAttr(rowsB.find(x => x.n === head.n + 1).tag.match(/<c\b[^>]*>/)[0], 's');
  const dataRows = []; for (const x of rowsB.filter(y => y.n > head.n)) { if (xAttr(x.tag.match(/<c\b[^>]*>/)[0], 's') !== st0) break; dataRows.push(x.n); }
  const sig = rowsB.find(x => /PRELEVATO/i.test(textOf(src, 'B' + x.n)));
  const items = kind === 'aria' ? (info.prelievi || []) : (info.campioni || []);
  const per = dataRows.length, nPages = Math.max(1, Math.ceil(items.length / per));
  const lab = typeof info.lab === 'string' ? info.lab : [info.lab.nome, info.lab.r1, info.lab.r2].filter(Boolean).join('\n');
  const off = info.offertaRev !== undefined ? [info.offerta, info.offertaRev].filter(Boolean).join('\n') : String(info.offerta || '').replace(' - ', '\n');
  const an = info.analisi || {};
  const b8 = textOf(src, 'B8'); const b8a = b8.includes('\n') ? b8.slice(0, b8.indexOf('\n')) : b8;
  const fd = d => d ? d.split('-').reverse().join('/') : '';
  const pageXml = p => {
    let x = src;
    x = set(x, 'E5', kind === 'aria' ? [info.commessa, info.cliente].filter(Boolean).join(' · ') : info.commessa);
    x = set(x, 'E6', info.sito); x = set(x, 'B8', b8a + '\n' + (info.email || '')); x = set(x, 'E10', lab); x = set(x, 'H10', off);
    if (sig) x = set(x, 'B' + sig.n, textOf(src, 'B' + sig.n).split('\n').map(l => { const t = l.trim(); if (!t) return t;
      const v = /TARATURA/i.test(t) ? info.taratura : /PRELEVATO/i.test(t) ? info.prelevatoDa : /VERIFICATO/i.test(t) ? info.verificatoDa : ''; return t + (v ? ' ' + v : ''); }).join('\n'));
    dataRows.forEach((n, i) => { const it = items[p * per + i]; if (!it) return;
      x = set(x, 'B' + n, it.codice || ''); x = set(x, 'C' + n, fd(it.data));
      if (kind === 'aria') { x = set(x, 'D' + n, String(it.postazione || '').replace(/\n/g, ' - ')); x = set(x, 'E' + n, it.campionatore || '');
        x = set(x, 'F' + n, it.volume, it.volume != null); x = set(x, 'G' + n, it.flusso, it.flusso != null); x = set(x, 'H' + n, it.analisi || ''); }
      else { x = set(x, 'D' + n, it.descrizione || ''); x = set(x, 'H' + n, (an.codice || '') + (an.desc ? ' (' + an.desc + ')' : '')); } });
    x = x.replace(/(<oddFooter>[\s\S]*?)&amp;P di &amp;N/, `$1${p + 1} di ${nPages}`);
    return x;
  };
  // tolgo tutti i fogli del modello e metto le pagine del foglio scelto
  const oldSheets = sheets.map(x => relOf(x.rid)).filter(Boolean);
  for (const pth of oldSheets) { zip.remove(pth); zip.remove(pth.replace(/([^/]+)$/, '_rels/$1.rels')); ct = ct.replace(new RegExp('<Override PartName="/' + pth.replace(/\./g, '\\.') + '"[^>]*/>'), ''); }
  if (zip.file('xl/calcChain.xml')) { zip.remove('xl/calcChain.xml'); ct = ct.replace(/<Override PartName="\/xl\/calcChain\.xml"[^>]*\/>/, ''); wbRels = wbRels.replace(/<Relationship\b[^>]*calcChain[^>]*\/>/, ''); }
  wbRels = wbRels.replace(/<Relationship\b[^>]*relationships\/worksheet"[^>]*\/>/g, '');
  const pa = (wb.match(new RegExp('<definedName name="_xlnm.Print_Area" localSheetId="' + sheets.indexOf(sh) + '">([^<]*)</definedName>')) || [])[1];
  const names = [], defs = [], vmlOld = new Set();
  for (let p = 0; p < nPages; p++) {
    const nm = nPages > 1 ? `${want} ${p + 1}` : want, file = `xl/worksheets/nembo${p + 1}.xml`;
    zip.file(file, pageXml(p));
    if (srcRels) {
      let rr = srcRels;
      for (const t of [...srcRels.matchAll(/<Relationship\b[^>]*vmlDrawing"[^>]*\/>/g)].map(m => m[0])) {
        const tg = xAttr(t, 'Target'), from = 'xl/' + tg.replace(/^\.\.\//, ''), to = from.replace(/(\.vml)$/, `_n${p + 1}$1`);
        const vml = await rd(from); if (vml) zip.file(to, vml.replace(/data="\d+"/, `data="${p + 1}"`).replace(/_x0000_s\d+/, `_x0000_s${(p + 1) * 1024 + 1}`));
        vmlOld.add(from);
        const vr = await rd(from.replace(/([^/]+)$/, '_rels/$1.rels')); if (vr) zip.file(to.replace(/([^/]+)$/, '_rels/$1.rels'), vr);
        rr = rr.replace(t, t.replace(tg, '../' + to.slice(3)));
      }
      zip.file(`xl/worksheets/_rels/nembo${p + 1}.xml.rels`, rr);
    }
    ct = ct.replace('</Types>', `<Override PartName="/${file}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
    wbRels = wbRels.replace('</Relationships>', `<Relationship Id="rIdN${p + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/nembo${p + 1}.xml"/></Relationships>`);
    names.push(`<sheet name="${xEsc(nm)}" sheetId="${p + 1}" state="visible" r:id="rIdN${p + 1}"/>`);
    if (pa) defs.push(`<definedName name="_xlnm.Print_Area" localSheetId="${p}">${pa.replace(/^'?[^'!]+'?!/, `'${xEsc(nm)}'!`)}</definedName>`);
  }
  wb = wb.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets>${names.join('')}</sheets>`).replace(/<definedNames>[\s\S]*?<\/definedNames>/, '')
    .replace('</sheets>', '</sheets>' + (defs.length ? `<definedNames>${defs.join('')}</definedNames>` : '')).replace(/activeTab="\d+"/, 'activeTab="0"').replace(/firstSheet="\d+"/, 'firstSheet="0"');
  if (!/xmlns:r=/.test(wb.slice(0, 400))) wb = wb.replace('<workbook ', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  for (const f of zip.file(/^xl\/drawings\/vmlDrawing[^/]*\.vml$/)) if (!/_n\d+\.vml$/.test(f.name)) { zip.remove(f.name); zip.remove(f.name.replace(/([^/]+)$/, '_rels/$1.rels')); }
  zip.file('xl/workbook.xml', wb); zip.file('xl/_rels/workbook.xml.rels', wbRels); zip.file('[Content_Types].xml', ct);
  if (zip.file('docProps/app.xml')) zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>');
  return zip.generateAsync({ type: 'blob', mimeType: XLSX_MIME, compression: 'DEFLATE' });
}
async function schedaTplXlsx() { const b = await DB.get(TEMPLATES['scheda_campioni.xlsx'].key); return b ? new Uint8Array(b) : null; }

/* ---------------- Excel: scheda campioni ---------------- */
async function schedaCampioniXlsx(r, k, s) {
  const tpl = await schedaTplXlsx(); if (tpl) return schedeXlsx(tpl, 'massivi', schedaInfo(r, k, s));
  await needLib('exceljs');
  const list = r.campioni[k] || [];
  const an = k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc };
  const wb = new ExcelJS.Workbook(); wb.creator = 'Nembo'; wb.created = new Date();
  const ws = wb.addWorksheet('Scheda campioni ' + k.toUpperCase(), { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } } });
  const hasQ = false; // la quantità va solo nei riepiloghi (Word ed email)
  ws.columns = hasQ ? [{ width: 8 }, { width: 14 }, { width: 46 }, { width: 14 }, { width: 28 }] : [{ width: 8 }, { width: 16 }, { width: 56 }, { width: 30 }];
  const lastCol = hasQ ? 5 : 4;
  const thin = { style: 'thin', color: { argb: 'FF000000' } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const grey = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  const row = (vals, opt = {}) => { const x = ws.addRow(vals); x.height = opt.h || 18; return x; };

  let x = row(['SCHEDA DI PRELIEVO: CAMPIONI MASSIVI'], { h: 26 }); ws.mergeCells(x.number, 1, x.number, lastCol);
  x.getCell(1).font = { bold: true, size: 14 }; x.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  row([]);
  const head = (label, value) => {
    const y = row([label, '', value], { h: 22 }); ws.mergeCells(y.number, 1, y.number, 2); ws.mergeCells(y.number, 3, y.number, lastCol);
    y.getCell(1).font = { bold: true, size: 10 }; y.getCell(1).fill = grey; y.getCell(3).font = { bold: true, size: 11 };
    [1, 3].forEach(c => { y.getCell(c).border = box; y.getCell(c).alignment = { vertical: 'middle', wrapText: true }; });
  };
  head('COMMESSA - PROGETTO', r.commessa || '');
  head('SITO', placeDoc(r));
  head('REFERTI A', s.emailReferti || '');
  head('LABORATORIO', [s.labNome, s.labR1, s.labR2].filter(Boolean).join(', '));
  head('OFFERTA', [s.offerta, s.offertaRev].filter(Boolean).join(' - '));
  row([]);
  const headers = hasQ ? ['#', 'Data prelievo', 'Descrizione campione', 'Quantità', 'Tipologia analisi richiesta'] : ['#', 'Data prelievo', 'Descrizione campione', 'Tipologia analisi richiesta'];
  x = row(headers, { h: 30 });
  x.eachCell(c => { c.font = { bold: true, italic: true, size: 10 }; c.fill = grey; c.border = box; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const c of list) {
    const d = c.data ? new Date(c.data + 'T12:00:00') : null;
    const vals = hasQ ? [c.codice || '', d, campDesc(c), c.quantita || '', `${an.codice || ''}${an.desc ? ' (' + an.desc + ')' : ''}`]
      : [c.codice || '', d, campDesc(c), `${an.codice || ''}${an.desc ? ' (' + an.desc + ')' : ''}`];
    x = row(vals, { h: 30 });
    x.getCell(1).font = { bold: true }; x.getCell(2).numFmt = 'dd/mm/yyyy';
    x.eachCell({ includeEmpty: true }, (cell, n) => { cell.border = box; cell.alignment = { vertical: 'middle', wrapText: true, horizontal: n <= 2 ? 'center' : 'left' }; });
  }
  row([]);
  x = row(['PRELEVATO DA: ' + (s.prelevatoDa || '')]); ws.mergeCells(x.number, 1, x.number, lastCol); x.getCell(1).font = { bold: true, size: 10 };
  x = row(['VERIFICATO DA: ' + (s.verificatoDa || '')]); ws.mergeCells(x.number, 1, x.number, lastCol); x.getCell(1).font = { bold: true, size: 10 };
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: XLSX_MIME });
}

/* ---------------- Word: riepilogo campioni ---------------- */
// foto ridotte per contenere il peso del documento
async function photoForDoc(id, maxSide = 1100) {
  const b = await DB.getBlob(id); if (!b) return null;
  const bmp = await createImageBitmap(b.blob);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const out = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.8));
  return { data: new Uint8Array(await out.arrayBuffer()), w: c.width, h: c.height };
}

async function riepilogoCampioniDocx(r, s) {
  await needLib('docx');
  const D = window.docx;
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, BorderStyle, ShadingType, HeadingLevel, Footer, PageNumber, VerticalAlign } = D;
  const txt = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Calibri', size: o.size || 20, bold: o.bold, color: o.color, italics: o.italics });
  const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 80, before: o.before ?? 0 }, alignment: o.align, keepNext: o.keepNext });
  const line = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const W = 9638; // larghezza utile A4 con margini 2 cm, in twip

  const info = [['Commessa', r.commessa], ['Cliente', r.cliente], ['Sito', placeDoc(r)], ['Data sopralluogo', fmtD(r.data)], ['Tecnico', r.tecnico]].filter(([, v]) => v);
  const infoTable = new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [2400, W - 2400],
    rows: info.map(([a, b]) => new TableRow({ children: [
      new TableCell({ width: { size: 2400, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' }, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(txt(a, { bold: true }), { after: 0 })] }),
      new TableCell({ width: { size: W - 2400, type: WidthType.DXA }, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, children: [p(txt(b), { after: 0 })] }),
    ] })),
  });

  const body = [
    p(txt('Riepilogo campioni', { size: 36, bold: true }), { after: 120 }),
    infoTable,
  ];
  // colonne: ID (stretta) · Descrizione (elastica) · Fotografia (larghezza fissa per le miniature)
  const colId = 1500, colFoto = 2500, colDesc = W - colId - colFoto;
  const cellHead = (t, w) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' }, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: VerticalAlign.CENTER, children: [p(txt(t, { bold: true, size: 18 }), { after: 0 })] });
  let tot = 0;
  const NC = ncOf(r);
  const gruppi = [...MATS.map(m => ({ m, list: r.campioni[m.k] || [], titolo: `${m.l} · ${(r.campioni[m.k] || []).length} ${(r.campioni[m.k] || []).length === 1 ? 'campione' : 'campioni'}` })),
    { m: { l: 'NC', h: PRINT.nc }, nc: true, list: NC, titolo: `Manufatti non campionati · ${NC.length}` }];
  for (const { m, list, titolo, nc } of gruppi) {
    if (!list.length) continue;
    tot += list.length;
    body.push(p(txt(titolo, { size: 28, bold: true, color: m.h.slice(1) }), { before: 320, after: 120, keepNext: true }));
    const rows = [new TableRow({ tableHeader: true, cantSplit: true, children: [cellHead(nc ? 'ID' : 'ID campione', colId), cellHead('Descrizione (ubicazione e tipologia manufatto)', colDesc), cellHead('Fotografia', colFoto)] })];
    for (const c of list) {
      const photos = [];
      for (const id of c.foto || []) { const ph = await photoForDoc(id); if (ph) photos.push(ph); }
      const idCell = new TableCell({ width: { size: colId, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [p(txt(c.codice || '—', { bold: true }), { after: c.data ? 40 : 0 }), ...(c.data ? [p(txt(fmtD(c.data), { size: 16, color: '595959' }), { after: 0 })] : [])] });
      const descRuns = [txt(campDesc(c) || 'Descrizione non indicata')];
      const rc = nc ? ncRif(r, c) : '';
      const extra = [nc ? (MATS.find(y => y.k === c.k) || {}).l : '', c.tipo ? 'Tipo: ' + c.tipo : '', c.quantita ? 'Quantità: ' + c.quantita : '', rc ? 'Come campione ' + rc : ''].filter(Boolean).join('  ·  ');
      const descCell = new TableCell({ width: { size: colDesc, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [p(descRuns, { after: extra ? 40 : 0 }), ...(extra ? [p(txt(extra, { italics: true, size: 18, color: '595959' }), { after: 0 })] : [])] });
      // più foto per lo stesso campione: impilate nella stessa cella, larghezza fissa (~3,5 cm)
      const imgW = 200;
      const fotoCell = new TableCell({ width: { size: colFoto, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 60, bottom: 60, left: 60, right: 60 },
        children: photos.length
          ? photos.map((ph, i) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: i < photos.length - 1 ? 60 : 0 }, children: [new ImageRun({ data: ph.data, transformation: { width: imgW, height: Math.round(imgW * ph.h / ph.w) } })] }))
          : [p(txt('Nessuna foto', { italics: true, color: '7F7F7F', size: 16 }), { after: 0, align: AlignmentType.CENTER })] });
      rows.push(new TableRow({ cantSplit: false, children: [idCell, descCell, fotoCell] }));
    }
    body.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [colId, colDesc, colFoto], rows }));
  }
  if (!tot) body.push(p(txt('Nessun campione prelevato.', { italics: true }), { before: 200 }));

  const doc = new Document({
    creator: s.prelevatoDa || r.tecnico || 'Nembo', title: 'Riepilogo campioni ' + (r.commessa || r.codice),
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [txt(`${r.codice} · Riepilogo campioni · pag. `, { size: 16, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '7F7F7F', font: 'Calibri' })] })] }) },
      children: body,
    }],
  });
  return Packer.toBlob(doc);
}
