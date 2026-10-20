/* Sopralluoghi HSE — dati fissi: regole di riformulazione, frasi ricorrenti, voci del formato Sintetico.
   Nessun dato di clienti o persone: i testi dei report stanno nei modelli Word caricati dall'utente. */

const HS_TEC_RULES = [
  /* ---------------------------- documentale ---------------------------- */
  { re:/\b(cpi|certificat\w*\s+prevenzione\s+incendi)\b[\s\S]*\b(scadut|non\s+rinnovat|mancant|assent)/i, sicura:true,
    sit:"Non è stata resa disponibile evidenza documentale del Certificato di Prevenzione Incendi in corso di validità.",
    mig:"Si raccomanda di avviare l\u2019iter di rinnovo dell\u2019attestazione di rinnovo periodico di conformità antincendio ai sensi dell\u2019art. 5 del D.P.R. 151/2011, trasmettendo al Comando Provinciale dei Vigili del Fuoco la documentazione prevista dall\u2019Allegato II al D.M. 07/08/2012." },
  { re:/\b(scia|segnalazione\s+certificata)\b[\s\S]*\b(mancant|assent|non\s+present)/i, sicura:true,
    sit:"Non è stata reperita la S.C.I.A. antincendio relativa alle attività soggette individuate dall\u2019Allegato I al D.P.R. 151/2011.",
    mig:"Si raccomanda di presentare al Comando Provinciale dei Vigili del Fuoco la S.C.I.A. antincendio, corredata della documentazione tecnica e delle certificazioni di cui al D.M. 07/08/2012." },
  { re:/\b(agibilit)/i,
    sit:"Non è stata resa disponibile la documentazione attestante l\u2019agibilità dell\u2019immobile.",
    mig:"Si raccomanda di reperire presso gli archivi comunali il certificato di agibilità o, in assenza, di valutare la presentazione della segnalazione certificata di agibilità ai sensi dell\u2019art. 24 del D.P.R. 380/2001." },
  { re:/\b(collaudo\s+statico)\b/i,
    sit:"Non è stata resa disponibile evidenza del certificato di collaudo statico delle strutture.",
    mig:"Si raccomanda di reperire il certificato di collaudo statico depositato presso il competente ufficio del Genio Civile ai sensi dell\u2019art. 67 del D.P.R. 380/2001." },
  { re:/\b(dvr|valutazione\s+dei\s+rischi)\b[\s\S]*\b(mancant|assent|non\s+aggiornat|vecchi)/i, sicura:true,
    sit:"Il Documento di Valutazione dei Rischi non risulta aggiornato rispetto all\u2019attuale assetto organizzativo e produttivo del sito.",
    mig:"Si raccomanda di procedere alla revisione del Documento di Valutazione dei Rischi ai sensi degli artt. 17, 28 e 29 del D.Lgs. 81/08." },
  { re:/\b(dichiarazione\s+di\s+conformit)/i,
    sit:"Non è stata resa disponibile la dichiarazione di conformità dell\u2019impianto ai sensi del D.M. 37/08.",
    mig:"Si raccomanda di reperire presso l\u2019impresa installatrice la dichiarazione di conformità o, in assenza, di far redigere da professionista abilitato la dichiarazione di rispondenza prevista dall\u2019art. 7, comma 6, del D.M. 37/08." },

  /* --------------------------- presidi antincendio --------------------- */
  { re:/\b(estintor)\w*\b.*\b(scadut|non\s+revisionat|non\s+controllat|fuori\s+manutenzione)/i, sicura:true,
    sit:"Alcuni estintori portatili presentano il cartellino di manutenzione con data di controllo scaduta rispetto alla periodicità semestrale prevista.",
    mig:"Si raccomanda di ripristinare il controllo periodico semestrale dei mezzi di estinzione portatili a cura di tecnico manutentore qualificato, secondo quanto previsto dalla norma UNI 9994-1 e dall\u2019art. 4 del D.M. 10/03/1998." },
  { re:/\b(estintor)\w*\b.*\b(ostruit|non\s+accessibil|nascost|non\s+segnalat)/i, sicura:true,
    sit:"Si rileva la presenza di mezzi di estinzione portatili non immediatamente accessibili e privi di adeguata segnaletica di individuazione.",
    mig:"Si raccomanda di liberare le postazioni dei mezzi di estinzione da ogni ostacolo e di integrare la segnaletica di sicurezza conforme all\u2019Allegato XXV del D.Lgs. 81/08." },
  { re:/\b(idrant|naspi|uni\s?45|uni\s?25)\w*\b.*\b(scadut|non\s+verificat|non\s+controllat|non\s+collaudat)/i, sicura:true,
    sit:"Non è stata resa disponibile evidenza documentale del controllo periodico della rete idranti e dei relativi apparecchi erogatori.",
    mig:"Si raccomanda di ripristinare il controllo periodico semestrale della rete idranti e la prova di erogazione annuale, secondo quanto previsto dalla norma UNI EN 671-3 e dalla UNI 10779." },
  { re:/\b(sprinkler|impianto\s+sprinkler)\b/i,
    sit:"L\u2019impianto automatico di estinzione a pioggia risulta installato; non è stata tuttavia resa disponibile evidenza documentale completa delle verifiche periodiche.",
    mig:"Si raccomanda di acquisire il registro delle verifiche e di assicurare l\u2019esecuzione dei controlli periodici previsti dalla norma UNI EN 12845." },
  { re:/\b(rivelazion\w*|rivelator\w*|allarme\s+incendio|evac)\b[\s\S]*\b(guast|non\s+funzionant|anomali|fuori\s+servizio)/i, sicura:true,
    sit:"Si rileva la presenza di anomalie sull\u2019impianto di rivelazione e segnalazione allarme incendio, segnalate dalla centrale di gestione.",
    mig:"Si raccomanda di far intervenire il manutentore per il ripristino della piena funzionalità dell\u2019impianto e di assicurare i controlli periodici previsti dalla norma UNI 11224." },
  { re:/\b(evacuator\w*|enfc|smaltiment\w*\s+fum)/i,
    sit:"Non è stata resa disponibile evidenza documentale della verifica periodica degli evacuatori naturali di fumo e calore.",
    mig:"Si raccomanda di programmare il controllo periodico degli evacuatori naturali di fumo e calore secondo quanto previsto dalla norma UNI 9494-3." },
  { re:/\b(porte?\s+(tagliafuoco|rei)|serrament\w*\s+rei)\b/i,
    sit:"Non è stata resa disponibile evidenza documentale della manutenzione periodica delle porte resistenti al fuoco e dei relativi dispositivi di autochiusura.",
    mig:"Si raccomanda di programmare il controllo periodico dei serramenti resistenti al fuoco secondo quanto previsto dalla norma UNI 11473 e di conservarne evidenza nel registro dei controlli antincendio." },
  { re:/\b(registro\s+(dei\s+)?controlli|registro\s+antincendio)\b/i,
    sit:"Il registro dei controlli antincendio non risulta compilato con continuità per tutte le attività di sorveglianza e manutenzione previste.",
    mig:"Si raccomanda di assicurare la regolare tenuta e compilazione del registro dei controlli antincendio ai sensi dell\u2019art. 6 del D.M. 10/03/1998 e del D.M. 01/09/2021." },

  /* ------------------------------- esodo ------------------------------- */
  { re:/\b(vi[ae]\s+di\s+(esodo|fuga)|uscit\w*\s+di\s+(sicurezza|emergenza)|percors\w*\s+di\s+esodo|corridoi\w*)\b[\s\S]*\b(ostruit|ingombr|material|bloccat|chius|bancal|deposit)/i, sicura:true,
    sit:"Si rileva la presenza di materiali e attrezzature in corrispondenza dei percorsi di esodo, con conseguente riduzione della larghezza utile di passaggio.",
    mig:"Si raccomanda di mantenere costantemente sgombri i percorsi di esodo e le uscite di sicurezza, provvedendo alla rimozione dei materiali depositati e all\u2019individuazione di aree di stoccaggio dedicate." },
  { re:/\b(maniglion\w*\s+antipanic|dispositiv\w*\s+antipanic)\b/i,
    sit:"Si rileva il non corretto funzionamento dei dispositivi di apertura antipanico installati sulle porte di emergenza.",
    mig:"Si raccomanda di ripristinare la piena funzionalità dei dispositivi antipanico, conformi alla norma UNI EN 1125, assicurandone il controllo periodico." },
  { re:/\b(illuminazion\w*\s+(di\s+)?(emergenza|sicurezza)|lampad\w*\s+(di\s+)?emergenza)\b/i,
    sit:"Si rileva la presenza di apparecchi di illuminazione di sicurezza non funzionanti lungo i percorsi di esodo.",
    mig:"Si raccomanda di ripristinare la funzionalità degli apparecchi di illuminazione di sicurezza, verificando il rispetto dei livelli di illuminamento previsti dalla norma UNI EN 1838 e programmandone il controllo periodico." },
  { re:/\b(segnaletica|cartellonistic)\w*\b.*\b(mancant|assent|carent|illeggibil|sbiadit|insufficient)/i, sicura:true,
    sit:"Si rileva la carenza della segnaletica di sicurezza per l\u2019individuazione dei percorsi di esodo, delle uscite di emergenza e dei presidi antincendio.",
    mig:"Si raccomanda di integrare la segnaletica di sicurezza secondo le prescrizioni del Titolo V e dell\u2019Allegato XXV del D.Lgs. 81/08." },

  /* ------------------------------ elettrico ---------------------------- */
  { re:/\b(messa\s+a\s+terra|impianto\s+di\s+terra|dispersor)/i,
    sit:"Non è stata resa disponibile evidenza documentale della verifica periodica dell\u2019impianto di messa a terra.",
    mig:"Si raccomanda di far eseguire la verifica periodica dell\u2019impianto di messa a terra da parte di Organismo Abilitato, con periodicità quinquennale, ai sensi dell\u2019art. 4 del D.P.R. 462/01." },
  { re:/\b(scarich\w*\s+atmosferic|lps|parafulmin|fulminazion)/i,
    sit:"Non è stata resa disponibile evidenza documentale della valutazione del rischio da fulminazione e della relativa verifica periodica.",
    mig:"Si raccomanda di far redigere la valutazione del rischio da fulminazione secondo la norma CEI EN 62305-2 e, ove l\u2019impianto risulti necessario, di assicurarne la verifica periodica ai sensi del D.P.R. 462/01." },
  { re:/\b(quadr\w*\s+elettric|cabina\s+elettric|trasformator)\w*\b.*\b(apert|non\s+chius|senza\s+chiave|accessibil|danneggiat|ammalorat)/i, sicura:true,
    sit:"Si rileva la presenza di quadri elettrici privi di adeguata protezione contro l\u2019accesso da parte di personale non autorizzato.",
    mig:"Si raccomanda di ripristinare la chiusura a chiave dei quadri elettrici e di apporre la segnaletica di avvertimento del rischio elettrico prevista dall\u2019Allegato XXV del D.Lgs. 81/08." },
  { re:/\b(cav\w*|conduttor\w*|prolung\w*|ciabatt)\w*\b.*\b(volant|scopert|danneggiat|non\s+protett|penzolant)/i, sicura:true,
    sit:"Si rileva la presenza di conduttori elettrici in vista non adeguatamente protetti meccanicamente.",
    mig:"Si raccomanda di provvedere al riordino e alla protezione meccanica delle linee elettriche, in conformità alla norma CEI 64-8 e all\u2019Allegato IV del D.Lgs. 81/08." },
  { re:/\b(gruppo\s+elettrogeno|ups)\b/i,
    sit:"Il gruppo di continuità/generazione risulta installato; non è stata tuttavia resa disponibile evidenza documentale completa delle verifiche periodiche di funzionamento.",
    mig:"Si raccomanda di programmare le prove periodiche di avviamento e funzionamento sotto carico, conservandone evidenza documentale." },

  /* ------------------------- copertura e lavori in quota --------------- */
  { re:/\b(anticadut|linea\s+vita|linee\s+vita|ancoragg)/i,
    sit:"Non è stata resa disponibile evidenza documentale dell\u2019installazione e della verifica periodica del sistema anticaduta a protezione dei lavori in copertura.",
    mig:"Si raccomanda di dotare la copertura di sistema di ancoraggio permanente conforme alla norma UNI 11578, corredato di elaborato tecnico della copertura, e di assicurarne il controllo periodico." },
  { re:/\b(copertur|lucernar|shed)\w*\b.*\b(infiltrazion|ammalorat|degrad|rotti|danneggiat|fragil)/i, sicura:true,
    sit:"Si rilevano localizzati fenomeni di ammaloramento del manto di copertura, con evidenze di infiltrazione in corrispondenza degli elementi traslucidi.",
    mig:"Si raccomanda di eseguire un intervento di manutenzione straordinaria del manto di copertura, con sostituzione degli elementi ammalorati e ripristino della tenuta all\u2019acqua." },
  { re:/\b(parapett|guardacorp)\w*\b.*\b(mancant|assent|incomplet|altezza\s+insufficient|non\s+conform)/i, sicura:true,
    sit:"Si rileva l\u2019assenza di parapetti di protezione in corrispondenza di dislivelli superiori a metri 2,00.",
    mig:"Si raccomanda di installare parapetti normali con arresto al piede, di altezza non inferiore a un metro, conformi all\u2019art. 126 e all\u2019Allegato IV del D.Lgs. 81/08." },

  /* ------------------------- aree esterne e interni -------------------- */
  { re:/\b(pavimentazion|asfalt|piazzal|viabilit)\w*\b.*\b(ammalorat|buche|dissestat|degrad|avvallament|fessurazion)/i, sicura:true,
    sit:"Si rilevano localizzati fenomeni di ammaloramento della pavimentazione, con presenza di avvallamenti e discontinuità del piano di calpestio.",
    mig:"Si raccomanda di eseguire un intervento di ripristino della pavimentazione, al fine di eliminare le irregolarità che possono costituire rischio di inciampo per i pedoni e di instabilità per i mezzi in transito." },
  { re:/\b(scaffalatur)/i,
    sit:"Non è stata resa disponibile evidenza documentale dell\u2019ispezione periodica delle scaffalature metalliche porta-pallet.",
    mig:"Si raccomanda di far eseguire l\u2019ispezione periodica annuale delle scaffalature da parte di tecnico qualificato, secondo quanto previsto dalla norma UNI EN 15635, e di esporre le targhe di portata." },
  { re:/\b(separazion\w*\s+(pedon|veicol)|percors\w*\s+pedonal|attraversament)/i,
    sit:"Si rileva l\u2019assenza di percorsi pedonali segregati e adeguatamente segnalati nelle aree interessate dalla movimentazione dei mezzi.",
    mig:"Si raccomanda di realizzare percorsi pedonali delimitati e segnalati, separati dalla viabilità dei mezzi, in attuazione delle misure di prevenzione previste dall\u2019Allegato IV del D.Lgs. 81/08." },
  { re:/\b(baie?\s+di\s+carico|ribalte?)\b/i,
    sit:"Le baie di carico risultano operative; non è stata tuttavia resa disponibile evidenza documentale completa della manutenzione periodica delle apparecchiature di asservimento.",
    mig:"Si raccomanda di programmare la manutenzione periodica dei livellatori di banchina e dei relativi dispositivi di sicurezza, conservandone evidenza documentale." },

  /* ------------------------------ sollevamento ------------------------- */
  { re:/\b(ascensor|montacarich|montascale|piattaform\w*\s+elevatric)/i,
    sit:"Non è stata resa disponibile evidenza documentale completa della verifica periodica dell\u2019impianto di sollevamento.",
    mig:"Si raccomanda di assicurare la verifica periodica biennale a cura dell\u2019Organismo Notificato e la manutenzione semestrale a cura di ditta abilitata, ai sensi degli artt. 13 e 15 del D.P.R. 162/99." },
  { re:/\b(carroponte|paranc|gru\b|apparecch\w*\s+di\s+sollevament)/i,
    sit:"Non è stata resa disponibile evidenza documentale della verifica periodica dell\u2019apparecchio di sollevamento.",
    mig:"Si raccomanda di assicurare le verifiche periodiche previste dall\u2019Allegato VII del D.Lgs. 81/08, con denuncia di messa in servizio all\u2019INAIL territorialmente competente." },

  /* -------------------------- ambiente e sostanze ---------------------- */
  { re:/\b(amianto|eternit|fav|fibre\s+artificiali)/i,
    sit:"Si rileva la presenza di elementi in materiale potenzialmente contenente amianto, dei quali non è stata resa disponibile la relativa mappatura.",
    mig:"Si raccomanda di far eseguire la mappatura e la valutazione dello stato di conservazione dei materiali contenenti amianto ai sensi del D.M. 06/09/1994, con nomina del responsabile del rischio amianto." },
  { re:/\b(serbatoi\w*|ust|ast|cisterna)\w*\b.*\b(interrat|non\s+verificat|senza\s+bacino|privo\s+di\s+bacino)/i, sicura:true,
    sit:"Si rileva la presenza di serbatoi di stoccaggio privi di bacino di contenimento di adeguata capacità.",
    mig:"Si raccomanda di dotare i serbatoi di bacino di contenimento avente capacità non inferiore a quella del serbatoio stesso e di programmarne le verifiche periodiche di tenuta." },
  { re:/\b(gpl)\b/i,
    sit:"Il serbatoio di GPL risulta installato nelle aree esterne; non è stata resa disponibile evidenza documentale completa delle verifiche di integrità previste.",
    mig:"Si raccomanda di assicurare la verifica periodica di integrità del serbatoio ai sensi del D.M. 17/01/2005 e la denuncia di messa in servizio all\u2019INAIL." },
  { re:/\b(rifiut)\w*\b.*\b(deposit|stoccagg|accumul|non\s+differenziat|abbandonat)/i, sicura:true,
    sit:"Si rileva il deposito di rifiuti in area non adeguatamente attrezzata e priva di idonea segnaletica identificativa.",
    mig:"Si raccomanda di organizzare il deposito temporaneo dei rifiuti nel rispetto delle condizioni di cui all\u2019art. 185-bis del D.Lgs. 152/06, con contenitori identificati dal codice EER e area pavimentata e protetta dalle acque meteoriche." },
  { re:/\b(scarich\w*\s+idric|acque\s+reflue|depurazion|vasca\s+di\s+prima\s+pioggia|disoleator)/i,
    sit:"Non è stata resa disponibile evidenza documentale dell\u2019autorizzazione allo scarico delle acque reflue e dei relativi referti analitici.",
    mig:"Si raccomanda di reperire il provvedimento autorizzativo allo scarico ai sensi della Parte Terza del D.Lgs. 152/06 e di assicurare la manutenzione periodica dei sistemi di trattamento." },
  { re:/\b(pozzo|pozzi)\b/i,
    sit:"Non è stata resa disponibile evidenza documentale della concessione per l\u2019emungimento delle acque sotterranee.",
    mig:"Si raccomanda di reperire il provvedimento di concessione per l\u2019utilizzo delle acque sotterranee e di verificare la regolare installazione dei dispositivi di misurazione delle portate." },
  { re:/\b(sversament|contaminazion|terren\w*\s+ammalorat|macchi\w*\s+di\s+(olio|gasolio))/i, sicura:true,
    sit:"Si rilevano evidenze di sversamento sul piano di calpestio in corrispondenza delle aree di stoccaggio e travaso.",
    mig:"Si raccomanda di provvedere alla bonifica delle superfici interessate, di dotare le aree di kit di emergenza antisversamento e di valutare l\u2019attivazione delle procedure di cui alla Parte Quarta, Titolo V, del D.Lgs. 152/06." },

  /* ------------------------------ emergenze ---------------------------- */
  { re:/\b(piano\s+di\s+emergenza|pee|evacuazion)\w*\b.*\b(mancant|assent|non\s+aggiornat|vecchi|da\s+aggiornar)/i, sicura:true,
    sit:"Il piano di emergenza ed evacuazione non risulta aggiornato rispetto all\u2019attuale assetto del sito e alla presenza di personale.",
    mig:"Si raccomanda di procedere all\u2019aggiornamento del piano di emergenza ed evacuazione ai sensi del D.M. 02/09/2021, con revisione delle planimetrie di esodo e delle squadre di emergenza." },
  { re:/\b(prova\s+di\s+evacuazion|esercitazion)/i,
    sit:"Non è stata resa disponibile evidenza documentale dell\u2019esecuzione della prova di evacuazione con periodicità annuale.",
    mig:"Si raccomanda di programmare ed eseguire la prova di evacuazione almeno con cadenza annuale, redigendone apposito verbale ai sensi del D.M. 02/09/2021." },
  { re:/\b(cassett\w*\s+di\s+(primo\s+soccorso|medicazion)|presidi\s+sanitar|defibrillator|dae)\b/i,
    sit:"Si rileva la presenza di presidi sanitari con dotazione incompleta rispetto a quanto previsto dalla normativa vigente.",
    mig:"Si raccomanda di reintegrare la dotazione dei presidi di primo soccorso secondo gli Allegati 1 e 2 del D.M. 388/03, assicurandone il controllo periodico della scadenza." },
  { re:/\b(addett\w*\s+(antincendio|primo\s+soccorso)|squadr\w*\s+di\s+emergenz|formazion)/i,
    sit:"Non è stata resa disponibile evidenza documentale completa della formazione e dell\u2019aggiornamento degli addetti alle misure di emergenza.",
    mig:"Si raccomanda di assicurare la formazione e l\u2019aggiornamento periodico degli addetti alle misure di emergenza ai sensi dell\u2019art. 37 del D.Lgs. 81/08 e del D.M. 02/09/2021." },

  /* ------------------------------ strutture ---------------------------- */
  { re:/\b(pilastr|trav\w*|struttur)\w*\b.*\b(lesion|fessurazion|crepe|ammalorat|degrad|distacc|copriferro)/i, sicura:true,
    sit:"Si rilevano localizzati fenomeni di degrado degli elementi strutturali, con distacco del copriferro e ossidazione delle armature in vista.",
    mig:"Si raccomanda di far eseguire un approfondimento tecnico da parte di professionista strutturista, finalizzato alla definizione degli interventi di ripristino corticale e protezione delle armature." },
  { re:/\b(sismic|vulnerabilit\w*\s+sismic)/i,
    sit:"Non è stata resa disponibile la valutazione della vulnerabilità sismica del fabbricato.",
    mig:"Si raccomanda di far redigere la valutazione della sicurezza sismica secondo il Capitolo 8 delle NTC 2018, al fine di determinare l\u2019indice di rischio della struttura." },

  /* ------------------------------ meccanico ---------------------------- */
  { re:/\b(legionell)/i,
    sit:"Non è stata resa disponibile evidenza documentale della valutazione del rischio legionellosi e dei relativi campionamenti.",
    mig:"Si raccomanda di far redigere la valutazione del rischio legionellosi secondo le Linee Guida del 07/05/2015, con definizione del piano di autocontrollo e dei campionamenti periodici." },
  { re:/\b(centrale\s+termic|caldai|generator\w*\s+di\s+calore|bruciator)/i,
    sit:"Non è stata resa disponibile evidenza documentale completa delle verifiche periodiche del generatore di calore.",
    mig:"Si raccomanda di assicurare le verifiche periodiche di cui al D.M. 01/12/1975 e al D.Lgs. 81/08, Allegato VII, e la manutenzione con redazione del rapporto di controllo di efficienza energetica." },
  { re:/\b(compressor|serbatoi\w*\s+(aria|in\s+pression)|recipient\w*\s+in\s+pression)/i,
    sit:"Non è stata resa disponibile evidenza documentale della verifica periodica delle attrezzature a pressione.",
    mig:"Si raccomanda di assicurare la denuncia di messa in servizio e le verifiche periodiche delle attrezzature a pressione ai sensi del D.M. 329/04 e dell\u2019Allegato VII del D.Lgs. 81/08." },
  { re:/\b(condizionament|climatizzazion|uta|trattament\w*\s+aria|f-?gas)/i,
    sit:"Non è stata resa disponibile evidenza documentale completa della manutenzione periodica degli impianti di trattamento aria e del registro dell\u2019apparecchiatura per i gas fluorurati.",
    mig:"Si raccomanda di assicurare la manutenzione periodica degli impianti e, per le apparecchiature contenenti gas fluorurati, i controlli delle perdite previsti dal Regolamento (UE) 517/2014 con registrazione in banca dati F-GAS." },

  /* ---------------------- materiali e ambienti pericolosi -------------- */
  { re:/\b(atex|atmosfer\w*\s+esplosiv|classificazion\w*\s+delle\s+aree)/i,
    sit:"Non è stata resa disponibile la valutazione del rischio di esplosione con la relativa classificazione delle aree.",
    mig:"Si raccomanda di far redigere il documento sulla protezione contro le esplosioni ai sensi del Titolo XI del D.Lgs. 81/08, con classificazione delle aree secondo la norma CEI EN 60079-10." },
  { re:/\b(ricarica\s+batteri|carica\s+batteri|locale\s+batteri)/i,
    sit:"L\u2019area destinata alla ricarica delle batterie di trazione non risulta dotata di ventilazione e di segnaletica adeguate alla natura del rischio.",
    mig:"Si raccomanda di verificare l\u2019adeguatezza della ventilazione dell\u2019area di ricarica secondo la norma CEI EN 62485-3, integrando la segnaletica di divieto di fumo e uso di fiamme libere." },
  { re:/\b(bombol|gas\s+tecnic|infiammabil)/i,
    sit:"Si rileva lo stoccaggio di recipienti contenenti gas compressi in area priva di adeguati sistemi di fissaggio e di segnaletica identificativa.",
    mig:"Si raccomanda di stoccare i recipienti in posizione verticale e vincolata, in area ventilata e segnalata, separando i gas incompatibili secondo le indicazioni delle relative schede di sicurezza." },

  /* ------------------------------ esito positivo ----------------------- */
  { re:/(nessun\w*\s+critic|non\s+si\s+rilevan|nulla\s+da\s+segnalar|tutto\s+(ok|regolare|conforme)|conform\w*\s+alla\s+normativa|\bregolare\b|\bidone\w+\b)/i, sicura:true,
    sit:"Alla data del sopralluogo non sono state riscontrate criticità di rilievo; l\u2019elemento esaminato risulta in stato di conservazione adeguato all\u2019uso e conforme ai requisiti applicabili.",
    mig:"Nessuna attività di miglioramento necessaria allo stato attuale." },
  { re:/\b(non\s+(accessibil|ispezionabil|visionat|verificat)|non\s+è\s+stato\s+possibile\s+accedere|accesso\s+non\s+consentito)/i, sicura:true,
    sit:"Non è stato possibile accedere all\u2019area in occasione del sopralluogo; la valutazione riportata è pertanto limitata a quanto osservabile dall\u2019esterno e alla documentazione resa disponibile.",
    mig:"Si raccomanda di programmare un sopralluogo integrativo che consenta l\u2019accesso all\u2019area, al fine di completare la valutazione." }
];

function hsRiformula(testo){
  const t = String(testo || '').trim();
  if(!t) return null;
  /* se il testo è già lungo e in forma tecnica non intervengo */
  if(t.length > 240) return null;
  const sit = [], mig = [];
  let tutteSicure = true;
  HS_TEC_RULES.forEach(r => {
    if(!r.re.test(t)) return;
    if(!r.sicura) tutteSicure = false;
    if(sit.indexOf(r.sit) < 0) sit.push(r.sit);
    if(r.mig && mig.indexOf(r.mig) < 0) mig.push(r.mig);
  });
  if(!sit.length) return null;
  return { sit: sit.join('\n'), mig: mig.join('\n'), n: sit.length, sicura: tutteSicure };
}

const HS_FRASI = {
  "Situazione rilevata": [
    "Alla data del sopralluogo non sono state riscontrate criticità di rilievo.",
    "Si segnala l'assenza della documentazione attestante l'avvenuta verifica periodica.",
    "L'elemento risulta in stato di conservazione complessivamente adeguato all'uso.",
    "Si rilevano localizzati fenomeni di degrado/ammaloramento superficiale.",
    "Non è stato possibile accedere all'area durante il sopralluogo; la valutazione è pertanto limitata.",
    "La documentazione esaminata risulta completa e conforme a quanto previsto dalla normativa vigente."
  ],
  "Attività di miglioramento": [
    "Si raccomanda di reperire e archiviare la documentazione mancante.",
    "Si raccomanda di programmare le verifiche periodiche previste dalla normativa vigente.",
    "Si raccomanda l'esecuzione di interventi di manutenzione straordinaria.",
    "Si raccomanda di integrare la segnaletica di sicurezza secondo D.Lgs. 81/08.",
    "Si raccomanda di aggiornare il piano di emergenza ed evacuazione.",
    "Nessuna attività di miglioramento necessaria allo stato attuale."
  ]
};

// Formato Sintetico: capitoli e voci della checklist (Sì / No / N.A., nota, foto collegata)
const HS_SINT_ITEMS = [{"sez": "FATTORI DI RISCHIO AREE ESTERNE", "cap": 3, "items": [{"id": "0_1", "grp": "RECINZIONE", "cod": "1", "txt": "Presenza di recinzione su tutto il perimetro/l’asset risulta correttamente segregato", "ref": "3.1"}, {"id": "0_2", "grp": "RECINZIONE", "cod": "2", "txt": "Recinzione deteriorata", "ref": "3.2"}, {"id": "0_3", "grp": "RECINZIONE", "cod": "3", "txt": "Recinzione manomessa o divelta", "ref": "3.3"}, {"id": "0_4", "grp": "RECINZIONE", "cod": "4", "txt": "Ingressi manomessi e/o non efficienti", "ref": "3.4"}, {"id": "0_5", "grp": "AREE DI TRANSITO", "cod": "5", "txt": "Vi sono aree di transito promiscue", "ref": "3.5"}, {"id": "0_6", "grp": "AREE DI TRANSITO", "cod": "6", "txt": "Sono presenti camminamenti pedonali segnalati e/o segregati", "ref": "3.6"}, {"id": "0_7", "grp": "AREE DI TRANSITO", "cod": "7", "txt": "È presente un'adeguata illuminazione", "ref": "3.7"}, {"id": "0_8", "grp": "AREE DI TRANSITO", "cod": "8", "txt": "Le aree di transito risultano percorribili", "ref": "3.8"}, {"id": "0_9", "grp": "AREE DI TRANSITO", "cod": "9", "txt": "Sono presenti persone non autorizzate", "ref": "3.9"}, {"id": "0_10", "grp": "PAVIMENTAZIONE E AREE VERDI", "cod": "10", "txt": "La pavimentazione si presenta stabile", "ref": "3.10"}, {"id": "0_11", "grp": "PAVIMENTAZIONE E AREE VERDI", "cod": "11", "txt": "Sono presenti sporgenze, cavità, piani inclinati pericolosi o aperture verso il vuoto prive di parapetti", "ref": "3.11"}, {"id": "0_12", "grp": "PAVIMENTAZIONE E AREE VERDI", "cod": "12", "txt": "La pavimentazione viene mantenuta regolarmente pulita ed in ordine", "ref": "3.12"}, {"id": "0_13", "grp": "PAVIMENTAZIONE E AREE VERDI", "cod": "13", "txt": "Presenza di pozzetti scoperti", "ref": "3.13"}, {"id": "0_14", "grp": "PAVIMENTAZIONE E AREE VERDI", "cod": "14", "txt": "Presenza di scavi o buche in area di pertinenza", "ref": "3.14"}, {"id": "0_15", "grp": "PAVIMENTAZIONE E AREE VERDI", "cod": "15", "txt": "Le aree verdi si presentano manutenute", "ref": "3.15"}]}, {"sez": "FATTORI DI RISCHIO FABBRICATI", "cap": 4, "items": [{"id": "1_1", "grp": "ACCESSI", "cod": "1", "txt": "Ingressi manomessi e/o non efficienti", "ref": "4.1"}, {"id": "1_2", "grp": "ACCESSI", "cod": "2", "txt": "Esistono punti di ingresso facilmente accessibili o manomettibili (es. da bambini)", "ref": "4.2"}, {"id": "1_3", "grp": "ACCESSI", "cod": "3", "txt": "È presente un'adeguata illuminazione", "ref": "4.3"}, {"id": "1_4", "grp": "ACCESSI", "cod": "4", "txt": "Sono presenti occupanti non autorizzati", "ref": "4.4"}, {"id": "1_5", "grp": "FACCIATA", "cod": "5", "txt": "Sono presenti vetrate o porte in vetro mal segnalate", "ref": "4.5"}, {"id": "1_6", "grp": "FACCIATA", "cod": "6", "txt": "Infissi esterni danneggiati o divelti", "ref": "4.6"}, {"id": "1_7", "grp": "FACCIATA", "cod": "7", "txt": "Presenza di problematiche in facciata", "ref": "4.7"}, {"id": "1_8", "grp": "FACCIATA", "cod": "8", "txt": "Sono presenti adeguati parapetti protettivi", "ref": "4.8"}, {"id": "1_9", "grp": "FACCIATA", "cod": "9", "txt": "Presenza di elementi il cui crollo o distacco può provocare danni a persone/proprietà", "ref": "4.9"}, {"id": "1_10", "grp": "PAVIMENTAZIONE", "cod": "10", "txt": "La pavimentazione si presenta integra", "ref": "4.10"}, {"id": "1_11", "grp": "PAVIMENTAZIONE", "cod": "11", "txt": "Sono presenti sporgenze, cavità, piani inclinati pericolosi o presenza di aperture verso il vuoto prive di parapetti", "ref": "4.11"}, {"id": "1_12", "grp": "PAVIMENTAZIONE", "cod": "12", "txt": "La pavimentazione è pulita ed in ordine", "ref": "4.12"}, {"id": "1_13", "grp": "PAVIMENTAZIONE", "cod": "13", "txt": "Presenza di pozzetti scoperti", "ref": "4.13"}, {"id": "1_14", "grp": "SCALE", "cod": "14", "txt": "Le scale si presentano stabili, antisdrucciolevoli, esenti da protuberanze o cavità?", "ref": "4.14"}, {"id": "1_15", "grp": "SCALE", "cod": "15", "txt": "Sono presenti i corrimani", "ref": "4.15"}, {"id": "1_16", "grp": "SCALE", "cod": "16", "txt": "La struttura delle scale presenta segni di degrado", "ref": "4.16"}]}, {"sez": "FATTORI DI RISCHIO FABBRICATI", "cap": 4, "items": [{"id": "2_1", "grp": "COPERTURA", "cod": "17", "txt": "La copertura è accessibile", "ref": "4.17"}, {"id": "2_2", "grp": "COPERTURA", "cod": "18", "txt": "Presenza di elementi il cui crollo o distacco può provocare danni a persone/cose", "ref": "4.18"}, {"id": "2_3", "grp": "COPERTURA", "cod": "19", "txt": "La copertura comporta rischi di caduta dall'alto", "ref": "4.19"}, {"id": "2_4", "grp": "COPERTURA", "cod": "20", "txt": "Sono presenti adeguati parapetti protettivi", "ref": "4.20"}, {"id": "2_5", "grp": "COPERTURA", "cod": "21", "txt": "Sono presenti dispositivi anticaduta permanenti (es. punti di ancoraggio, linee vita)", "ref": "4.21"}, {"id": "2_6", "grp": "COPERTURA", "cod": "22", "txt": "È presente la relativa cartellonistica", "ref": "4.22"}, {"id": "2_7", "grp": "COPERTURA", "cod": "23", "txt": "Sono presenti ostacoli, dislivelli", "ref": "4.23"}, {"id": "2_8", "grp": "COPERTURA", "cod": "24", "txt": "Sono presenti evidenze di degrado su elementi strutturali/non strutturali", "ref": "4.24"}, {"id": "2_9", "grp": "COPERTURA", "cod": "25", "txt": "La copertura, nel complesso, si presenta in buono stato di conservazione", "ref": "4.25"}, {"id": "2_10", "grp": "COPERTURA", "cod": "26", "txt": "Sono presenti situazioni puntuali di degrado", "ref": "4.26"}, {"id": "2_11", "grp": "COPERTURA", "cod": "27", "txt": "Sono presenti infiltrazioni/ristagni", "ref": "4.27"}, {"id": "2_12", "grp": "COPERTURA", "cod": "28", "txt": "Sono presenti lucernai", "ref": "4.28"}, {"id": "2_13", "grp": "ASCENSORI", "cod": "29", "txt": "Ascensori e/o montacarichi sono attivi (indicare numero di impianti presenti)", "ref": "4.29"}, {"id": "2_14", "grp": "ASCENSORI", "cod": "30", "txt": "È presente all’interno della cabina la targa di identificazione del soggetto addetto alla manutenzione con relativo numero di telefono d’emergenza", "ref": "4.30"}, {"id": "2_15", "grp": "ASCENSORI", "cod": "31", "txt": "L’impianto è dotato di sistema di allarme", "ref": "4.31"}]}, {"sez": "FATTORI DI RISCHIO FABBRICATI", "cap": 4, "items": [{"id": "3_1", "grp": "STRUTTURE", "cod": "32", "txt": "Sono presenti evidenze di degrado su elementi strutturali/non strutturali", "ref": "4.32"}, {"id": "3_2", "grp": "STRUTTURE", "cod": "33", "txt": "Sono presenti infiltrazioni", "ref": "4.33"}, {"id": "3_3", "grp": "STRUTTURE", "cod": "34", "txt": "Sono presenti vetrate o porte in vetro non o mal segnalate", "ref": "4.34"}, {"id": "3_4", "grp": "AUTORIMESSA", "cod": "35", "txt": "È presente l’autorimessa (indicare il piano)", "ref": "4.35"}, {"id": "3_5", "grp": "AUTORIMESSA", "cod": "36", "txt": "Sono presenti porte, uscite, scale di emergenza", "ref": "4.36"}, {"id": "3_6", "grp": "AUTORIMESSA", "cod": "37", "txt": "Sono presenti rilevatori di fumo/gas", "ref": "4.37"}, {"id": "3_7", "grp": "AUTORIMESSA", "cod": "38", "txt": "Sono presenti estintori", "ref": "4.38"}, {"id": "3_8", "grp": "AUTORIMESSA", "cod": "39", "txt": "Sono presenti idranti/naspi", "ref": "4.39"}, {"id": "3_9", "grp": "AUTORIMESSA", "cod": "40", "txt": "È presente un impianto sprinkler", "ref": "4.40"}, {"id": "3_10", "grp": "AUTORIMESSA", "cod": "41", "txt": "È presente la segnaletica orizzontale", "ref": "4.41"}, {"id": "3_11", "grp": "IMPRESE TERZE", "cod": "42", "txt": "È presente il servizio di portierato", "ref": "4.42"}, {"id": "3_12", "grp": "IMPRESE TERZE", "cod": "43", "txt": "È presente il servizio di vigilanza H24", "ref": "4.43"}, {"id": "3_13", "grp": "IMPRESE TERZE", "cod": "44", "txt": "Al momento del sopralluogo sono presenti imprese terze (manutenzione, derattizzazione, cura del verde etc.)", "ref": "4.44"}, {"id": "3_14", "grp": "AREE DI DEPOSITO", "cod": "45", "txt": "Sono presenti magazzini – scaffalature", "ref": "4.45"}, {"id": "3_15", "grp": "AREE DI DEPOSITO", "cod": "46", "txt": "È indicata la porta massima degli scaffali", "ref": "4.46"}, {"id": "3_16", "grp": "AREE DI DEPOSITO", "cod": "47", "txt": "Le aree di deposito sono mantenute in ordine", "ref": "4.47"}, {"id": "3_17", "grp": "AREE DI DEPOSITO", "cod": "48", "txt": "Sono presenti aree di deposito rifiuti", "ref": "4.48"}, {"id": "3_18", "grp": "AREE DI DEPOSITO", "cod": "49", "txt": "Sono presenti aree di deposito di materiali pericolosi", "ref": "4.49"}]}, {"sez": "LOCALI TECNICI ED IMPIANTI", "cap": 5, "items": [{"id": "4_1", "grp": "LOCALI TECNICI", "cod": "1", "txt": "Sono presenti locali tecnici", "ref": "5.1"}, {"id": "4_2", "grp": "LOCALI TECNICI", "cod": "2", "txt": "I locali tecnici sono chiusi a chiave", "ref": "5.2"}, {"id": "4_3", "grp": "LOCALI TECNICI", "cod": "3", "txt": "È presente la segnaletica di divieto di accesso", "ref": "5.3"}, {"id": "4_4", "grp": "LOCALI TECNICI", "cod": "4", "txt": "I locali tecnici sono adeguatamente illuminati", "ref": "5.4"}, {"id": "4_5", "grp": "LOCALI TECNICI", "cod": "5", "txt": "Le vie di accesso risultano regolari, uniformi ed adeguatamente illuminate", "ref": "5.5"}, {"id": "4_6", "grp": "LOCALI TECNICI", "cod": "6", "txt": "Il pavimento dei locali tecnici è mantenuto in condizioni idonee al suo uso", "ref": "5.6"}, {"id": "4_7", "grp": "LOCALI TECNICI", "cod": "7", "txt": "Sono presenti a terra tracce di olio/acqua che possono costituire causa di scivolamento", "ref": "5.7"}, {"id": "4_8", "grp": "LOCALI TECNICI", "cod": "8", "txt": "Sono presenti tubi, passerelle che costituiscono inciampo o ostacolo", "ref": "5.8"}, {"id": "4_9", "grp": "LOCALI TECNICI", "cod": "9", "txt": "Eventuali elementi di pericolo sono segnalati attraverso idonea cartellonistica", "ref": "5.9"}, {"id": "4_10", "grp": "LOCALI TECNICI", "cod": "10", "txt": "Nelle aree tecniche sono presenti materiali estranei", "ref": "5.10"}, {"id": "4_11", "grp": "LOCALI TECNICI", "cod": "11", "txt": "Sono presenti aperture verso il vuoto prive di parapetto", "ref": "5.11"}, {"id": "4_12", "grp": "LOCALI TECNICI", "cod": "12", "txt": "È presente l’interruttore di sgancio dell’energia elettrica e lo stesso risulta segnalato", "ref": "5.12"}, {"id": "4_13", "grp": "LOCALI TECNICI", "cod": "13", "txt": "È presente la valvola di intercettazione del combustibile (caldaia/gruppo elettrogeno) e la stessa risulta segnalata", "ref": "5.13"}, {"id": "4_14", "grp": "LOCALI TECNICI", "cod": "14", "txt": "Sono presenti spazi confinati", "ref": "5.14"}]}, {"sez": "CONDIZIONI AMBIENTALI", "cap": 6, "items": [{"id": "5_1", "grp": "CONDIZIONI AMBIENTALI", "cod": "1", "txt": "Sono presenti Manufatti Contenenti Amianto o sospetti", "ref": "6.1"}, {"id": "5_2", "grp": "CONDIZIONI AMBIENTALI", "cod": "2", "txt": "Sono presenti Fibre Artificiali Vetrose", "ref": "6.2"}, {"id": "5_3", "grp": "CONDIZIONI AMBIENTALI", "cod": "3", "txt": "Sono presenti rifiuti non adeguatamente stoccati o in stato di abbandono", "ref": "6.3"}, {"id": "5_4", "grp": "CONDIZIONI AMBIENTALI", "cod": "4", "txt": "Sono presenti serbatoi interrati", "ref": "6.4"}, {"id": "5_5", "grp": "CONDIZIONI AMBIENTALI", "cod": "5", "txt": "Sono presenti condizioni igieniche sufficienti", "ref": "6.5"}, {"id": "5_6", "grp": "CONDIZIONI AMBIENTALI", "cod": "6", "txt": "Sono presenti situazioni di rischio biologico", "ref": "6.6"}, {"id": "5_7", "grp": "CONDIZIONI AMBIENTALI", "cod": "7", "txt": "Presenza di macchinari /apparecchiature / attrezzature con potenziali criticità ambientali", "ref": "6.7"}]}, {"sez": "EMERGENZA", "cap": 7, "items": [{"id": "6_1", "grp": "EMERGENZA", "cod": "1", "txt": "Le attività presenti sono soggette a Prevenzione Incendi", "ref": "7.1"}, {"id": "6_2", "grp": "EMERGENZA", "cod": "2", "txt": "È presente un Piano di Emergenza ed Evacuazione", "ref": "7.2"}, {"id": "6_3", "grp": "EMERGENZA", "cod": "3", "txt": "Sono presenti idonee vie di fuga ed uscite di sicurezza", "ref": "7.3"}, {"id": "6_4", "grp": "EMERGENZA", "cod": "4", "txt": "Le vie e uscite di emergenza sono mantenute sgombre e facilmente accessibili", "ref": "7.4"}, {"id": "6_5", "grp": "EMERGENZA", "cod": "5", "txt": "È presente la segnaletica di sicurezza", "ref": "7.5"}, {"id": "6_6", "grp": "EMERGENZA", "cod": "6", "txt": "È presente un sistema di allarme acustico/visivo", "ref": "7.6"}, {"id": "6_7", "grp": "EMERGENZA", "cod": "7", "txt": "Sono presenti estintori, idranti, naspi", "ref": "7.7"}, {"id": "6_8", "grp": "EMERGENZA", "cod": "8", "txt": "Sono presenti rilevatori di fumo e/o calore", "ref": "7.8"}, {"id": "6_9", "grp": "EMERGENZA", "cod": "9", "txt": "I presidi antincendio sono regolarmente verificati", "ref": "7.9"}]}];
const HS_SINT_AN = ["Indirizzo:", "Destinazione uso:", "Anno di costruzione:", "Superficie:", "Classificazione sismica:", "Intera u.i./Porzione:", "Libero/Occupato:", "Data sopralluogo:", "Descrizione sintetica dell’immobile:", "Porzioni non visionate", "Developer:", "Property Manager", "Procuratore in ambito HSE:", "Tecnici incaricati del sopralluogo:"];
