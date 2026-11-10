# Sicurezza e dati personali

## 1. Principi

1. **Il codice è pubblico**: nessun indirizzo, URL aziendale, ID di tenant o applicazione, email, nome di persona, cliente o laboratorio nel repository. Arrivano dal file di configurazione per utente.
2. **I dati restano sul dispositivo** e, se l'utente lo sceglie, nella cartella dell'app sul suo OneDrive. Non c'è un server di Nembo.
3. **Tutto ciò che entra si controlla**: file allegati, backup, sincronizzazione, configurazione, import JSON.
4. **Il minimo dei permessi**: Microsoft Graph con `User.Read` e `Files.ReadWrite.AppFolder`, delegati, senza consenso dell'amministratore.

## 2. Controlli

| Area | Controllo | Dove |
|---|---|---|
| Pagina | CSP restrittiva, nessuna CDN, `noindex`, niente apertura dentro un iframe | `index.html`, inizio di `core.js` |
| Allegati | solo foto, PDF, Word .docx; tipo reale letto dai primi byte; PDF con JavaScript, azioni o file incorporati segnalati e aperti nel visore di Nembo senza script; Word con macro, ActiveX o contenuti esterni rifiutati; massimo 60 MB e 40 pagine | `controlli.js` (`tipoDaTesta`, `PdfViewer`) |
| Record in ingresso | tipi ammessi, id validi, niente `__proto__`/`constructor`, foto solo data URI PNG/JPEG, massimo 20 MB | `pulisciRecord` |
| Impostazioni in ingresso | campi noti e tipi corretti, firma mai da file | `pulisciImpostazioni`, `applicaConfig` |
| Modelli | PDF e Word verificati (campi e segnaposto attesi) | `checkTemplate` |
| Backup | impronta SHA-256 di ogni file; `firma.json` con chiave ECDSA P-256 del dispositivo (privata non esportabile) e firma del codice utente | `buildZip`, `firmaBackup`, `importZip` |
| Fogli firme | impronta SHA-256 dei dati nel PDF alla chiusura | `improntaFoglio` |
| OneDrive | percorsi interni solo sotto `_nembo/`, senza `..`; nessuna cancellazione; limite 60 MB per file (2 GB per i backup, a blocchi) | `onedrive.js` (`okSync`, `putRaw`) |
| Firma del tecnico su OneDrive (v51) | solo cifrata: AES-GCM 256, chiave PBKDF2-SHA256 310.000 iterazioni da PIN di 6 cifre; sul dispositivo resta la chiave non esportabile, mai il PIN | `controlli.js` (`firmaCifra`, `firmaDecifra`) |
| Dettatura | il microfono usa il riconoscimento di Chrome, che invia l'audio a Google: segnalato nella Guida | `SUGGERIMENTI.dettatura` |

## 3. Limiti noti e scelte aperte

- **PIN di 6 cifre**: protegge la firma da chi apre il file per caso, non da chi lo prende apposta e prova tutti i PIN (un milione di combinazioni). Chi accede alla cartella dell'app ha già l'account Microsoft dell'utente. Alternative: non salvare la firma su OneDrive o usare una password lunga.
- `style-src 'unsafe-inline'` resta nella CSP: Preact imposta gli stili via CSSOM; va verificato con un test prima di toglierlo.
- La configurazione su OneDrive non è firmata: chi può scrivere nella cartella dell'app potrebbe cambiarla. I valori passano comunque da `pulisciImpostazioni` e i modelli da `checkTemplate`.
- Informativa per chi firma i fogli firme (CON-01) e procedura per telefono perso (OWN-03): in attesa dei testi aziendali.
- Migrazione del tenant Microsoft (OWN-02): nuova registrazione dell'app e nuova cartella; passaggio con backup e ripristino.

## 4. Cosa non va mai nel repository

File di configurazione, modelli Word/PDF/Excel aziendali, backup ZIP, file JSON di import, report di audit, backlog, documentazione di Rilievo con esempi reali, schermate con dati reali.
