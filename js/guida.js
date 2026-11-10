/* Guida: benvenuto al primo avvio, primi passi in due fasi e suggerimenti la prima volta che si apre una funzione.
   Testi generici, senza dati reali: il file è pubblico. Tutto resta solo su questo dispositivo.
   - Benvenuto: 4 slide nel foglio delle Novità; l'ultima fa scegliere la business unit (settings.buDefault).
   - Primi passi: Fase 1 «Prepara il dispositivo», Fase 2 «Prova sul campo». Si spuntano da soli con i dati veri.
   - Suggerimenti: una card per funzione, una volta sola (localStorage nembo_tips); si riattivano in Impostazioni → Guida. */

/* ---------------- suggerimenti ---------------- */
const TIPS_KEY = 'nembo_tips';
const tipsVisti = () => { try { return JSON.parse(localStorage.getItem(TIPS_KEY) || '[]'); } catch (e) { return []; } };
const tipsReset = () => { try { localStorage.removeItem(TIPS_KEY); } catch (e) {} };
const SUGGERIMENTI = {
  programmazione: { t: 'Programmazione', s: 'Tocca una fascia vuota o + per programmare un sopralluogo o un appuntamento. In alto passi da Giorno a Settimana e Mese. La durata proposta per ogni tipo si cambia in Impostazioni → Programmazione.' },
  planimetrie: { t: 'Planimetrie', s: 'Apri una pianta per scriverci sopra: penna, evidenziatore, forme, testo e gomma sono nella barra degli strumenti. Con «Solo penna» il dito sposta la pianta e scrive solo la penna del tablet.' },
  campioni: { t: 'Campioni', s: 'I codici si assegnano da soli: A1, A2… per MCA e F1, F2… per FAV. I manufatti non campionati sono NC1, NC2…, ognuno con il campione di riferimento.' },
  file: { t: 'Scheda File', s: 'Qui generi i documenti dell’attività. Grigio: da generare. Verde: generato e su OneDrive, tocca per aprirlo. Ambra: i dati sono cambiati, rigeneralo. «Rigenera» crea una nuova revisione senza cancellare la precedente.' },
  dettatura: { t: 'Dettatura', s: 'Il microfono nei campi di testo usa la dettatura di Chrome: per trascriverla, l’audio viene inviato ai server di Google. Se nel sopralluogo ci sono dati riservati, scrivi a mano.' },
  radon: { t: 'Dosimetri', s: 'Tocca lo scanner per leggere il codice a barre dei dosimetri: dopo ogni lettura passa da solo al punto successivo. Un codice già usato viene segnalato subito.' },
};
function Suggerimento({ id }) {
  const x = SUGGERIMENTI[id];
  const [show, setShow] = useState(() => !!x && !tipsVisti().includes(id));
  if (!show) return null;
  const close = () => { try { localStorage.setItem(TIPS_KEY, JSON.stringify([...new Set([...tipsVisti(), id])])); } catch (e) {} setShow(false); };
  return html`<div class="notice tip" role="note">
    <span class="tip-ic"><${Icon} n="spark" s=${18} /></span>
    <span class="tip-t"><b>${x.t}</b>${x.s}</span>
    <button class="tip-x" aria-label="Chiudi il suggerimento" onClick=${close}><${Icon} n="x" s=${18} /></button>
  </div>`;
}

/* ---------------- benvenuto (primo avvio) ---------------- */
const WL_TIPI = [['dda', 'leaf', 'DDA'], ['mappatura', 'pin', 'Mappatura'], ['ra', 'shield', 'RA'], ['radon', 'radon', 'Radon'], ['aria', 'air', 'Aria'], ['hs', 'helmet', 'HSE']];
const WL_BU = [['ambiente', 'leaf', 'Ambiente', 'DDA, mappature, sopralluoghi RA, radon e aria'], ['hs', 'helmet', 'HSE', 'Sopralluoghi e verbali HSE'], ['sicurezza', 'shield', 'Sicurezza', 'Attività non ancora in Nembo: Oggi resta vuoto']];
async function benvenutoDaMostrare(haDati, settings) {
  if (haDati || (settings && settings.tecnicoCognome)) return false;
  return !(await DB.get('benvenuto_visto'));
}
function BenvenutoSheet({ settings, setSettings, onClose }) {
  const [k, setK] = useState(0);
  const [bu, setBu] = useState(settings.buDefault || 'ambiente');
  const sw = useRef(null);
  const fine = () => { DB.set('benvenuto_visto', Date.now()); if ((settings.buDefault || 'ambiente') !== bu) setSettings({ ...settings, buDefault: bu }); onClose(); };
  useBackClose(fine);
  const art = [
    html`<div class="wl-art"><img class="wl-logo" src="icons/icon-192.png" alt="" /></div>`,
    html`<div class="wl-art"><div class="wl-types">${WL_TIPI.map(([t, ic, l]) => html`<span key=${t}><i class="sq tint" style=${'--c:' + TIPO_COL[t]}><${Icon} n=${ic} s=${22} /></i>${l}</span>`)}</div></div>`,
    html`<div class="wl-art"><div class="wl-files">
      ${[['Scheda campioni MCA', 'Generato', 'wl-ok'], ['Riepilogo campioni', 'Da rigenerare', 'wl-warn'], ['Planimetrie', 'Da generare', '']].map(([l, s, c]) => html`<div class=${'wl-file ' + c} key=${l}><${Icon} n="file" s=${18} /><b>${l}</b><small>${s}</small></div>`)}</div></div>`,
    html`<div class="wl-bu" role="radiogroup" aria-label="Business unit">${WL_BU.map(([v, ic, l, d]) => html`<button key=${v} role="radio" aria-checked=${bu === v} class=${'wl-opt' + (bu === v ? ' on' : '')} onClick=${() => setBu(v)}>
      <i class="sq tint" style=${'--c:' + (v === 'hs' ? TIPO_COL.hs : v === 'ambiente' ? TIPO_COL.dda : 'var(--muted)')}><${Icon} n=${ic} s=${20} /></i><span><b>${l}</b><small>${d}</small></span>
      ${bu === v && html`<${Icon} n="check" s=${18} w=${2.6} />`}</button>`)}</div>`,
  ];
  const txt = [
    ['Benvenuto in Nembo', 'Raccogli dati, foto e planimetrie dei sopralluoghi sul telefono o sul tablet, anche senza rete. I dati restano su questo dispositivo e vanno su OneDrive quando lo colleghi.'],
    ['Ogni attività ha il suo colore', 'DDA, mappature, sopralluoghi RA, campagne radon, monitoraggi dell’aria e sopralluoghi HSE. Il tasto + in basso apre un nuovo sopralluogo.'],
    ['Dal campo al file', 'Nella scheda File di ogni attività generi schede campioni, riepiloghi e report. Verde: generato e su OneDrive. Ambra: i dati sono cambiati, da rigenerare.'],
    ['Scegli la tua Business Unit', 'Decide le attività che vedi in Oggi. Puoi cambiarla quando vuoi in Impostazioni → Aspetto e avvio.'],
  ];
  const last = k === txt.length - 1;
  return html`<div class="sheet-ov">
    <div class="sheet tall nv-sheet" role="dialog" aria-label="Benvenuto">
      <div class="sheet-grab"></div>
      <div class="sheet-nav"><span></span><b>Benvenuto</b>${last ? html`<span></span>` : html`<button class="btn link" style="justify-self:end" onClick=${() => setK(txt.length - 1)}>Salta</button>`}</div>
      <div class="sheet-body">
        <div class="nv-show" onTouchStart=${e => { sw.current = e.touches[0].clientX; }}
            onTouchEnd=${e => { const d = e.changedTouches[0].clientX - (sw.current || 0); if (Math.abs(d) > 50) setK(x => Math.min(txt.length - 1, Math.max(0, x + (d < 0 ? 1 : -1)))); }}>
          <div class=${'nv-img' + (last ? ' wl-last' : '')}>${art[k]}</div>
          <div class="nv-txt"><b>${txt[k][0]}</b><p>${txt[k][1]}</p></div>
          <div class="nv-nav">
            <button class="btn-icon" aria-label="Precedente" disabled=${k === 0} onClick=${() => setK(k - 1)}><${Icon} n="back" s=${20} /></button>
            <div class="nv-dots">${txt.map((_, i) => html`<i key=${i} class=${i === k ? 'on' : ''} onClick=${() => setK(i)}></i>`)}</div>
            ${last ? html`<span style="width:44px"></span>` : html`<button class="btn-icon" aria-label="Successiva" onClick=${() => setK(k + 1)}><${Icon} n="right" s=${20} /></button>`}
          </div></div>
        <button class="btn pri block mt-4" onClick=${last ? fine : () => setK(k + 1)}>${last ? 'Inizia' : 'Avanti'}</button>
      </div></div></div>`;
}

/* ---------------- primi passi in due fasi ---------------- */
const onbHidden = () => { try { return localStorage.getItem('nembo_onb') === 'hide'; } catch (e) { return false; } };
const onbReset = () => { try { localStorage.removeItem('nembo_onb'); } catch (e) {} };
const isActivity = r => r.type !== 'cli' && r.type !== 'app' && !r._new;
function PrimiPassi({ settings, records = [], tplOk, hsTplOk, lastBackup, goSettings, goBackup, newAct, installEvt, onInstall }) {
  const [, force] = useState(0);
  const [hide, setHide] = useState(onbHidden);
  useEffect(() => OD.subscribe(() => force(x => x + 1)), []);
  if (hide) return null;
  const bu = settings.buDefault || 'ambiente';
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const acts = records.filter(isActivity);
  const syncOk = !!OD.account && Sync.enabled();
  const fase1 = [
    { ok: !!(settings.tecnicoCognome && (bu !== 'ambiente' || tplOk)), l: 'Carica la configurazione', s: 'Impostazioni → File di configurazione: carica il .json o ripristina da OneDrive', go: () => goSettings('config') },
    bu === 'hs' && { ok: !!hsTplOk, l: 'Carica i modelli Word HSE', s: 'Impostazioni → Modelli', go: () => goSettings('modelli') },
    { ok: !!settings.firmaTecnico, l: 'Salva la tua firma', s: 'Impostazioni → Tecnico', go: () => goSettings('tecnico') },
    { ok: syncOk, l: 'Collega OneDrive', s: OD.account ? 'Impostazioni → OneDrive → Sincronizza tra i dispositivi' : 'Impostazioni → OneDrive → Accedi', go: () => goSettings('onedrive') },
    { ok: installed, l: "Installa l'app", s: installEvt ? 'Tocca per installarla' : 'Menu ⋮ di Chrome → Installa app', go: installEvt ? onInstall : null },
  ].filter(Boolean);
  const fase2 = [
    { ok: acts.length > 0, l: 'Crea un’attività di prova', s: 'Tocca + e scegli un tipo: potrai eliminarla dopo', go: newAct },
    { ok: acts.some(r => photoItems(r).ok > 0), l: 'Scatta una foto', s: 'Su un campione, un manufatto o un punto' },
    { ok: acts.some(r => Object.values(r.files || {}).some(L => L && L.length)), l: 'Genera un file', s: 'Scheda File dell’attività → Genera' },
    { ok: !!lastBackup, l: 'Fai un backup', s: 'Oggi → Backup', go: goBackup },
  ];
  const ok1 = fase1.every(x => x.ok), all = [...fase1, ...fase2], n = all.filter(x => x.ok).length;
  // chi usa già Nembo da tempo non rifà la prova sul campo
  if (ok1 && acts.length > 3 && !fase2.every(x => x.ok)) return null;
  const close = () => { try { localStorage.setItem('nembo_onb', 'hide'); } catch (e) {} setHide(true); };
  if (n === all.length) return html`<div class="card onb onb-done">
    <span class="onb-big"><${Icon} n="check" s=${22} w=${2.6} /></span>
    <div class="t"><b>Pronto per il primo sopralluogo</b><small>Hai preparato il dispositivo e provato il giro completo, dal campo al file. Al prossimo sopralluogo tocca +.</small></div>
    <button class="btn sm" onClick=${close}>Chiudi</button></div>`;
  const steps = ok1 ? fase2 : fase1;
  const item = x => html`<button class=${'onb-it' + (x.ok ? ' ok' : '')} key=${x.l} disabled=${x.ok || !x.go} onClick=${x.go}>
      <span class="onb-ck">${x.ok && html`<${Icon} n="check" s=${14} w=${2.6} />`}</span>
      <span class="t"><b>${x.l}</b>${!x.ok && html`<small>${x.s}</small>`}</span>${!x.ok && x.go && html`<${Icon} n="right" s=${16} />`}</button>`;
  return html`<div class="card onb">
    <div class="onb-top">
      <div class="ring-wrap" aria-hidden="true"><${Ring} p=${n / all.length} size=${44} w=${5} color="var(--ok)" /></div>
      <div class="t"><b>Primi passi</b><small>Fase ${ok1 ? 2 : 1} di 2 · ${ok1 ? 'Prova sul campo' : 'Prepara il dispositivo'}</small></div>
      <span class="onb-of">${n} di ${all.length}</span></div>
    ${ok1 && html`<div class="onb-it ok onb-fase"><span class="onb-ck"><${Icon} n="check" s=${14} w=${2.6} /></span><span class="t"><b>Dispositivo pronto</b></span></div>`}
    ${steps.map(item)}
    <button class="btn link" style="margin-top:4px;font-size:var(--fs-sm)" onClick=${close}>Nascondi</button>
  </div>`;
}

/* ---------------- Impostazioni → Guida ---------------- */
function GuidaCard({ settings, setSettings }) {
  const [wl, setWl] = useState(false);
  return html`<div class="card tight">
    <p class="lead" style="margin:6px 0 10px">Il benvenuto, i primi passi e i suggerimenti che compaiono la prima volta che apri una funzione.</p>
    <button class="btn block" onClick=${() => setWl(true)}><${Icon} n="spark" s=${17} /> Rivedi il benvenuto</button>
    <button class="btn block mt-2" onClick=${() => { tipsReset(); toast('I suggerimenti ricompaiono quando apri ogni funzione'); }}>Mostra di nuovo i suggerimenti</button>
    <button class="btn block mt-2" onClick=${() => { onbReset(); toast('I primi passi ricompaiono in Oggi'); }}>Mostra di nuovo i primi passi</button>
    ${wl && html`<${BenvenutoSheet} settings=${settings} setSettings=${setSettings} onClose=${() => setWl(false)} />`}
  </div>`;
}


