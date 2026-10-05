# Nembo

App web (PWA) per Android: DDA ambientali (Fase 1 e Fase 2), campagne radon, sopralluoghi RA amianto e sopralluoghi H&S.
I dati restano sul telefono (IndexedDB), senza server, senza login e senza SharePoint.

## Pubblicazione su GitHub Pages (una volta sola)

1. Crea un repository su GitHub. Tutto ciò che carichi è leggibile da chiunque (anche il sito Pages di un repository privato è pubblico): per questo il codice non contiene dati personali, del laboratorio o delle offerte, né i moduli aziendali.
2. Carica **il contenuto** di questa cartella nella radice del repository (index.html deve stare in radice).
3. Settings → Pages → Source: "Deploy from a branch", branch `main`, cartella `/ (root)`.
4. Dopo un minuto l'app è su `https://<utente>.github.io/<repository>/`.

Serve HTTPS: fotocamera, GPS e installazione funzionano solo così. GitHub Pages va bene.

## Installazione sul telefono

Apri il link con **Chrome su Android** → menu ⋮ → "Installa app" (oppure il tasto "Installa app" nella home).
Da installata funziona anche offline e Chrome protegge i dati dalla pulizia automatica.

## Primo avvio su ogni dispositivo

Impostazioni → **Carica configurazione** e scegli il file `.json` ricevuto (da OneDrive, email o Teams).
Contiene impostazioni (tecnico, laboratorio, offerta, codici analisi) e i due modelli PDF. Resta solo su quel dispositivo.
In alternativa si caricano i modelli e si compilano i campi a mano.

**Preparare la configurazione per un collega:** compila le impostazioni sul tuo dispositivo, tocca **Esporta**,
poi nel file `.json` cambia `tecnicoNome`, `tecnicoCognome` e `prelevatoDa` (o lascia che li cambi lui dopo il caricamento).
La firma salvata non viene mai esportata. Il file contiene dati riservati: mai su GitHub.

## Importazione Fase 1 e checklist Fase 2

**Import da JSON (Fase 1):** in fondo alla Fase 1 c'è "Carica .json" / "Scarica modello". Il modello mostra lo schema atteso
(uso del sito, checklist, aree REC, interviste, appunti). Per compilarlo: incolla a Claude un DDA precedente o dei documenti
e chiedigli di generare il JSON su quello schema, poi caricalo qui. Riempie solo i campi ancora vuoti della scheda corrente:
non sovrascrive mai un dato già inserito, e lo dice quanti campi ha toccato.

**Checklist "Punti da campionare" (Fase 2):** elenco libero di cosa si prevede di campionare (matrice, cosa, dove), utile per
non dimenticare nulla sul campo. "Da aree REC" propone una voce per ogni area REC della Fase 1 non ancora ripresa.
Il tasto "Preleva" apre la matrice giusta e crea il campione già con descrizione e ubicazione, spuntando la voce come fatta.

## Sopralluogo RA (Responsabile Amianto)

Terza area della home. Si parte dalla mappatura o dal PMC del sito: "Scarica modello" dà lo schema JSON
(dati del sito e un elenco "manufatti" con codice, ubicazione, descrizione, tipologia, quantità, stato e note del sopralluogo precedente).
Il file si fa preparare a Claude dal documento, poi si carica con "Carica .json": nasce la lista dei manufatti.
Ricaricando un file si aggiungono solo i codici nuovi; quelli già presenti non vengono toccati.

Per ogni manufatto: stato di conservazione (classi del DM 06/09/1994 più "Non ispezionabile" e "Rimosso o bonificato"),
note e fino a 3 foto. Se il file riporta lo stato del sopralluogo precedente, compare come riferimento.
Barra di avanzamento e filtro "Da verificare". Le planimetrie usano come etichette i codici dei manufatti, colorati per stato.

## Sopralluogo H&S

Modello unico per i sopralluoghi di salute e sicurezza sugli immobili, valido per qualunque committente
(nel codice non c'è nessun nome di cliente). Unisce:
- **16 schede tematiche** (agibilità, prevenzione incendi, aree esterne, copertura, strutture, interni, autorimessa,
  locali tecnici, impianti, sollevamento, ambienti pericolosi, aspetti ambientali, emergenze, presidio del sito), ciascuna con
  situazione rilevata (anche per sotto-area), attività di miglioramento e valutazione: natura del rischio, costo indicativo,
  priorità 1-2-3, competenza proprietà/conduttore, termine. Ogni scheda si può segnare "Non applicabile".
- **Checklist a codici** (3.1 … 7.9, 94 voci) con Sì / No / N.A. e note. Ogni voce sa qual è la risposta attesa:
  l'esito negativo si colora di rosso e propone "+ Criticità" già compilata.
- **Criticità**: codice, situazione rilevata, rischio evidenziato, gravità (1 alta, 2 media, 3 bassa), azioni consigliate e
  fino a 3 foto. "Riformula in linguaggio tecnico" trasforma la nota scritta in sito nella formulazione standard (offline,
  con regole fisse: se nessuna regola corrisponde il testo resta com'è). La priorità della scheda, se vuota, viene suggerita
  dalla criticità più grave.
- Frasi rapide sotto i campi di testo, anagrafica dell'immobile con dati catastali, planimetrie con le criticità come etichette.

**Report precedente:** "Scarica modello" dà lo schema JSON; si fa compilare a Claude dal report dell'anno prima e si carica con
"Carica .json". Riempie solo i campi vuoti e aggiunge le criticità nuove. Il testo importato diventa il riferimento: nel report Word
le righe nuove o modificate escono in rosso e, nella checklist, sotto la voce compare la risposta precedente se è cambiata.

**Report sopralluogo (Word):** documento .docx neutro (senza loghi né intestazioni di cliente) con dati generali, anagrafica, schede con
checklist e valutazione, tabella criticità con legenda, riepilogo schede e foto. Finisce anche nello ZIP e nel caricamento su OneDrive.
I modelli Word dei singoli committenti non sono nel codice: i dati restano compatibili (stessi codici e campi) per riportarli lì.

## Excel e Word

- **Scheda campioni in Excel** (Fase 2, schede MCA e FAV): stessi dati della scheda PDF in un foglio .xlsx modificabile, con date in formato Excel.
- **Riepilogo campioni (Word)** (Archivio della DDA): documento .docx con intestazione della commessa e tutti i campioni prelevati,
  divisi per matrice, con data, descrizione e foto (tre per riga, ridotte per contenere il peso del file).
Entrambi si salvano con la finestra "Salva con nome" (si può scegliere OneDrive) e finiscono anche nello ZIP e nel caricamento su OneDrive.

## Planimetrie

In ogni DDA (Fase 1 e Fase 2) e in ogni campagna radon c'è la sezione **Planimetrie**: carichi un PDF e lo apri nel visualizzatore (PDF.js).
- **Sposta**: scorri e ingrandisci con i tasti − e +.
- **Disegna**: a mano libera con il dito, in rosso, blu, nero o evidenziatore giallo. "Annulla" toglie l'ultimo tratto.
- **Etichette**: nel vassoio in basso compaiono i campioni (A1, F1, S1…) e le aree REC, oppure i punti R1, R2… nel radon.
  Tocchi l'etichetta, poi il punto sulla planimetria. Trascinandole le sposti, con × le togli. Ogni campione nuovo compare da solo nel vassoio.

Toccando **Fine** l'app fonde disegni ed etichette in un nuovo PDF ("_annotata"). Il PDF originale resta intatto e le annotazioni
restano modificabili: riaprendo la planimetria le ritrovi e il PDF annotato viene rigenerato. Nello ZIP ci sono entrambi,
su OneDrive e nella condivisione va la versione annotata.

**Appunti:** campo libero separato per Fase 1 e Fase 2 del DDA; nel radon un campo per ogni sopralluogo (posa e ritiri) più gli appunti generali.

## File su OneDrive

**Con l'account Microsoft 365 collegato** (Impostazioni → OneDrive → Accedi): "Carica su OneDrive" invia foto, allegati,
PDF e `dati.json` nella cartella dell'app dentro OneDrive › App, una cartella per indagine o campagna. Il nome di quella cartella dipende dal **nome registrato per l'app in Entra ID**, non dal codice: se rinomini l'app qui, per cambiare anche il nome della cartella su OneDrive va rinominata separatamente la app registration in Entra ID (basta il nome visualizzato, non serve ricreare le credenziali).
Foto e allegati si caricano una volta sola; PDF e dati.json vengono sostituiti a ogni invio. Backup → "Carica tutto su OneDrive" invia tutto l'archivio.
Permesso usato: `Files.ReadWrite.AppFolder` (delegato): l'app scrive solo nella propria cartella, non legge e non cancella nulla.
Controlli: solo PDF, JPEG, PNG verificati sul contenuto, massimo 60 MB, nomi ripuliti, registro degli ultimi caricamenti in Impostazioni.
ID applicazione e ID tenant stanno nel file di configurazione, non nel codice.

**Senza collegamento**: "Invia PDF e foto a OneDrive" usa la condivisione di Android (a gruppi di 10), oppure "Salva tutto in un file ZIP".

## Tablet

Su schermi larghi la app si adatta in due modi, in base alla larghezza (non all'orientamento in sé, così vale anche
ridimensionando una finestra su PC):
- **Sotto i 1000px** (telefono, tablet in verticale): stessa navigazione a schermo singolo di sempre, solo con una
  colonna un po' più larga tra 600 e 999px.
- **Da 1000px in su** (tablet in orizzontale, PC): elenco e scheda stanno affiancati nello stesso schermo — si tocca
  una pratica nell'elenco e si apre subito a destra, senza cambiare schermata. Ruotando il tablet si passa dall'uno
  all'altro senza perdere la pratica aperta.

Su tablet Android con Chrome vero (es. Galaxy Tab, Redmi Pad) tutte le funzioni restano invariate, scanner barcode
e salvataggio incluso. Su iPad, come su iPhone, Safari/WebKit non supporta lo scanner barcode né la scelta della
cartella nel salvataggio (resta il download semplice).

## Aggiornare l'app

Modifica i file, poi in `sw.js` aumenta `VERSION` (es. `nembo-v2`) e ricarica su GitHub.
Al secondo avvio dopo l'aggiornamento il telefono usa la nuova versione. I dati non vengono toccati.

## Struttura

| File | Contenuto |
|---|---|
| `index.html`, `styles.css` | pagina e stile |
| `js/core.js` | archivio locale, foto, condivisione, componenti comuni |
| `js/capture.js` | scanner codici a barre (BarcodeDetector di Chrome) e firma a schermo intero |
| `js/dda.js` | modulo DDA: checklist, aree REC con GPS, campioni per matrice, risultati CSC, scheda campioni |
| `js/radon.js` | modulo radon: punti R1…Rn, tre momenti con firme, esiti e media pesata |
| `js/hs.js` | modulo sopralluogo H&S: schede, checklist a codici, criticità, import JSON e report Word |
| `js/app.js` | navigazione, impostazioni, backup ZIP e ripristino |
| `pdfgen.js` | compilazione PDF (pdf-lib) |
| `vendor/` | librerie (Preact, htm, pdf-lib, JSZip, signature_pad), incluse per l'uso offline |

Se cambia il modulo radon, i nomi dei campi del nuovo PDF vanno rimappati in `RADON_ROWS` (pdfgen.js).
Non aggiungere mai al repository file con dati reali (moduli, offerte, backup ZIP).
Se cambia la scheda campioni, vanno ricontrollate le coordinate `SC_LINES` / `SC_COLS`.

## Da sapere

- **Backup**: lo ZIP contiene cartelle leggibili (foto, allegati, PDF) e `manifest.json` per il ripristino.
  Chrome Android non permette di condividere file .zip: finisce in Download, da lì si carica con l'app OneDrive.
  I PDF singoli invece si condividono direttamente su OneDrive.
- **Ripristino**: Backup → "Scegli file ZIP" (il selettore di Android mostra anche OneDrive).
- **Codici MCA/FAV**: si rinumerano eliminando un campione finché non generi la scheda campioni; da lì restano fissi.
- **Radon**: "Conferma e blocca" richiede data e firma del tecnico; blocca i dati di posa. "Sblocca" cancella le firme di quel momento.
  La media per punto è pesata sui giorni di esposizione di Fase 1 e Fase 2.
