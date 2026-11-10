# Nembo

App web (PWA) per il lavoro sul campo: DDA ambientali (Fase 1 e Fase 2), mappature MCA e FAV, sopralluoghi RA amianto, monitoraggi dell'aria,
campagne radon, sopralluoghi e verbali HSE, fogli firme, clienti e programmazione. Versione attuale: **nembo-v51**.
I dati restano sul dispositivo (IndexedDB), senza server. OneDrive (cartella dell'app) è facoltativo, per caricamento, sincronizzazione, configurazione e backup.

## Stack e requisiti

- Preact + htm senza build, script globali; IndexedDB; service worker; MSAL + Microsoft Graph; pdf-lib, PDF.js 4.10, JSZip, ExcelJS, docx (tutto in `vendor/`, nessuna CDN).
- Uso: Chrome su Android o PC (iPhone e iPad senza scanner e scelta della cartella), HTTPS.
- Sviluppo: Python 3 (server statico), Playwright con Chromium per le prove; ESLint con `.eslintrc.cjs` e `globals.json`, rigenerato da `tools/aggiorna-globals.py`.

## Avvio in locale

```bash
python3 -m http.server 8080      # dalla radice del repository
# poi http://localhost:8080/index.html
```

Controllo dei nomi globali (un nome mancante o rinominato si vedrebbe solo al tocco del pulsante):

```bash
python3 tools/aggiorna-globals.py   # rigenera globals.json dai file in index.html
npx eslint@8.57.0 pdfgen.js sw.js js
```

Per provare senza cache usare una finestra anonima o, in Playwright, `service_workers='block'`. Nessuna build: pubblicare = unire in `main`.

## Documentazione

| Documento | Contenuto |
|---|---|
| [CLAUDE.md](CLAUDE.md) | istruzioni operative per Claude Code e Copilot |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | componenti, cartelle, moduli, avvio, integrazioni, offline |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | storage, diagrammi ER, dizionario dei campi, enumerazioni, esempi, migrazioni |
| [docs/FLUSSI.md](docs/FLUSSI.md) | schemi di funzionamento delle operazioni principali |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Rilievo: token, componenti, stati, accessibilità |
| [docs/PRIVACY_SECURITY.md](docs/PRIVACY_SECURITY.md) | dati personali, controlli, terze parti, segreti, audit |
| [docs/PRD.md](docs/PRD.md) | obiettivo, utenti, requisiti, fuori ambito |
| [docs/DECISIONS.md](docs/DECISIONS.md) | decisioni architetturali |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | guida rapida per chi usa l'app |
| [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) | verifiche prima di ogni versione |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | storico delle versioni |

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
Contiene anche il **codice utente** (dalla v48): carica la stessa configurazione su telefono, tablet e PC, così ognuno riconosce come tuoi i backup degli altri, anche senza OneDrive.
In alternativa si caricano i modelli e si compilano i campi a mano.

**Configurazione da OneDrive** (dalla v51): dopo l'accesso a Microsoft, se nella cartella dell'app c'è già una configurazione, Nembo propone di ripristinarla
(impostazioni, modelli e, con il PIN, la firma). Con *Non ora* resta in Impostazioni → File di configurazione → *Ripristina da OneDrive*.

**Preparare la configurazione per un collega:** compila le impostazioni sul tuo dispositivo, tocca **Esporta**,
poi nel file `.json` cambia `tecnicoNome`, `tecnicoCognome` e `prelevatoDa` (o lascia che li cambi lui dopo il caricamento).
Il codice utente è legato a nome e cognome del tecnico: se li cambi nel file, o se il collega li cambia in Impostazioni, sul suo dispositivo il tuo codice non vale e ne viene creato uno suo.
La firma salvata non viene mai esportata. Il file contiene dati riservati e il codice utente: mai su GitHub.

## Importazione da JSON e checklist Fase 2

I file JSON si fanno preparare a Claude dai documenti con i prompt di `Nembo_Prompt.txt` (fuori dal repository). Riempiono solo i campi
ancora vuoti: non sovrascrivono mai un dato già inserito, saltano codici e planimetrie già presenti e dicono cosa hanno importato.
I dati importati sono protetti dal lucchetto (`impOf`, `markImp`).

- **DDA Fase 1** (`"type": "dda-fase1"`, ⋯ Opzioni → Dati → Importa da un DDA precedente): uso del sito, checklist, aree REC, interviste, appunti, planimetrie.
- **Indagine precedente** (`"type": "dda-fase2"`, dalla v50): campioni con esito ed `esitoDettaglio`, NC con il campione di `riferimento`,
  `numerazione` (`prosegui` | `nuova`) e planimetrie. Si carica nel DDA (stesso comando, passa a Fase 2), nella Mappatura
  (⋯ Opzioni → Importa l'indagine precedente, solo MCA e FAV) e nell'RA (i campioni MCA non negativi e gli NC MCA diventano manufatti).
  Nel DDA e nella Mappatura i campioni vanno in `r.precedente` e compaiono in «Indagine precedente»: sono di riferimento e non entrano
  nella scheda per il laboratorio; «Ricampiona» li aggiunge ai punti da campionare (DDA) o crea il nuovo campione (Mappatura).
- **Planimetrie da JSON** (dalla v50, `importPlanimetrie` in `js/plan.js`): `"planimetrie": [{ nome, piano, didascalia, origine: "storica", fonte, formato: pdf|jpeg|png, dati }]`,
  `dati` in base64 o data URI. Le immagini diventano un PDF di una pagina (lato lungo come un A3); le planimetrie «Storiche» mostrano la didascalia sotto il nome.
- **Numerazione che prosegue** (dalla v50): in DDA Fase 2 e Mappatura i nuovi campioni proseguono dopo l'indagine importata o dopo le attività
  in Nembo dello stesso immobile (`precNembo`, `precBase`): dopo A6 il primo nuovo è A7, dopo NC3 il primo NC è NC4. L'interruttore
  «Prosegui la numerazione» (`r.numerazione`) lo spegne.

**Checklist "Punti da campionare" (Fase 2):** elenco libero di cosa si prevede di campionare (matrice, cosa, dove), utile per
non dimenticare nulla sul campo. "Da aree REC" propone una voce per ogni area REC della Fase 1 non ancora ripresa.
Il tasto "Preleva" apre la matrice giusta e crea il campione già con descrizione e ubicazione, spuntando la voce come fatta.

## Sopralluogo RA (Responsabile Amianto)

Terza area della home. Si parte dalla mappatura o dal PMC del sito: "Scarica modello" dà lo schema JSON
(dati del sito e un elenco "manufatti" con codice, ubicazione, descrizione, tipologia, quantità, stato e note del sopralluogo precedente).
Il file si fa preparare a Claude dal documento, poi si carica da ⋯ Opzioni → Manufatti → Carica file JSON: nasce la lista dei manufatti
(con le planimetrie, se il file le contiene). Ricaricando un file si aggiungono solo i codici nuovi; quelli già presenti non vengono toccati.
Altre strade: ripresa dall'RA dell'anno precedente dello stesso immobile (`raPrecedente`, `raRiprendi`) e «Manufatti dai campioni MCA»
di una Mappatura o DDA Fase 2 **dello stesso immobile** (`raFontiCampioni`, `stessoImmobile`).

Per ogni manufatto: stato di conservazione (classi del DM 06/09/1994 più "Non ispezionabile" e "Rimosso o bonificato"),
note e fino a 3 foto. Se il file riporta lo stato del sopralluogo precedente, compare come riferimento.
Barra di avanzamento e filtro "Da verificare". Le planimetrie usano come etichette i codici dei manufatti, colorati per stato.

## Monitoraggio aria

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
  Nell'Esteso (dalla v52) ogni campo «Situazione rilevata» ha la fotocamera sotto il microfono: la foto ha `ref` = `sch.<sezione>[.<sottosezione>]`,
  nel Word la sezione riporta «ID Foto n, m» (in rosso se c'è una foto nuova) e all'import del Word la riga ricollega le foto. La fotocamera della barra aggiunge foto senza sezione.
- Con la BU HSE scelta in Impostazioni la tab bar diventa Oggi · HSE · DDA · RA e la home mostra criticità urgenti e report da caricare.

**Foto del sopralluogo precedente** (v32): non vanno su OneDrive né nella condivisione (sono già nel report dell'anno prima); restano nel backup ZIP e nella sincronizzazione. Nel Rilievo fotografico *elimina tutte* toglie in un colpo tutte le foto del sopralluogo precedente.
**Foto di inquadramento del capitolo 8** (Sintetico): le immagini sotto «Condizioni generali dell'immobile» vengono lette dal Word importato, rimesse nel nuovo Word con le stesse dimensioni e copiate nel report dell'anno successivo. Si gestiscono nella sezione 8.

## Verbale HSE

Nuova attività HSE: Nuova attività → *Verbale HSE* (codice `VS-AAAA-NNN`). Dati del sopralluogo e un elenco di **note**, ognuna con titolo, testo (anche dettato), foto e tag; le note si riordinano e si filtrano per tag. La fotocamera nella barra azioni apre una nota nuova con la foto. Appunti, ZIP e OneDrive come le altre attività (foto in `note/`); niente fogli firme.

**Tag**: ogni nota del verbale e gli *Appunti* di tutte le attività hanno i tag. Toccando *+ Tag* Nembo propone i tag già usati (i più frequenti per primi); se ne scrivi uno nuovo, *Crea «…»*. I tag stanno nelle attività, quindi si sincronizzano con loro. Ogni tag ha un colore suo, preso da una tavolozza diversa dai colori dei tipi di attività.

## Word del Verbale HSE

- Modello in Impostazioni → Modelli: *Modello Word Verbale HSE* (`vs.docx`, chiave `tpl_vs`; non va nel repository). Segnaposto: `@@TITOLO@@`, `@@INDIRIZZO@@`, `@@COMMITTENTE@@`, `@@FONDO@@`, `@@DATAREPORT@@`, `@@REDATTO@@`, `@@VERIFICATO@@`, `@@PROTOCOLLO@@`, `@@COMMESSA@@`, `@@PROCURA@@`, `@@AN_INDIRIZZO@@`, `@@DESCRAREA@@`, riga ripetuta `@@V_DATA@@`/`@@V_PRESENTI@@`, immagini con testo alternativo `@@COPERTINA@@` e `@@INQUADRAMENTO@@`, scheda prototipo `@@S_TITOLO@@` (titolo) + tabella con `@@S_SIT@@`, `@@S_FOTO@@`, `@@S_MIG@@`; piè di pagina `@@ASSET@@`, `@@MESEANNO@@`, `@@REVISIONE@@`.
- `js/vs-word.js` (`vsBuildDocx`, `vsWord`): una scheda per nota, una per pagina; foto nella colonna «Documentazione fotografica». Il sommario si aggiorna all'apertura in Word.
- Verbale: in Anagrafica *Dati del report* (titolo, fondo, data report, redatto, verificato, protocollo, revisione, procura, foto di copertina), *Identificazione dell'asset* (descrizione area, presenti, inquadramento), *Sopralluoghi precedenti*; nelle note *Situazione rilevata* e *Attività di miglioramento*. *Genera Word* al centro della barra in Anagrafica e in Opzioni; il Word va anche nello ZIP e su OneDrive.

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

## Schede delle attività

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

## Barra delle attività, Opzioni e riepilogo via email

- **Barra in basso uguale in tutte le attività** (`BarraAtt` in core.js), flottante come la tab bar (dalla v52, come la barra della selezione e quella delle planimetrie): a sinistra uno strumento (planimetria; fotocamera negli HSE e nei Verbali; scanner dei dosimetri nel radon), al centro l'azione principale, a destra **⋯ Opzioni**. Nel sopralluogo RA al centro c'è sempre *Carica su OneDrive*; *Prossimo da verificare* è accanto ai filtri dei manufatti.
- **Opzioni** (`OpzioniSheet`, `opzArchivio`): le azioni dell'attività raggruppate. *Condividi*: riepilogo via email, email al cliente. Poi, a seconda dell'attività: file JSON e modelli, manufatti dai campioni MCA, schede campioni PDF ed Excel, riepilogo Word, Word HSE, import del report precedente. *Archivio*: foglio firme, ZIP, elimina. Le sezioni Archivio delle schede sono state tolte.
- **Riepilogo via email** (`js/riepilogo.js`): testo con intestazione, sintesi e una voce per elemento (prima le criticità) e fino a 12 foto ridotte. *Condividi* apre Outlook (o un'altra app) con il testo nel messaggio e le foto allegate; *Copia testo e foto* mette in appunti il testo con le foto dentro, da incollare nel messaggio; *Copia solo il testo*.

## Zoom, dati protetti e Novità

- **Foto con zoom** (`Viewer` in core.js): due dita o doppio tocco sul telefono, rotella o doppio clic sul PC; con la foto ingrandita si trascina, lo scorrimento alla foto successiva vale solo a foto intera.
- **Dati importati protetti**: i campi che arrivano da un file o da un'altra attività si vedono come testo con un lucchetto (`Inp`, `InpGrow`, `Area` con `imp`, originali in `rec.imp` o `manufatto.imp`). Toccando il lucchetto si modificano; se il valore cambia, sotto resta quello importato con *Ripristina*. Valgono per i manufatti RA (PMC/mappatura JSON, anno precedente, Mappatura MCA o DDA Fase 2 in Nembo) e per l'anagrafica di DDA, HSE e RA importata da file (JSON, Word, Programmazione).
- **RA dai campioni MCA**: se in Nembo c'è una Mappatura o una DDA Fase 2 dello stesso immobile, l'RA propone di creare i manufatti dai suoi campioni MCA (`raDaCampioni`); si può anche scegliere un'altra attività.
- **Novità** (`js/novita.js`, immagini in `novita/`): al primo avvio dopo un aggiornamento compare il foglio con le novità, con una breve presentazione per gli aggiornamenti importanti; resta anche in Notifiche e in Impostazioni → Novità. A ogni rilascio si aggiunge una voce a `NOVITA` (testi generici, senza dati reali).
- **Clienti sul telefono**: riga *Clienti* in Oggi.

## Clienti e foglio firme pronto

- **Clienti** (Strumenti → Clienti, `js/clienti.js`): anagrafica con ragione sociale, referente, telefono, email, sede e note. Preferenze: *Prepara il foglio firme nelle nuove attività* (con il modello, oppure in base all'attività) e *Invia i documenti per email* (destinatari e copia). Nella scheda ci sono le attività del cliente; dall'elenco si aggiungono in un tocco i clienti già usati nelle attività. I clienti sono record di tipo `cli`: vanno nei backup e nella sincronizzazione, non su OneDrive come cartelle.
- **Nuova attività → Dati di partenza**: c'è anche il Cliente e, per DDA, Mappatura, RA e Monitoraggio aria, la spunta *Foglio firme* (già attiva se il cliente lo prevede). L'attività nasce con la scheda Firme e un foglio pronto: dati dell'attività, tipo di attività e l'elenco dei campioni prelevati, dei manufatti valutati o dei punti di monitoraggio, aggiornato quando generi il PDF. I testi del foglio si compilano con i dati di quando lo apri. In Anagrafica, *Prepara il foglio firme* lo aggiunge dopo.
- **JSON**: nel modello della Programmazione e nel modello RA c'è `"firme"`: `true` foglio pronto, `false` nessuno, assente = preferenza del cliente.
- **Email al cliente**: se il cliente ha l'invio per email, in Anagrafica di ogni attività c'è il tasto che prepara l'email (oggetto e testo); gli allegati si aggiungono nell'app di posta.

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

## Fotocamera, notifiche e ubicazioni

- **Fotocamera di Nembo**: sul telefono il tasto foto apre la fotocamera dentro l'app (`Camera` e `camOpen` in capture.js): scatto al centro, **Galleria** in basso a sinistra per scegliere foto già scattate, torcia se disponibile. Dove si possono aggiungere più foto si scatta in serie e si chiude con *Fine*; chiudendo con la X le foto scattate restano. Se la fotocamera non si apre c'è il tasto *Fotocamera del telefono*; sul PC resta la scelta dei file.
- **Notifiche di OneDrive**: un caricamento non riuscito o interrotto ricorda le attività coinvolte (`ids`): sotto la notifica ci sono *Ricarica* e *Apri attività*.
- **Ubicazioni**: ubicazione dei manufatti RA e dei punti radon, postazione dei punti aria e «Dove» nei punti da campionare del DDA vanno a capo e crescono col testo (`InpGrow`); anche il titolo delle schede chiuse mostra fino a tre righe.

## Planimetrie

In DDA, Mappatura, RA, radon e monitoraggio aria c'è la sezione **Planimetrie**: carichi uno o più PDF (o li importi da JSON) e li apri nel visualizzatore (PDF.js 4.10, `vendor/pdfjs.min.mjs`).
- **Due dita** ingrandiscono e spostano in ogni momento; dito, mouse o penna usano lo strumento scelto: penna, evidenziatore, linea, freccia,
  rettangolo, cerchio, testo, gomma a oggetto, etichette. Indietro e avanti per pagina, 8 colori (`PLAN_COLORS`) e 4 spessori, «Solo penna».
- **Etichette**: nel vassoio compaiono i campioni (A1, F1…), gli NC, le aree REC, i punti R1… del radon, i manufatti e i punti aria.
  Ogni pianta ha il suo **Piano**: il vassoio propone le etichette di quel piano, le altre sono sotto «Altri campioni».

Toccando **Fine** l'app fonde disegni ed etichette in un nuovo PDF ("_annotata"). Il PDF originale resta intatto e le annotazioni
restano modificabili: riaprendo la planimetria le ritrovi e il PDF annotato viene rigenerato. Nello ZIP ci sono entrambi,
su OneDrive e nella condivisione va la versione annotata.

**Appunti:** campo libero separato per Fase 1 e Fase 2 del DDA; nel radon un campo per ogni sopralluogo (posa e ritiri) più gli appunti generali.

## Scheda File e attività concluse

- **Scheda File** (dalla v46, `js/file.js`): in ogni attività i documenti da generare (schede campioni dal modello aziendale in PDF ed Excel,
  riepilogo Word, scheda radon, schede aria, PDF dei fogli firme). Grigio da generare, verde generato, ambra se i dati sono cambiati dopo
  (`fileSig`); «Rigenera» crea `_rev1`, `_rev2`… senza cancellare il precedente.
- **Concludi l'attività** (dalla v50, ⋯ Opzioni): chiude l'attività anche con manufatti non visionati o foto mancanti, con conferma, elenco di cosa manca
  e motivo facoltativo (`r.conclusa = { il, motivo, mancanze }`). Esce da «Da completare» e dai numeri del menu; si riapre dalle Opzioni.
  Nell'RA concluso i manufatti senza stato restano «Non visionato».
- **Fogli firme chiusi** (dalla v49): `improntaFoglio` mette nel PDF l'impronta SHA-256 dei dati del foglio.

## Excel e Word

- **Scheda campioni in Excel** (Fase 2, schede MCA e FAV): stessi dati della scheda PDF in un foglio .xlsx modificabile, con date in formato Excel.
- **Riepilogo campioni (Word)** (Archivio della DDA): documento .docx con intestazione della commessa e tutti i campioni prelevati,
  divisi per matrice, con data, descrizione e foto (tre per riga, ridotte per contenere il peso del file).
Entrambi si salvano con la finestra "Salva con nome" (si può scegliere OneDrive) e finiscono anche nello ZIP e nel caricamento su OneDrive.

## Cerca

Ricerca in tutte le attività salvate sul dispositivo, anche offline. Si apre dalla lente in *Oggi*, dalla barra in alto su tablet e PC e dalla voce *Cerca* del menu laterale.

- Filtri: *Tutto*, *Immobile* (indirizzo, città, sito, commessa, cliente, codice), *Titolo* (titoli delle note, aree REC, campioni, manufatti, punti radon e aria, didascalie), *Testo* (testo delle note, appunti, note di campioni e manufatti, voci e schede HSE, azioni) e *Tag*.
- Maiuscole e accenti non contano; con più parole devono esserci tutte, ognuna all'inizio di una parola («via esempi» trova «Via degli Esempi»).
- Sotto il campo ci sono i tag usati, ognuno col suo colore e il numero di volte: toccandone uno compaiono tutte le note e gli appunti con quel tag.
- I risultati sono raggruppati per attività con il punto trovato evidenziato. Toccando un risultato si apre l'attività e Nembo scorre fino alla nota, al campione, al manufatto o al punto (`cercaVai`, evento `nembo-goto` per aprire la matrice giusta nel DDA). Il codice è in `js/cerca.js`.

## File su OneDrive

**Con l'account Microsoft 365 collegato** (Impostazioni → OneDrive → Accedi): "Carica su OneDrive" invia foto, allegati,
PDF e `dati.json` nella cartella dell'app dentro OneDrive › App, una cartella per indagine o campagna. Il nome di quella cartella dipende dal **nome registrato per l'app in Entra ID**, non dal codice: se rinomini l'app qui, per cambiare anche il nome della cartella su OneDrive va rinominata separatamente la app registration in Entra ID (basta il nome visualizzato, non serve ricreare le credenziali).
Foto e allegati si caricano una volta sola; PDF e dati.json vengono sostituiti a ogni invio.
**Più attività insieme** (dalla v49, `js/selezione.js`): tocco prolungato su un'attività negli elenchi o in «Da completare» (su PC il tasto «Seleziona»),
poi un solo invio su OneDrive, ognuna nella sua cartella; senza OneDrive un solo file ZIP.
**Togli dal dispositivo** (dalla v49, Impostazioni → Dati su questo dispositivo, `ArchiviaCard`): con la sincronizzazione attiva, le attività concluse,
non modificate da 6 mesi, 1 anno o 2 anni e già allineate su OneDrive si tolgono dal dispositivo (kv `archiviate`, saltate da `Sync`);
«Riporta sul dispositivo» le fa tornare.
Permesso usato: `Files.ReadWrite.AppFolder` (delegato): l'app legge e scrive solo nella propria cartella, non vede il resto del OneDrive e non cancella nulla.

**Sincronizzazione tra dispositivi** (dalla v20, Impostazioni → OneDrive → *Sincronizza tra i dispositivi*, attiva di default):
con lo stesso account Microsoft, telefono, tablet e PC vedono le stesse attività. Parte da sola all'apertura dell'app, quando torna
la rete e poco dopo ogni modifica; c'è anche il tasto *Sincronizza ora*. Su un dispositivo nuovo basta accedere: le attività arrivano da sole.
- Usa la sottocartella `_nembo/` della cartella dell'app (una scheda per attività e i file per id), separata dalle cartelle leggibili di "Carica su OneDrive".
  In `_nembo/chiavi/` c'è la chiave pubblica di ogni tuo dispositivo, per riconoscerne i backup firmati.
- Quello che arriva da OneDrive passa gli stessi controlli del ripristino: attività o file non validi non vengono salvati e lo dicono le Notifiche.
- Vince la modifica più recente; se un'attività è cambiata su due dispositivi, l'altra versione diventa una copia ("· copia") con le sue foto, e lo dice nelle Notifiche.
- Un'attività eliminata sparisce anche dagli altri dispositivi; i suoi file restano su OneDrive.
- L'attività aperta sullo schermo non viene sovrascritta: si aggiorna quando la chiudi.
- Non chiede mai l'accesso a Microsoft da sola: se la sessione è scaduta lo segnala in Impostazioni.
- Modelli, configurazione e firma del tecnico non passano dalla sincronizzazione delle attività: dalla v51 hanno la loro copia in `_nembo/config/` (vedi sotto).
Controlli: solo PDF, JPEG, PNG verificati sul contenuto, massimo 60 MB, nomi ripuliti, registro degli ultimi caricamenti in Impostazioni.
ID applicazione e ID tenant stanno nel file di configurazione, non nel codice.

**Configurazione su OneDrive** (dalla v51, `cfgSuOneDrive` / `cfgDaOneDrive` in `js/app.js`):
- `_nembo/config/configurazione.json` con impostazioni e modelli; la prima copia di ogni mese resta anche in `configurazione_AAAA-MM.json`.
- Interruttore *Salva su OneDrive* in Impostazioni → File di configurazione (`cfgOd`, attivo di default). Si aggiorna 5 s dopo ogni modifica, solo dai dispositivi «collegati» (kv `cfg_od`): uno nuovo non sovrascrive la configurazione buona prima del ripristino.
- La **firma del tecnico** va su OneDrive solo cifrata con un **PIN di 6 cifre** (PBKDF2-SHA256 310.000 iterazioni, AES-GCM); sul dispositivo resta la chiave non esportabile, mai il PIN. Senza PIN la firma non va su OneDrive.
- Il codice utente non va su OneDrive: resta nel file di configurazione esportato.

**Backup su OneDrive** (dalla v51): con l'account collegato il pulsante della pagina Backup diventa *Salva su OneDrive* e salva lo ZIP firmato in `_nembo/backup/`
(fino a 2 GB, a blocchi, senza la firma del tecnico). La pagina Backup mostra gli ultimi 3 e li ripristina con un tocco;
Nembo non cancella i backup precedenti, restano su OneDrive.

**Icona di sincronizzazione** (dalla v51, `SyncBtn` in Oggi al posto della campanella): verde se l'ultimo giro riuscito ha meno di 24 ore,
arancione se è più vecchio o offline, rossa se non è riuscito, grigia «non collegato» senza OneDrive. Toccandola sincronizza;
in errore apre il motivo con il collegamento a Impostazioni → OneDrive.
Gli errori non letti sono un pallino rosso sul profilo (avatar in Oggi, profilo nel menu laterale); **Notifiche** è la prima voce delle Impostazioni.

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

## Aspetto

- **Due stili, ognuno chiaro e scuro** (dalla v49): *Essenziale* (grigio freddo e blu, predefinito) e *Originale*
  (rosa-grigio e petrolio). In Impostazioni → Aspetto e avvio si scelgono lo **stile** e l'**aspetto**: *Automatico*
  (segue il tema chiaro o scuro del dispositivo, predefinito), *Chiaro* o *Scuro*. La scelta resta solo su quel dispositivo
  (`nembo_style` e `nembo_mode` in localStorage; la vecchia `nembo_theme` della v46–v48 viene convertita al primo avvio).
- **Impostazioni a gruppi** (dalla v49), come su iPhone: Tecnico in alto, poi Generali, Dati e OneDrive, Attività e Supporto.
  Sul telefono ogni voce apre la sua pagina (il tasto indietro torna all'elenco); su tablet in orizzontale e PC elenco a
  sinistra e pagina a destra. Le voci sono in `SET_PAGES` e `SET_GROUPS` in `js/app.js`.
- **Guida** (dalla v49, `js/guida.js`): al primo avvio (nessuna attività e nessuna configurazione) un **benvenuto** in quattro
  slide nel foglio delle Novità, l'ultima con la scelta della Business Unit (`buDefault`). In Oggi i **Primi passi** in due fasi,
  *Prepara il dispositivo* (configurazione, modelli Word per l'HSE, firma, OneDrive con sincronizzazione, installazione) e
  *Prova sul campo* (attività di prova, foto, file generato, backup): si spuntano da soli con i dati veri; alla fine compare
  «Pronto per il primo sopralluogo». Chi ha già più di tre attività salta la Fase 2. **Suggerimenti** una volta sola la prima
  volta che si apre una funzione (`SUGGERIMENTI`: programmazione, planimetrie, campioni, file, radon; visti in `nembo_tips`).
  Impostazioni → Guida rivede il benvenuto e riattiva suggerimenti e primi passi.
- **Font IBM Plex** inclusi in `fonts/` (woff2, licenza OFL in `fonts/OFL.txt`): funzionano anche offline.
- **Telefono e tablet in verticale**: tab bar flottante in basso, in stile segmented control (Oggi, DDA, Mappature, RA, Radon; con BU HSE: Oggi, HSE, DDA, RA); nelle schede la barra
  azioni in basso con l'azione principale. **Tablet in orizzontale e PC**: menu laterale comprimibile + elenco e scheda.
- **Oggi**: prossimo sopralluogo, «Attività di oggi» con gli anelli della giornata, «Scadenze» (ritiri radon e verifiche RA, calcolate sulla fine
  dell'anno di incarico), «Da completare», «Strumenti e dati», «Giornata chiusa». Su PC e tablet in orizzontale tre colonne.
- **Numeri del menu laterale**: contano solo le attività aperte (`attAperta` in `js/home.js`): non quelle concluse e su OneDrive, annullate o chiuse con «Concludi l'attività».
- **Indicatore di stato** (dalla v48): una sola barra colorata a sinistra, come nelle Notifiche, per stato di invio e criticità.
- **Campioni** raggruppati per piano, con segnaposto rosso e foto rapida per quelli ancora senza foto.

## Icone e schermata di avvio

Icona dell'app con la nuvola irezumi, usata anche in cima al menu laterale (`icons/`, anche `apple-touch-icon.png`).
Schermata di avvio: sfondo con le nuvole irezumi (`splash/bg-desktop.webp` per schermi orizzontali, `splash/bg-phone.webp` per quelli verticali) e la scritta «Nembo» in Poppins Bold (`fonts/poppins-700-nembo.woff2`, solo le lettere della parola).

## Design system: Rilievo

Il design system di Nembo si chiama **Rilievo**: token all'inizio di `styles.css` (quattro temi, scala del testo, raggi, spazi, colori dei tipi), `TIPO_COL` e `PRINT` in `js/core.js`.
Niente colori, dimensioni del testo, raggi o spazi scritti a mano. Token, componenti, stati e accessibilità: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
## Assistenza e dati del dispositivo

- **Errori dell'app**: gli errori imprevisti finiscono nelle Notifiche con codice `APP-JS` (senza ripetizioni). Se una schermata va in errore compare «Qualcosa non ha funzionato» con *Torna a Oggi*, *Ricarica* e *Segnala*.
- **Segnala un problema** (Notifiche e Impostazioni → Assistenza): prepara un'email con versione, dispositivo e ultimi errori. Il destinatario è `supportEmail`, nel file di configurazione.
- **Primi passi** in Oggi: configurazione, firma, OneDrive, installazione. Sparisce a passi completati o con *Nascondi*.
- **Rimuovi i dati da questo dispositivo** (Impostazioni): controlla che le attività siano su OneDrive, poi toglie attività, foto, configurazione, modelli, firma e accesso Microsoft. Se qualcosa non è su OneDrive chiede di scrivere ELIMINA.
- **Avvio leggero**: ExcelJS, docx, pdf-lib e pdf.js si caricano solo quando servono (`needLib`); restano nella cache offline.
- La pagina dichiara `noindex` per i motori di ricerca.
- **Firma da immagine** (v27): per la firma del tecnico (Impostazioni, momenti radon) e del relatore nei fogli firme si può caricare una foto della firma su carta bianca; lo sfondo viene tolto (soglia adattiva a blocchi) e l'immagine ritagliata. Non disponibile per chi firma con «Passa il telefono» né per il referente del cliente.

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
| `js/verbale.js`, `js/vs-word.js` | Verbale HSE e il suo Word |
| `js/clienti.js` | anagrafica clienti e preferenze (foglio firme, email) |
| `js/cerca.js` | ricerca in tutte le attività |
| `js/riepilogo.js` | riepilogo via email |
| `js/file.js` | scheda File: documenti, stato, revisioni |
| `js/novita.js` | Novità di ogni versione |
| `js/guida.js` | benvenuto, primi passi, suggerimenti |
| `js/selezione.js` | selezione di più attività |
| `js/agenda.js` | programmazione: ora e durata, vista a fasce orarie, JSON del piano, file .ics |
| `js/aria.js` | monitoraggio aria: punti, calcoli, sezione per attività e RA, schede Excel/PDF |
| `js/firme.js` | fogli firme: modelli, sezione nelle attività, attività a sé, passa il telefono, impostazioni |
| `js/home.js` | schermata Oggi e foglio Nuova attività |
| `js/onedrive.js` | caricamento su OneDrive e stato di invio |
| `js/controlli.js` | controlli su allegati, backup e sincronizzazione; firma dei backup; cifratura della firma con il PIN |
| `js/sync.js` | sincronizzazione tra dispositivi tramite la cartella dell'app (`_nembo/`) |
| `js/app.js` | navigazione, impostazioni, backup ZIP e ripristino, configurazione e backup su OneDrive |
| `fonts/` | IBM Plex Sans e Mono (woff2) |
| `pdfgen.js` | compilazione PDF (pdf-lib), compreso il PDF del foglio firme |
| `vendor/` | librerie incluse per l'uso offline: Preact, htm, pdf-lib, PDF.js 4.10 (modulo `.mjs` con il worker), JSZip, ExcelJS, docx, signature_pad, MSAL; le pesanti si caricano con `needLib` |
| `globals.json` | nomi globali per ESLint (i file sono script globali, senza import); si rigenera con `tools/aggiorna-globals.py` |
| `.eslintrc.cjs` | configurazione di ESLint (regola `no-undef`) |
| `tools/` | script di sviluppo, non caricati dall'app |
| `docs/` | documentazione: architettura, modello dei dati, flussi, design system, privacy e sicurezza, requisiti, decisioni, guida rapida, checklist, changelog |
| `CLAUDE.md` | istruzioni per le sessioni di Claude Code e Copilot |

Se cambia il modulo radon, i nomi dei campi del nuovo PDF vanno rimappati in `RADON_ROWS` (pdfgen.js).
Non aggiungere mai al repository file con dati reali (moduli, modelli Word, offerte, backup ZIP, configurazione).
Se cambia la scheda campioni, vanno ricontrollate le coordinate `SC_LINES` / `SC_COLS`.
Nembo non si apre dentro altre pagine (controllo all'inizio di `js/core.js`). Tutto ciò che entra da ripristino, sincronizzazione e import passa da `pulisciRecord` / `pulisciImpostazioni` (`js/controlli.js`).

## Da sapere

- **Backup**: lo ZIP contiene cartelle leggibili (foto, allegati, PDF) e `manifest.json` per il ripristino.
  Dalla v48 `manifest.json` ha l'impronta SHA-256 di ogni file e `firma.json` lo firma due volte: con la chiave del dispositivo
  (la parte segreta non esce mai dal dispositivo) e con il codice utente del file di configurazione.
  Chrome Android non permette di condividere file .zip: finisce in Download, da lì si carica con l'app OneDrive.
  I PDF singoli invece si condividono direttamente su OneDrive.
  Dalla v51, con OneDrive collegato, il backup va in `_nembo/backup/` (senza la firma del tecnico); il backup salvato sul dispositivo la contiene.
- **Ripristino**: Backup → uno degli ultimi 3 su OneDrive, oppure "Scegli file ZIP" (il selettore di Android mostra anche OneDrive).
  Firma non corrispondente: ripristino annullato. Backup senza firma o di un dispositivo non riconosciuto: Nembo chiede conferma.
  File modificati, di tipo non ammesso o attività non valide vengono scartati e riportati nelle Notifiche; impostazioni e modelli passano gli stessi controlli del caricamento a mano.
- **Allegati**: solo foto, PDF e Word (.docx). Le foto vengono ridisegnate in JPEG; i PDF si aprono nel visore di Nembo senza eseguire script
  (quelli che ne contengono sono segnalati); i Word con macro, controlli ActiveX, oggetti eseguibili o contenuti da Internet vengono rifiutati
  e si aprono con l'app Word. I .doc (Word 97–2003) non sono ammessi: salvali prima come .docx.
- **Codici MCA/FAV**: si rinumerano eliminando un campione finché non generi la scheda campioni; da lì restano fissi.
- **Radon**: "Conferma e blocca" richiede data e firma del tecnico; blocca i dati di posa. "Sblocca" cancella le firme di quel momento.
  La media per punto è pesata sui giorni di esposizione di Fase 1 e Fase 2.

## Aggiornare l'app

La procedura completa (ramo, versione, Novità, CHANGELOG, prove, pubblicazione) è in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).
Al secondo avvio dopo l'aggiornamento il dispositivo usa la nuova versione; i dati non vengono toccati.
