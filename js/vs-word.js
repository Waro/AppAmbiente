/* Word del Verbale HSE: compila il modello caricato in Impostazioni → Modelli (segnaposto @@…@@).
   Ogni nota diventa una scheda: titolo, situazione rilevata, documentazione fotografica, attività di miglioramento. */

const vsFileBase = r => ['Verbale_HSE', r.codice, slug(r.sito || r.citta || ''), r.data].filter(Boolean).join('_');
const vsNoteWord = r => (r.note || []).filter(n => n.titolo || n.testo || n.mig || (n.foto || []).length);
const vsVisite = r => { const m = r.meta || {}; const v = (r.visite || []).filter(x => x.data || x.presenti); if (r.data && !v.some(x => x.data === r.data)) v.push({ data: r.data, presenti: m.presenti || '' }); return v; };

// immagine segnaposto del modello (testo alternativo @@TAG@@): sostituita dalla foto, oppure tolta se manca
async function vsSwapImg(x, ctx, tag, id, crop) {
  const re = new RegExp('<w:r(?: [^>]*)?>(?:(?!<w:r[ >])[\\s\\S])*?<w:drawing>(?:(?!</w:drawing>)[\\s\\S])*?descr="@@' + tag + '@@"[\\s\\S]*?</w:drawing>[\\s\\S]*?</w:r>');
  const m = x.match(re); if (!m) return x;
  if (!id) return x.replace(m[0], '');
  const ext = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(m[0]); const W = ext ? +ext[1] : 6000000, H = ext ? +ext[2] : 4000000;
  const im = await hsImage(id, null, crop ? W / H : null); if (!im) return x.replace(m[0], '');
  let cx = W, cy = Math.round(W * im.h / im.w); if (cy > H) { cy = H; cx = Math.round(H * im.w / im.h); }
  const rid = hsAddMedia(ctx, im.u8, im.png);
  const run = m[0].replace(/r:embed="[^"]+"/, 'r:embed="' + rid + '"').replace(/\s*descr="@@[A-Z]+@@"/, '')
    .replace(/<wp:extent cx="\d+" cy="\d+"/, '<wp:extent cx="' + cx + '" cy="' + cy + '"').replace(/<a:ext cx="\d+" cy="\d+"/, '<a:ext cx="' + cx + '" cy="' + cy + '"');
  return x.replace(m[0], run);
}

async function vsBuildDocx(r, settings, opt = {}) {
  const t = TEMPLATES['vs.docx'];
  const tpl = await DB.get(t.key);
  if (!tpl) throw new Error('carica prima il "' + t.label + '" in Impostazioni → Modelli');
  const files = await hsUnzip(tpl); const ctx = hsCtx(files);
  const m = r.meta || {};
  let x = hsHeal(dec8(files['word/document.xml']));
  if (x.indexOf('@@S_TITOLO@@') < 0) throw new Error('il modello del Verbale HSE non contiene la scheda (@@S_TITOLO@@)');
  // schede: il blocco del modello (titolo + tabella) ripetuto per ogni nota, una per pagina
  const P = hsPara(x, 'S_TITOLO'); const s = P.s, e = x.indexOf('</w:tbl>', s) + 8;
  const proto = x.slice(s, e).replace(/ w14:(paraId|textId)="[^"]*"/g, '');
  const note = vsNoteWord(r); const tot = note.reduce((a, n) => a + (n.foto || []).length, 0); let fatte = 0;
  let out = '';
  for (const [k, n] of (note.length ? note : [{ titolo: '', testo: '', mig: '', foto: [] }]).entries()) {
    let b = hsFill(proto, 'S_TITOLO', n.titolo || 'Nota ' + (k + 1));
    b = hsFillBlock(b, 'S_SIT', n.testo || '', null, { grigio: false });
    b = hsFillBlock(b, 'S_MIG', n.mig || '', null, { grigio: false });
    const fp = hsPara(b, 'S_FOTO'); let ps = '';
    for (const id of (n.foto || [])) {
      fatte++; opt.onStep && opt.onStep(fatte, tot);
      const im = await hsImage(id); if (!im) continue;
      ps += fp.head + fp.ppr + hsImgRun(ctx, hsAddMedia(ctx, im.u8, im.png), im.w, im.h, Math.round(8.6 * CMx), Math.round(6.4 * CMx)) + '</w:p>';
    }
    b = hsReplacePara(b, 'S_FOTO', ps || null);
    out += (k ? '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' : '') + b;
  }
  x = x.slice(0, s) + out + x.slice(e);
  const ind = [r.indirizzo, r.citta].filter(Boolean).join(' – ');
  x = hsFillBlock(x, 'DESCRAREA', m.descrArea || '', null, { grigio: false });
  x = hsCloneRows(x, 'V_DATA', vsVisite(r), (row, v) => hsFill(hsFill(row, 'V_DATA', v ? dataIT(v.data) : ''), 'V_PRESENTI', v ? v.presenti : ''));
  const T = { TITOLO: m.titolo || r.sito || 'Verbale di sopralluogo', INDIRIZZO: ind, COMMITTENTE: r.cliente, FONDO: m.fondo, DATAREPORT: m.dataReport || dataIT(r.data),
    REDATTO: m.redatto || r.tecnico, VERIFICATO: m.verificato, PROTOCOLLO: m.protocollo, COMMESSA: r.commessa, PROCURA: m.procura, AN_INDIRIZZO: ind };
  Object.entries(T).forEach(([k, v]) => { x = hsFill(x, k, v || ''); });
  x = await vsSwapImg(x, ctx, 'COPERTINA', (r.img || {}).copertina, true);
  x = await vsSwapImg(x, ctx, 'INQUADRAMENTO', (r.img || {}).inquadramento, false);
  hsFinish(ctx, x, { ASSET: r.sito || m.titolo || '', MESEANNO: meseAnno(r.data), REVISIONE: m.revisione || '00' });
  return hsZip(files);
}
async function vsWord(r, settings) {
  const name = vsFileBase(r) + '.docx';
  const h = await pickSave(name, 'Documento Word', DOCX_MIME, '.docx'); if (h === 'cancel') return;
  try {
    const blob = await vsBuildDocx(r, settings, { onStep: (n, t) => _progress({ title: 'Preparo il Word', text: `Foto ${n} di ${t}`, done: n, total: t }) });
    _progress(null); await saveOffice(h, blob, name);
  } catch (e) { _progress(null); fail('Word non creato', e, recordTitle(r)); }
}
