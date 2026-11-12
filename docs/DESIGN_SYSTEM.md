# Design system: Rilievo

Rilievo è il design system di Nembo. I valori vivono all'inizio di `styles.css` (token) e in `js/core.js` (`TIPO_COL`, `PRINT`).
La documentazione completa con le anteprime dei componenti è nel pacchetto di passaggio (cartella `Rilievo/`), fuori dal repository.

Regola: nessun colore, dimensione del testo, raggio o spazio scritto a mano nel CSS o negli `style=` del codice; solo token e classi. I vecchi nomi dei colori (`--primary`, `--nc`, `--border`, `--amber`…) non esistono più. Se un elemento va fatto in modo diverso da Rilievo, si segnala e, dopo l'approvazione, si aggiornano Rilievo e questo documento.

## 1. Temi

| Tema | Attributi | Carattere |
|---|---|---|
| Essenziale (predefinito) | nessun `data-theme` | grigio freddo e blu, stile iOS |
| Essenziale scuro | `data-theme="scuro"` + `data-mode="scuro"` | fondi quasi neri, accenti schiariti |
| Originale | `data-theme="originale"` | rosa-grigio con accento petrolio |
| Originale scuro | `data-theme="originale-scuro"` + `data-mode="scuro"` | grafite calda, blocco d'accento petrolio |

Stile (`nembo_style`) e aspetto (`nembo_mode`: automatico, chiaro, scuro) si scelgono separatamente e restano sul dispositivo. `core.js` li applica prima del primo disegno.

## 2. Colori (Essenziale chiaro)

| Ruolo | Token | Valore |
|---|---|---|
| Fondo, card | `--bg`, `--card` | `#f2f2f7`, `#ffffff` |
| Riempimenti, binario, separatori | `--fill-soft`, `--track`, `--sep` | `#eef0f4`, `#e4e5eb`, `#e1e3ea` |
| Testo | `--text`, `--text2`, `--muted`, `--faint` | `#1c1f2b`, `#4a4f60`, `#5f6474`, `#686d7c` |
| Decorazione (frecce) | `--chev` | `#c0c4ce` (mai per il testo) |
| Primario interattivo | `--blue`, `--blue-dk`, `--blue-soft` | `#0366c8`, `#0256a8`, `#e6f0fb` |
| Pulsante principale | `--grad-pri`, `--sh-pri` | gradiente `#02479a → #0366c8 → #0877cc` |
| Blocco d'accento | `--navy`, `--navy-tx`, `--navy-tx2`, `--navy-glow` | `#243257` con luce blu radiale |
| Testo su colori pieni | `--on-accent`, `--on-dark` | bianco (nei temi scuri `--on-accent` è inchiostro) |
| Successo | `--ok`, `--ok-soft` | `#17744a`, `#e3f3ea` |
| Attenzione | `--warn`, `--warn-soft` | `#94590f`, `#fff1de` |
| Errore | `--danger`, `--danger-soft`, `--danger-on-navy` | `#bf3131`, `#fdecea`, `#ff8b7e` |
| Matrici (pallini e sigle) | `--mca`, `--fav`, `--terreni`, `--acque`, `--altro`, `--rec` | magenta, ocra, terra, ottanio, bruno, oliva |
| Tipi di attività | `--t-dda`, `--t-map`, `--t-ra`, `--t-radon`, `--t-aria`, `--t-hse`, `--t-vs`, `--t-firme`, `--t-app` | uguali in menu, «Nuova attività», programmazione e Oggi (`TIPO_COL`) |
| Tag | `--tag-1` … `--tag-8` | otto toni smorzati, lontani da stati e tipi |
| Superfici media | `--media`, `--plan-canvas`, `--paper` | fotocamera, planimetria, firma: uguali in tutti i temi |
| Stampa | `PRINT` in `core.js` | colori fissi di PDF, Word, Excel, planimetrie ed email |

Penne della planimetria (`PLAN_COLORS` in `plan.js`), fisse perché finiscono nel PDF: `#d62828`, `#ea580c`, `#facc15`, `#15803d`, `#0891b2`, `#1d4ed8`, `#7c3aed`, `#111111`.

## 3. Tipografia

- Solo IBM Plex, inclusi in `fonts/`: Sans 400, 500, 600, 700; Mono 500 e 600 per sigle, codici e versioni.
- Scala unica: `--fs-2xs` 11 · `--fs-xs` 12 · `--fs-sm` 13 · `--fs-md` 14 · `--fs-base` 15 · `--fs-lg` 16 · `--fs-xl` 17 · `--fs-2xl` 20 · `--fs-3xl` 22 · `--fs-4xl` 28 · `--fs-5xl` 34 (px).
- Titolo di schermata 34/700, titolo di scheda 28/700, occhiello 12/600 maiuscolo, titoli di riga 15–16/600, corpo 15/400, codici in Mono.
- I campi non scendono sotto 16 px (niente zoom su iOS). Numeri dei widget con `tabular-nums`.

## 4. Spazi, raggi, ombre

| Gruppo | Token |
|---|---|
| Spazi (scala di 4 px) | `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24; `--gutter` 16 (24 su PC), `--gap` 12 |
| Classi di spaziatura | `.mt-0` … `.mt-4`, `.mb-0`, `.mb-2`, `.lead-gap`, `.grow`, `.self-start`, `.fw-6` |
| Raggi | `--r-2xs` 4 · `--r-xs` 6 · `--r-sm` 8 · `--r-ctl` 10 · `--r-md` 12 · `--r-btn` 14 · `--r-card` 18 · `--r-card-lg` 22 · `--r-pill` · `--r-sq` 30 % (squircle, con `corner-shape` dove c'è) |
| Ombre e veli | `--sh-pri`, `--sh-seg`, `--sh-card` (mai `none`, per combinarsi con l'indicatore di stato), `--sh-pop`, `--scrim`, `--scrim-strong` |
| Bersaglio minimo | `--tap` 44 px; pulsante principale 52 px |

## 5. Componenti

| Componente | Classi | Varianti e stati |
|---|---|---|
| Pulsante | `.btn` | `pri` (gradiente), predefinito (`--btn2`), `link`, `block`, `sm`, `danger`; disabilitato; con `.spin` in attesa |
| Pulsante icona | `.btn-icon`, `.fab`, `.ava` | `pri`, `on`, `glass`; contatore `.dot` (anche sull'avatar, v51) |
| Sincronizzazione (v51) | `.btn-icon` con icona `sync` | colore per stato: `--ok` aggiornata, `--warn` da aggiornare, `--danger` non riuscita, `--muted` non collegato; `.spin` in corso; `aria-label` con la parola |
| Controllo a segmenti | `.seg` | voce attiva su `--seg-thumb` |
| Tab bar / menu laterale | `.tabbar`, `.sidenav`, `.sn-it` | voce attiva `--blue` su `--blue-soft`; menu ridotto a icone |
| Barre in basso flottanti (v52) | `.tabbar`, `.abar`, `.selbar`, `.plan-bar` | stesso disegno ovunque: binario `--track` al 95 % sfocato, `--r-card`, `--sh-pop`, `--sp-3` dal bordo inferiore (più l'area sicura), dentro i margini `--gutter`, al massimo 528 px; pulsanti secondari trasparenti in `--text2`, principale con il gradiente. In selezione la barra dell'attività aperta accanto si nasconde |
| Card, blocco navy | `.card`, `.card-navy` | `tight`; navy con `--navy-glow` |
| Avviso | `.notice` | predefinito (fascia `--blue-sky`), `err` |
| Riga di elenco | `.rcard`, `.prow`, `.list` | `on` (aperta), selezionata, indicatore di stato |
| Indicatore di stato | `.st-bar` + `--st` | `st-ok`, `st-warn`, `st-err`, `st-info`, `st-off` (grigio `--muted`, «Non pertinente», v53): barra di 4 px a sinistra, sempre con la parola. Lo stato di sezioni e capitoli HSE si mostra sempre così, nel sopralluogo a note e in quello periodico (v55), non con i badge |
| Campo | `.inp`, `.fld`, `InpGrow`, `Appunti` | etichetta dentro il campo che sale quando scrivi (v56); un campo per riga; focus `--blue` 2 px; icone fotocamera, galleria, microfono in colonna sul bordo destro, in `--blue`, microfono pieno se attivo; importato con lucchetto |
| Schede | `Schede` (`.seg.schede`) | anche con lo scorrimento laterale sul contenuto (v56) |
| Elenco con titolo | `.list` + `.list-h` | titolo dentro la card, a tutta larghezza (v56) |
| Riepilogo | `RiepilogoPanel` (`.sheet.riep-sheet`), `RiepGo` | pannello dal basso, solo consultazione; avvisi con `st-bar st-warn` e la parola; azione principale in fondo (v56) |
| Interruttore, stepper | `Toggle`, `.stp` | acceso `--tgl-on` |
| Badge, tag, contatore | `.badge`, `.tag`, `.count` | `.count.crit` (`--danger`, v51) |
| Pulsante file | `.fbtn` | grigio da generare, verde generato, ambra da rigenerare |
| Elenco impostazioni | `.set-group`, `.set-row`, `.set-prof` | prima riga Notifiche (v51); voce aperta su PC |
| Foglio / finestra | `.sheet`, `.modal`, `.ov` | `sheet-nav` con il pulsante a sinistra: «Annulla» se chiudendo si perde ciò che è stato scritto o scelto, «Chiudi» se non c'è nulla da annullare (elenchi, opzioni, scelte applicate subito); «Indietro» per tornare al passo precedente, «Fine» dove si disegna o si firma |
| Selezione multipla | `.selhead`, `.selbar` | una sola azione in basso, nella barra flottante; dentro una scheda (note HSE e Verbale, v53) `.selhead.in` resta ferma in alto e l'azione «Tag (N)» è nella barra dell'attività |
| Tag a più elementi (v53) | `TagMultiSheet` | tag acceso = tutti, con «k/N» = alcuni, contorno = nessuno; `role="checkbox"` con `aria-checked` `mixed` |
| Microfono e fotocamera nel campo | `.mic-in`, `.cam-in` | tondi 36 px in `--fill-soft` in alto a destra del campo; la fotocamera sotto il microfono (in cima se la dettatura non c'è), contatore `.ck-badge`; miniature delle foto collegate sotto il campo (`.hs-fotos`) |
| Suggerimento, primi passi | `.tip`, `PrimiPassi` | uno solo per schermata |

## 6. Stati di schermata

| Stato | Come si mostra |
|---|---|
| Vuoto | `.empty`: titolo + cosa fare («Nessuna indagine» · «Tocca + …») |
| Caricamento | `.spin` nel pulsante o al centro; mai schermata bianca |
| Errore | `notice err` con codice; errori imprevisti in Notifiche (`APP-JS`); schermata «Qualcosa non ha funzionato» con Torna a Oggi, Ricarica, Segnala |
| Offline | l'app funziona; invii e sincronizzazione ripartono al ritorno della rete; icona di sincronizzazione arancione |
| Salvataggio | «Salvato» / «…» nell'intestazione della scheda |
| Fine giornata | messaggi positivi: «Giornata chiusa», «Niente in sospeso» |

## 7. Accessibilità

- Testo almeno 4,5:1 su fondo, card e `--fill-soft` in tutti e quattro i temi; sigle delle matrici e tag inclusi.
- Bersagli di almeno 44 × 44 px; righe delle impostazioni almeno 56 px.
- Il colore non è mai l'unico segnale: stato sempre con la parola (badge, etichetta, `aria-label`).
- Pulsanti icona sempre con `aria-label`; focus visibile in `--blue`.
- Leggi UX applicate (skill `ux-design-laws`): un'azione principale per schermata, in basso a portata di pollice.

## 8. Voce

Italiano, seconda persona singolare, frasi brevi. «Attività», mai «pratica»; mai «roba»; «essere», non «stare». Iniziale maiuscola solo sulla prima parola; sigle in maiuscolo (DDA, MCA, FAV, RA, HSE, NC). Percorsi con la freccia: «Impostazioni → OneDrive». Nessuna emoji.
