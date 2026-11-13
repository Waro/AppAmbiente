# Guida rapida

La guida completa (38 pagine, con schermate) è il PDF `Nembo_Guida_utente.pdf`, fuori dal repository. Qui i passi essenziali.

## Installazione

1. Apri l'indirizzo dell'app con **Chrome** su Android o PC.
2. Menu ⋮ → **Installa app** (oppure il tasto «Installa app» in Oggi). Da installata funziona offline.
3. Impostazioni → **File di configurazione** → **Carica .json** con il file ricevuto.
4. Tocca il tuo nome in Impostazioni e salva la **firma** (a schermo o da immagine).
5. Impostazioni → **OneDrive** → **Accedi** con l'account aziendale.

Su un secondo dispositivo collega prima OneDrive: se c'è già la tua configurazione, Nembo propone di ripristinarla (la firma con il PIN).

## Operazioni principali

| Per… | Fai così |
|---|---|
| Nuova attività | + in Oggi o nell'elenco → tipo → cliente e luogo |
| Programmare | Programmazione → tocca una fascia → attività o appuntamento; oppure **Carica JSON** con il piano preparato da Claude |
| Compilare | schede in alto (Anagrafica, contenuto, File, Firme), anche scorrendo a destra o a sinistra; si salva da sola. L'etichetta è dentro il campo e sale quando scrivi |
| Foto | tasto fotocamera; Galleria accanto per quelle già scattate. In Impostazioni → Foto scegli la fotocamera: Telefono o Nembo (con gli scatti in serie); foto e video vanno subito su OneDrive; con «Copia nel telefono» restano anche nella galleria |
| Planimetrie | cartina a sinistra nella barra → aggiungi PDF → disegna ed etichetta → Fine. Nei campioni: tasto **Planimetria** sopra l'elenco; dopo la prima foto di un campione la pianta del suo piano si apre da sola con l'etichetta pronta |
| Appunti | fotocamera, galleria e microfono dentro la casella, in colonna a destra; foto senza limite; video fino a 2 minuti, che vanno solo su OneDrive |
| Riepilogo | tocca **Riepilogo** nel blocco blu dei contatori (Campioni, Osservazioni HSE): pannello di sola consultazione con avvisi, poi Genera file o Genera report |
| Fogli firme | scheda Firme o ⋯ Opzioni → Prepara il foglio firme → passa il telefono → Chiudi |
| Documenti | scheda **File**: in cima i documenti da consultare (Allega PDF, si aprono anche senza rete); sotto i file da generare: grigio da generare, verde generato, ambra da rigenerare |
| Consegnare | **Invia a OneDrive** al centro della barra; ⋯ Opzioni → Riepilogo via email |
| Sopralluogo HSE | + → **Sopralluogo HSE** → Avanti → **Primo sopralluogo** (Esteso o Sintetico lo scegli in Anagrafica o nel Riepilogo, prima di generare il report), oppure Word, JSON o un report in Nembo (periodico) |
| Osservazioni HSE | scheda **Osservazioni**: appunti in cima; scrivi, detta, fotografa; dai il tag del capitolo e poi quello della sottosezione o voce; tieni premuta un'osservazione (su PC «Seleziona») per taggarne più insieme; la × sulla miniatura elimina la foto |
| Check-list HSE | scheda **Check-list**: verde con osservazioni, rosso senza osservazioni, grigio non pertinente |
| Più attività insieme | tieni premuta una riga (su PC «Seleziona»), tocca le altre → Carica su OneDrive |
| Chiudere con mancanze | ⋯ Opzioni → **Concludi l'attività** (si riapre dalle Opzioni) |
| Backup | Backup → **Salva su OneDrive** (o Crea backup completo senza OneDrive) |
| Errori | pallino rosso sul profilo → Impostazioni → **Notifiche** → Ricarica o Copia dettagli |

## Sincronizzazione

L'icona in alto in Oggi è verde (aggiornata), arancione (da aggiornare o offline), rossa (non riuscita), grigia (OneDrive non collegato). Toccala per sincronizzare. Vince la modifica più recente; un conflitto crea una copia «· copia».

## Domande frequenti

| Problema | Cosa fare |
|---|---|
| Non vedo sul PC le attività del telefono | stesso account su entrambi, «Sincronizza tra i dispositivi» attivo, poi tocca l'icona di sincronizzazione |
| L'app mostra una versione vecchia | chiudi e riapri: l'aggiornamento si attiva al secondo avvio (Impostazioni → Info app) |
| Un campo non si modifica | ha il lucchetto: è importato, tocca il lucchetto per sbloccarlo |
| Un allegato non viene accettato | solo foto, PDF e Word .docx; i .doc vanno salvati come .docx |
| Il ripristino dice che la firma non corrisponde | il backup è stato modificato: usa un altro backup |
| Il numero nel menu è basso | conta solo le attività aperte |
| La sessione Microsoft è scaduta | Impostazioni → OneDrive → Accedi |

I prompt per preparare i file JSON con Claude o Copilot sono in `Nembo_Prompt.txt`, fuori dal repository.
