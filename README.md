# Nembo

App web (PWA) per Android: DDA ambientali (Fase 1 e Fase 2), mappature, campagne radon, sopralluoghi RA amianto e sopralluoghi HSE.
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
Contiene impostazioni (tecnico, laboratorio, offerta, codici analisi, valori proposti HSE), i due modelli PDF e, se caricati, i due modelli Word HSE. Resta solo su quel dispositivo.
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

## Sopralluogo HSE

Due formati, scelti in Nuova attività: **Esteso** (schede per sistema con situazione rilevata, attività di miglioramento,
priorità, natura del rischio, costo, competenza e termine; anagrafica, visite, catasto, inquadramento) e **Sintetico**
(checklist SI / NO / N.A. con note per voce, descrizione generale, azioni con gravità).

- **Modelli Word**: si caricano in Impostazioni → Modelli (o arrivano con la configurazione). Contengono i testi fissi e
  i segnaposto `@@…@@` che l'app compila. Restano sul dispositivo: **non vanno mai nel repository**.
- **Anno precedente**: "Parti dal report precedente" importa il Word dell'anno scorso o il .json della vecchia app.
  Nel Word nuovo il testo rimasto uguale resta **nero**, quello nuovo o modificato esce in **rosso** (interruttore «Novità in rosso»). Senza report precedente tutto resta nero.
  Dall'archivio di un report, "Nuovo report per il prossimo sopralluogo" fa lo stesso partendo da Nembo.
  Dall'import arriva solo testo semplice: grassetti e immagini nel testo non vengono ripresi (le immagini vanno tra le foto precedenti).
- **Scrittura**: Detta (riconoscimento vocale di Chrome, serve rete), Frasi tipo e personali, Riformula (regole locali).
- **Foto**: salvate come nel resto dell'app; due gruppi (sopralluogo precedente e attuale), scelta di quelle da includere, didascalie,
  collegamento alla voce della checklist nel Sintetico. Massimo 250 nel report.
- Con la BU HSE scelta in Impostazioni la tab bar diventa Oggi · HSE · DDA · RA e la home mostra criticità urgenti e report da caricare.

**Foto del sopralluogo precedente** (v32): non vanno su OneDrive né nella condivisione (sono già nel report dell'anno prima); restano nel backup ZIP e nella sincronizzazione. Nel Rilievo fotografico *elimina tutte* toglie in un colpo tutte le foto del sopralluogo precedente.
**Foto di inquadramento del capitolo 8** (Sintetico): le immagini sotto «Condizioni generali dell'immobile» vengono lette dal Word importato, rimesse nel nuovo Word con le stesse dimensioni e copiate nel report dell'anno successivo. Si gestiscono nella sezione 8.

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

**Dalla v33**: la voce *Programmazione* sta sotto *Strumenti* nel menu laterale (sul telefono resta il collegamento in Oggi).
- Viste **Giorno**, **Settimana** e **Mese**; il mese in corso è sempre indicato. La griglia oraria scorre nel suo riquadro, così cambiando giorno o settimana la pagina resta in alto.
- Striscia della settimana con frecce e scorrimento col dito; vista giorno con frecce ai lati e scorrimento col dito per passare al giorno prima o dopo.
- Il **+** apre *Nuovo*: **Appuntamento** (titolo, data, ora, durata, stato, luogo, note: record `type: 'app'`, senza cartelle né documenti) oppure **Attività** da programmare (creata con data, ora e stato, ma non aperta). Toccando una fascia vuota si sceglie tra le stesse due opzioni.
- *Senza ora* e *Prossime senza ora* stanno in una colonna a destra su tablet e PC (sotto la griglia sul telefono).

## Verbale HSE (v34–v35, BU HSE)

Nuova attività HSE: Nuova attività → *Verbale HSE* (codice `VS-AAAA-NNN`). Dati del sopralluogo e un elenco di **note**, ognuna con titolo, testo (anche dettato), foto e tag; le note si riordinano e si filtrano per tag. La fotocamera nella barra azioni apre una nota nuova con la foto. Appunti, ZIP e OneDrive come le altre attività (foto in `note/`); niente fogli firme.

**Tag**: ogni nota del verbale e gli *Appunti* di tutte le attività hanno i tag. Toccando *+ Tag* Nembo propone i tag già usati (i più frequenti per primi); se ne scrivi uno nuovo, *Crea «…»*. I tag stanno nelle attività, quindi si sincronizzano con loro. Ogni tag ha un colore suo, preso da una tavolozza diversa dai colori dei tipi di attività.

**v35**: nel menu laterale esteso le icone hanno i colori del foglio Nuova attività; in Programmazione, toccando un'attività della colonna «Senza ora» si apre l'attività (l'orologio accanto serve per darle un orario).

**H&S → HSE**: in tutta l'app la business unit si chiama HSE.

## Nuovo logo (v44)

Icona dell'app e logo del menu laterale con la nuvola irezumi (`icons/`).

## Word del Verbale HSE (v43)

- Modello in Impostazioni → Modelli: *Modello Word Verbale HSE* (`vs.docx`, chiave `tpl_vs`; non va nel repository). Segnaposto: `@@TITOLO@@`, `@@INDIRIZZO@@`, `@@COMMITTENTE@@`, `@@FONDO@@`, `@@DATAREPORT@@`, `@@REDATTO@@`, `@@VERIFICATO@@`, `@@PROTOCOLLO@@`, `@@COMMESSA@@`, `@@PROCURA@@`, `@@AN_INDIRIZZO@@`, `@@DESCRAREA@@`, riga ripetuta `@@V_DATA@@`/`@@V_PRESENTI@@`, immagini con testo alternativo `@@COPERTINA@@` e `@@INQUADRAMENTO@@`, scheda prototipo `@@S_TITOLO@@` (titolo) + tabella con `@@S_SIT@@`, `@@S_FOTO@@`, `@@S_MIG@@`; piè di pagina `@@ASSET@@`, `@@MESEANNO@@`, `@@REVISIONE@@`.
- `js/vs-word.js` (`vsBuildDocx`, `vsWord`): una scheda per nota, una per pagina; foto nella colonna «Documentazione fotografica». Il sommario si aggiorna all'apertura in Word.
- Verbale: in Anagrafica *Dati del report* (titolo, fondo, data report, redatto, verificato, protocollo, revisione, procura, foto di copertina), *Identificazione dell'asset* (descrizione area, presenti, inquadramento), *Sopralluoghi precedenti*; nelle note *Situazione rilevata* e *Attività di miglioramento*. *Genera Word* al centro della barra in Anagrafica e in Opzioni; il Word va anche nello ZIP e su OneDrive.

## Barra delle attività, Opzioni e riepilogo via email (v42)

- **Barra in basso uguale in tutte le attività** (`BarraAtt` in core.js): a sinistra uno strumento (planimetria; fotocamera negli HSE e nei Verbali; scanner dei dosimetri nel radon), al centro l'azione principale, a destra **⋯ Opzioni**. Nel sopralluogo RA al centro c'è sempre *Carica su OneDrive*; *Prossimo da verificare* è accanto ai filtri dei manufatti.
- **Opzioni** (`OpzioniSheet`, `opzArchivio`): le azioni dell'attività raggruppate. *Condividi*: riepilogo via email, email al cliente. Poi, a seconda dell'attività: file JSON e modelli, manufatti dai campioni MCA, schede campioni PDF ed Excel, riepilogo Word, Word HSE, import del report precedente. *Archivio*: foglio firme, ZIP, elimina. Le sezioni Archivio delle schede sono state tolte.
- **Riepilogo via email** (`js/riepilogo.js`): testo con intestazione, sintesi e una voce per elemento (prima le criticità) e fino a 12 foto ridotte. *Condividi* apre Outlook (o un'altra app) con il testo nel messaggio e le foto allegate; *Copia testo e foto* mette in appunti il testo con le foto dentro, da incollare nel messaggio; *Copia solo il testo*.

## Zoom, dati protetti e Novità (v41)

- **Foto con zoom** (`Viewer` in core.js): due dita o doppio tocco sul telefono, rotella o doppio clic sul PC; con la foto ingrandita si trascina, lo scorrimento alla foto successiva vale solo a foto intera.
- **Dati importati protetti**: i campi che arrivano da un file o da un'altra attività si vedono come testo con un lucchetto (`Inp`, `InpGrow`, `Area` con `imp`, originali in `rec.imp` o `manufatto.imp`). Toccando il lucchetto si modificano; se il valore cambia, sotto resta quello importato con *Ripristina*. Valgono per i manufatti RA (PMC/mappatura JSON, anno precedente, Mappatura MCA o DDA Fase 2 in Nembo) e per l'anagrafica di DDA, HSE e RA importata da file (JSON, Word, Programmazione).
- **RA dai campioni MCA**: se in Nembo c'è una Mappatura o una DDA Fase 2 dello stesso immobile, l'RA propone di creare i manufatti dai suoi campioni MCA (`raDaCampioni`); si può anche scegliere un'altra attività.
- **Novità** (`js/novita.js`, immagini in `novita/`): al primo avvio dopo un aggiornamento compare il foglio con le novità, con una breve presentazione per gli aggiornamenti importanti; resta anche in Notifiche e in Impostazioni → Novità. A ogni rilascio si aggiunge una voce a `NOVITA` (testi generici, senza dati reali).
- **Clienti sul telefono**: riga *Clienti* in Oggi.

## Clienti e foglio firme pronto (v40)

- **Clienti** (Strumenti → Clienti, `js/clienti.js`): anagrafica con ragione sociale, referente, telefono, email, sede e note. Preferenze: *Prepara il foglio firme nelle nuove attività* (con il modello, oppure in base all'attività) e *Invia i documenti per email* (destinatari e copia). Nella scheda ci sono le attività del cliente; dall'elenco si aggiungono in un tocco i clienti già usati nelle attività. I clienti sono record di tipo `cli`: vanno nei backup e nella sincronizzazione, non su OneDrive come cartelle.
- **Nuova attività → Dati di partenza**: c'è anche il Cliente e, per DDA, Mappatura, RA e Monitoraggio aria, la spunta *Foglio firme* (già attiva se il cliente lo prevede). L'attività nasce con la scheda Firme e un foglio pronto: dati dell'attività, tipo di attività e l'elenco dei campioni prelevati, dei manufatti valutati o dei punti di monitoraggio, aggiornato quando generi il PDF. I testi del foglio si compilano con i dati di quando lo apri. In Anagrafica, *Prepara il foglio firme* lo aggiunge dopo.
- **JSON**: nel modello della Programmazione e nel modello RA c'è `"firme"`: `true` foglio pronto, `false` nessuno, assente = preferenza del cliente.
- **Email al cliente**: se il cliente ha l'invio per email, in Anagrafica di ogni attività c'è il tasto che prepara l'email (oggetto e testo); gli allegati si aggiungono nell'app di posta.

## Schermata di caricamento e icona (v39)

Sfondo con le nuvole irezumi (`splash/bg-desktop.webp` per schermi orizzontali, `splash/bg-phone.webp` per quelli verticali) e la scritta «Nembo» in Poppins Bold (`fonts/poppins-700-nembo.woff2`, solo le lettere della parola). Nuova icona dell'app con le nuvole sull'acqua (`icons/`, anche `apple-touch-icon.png`), usata anche in cima al menu laterale. Il vecchio `splash/bg.webp` non serve più.

## Fotocamera, notifiche e ubicazioni (v38)

- **Fotocamera di Nembo**: sul telefono il tasto foto apre la fotocamera dentro l'app (`Camera` e `camOpen` in capture.js): scatto al centro, **Galleria** in basso a sinistra per scegliere foto già scattate, torcia se disponibile. Dove si possono aggiungere più foto si scatta in serie e si chiude con *Fine*; chiudendo con la X le foto scattate restano. Se la fotocamera non si apre c'è il tasto *Fotocamera del telefono*; sul PC resta la scelta dei file.
- **Notifiche di OneDrive**: un caricamento non riuscito o interrotto ricorda le attività coinvolte (`ids`): sotto la notifica ci sono *Ricarica* e *Apri attività*.
- **Ubicazioni**: ubicazione dei manufatti RA e dei punti radon, postazione dei punti aria e «Dove» nei punti da campionare del DDA vanno a capo e crescono col testo (`InpGrow`); anche il titolo delle schede chiuse mostra fino a tre righe.

## Schede delle attività (v37)

Ogni attività è divisa in schede, con un selettore come quello Ambiente / HSE / Sicurezza della Home che resta in alto mentre si scorre:

| Attività | Schede |
|---|---|
| DDA | Anagrafica · Sopralluogo · Campioni |
| Mappatura MCA e FAV | Anagrafica · Campioni |
| Sopralluogo RA | Anagrafica · Manufatti (con monitoraggio aria) |
| Campagna radon | Anagrafica · Punti · Firme |
| Monitoraggio aria | Anagrafica · Punti |
| Sopralluogo HSE | Anagrafica (dati del report, Word e archivio) · Sezioni |
| Verbale HSE | Anagrafica · Note |

- **Anagrafica**: dati della commessa, data, ora e stato, e in fondo l'archivio (ZIP, Elimina; documenti allegati nel DDA, scheda PDF nel radon). La barra in basso ha *Carica su OneDrive*.
- La scheda del contenuto ha gli appunti e le planimetrie; la barra in basso cambia con la scheda (*Nuova area REC*, *Nuovo campione*, *Prossimo da verificare*, *Salva e firma*…).
- **Firme**: solo nella campagna radon. Nelle altre attività la scheda compare solo se l'attività ha già fogli firme salvati; per i nuovi fogli c'è *Fogli firme* negli Strumenti.
- Nel DDA la fase (1 o 2) si sceglie in Anagrafica.
- Nembo ricorda l'ultima scheda aperta per ogni tipo di attività; un'attività nuova si apre su Anagrafica. La ricerca apre la scheda giusta (`useSchede`, `Schede` in core.js, evento `nembo-goto` con `tab:chiave`).

**Barra in alto (v37)**: su tablet e PC la Home usa la stessa barra delle altre pagine (Oggi, lente, +, campana) e il profilo sta in fondo al menu laterale, al posto della voce Impostazioni. Sul telefono la Home ha +, campana e profilo, con il campo *Cerca in tutte le attività* sotto il titolo. In Home, la riga Programmazione dice «Nessuna attività oggi» quando non c'è niente in programma.

## Cerca (v36)

Ricerca in tutte le attività salvate sul dispositivo, anche offline. Si apre dalla lente in *Oggi*, dalla barra in alto su tablet e PC e dalla voce *Cerca* del menu laterale.

- Filtri: *Tutto*, *Immobile* (indirizzo, città, sito, commessa, cliente, codice), *Titolo* (titoli delle note, aree REC, campioni, manufatti, punti radon e aria, didascalie), *Testo* (testo delle note, appunti, note di campioni e manufatti, voci e schede HSE, azioni) e *Tag*.
- Maiuscole e accenti non contano; con più parole devono esserci tutte, ognuna all'inizio di una parola («via esempi» trova «Via degli Esempi»).
- Sotto il campo ci sono i tag usati, ognuno col suo colore e il numero di volte: toccandone uno compaiono tutte le note e gli appunti con quel tag.
- I risultati sono raggruppati per attività con il punto trovato evidenziato. Toccando un risultato si apre l'attività e Nembo scorre fino alla nota, al campione, al manufatto o al punto (`cercaVai`, evento `nembo-goto` per aprire la matrice giusta nel DDA). Il codice è in `js/cerca.js`.

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

## Monitoraggio aria (v29)

Prelievi di fibre aerodisperse (SEM, MOCF, FAV). Si usa in due modi:
- **da solo**: Nuova attività → *Monitoraggio aria* (menu laterale → Monitoraggio aria; in Oggi sul telefono);
- **dentro il sopralluogo RA**: card *Aggiungi monitoraggio aria*, prima delle planimetrie. Se non contiene nulla si toglie con *Togli il monitoraggio aria*.

I punti si chiamano **S** per SEM e FAV e **M** per MOCF (numerazione separata: S1, S2…, M1, M2…); cambiando metodica il nome si aggiorna. I punti ripresi dall'anno prima e quelli rinominati a mano mantengono il loro nome.
Per ogni punto: piano, postazione, Eseguito / Non eseguito, data, metodica, ora di inizio e fine, campionatore, membrana (anche con Scansiona), flusso, litri, rapporto di prova, concentrazione, note e foto.
La durata e i litri (flusso × minuti) si calcolano da soli; i litri scritti a mano hanno la precedenza. Le concentrazioni oltre il limite (SEM 2 ff/l, MOCF 20 ff/l) sono evidenziate.
I punti compaiono come etichette sulle planimetrie. Il RA ripreso dall'anno prima copia i punti senza le misure.

**Uscite** (Excel e PDF): *Scheda di prelievo*, da inviare con le membrane, e *Riepilogo esiti*, la tabella per la relazione (punti non eseguiti con «MONITORAGGIO NON EFFETTUATO», superamenti in rosso).
Vanno nello ZIP, nella condivisione e su OneDrive, nella cartella `aria/`, insieme ai rapporti di prova allegati.
Campionatori, addetto alla verifica della taratura e codici d'analisi si impostano in Impostazioni → Monitoraggio aria e viaggiano nel file di configurazione. Laboratorio, offerta, email per i referti, «prelevato da» e «verificato da» sono quelli della scheda campioni.

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
- **Telefono e tablet in verticale**: tab bar flottante in basso, in stile segmented control (Oggi, DDA, Mappature, RA, Radon; con BU HSE: Oggi, HSE, DDA, RA); nelle schede la barra
  azioni in basso con l'azione principale. **Tablet in orizzontale e PC**: menu laterale comprimibile + elenco e scheda.
- **Oggi**: prossimo sopralluogo, anelli della giornata, andamento dei caricamenti, ritiri radon e scadenze RA
  (calcolate sulla fine dell'anno di incarico indicata nel sopralluogo RA).
- **Campioni** raggruppati per piano, con segnaposto rosso e foto rapida per quelli ancora senza foto.

## Assistenza e dati del dispositivo (v26)

- **Errori dell'app**: gli errori imprevisti finiscono nelle Notifiche con codice `APP-JS` (senza ripetizioni). Se una schermata va in errore compare «Qualcosa non ha funzionato» con *Torna a Oggi*, *Ricarica* e *Segnala*.
- **Segnala un problema** (Notifiche e Impostazioni → Assistenza): prepara un'email con versione, dispositivo e ultimi errori. Il destinatario è `supportEmail`, nel file di configurazione.
- **Primi passi** in Oggi: configurazione, firma, OneDrive, installazione. Sparisce a passi completati o con *Nascondi*.
- **Rimuovi i dati da questo dispositivo** (Impostazioni): controlla che le attività siano su OneDrive, poi toglie attività, foto, configurazione, modelli, firma e accesso Microsoft. Se qualcosa non è su OneDrive chiede di scrivere ELIMINA.
- **Avvio leggero**: ExcelJS, docx, pdf-lib e pdf.js si caricano solo quando servono (`needLib`); restano nella cache offline.
- La pagina dichiara `noindex` per i motori di ricerca.
- **Firma da immagine** (v27): per la firma del tecnico (Impostazioni, momenti radon) e del relatore nei fogli firme si può caricare una foto della firma su carta bianca; lo sfondo viene tolto (soglia adattiva a blocchi) e l'immagine ritagliata. Non disponibile per chi firma con «Passa il telefono» né per il referente del cliente.

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
| `js/hs-data.js`, `js/hs-word.js`, `js/hs.js` | sopralluogo HSE: dati fissi, motore Word (modelli .docx con JSZip) e import, interfaccia |
| `js/agenda.js` | programmazione: ora e durata, vista a fasce orarie, JSON del piano, file .ics |
| `js/aria.js` | monitoraggio aria: punti, calcoli, sezione per attività e RA, schede Excel/PDF |
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

## Design system: Rilievo

Il design system di Nembo si chiama **Rilievo**. Tutti i valori grafici sono all'inizio di `styles.css`: colori dei tre temi (Essenziale, Originale, Scuro),
scala del testo (`--fs-2xs` … `--fs-5xl`, solo IBM Plex), raggi (`--r-*`), spazi (`--sp-*`) e i colori dei tipi di attività (`--t-*`).
Nelle regole CSS e negli stili scritti dal codice non si mettono colori, dimensioni del testo o raggi a mano: si usano i token.

- **Tipi di attività**: `TIPO_COL` in `js/core.js` dà lo stesso colore a menu, «Nuova attività», programmazione e home.
- **Colori di stampa**: `PRINT` in `js/core.js` raccoglie i colori fissi di planimetrie, PDF, Word, Excel ed email (non cambiano col tema).
- **Testo sui colori pieni**: `--on-accent` (bianco nei temi chiari, inchiostro scuro nel tema Scuro) e `--on-dark` (sempre bianco).
- **Contrasto**: testo almeno 4,5:1 su fondo e card in tutti e tre i temi.
