/* Generazione PDF: scheda raccolta dati radon e scheda campioni, compilate sui modelli caricati dall'utente.
   Funziona nel browser (window.PDFLib) e in Node (require('pdf-lib')) per i test. */
(function (root) {
  const RADON_ROWS = [{"f1":"Fase 1","f2":"Fase 2","piano":"Testo3","ubic":"Testo23","accesso":{"si":"Check Box2","no":"Check Box3"},"apertura":{"si":"Check Box8","no":"Check Box9"},"clima":{"si":"Check Box14","no":"Check Box15"},"y1":634.3,"y2":662.6},{"f1":"Fase 1_2","f2":"Fase 2_2","piano":"Testo4","ubic":"Testo24","accesso":{"si":"Check Box4","no":"Check Box5"},"apertura":{"si":"Check Box10","no":"Check Box11"},"clima":{"si":"Check Box16","no":"Check Box17"},"y1":604.5,"y2":632.8},{"f1":"Fase 1_3","f2":"Fase 2_3","piano":"Testo5","ubic":"Testo25","accesso":{"si":"Check Box6","no":"Check Box7"},"apertura":{"si":"Check Box12","no":"Check Box13"},"clima":{"si":"Check Box18","no":"Check Box19"},"y1":574.7,"y2":603.0},{"f1":"Fase 1_4","f2":"Fase 2_4","piano":"Testo6","ubic":"Testo26","accesso":{"si":"Check Box20","no":"Check Box21"},"apertura":{"si":"Check Box26","no":"Check Box27"},"clima":{"si":"Check Box32","no":"Check Box33"},"y1":544.9,"y2":573.2},{"f1":"Fase 1_5","f2":"Fase 2_5","piano":"Testo7","ubic":"Testo27","accesso":{"si":"Check Box22","no":"Check Box23"},"apertura":{"si":"Check Box28","no":"Check Box29"},"clima":{"si":"Check Box34","no":"Check Box35"},"y1":515.1,"y2":543.4},{"f1":"Fase 1_6","f2":"Fase 2_6","piano":"Testo8","ubic":"Testo28","accesso":{"si":"Check Box24","no":"Check Box25"},"apertura":{"si":"Check Box30","no":"Check Box31"},"clima":{"si":"Check Box36","no":"Check Box37"},"y1":485.3,"y2":513.6},{"f1":"Fase 1_7","f2":"Fase 2_7","piano":"Testo9","ubic":"Testo29","accesso":{"si":"Check Box38","no":"Check Box39"},"apertura":{"si":"Check Box44","no":"Check Box45"},"clima":{"si":"Check Box50","no":"Check Box51"},"y1":455.5,"y2":483.8},{"f1":"Fase 1_8","f2":"Fase 2_8","piano":"Testo10","ubic":"Testo30","accesso":{"si":"Check Box40","no":"Check Box41"},"apertura":{"si":"Check Box46","no":"Check Box47"},"clima":{"si":"Check Box52","no":"Check Box53"},"y1":425.7,"y2":454.0},{"f1":"Fase 1_9","f2":"Fase 2_9","piano":"Testo11","ubic":"Testo31","accesso":{"si":"Check Box42","no":"Check Box43"},"apertura":{"si":"Check Box48","no":"Check Box49"},"clima":{"si":"Check Box54","no":"Check Box55"},"y1":395.9,"y2":424.2},{"f1":"Fase 1_10","f2":"Fase 2_10","piano":"Testo12","ubic":"Testo32","accesso":{"si":"Check Box56","no":"Check Box57"},"apertura":{"si":"Check Box62","no":"Check Box63"},"clima":{"si":"Check Box68","no":"Check Box69"},"y1":366.1,"y2":394.4},{"f1":"Fase 1_11","f2":"Fase 2_11","piano":"Testo13","ubic":"Testo33","accesso":{"si":"Check Box58","no":"Check Box59"},"apertura":{"si":"Check Box64","no":"Check Box65"},"clima":{"si":"Check Box70","no":"Check Box71"},"y1":336.3,"y2":364.6},{"f1":"Fase 1_12","f2":"Fase 2_12","piano":"Testo14","ubic":"Testo34","accesso":{"si":"Check Box60","no":"Check Box61"},"apertura":{"si":"Check Box66","no":"Check Box67"},"clima":{"si":"Check Box72","no":"Check Box73"},"y1":306.5,"y2":334.8},{"f1":"Fase 1_13","f2":"Fase 2_13","piano":"Testo15","ubic":"Testo35","accesso":{"si":"Check Box78","no":"Check Box79"},"apertura":{"si":"Check Box83","no":"Check Box84"},"clima":{"si":"Check Box88","no":"Check Box89"},"y1":276.7,"y2":305.0},{"f1":"Fase 1_14","f2":"Fase 2_14","piano":"Testo16","ubic":"Testo36","accesso":{"si":"Check Box80","no":"Check Box81"},"apertura":{"si":"Check Box85","no":"Check Box86"},"clima":{"si":"Check Box90","no":"Check Box91"},"y1":246.9,"y2":275.2},{"f1":"Fase 1_15","f2":"Fase 2_15","piano":"Testo17","ubic":"Testo37","accesso":{"si":"Check Box82","no":"Check Box124"},"apertura":{"si":"Check Box87","no":"Check Box123"},"clima":{"si":"Check Box92","no":"Check Box121"},"y1":217.1,"y2":245.4},{"f1":"Fase 1_16","f2":"Fase 2_16","piano":"Testo18","ubic":"Testo38","accesso":{"si":"Check Box122","no":"Check Box120"},"apertura":{"si":"Check Box115","no":"Check Box114"},"clima":{"si":"Check Box109","no":"Check Box108"},"y1":187.3,"y2":215.6},{"f1":"Fase 1_17","f2":"Fase 2_17","piano":"Testo19","ubic":"Testo39","accesso":{"si":"Check Box119","no":"Check Box118"},"apertura":{"si":"Check Box113","no":"Check Box112"},"clima":{"si":"Check Box107","no":"Check Box106"},"y1":157.5,"y2":185.8},{"f1":"Fase 1_18","f2":"Fase 2_18","piano":"Testo20","ubic":"Testo40","accesso":{"si":"Check Box117","no":"Check Box116"},"apertura":{"si":"Check Box111","no":"Check Box110"},"clima":{"si":"Check Box105","no":"Check Box103"},"y1":127.7,"y2":156.0},{"f1":"Fase 1_19","f2":"Fase 2_19","piano":"Testo21","ubic":"Testo41","accesso":{"si":"Check Box104","no":"Check Box102"},"apertura":{"si":"Check Box99","no":"Check Box98"},"clima":{"si":"Check Box95","no":"Check Box94"},"y1":97.9,"y2":126.1},{"f1":"Fase 1_20","f2":"Fase 2_20","piano":"Testo22","ubic":"Testo42","accesso":{"si":"Check Box101","no":"Check Box100"},"apertura":{"si":"Check Box97","no":"Check Box96"},"clima":{"si":"Check Box125","no":"Check Box93"},"y1":68.0,"y2":96.4}];

  // Coordinate firme pagina 1 (punti PDF): colonne dei tre momenti
  const FIRMA_COLS = [40, 213.6, 390.2];
  const FIRMA_Y = { tecnico: 236, referente: 127.5 };
  const FIRMA_BOX = { dx: 24, w: 138, h: 30 };

  function lib() { return root.PDFLib || require('pdf-lib'); }

  function fmtData(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  }

  function fitText(font, text, maxW, size, minSize) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    let s = size;
    while (s > minSize && font.widthOfTextAtSize(text, s) > maxW) s -= 0.25;
    if (font.widthOfTextAtSize(text, s) > maxW) {
      while (text.length > 1 && font.widthOfTextAtSize(text + '…', s) > maxW) text = text.slice(0, -1);
      text = text + '…';
    }
    return { text, size: s };
  }

  // Alcuni caratteri non sono in WinAnsi (Helvetica standard): li sostituisco
  function safe(t) {
    return String(t == null ? '' : t)
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-').replace(/\u00B3/g, '3')
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF\u20AC\u2026]/g, '');
  }

  async function dataUrlBytes(dataUrl) {
    const b64 = dataUrl.split(',')[1];
    if (typeof atob === 'function') {
      const bin = atob(b64); const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    return Uint8Array.from(Buffer.from(b64, 'base64'));
  }

  async function drawSignature(doc, page, dataUrl, x, y) {
    if (!dataUrl) return;
    const img = await doc.embedPng(await dataUrlBytes(dataUrl));
    const { w, h } = FIRMA_BOX;
    const scale = Math.min(w / img.width, h / img.height);
    const iw = img.width * scale, ih = img.height * scale;
    page.drawImage(img, { x: x + FIRMA_BOX.dx + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih });
  }

  function setText(form, name, value, size, multi) {
    try {
      const f = form.getTextField(name);
      if (multi) f.enableMultiline();
      f.setText(safe(value));
      if (size) f.setFontSize(size);
    } catch (e) { console.warn('campo', name, e.message); }
  }
  function setCheck(form, row, key, value) {
    try {
      if (value === 'si') form.getCheckBox(row[key].si).check();
      if (value === 'no') form.getCheckBox(row[key].no).check();
    } catch (e) { console.warn('check', key, e.message); }
  }

  function fillRows(form, punti) {
    punti.forEach((p, i) => {
      const r = RADON_ROWS[i];
      setText(form, r.f1, p.codiceF1);
      setText(form, r.f2, p.codiceF2);
      setText(form, r.piano, p.piano, 8, true);
      setText(form, r.ubic, p.ubicazione, 8, true);
      setCheck(form, r, 'accesso', p.accesso);
      setCheck(form, r, 'apertura', p.apertura);
      setCheck(form, r, 'clima', p.clima);
    });
  }

  function flatten(form) {
    // i campi mai toccati possono non avere l'aspetto: lo rigenero prima di appiattire
    form.getFields().forEach(f => {
      if (f.constructor.name === 'PDFTextField' && !f.getText()) { try { f.setText(''); } catch (e) {} }
    });
    form.flatten();
  }

  function coverAndWrite(page, font, x, y, w, h, text, size, opts) {
    const { rgb } = lib();
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1) });
    if (text) page.drawText(safe(text), { x: opts && opts.tx != null ? opts.tx : x + 1, y: y + (h - size) / 2 + 1, size, font, color: rgb(0, 0, 0) });
  }

  // ---------- RADON ----------
  async function radonPdf(templateBytes, c) {
    const { PDFDocument, StandardFonts } = lib();
    const punti = c.punti || [];
    const chunks = [];
    for (let i = 0; i < Math.max(punti.length, 1); i += 20) chunks.push(punti.slice(i, i + 20));
    const nPages = 1 + chunks.length;

    const doc = await PDFDocument.load(templateBytes);
    const form = doc.getForm();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    const campi = { Commessa: c.commessa, Cliente: c.cliente, Insegna: c.insegna, Codice: c.codice, 'Città': c.citta,
      Provincia: c.provincia, Indirizzo: c.indirizzo, Altro: c.altro, Telefono: c.telefono };
    Object.entries(campi).forEach(([k, v]) => setText(form, k, v));

    const dateF = ['DATA_es_:date', 'DATA_2_es_:date', 'DATA_3_es_:date'];
    const tecC = ['Cognome', 'Cognome_2', 'Cognome_3'], tecN = ['Nome', 'Nome_2', 'Nome_3'];
    const refC = ['Cognome_4', 'Cognome_5', 'Cognome_6'], refN = ['Nome_4', 'Nome_5', 'Nome_6'];
    const momenti = c.momenti || [];
    const usato = m => m && (m.confermato || m.data);
    momenti.forEach((m, i) => {
      if (!usato(m)) return;
      setText(form, dateF[i], fmtData(m.data));
      setText(form, tecC[i], m.tecnicoCognome); setText(form, tecN[i], m.tecnicoNome);
      setText(form, refC[i], m.referenteCognome); setText(form, refN[i], m.referenteNome);
    });
    fillRows(form, chunks[0]);
    flatten(form);

    const p1 = doc.getPage(0), p2 = doc.getPage(1);
    for (let i = 0; i < momenti.length; i++) {
      const m = momenti[i]; if (!usato(m)) continue;
      await drawSignature(doc, p1, m.firmaTecnico, FIRMA_COLS[i], FIRMA_Y.tecnico);
      await drawSignature(doc, p1, m.firmaReferente, FIRMA_COLS[i], FIRMA_Y.referente);
    }
    if (nPages > 2) {
      coverAndWrite(p1, font, 470, 11, 60, 14, 'Pag.1 di ' + nPages, 10);
      coverAndWrite(p2, font, 470, 11, 60, 14, 'Pag.2 di ' + nPages, 10);
    }

    // pagine aggiuntive per i punti oltre R20
    for (let k = 1; k < chunks.length; k++) {
      const extra = await PDFDocument.load(templateBytes);
      const ef = extra.getForm();
      fillRows(ef, chunks[k]);
      flatten(ef);
      const [pg] = await doc.copyPages(extra, [1]);
      doc.addPage(pg);
      RADON_ROWS.forEach((r, i) => {
        const n = k * 20 + i + 1;
        const h = r.y2 - r.y1;
        coverAndWrite(pg, bold, 22, r.y1 + 1, 25, h - 2, 'R' + n, 9.5, { tx: 23.5 });
      });
      coverAndWrite(pg, font, 470, 11, 60, 14, 'Pag.' + (k + 2) + ' di ' + nPages, 10);
    }
    doc.setTitle('Scheda raccolta dati radon ' + (c.commessa || ''));
    return await doc.save();
  }

  // ---------- SCHEDA CAMPIONI ----------
  // Righe tabella (y alto → y basso) ricavate dal modello della scheda campioni
  const SC_LINES = [568.2, 548.6, 535.9, 523.2, 510.4, 497.7, 485.0, 472.3, 459.6, 443.5, 427.4, 411.3, 395.2, 379.2, 363.1, 347.0, 330.9, 314.8, 298.8, 282.7, 266.5];
  const SC_COLS = { n: [21.8, 49.2], data: [49.2, 94.9], desc: [94.9, 413.5], tip: [413.5, 571.2] };

  async function schedaCampioniPdf(templateBytes, info) {
    // info: { commessa, sito, campioni:[{codice,data,descrizione}], analisi:{codice,desc}, lab:{nome,r1,r2}, offerta, offertaRev, email, prelevatoDa, verificatoDa }
    const { PDFDocument, StandardFonts, rgb } = lib();
    const tpl = await PDFDocument.load(templateBytes);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const obl = await doc.embedFont(StandardFonts.HelveticaOblique);
    const boldObl = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
    const nRows = SC_LINES.length - 1;
    const camp = info.campioni || [];
    const nPages = Math.max(1, Math.ceil(camp.length / nRows));
    const black = rgb(0, 0, 0);
    const center = (page, f, t, size, x0, x1, y) => {
      t = safe(t); const w = f.widthOfTextAtSize(t, size);
      page.drawText(t, { x: x0 + (x1 - x0 - w) / 2, y, size, font: f, color: black });
    };
    const white = (page, x0, y0, x1, y1) => page.drawRectangle({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, color: rgb(1, 1, 1) });

    for (let p = 0; p < nPages; p++) {
      const [page] = await doc.copyPages(tpl, [0]);
      doc.addPage(page);
      // intestazione: commessa e sito
      const cm = fitText(bold, safe(info.commessa), 345, 11, 7);
      page.drawText(cm.text, { x: 222, y: 715, size: cm.size, font: bold, color: black });
      const st = fitText(font, safe(info.sito), 345, 10, 6);
      page.drawText(st.text, { x: 222, y: 675, size: st.size, font, color: black });
      // email referti
      white(page, 180, 629, 415, 640.5);
      center(page, boldObl, info.email || '', 8.2, 21.8, 571.2, 631);
      // laboratorio
      white(page, 217, 590.5, 412, 624);
      const lab = info.lab || {};
      center(page, bold, lab.nome || '', 7.6, 215.5, 413.5, 614.3);
      center(page, font, lab.r1 || '', 7.6, 215.5, 413.5, 603.3);
      center(page, font, lab.r2 || '', 7.6, 215.5, 413.5, 592.4);
      // offerta
      white(page, 415, 590.5, 570, 624);
      center(page, font, info.offerta || '', 7, 413.5, 571.2, 609.2);
      center(page, font, info.offertaRev || '', 7, 413.5, 571.2, 599.3);
      // stray "SI" al margine destro del modello
      white(page, 572, 601, 582, 612);
      // prima riga precompilata nel modello: la ripulisco
      white(page, 23, 549.6, 48.2, 567.2);
      white(page, 414.5, 549.6, 570.2, 567.2);
      // firme testuali
      white(page, 23, 239.5, 400, 265);
      page.drawText('PRELEVATO DA: ', { x: 24, y: 253.5, size: 7.6, font: bold, color: black });
      page.drawText(safe(info.prelevatoDa || ''), { x: 27 + bold.widthOfTextAtSize('PRELEVATO DA:', 7.6), y: 253.5, size: 7.6, font, color: black });
      page.drawText('VERIFICATO DA: ', { x: 24, y: 242.6, size: 7.6, font: bold, color: black });
      page.drawText(safe(info.verificatoDa || ''), { x: 27 + bold.widthOfTextAtSize('VERIFICATO DA:', 7.6), y: 242.6, size: 7.6, font, color: black });
      if (nPages > 1) page.drawText('Pag. ' + (p + 1) + ' di ' + nPages, { x: 24, y: 26, size: 8, font, color: black });

      for (let r = 0; r < nRows; r++) {
        const s = camp[p * nRows + r]; if (!s) break;
        const top = SC_LINES[r], bot = SC_LINES[r + 1], h = top - bot;
        const mid = bot + h / 2;
        center(page, bold, s.codice || '', 9, SC_COLS.n[0], SC_COLS.n[1], mid - 3.2);
        center(page, font, fmtData(s.data), 7.2, SC_COLS.data[0], SC_COLS.data[1], mid - 2.5);
        const d = fitText(font, safe(s.descrizione), SC_COLS.desc[1] - SC_COLS.desc[0] - 8, 7.6, 5.5);
        page.drawText(d.text, { x: SC_COLS.desc[0] + 4, y: mid - d.size / 2 + 0.6, size: d.size, font, color: black });
        const an = info.analisi || {};
        if (h > 17) {
          center(page, bold, an.codice || '', 7, SC_COLS.tip[0], SC_COLS.tip[1], mid + 1.5);
          const t2 = fitText(font, '(' + (an.desc || '') + ')', 150, 7, 5);
          center(page, font, t2.text, t2.size, SC_COLS.tip[0], SC_COLS.tip[1], mid - 6.5);
        } else {
          const t = fitText(font, (an.codice || '') + ' (' + (an.desc || '') + ')', 152, 6.6, 4.8);
          center(page, font, t.text, t.size, SC_COLS.tip[0], SC_COLS.tip[1], mid - t.size / 2 + 0.6);
        }
      }
    }
    doc.setTitle('Scheda di prelievo campioni massivi ' + (info.commessa || ''));
    return await doc.save();
  }

  const api = { radonPdf, schedaCampioniPdf, RADON_ROWS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PdfGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
