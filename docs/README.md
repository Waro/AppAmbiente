# Documentazione tecnica di Nembo

Documenti per chi sviluppa Nembo (persone, Claude, Copilot). Aggiornati alla versione **nembo-v51**.
Nessun dato reale: nomi, indirizzi e codici negli esempi sono inventati.

| Documento | Cosa contiene |
|---|---|
| [ARCHITETTURA.md](ARCHITETTURA.md) | Come è fatta l'app: livelli, moduli e dipendenze, avvio, navigazione, offline, librerie, CSP, temi, test |
| [DATI.md](DATI.md) | Modello dei dati: archivio locale, tipi di attività e loro parti (diagramma relazionale), chiavi kv, localStorage, cartelle su OneDrive, formati JSON, ZIP di backup, configurazione |
| [FLUSSI.md](FLUSSI.md) | Schemi di funzionamento passo per passo: salvataggio, sincronizzazione, caricamento su OneDrive, backup e ripristino firmati, configurazione su OneDrive, import da documenti, scheda File, attività concluse, aggiornamento |
| [SICUREZZA.md](SICUREZZA.md) | Cosa si protegge e come: dati sensibili fuori dal codice, controlli in ingresso, firme, PIN, permessi Microsoft, limiti noti |

Gli altri riferimenti:
- `README.md` nella radice: funzioni per area, rilascio, struttura dei file, design system Rilievo.
- Design system **Rilievo**: token all'inizio di `styles.css`; documentazione con anteprime dei componenti nella cartella `Rilievo/` del pacchetto di passaggio (fuori dal repository).
- `Nembo_handoff.md`, `Nembo_Prompt.txt`, guida utente e presentazione: nel pacchetto di passaggio, fuori dal repository.

I diagrammi sono in Mermaid: GitHub li disegna direttamente nella pagina del file.
