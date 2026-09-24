# AppVerbali Ambiente

App web (PWA) per Android: DDA ambientali (Fase 1 e Fase 2) e campagne radon.
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
Contiene impostazioni (tecnico, laboratorio, offerta, codici analisi) e i due modelli PDF. Resta solo su quel dispositivo.
In alternativa si caricano i modelli e si compilano i campi a mano.

**Preparare la configurazione per un collega:** compila le impostazioni sul tuo dispositivo, tocca **Esporta**,
poi nel file `.json` cambia `tecnicoNome`, `tecnicoCognome` e `prelevatoDa` (o lascia che li cambi lui dopo il caricamento).
La firma salvata non viene mai esportata. Il file contiene dati riservati: mai su GitHub.

## File su OneDrive

**Con l'account Microsoft 365 collegato** (Impostazioni → OneDrive → Accedi): "Carica su OneDrive" invia foto, allegati,
PDF e `dati.json` in OneDrive › App › AppVerbali Ambiente, una cartella per indagine o campagna.
Foto e allegati si caricano una volta sola; PDF e dati.json vengono sostituiti a ogni invio. Backup → "Carica tutto su OneDrive" invia tutto l'archivio.
Permesso usato: `Files.ReadWrite.AppFolder` (delegato): l'app scrive solo nella propria cartella, non legge e non cancella nulla.
Controlli: solo PDF, JPEG, PNG verificati sul contenuto, massimo 60 MB, nomi ripuliti, registro degli ultimi caricamenti in Impostazioni.
ID applicazione e ID tenant stanno nel file di configurazione, non nel codice.

**Senza collegamento**: "Invia PDF e foto a OneDrive" usa la condivisione di Android (a gruppi di 10), oppure "Salva tutto in un file ZIP".

## Aggiornare l'app

Modifica i file, poi in `sw.js` aumenta `VERSION` (es. `av-amb-v2`) e ricarica su GitHub.
Al secondo avvio dopo l'aggiornamento il telefono usa la nuova versione. I dati non vengono toccati.

## Struttura

| File | Contenuto |
|---|---|
| `index.html`, `styles.css` | pagina e stile |
| `js/core.js` | archivio locale, foto, condivisione, componenti comuni |
| `js/capture.js` | scanner codici a barre (BarcodeDetector di Chrome) e firma a schermo intero |
| `js/dda.js` | modulo DDA: checklist, aree REC con GPS, campioni per matrice, risultati CSC, scheda campioni |
| `js/radon.js` | modulo radon: punti R1…Rn, tre momenti con firme, esiti e media pesata |
| `js/app.js` | navigazione, impostazioni, backup ZIP e ripristino |
| `pdfgen.js` | compilazione PDF (pdf-lib) |
| `vendor/` | librerie (Preact, htm, pdf-lib, JSZip, signature_pad), incluse per l'uso offline |

Se cambia il modulo radon, i nomi dei campi del nuovo PDF vanno rimappati in `RADON_ROWS` (pdfgen.js).
Non aggiungere mai al repository file con dati reali (moduli, offerte, backup ZIP).
Se cambia la scheda campioni, vanno ricontrollate le coordinate `SC_LINES` / `SC_COLS`.

## Da sapere

- **Backup**: lo ZIP contiene cartelle leggibili (foto, allegati, PDF) e `manifest.json` per il ripristino.
  Chrome Android non permette di condividere file .zip: finisce in Download, da lì si carica con l'app OneDrive.
  I PDF singoli invece si condividono direttamente su OneDrive.
- **Ripristino**: Backup → "Scegli file ZIP" (il selettore di Android mostra anche OneDrive).
- **Codici MCA/FAV**: si rinumerano eliminando un campione finché non generi la scheda campioni; da lì restano fissi.
- **Radon**: "Conferma e blocca" richiede data e firma del tecnico; blocca i dati di posa. "Sblocca" cancella le firme di quel momento.
  La media per punto è pesata sui giorni di esposizione di Fase 1 e Fase 2.
