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

/* ---------------- Excel: scheda campioni ---------------- */
async function schedaCampioniXlsx(r, k, s) {
  const list = r.campioni[k] || [];
  const an = k === 'mca' ? { codice: s.mcaCodice, desc: s.mcaDesc } : { codice: s.favCodice, desc: s.favDesc };
  const wb = new ExcelJS.Workbook(); wb.creator = 'Nembo'; wb.created = new Date();
  const ws = wb.addWorksheet('Scheda campioni ' + k.toUpperCase(), { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } } });
  const hasQ = (k === 'mca' || k === 'fav') && list.some(c => c.quantita);
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
  head('SITO', r.sito || '');
  head('REFERTI A', s.emailReferti || '');
  head('LABORATORIO', [s.labNome, s.labR1, s.labR2].filter(Boolean).join(', '));
  head('OFFERTA', [s.offerta, s.offertaRev].filter(Boolean).join(' - '));
  row([]);
  const headers = hasQ ? ['#', 'Data prelievo', 'Descrizione campione', 'Quantità', 'Tipologia analisi richiesta'] : ['#', 'Data prelievo', 'Descrizione campione', 'Tipologia analisi richiesta'];
  x = row(headers, { h: 30 });
  x.eachCell(c => { c.font = { bold: true, italic: true, size: 10 }; c.fill = grey; c.border = box; c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; });
  for (const c of list) {
    const d = c.data ? new Date(c.data + 'T12:00:00') : null;
    const vals = hasQ ? [c.codice || '', d, c.descrizione || '', c.quantita || '', `${an.codice || ''}${an.desc ? ' (' + an.desc + ')' : ''}`]
      : [c.codice || '', d, c.descrizione || '', `${an.codice || ''}${an.desc ? ' (' + an.desc + ')' : ''}`];
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
  const D = window.docx;
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, BorderStyle, ShadingType, HeadingLevel, Footer, PageNumber, VerticalAlign } = D;
  const txt = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Calibri', size: o.size || 20, bold: o.bold, color: o.color, italics: o.italics });
  const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 80, before: o.before ?? 0 }, alignment: o.align, keepNext: o.keepNext });
  const line = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const W = 9638; // larghezza utile A4 con margini 2 cm, in twip

  const info = [['Commessa', r.commessa], ['Cliente', r.cliente], ['Sito', r.sito], ['Data sopralluogo', fmtD(r.data)], ['Tecnico', r.tecnico]].filter(([, v]) => v);
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
  for (const m of MATS) {
    const list = r.campioni[m.k] || []; if (!list.length) continue;
    tot += list.length;
    body.push(p(txt(`${m.l} · ${list.length} ${list.length === 1 ? 'campione' : 'campioni'}`, { size: 28, bold: true, color: m.h.slice(1) }), { before: 320, after: 120, keepNext: true }));
    const rows = [new TableRow({ tableHeader: true, cantSplit: true, children: [cellHead('ID campione', colId), cellHead('Descrizione (ubicazione e tipologia manufatto)', colDesc), cellHead('Fotografia', colFoto)] })];
    for (const c of list) {
      const photos = [];
      for (const id of c.foto || []) { const ph = await photoForDoc(id); if (ph) photos.push(ph); }
      const idCell = new TableCell({ width: { size: colId, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: line, bottom: line, left: line, right: line }, margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [p(txt(c.codice || '—', { bold: true }), { after: c.data ? 40 : 0 }), ...(c.data ? [p(txt(fmtD(c.data), { size: 16, color: '595959' }), { after: 0 })] : [])] });
      const descRuns = [txt(c.descrizione || 'Descrizione non indicata')];
      const extra = [c.tipo ? 'Tipo: ' + c.tipo : '', c.quantita ? 'Quantità: ' + c.quantita : ''].filter(Boolean).join('  ·  ');
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
