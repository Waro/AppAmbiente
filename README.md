# Nembo

App web (PWA) per Android: DDA ambientali (Fase 1 e Fase 2), mappature, campagne radon, sopralluoghi RA amianto e sopralluoghi H&S.
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
Contiene impostazioni (tecnico, laboratorio, offerta, codici analisi, valori proposti H&S), i due modelli PDF e, se caricati, i due modelli Word H&S. Resta solo su quel dispositivo.
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

Due formati, scelti in Nuova attività: **Esteso** (schede per sistema con situazione rilevata, attività di miglioramento,
priorità, natura del rischio, costo, competenza e termine; anagrafica, visite, catasto, inquadramento) e **Sintetico**
(checklist SI / NO / N.A. con note per voce, descrizione generale, azioni con gravità).

- **Modelli Word**: si caricano in Impostazioni → Modelli (o arrivano con la configurazione). Contengono i testi fissi e
  i segnaposto `@@…@@` che l'app compila. Restano sul dispositivo: **non vanno mai nel repository**.
- **Anno precedente**: "Parti dal report precedente" importa il Word dell'anno scorso o il .json della vecchia app.
  Nel Word nuovo il testo rimasto uguale è **grigio**, quello nuovo o modificato è **nero** (si può disattivare).
  Dall'archivio di un report, "Nuovo report per il prossimo sopralluogo" fa lo stesso partendo da Nembo.
  Dall'import arriva solo testo semplice: grassetti e immagini nel testo non vengono ripresi (le immagini vanno tra le foto precedenti).
- **Scrittura**: Detta (riconoscimento vocale di Chrome, serve rete), Frasi tipo e personali, Riformula (regole locali).
- **Foto**: salvate come nel resto dell'app; due gruppi (sopralluogo precedente e attuale), scelta di quelle da includere, didascalie,
  collegamento alla voce della checklist nel Sintetico. Massimo 250 nel report.
- Con la BU H&S scelta in Impostazioni la tab bar diventa Oggi · H&S · DDA · RA e la home mostra criticità urgenti e report da caricare.

## Programmazione

Ogni attività ha **data, ora di inizio, durata prevista e stato** (campi accanto alla Data; nel radon per ciascun momento).
**Stato**: *Da programmare* (senza ora) e *In attesa* (con l'ora) si mettono da soli; *Confermato* e *Annullato* li scegli tu e restano anche se cambi l'ora.
Le annullate restano in vista barrate, non contano in Oggi e non vanno nel file della giornata; nel file .ics lo stato diventa confermato, provvisorio o annullato. La durata proposta
dipende dal tipo e si cambia in Impostazioni → Programmazione · durate tipiche.

**Vista Programmazione** (menu laterale sotto Oggi; sul telefono dalla schermata Oggi): settimana in alto, sotto la giornata a fasce di mezz'ora.
- Le attività sono blocchi colorati per tipo, alti quanto durano; quelle del giorno senza ora sono in "Senza ora".
- Tocca un'attività senza ora e poi la fascia: è programmata. Tocca un blocco per cambiare ora e durata, spostarlo, aprirla o aggiungerla al calendario.
- Tocca una fascia vuota: *Nuova attività qui* (parte già con data e ora) oppure *Carica JSON*.
- Con il mouse i blocchi si trascinano e si allungano dal bordo inferiore.
- Il ritiro radon previsto (+6 mesi) compare come attività senza ora finché non gli dai data e ora.

**JSON**: una mappatura/PMC (come l'import RA) crea il sopralluogo RA nella fascia scelta; un **piano** (`"type": "nembo-programmazione"`,
elenco `attivita` con `tipo`, `data`, `ora`, `durata`, `stato` (facoltativo), `commessa`, `cliente`, `citta`, `indirizzo`, `sito`, `note`) crea più attività nei loro giorni.
Tipi: `ra`, `dda1`, `dda2`, `mappatura`, `radon` (posa), `hsE`, `hsS`, `firme`. Le righe già presenti vengono saltate. Modello scaricabile dalla vista.
Per le righe `ra`: se contengono `manufatti` (stesso formato del modello RA, utile per i siti nuovi) l'RA nasce con quei manufatti;
se non li contengono e in Nembo c'è già un'RA dello stesso immobile, i manufatti vengono **ripresi dall'anno precedente**.

**Ripresa dall'anno precedente (RA)**: stesso immobile = stesso codice sito se indicato su entrambe, altrimenti stesso indirizzo e città.
Si prende l'RA più recente prima della data della nuova (o la più recente in assoluto). Stato e note diventano "stato precedente" e "note precedenti",
le foto vanno tra le foto precedenti, le planimetrie vengono copiate con le etichette dei manufatti; il periodo di incarico avanza di un anno.
Foto e planimetrie sono copie: eliminare l'RA vecchia non tocca la nuova. Avviene da sola creando un'RA con l'indirizzo (Nuova attività o piano);
nella scheda di un'RA senza manufatti compare il riquadro "Riprendi dall'anno precedente".

**Calendario (.ics)**: "Aggiungi al calendario" per un'attività e "Giornata in calendario" per tutto il giorno: il file si apre con Outlook
(o il calendario del telefono) senza nuovi permessi Microsoft.

## Fogli firme

Per sostituire i fogli di carta con le firme (informativa amianto, presenze, consegna documenti). Si usano in due modi:
- **dentro un'attività** (DDA, Mappatura, RA): sezione **Firme**, anche più fogli per attività;
- **da soli**: Nuova attività → *Foglio firme* (menu laterale → Fogli firme; sul telefono il collegamento è in Oggi).

Ogni foglio parte da un **modello** (titolo, testo dell'oggetto, documenti consegnati, note) con campi che si compilano da soli:
`{committente}`, `{immobile}`, `{indirizzo}`, `{citta}`, `{commessa}`, `{data}`, `{relatore}`. I testi restano modificabili sul foglio.
I modelli si cambiano in Impostazioni → Fogli firme e viaggiano nel file di configurazione, insieme all'intestazione del PDF (chi conduce).
Nel sopralluogo RA il foglio può allegare l'elenco dei manufatti dell'attività (tutti o scelti).

**Passa il telefono**: una persona alla volta scrive nome, società e ruolo e firma; non vede le righe degli altri.
**Chiudi il foglio** blocca dati e firme; riaprire cancella le firme. Il PDF lo impagina Nembo (nessun modello da caricare)
e va nello ZIP, su OneDrive e nella condivisione, nella cartella `firme/`.

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
Permesso usato: `Files.ReadWrite.AppFolder` (delegato): l'app legge e scrive solo nella propria cartella, non vede il resto del OneDrive e non cancella nulla.

**Sincronizzazione tra dispositivi** (dalla v20, Impostazioni → OneDrive → *Sincronizza tra i dispositivi*, attiva di default):
con lo stesso account Microsoft, telefono, tablet e PC vedono le stesse attività. Parte da sola all'apertura dell'app, quando torna
la rete e poco dopo ogni modifica; c'è anche il tasto *Sincronizza ora*. Su un dispositivo nuovo basta accedere: le attività arrivano da sole.
- Usa la sottocartella `_nembo/` della cartella dell'app (una scheda per attività e i file per id), separata dalle cartelle leggibili di "Carica su OneDrive".
- Vince la modifica più recente; se un'attività è cambiata su due dispositivi, l'altra versione diventa una copia ("· copia") con le sue foto, e lo dice nelle Notifiche.
- Un'attività eliminata sparisce anche dagli altri dispositivi; i suoi file restano su OneDrive.
- L'attività aperta sullo schermo non viene sovrascritta: si aggiorna quando la chiudi.
- Non chiede mai l'accesso a Microsoft da sola: se la sessione è scaduta lo segnala in Impostazioni.
- Modelli, configurazione e firma del tecnico non vengono sincronizzati (restano nel file di configurazione).
Controlli: solo PDF, JPEG, PNG verificati sul contenuto, massimo 60 MB, nomi ripuliti, registro degli ultimi caricamenti in Impostazioni.
ID applicazione e ID tenant stanno nel file di configurazione, non nel codice.

**Senza collegamento**: "Invia PDF e foto a OneDrive" usa la condivisione di Android (a gruppi di 10), oppure "Salva tutto in un file ZIP".

## Tablet

Su schermi larghi la app si adatta in due modi, in base alla larghezza (non all'orientamento in sé, così vale anche
ridimensionando una finestra su PC):
- **Sotto i 1000px** (telefono, tablet in verticale): stessa navigazione a schermo singolo di sempre, solo con una
  colonna un po' più larga tra 600 e 999px.
- **Da 1000px in su** (tablet in orizzontale, PC): elenco e scheda stanno affiancati nello stesso schermo — si tocca
  un'attività nell'elenco e si apre subito a destra, senza cambiare schermata. Ruotando il tablet si passa dall'uno
  all'altro senza perdere l'attività aperta.

Su tablet Android con Chrome vero (es. Galaxy Tab, Redmi Pad) tutte le funzioni restano invariate, scanner barcode
e salvataggio incluso. Su iPad, come su iPhone, Safari/WebKit non supporta lo scanner barcode né la scelta della
cartella nel salvataggio (resta il download semplice).

## Aspetto (dalla v14, stile "Essenziale")

- **Due temi**: *Essenziale* (grigio freddo, predefinito) e *Originale* (rosa-grigio e petrolio). Si sceglie in
  Impostazioni → Aspetto e avvio; la scelta resta solo su quel dispositivo.
- **Font IBM Plex** inclusi in `fonts/` (woff2, licenza OFL in `fonts/OFL.txt`): funzionano anche offline.
- **Telefono e tablet in verticale**: tab bar flottante in basso, in stile segmented control (Oggi, DDA, Mappature, RA, Radon; con BU H&S: Oggi, H&S, DDA, RA); nelle schede la barra
  azioni in basso con l'azione principale. **Tablet in orizzontale e PC**: menu laterale comprimibile + elenco e scheda.
- **Oggi**: prossimo sopralluogo, anelli della giornata, andamento dei caricamenti, ritiri radon e scadenze RA
  (calcolate sulla fine dell'anno di incarico indicata nel sopralluogo RA).
- **Campioni** raggruppati per piano, con segnaposto rosso e foto rapida per quelli ancora senza foto.

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
| `js/mappatura.js` | modulo Mappatura MCA e FAV |
| `js/plan.js` | planimetrie: visualizzatore, disegno, etichette, PDF annotato |
| `js/office.js` | scheda campioni Excel e riepilogo Word |
| `js/ra.js` | sopralluogo RA: manufatti, stato di conservazione, anno di incarico |
| `js/hs-data.js`, `js/hs-word.js`, `js/hs.js` | sopralluogo H&S: dati fissi, motore Word (modelli .docx con JSZip) e import, interfaccia |
| `js/agenda.js` | programmazione: ora e durata, vista a fasce orarie, JSON del piano, file .ics |
| `js/firme.js` | fogli firme: modelli, sezione nelle attività, attività a sé, passa il telefono, impostazioni |
| `js/home.js` | schermata Oggi e foglio Nuova attività |
| `js/onedrive.js` | caricamento su OneDrive e stato di invio |
| `js/sync.js` | sincronizzazione tra dispositivi tramite la cartella dell'app (`_nembo/`) |
| `js/app.js` | navigazione, impostazioni, backup ZIP e ripristino |
| `fonts/` | IBM Plex Sans e Mono (woff2) |
| `pdfgen.js` | compilazione PDF (pdf-lib), compreso il PDF del foglio firme |
| `vendor/` | librerie (Preact, htm, pdf-lib, JSZip, signature_pad), incluse per l'uso offline |

Se cambia il modulo radon, i nomi dei campi del nuovo PDF vanno rimappati in `RADON_ROWS` (pdfgen.js).
Non aggiungere mai al repository file con dati reali (moduli, modelli Word, offerte, backup ZIP, configurazione).
Se cambia la scheda campioni, vanno ricontrollate le coordinate `SC_LINES` / `SC_COLS`.

## Da sapere

- **Backup**: lo ZIP contiene cartelle leggibili (foto, allegati, PDF) e `manifest.json` per il ripristino.
  Chrome Android non permette di condividere file .zip: finisce in Download, da lì si carica con l'app OneDrive.
  I PDF singoli invece si condividono direttamente su OneDrive.
- **Ripristino**: Backup → "Scegli file ZIP" (il selettore di Android mostra anche OneDrive).
- **Codici MCA/FAV**: si rinumerano eliminando un campione finché non generi la scheda campioni; da lì restano fissi.
- **Radon**: "Conferma e blocca" richiede data e firma del tecnico; blocca i dati di posa. "Sblocca" cancella le firme di quel momento.
  La media per punto è pesata sui giorni di esposizione di Fase 1 e Fase 2.
