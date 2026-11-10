# Requisiti di prodotto

## Obiettivo

Trasformare il sopralluogo in documento: raccogliere sul campo dati, foto, planimetrie e firme delle attività ambientali e HSE, anche senza rete, e produrre i documenti da consegnare (PDF, Excel, Word) senza ricopiare nulla in ufficio.

## Utenti

| Utente | Uso |
|---|---|
| Tecnico ambientale (titolare dell'app) | tutte le attività, su telefono, tablet e PC |
| Colleghi delle BU Ambiente e HSE | stesse funzioni, con il proprio file di configurazione |
| Clienti e referenti | non usano l'app: firmano sul dispositivo del tecnico e ricevono i documenti |

## Flussi principali

1. **Preparazione**: installazione, file di configurazione, firma, accesso a OneDrive (o ripristino della configurazione da OneDrive).
2. **Programmazione**: attività da piano JSON preparato con Claude o a mano; stati confermato, in attesa, da programmare, annullato.
3. **Sopralluogo**: apertura dell'attività, compilazione per schede, foto, planimetrie annotate, fogli firme.
4. **Documenti**: scheda File, generazione e rigenerazione con revisioni.
5. **Consegna**: invio a OneDrive in cartelle leggibili, riepilogo via email, email al cliente.
6. **Continuità**: sincronizzazione tra dispositivi, backup firmati, configurazione su OneDrive.

## Requisiti funzionali

| Area | Requisito |
|---|---|
| DDA | Fase 1 (uso del sito, checklist, aree REC con GPS, interviste) e Fase 2 (campioni per matrice, NC, risultati vs CSC, indagine precedente) nella stessa attività |
| Mappatura MCA e FAV | campioni e NC con codici automatici, schede per il laboratorio |
| Sopralluogo RA | manufatti da anno precedente, JSON, campioni MCA o a mano; stati DM 06/09/1994; incarico; monitoraggio aria facoltativo |
| Monitoraggio aria | punti S e M, metodiche SEM, MOCF, FAV, scheda di prelievo e riepilogo esiti |
| Campagne radon | tre momenti con firme, dosimetri per piano letti con la fotocamera, esiti, scheda PDF |
| HSE | report Esteso e Sintetico dal modello Word aziendale, ripresa dall'anno precedente; Verbale HSE a note |
| Comuni | planimetrie annotate, foto, appunti dettati, tag, Cerca, Clienti, fogli firme, Concludi l'attività, selezione multipla |
| Dati | offline completo; sincronizzazione; backup firmati; dati importati protetti; nessuna perdita senza conferma |
| Sicurezza | nessun dato reale nel codice; controlli su tutto ciò che entra; permessi minimi |
| Interfaccia | Rilievo, quattro temi, telefono, tablet e PC, contrasto 4,5:1, bersagli 44 px |

## Fuori ambito

- Server o database centrale; gestione condivisa su SharePoint (in pausa).
- BU Sicurezza (prevista, senza attività).
- Pubblicazione su store; iOS come piattaforma principale (mancano scanner e scelta della cartella).
- Calcoli normativi oltre a quelli presenti (CSC, limiti aria, media radon).

## Criteri di accettazione

- Ogni attività si compila e si genera il suo documento senza rete.
- Una modifica su un dispositivo arriva sugli altri al giro successivo, senza perdere la versione in conflitto.
- Un backup alterato non viene ripristinato.
- Nessun errore in console nelle prove di regressione; quattro temi leggibili; nessun dato reale nel repository.
- I testi dell'interfaccia sono approvati dal titolare.
