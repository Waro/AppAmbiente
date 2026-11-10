# Changelog

Formato ispirato a [Keep a Changelog](https://keepachangelog.com/it/1.1.0/). Nembo non usa SemVer: le versioni sono `nembo-vNN`, le correzioni urgenti `nembo-vNNb` (vedi [DECISIONS.md](DECISIONS.md), D-12). Il testo per gli utenti di ogni versione è in `js/novita.js`.

## [Non rilasciato]

### Aggiunto
- Documentazione completa in `docs/` secondo lo schema standard: `CLAUDE.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` (dizionario, enumerazioni, esempi, migrazioni), `DESIGN_SYSTEM.md`, `CHANGELOG.md`, `DECISIONS.md`, `PRD.md`, `PRIVACY_SECURITY.md`, `USER_GUIDE.md`, `RELEASE_CHECKLIST.md`.

### Modificato
- `ARCHITETTURA.md`, `DATI.md`, `SICUREZZA.md` rinominati in `ARCHITECTURE.md`, `DATA_MODEL.md`, `PRIVACY_SECURITY.md`.

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
