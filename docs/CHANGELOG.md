# Changelog

Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/). Nembo non usa SemVer: le versioni sono `nembo-vNN`, le correzioni urgenti `nembo-vNNb` (vedi [DECISIONS.md](DECISIONS.md), D-12). Il testo per gli utenti di ogni versione è in `js/novita.js`.

## [Non rilasciato]

## [nembo-v56] — 2026-11-12

### Cambiato
Redesign grafico (stile e impaginazione), Rilievo v56.
- Campi: l'etichetta è dentro il campo, fa da segnaposto nel campo vuoto e sale in alto quando scrivi (animazione di 180 ms, spenta con la riduzione del movimento); campo attivo con contorno `blue` di 2 px. Solo CSS su `.fld` (`:has`, `:placeholder-shown`); `fldSegnaposto()` mette uno spazio come segnaposto ai campi che non ne hanno.
- Un campo per riga: `.grid2` con campi diventa una colonna.
- Icone nei campi di testo in colonna sul bordo destro, dall'alto fotocamera, galleria, microfono; solo l'icona in `blue`, senza fondo; microfono pieno durante la dettatura (`MicBtn`). Le foto collegate alle sezioni HSE (`FotoIn`) hanno anche la galleria.
- Appunti ovunque con il nuovo componente `Appunti` (fotocamera, galleria e dettatura dentro il campo; miniature e tag sotto): DDA Fase 1 e 2, Mappatura, RA, Radon, Aria, Verbale HSE, Firme (solo dettatura), sopralluogo HSE.
- «Note» diventano «Osservazioni» ovunque nei testi (sopralluogo HSE a note, Verbale HSE, ricerca, riepilogo, Word del verbale, Nuova attività); nel sopralluogo HSE la card Appunti è in cima alla scheda Osservazioni e sono tolti i tasti Frasi e Riformula.
- Foto degli appunti senza limite di numero (prima 10).

### Aggiunto
- Riepilogo (`RiepilogoPanel` in `js/riepilogo.js`): pannello dal basso, solo consultazione, aperto da «Riepilogo» nel blocco navy dei contatori. Campioni (DDA Fase 2, Mappatura): conteggio per matrice, avvisi sui campioni senza foto e non posizionati, campioni per piano, appunti, «Genera file». Sopralluogo HSE a note: check-list, osservazioni per capitolo con le foto, appunti, «Genera report».
- Dopo la prima foto di un campione non ancora in pianta si apre la planimetria del suo piano con lo strumento Etichette e l'etichetta del campione già scelta (`dopoFoto`; `PlanViewer` con `pre`); alla chiusura si torna alla scheda Campioni.
- Schede di un'attività (`Schede`): si passa alla scheda accanto anche scorrendo a sinistra o a destra sul contenuto.
- Campioni (DDA Fase 2 e Mappatura): campi del campione uno per riga con l'etichetta dentro (Sigla, Piano, Ubicazione, Descrizione con dettatura, Data prelievo, Quantità); titoli dei piani e dei manufatti non campionati dentro la card a tutta larghezza (`.list-h`); tolti gli esempi accanto ai titoli («Codici automatici A1, A2…», «NC1, NC2…»); nuovo tasto Planimetria sopra l'elenco dei campioni, che apre la pianta del piano dell'ultimo campione (`PlanList` con `apri`).

## [nembo-v55b] — 2026-11-12

### Corretto
Ispezione (metodo Fagan) del sopralluogo HSE a note, v53–v55.
- Selezione delle note (sopralluogo e Verbale): il primo tocco dopo il tocco prolungato non va più perso (`useNoteSel` ascolta la fine del tocco sulla finestra); su PC «Seleziona»; niente menu del browser né selezione del testo durante il tocco prolungato; con il filtro attivo la selezione e «Tag (N)» valgono solo per le note visibili.
- «Non pertinente» non nasconde più le note del capitolo (Check-list e Word); l'interruttore compare solo nei capitoli senza note e la nota «Nel Word: …» solo nell'Esteso.
- Periodico da un sopralluogo a note: rosso/nero di nuovo attivo (`hsNoteAOld(r, true)` non spegne `novitaRosso`); ora, durata, stato e drone non si ereditano dal report di partenza (`hsNextYear`); i dati di Nuova attività o del piano (commessa, cliente…) valgono anche per il periodico, solo se compilati; un doppio tocco non crea due sopralluoghi; da Nuova attività il sopralluogo si apre dopo la chiusura del foglio, come per le altre attività.
- `HsDaAvviare` conserva la nota del piano (`appunti`) e i campi bloccati (`imp`).
- `DocBtn`: dopo il foglio «capitoli senza note» il Word si genera con l'attività aggiornata (prima il tasto tornava subito ambra).
- Committente proposto (`hsCommEsteso`/`hsCommSint`) non più cancellato da un campo vuoto in Nuova attività, nella Programmazione e nel piano JSON (dove non viene bloccato).
- Filtro per tag bloccato quando il tag spariva da tutte le note (sopralluogo e Verbale); ‹ › con il filtro si scambiano con la nota visibile vicina; numero della nota = ordine a schermo.
- Foto: stesso numero nel Word e nei file di OneDrive, ZIP e riepilogo (`hsFotoOrd` usa l'ordine dei capitoli); le foto delle note senza capitolo restano fuori dal Word; nota con sola foto: nessuna «Nessuna criticità rilevata» e foto collegata alla voce anche nel Sintetico; foto di una nota eliminabili (`FotoCollegate` con `togli`); dalla fotocamera della barra non resta una nota vuota se la foto non si salva.
- Riepilogo del sopralluogo a note: una voce per nota con capitolo, testo e foto.
- `pulisciRecord`: `noteSop` normalizzato (non manda più in errore l'elenco); foto come oggetti ammesse solo in `foto` dei sopralluoghi HSE.
- Programmazione: i vecchi sopralluoghi a schede senza report di partenza non mostrano più «periodico».
- Novità: le correzioni `nembo-vNNb` hanno la loro voce (`verNum` → NN.1, etichetta «vNNb»).

## [nembo-v55] — 2026-11-11

### Aggiunto
- Programmazione: «HSE · primo sopralluogo» e «HSE · periodico» (tipi `hsPrimo` e `hsPeriodico` nel piano JSON; `hsE` e `hsS` restano validi). L'attività nasce con `daScegliere` e senza formato: all'apertura `HsDaAvviare` mostra la scelta (`HsScelta`, la stessa della seconda schermata di Nuova attività). In calendario e negli elenchi il formato non compare finché non è scelto.

### Modificato
- Coerenza con Rilievo: nel sopralluogo periodico HSE lo stato delle sezioni è la barra a sinistra con la parola (`hsSecStato`), come nella Check-list; etichette per i lettori di schermo sui pulsanti ‹ › ed elimina di galleria HSE e Verbale; virgolette « » ovunque.
- «Sopralluogo» per l'attività HSE (elenco, occhiello, Opzioni, messaggi), «report» solo per il Word; «Da un sopralluogo in Nembo», «Nuovo sopralluogo periodico da questo».
- `docs/DESIGN_SYSTEM.md`: regola del pulsante a sinistra nei fogli («Annulla» o «Chiudi»).

## [nembo-v54] — 2026-11-11

### Modificato
- Solo struttura, nessuna modifica al funzionamento. `js/app.js` diviso: ZIP, ripristino e pagina Backup in `js/backup.js`; file di configurazione in `js/config.js`; Impostazioni, dati sul dispositivo e Notifiche in `js/impostazioni.js`.
- `js/hs-word.js` diviso: struttura dei formati e modello dell'attività in `js/hs-data.js`, lettura dei report precedenti in `js/hs-leggi.js`; resta il motore Word.
- Campioni e NC condivisi da DDA e Mappatura in `js/campioni.js` (prima in `js/dda.js`).
- `docs/PRD.md`: ogni criterio di accettazione ha la sua prova (tabella criterio → prova → tipo).
- README senza ripetizioni: contenuto del file di configurazione, struttura dello ZIP di backup e controlli in ingresso rimandano a `docs/DATA_MODEL.md` e `docs/PRIVACY_SECURITY.md`.

## [nembo-v53] — 2026-11-11

### Aggiunto
- Primo sopralluogo HSE a note (`js/hs-note.js`, `aNote`, `noteSop`, `np`): interfaccia del Verbale HSE con schede Anagrafica · Note · Check-list · File; tag dei capitoli del formato e, con il capitolo, delle sottosezioni (Esteso) o voci (Sintetico); gruppi automatici per capitolo.
- Check-list dei capitoli con stato verde, rosso, grigio (`hsStatoCap`, `.st-off`) e «Non pertinente»; foglio «N capitoli senza note» prima del Word (`DocBtn` con `prima`).
- Word del sopralluogo a note con il motore del formato (`hsNoteAOld`): Esteso nelle schede, Sintetico nelle annotazioni delle voci o in «Condizioni generali».
- Nuova attività HSE: «Sopralluogo HSE» con seconda schermata (`SopralluogoHse`): primo sopralluogo Esteso o Sintetico, sopralluogo periodico da Word, JSON o report in Nembo.
- Selezione di più note con tocco prolungato e «Tag (N)» (`useNoteSel`, `TagMultiSheet`), anche nel Verbale HSE; `TagPicker` con tag proposti per primi (`fissi`).

### Modificato
- Word Esteso: il testo del capitolo (`sit`) esce anche nei capitoli con sottosezioni, prima di esse; all'import «Nessuna criticità rilevata» non diventa testo.
- Anagrafica Esteso e Sintetico in componenti comuni (`HsDatiEst`, `HsAnagEst`, `HsInqEst`, `HsDatiSint`, `HsAnagSint`).

### Corretto
- Ripristino e sincronizzazione svuotavano le foto dei report HSE: `pulisciRecord` teneva solo gli id di testo e scartava gli oggetti `{ id, cap, … }`.
- «Nuovo report per il prossimo sopralluogo» copiava i file Word generati e lo stato «Conclusa» del report precedente.

### Strumenti
- `tools/aggiorna-globals.py` rigenera `globals.json` dai file caricati da `index.html` (728 nomi); `.eslintrc.cjs` con la regola `no-undef`: ESLint ora passa senza errori e segnala un nome globale mancante o rinominato prima del rilascio.
- `globals.json` aggiornato: mancavano i nomi della v50 e della v51 (`importPlanimetrie`, `importPrecedente`, `pinImposta`, `firmaCifra`…) e gli hook di Preact.
- Documentazione senza ripetizioni: la procedura di rilascio è solo in `docs/RELEASE_CHECKLIST.md`, l'elenco dei documenti da aggiornare solo in `CLAUDE.md`, le regole di Rilievo solo in `docs/DESIGN_SYSTEM.md`; il README descrive le funzioni attuali, con titoli senza numeri di versione, nell'ordine attività → funzioni comuni → OneDrive → interfaccia (la storia è in questo CHANGELOG).

## [nembo-v52] — 2026-11-10

### Aggiunto
- Report HSE Esteso: fotocamera in ogni campo «Situazione rilevata», sotto il microfono; la foto è collegata alla sezione (`foto[].ref = 'sch.<k>[.<sottosezione>]'`), le miniature sono sotto il campo, il Word riporta «ID Foto n, m» e l'import del Word ricollega le foto (`FotoIn`, `FotoCollegate`, `HS_EST_REF`).
- In Documentazione fotografica dell'Esteso: sezione collegata a ogni foto, con numero della sezione sulla miniatura.

### Documentazione
- Documentazione completa in `docs/` secondo lo schema standard: `CLAUDE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` (dizionario, enumerazioni, esempi, migrazioni), `DESIGN_SYSTEM.md`, `CHANGELOG.md`, `DECISIONS.md`, `PRD.md`, `PRIVACY_SECURITY.md`, `USER_GUIDE.md`, `RELEASE_CHECKLIST.md`.
- `ARCHITETTURA.md`, `DATI.md`, `SICUREZZA.md` rinominati in `ARCHITECTURE.md`, `DATA_MODEL.md`, `PRIVACY_SECURITY.md`.

### Modificato
- Barre in basso flottanti come la tab bar: barra azioni delle attività (`.abar`), barra della selezione (`.selbar`), barra degli strumenti delle planimetrie (`.plan-bar`); in selezione la barra dell'attività aperta accanto si nasconde.
- Distacco della tab bar dal bordo con il token `--sp-3`.

## [nembo-v51] — 2026-11-10

### Aggiunto
- Configurazione su OneDrive (`_nembo/config/`): interruttore «Salva su OneDrive», salvataggio 5 s dopo ogni modifica, copia mensile, ripristino proposto su un dispositivo nuovo (`cfgSuOneDrive`, `cfgDaOneDrive`, `CfgRestoreSheet`, `CfgOdCard`, kv `cfg_od`).
- Firma del tecnico su OneDrive cifrata con un PIN di 6 cifre (PBKDF2-SHA256 310.000 iterazioni, AES-GCM; kv `cfg_pin`).
- Backup completo su OneDrive (`_nembo/backup/`, fino a 2 GB a blocchi); la pagina Backup mostra gli ultimi 3 e li ripristina.
- Icona di sincronizzazione in Oggi al posto della campanella: verde, arancione, rossa, grigia «non collegato» (`SyncBtn`, `syncColore`, `SyncErrSheet`).
- Pallino rosso degli errori non letti sull'avatar del profilo; «Notifiche» prima voce delle Impostazioni (`.count.crit`).
- Classi `.mt-0`, `.mb-0`.
- Documentazione tecnica in `docs/` (architettura, dati, flussi, sicurezza).

### Modificato
- Proposta di Copilot (nata sulla v49) unita a mano sulla v50; margini scritti a mano sostituiti con le classi di Rilievo.

### Rimosso
- Funzione di cancellazione su OneDrive della proposta di Copilot: Nembo non cancella i backup, mostra solo gli ultimi 3.

## [nembo-v50] — 2026-11-09

### Aggiunto
- Import DDA Fase 2 (`dda-fase2`): indagine precedente di riferimento in DDA e Mappatura (`r.precedente`, `PrecSection`, «Ricampiona»); nell'RA i campioni MCA non negativi e gli NC MCA diventano manufatti.
- Planimetrie dai file JSON (`importPlanimetrie`), con origine «storica» e didascalia.
- Numerazione che prosegue dopo l'indagine precedente o le attività dello stesso immobile (`r.numerazione`, interruttore «Prosegui la numerazione»).
- «Concludi l'attività» nelle Opzioni (`r.conclusa`), con riapertura; nell'RA i manufatti senza stato restano «Non visionato».

## [nembo-v49] — 2026-11-09

### Aggiunto
- Selezione di più attività con un solo invio su OneDrive o un solo ZIP (`js/selezione.js`).
- «Dati su questo dispositivo»: togli e riporta le attività concluse già su OneDrive (kv `archiviate`).
- Originale scuro; stile e aspetto separati; Impostazioni a gruppi; Guida con benvenuto, primi passi in due fasi, suggerimenti (`js/guida.js`).
- Impronta SHA-256 dei fogli firme chiusi nel PDF; `REC_SCHEMA` e `migraRecord`.

### Modificato
- Numeri del menu laterale solo per le attività aperte (`attAperta`); PDF.js 4.10 come modulo; JSZip su richiesta; 114 `style=` sostituiti da classi.

### Sicurezza
- Nembo non si apre dentro un iframe; avviso di sincronizzazione a ogni nuovo errore.

### Rimosso
- Codice, classi e nomi vecchi dei colori non usati.

## [nembo-v48b] — 2026-11-09

### Corretto
- RA: «Manufatti dai campioni MCA» solo dallo stesso immobile (`stessoImmobile`).

## [nembo-v48] — 2026-11-03

### Aggiunto
- Allegati solo foto, PDF e .docx con controllo del contenuto; visore PDF senza script (`js/controlli.js`).
- Backup firmati con chiave del dispositivo e codice utente; stessi controlli su ripristino e sincronizzazione.
- Indicatore di stato unico (barra a sinistra); Home con card uniformi e tre colonne su PC.

### Corretto
- Aggiornamento senza copie vecchie in cache (C-02).

## [nembo-v46] — 2026-10-26

### Aggiunto
- Scheda File (`js/file.js`) con stato grigio, verde, ambra e revisioni; schede di prelievo dal modello aziendale in Excel e PDF; NC; piano delle planimetrie; tema scuro; drone; Home semplificata.

## [nembo-v45] — 2026-10-21

### Aggiunto
- Planimetrie: zoom a due dita, penna, evidenziatore, forme, testo, gomma, colori e spessori, «Solo penna»; fotocamera del telefono e galleria.

## [nembo-v44] — 2026-10-20
### Modificato
- Nuovo logo.

## [nembo-v43] — 2026-10-20
### Aggiunto
- Word del Verbale HSE dal modello `vs.docx` (`js/vs-word.js`).

## [nembo-v42] — 2026-10-20
### Aggiunto
- Barra in basso uguale in tutte le attività (`BarraAtt`), Opzioni raggruppate, riepilogo via email (`js/riepilogo.js`).

## [nembo-v41] — 2026-10-20
### Aggiunto
- Zoom nel visualizzatore foto; dati importati protetti dal lucchetto; Novità (`js/novita.js`).

## [nembo-v40] — 2026-10-19
### Aggiunto
- Anagrafica clienti (`js/clienti.js`) e foglio firme pronto alla creazione.

## [nembo-v39] — 2026-10-19
### Modificato
- Schermata di avvio e icona.

## [nembo-v38] — 2026-10-19
### Aggiunto
- Fotocamera interna con galleria; notifiche con Ricarica e Apri attività.

## Versioni precedenti

> ⚠️ Da verificare: date delle versioni fino alla v37 non registrate.

| Versione | Sintesi |
|---|---|
| v37 | Schede in tutte le attività, ultima scheda ricordata |
| v36 | Cerca su tutte le attività, per immobile, titolo, testo e tag |
| v35 | Colori dei tag, icone colorate nel menu laterale |
| v34 | «H&S» diventa «HSE»; Verbale HSE; tag sulle note |
| v33 | Programmazione: viste giorno, settimana, mese; appuntamenti |
| v32 | HSE: foto del sopralluogo precedente fuori dall'invio |
| v29–v31 | Monitoraggio aria, punti S e M, «MONITORAGGIO NON EFFETTUATO» |
| v28 | Word HSE: novità in rosso |
| v27 | Firma da immagine |
| v26 | Errori `APP-JS`, Segnala un problema, Primi passi, rimozione dei dati, `needLib` |
| v24–v25 | Correzioni (pacchetto, PDF radon) |
| v22–v23 | Programmazione con ora, durata, piano JSON, .ics, stati; RA dall'anno precedente |
| v21 | «Pratica» diventa «attività» |
| v20 | Sincronizzazione tra dispositivi (`_nembo/`) |
| v19 | Fogli firme |
| v16–v18 | Sopralluoghi HSE Esteso e Sintetico |
| v14–v15 | Restyling «Essenziale», temi, tab bar |
| v11–v13 | Mappatura, sopralluogo RA, notifiche, stato di invio, tablet a 3 colonne |
| ≤ v10 | DDA, radon con firme, scheda campioni PDF, planimetrie, backup, configurazione, OneDrive |
