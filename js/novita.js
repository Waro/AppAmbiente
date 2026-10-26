/* Novità: cosa cambia a ogni aggiornamento. Al primo avvio dopo un aggiornamento compare il foglio delle novità
   (con una breve presentazione per gli aggiornamenti importanti); lo storico è in Impostazioni → Novità.
   Testi generici, senza dati reali: il file è pubblico. */

const NOVITA = [
  { v: 46, data: '2026-10-26', tipo: 'maggiore', titolo: 'Scheda File, Home e tema scuro',
    voci: [
      'Nuova scheda «File» in ogni attività: schede campioni, riepiloghi, scheda radon, schede aria, Word HSE e fogli firme. Grigio da generare, verde generato (tocca per aprirlo), ambra se i dati sono cambiati dopo. «Rigenera» crea una nuova revisione senza cancellare la precedente. I file vanno anche su OneDrive.',
      'Schede di prelievo campioni e aria dal modello aziendale, in Excel e in PDF uguali: 30 campioni per foglio, dal 31° un foglio in più, numero di pagina in fondo.',
      'Campioni: Piano, Ubicazione e Descrizione. Nella scheda per il laboratorio la descrizione è «Piano - Ubicazione - Descrizione»; la quantità resta nei riepiloghi Word ed email.',
      'Il campo Piano resta attivo mentre scrivi: il campione passa al nuovo gruppo quando esci dal campo.',
      'Manufatti non campionati (NC1, NC2…) in Mappatura e DDA Fase 2, con il campione di riferimento: compaiono nei riepiloghi.',
      'Planimetrie: ogni pianta ha il suo Piano; le etichette proposte sono quelle di quel piano, le altre in fondo sotto «Altri campioni». Un’etichetta già messa su un’altra pianta non viene più proposta.',
      'Più planimetrie o foto insieme: tieni premuto il primo file e poi tocca gli altri.',
      'Tasti foto tutti della stessa misura.',
      'Home più semplice: prossimo sopralluogo, attività di oggi, «Da completare», strumenti e dati. Il tasto + in basso avvia un nuovo sopralluogo; a fine giornata compare «Giornata chiusa».',
      'Tema scuro: in Impostazioni → Aspetto e avvio scegli tra sole (Essenziale), ciotola di ramen (Originale) e luna (Scuro).',
      'Programmazione: spunta «Drone» per DDA, Mappatura e Sopralluogo RA, con l’icona del drone nel calendario e negli elenchi.',
      'Nuova icona e nuova schermata di avvio.' ],
    slides: [
      { t: 'Scheda File', s: 'Tutti i documenti dell’attività in un posto: verde generato, ambra da rigenerare.', img: 'novita/v46-file.webp' },
      { t: 'Home più semplice', s: 'Prossimo sopralluogo, attività di oggi e cose da completare. Il + in basso avvia un sopralluogo.', img: 'novita/v46-home.webp' },
      { t: 'Tema scuro', s: 'Sole, ramen o luna: scegli in Impostazioni → Aspetto e avvio.', img: 'novita/v46-tema.webp' },
    ] },
  { v: 45, data: '2026-10-21', tipo: 'maggiore', titolo: 'Planimetrie e foto',
    voci: [
      'Planimetrie: nuova modalità di spostamento più fluida e scrittura più semplice.',
      'Nuovi strumenti sulle planimetrie: penna, evidenziatore, linea, freccia, rettangolo, cerchio, testo e gomma, con colori e spessori a scelta. Le frecce indietro e avanti annullano e ripristinano.',
      '«Solo penna»: con la penna del tablet il dito sposta la pianta e non lascia segni.',
      'Foto: il tasto fotocamera apre la fotocamera del telefono, con la sua qualità e tutte le lenti. Per le foto già scattate c’è il tasto Galleria accanto.',
      'La fotocamera di Nembo, per scattare più foto di seguito, si attiva in Impostazioni → Foto.',
      'HSE: il microfono per dettare è dentro il campo di testo.',
      'HSE: le foto di anagrafica, copertina e inquadramento si possono scattare con la fotocamera.' ],
    slides: [
      { t: 'Planimetrie: disegna e scrivi', s: 'Due dita per muoverti, un dito o la penna per disegnare. Linee, frecce, forme, testo e gomma.', img: 'novita/v45-planimetrie.webp' },
      { t: 'Foto più nitide', s: 'Si scatta con la fotocamera del telefono, con tutte le sue lenti. La galleria è nel tasto accanto.', img: 'novita/v45-foto.webp' },
    ] },
  { v: 44, data: '2026-10-20', tipo: 'minore', titolo: 'Nuovo logo',
    voci: ['Nuovo logo di Nembo: icona dell’app e menu laterale.'] },
  { v: 43, data: '2026-10-20', tipo: 'minore', titolo: 'Word del Verbale HSE',
    voci: [
      'Verbale HSE: «Genera Word» compila il modello del verbale; ogni nota diventa una scheda con situazione rilevata, foto e attività di miglioramento.',
      'Nuovi campi del verbale: dati del report, descrizione dell’area, presenti, sopralluoghi precedenti, foto di copertina e inquadramento.',
      'Nelle note del verbale c’è il campo «Attività di miglioramento».',
      'Il modello si carica in Impostazioni → Modelli («Modello Word Verbale HSE»).' ] },
  { v: 42, data: '2026-10-20', tipo: 'maggiore', titolo: 'Opzioni e riepilogo via email',
    voci: [
      'In tutte le attività la barra in basso ha lo stesso schema: a sinistra planimetria o fotocamera, al centro l’azione principale, a destra ⋯ Opzioni.',
      'Opzioni raccoglie le azioni dell’attività: riepilogo via email, email al cliente, file JSON e modelli, schede campioni, foglio firme, ZIP, elimina.',
      'Riepilogo via email: testo e foto delle valutazioni da inviare con Outlook o da copiare nel messaggio, senza relazione.',
      'Sopralluogo RA: «Carica su OneDrive» al centro della barra; «Prossimo da verificare» accanto ai filtri dei manufatti.' ],
    slides: [
      { t: 'Opzioni dell’attività', s: 'Tocca ⋯ in basso a destra: tutte le azioni dell’attività in un posto solo.', img: 'novita/v42-opzioni.webp' },
      { t: 'Riepilogo via email', s: 'Valutazioni e foto pronte per un giro mail veloce: condividi con Outlook oppure copia e incolla nel messaggio.', img: 'novita/v42-riepilogo.webp' },
    ] },
  { v: 41, data: '2026-10-20', tipo: 'maggiore', titolo: 'Foto con zoom e dati protetti',
    voci: [
      'Foto con zoom: due dita o doppio tocco sul telefono, rotella o doppio clic sul PC.',
      'Dati importati protetti: si vedono come testo con un lucchetto. Tocca il lucchetto per modificarli; «Ripristina» riporta il valore importato.',
      'Sopralluogo RA: i manufatti si possono creare dai campioni MCA di una Mappatura o di una DDA Fase 2 dello stesso immobile.',
      'Anagrafica importata da file nelle DDA e negli HSE protetta allo stesso modo.',
      'Novità: a ogni aggiornamento trovi qui cosa è cambiato.' ],
    slides: [
      { t: 'Foto con zoom', s: 'Due dita o doppio tocco per ingrandire, trascina per muoverti nella foto.', img: 'novita/v41-zoom.webp' },
      { t: 'Dati importati protetti', s: 'I dati del PMC, dell’anno precedente o dei file si leggono interi e non si cambiano per sbaglio. Tocca il lucchetto per modificarli.', img: 'novita/v41-lucchetto.webp', vai: 'raList' },
      { t: 'Clienti e foglio firme', s: 'In Clienti salvi referenti e preferenze. Con il foglio firme attivo, ogni nuova attività ha il modulo pronto con campioni o manufatti.', img: 'novita/v41-clienti.webp', vai: 'cliList' },
    ] },
  { v: 40, data: '2026-10-19', tipo: 'maggiore', titolo: 'Clienti e foglio firme pronto',
    voci: [
      'Anagrafica clienti in Strumenti → Clienti, con preferenze per foglio firme e invio email.',
      'Nuova attività: cliente e spunta «Foglio firme» nei dati di partenza.',
      'Foglio firme con i dati dell’attività e l’elenco di campioni, manufatti o punti di monitoraggio.',
      'Campo «firme» nei modelli JSON della Programmazione e dell’RA.',
      'Tasto per preparare l’email al cliente.' ] },
  { v: 39, data: '2026-10-19', tipo: 'minore', titolo: 'Nuova schermata di avvio',
    voci: ['Nuova schermata di caricamento e nuova icona dell’app.'] },
  { v: 38, data: '2026-10-19', tipo: 'minore', titolo: 'Fotocamera con galleria',
    voci: [
      'Fotocamera dentro Nembo con la galleria in basso a sinistra.',
      'Notifiche di OneDrive con i tasti Ricarica e Apri attività.',
      'Ubicazioni e postazioni lunghe leggibili per intero.' ] },
];
const verNum = v => +String(v || '').replace(/\D/g, '') || 0;
const novitaFino = n => NOVITA.filter(x => x.v <= verNum(APP_VERSION) && x.v > n);

// novità da mostrare a questo avvio (una volta per dispositivo); null se niente
async function novitaDaMostrare(haDati) {
  const cur = verNum(APP_VERSION);
  let seen = await DB.get('novita_vista');
  if (seen == null) {
    // prima installazione: niente novità; chi usava già Nembo vede quelle dalla v38 in poi
    if (!haDati) { await DB.set('novita_vista', cur); return null; }
    seen = 37;
  }
  if (seen >= cur) return null;
  const list = novitaFino(seen);
  await DB.set('novita_vista', cur);
  if (!list.length) return null;
  notify('new', list.length === 1 ? `Novità della versione v${list[0].v}` : `Novità delle versioni v${list[list.length - 1].v}–v${list[0].v}`,
    { detail: list.map(x => x.titolo).join(' · '), items: list.flatMap(x => x.voci.map(t => `v${x.v} · ${t}`)) });
  return list;
}

function NovitaSheet({ list, onClose, go }) {
  useBackClose(onClose);
  const slides = (list.find(x => x.slides && x.slides.length) || {}).slides || [];
  const [k, setK] = useState(0);
  const sw = useRef(null);
  const S = slides[k];
  return html`<div class="sheet-ov" onClick=${e => e.target === e.currentTarget && onClose()}>
    <div class="sheet tall nv-sheet" role="dialog" aria-label="Novità">
      <div class="sheet-grab"></div>
      <div class="sheet-nav"><span></span><b>Novità</b><button class="btn link" style="justify-self:end" onClick=${onClose}>Chiudi</button></div>
      <div class="sheet-body">
        ${S && html`<div class="nv-show" onTouchStart=${e => { sw.current = e.touches[0].clientX; }}
            onTouchEnd=${e => { const d = e.changedTouches[0].clientX - (sw.current || 0); if (Math.abs(d) > 50) setK(x => Math.min(slides.length - 1, Math.max(0, x + (d < 0 ? 1 : -1)))); }}>
          <div class="nv-img"><img src=${S.img} alt="" /></div>
          <div class="nv-txt"><b>${S.t}</b><p>${S.s}</p></div>
          <div class="nv-nav">
            <button class="btn-icon" aria-label="Precedente" disabled=${k === 0} onClick=${() => setK(k - 1)}><${Icon} n="back" s=${20} /></button>
            <div class="nv-dots">${slides.map((_, i) => html`<i key=${i} class=${i === k ? 'on' : ''} onClick=${() => setK(i)}></i>`)}</div>
            ${k < slides.length - 1 ? html`<button class="btn-icon" aria-label="Successiva" onClick=${() => setK(k + 1)}><${Icon} n="right" s=${20} /></button>`
              : S.vai ? html`<button class="btn sm" onClick=${() => { onClose(); setTimeout(() => go({ v: S.vai }), 60); }}>Prova</button>` : html`<span style="width:44px"></span>`}
          </div></div>`}
        ${list.map(x => html`<div key=${x.v}>
          <div class="sec-h"><h3>v${x.v} · ${x.titolo}</h3><span class="hint">${fmtD(x.data)}</span></div>
          <div class="card tight"><ul class="nv-list">${x.voci.map((t, i) => html`<li key=${i}>${t}</li>`)}</ul></div></div>`)}
        <button class="btn pri block" style="margin-top:14px" onClick=${onClose}>Ho capito</button>
      </div>
    </div>
  </div>`;
}

// Impostazioni → Novità: storico e presentazione
function NovitaCard({ go }) {
  const [open, setOpen] = useState(null);
  const tutte = novitaFino(0);
  return html`<div class="card tight">
    ${tutte.slice(0, 4).map(x => html`<button class="prow nv-row" key=${x.v} onClick=${() => setOpen([x])}>
      <span class="t"><b>v${x.v} · ${x.titolo}</b><small>${fmtD(x.data)} · ${x.voci.length} ${x.voci.length === 1 ? 'novità' : 'novità'}</small></span><${Icon} n="right" s=${18} /></button>`)}
    <button class="btn block" style="margin-top:8px" onClick=${() => setOpen(tutte)}>Tutte le novità</button>
    ${open && html`<${NovitaSheet} list=${open} go=${go} onClose=${() => setOpen(null)} />`}
  </div>`;
}
