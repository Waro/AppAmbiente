# Privacy e sicurezza

## 1. Principi

1. **Il codice è pubblico**: nessun indirizzo, URL aziendale, ID di tenant o applicazione, email, nome di persona, cliente o laboratorio nel repository, negli esempi o nei dati di prova. Arrivano dal file di configurazione per utente.
2. **I dati restano sul dispositivo** e, se l'utente lo sceglie, nella cartella dell'app sul suo OneDrive. Non c'è un server di Nembo.
3. **Tutto ciò che entra si controlla**: allegati, backup, sincronizzazione, configurazione, import JSON.
4. **Il minimo dei permessi**: Microsoft Graph con `User.Read` e `Files.ReadWrite.AppFolder`, delegati, senza consenso dell'amministratore.

## 2. Dati personali trattati

Dalla colonna «Dato personale» di [DATA_MODEL.md](DATA_MODEL.md).

| Dato | Di chi | Dove è salvato | Perché |
|---|---|---|---|
| Nome, cognome, email del tecnico | utente | `kv.settings`, file di configurazione, documenti generati | intestazione di schede, report, fogli firme |
| Firma del tecnico (immagine) | utente | `kv.settings`; backup sul dispositivo; su OneDrive solo cifrata (v51) | momenti radon, fogli firme, report |
| Ragione sociale, referente, telefono, email | clienti e referenti | record `cli`, campo `cliente` delle attività | documenti e invio per email |
| Nome, società, ruolo, firma | partecipanti ai fogli firme | `fogli[].partecipanti` | registro di presenze, informative, consegne |
| Nome e firma del referente | referenti dei punti vendita (radon) | `momenti[]` | verbali di posa e ritiro |
| Nomi in redazione, verifica, approvazione, presenti | colleghi e presenti | `meta` di HSE e Verbali, `visite` | report Word |
| Foto | luoghi; possono riprendere persone o targhe | store `blobs` | documentazione fotografica |
| Coordinate GPS | aree REC (luoghi, non persone) | `recs[].lat/lon` | posizione delle aree |
| Appunti, anche dettati | testo libero | campi `appunti`, note | promemoria del sopralluogo |
| Account Microsoft (nome, email) | utente | cache di MSAL in `localStorage` | accesso a OneDrive |

Dove viaggiano: IndexedDB del dispositivo; OneDrive aziendale dell'utente (cartelle leggibili, `_nembo/`, configurazione, backup); file ZIP e PDF che l'utente condivide. Nessun invio ad altri servizi, tranne l'audio della dettatura (§ 4).

## 3. Controlli

| Area | Controllo | Dove |
|---|---|---|
| Pagina | CSP restrittiva (`media-src 'self' blob:` per i video locali, v57), nessuna CDN, `noindex`, niente apertura dentro un iframe | `index.html`, inizio di `core.js` |
| Allegati | solo foto, PDF, Word .docx; tipo reale letto dai primi byte; PDF con JavaScript, azioni o file incorporati segnalati e aperti nel visore di Nembo senza script; Word con macro, ActiveX o contenuti esterni rifiutati; massimo 60 MB e 40 pagine | `controlli.js` (`tipoDaTesta`, `PdfViewer`) |
| Video degli appunti (v57) | solo negli appunti; massimo 120 s e 400 MB; su OneDrive solo se il contenuto è MP4, MOV o WebM (primi byte); id `v_…` esclusi da backup ZIP e sincronizzazione; possono riprendere persone: restano nella cartella dell'app su OneDrive e si cancellano dal telefono dopo il caricamento | `salvaVideo`, `OD.sniff`, `OdAuto` |
| Copia nel telefono (v58) | spenta di serie; se attiva, foto e video scattati finiscono anche nella cartella Download del telefono, fuori dal controllo di Nembo (galleria, eventuale backup del telefono): da attivare solo su un telefono di lavoro | `copiaNelTelefono` |
| Record in ingresso | tipi ammessi, id validi, niente `__proto__`/`constructor`, foto solo data URI PNG/JPEG, massimo 20 MB; elenchi di foto solo con id di testo (oggetti `{ id, … }` solo in `foto` dei sopralluoghi HSE); note HSE (`noteSop`) con campi di testo e tag di testo | `pulisciRecord` |
| Impostazioni in ingresso | campi noti e tipi corretti, firma mai da file | `pulisciImpostazioni`, `applicaConfig` |
| Modelli | PDF e Word verificati (campi e segnaposto attesi) | `checkTemplate` |
| Backup | impronta SHA-256 di ogni file; `firma.json` con chiave ECDSA P-256 del dispositivo (privata non esportabile) e firma del codice utente | `buildZip`, `firmaBackup`, `importZip` |
| Fogli firme | impronta SHA-256 dei dati nel PDF alla chiusura | `improntaFoglio` |
| OneDrive | percorsi interni solo sotto `_nembo/`, senza `..`; nessuna cancellazione; 60 MB per file (2 GB per i backup, a blocchi) | `onedrive.js` (`okSync`, `putRaw`) |
| Firma del tecnico su OneDrive (v51) | solo cifrata: AES-GCM 256, chiave PBKDF2-SHA256 310.000 iterazioni da PIN di 6 cifre; sul dispositivo resta la chiave non esportabile, mai il PIN | `controlli.js` (`firmaCifra`, `firmaDecifra`) |
| Rimozione | «Rimuovi i dati da questo dispositivo» controlla che le attività siano su OneDrive, poi cancella attività, foto, configurazione, modelli, firma e accesso | `DB.wipe` |

## 4. Servizi di terze parti

| Servizio | Dati che riceve | Note |
|---|---|---|
| GitHub Pages | richieste dei file dell'app (indirizzo IP, user agent) | solo codice statico; nessun dato dell'app |
| Microsoft Entra ID e Graph | account, file della cartella dell'app | tenant aziendale dell'utente |
| Riconoscimento vocale di Chrome | audio della dettatura | inviato a Google; segnalato nella Guida (TER-01) |

Font, librerie e icone sono inclusi nell'app: nessuna richiesta a CDN, Google Fonts o analytics.

## 5. Segreti

- Nel codice non ci sono segreti: l'app SPA non usa client secret.
- `msClientId` e `msTenantId` sono identificativi, non segreti, ma restano fuori dal codice (file di configurazione).
- Il codice utente (firma HMAC dei backup) è nel file di configurazione, non nel repository e non su OneDrive.
- Chiave privata del dispositivo: `CryptoKey` non esportabile in IndexedDB.
- Prima di ogni commit: ricerca di nomi, domini e indirizzi reali ([RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)).

## 6. Ultimo audit

- **Audit GDPR e sicurezza** (skill `gdpr-security-audit`): report v2 del 03/11/2026, stato aggiornato al 09/11/2026. Giudizio: rischio **basso** per la parte tecnica; nessun segreto nel codice né nella cronologia.
  - Fatti in v48–v49: C-02, C-03, SEC-02, SEC-03, SEC-04, SEC-05, OWN-05, ROB-01, P-01, DS-05, DS-06, R-01, TER-01, DAT-01.
  - Decisi senza modifiche: SEC-01, DAT-02 (la firma resta nel backup sul dispositivo).
  - In attesa: OWN-01, OWN-02 (migrazione del tenant), CON-01 (informativa a chi firma), OWN-03 (telefono perso), OWN-04, FE-01.
- I report di audit restano fuori dal repository.
- Le funzioni della v51 (configurazione, PIN, backup su OneDrive) non sono ancora passate da un audit.

> ⚠️ Da verificare: la privacy policy o l'informativa aziendale per chi firma i fogli firme (CON-01) non è ancora disponibile; l'app non è pubblicata su store.

## 7. Limiti noti e scelte aperte

- **PIN di 6 cifre**: protegge la firma da chi apre il file per caso, non da chi lo prende apposta e prova tutti i PIN (un milione di combinazioni). Chi accede alla cartella dell'app ha già l'account Microsoft dell'utente. Alternative: non salvare la firma su OneDrive o usare una password lunga. **Decisione aperta.**
- `style-src 'unsafe-inline'` resta nella CSP: Preact imposta gli stili via CSSOM; va verificato con un test prima di toglierlo.
- La configurazione su OneDrive non è firmata: chi può scrivere nella cartella dell'app potrebbe cambiarla. I valori passano comunque da `pulisciImpostazioni` e i modelli da `checkTemplate`.
- Migrazione del tenant Microsoft (OWN-02): nuova registrazione dell'app e nuova cartella; passaggio con backup e ripristino.

## 8. Cosa non va mai nel repository

File di configurazione, modelli Word/PDF/Excel aziendali, backup ZIP, file JSON di import, report di audit, backlog, documentazione di Rilievo con esempi reali, schermate con dati reali.
