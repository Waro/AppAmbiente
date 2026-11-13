# CLAUDE.md — istruzioni per le sessioni su Nembo

Nembo è una PWA offline-first per il lavoro sul campo (DDA, mappature MCA/FAV, sopralluoghi RA, radon, aria, HSE). Codice pubblico su GitHub Pages dal ramo `main`. Documentazione in [`docs/`](docs/README.md).

## Prima di cominciare

- Controlla `APP_VERSION` in `js/core.js`: il lavoro parte sempre dall'ultima versione pubblicata. Una proposta su una versione vecchia toglie le funzioni arrivate dopo.
- Prima di modificare entità, campi o storage leggi `docs/DATA_MODEL.md` e aggiornalo nella stessa modifica.
- Prima di creare o cambiare elementi dell'interfaccia leggi `docs/DESIGN_SYSTEM.md` e applica la skill `ux-design-laws`.

## Stack e comandi

| Cosa | Comando |
|---|---|
| Avvio in locale | `python3 -m http.server 8080` dalla radice → `http://localhost:8080/index.html` |
| Build | nessuna: Preact + htm da `vendor/`, script globali caricati in ordine da `index.html` |
| Prove | Playwright con Chromium (`chromium.launch(args=['--lang=it-IT'])`, `locale='it-IT'`, `service_workers='block'` per l'interfaccia); dati di prova creati con le funzioni dell'app (`newDda`, `newRa`, `DB.put`…), solo inventati |
| Lint | `python3 tools/aggiorna-globals.py` (rigenera `globals.json`) poi `npx eslint@8.57.0 pdfgen.js sw.js js` (`.eslintrc.cjs`, regola `no-undef`): nessun errore prima di ogni rilascio |
| Pubblicazione | merge del ramo della versione in `main` |

## Convenzioni

- Nessun `import` tra i file: i nomi globali si risolvono quando la funzione viene chiamata, quindi un file può usare funzioni di file caricati dopo, ma non mentre lo script viene caricato. File nuovo → `index.html`, `FILES` di `sw.js`, poi `tools/aggiorna-globals.py`.
- Componenti con `html\`…\``; nomi di funzioni e variabili in italiano o abbreviati come nel codice esistente (`newDda`, `attAperta`, `pulisciRecord`).
- Id con `uid(prefisso)`; date `AAAA-MM-GG`; istanti in ms.
- Tutto ciò che entra (ripristino, sincronizzazione, import, configurazione) passa da `pulisciRecord` / `pulisciImpostazioni` / `checkTemplate` in `js/controlli.js`.
- Librerie pesanti con `needLib(nome)`; nessuna CDN (CSP in `index.html`).
- Stili solo con i token di Rilievo e le classi (`.mt-0…4`, `.mb-0`, `.mb-2`, `.lead-gap`, `.grow`, `.self-start`, `.fw-6`): niente colori, dimensioni, raggi o spazi scritti a mano.
- Forma dei record cambiata → `REC_SCHEMA` + passaggio in `migraRecord`.
- OneDrive solo nella cartella dell'app (`Files.ReadWrite.AppFolder`); Nembo non cancella nulla su OneDrive.

## Regole di progetto

- **Nessun dato reale nel codice**, nei commenti, negli esempi, nei dati di prova e nei commit: niente indirizzi, URL aziendali, ID, tenant, email, nomi di persone, clienti o laboratori. Tutto passa dal file di configurazione per utente.
- **Mai nel repository**: file di configurazione, modelli Word/PDF/Excel aziendali, backup ZIP, JSON di import, report di audit, backlog.
- **Testi**: ogni testo nuovo o modificato (interfaccia, Novità, guida, presentazione) si applica direttamente e si mostra sempre nel messaggio finale, così l'utente può dire cosa cambiare (dalla v57; prima serviva l'approvazione). Italiano semplice, seconda persona; «attività», mai «pratica»; mai «roba»; «essere», non «stare». Nelle slide niente prima persona.
- **Rilievo**: se un elemento va fatto diversamente, segnalarlo; dopo l'approvazione aggiornare Rilievo e `docs/DESIGN_SYSTEM.md`.
- **Versione e rilascio**: tutto in [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) (versione, Novità, CHANGELOG, prove, pubblicazione).

## Da non modificare

- `vendor/` (librerie di terze parti, si sostituiscono solo con versioni nuove intere).
- `fonts/`, `icons/`, `splash/` salvo richiesta.
- Le coordinate dei modelli PDF (`RADON_ROWS`, `SC_LINES`, `SC_COLS` in `pdfgen.js`) senza il modello aggiornato da provare.

## Documentazione da tenere allineata

| Modifica | Documenti |
|---|---|
| Entità o campo | `docs/DATA_MODEL.md` (diagramma, dizionario, esempio) |
| Componente o colore | `docs/DESIGN_SYSTEM.md` e Rilievo |
| Dipendenza, integrazione, storage | `docs/ARCHITECTURE.md`; se è una scelta, `docs/DECISIONS.md` |
| Flusso | `docs/FLUSSI.md` |
| Dati personali o controlli | `docs/PRIVACY_SECURITY.md` |
| Sempre | `docs/CHANGELOG.md`; `README.md` se cambia una funzione |

Questa tabella è l'unico elenco dei documenti da aggiornare: la checklist di rilascio rimanda qui.
