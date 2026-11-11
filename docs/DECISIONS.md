# Decisioni

Una voce per decisione. Le date mancanti sono segnate: la decisione è precedente a questa raccolta.

## D-01 — PWA senza server
- **Data:** ⚠️ da verificare (prime versioni, settembre–ottobre 2026).
- **Contesto:** app di campo per un tecnico, spesso senza rete; nessuna infrastruttura dedicata.
- **Decisione:** PWA offline-first, dati in IndexedDB, codice statico su GitHub Pages.
- **Alternative scartate:** Power Apps / AppSheet (il titolare preferisce l'app su misura), backend proprio (manutenzione e dati personali su un server).
- **Conseguenze:** nessun dato centrale; ogni dispositivo è autonomo; condivisione tramite OneDrive dell'utente.

## D-02 — Preact + htm senza build
- **Data:** ⚠️ da verificare.
- **Contesto:** modifiche frequenti, anche da strumenti diversi (Claude, Copilot), senza toolchain.
- **Decisione:** Preact e htm da `vendor/`, script globali in ordine da `index.html`, `globals.json` per ESLint.
- **Alternative scartate:** React con bundler, framework con build.
- **Conseguenze:** nessun `import` tra i file; l'ordine di caricamento conta; ogni file nuovo va in `index.html` e in `FILES` di `sw.js`.

## D-03 — OneDrive solo nella cartella dell'app
- **Data:** ⚠️ da verificare (v10 circa).
- **Contesto:** consegna dei file e continuità tra dispositivi senza permessi dell'amministratore.
- **Decisione:** Microsoft Graph con `Files.ReadWrite.AppFolder` delegato.
- **Alternative scartate:** `Files.ReadWrite.All` o `Sites.Selected` (consenso dell'amministratore, accesso più ampio).
- **Conseguenze:** Nembo non vede il resto del OneDrive; la cartella dipende dal nome dell'app registrata in Entra ID.

## D-04 — Dati riservati solo nel file di configurazione
- **Data:** ⚠️ da verificare.
- **Contesto:** codice pubblico su GitHub Pages.
- **Decisione:** indirizzi, ID Microsoft, laboratori, modelli aziendali, email di supporto arrivano dal file di configurazione per utente.
- **Conseguenze:** il repository non contiene dati reali; ogni utente riceve il proprio file; gli esempi usano dati inventati.

## D-05 — Sincronizzazione con vince l'ultima modifica e copia in conflitto (v20)
- **Contesto:** stesse attività su telefono, tablet e PC.
- **Decisione:** un file per record in `_nembo/records/`, `updatedAt` più alto vince, l'altra versione diventa «· copia»; eliminazioni come lapidi.
- **Alternative scartate:** fusione campo per campo (complessa, rischio di dati incoerenti).
- **Conseguenze:** nessuna perdita silenziosa; l'utente risolve i doppioni.

## D-06 — Nembo non cancella nulla su OneDrive
- **Data:** confermata il 2026-11-10 (v51).
- **Contesto:** la proposta di Copilot cancellava i backup oltre i 3 più recenti.
- **Decisione:** nessuna funzione di cancellazione; la pagina Backup mostra gli ultimi 3.
- **Conseguenze:** lo spazio su OneDrive cresce; la pulizia è manuale.

## D-07 — Design system Rilievo (v47)
- **Contesto:** stili cresciuti per aggiunte, colori e dimensioni scritti a mano.
- **Decisione:** token unici in `styles.css`, quattro temi, un componente per funzione; nessun valore a mano.
- **Conseguenze:** ogni elemento nuovo segue Rilievo; le eccezioni si approvano e si documentano.

## D-08 — Backup firmati (v48)
- **Data:** 2026-11-03.
- **Contesto:** audit di sicurezza: un backup modificato poteva introdurre dati alterati.
- **Decisione:** impronta SHA-256 di ogni file, firma ECDSA del dispositivo e HMAC del codice utente; stessi controlli per sincronizzazione e import.
- **Conseguenze:** ripristino annullato con firma non valida; conferma per backup non firmati o di dispositivi sconosciuti.

## D-09 — La firma del tecnico resta nel backup sul dispositivo (DAT-02)
- **Data:** 2026-11-09.
- **Decisione:** il backup completo locale contiene la firma; quello su OneDrive (v51) no.
- **Conseguenze:** chi possiede lo ZIP locale ha l'immagine della firma.

## D-10 — Firma su OneDrive cifrata con PIN di 6 cifre (v51) — **aperta**
- **Data:** 2026-11-10.
- **Contesto:** ripristinare la firma su un dispositivo nuovo senza file a mano.
- **Decisione provvisoria:** AES-GCM con chiave PBKDF2 da un PIN di 6 cifre; il PIN non resta sul dispositivo.
- **Alternative:** password lunga; non salvare la firma su OneDrive.
- **Conseguenze:** protezione debole contro chi prova tutte le combinazioni sul file. Da decidere.

## D-11 — SharePoint in pausa
- **Data:** ⚠️ da verificare (ottobre 2026).
- **Contesto:** funzioni condivise (registri, magazzino) richiederebbero `Sites.Selected` e l'IT; migrazione del tenant in corso.
- **Decisione:** nessuna lettura o scrittura su SharePoint finché non riparte il progetto.

## D-12 — Versioni `nembo-vNN`
- **Contesto:** il numero di versione è anche il nome della cache del service worker.
- **Decisione:** numerazione progressiva `nembo-vNN`; correzioni urgenti `nembo-vNNb`, mai con il punto; `VERSION` (sw.js) e `APP_VERSION` (core.js) sempre uguali.
- **Alternative scartate:** SemVer (non serve a un'app senza API pubbliche).

## D-13 — Testi approvati prima dell'applicazione
- **Decisione:** ogni testo nuovo o modificato (interfaccia, Novità, guida, presentazione) si propone e si applica dopo l'approvazione del titolare. «Attività», mai «pratica»; mai «roba»; «essere», non «stare».

## D-15 — Primo sopralluogo HSE a note
- **Data:** 2026-11-11 (v53).
- **Contesto:** in sopralluogo il tecnico prende appunti sparsi e non riesce a seguire la checklist o a cercare ogni volta la voce da compilare.
- **Decisione:** il primo sopralluogo HSE ha l'interfaccia del Verbale HSE; i tag proposti sono i capitoli del formato scelto e, quando si usa un capitolo, le sue sottosezioni (Esteso) o voci (Sintetico). Nembo compila il Word del formato associando le note ai capitoli (`hsNoteAOld`). La tabella di rischio e le risposte Sì/No/N.A. si compilano nel Word. I sopralluoghi periodici e i report già salvati restano a schede o a checklist; il Verbale HSE resta un'attività a sé.
- **Alternative scartate:** convertire i report esistenti in note; tabella di rischio nella Check-list.
- **Conseguenze:** due interfacce HSE per lo stesso tipo `hs`, distinte da `aNote`.

## D-14 — Unione manuale delle proposte di Copilot
- **Data:** 2026-11-10.
- **Contesto:** Copilot non legge il repository da solo e la sua proposta v51 partiva dalla v49.
- **Decisione:** a Copilot si allega sempre lo ZIP del codice attuale; le proposte si uniscono con un merge a tre vie e si ricontrollano su Rilievo.
