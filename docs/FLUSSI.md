# Schemi di funzionamento

Ogni schema descrive cosa succede davvero nel codice; tra parentesi le funzioni da guardare.

## 1. Salvataggio di un'attività

```mermaid
sequenceDiagram
  actor U as Tecnico
  participant F as Scheda (useAutosave)
  participant A as App (saveRec)
  participant DB as IndexedDB
  participant S as Sync
  U->>F: modifica un campo
  F->>F: updatedAt = ora, «Salvato» diventa «…»
  Note over F: 500 ms senza altre modifiche,<br/>oppure l'app va in background
  F->>A: onSave(record)
  A->>DB: DB.put(migraRecord(record))
  A->>S: Sync.schedule() → giro tra 20 s
```

Non esiste un tasto Salva. Un record nuovo vuoto non viene salvato. Le foto vengono ridotte a 1600 px e salvate come blob (`saveImage`), il record tiene solo gli id.

## 2. Sincronizzazione tra dispositivi

```mermaid
sequenceDiagram
  participant S as Sync.run
  participant DB as IndexedDB
  participant OD as OneDrive _nembo/
  S->>S: account collegato? online? giro già in corso?
  S->>OD: 1. lapidi delle attività eliminate qui (sync_del)
  S->>OD: 2. elenco records/ con lastModified
  loop per ogni file cambiato (lastModified ≠ sync_state.m)
    OD-->>S: record remoto + elenco dei suoi blob
    S->>S: pulisciRecord (stessi controlli del ripristino)
    alt manca in locale
      S->>DB: aggiunge (scarica i blob mancanti)
    else cambiato solo il remoto
      S->>DB: sostituisce
    else cambiati entrambi
      S->>DB: vince updatedAt più alto, l'altro diventa «· copia» + notifica
    else lapide
      S->>DB: elimina se non modificato dopo
    end
  end
  loop attività locali con updatedAt > sync_state.v (non _new, non aperta, non archiviata)
    S->>OD: prima i blob mancanti (sync_blobs), poi records/<id>.json
  end
  S->>DB: sync_state, sync_last
```

Quando parte: dopo il primo caricamento, al collegamento a OneDrive, al ritorno della rete (1,5 s), al ritorno in primo piano se l'ultimo giro ha più di 2 minuti, 20 s dopo un salvataggio, 3 s dopo un'eliminazione, con «Sincronizza ora» e (v51) toccando l'icona in Oggi.
Icona in Oggi (v51): verde se l'ultimo giro riuscito ha meno di 24 ore, arancione se è più vecchio o offline, rossa se non è riuscito o l'accesso va rinnovato, grigia se OneDrive non è collegato.

## 3. Invio a OneDrive (cartelle leggibili)

```mermaid
flowchart LR
  A["Invia a OneDrive<br/>(barra, Opzioni, selezione di più attività)"] --> B{account e rete?}
  B -- no --> Z["condivisione di Android a gruppi di 10<br/>o file ZIP"]
  B -- sì --> C["odRecordItems: foto, allegati,<br/>file generati, planimetrie, dati.json"]
  C --> D{file già inviato?<br/>od_sent}
  D -- foto/allegato già inviato --> E[salta]
  D -- no, o documento --> F["controllo del tipo reale (sniff)<br/>≤ 4 MB: PUT · oltre: sessione a blocchi"]
  F --> G["od_synced[id] = { t, ok }<br/>barra verde · ambra se modificata dopo · rossa se incompleta"]
  F -- errore --> H["Notifiche con codice HTTP · Graph,<br/>Ricarica e Apri attività"]
```

Con la selezione (v49) le attività scelte partono in un solo invio, ognuna nella sua cartella; senza OneDrive diventano un unico ZIP (`exportRecords`).

## 4. Backup e ripristino

```mermaid
flowchart TB
  subgraph Backup
    B1["Crea backup completo / Salva su OneDrive"] --> B2["buildZip: cartelle leggibili,<br/>impronta SHA-256 di ogni file, manifest.json"]
    B2 --> B3["firma.json: firma del dispositivo (ECDSA)<br/>+ firma del codice utente"]
    B3 --> B4{"OneDrive collegato e online? (v51)"}
    B4 -- sì --> B5["_nembo/backup/Nembo_backup_….zip<br/>(senza firma del tecnico)"]
    B4 -- no --> B6[Download / Salva con nome]
  end
  subgraph Ripristino
    R1["ZIP scelto o uno degli ultimi 3 su OneDrive"] --> R2{firma}
    R2 -- non corrisponde --> RX[annullato]
    R2 -- assente o dispositivo sconosciuto --> R3[chiede conferma]
    R2 -- valida --> R4
    R3 --> R4["ogni file: impronta e tipo reale;<br/>ogni record: pulisciRecord"]
    R4 --> R5["sostituisce solo i record più vecchi;<br/>scartati e alterati nelle Notifiche"]
    R5 --> R6{impostazioni e modelli?}
    R6 -- conferma --> R7[pulisciImpostazioni, checkTemplate, salva]
  end
```

## 5. Configurazione su OneDrive (v51)

```mermaid
stateDiagram-v2
  [*] --> NonCollegato
  NonCollegato --> Controllo: accesso a Microsoft
  Controllo --> Proposta: su OneDrive c'è già una configurazione
  Controllo --> Collegato: non c'è → la prima copia la salva questo dispositivo
  Proposta --> Collegato: Ripristina (PIN facoltativo per la firma)
  Proposta --> Rimandato: Non ora
  Rimandato --> Proposta: Impostazioni → File di configurazione → Ripristina da OneDrive
  Collegato --> Collegato: ogni modifica a impostazioni o modelli → salva dopo 5 s,\nprima copia del mese anche in configurazione_AAAA-MM.json
```

- Un dispositivo salva solo se è «collegato» (`cfg_od.ok`): così uno nuovo non sovrascrive la configurazione buona.
- La firma va su OneDrive solo cifrata: AES-GCM con chiave PBKDF2 (310.000 iterazioni) dal PIN di 6 cifre. Sul dispositivo resta la chiave non esportabile, mai il PIN. Se al ripristino il PIN manca o è sbagliato, la firma remota resta quella e il resto viene ripristinato.
- Il codice utente non va su OneDrive; resta nel file di configurazione esportato.

## 6. Import dai documenti

```mermaid
flowchart LR
  P["Documento (PMC, relazione, email)"] -->|prompt di Nembo_Prompt.txt| C[Claude o Copilot] --> J[file JSON]
  J --> T{type}
  T -- nembo-programmazione --> A["agendaJson: un'attività per riga,<br/>duplicati saltati, RA ripresi dall'anno prima"]
  T -- ra-mappatura --> R["importRa: manufatti nuovi + planimetrie"]
  T -- dda-fase1 --> D1["importDda: solo campi vuoti, lucchetto"]
  T -- dda-fase2 --> D2{dove}
  D2 -- DDA / Mappatura --> P2["importPrecedente: r.precedente,<br/>numerazione, rinumera i campioni non bloccati"]
  D2 -- RA --> R2["campioni MCA non negativi e NC MCA → manufatti"]
  A & R & D1 & P2 & R2 --> PL["importPlanimetrie: immagini → PDF di una pagina,<br/>nomi già presenti saltati"]
```

Numerazione che prosegue (v50): `precBase` prende il numero più alto tra indagine importata e attività in Nembo dello stesso immobile (`precNembo`, `stessoImmobile`); i nuovi campioni partono da lì, salvo `numerazione: "nuova"` o interruttore spento.

## 7. Scheda File

```mermaid
stateDiagram-v2
  [*] --> Grigio: documento possibile (recDocs)
  Grigio --> Verde: Genera → blob salvato, files[chiave] = { t, sig, rev, blobId }
  Verde --> Ambra: i dati da cui dipende cambiano (fileSig ≠ sig)
  Ambra --> Verde: Rigenera → nuova revisione _revN, la precedente resta
  Verde --> Verde: tocco → apre il file
```

Dopo la generazione della scheda campioni i codici MCA/FAV restano bloccati (`congelati`). I file generati vanno su OneDrive subito o al prossimo invio.

## 8. Attività aperte, concluse e «Da completare»

```mermaid
flowchart TB
  R[attività] --> X{annullata o conclusa?}
  X -- sì --> C[chiusa]
  X -- no --> T{tipo}
  T -- radon --> TR{terminata?}
  T -- RA --> TA{tutti i manufatti valutati e caricata?}
  T -- fogli firme --> TF{tutti i fogli chiusi?}
  T -- altre --> TO{dati raccolti e su OneDrive senza modifiche?}
  TR & TA & TF & TO -- sì --> C
  TR & TA & TF & TO -- no --> A[aperta: conta nel menu laterale]
```

«Concludi l'attività» (v50) salva `conclusa = { il, motivo, mancanze }`: l'attività esce da «Da completare» e dai numeri del menu anche con foto o manufatti mancanti; nell'RA i manufatti senza stato restano «Non visionato». Si riapre dalle Opzioni.

## 9. Aggiornamento dell'app

```mermaid
sequenceDiagram
  participant G as GitHub Pages (main)
  participant SW as Service worker
  participant A as App
  G-->>SW: nuova sw.js (VERSION diversa)
  SW->>G: scarica tutti i FILES con cache: reload
  SW->>SW: nuova cache, skipWaiting, cancella le vecchie
  Note over A: al secondo avvio gira la nuova versione
  A->>A: novitaDaMostrare: voci di NOVITA dopo novita_vista
  A->>A: migraRecord sui record se REC_SCHEMA è cresciuto
```

## 10. Notifiche

Esiti e errori dei caricamenti, promemoria radon, copie da conflitto, Novità ed errori dell'app (`APP-JS`) vanno in `kv.notifiche` (ultime 200, scritte in coda). Gli errori non letti diventano il pallino rosso sul profilo (v51) e la campanella nelle schermate interne; la pagina Notifiche ha i filtri Tutte · Errori · Esiti, «Ricarica», «Apri attività» e «Copia dettagli».
