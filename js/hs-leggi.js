/* Sopralluoghi HSE — lettura del report dell'anno precedente (Word Esteso e Sintetico, JSON della vecchia app) e import nell'attività. */

/* ================= lettura del report dell'anno precedente =================
   Restituisce un oggetto con i campi dell’attività; le immagini come Blob (le salva il chiamante).
   Tutto il testo letto diventa "base": nel nuovo Word resta nero; quello che aggiungi o modifichi esce in rosso. */
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
// frase che Nembo scrive nelle sezioni senza note: all'import non diventa testo della sezione
const HS_NESSUNA = /^nessuna criticità rilevata\.?$/i;
function hsReadEsteso(files, body) {
  const imgs = hsImgCollector(files);
  const out = { formato: 'esteso', meta: {}, an: {}, schede: {}, foto: [], img: {}, visite: [], catFab: [], catTer: [], extraFoto: [], refFoto: {} };
  // «ID Foto 1, 2» è generato dall'app: lo uso per ricollegare le foto alla sezione e non lo tengo nel testo
  const idFotoRiga = (l, ref) => { const m = String(l).trim().match(/^ID Foto\s+([\d,\s]+)$/i); if (!m) return false; m[1].split(/[,\s]+/).filter(Boolean).forEach(n => out.refFoto[+n] = ref); return true; };
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
        if (i >= 0) { if (f) out.foto.push(f); const n = String(testi[i]).match(/(\d+)/); f = { blob: im[0] && im[0].blob, cap: '', data: (testi[i + 1] || '').trim(), riga: 0, ord: n ? +n[1] : 9999, n: n ? +n[1] : 0 }; return; }
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
              if (idFotoRiga(raw, 'sch.' + cur.k + '.' + (sub || cur.subs[0])) || HS_NESSUNA.test(raw)) return;
              const li = isList(p); const line = li && !raw.startsWith('- ') ? ' '.repeat(2 * li.lv) + '- ' + raw : raw;
              (sub ? res[sub] : pre).push(line);
            });
            if (pre.length) res[cur.subs[0]] = pre.concat(res[cur.subs[0]]);
            d.subs = Object.fromEntries(cur.subs.map(s => [s, res[s].join('\n').trim()]));
          } else d.sit = cellLines(c[1]).split('\n').filter(l => !idFotoRiga(l, 'sch.' + cur.k) && !HS_NESSUNA.test(l.trim())).join('\n').trim();
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
  if (!HS_SCHEDE.some(s => hsSchedaFatta(out.schede[s.k]) || out.schede[s.k].natura)) throw new Error('nel documento non sono state riconosciute schede HSE');
  return out;
}
function hsReadSintetico(files, doc, body) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
  const imgs = hsImgCollector(files);
  const txt = n => { const ps = n.localName === 'p' ? [n] : [...n.getElementsByTagNameNS(W, 'p')]; return ps.map(p => pText(p).replace(/\t/g, ' ')).join('\n').replace(/[ \t]+\n/g, '\n').trim(); };
  const lines = c => [...c.getElementsByTagNameNS(W, 'p')].map(p => { const t = pText(p).replace(/ /g, ' ').trim().replace(/^\u2022\s*/, '- ').replace(/\t/g, ' '); if (!t) return null; return isList(p) && !t.startsWith('- ') ? '- ' + t : t; }).filter(x => x != null).join('\n').trim();
  const allT = [...body.getElementsByTagNameNS(W, 'tbl')];
  const out = { formato: 'sintetico', meta: {}, anS: HS_SINT_AN.map(() => ''), risp: {}, note: {}, descr: '', azioni: [], foto: [], img: {}, refFoto: {}, cgFoto: [] };
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
    // foto di inquadramento sotto il capitolo 8: tutto quello che c'è tra il titolo e il capitolo successivo
    const nodes = kidsW(body), i0 = nodes.indexOf(paras[iCG]);
    for (let k = i0 + 1; k < nodes.length; k++) {
      const n = nodes[k]; if (n.localName === 'p' && isHead(n)) break;
      if (n.localName === 'sectPr') break;
      imgs(n).forEach(o => out.cgFoto.push({ blob: o.blob, w: o.cx ? +(o.cx / CMx).toFixed(2) : 0, h: o.cy ? +(o.cy / CMx).toFixed(2) : 0 }));
    }
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
// applica quanto letto (Word o JSON) a un’attività: i testi diventano la base grigia, le foto vanno in "precedente sopralluogo"
async function hsApplyImport(rec, d, onStep) {
  const save = async (blob, k, n) => { onStep && onStep(k, n); try { return await saveImage(blob); } catch (e) { return null; } };
  const r = JSON.parse(JSON.stringify(rec));
  r.formato = d.formato;
  ['commessa', 'cliente', 'sito', 'indirizzo', 'citta'].forEach(k => { if (d[k]) r[k] = d[k]; });
  // anagrafica importata dal Word: bloccata (si sblocca col lucchetto)
  markImp(r, d, ['commessa', 'cliente', 'sito', 'indirizzo', 'citta']); markImp(r, d.meta || {}, Object.keys(d.meta || {}), 'meta.');
  if (d.fromJson && d.data) r.data = d.data;
  if (d.appunti && !r.appunti) r.appunti = d.appunti;
  Object.assign(r.meta, Object.fromEntries(Object.entries(d.meta || {}).filter(([, v]) => v)));
  const B = {};
  if (d.formato === 'esteso') {
    r.an = { ...r.an, ...d.an }; markImp(r, d.an || {}, Object.keys(d.an || {}).filter(k => k !== 'descrizione'), 'an.'); if (d.inquadramento) r.inquadramento = d.inquadramento;
    if ((d.catFab || []).length) r.catFab = d.catFab; if ((d.catTer || []).length) r.catTer = d.catTer;
    if ((d.visite || []).length) r.visite = d.visite;
    r.schede = JSON.parse(JSON.stringify(d.schede));
    HS_SCHEDE.forEach(s => { const x = r.schede[s.k]; if (s.subs) s.subs.forEach(sb => B['sch.' + s.k + '.' + sb] = x.subs[sb] || ''); else B['sch.' + s.k + '.sit'] = x.sit || ''; B['sch.' + s.k + '.mig'] = x.mig || ''; });
    B['an.descrizione'] = r.an.descrizione || ''; B.inquadramento = r.inquadramento || '';
  } else {
    const c = JSON.parse(JSON.stringify({ anS: d.anS, risp: d.risp, note: d.note, azioni: d.azioni }));
    r.anS = c.anS; markImp(r, Object.fromEntries((c.anS || []).map((v, i) => [i, v]).filter(([i]) => i != 8 && i != 9)), Object.keys(c.anS || []).filter(i => i != 8 && i != 9), 'anS.'); r.risp = c.risp; r.note = c.note; r.descr = d.descr; r.azioni = c.azioni;
    r.anS.forEach((v, i) => B['an.' + i] = v); Object.entries(r.note).forEach(([k, v]) => B['nt.' + k] = v); B.descr = r.descr;
  }
  const tot = Object.keys(d.img || {}).length + (d.foto || []).length + (d.extraFoto || []).length + (d.cgFoto || []).length; let k = 0;
  r.img = { ...r.img };
  for (const [key, blob] of Object.entries(d.img || {})) { const id = await save(blob, ++k, tot); if (id) r.img[key] = id; }
  // foto di inquadramento del capitolo 8 (Sintetico): restano nel report a ogni nuovo caricamento
  if ((d.cgFoto || []).length) {
    const cg = [];
    for (const f of d.cgFoto) { const id = await save(f.blob, ++k, tot); if (id) cg.push({ id, w: f.w || 0, h: f.h || 0 }); }
    for (const o of (r.cgFoto || [])) await removeBlob(o.id);
    r.cgFoto = cg;
  }
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
// backup JSON della vecchia app HSE (entrambi i formati)
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
  throw new Error('il file JSON non è un backup dell\'app sopralluoghi HSE');
}
