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

  // Alcuni aspetti dei campi del modello (es. i campi DATA vuoti) sono stream senza /Subtype:
  // dopo l'appiattimento diventano XObject non validi e Acrobat / Anteprima iOS possono lasciare la pagina bianca.
  function fixAppearances(form) {
    const { PDFName, PDFDict, PDFStream } = lib();
    const T = PDFName.of('Type'), S = PDFName.of('Subtype'), BB = PDFName.of('BBox');
    const fix = s => {
      if (!(s instanceof PDFStream)) return;
      const d = s.dict;
      if (!d.has(T)) d.set(T, PDFName.of('XObject'));
      if (!d.has(S)) d.set(S, PDFName.of('Form'));
      if (!d.has(BB)) d.set(BB, form.doc.context.obj([0, 0, 1, 1]));
    };
    form.getFields().forEach(f => {
      let widgets = [];
      try { widgets = f.acroField.getWidgets(); } catch (e) {}
      widgets.forEach(w => {
        const ap = w.dict.lookup(PDFName.of('AP'));
        if (!(ap instanceof PDFDict)) return;
        ['N', 'D', 'R'].forEach(k => {
          const v = ap.lookup(PDFName.of(k));
          if (v instanceof PDFStream) fix(v);
          else if (v instanceof PDFDict) v.keys().forEach(st => fix(v.lookup(st)));
        });
      });
    });
  }

  function flatten(form) {
    // i campi mai toccati possono non avere l'aspetto: lo rigenero prima di appiattire
    form.getFields().forEach(f => {
      if (f.constructor.name === 'PDFTextField' && !f.getText()) { try { f.setText(''); } catch (e) {} }
    });
    fixAppearances(form);
    form.flatten();
  }

  function coverAndWrite(page, font, x, y, w, h, text, size, opts) {
    const { rgb } = lib();
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1) });
    if (text) page.drawText(safe(text), { x: opts && opts.tx != null ? opts.tx : x + 1, y: y + (h - size) / 2 + 1, size, font, color: rgb(0, 0, 0) });
  }

  // ---------- RADON ----------
  async function radonPdf(templateBytes, c) {
    if (root.needLib) await root.needLib('pdflib');
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
    if (root.needLib) await root.needLib('pdflib');
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

  /* ---------- foglio firme: impaginazione propria (A4), nessun modello da caricare ----------
     f: { titolo, sottotitolo, data, luogo, relatore, responsabile, testo, documenti:[{t, ok}], partecipanti:[{nome, societa, ruolo, firma, ts}],
          firmaRelatore, note, manufatti:[{codice, descrizione, tipologia, ubicazione, stato, note}] }
     ctx: { ente, committente, sito, commessa, codice } */
  async function foglioFirmePdf(f, ctx) {
    if (root.needLib) await root.needLib('pdflib');
    const { PDFDocument, StandardFonts, rgb } = lib();
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = 595.28, H = 841.89, M = 42, CW = W - 2 * M;
    const ink = rgb(0.06, 0.09, 0.16), mute = rgb(0.38, 0.42, 0.5), line = rgb(0.78, 0.8, 0.85), band = rgb(0.94, 0.95, 0.97);
    let page, y;
    const pages = [];
    const newPage = () => { page = doc.addPage([W, H]); pages.push(page); y = H - M; };
    const ensure = h => { if (y - h < M + 24) { newPage(); return true; } return false; };
    const wrap = (text, fnt, size, maxW) => {
      const out = [];
      for (const par of safe(text).split('\n')) {
        const words = par.split(/\s+/).filter(Boolean); let cur = '';
        if (!words.length) { out.push(''); continue; }
        for (const w of words) {
          const t = cur ? cur + ' ' + w : w;
          if (fnt.widthOfTextAtSize(t, size) <= maxW) cur = t;
          else { if (cur) out.push(cur); cur = w; while (fnt.widthOfTextAtSize(cur, size) > maxW && cur.length > 1) { let k = cur.length; while (k > 1 && fnt.widthOfTextAtSize(cur.slice(0, k), size) > maxW) k--; out.push(cur.slice(0, k)); cur = cur.slice(k); } }
        }
        out.push(cur);
      }
      return out;
    };
    const para = (text, size = 10, fnt = font, color = ink, lead = 1.38) => {
      for (const l of wrap(text, fnt, size, CW)) { ensure(size * lead); page.drawText(l, { x: M, y: y - size, size, font: fnt, color }); y -= size * lead; }
    };
    const head = t => { ensure(40); y -= 10; page.drawText(safe(t).toUpperCase(), { x: M, y: y - 9, size: 9, font: bold, color: mute }); y -= 16; };
    const embed = async url => { try { return await doc.embedPng(await dataUrlBytes(url)); } catch (e) { return null; } };
    // tabella con intestazione ripetuta su ogni pagina; cell(row, i) → testo; sig(row) → immagine per l'ultima colonna
    const table = async (cols, rows, opt = {}) => {
      const size = opt.size || 9, pad = 4, minH = opt.minH || 0;
      const drawHead = () => {
        let x = M; page.drawRectangle({ x: M, y: y - 18, width: CW, height: 18, color: band });
        for (const c of cols) { page.drawText(safe(c.t), { x: x + pad, y: y - 12.5, size: 8, font: bold, color: ink }); x += c.w * CW; }
        y -= 18;
      };
      ensure(18 + Math.max(minH, 20)); drawHead();
      for (const r of rows) {
        const lines = cols.map((c, i) => c.sig ? [] : wrap(r[i] == null ? '' : r[i], font, size, c.w * CW - 2 * pad));
        const h = Math.max(minH, ...lines.map(l => l.length * size * 1.25 + 2 * pad));
        if (ensure(h)) drawHead();
        let x = M;
        for (const [i, c] of cols.entries()) {
          lines[i].forEach((l, k) => page.drawText(l, { x: x + pad, y: y - pad - size - k * size * 1.25 + 1, size, font, color: ink }));
          if (c.sig && r[i]) {
            const img = await embed(r[i]);
            if (img) { const bw = c.w * CW - 2 * pad, bh = h - 2 * pad; const s = Math.min(bw / img.width, bh / img.height); page.drawImage(img, { x: x + pad + (bw - img.width * s) / 2, y: y - h + pad + (bh - img.height * s) / 2, width: img.width * s, height: img.height * s }); }
          }
          x += c.w * CW;
        }
        page.drawLine({ start: { x: M, y: y - h }, end: { x: M + CW, y: y - h }, thickness: 0.6, color: line });
        y -= h;
      }
    };
    newPage();
    // intestazione: chi conduce (dalla configurazione) e data
    const ente = safe(ctx.ente || '').split('\n').filter(Boolean);
    let ey = y;
    ente.forEach((l, i) => { const fn = i ? font : bold, t = fitText(fn, l, CW * 0.62, i ? 8.5 : 10, 6); page.drawText(t.text, { x: M, y: ey - (i ? 9 : 10), size: t.size, font: fn, color: i ? mute : ink }); ey -= i ? 11 : 13; });
    const dl = safe([f.luogo, fmtData(f.data)].filter(Boolean).join(', '));
    if (dl) page.drawText(dl, { x: M + CW - font.widthOfTextAtSize(dl, 9.5), y: y - 10, size: 9.5, font, color: ink });
    y = Math.min(ey, y - 14) - 14;
    page.drawLine({ start: { x: M, y }, end: { x: M + CW, y }, thickness: 1.2, color: ink }); y -= 22;
    for (const l of wrap(f.titolo || 'Foglio firme', bold, 15, CW)) { page.drawText(l, { x: M, y: y - 15, size: 15, font: bold, color: ink }); y -= 19; }
    if (f.sottotitolo) for (const l of wrap(f.sottotitolo, font, 10.5, CW)) { page.drawText(l, { x: M, y: y - 10.5, size: 10.5, font, color: mute }); y -= 14; }
    y -= 8;
    // dati
    const info = [['Committente', ctx.committente], ['Immobile', ctx.sito], ['Commessa', ctx.commessa], ['Relatore', f.relatore], ['Responsabile di commessa', f.responsabile]].filter(x => x[1]);
    for (const [k, v] of info) {
      const ls = wrap(v, font, 10, CW - 150); ensure(ls.length * 13 + 2);
      page.drawText(safe(k), { x: M, y: y - 10, size: 9, font: bold, color: mute });
      ls.forEach((l, i) => page.drawText(l, { x: M + 150, y: y - 10 - i * 13, size: 10, font, color: ink })); y -= ls.length * 13 + 3;
    }
    if (f.testo && f.testo.trim()) { head('Oggetto'); para(f.testo); }
    const docs = (f.documenti || []).filter(d => d.ok && d.t);
    if (docs.length) { head('Documenti consegnati'); for (const d of docs) { const ls = wrap(d.t, font, 10, CW - 14); ensure(ls.length * 13.8); page.drawText('•', { x: M + 2, y: y - 10, size: 10, font, color: ink }); ls.forEach((l, i) => page.drawText(l, { x: M + 14, y: y - 10 - i * 13.8, size: 10, font, color: ink })); y -= ls.length * 13.8 + 2; } }
    const pp = (f.partecipanti || []);
    head('Persone coinvolte');
    await table([{ t: '#', w: 0.05 }, { t: 'Nome e cognome', w: 0.27 }, { t: 'Società / ditta', w: 0.22 }, { t: 'Ruolo', w: 0.18 }, { t: 'Firma', w: 0.28, sig: true }],
      (pp.length ? pp : [{}, {}, {}]).map((p, i) => [String(i + 1), p.nome || '', p.societa || '', p.ruolo || '', p.firma || '']), { minH: 38 });
    const man = f.manufatti || [];
    if (man.length) {
      head('Manufatti presenti in sito');
      await table([{ t: 'Codice', w: 0.09 }, { t: 'Manufatto', w: 0.25 }, { t: 'Matrice', w: 0.12 }, { t: 'Ubicazione', w: 0.22 }, { t: 'Stato', w: 0.13 }, { t: 'Note', w: 0.19 }],
        man.map(m => [m.codice, m.descrizione, m.tipologia, m.ubicazione, m.stato, m.note]));
    }
    if (f.note && f.note.trim()) { head('Note'); para(f.note); }
    // firma del relatore
    ensure(80); y -= 18;
    const bx = M + CW - 200;
    page.drawText(safe('Il relatore' + (f.relatore ? ' - ' + f.relatore : '')), { x: bx, y: y - 9, size: 9, font: bold, color: mute }); y -= 14;
    if (f.firmaRelatore) { const img = await embed(f.firmaRelatore); if (img) { const s = Math.min(200 / img.width, 46 / img.height); page.drawImage(img, { x: bx, y: y - img.height * s, width: img.width * s, height: img.height * s }); } }
    page.drawLine({ start: { x: bx, y: y - 50 }, end: { x: bx + 200, y: y - 50 }, thickness: 0.6, color: line });
    // piè di pagina
    const foot = safe([f.titolo, ctx.commessa ? 'Commessa ' + ctx.commessa : '', ctx.codice].filter(Boolean).join(' - '));
    pages.forEach((p, i) => {
      p.drawText(fitText(font, foot, CW - 70, 8, 6).text, { x: M, y: 24, size: 8, font, color: mute });
      const n = `pag. ${i + 1} di ${pages.length}`; p.drawText(n, { x: M + CW - font.widthOfTextAtSize(n, 8), y: 24, size: 8, font, color: mute });
    });
    doc.setTitle(safe(f.titolo || 'Foglio firme'));
    return await doc.save();
  }

  const api = { radonPdf, schedaCampioniPdf, foglioFirmePdf, RADON_ROWS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PdfGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
