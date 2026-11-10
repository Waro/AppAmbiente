# Checklist di rilascio

## Prima di iniziare
- [ ] Ramo della versione creato da `main` aggiornato (es. `v52`).
- [ ] Se il lavoro arriva da Copilot o da un'altra sessione: parte dall'ultima versione (`APP_VERSION`), altrimenti merge a tre vie.

## Codice
- [ ] `VERSION` in `sw.js` e `APP_VERSION` in `js/core.js` uguali (`nembo-vNN`; correzione urgente `nembo-vNNb`, mai con il punto).
- [ ] File nuovi in `FILES` di `sw.js`, in `index.html` (ordine di caricamento) e funzioni globali in `globals.json`.
- [ ] Forma dei record cambiata → `REC_SCHEMA` aumentato e passaggio in `migraRecord`; nuovo store → versione di `indexedDB.open` e `onupgradeneeded`.
- [ ] Nessun colore, dimensione, raggio o spazio scritto a mano: token e classi di Rilievo.
- [ ] Nessun dato reale: ricerca di nomi, domini, indirizzi, ID (`grep -riE "<azienda>|<cliente>|<cognome>|@<dominio>"`), anche nei commenti, negli esempi e nei messaggi di commit.
- [ ] Nessun file riservato (configurazione, modelli, backup, JSON di import, audit, backlog).

## Prove
- [ ] Nessun errore in console (prove di regressione Playwright con dati inventati).
- [ ] Quattro temi: Essenziale e Originale, chiaro e scuro; contrasto 4,5:1.
- [ ] Telefono 390×844, tablet verticale e orizzontale, PC 1440×900.
- [ ] Offline con il service worker attivo; aggiornamento dalla versione precedente (secondo avvio).
- [ ] Graph simulato: invio, sincronizzazione con conflitto ed eliminazione, configurazione, backup.
- [ ] Import di prova (programmazione, RA, DDA Fase 1 e 2) e generazione dei documenti della scheda File.
- [ ] Prova su un dispositivo Android reale per fotocamera, scanner e installazione.

## Testi e documenti
- [ ] Testi nuovi o modificati approvati dal titolare.
- [ ] Voce in `js/novita.js` approvata.
- [ ] `docs/CHANGELOG.md` aggiornato; `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/DECISIONS.md` se toccati; `README.md`.
- [ ] Rilievo aggiornato se è cambiato un componente.
- [ ] Guida utente, presentazione, handoff e pacchetto Copilot se ci sono funzioni visibili.

## Pubblicazione
- [ ] Merge del ramo in `main` e push: GitHub Pages pubblica `main`.
- [ ] Verifica su un dispositivo: Impostazioni → Info app mostra la nuova versione dopo il secondo avvio; il foglio Novità compare.
- [ ] Rami già uniti eliminati da GitHub.
