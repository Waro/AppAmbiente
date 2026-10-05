/* Sopralluogo H&S: modello unico per i sopralluoghi di salute e sicurezza sugli immobili.
   Riunisce in una sola scheda i due formati usati finora:
   - schede tematiche con situazione rilevata (anche per sotto-area), attività di miglioramento
     e valutazione (natura del rischio, costo indicativo, priorità, competenza, termine);
   - checklist a codici (3.1, 4.10…) con risposta Sì / No / N.A. e note, più la tabella delle
     criticità (situazione rilevata, rischio evidenziato, gravità, azioni consigliate).
   I codici della checklist restano quelli originali, così i dati si possono riportare in
   qualunque modello di report. Nel codice non ci sono nomi di clienti né dati riservati. */

/* ---------------- checklist ----------------
   [codice, gruppo, voce, polarità]
   polarità  1: "Sì" è la condizione attesa (No = criticità)
            -1: "Sì" segnala un problema
             0: voce solo descrittiva (presenza di un elemento) */
const HS_VOCI = [
  ['3.1', "Recinzione", "Presenza di recinzione su tutto il perimetro/l’asset risulta correttamente segregato", 1],
  ['3.2', "Recinzione", "Recinzione deteriorata", -1],
  ['3.3', "Recinzione", "Recinzione manomessa o divelta", -1],
  ['3.4', "Recinzione", "Ingressi manomessi e/o non efficienti", -1],
  ['3.5', "Aree di transito", "Vi sono aree di transito promiscue", -1],
  ['3.6', "Aree di transito", "Sono presenti camminamenti pedonali segnalati e/o segregati", 1],
  ['3.7', "Aree di transito", "È presente un'adeguata illuminazione", 1],
  ['3.8', "Aree di transito", "Le aree di transito risultano percorribili", 1],
  ['3.9', "Aree di transito", "Sono presenti persone non autorizzate", -1],
  ['3.10', "Pavimentazione e aree verdi", "La pavimentazione si presenta stabile", 1],
  ['3.11', "Pavimentazione e aree verdi", "Sono presenti sporgenze, cavità, piani inclinati pericolosi o aperture verso il vuoto prive di parapetti", -1],
  ['3.12', "Pavimentazione e aree verdi", "La pavimentazione viene mantenuta regolarmente pulita ed in ordine", 1],
  ['3.13', "Pavimentazione e aree verdi", "Presenza di pozzetti scoperti", -1],
  ['3.14', "Pavimentazione e aree verdi", "Presenza di scavi o buche in area di pertinenza", -1],
  ['3.15', "Pavimentazione e aree verdi", "Le aree verdi si presentano manutenute", 1],
  ['4.1', "Accessi", "Ingressi manomessi e/o non efficienti", -1],
  ['4.2', "Accessi", "Esistono punti di ingresso facilmente accessibili o manomettibili (es. da bambini)", -1],
  ['4.3', "Accessi", "È presente un'adeguata illuminazione", 1],
  ['4.4', "Accessi", "Sono presenti occupanti non autorizzati", -1],
  ['4.5', "Facciata", "Sono presenti vetrate o porte in vetro mal segnalate", -1],
  ['4.6', "Facciata", "Infissi esterni danneggiati o divelti", -1],
  ['4.7', "Facciata", "Presenza di problematiche in facciata", -1],
  ['4.8', "Facciata", "Sono presenti adeguati parapetti protettivi", 1],
  ['4.9', "Facciata", "Presenza di elementi il cui crollo o distacco può provocare danni a persone/proprietà", -1],
  ['4.10', "Pavimentazione", "La pavimentazione si presenta integra", 1],
  ['4.11', "Pavimentazione", "Sono presenti sporgenze, cavità, piani inclinati pericolosi o presenza di aperture verso il vuoto prive di parapetti", -1],
  ['4.12', "Pavimentazione", "La pavimentazione è pulita ed in ordine", 1],
  ['4.13', "Pavimentazione", "Presenza di pozzetti scoperti", -1],
  ['4.14', "Scale", "Le scale si presentano stabili, antisdrucciolevoli, esenti da protuberanze o cavità", 1],
  ['4.15', "Scale", "Sono presenti i corrimani", 1],
  ['4.16', "Scale", "La struttura delle scale presenta segni di degrado", -1],
  ['4.17', "Copertura", "La copertura è accessibile", 0],
  ['4.18', "Copertura", "Presenza di elementi il cui crollo o distacco può provocare danni a persone/cose", -1],
  ['4.19', "Copertura", "La copertura comporta rischi di caduta dall'alto", -1],
  ['4.20', "Copertura", "Sono presenti adeguati parapetti protettivi", 1],
  ['4.21', "Copertura", "Sono presenti dispositivi anticaduta permanenti (es. punti di ancoraggio, linee vita)", 1],
  ['4.22', "Copertura", "È presente la relativa cartellonistica", 1],
  ['4.23', "Copertura", "Sono presenti ostacoli, dislivelli", -1],
  ['4.24', "Copertura", "Sono presenti evidenze di degrado su elementi strutturali/non strutturali", -1],
  ['4.25', "Copertura", "La copertura, nel complesso, si presenta in buono stato di conservazione", 1],
  ['4.26', "Copertura", "Sono presenti situazioni puntuali di degrado", -1],
  ['4.27', "Copertura", "Sono presenti infiltrazioni/ristagni", -1],
  ['4.28', "Copertura", "Sono presenti lucernai", 0],
  ['4.29', "Ascensori", "Ascensori e/o montacarichi sono attivi (indicare numero di impianti presenti)", 0],
  ['4.30', "Ascensori", "È presente all’interno della cabina la targa di identificazione del soggetto addetto alla manutenzione con relativo numero di telefono d’emergenza", 1],
  ['4.31', "Ascensori", "L’impianto è dotato di sistema di allarme", 1],
  ['4.32', "Strutture", "Sono presenti evidenze di degrado su elementi strutturali/non strutturali", -1],
  ['4.33', "Strutture", "Sono presenti infiltrazioni", -1],
  ['4.34', "Strutture", "Sono presenti vetrate o porte in vetro non o mal segnalate", -1],
  ['4.35', "Autorimessa", "È presente l’autorimessa (indicare il piano)", 0],
  ['4.36', "Autorimessa", "Sono presenti porte, uscite, scale di emergenza", 1],
  ['4.37', "Autorimessa", "Sono presenti rilevatori di fumo/gas", 1],
  ['4.38', "Autorimessa", "Sono presenti estintori", 1],
  ['4.39', "Autorimessa", "Sono presenti idranti/naspi", 1],
  ['4.40', "Autorimessa", "È presente un impianto sprinkler", 0],
  ['4.41', "Autorimessa", "È presente la segnaletica orizzontale", 1],
  ['4.42', "Imprese terze", "È presente il servizio di portierato", 0],
  ['4.43', "Imprese terze", "È presente il servizio di vigilanza H24", 0],
  ['4.44', "Imprese terze", "Al momento del sopralluogo sono presenti imprese terze (manutenzione, derattizzazione, cura del verde etc.)", 0],
  ['4.45', "Aree di deposito", "Sono presenti magazzini – scaffalature", 0],
  ['4.46', "Aree di deposito", "È indicata la porta massima degli scaffali", 1],
  ['4.47', "Aree di deposito", "Le aree di deposito sono mantenute in ordine", 1],
  ['4.48', "Aree di deposito", "Sono presenti aree di deposito rifiuti", 0],
  ['4.49', "Aree di deposito", "Sono presenti aree di deposito di materiali pericolosi", 0],
  ['5.1', "Locali tecnici", "Sono presenti locali tecnici", 0],
  ['5.2', "Locali tecnici", "I locali tecnici sono chiusi a chiave", 1],
  ['5.3', "Locali tecnici", "È presente la segnaletica di divieto di accesso", 1],
  ['5.4', "Locali tecnici", "I locali tecnici sono adeguatamente illuminati", 1],
  ['5.5', "Locali tecnici", "Le vie di accesso risultano regolari, uniformi ed adeguatamente illuminate", 1],
  ['5.6', "Locali tecnici", "Il pavimento dei locali tecnici è mantenuto in condizioni idonee al suo uso", 1],
  ['5.7', "Locali tecnici", "Sono presenti a terra tracce di olio/acqua che possono costituire causa di scivolamento", -1],
  ['5.8', "Locali tecnici", "Sono presenti tubi, passerelle che costituiscono inciampo o ostacolo", -1],
  ['5.9', "Locali tecnici", "Eventuali elementi di pericolo sono segnalati attraverso idonea cartellonistica", 1],
  ['5.10', "Locali tecnici", "Nelle aree tecniche sono presenti materiali estranei", -1],
  ['5.11', "Locali tecnici", "Sono presenti aperture verso il vuoto prive di parapetto", -1],
  ['5.12', "Locali tecnici", "È presente l’interruttore di sgancio dell’energia elettrica e lo stesso risulta segnalato", 1],
  ['5.13', "Locali tecnici", "È presente la valvola di intercettazione del combustibile (caldaia/gruppo elettrogeno) e la stessa risulta segnalata", 1],
  ['5.14', "Locali tecnici", "Sono presenti spazi confinati", 0],
  ['6.1', "Condizioni ambientali", "Sono presenti Manufatti Contenenti Amianto o sospetti", -1],
  ['6.2', "Condizioni ambientali", "Sono presenti Fibre Artificiali Vetrose", -1],
  ['6.3', "Condizioni ambientali", "Sono presenti rifiuti non adeguatamente stoccati o in stato di abbandono", -1],
  ['6.4', "Condizioni ambientali", "Sono presenti serbatoi interrati", 0],
  ['6.5', "Condizioni ambientali", "Sono presenti condizioni igieniche sufficienti", 1],
  ['6.6', "Condizioni ambientali", "Sono presenti situazioni di rischio biologico", -1],
  ['6.7', "Condizioni ambientali", "Presenza di macchinari /apparecchiature / attrezzature con potenziali criticità ambientali", -1],
  ['7.1', "Emergenza", "Le attività presenti sono soggette a Prevenzione Incendi", 0],
  ['7.2', "Emergenza", "È presente un Piano di Emergenza ed Evacuazione", 1],
  ['7.3', "Emergenza", "Sono presenti idonee vie di fuga ed uscite di sicurezza", 1],
  ['7.4', "Emergenza", "Le vie e uscite di emergenza sono mantenute sgombre e facilmente accessibili", 1],
  ['7.5', "Emergenza", "È presente la segnaletica di sicurezza", 1],
  ['7.6', "Emergenza", "È presente un sistema di allarme acustico/visivo", 1],
  ['7.7', "Emergenza", "Sono presenti estintori, idranti, naspi", 1],
  ['7.8', "Emergenza", "Sono presenti rilevatori di fumo e/o calore", 1],
  ['7.9', "Emergenza", "I presidi antincendio sono regolarmente verificati", 1],].map(([rif, grp, t, p]) => ({ rif, grp, t, p }));
const hsVoce = rif => HS_VOCI.find(v => v.rif === rif);

/* ---------------- schede ----------------
   Le sotto-aree hanno ciascuna il proprio campo "Situazione rilevata".
   voci: codici della checklist mostrati nella scheda (intervalli "da-a" sullo stesso capitolo). */
const HS_SEZ = [
  { k: 'agibilita', t: 'Agibilità e documentazione', voci: [] },
  { k: 'incendi', t: 'Prevenzione incendi', voci: ['7.1'] },
  { k: 'esterne', t: 'Aree esterne', subs: ['Accessi', 'Aree di transito – Pavimentazione esterna', 'Facciata'], voci: ['3.1-3.15', '4.1-4.9'] },
  { k: 'copertura', t: 'Involucro e copertura', subs: ['Copertura', 'Accesso alla copertura', 'Impianto anticaduta'], voci: ['4.17-4.28'] },
  { k: 'strutture', t: 'Strutture', voci: ['4.32-4.34'] },
  { k: 'interni', t: 'Interni', voci: ['4.10-4.16', '4.45-4.47'] },
  { k: 'autorimessa', t: 'Autorimessa', voci: ['4.35-4.41'] },
  { k: 'locali', t: 'Locali tecnici', voci: ['5.1-5.14'] },
  { k: 'elettrici', t: 'Impianti elettrici e speciali', subs: ['Impianto elettrico', 'Illuminazione', 'Gruppo elettrogeno/UPS', 'Messa a terra', 'Protezione scariche atmosferiche'], voci: [] },
  { k: 'meccanici', t: 'Impianti meccanici', subs: ['Impianto idrico sanitario', 'Impianto trattamento aria'], voci: [] },
  { k: 'antincendio', t: 'Impianti e presidi antincendio', voci: ['7.7-7.9'] },
  { k: 'sollevamento', t: 'Impianti di sollevamento', subs: ['Impianto ascensori, montacarichi, montascale', 'Baie di carico'], voci: ['4.29-4.31'] },
  { k: 'pericolosi', t: 'Materiali, apparecchiature, ambienti pericolosi', voci: ['4.49', '6.7'] },
  { k: 'ambientali', t: 'Analisi ambientali e campionamenti', subs: ['Serbatoi (UST, AST)', 'Amianto/FAV', 'Autorizzazione agli scarichi', 'Rifiuti', 'Autorizzazione pozzi'], voci: ['4.48', '6.1-6.6'] },
  { k: 'emergenze', t: 'Gestione delle emergenze', voci: ['7.2-7.6'] },
  { k: 'servizi', t: 'Presidio del sito e imprese terze', voci: ['4.42-4.44'] },
].map(s => {
  const rifs = [];
  for (const x of s.voci) {
    const [a, b] = x.split('-'); const cap = a.split('.')[0];
    const from = +a.split('.')[1], to = b ? +b.split('.')[1] : from;
    for (let i = from; i <= to; i++) rifs.push(cap + '.' + i);
  }
  return { ...s, subs: s.subs || [], voci: rifs.map(hsVoce).filter(Boolean) };
});
const hsSezOf = k => HS_SEZ.find(s => s.k === k);
const HS_SUB0 = '_';                      // chiave della situazione rilevata nelle schede senza sotto-aree
const hsSubKeys = S => S.subs.length ? S.subs : [HS_SUB0];

// Priorità di intervento (schede) e gravità (criticità): stessa scala, 1 = più urgente
const HS_PRIO = [
  { v: 1, l: 'Alta', g: 'Alto', d: 'Richiede un intervento immediato', c: '#be222a', b: 'b-nc', w: 'C00000' },
  { v: 2, l: 'Media', g: 'Medio', d: 'Richiede la pianificazione di un intervento a medio termine', c: '#a45f00', b: 'b-f1', w: 'BF8F00' },
  { v: 3, l: 'Bassa', g: 'Basso', d: 'Richiede un intervento a lungo termine', c: '#007e46', b: 'b-ok', w: '2E7D32' },
];
const hsPrio = v => HS_PRIO.find(p => p.v === +v);
const HS_NATURA = ['Penale', 'Amministrativa', 'Penale/Amministrativa', 'Nessuna'];

// Anagrafica dell'immobile: [chiave, etichetta, tipo]  (tipo: '' testo, 'a' area, 'seg:A|B' scelta)
const HS_ANAG = [
  ['destinazione', 'Destinazione d\'uso', ''], ['anno', 'Anno di costruzione', ''],
  ['superficie', 'Superficie', ''], ['sismica', 'Classificazione sismica', ''],
  ['porzione', 'Unità immobiliare', 'seg:Intera|Porzione'], ['occupazione', 'Stato', 'seg:Libero|Occupato'],
  ['tenant', 'Conduttore / tenant', ''], ['parcheggi', 'Parcheggi (esterni / interni)', ''],
  ['autorimesse', 'Autorimesse', ''], ['baie', 'Baie di carico', ''], ['fotovoltaico', 'Impianto fotovoltaico', ''],
  ['descrizione', 'Descrizione sintetica dell\'immobile', 'a'], ['nonVisionate', 'Porzioni non visionate', 'a'],
  ['manutenzione', 'Manutenzioni ordinarie e straordinarie', 'a'], ['adeguamenti', 'Adeguamenti normativi recenti', 'a'],
  ['developer', 'Developer', ''], ['propertyManager', 'Property manager', ''], ['procuratoreHse', 'Procuratore in ambito HSE', ''],
];

const HS_FRASI = {
  sit: [
    'Alla data del sopralluogo non sono state riscontrate criticità di rilievo.',
    'Si segnala l\'assenza della documentazione attestante l\'avvenuta verifica periodica.',
    'L\'elemento risulta in stato di conservazione complessivamente adeguato all\'uso.',
    'Si rilevano localizzati fenomeni di degrado/ammaloramento superficiale.',
    'Non è stato possibile accedere all\'area durante il sopralluogo; la valutazione è pertanto limitata.',
    'La documentazione esaminata risulta completa e conforme a quanto previsto dalla normativa vigente.',
  ],
  mig: [
    'Si raccomanda di reperire e archiviare la documentazione mancante.',
    'Si raccomanda di programmare le verifiche periodiche previste dalla normativa vigente.',
    'Si raccomanda l\'esecuzione di interventi di manutenzione straordinaria.',
    'Si raccomanda di integrare la segnaletica di sicurezza secondo D.Lgs. 81/08.',
    'Si raccomanda di aggiornare il piano di emergenza ed evacuazione.',
    'Nessuna attività di miglioramento necessaria allo stato attuale.',
  ],
};

/* ---------------- riformulazione tecnica (offline) ----------------
   Ogni regola riconosce parole chiave nella nota scritta in sito e propone la formulazione
   tecnica della situazione e dell'azione. Se nessuna regola corrisponde il testo resta com'è:
   non viene mai inventato nulla. "sicura" = la regola richiede termine + stato di difetto. */
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
function hsRiformula(testo) {
  const t = String(testo || '').trim();
  if (!t || t.length > 240) return null;             // testo già lungo: probabilmente già in forma tecnica
  const sit = [], mig = []; let sicura = true;
  HS_TEC_RULES.forEach(r => {
    if (!r.re.test(t)) return;
    if (!r.sicura) sicura = false;
    if (!sit.includes(r.sit)) sit.push(r.sit);
    if (r.mig && !mig.includes(r.mig)) mig.push(r.mig);
  });
  return sit.length ? { sit: sit.join('\n'), mig: mig.join('\n'), sicura } : null;
}

/* ---------------- record ---------------- */
const HS_SEZ_EMPTY = { na: false, risp: {}, note: {}, sit: {}, mig: '', natura: '', costo: '', prio: null, propr: false, cond: false, termine: '', foto: [] };
const hsD = (r, k) => ({ ...HS_SEZ_EMPTY, ...((r.sez || {})[k] || {}) });

function newHs(records, settings) {
  const y = new Date().getFullYear();
  const n = records.filter(r => r.type === 'hs' && (r.codice || '').startsWith('HS-' + y)).map(r => +r.codice.slice(-3)).reduce((a, b) => Math.max(a, b), 0) + 1;
  return {
    id: uid('hs'), type: 'hs', codice: `HS-${y}-${String(n).padStart(3, '0')}`, createdAt: Date.now(), updatedAt: Date.now(),
    commessa: '', cliente: '', proprieta: '', citta: '', sito: '', indirizzo: '', data: today(),
    tecnico: `${settings.tecnicoNome} ${settings.tecnicoCognome}`.trim(), presenti: '', fonte: '',
    anag: {}, catasto: [], sez: {}, criticita: [], base: null, appunti: '', planimetrie: [],
  };
}
const hsIsEmpty = r => !r.commessa && !r.cliente && !r.sito && !r.citta && !r.indirizzo && !r.presenti && !r.appunti
  && !Object.keys(r.sez || {}).length && !(r.criticita || []).length && !Object.values(r.anag || {}).some(Boolean)
  && !(r.catasto || []).length && !(r.fotoAppunti || []).length && !(r.planimetrie || []).length;
const newCrit = (x = {}) => ({ id: uid('c'), sez: '', rif: '', situazione: '', rischio: '', gravita: null, azione: '', foto: [], notaCampo: '', ...x });

// esito di una risposta: 'ok' | 'ko' | 'info' | 'na' | null
function hsEsito(v, ans) {
  if (!ans) return null;
  if (ans === 'na') return 'na';
  if (!v || v.p === 0) return 'info';
  return (ans === 'si') === (v.p === 1) ? 'ok' : 'ko';
}
const HS_ANS = { si: 'Sì', no: 'No', na: 'N.A.' };
const HS_ESITO_B = { ok: 'b-ok', ko: 'b-nc', info: 'b-f2', na: 'b-grey' };

// riepilogo di una scheda: voci compilate, criticità, priorità (impostata o suggerita dalla gravità peggiore)
function hsStat(r, S) {
  const d = hsD(r, S.k);
  const crit = (r.criticita || []).filter(c => c.sez === S.k);
  const fatte = S.voci.filter(v => d.risp[v.rif]).length;
  const ko = S.voci.filter(v => hsEsito(v, d.risp[v.rif]) === 'ko').length;
  const grav = crit.map(c => +c.gravita).filter(Boolean);
  const sugg = grav.length ? Math.min(...grav) : null;
  const testo = hsSubKeys(S).some(k => (d.sit[k] || '').trim()) || !!d.mig.trim();
  return { d, crit, fatte, ko, sugg, prio: d.prio || null, testo, toccata: d.na || fatte > 0 || testo || crit.length > 0 };
}

// foto del sopralluogo con nomi leggibili: [nome, id]
function hsPhotoNames(r) {
  const out = [];
  HS_SEZ.forEach((S, i) => (hsD(r, S.k).foto || []).forEach((f, k) => out.push([`${String(i + 1).padStart(2, '0')}_${S.k}_${k + 1}`, f])));
  (r.criticita || []).forEach((c, j) => (c.foto || []).forEach((f, k) => out.push([`Criticita_${c.rif || c.sez || j + 1}_${k + 1}`, f])));
  return out;
}

/* ---------------- import da report precedente ----------------
   Schema JSON (scaricabile con "Scarica modello"): si fa preparare a Claude dal report precedente.
   Riempie solo i campi vuoti e aggiunge le criticità non già presenti. Il testo importato diventa
   il riferimento: nel report Word le righe nuove o modificate escono in rosso. */
const HS_TEMPLATE = {
  app: 'nembo', type: 'hs-sopralluogo',
  _istruzioni: 'Compila solo ciò che risulta dal report precedente e lascia vuoto il resto. checklist: si, no oppure na. priorita e gravita: 1 (alta), 2 (media), 3 (bassa). competenza: elenco con proprieta e/o conduttore. situazione: testo unico, oppure un testo per ogni sotto-area indicata. Le chiavi che iniziano con _ si ignorano.',
  fonte: '',
  commessa: '', cliente: '', proprieta: '', citta: '', indirizzo: '', sito: '', presenti: '',
  anagrafica: Object.fromEntries(HS_ANAG.map(([k]) => [k, ''])),
  catasto: [{ tipo: 'Fabbricati', foglio: '', particella: '', sub: '', categoria: '' }],
  sezioni: Object.fromEntries(HS_SEZ.map(S => [S.k, {
    _titolo: S.t, nonApplicabile: false,
    checklist: Object.fromEntries(S.voci.map(v => [v.rif, ''])),
    _voci: Object.fromEntries(S.voci.map(v => [v.rif, v.t])),
    noteChecklist: {},
    situazione: S.subs.length ? Object.fromEntries(S.subs.map(x => [x, ''])) : '',
    miglioramento: '', naturaRischio: '', costoIndicativo: '', priorita: '', competenza: [], termine: '',
  }])),
  criticita: [{ sezione: 'esterne', codice: '3.2', situazione: '', rischio: '', gravita: '', azione: '' }],
};
function hsGravNum(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (['1', 'alta', 'alto'].includes(s)) return 1;
  if (['2', 'media', 'medio'].includes(s)) return 2;
  if (['3', 'bassa', 'basso'].includes(s)) return 3;
  return null;
}
function importHs(text, rec) {
  let d;
  try { d = JSON.parse(text); } catch (e) { throw new Error('il file non è un JSON valido'); }
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('struttura del file non riconosciuta');
  if (d.type && d.type !== 'hs-sopralluogo') throw new Error('il file non è un sopralluogo H&S');
  const s = v => (v == null ? '' : String(v).trim());
  const patch = {}; let n = 0;
  const base = JSON.parse(JSON.stringify(rec.base || { sez: {}, crit: {} }));
  for (const k of ['fonte', 'commessa', 'cliente', 'proprieta', 'citta', 'indirizzo', 'sito', 'presenti'])
    if (s(d[k]) && !rec[k]) { patch[k] = s(d[k]); n++; }
  if (d.anagrafica && typeof d.anagrafica === 'object') {
    const a = { ...(rec.anag || {}) };
    for (const [k] of HS_ANAG) if (s(d.anagrafica[k]) && !a[k]) { a[k] = s(d.anagrafica[k]); n++; }
    patch.anag = a;
  }
  if (Array.isArray(d.catasto) && !(rec.catasto || []).length) {
    const rows = d.catasto.filter(x => x && (x.foglio || x.particella || x.mappale)).map(x => ({ id: uid('k'),
      tipo: /^t/i.test(s(x.tipo)) ? 'T' : 'F', foglio: s(x.foglio), particella: s(x.particella || x.mappale), sub: s(x.sub), categoria: s(x.categoria) }));
    if (rows.length) { patch.catasto = rows; n += rows.length; }
  }
  const sez = JSON.parse(JSON.stringify(rec.sez || {}));
  if (d.sezioni && typeof d.sezioni === 'object') {
    for (const S of HS_SEZ) {
      const x = d.sezioni[S.k]; if (!x || typeof x !== 'object') continue;
      const cur = { ...HS_SEZ_EMPTY, ...(sez[S.k] || {}) };
      cur.risp = { ...cur.risp }; cur.note = { ...cur.note }; cur.sit = { ...cur.sit };
      const b = base.sez[S.k] = base.sez[S.k] || { risp: {}, sit: {}, mig: '' };
      if (x.nonApplicabile === true && !cur.na) { cur.na = true; n++; }
      for (const v of S.voci) {
        const a = s((x.checklist || {})[v.rif]).toLowerCase().replace('sì', 'si').replace('n.a.', 'na');
        if (['si', 'no', 'na'].includes(a) && !cur.risp[v.rif]) { cur.risp[v.rif] = a; b.risp[v.rif] = a; n++; }
        const nt = s((x.noteChecklist || {})[v.rif]);
        if (nt && !cur.note[v.rif]) { cur.note[v.rif] = nt; n++; }
      }
      const sit = x.situazione;
      if (typeof sit === 'string' && s(sit)) {
        const k0 = hsSubKeys(S)[0];
        if (!cur.sit[k0]) { cur.sit[k0] = s(sit); b.sit[k0] = s(sit); n++; }
      } else if (sit && typeof sit === 'object') {
        for (const k of hsSubKeys(S)) if (s(sit[k]) && !cur.sit[k]) { cur.sit[k] = s(sit[k]); b.sit[k] = s(sit[k]); n++; }
      }
      if (s(x.miglioramento) && !cur.mig) { cur.mig = s(x.miglioramento); b.mig = cur.mig; n++; }
      if (s(x.naturaRischio) && !cur.natura) { cur.natura = s(x.naturaRischio); n++; }
      if (s(x.costoIndicativo) && !cur.costo) { cur.costo = s(x.costoIndicativo); n++; }
      if (hsGravNum(x.priorita) && !cur.prio) { cur.prio = hsGravNum(x.priorita); n++; }
      if (Array.isArray(x.competenza)) {
        if (x.competenza.some(c => /propr/i.test(c)) && !cur.propr) { cur.propr = true; n++; }
        if (x.competenza.some(c => /condut/i.test(c)) && !cur.cond) { cur.cond = true; n++; }
      }
      if (s(x.termine) && !cur.termine) { cur.termine = s(x.termine); n++; }
      sez[S.k] = cur;
    }
    patch.sez = sez;
  }
  let nc = 0;
  if (Array.isArray(d.criticita)) {
    const key = c => [c.sez, (c.rif || '').trim(), (c.situazione || '').trim().toLowerCase()].join('|');
    const known = new Set((rec.criticita || []).map(key));
    const add = [];
    for (const x of d.criticita) {
      if (!x || typeof x !== 'object') continue;
      const rif = s(x.codice || x.rif);
      let sk = s(x.sezione);
      if (!hsSezOf(sk)) sk = (HS_SEZ.find(S => S.voci.some(v => v.rif === rif)) || HS_SEZ[0]).k;
      const c = newCrit({ sez: sk, rif, situazione: s(x.situazione), rischio: s(x.rischio), gravita: hsGravNum(x.gravita), azione: s(x.azione || x.azioni) });
      if (!c.situazione && !c.azione) continue;
      if (known.has(key(c))) continue;
      known.add(key(c)); add.push(c);
      base.crit[c.id] = { situazione: c.situazione, rischio: c.rischio, azione: c.azione, gravita: c.gravita };
    }
    if (add.length) { patch.criticita = [...(rec.criticita || []), ...add]; nc = add.length; }
  }
  if (!n && !nc) throw new Error('nessun dato nuovo: i campi del file sono già compilati');
  patch.base = base;
  return { patch, n, nc };
}

/* ---------------- elenco ---------------- */
function HsList({ records, open, create, activeId }) {
  const od = useOdSynced();
  const all = records.filter(r => r.type === 'hs').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const groups = {};
  all.forEach(r => { const c = r.cliente || 'Senza cliente', s = placeLabel(r); ((groups[c] = groups[c] || {})[s] = groups[c][s] || []).push(r); });
  return html`<div class="content">
    <h2>Sopralluoghi H&S</h2><p class="lead">Salute e sicurezza degli immobili: schede, checklist e criticità</p>
    ${!all.length && html`<div class="empty"><b>Nessun sopralluogo</b>Tocca + per iniziare, oppure carica i dati del report precedente.</div>`}
    ${Object.entries(groups).map(([c, sites]) => html`<div key=${c}><div class="grp-client">${c}</div>
      ${Object.entries(sites).map(([s, rs]) => html`<div key=${s}><div class="grp-site">${s}<span class="count">${rs.length}</span></div><div class="list">
        ${rs.map(r => {
          const tot = HS_SEZ.length, fatte = HS_SEZ.filter(S => hsStat(r, S).toccata).length;
          const crit = r.criticita || [], alte = crit.filter(c => +c.gravita === 1).length;
          return html`<button class=${'rcard' + (activeId === r.id ? ' on' : '') + odCls(od, r)} key=${r.id} onClick=${() => open(r.id)}>
            <div class="r1"><span class="id">${r.codice}</span>
              <span class=${'badge ' + (fatte === tot ? 'b-ok' : 'b-f2')}>${fatte}/${tot} schede</span><span class="dt">${fmtD(r.data)}</span></div>
            ${r.commessa && html`<div class="ttl">${r.commessa}</div>`}
            <div class="sum">${r.tecnico ? r.tecnico + ' · ' : ''}${crit.length} ${crit.length === 1 ? 'criticità' : 'criticità'}${r.fonte ? ' · ' + r.fonte : ''}</div>
            ${alte > 0 && html`<div class="due late">${alte} ${alte === 1 ? 'criticità a gravità alta' : 'criticità a gravità alta'}</div>`}
            <${OdBadge} map=${od} r=${r} />
          </button>`;
        })}</div></div>`)}</div>`)}
    <div class="fbar"><button class="fab" aria-label="Nuovo sopralluogo H&S" onClick=${create}><${Icon} n="plus" s=${21} w=${2.4} /></button></div>
  </div>`;
}

/* ---------------- componenti ---------------- */
function PrioPick({ value, set, sugg }) {
  return html`<div class="hs-prio">${HS_PRIO.map(p => html`<button key=${p.v} class=${+value === p.v ? 'on' : (!value && sugg === p.v ? 'sugg' : '')} style=${'--sc:' + p.c}
    title=${p.d} onClick=${() => set(+value === p.v ? null : p.v)}><b>${p.v}</b> ${p.l}</button>`)}</div>`;
}
function Frasi({ list, onPick }) {
  return html`<div class="hs-frasi">${list.map(f => html`<button key=${f} title=${f} onClick=${() => onPick(f)}>${f}</button>`)}</div>`;
}
const appendLine = (txt, f) => (txt || '').trim() ? txt.replace(/\s+$/, '') + '\n' + f : f;

function VoceRow({ v, d, prev, hasCrit, setAns, setNote, onCrit }) {
  const [o, setO] = useState(false);
  const ans = d.risp[v.rif], es = hsEsito(v, ans), note = d.note[v.rif] || '';
  const changed = prev && ans && prev !== ans;
  return html`<div class="hs-v">
    <button class="q" aria-expanded=${o} onClick=${() => setO(!o)}><span class="rf">${v.rif}</span>${v.t}
      ${(note && !o) && html`<small>${note}</small>`}
      ${changed && html`<small class="prev">Sopralluogo precedente: ${HS_ANS[prev]}</small>`}</button>
    <div class="three">${['si', 'no', 'na'].map(a => html`<button key=${a} class=${ans === a ? hsEsito(v, a) : ''} aria-pressed=${ans === a}
      onClick=${() => setAns(v.rif, ans === a ? '' : a)}>${HS_ANS[a]}</button>`)}</div>
    ${(o || (es === 'ko' && !hasCrit)) && html`<div class="more">
      ${o && html`<textarea class="inp" rows="2" placeholder="Note, ubicazione, evidenze…" value=${note} onInput=${e => setNote(v.rif, e.target.value)}></textarea>`}
      ${es === 'ko' && !hasCrit && html`<button class="btn sm outline" style="justify-self:start" onClick=${() => onCrit(v)}>+ Criticità ${v.rif}</button>`}
    </div>`}
  </div>`;
}

function CritCard({ c, S, base, onUpd, onDel }) {
  const set = patch => onUpd(c.id, patch);
  const g = hsPrio(c.gravita);
  const riformula = () => {
    const x = hsRiformula(c.situazione);
    if (!x) { toast('Nessuna formulazione tecnica per questa nota: resta com\'è'); return; }
    if (!x.sicura && !confirm('Sostituire la nota con questa formulazione?\n\n' + x.sit)) return;
    set({ notaCampo: c.notaCampo || c.situazione, situazione: x.sit, azione: (c.azione || '').trim() ? c.azione : x.mig });
    toast('Testo riformulato');
  };
  const v = c.rif && hsVoce(c.rif.trim());
  return html`<div class="card tight hs-crit" style=${'--sc:' + (g ? g.c : '#c9ced6')}>
    <div class="row" style="margin-bottom:8px">
      <input class="inp" style="width:84px;font-weight:700;text-align:center" list=${'dl-rif-' + S.k} placeholder="Cod." value=${c.rif} onInput=${e => set({ rif: e.target.value })} aria-label="Codice" />
      <div class="tb-grow" style="font-size:12px;color:var(--muted);line-height:1.3">${v ? v.grp + ' – ' + v.t : 'Criticità della scheda'}</div>
      <button class="x" aria-label="Elimina criticità" onClick=${() => onDel(c)}>×</button></div>
    <div class="stack">
      <${Area} label="Situazione rilevata" rows=${3} value=${c.situazione} set=${x => set({ situazione: x })} placeholder="Scrivi la nota come in sito, poi Riformula" />
      ${c.notaCampo && c.notaCampo !== c.situazione && html`<div class="lock">Nota in sito: ${c.notaCampo}</div>`}
      <button class="btn sm" style="justify-self:start" onClick=${riformula}>Riformula in linguaggio tecnico</button>
      <${Area} label="Rischio evidenziato" rows=${2} value=${c.rischio} set=${x => set({ rischio: x })} />
      <div class="fld"><span>Gravità</span></div>
      <${PrioPick} value=${c.gravita} set=${x => set({ gravita: x })} />
      <${Area} label="Azioni consigliate / misure di prevenzione" rows=${3} value=${c.azione} set=${x => set({ azione: x })} />
      <div><div class="fld"><span>Foto (fino a 3)</span></div>
        <${PhotoStrip} ids=${c.foto} max=${3} onAdd=${ids => set({ foto: [...c.foto, ...ids] })} onRemove=${async id => { await removeBlob(id); set({ foto: c.foto.filter(f => f !== id) }); }} /></div>
      ${base && html`<div class="lock">Importata dal sopralluogo precedente</div>`}
    </div>
  </div>`;
}

function SezCard({ S, i, r, open, toggle, updSez, addCrit, updCrit, delCrit }) {
  const st = hsStat(r, S), d = st.d;
  const b = (r.base && r.base.sez && r.base.sez[S.k]) || null;
  const pr = hsPrio(st.prio);
  const setAns = (rif, a) => updSez(S.k, x => { const risp = { ...x.risp }; if (a) risp[rif] = a; else delete risp[rif]; return { risp }; });
  const setNote = (rif, t) => updSez(S.k, x => ({ note: { ...x.note, [rif]: t } }));
  const setSit = (k, t) => updSez(S.k, x => ({ sit: { ...x.sit, [k]: t } }));
  const fromVoce = v => {
    const nt = (d.note[v.rif] || '').trim();
    addCrit(S.k, { rif: v.rif, situazione: nt || v.t, notaCampo: nt });
  };
  let grp = null;
  return html`<div class="punto" id=${'hs-' + S.k}>
    <button class="punto-h" aria-expanded=${open} onClick=${toggle}>
      <span class="rtag" style=${d.na ? 'background:#eceff3;color:#6f7278' : pr ? `background:${pr.c}1f;color:${pr.c}` : ''}>${i + 1}</span>
      <div class="t"><b>${S.t}</b><small>${d.na ? 'Non applicabile' : [S.voci.length ? `${st.fatte}/${S.voci.length} voci` : '', st.crit.length ? `${st.crit.length} criticità` : '', st.testo ? 'testo' : ''].filter(Boolean).join(' · ') || 'Da compilare'}</small></div>
      ${d.na ? html`<span class="badge b-grey">N.A.</span>` : pr ? html`<span class=${'badge ' + pr.b}>Priorità ${pr.v}</span>` : st.ko ? html`<span class="badge b-nc">${st.ko} ${st.ko === 1 ? 'esito negativo' : 'esiti negativi'}</span>` : st.toccata ? html`<span class="badge b-f2">In corso</span>` : html`<span class="badge st-none">Da fare</span>`}
      <span class=${'chev' + (open ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
    ${open && html`<div class="punto-b">
      <div class="seg"><button class=${!d.na ? 'on' : ''} onClick=${() => updSez(S.k, { na: false })}>Applicabile</button>
        <button class=${d.na ? 'on' : ''} onClick=${() => updSez(S.k, { na: true })}>Non applicabile</button></div>
      ${!d.na && html`
        ${S.voci.length > 0 && html`<div><div class="fld"><span>Checklist · ${st.fatte}/${S.voci.length}</span></div>
          ${S.voci.map(v => { const h = v.grp !== grp; grp = v.grp; return html`${h && html`<div class="hs-grp">${v.grp}</div>`}
            <${VoceRow} key=${v.rif} v=${v} d=${d} prev=${b && b.risp[v.rif]} hasCrit=${st.crit.some(c => (c.rif || '').trim() === v.rif)} setAns=${setAns} setNote=${setNote} onCrit=${fromVoce} />`; })}</div>
          <div class="divider" style="margin:0"></div>`}
        ${hsSubKeys(S).map(k => html`<div key=${k} class="stack" style="gap:6px">
          <${Area} label=${k === HS_SUB0 ? 'Situazione rilevata' : 'Situazione rilevata · ' + k} rows=${3} value=${d.sit[k] || ''} set=${t => setSit(k, t)} />
          <${Frasi} list=${HS_FRASI.sit} onPick=${f => setSit(k, appendLine(d.sit[k], f))} /></div>`)}
        <div class="stack" style="gap:6px"><${Area} label="Attività di miglioramento" rows=${3} value=${d.mig} set=${t => updSez(S.k, { mig: t })} />
          <${Frasi} list=${HS_FRASI.mig} onPick=${f => updSez(S.k, x => ({ mig: appendLine(x.mig, f) }))} /></div>
        <div class="divider" style="margin:0"></div>
        <div class="grid2">
          <label class="fld"><span>Natura del rischio</span><select value=${d.natura} onChange=${e => updSez(S.k, { natura: e.target.value })}>
            <option value=""></option>${[...(d.natura && !HS_NATURA.includes(d.natura) ? [d.natura] : []), ...HS_NATURA].map(x => html`<option value=${x}>${x}</option>`)}</select></label>
          <${Inp} label="Costo indicativo" value=${d.costo} set=${t => updSez(S.k, { costo: t })} placeholder="es. 2.000 €" />
        </div>
        <div><div class="fld"><span>Priorità di intervento${!d.prio && st.sugg ? ' · suggerita ' + st.sugg + ' dalle criticità' : ''}</span></div>
          <${PrioPick} value=${d.prio} sugg=${st.sugg} set=${x => updSez(S.k, { prio: x })} /></div>
        <div class="grid2">
          <div><div class="fld"><span>Competenza</span></div><div class="seg">
            <button class=${d.propr ? 'on' : ''} onClick=${() => updSez(S.k, x => ({ propr: !x.propr }))}>Proprietà</button>
            <button class=${d.cond ? 'on' : ''} onClick=${() => updSez(S.k, x => ({ cond: !x.cond }))}>Conduttore</button></div></div>
          <${Inp} label="Termine di completamento" value=${d.termine} set=${t => updSez(S.k, { termine: t })} placeholder="es. 6 mesi" />
        </div>
        <div class="fld" style="margin-top:4px"><span>Criticità · ${st.crit.length}</span></div>
        ${st.crit.map(c => html`<${CritCard} key=${c.id} c=${c} S=${S} base=${r.base && r.base.crit && r.base.crit[c.id]} onUpd=${updCrit} onDel=${delCrit} />`)}
        <button class="btn dashed" onClick=${() => addCrit(S.k, {})}>+ Aggiungi criticità</button>
        <datalist id=${'dl-rif-' + S.k}>${S.voci.map(v => html`<option value=${v.rif}>${v.t}</option>`)}</datalist>
      `}
      <div><div class="fld"><span>Foto della scheda (fino a 12)</span></div>
        <${PhotoStrip} ids=${d.foto} max=${12} onAdd=${ids => updSez(S.k, x => ({ foto: [...x.foto, ...ids] }))}
          onRemove=${async id => { await removeBlob(id); updSez(S.k, x => ({ foto: x.foto.filter(f => f !== id) })); }} /></div>
    </div>`}
  </div>`;
}

/* ---------------- form ---------------- */
function HsForm({ rec: initial, records, settings, onSave, onDelete, header, embedded, onClose }) {
  const [r, up, saved] = useAutosave(initial, onSave);
  const [openS, setOpenS] = useState({});
  const [openA, setOpenA] = useState(false);
  const [f, setF] = useState('tutte');
  const imp = useRef();
  useEffect(() => { if (!embedded) header(r.codice, saved ? 'Salvato' : 'Salvataggio…'); }, [r.codice, saved, embedded]);

  const clienti = [...new Set(records.filter(x => x.cliente).map(x => x.cliente))];
  const updSez = (k, patch) => up(p => {
    const cur = { ...HS_SEZ_EMPTY, ...((p.sez || {})[k] || {}) };
    const add = typeof patch === 'function' ? patch(cur) : patch;
    return { ...p, sez: { ...(p.sez || {}), [k]: { ...cur, ...add } } };
  });
  const addCrit = (k, x) => up(p => ({ ...p, criticita: [...(p.criticita || []), newCrit({ sez: k, ...x })] }));
  const updCrit = (id, patch) => up(p => ({ ...p, criticita: p.criticita.map(c => c.id === id ? { ...c, ...patch } : c) }));
  const delCrit = async c => {
    if (!confirm('Eliminare questa criticità?')) return;
    for (const b of blobIds(c)) await removeBlob(b);
    up(p => ({ ...p, criticita: p.criticita.filter(x => x.id !== c.id) }));
  };
  const setAnag = (k, v) => up(p => ({ ...p, anag: { ...(p.anag || {}), [k]: v } }));
  const updCat = (id, patch) => up(p => ({ ...p, catasto: p.catasto.map(x => x.id === id ? { ...x, ...patch } : x) }));
  const doImport = e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { const { patch, n, nc } = importHs(rd.result, r); up(patch); toast(`Importati ${n} campi${nc ? ' e ' + nc + ' criticità' : ''}`); }
      catch (err) { fail('Import non riuscito', err); }
    };
    rd.readAsText(file);
  };
  const report = async () => {
    const name = slug([r.codice, 'Sopralluogo_HS', r.sito || placeAddr(r)].filter(Boolean).join('_')) + '.docx';
    const h = await pickSave(name, 'Documento Word', DOCX_MIME, '.docx'); if (h === 'cancel') return;
    toast('Preparo il report…');
    try { await saveOffice(h, await hsReportDocx(r, settings), name); } catch (e) { fail('Word non creato', e); }
  };
  const goSez = k => { setOpenS({ [k]: true }); setTimeout(() => { const el = document.getElementById('hs-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); };

  const stats = HS_SEZ.map(S => hsStat(r, S));
  const fatte = stats.filter(x => x.toccata).length;
  const crit = r.criticita || [];
  const anagN = HS_ANAG.filter(([k]) => (r.anag || {})[k]).length;
  const vis = HS_SEZ.map((S, i) => [S, i]).filter(([S, i]) => f === 'tutte' || (f === 'da' ? !stats[i].toccata : f === 'crit' ? stats[i].crit.length > 0 || stats[i].ko > 0 : stats[i].toccata));
  const critSort = [...crit].sort((a, b) => (+a.gravita || 9) - (+b.gravita || 9));

  return html`<div class="content form">
    ${embedded && html`<div class="embed-hdr"><div><div class="tb-title">${r.codice}</div><div class="tb-sub">${saved ? 'Salvato' : 'Salvataggio…'}</div></div><button class="x" aria-label="Chiudi" onClick=${onClose}>×</button></div>`}
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Commessa" value=${r.commessa} set=${v => up({ commessa: v })} />
      <${Inp} label="Cliente / committente" req list="dl-cli-hs" value=${r.cliente} set=${v => up({ cliente: v })} />
      <${Inp} label="Proprietà" value=${r.proprieta} set=${v => up({ proprieta: v })} />
      <${Inp} label="Città" value=${r.citta} set=${v => up({ citta: v })} />
      <${Inp} label="Sito / codice immobile" value=${r.sito} set=${v => up({ sito: v })} placeholder="Facoltativo" />
      <${Inp} cls="full" label="Indirizzo" value=${r.indirizzo} set=${v => up({ indirizzo: v })} placeholder="Via e numero civico" />
      <${Inp} label="Data sopralluogo" type="date" value=${r.data} set=${v => up({ data: v })} />
      <${Inp} label="Tecnico" value=${r.tecnico} set=${v => up({ tecnico: v })} />
      <${Inp} cls="full" label="Presenti al sopralluogo" value=${r.presenti} set=${v => up({ presenti: v })} />
      ${r.fonte && html`<${Inp} cls="full" label="Report di riferimento" value=${r.fonte} set=${v => up({ fonte: v })} />`}
    </div><datalist id="dl-cli-hs">${clienti.map(c => html`<option value=${c} />`)}</datalist></div>

    <div class="punto">
      <button class="punto-h" aria-expanded=${openA} onClick=${() => setOpenA(!openA)}>
        <span class="rtag"><${Icon} n="file" s=${18} /></span>
        <div class="t"><b>Anagrafica immobile</b><small>${anagN ? `${anagN} di ${HS_ANAG.length} campi` : 'Destinazione, superficie, catasto, soggetti…'}${(r.catasto || []).length ? ' · catasto' : ''}</small></div>
        <span class=${'chev' + (openA ? ' open' : '')}><${Icon} n="chev" s=${18} /></span></button>
      ${openA && html`<div class="punto-b"><div class="grid2">
        ${HS_ANAG.map(([k, l, t]) => t === 'a' ? html`<${Area} key=${k} cls="full" label=${l} rows=${2} value=${(r.anag || {})[k]} set=${v => setAnag(k, v)} />`
          : t.startsWith('seg:') ? html`<div key=${k}><div class="fld"><span>${l}</span></div><div class="seg">${t.slice(4).split('|').map(o => html`<button class=${(r.anag || {})[k] === o ? 'on' : ''} onClick=${() => setAnag(k, (r.anag || {})[k] === o ? '' : o)}>${o}</button>`)}</div></div>`
          : html`<${Inp} key=${k} label=${l} value=${(r.anag || {})[k]} set=${v => setAnag(k, v)} />`)}
      </div>
      <div class="fld"><span>Dati catastali</span></div>
      ${(r.catasto || []).map(x => html`<div class="hs-cat" key=${x.id}>
        <select class="inp" value=${x.tipo} onChange=${e => updCat(x.id, { tipo: e.target.value })} aria-label="Catasto"><option value="F">Fabbr.</option><option value="T">Terreni</option></select>
        <input class="inp" placeholder="Foglio" value=${x.foglio} onInput=${e => updCat(x.id, { foglio: e.target.value })} />
        <input class="inp" placeholder=${x.tipo === 'T' ? 'Mappali' : 'Particella'} value=${x.particella} onInput=${e => updCat(x.id, { particella: e.target.value })} />
        ${x.tipo === 'T' ? html`<span></span><span></span>` : html`<input class="inp" placeholder="Sub" value=${x.sub} onInput=${e => updCat(x.id, { sub: e.target.value })} />
          <input class="inp" placeholder="Cat." value=${x.categoria} onInput=${e => updCat(x.id, { categoria: e.target.value })} />`}
        <button class="x" aria-label="Rimuovi riga" onClick=${() => up(p => ({ ...p, catasto: p.catasto.filter(y => y.id !== x.id) }))}>×</button></div>`)}
      <button class="btn dashed" onClick=${() => up(p => ({ ...p, catasto: [...(p.catasto || []), { id: uid('k'), tipo: 'F', foglio: '', particella: '', sub: '', categoria: '' }] }))}>+ Riga catastale</button>
      </div>`}
    </div>

    <div class="sec-h"><h3>Report precedente</h3></div>
    <div class="card tight">
      <p class="lead" style="margin:2px 0 10px">Fatti preparare da Claude il file JSON dal report precedente, poi caricalo: compila solo i campi vuoti e aggiunge le criticità nuove. Nel report Word le righe nuove o modificate escono in rosso.</p>
      <div class="row"><button class="btn" style="flex:1" onClick=${() => imp.current.click()}>Carica .json</button>
        <button class="btn" style="flex:1" onClick=${() => downloadBlob(new Blob([JSON.stringify(HS_TEMPLATE, null, 1)], { type: 'application/json' }), 'Nembo_modello_HS.json')}>Scarica modello</button></div>
      <input ref=${imp} type="file" accept="application/json,text/plain,application/octet-stream,.json" hidden onChange=${doImport} />
    </div>

    <div class="sec-h"><h3>Schede · ${HS_SEZ.length}</h3><span class="hint">${fatte} di ${HS_SEZ.length} avviate</span></div>
    <div style="height:8px;background:#e1e8ef;border-radius:6px;overflow:hidden;margin:0 2px 10px"><div style=${'height:100%;background:var(--ok);width:' + Math.round(fatte / HS_SEZ.length * 100) + '%'}></div></div>
    <div class="pills">${[['tutte', 'Tutte', HS_SEZ.length], ['da', 'Da fare', HS_SEZ.length - fatte], ['crit', 'Con criticità', stats.filter(x => x.crit.length || x.ko).length], ['fatte', 'Avviate', fatte]]
      .map(([k, l, n]) => html`<button class=${'pill' + (f === k ? ' on' : '')} onClick=${() => setF(k)}>${l}<span class="n">${n}</span></button>`)}</div>
    ${vis.map(([S, i]) => html`<${SezCard} key=${S.k} S=${S} i=${i} r=${r} open=${!!openS[S.k]} toggle=${() => setOpenS({ ...openS, [S.k]: !openS[S.k] })}
      updSez=${updSez} addCrit=${addCrit} updCrit=${updCrit} delCrit=${delCrit} />`)}
    ${!vis.length && html`<div class="empty" style="padding:20px"><b>Nessuna scheda</b>Cambia filtro.</div>`}

    <div class="sec-h"><h3>Criticità · ${crit.length}</h3><span class="hint">${HS_PRIO.map(p => `${crit.filter(c => +c.gravita === p.v).length} ${p.l.toLowerCase()}`).join(' · ')}</span></div>
    ${crit.length ? html`<div class="card tight">${critSort.map(c => { const g = hsPrio(c.gravita), S = hsSezOf(c.sez);
      return html`<button class="hs-cl" key=${c.id} onClick=${() => goSez(c.sez)}>
        <span class=${'badge ' + (g ? g.b : 'st-none')}>${g ? g.l : 'Gravità ?'}</span>
        <div class="tb-grow"><b>${[c.rif, S && S.t].filter(Boolean).join(' · ')}</b><small>${c.situazione || 'Situazione da descrivere'}</small></div>
        <${Icon} n="right" s=${16} /></button>`; })}</div>`
      : html`<div class="card tight"><p class="lead" style="margin:0">Nessuna criticità. Si aggiungono dentro ogni scheda, anche dalle voci di checklist con esito negativo.</p></div>`}

    <div class="sec-h"><h3>Planimetrie</h3></div>
    <div class="card"><${PlanList} items=${r.planimetrie || []} labels=${crit.map((c, k) => { const g = hsPrio(c.gravita); return { ref: c.id, text: c.rif || 'C' + (k + 1), color: g ? g.c : '#52555b' }; })}
      onAdd=${p => up(q => ({ ...q, planimetrie: [...(q.planimetrie || []), p] }))}
      onUpdate=${(id, patch) => up(q => ({ ...q, planimetrie: (q.planimetrie || []).map(x => x.id === id ? { ...x, ...patch } : x) }))}
      onRemove=${async p => { for (const b of blobIds(p)) await removeBlob(b); up(q => ({ ...q, planimetrie: (q.planimetrie || []).filter(x => x.id !== p.id) })); }} /></div>

    <div class="sec-h"><h3>Appunti</h3><span class="hint">Non vanno nel report</span></div>
    <div class="card"><textarea class="inp" rows="4" placeholder="Note generali del sopralluogo" value=${r.appunti} onInput=${e => up({ appunti: e.target.value })} aria-label="Appunti"></textarea>
      <${NotePhotos} rec=${r} up=${up} /></div>

    <div class="sec-h"><h3>Archivio</h3></div>
    <div class="stack">
      <button class="btn block" onClick=${report}><${Icon} n="file" s=${18} /> Report sopralluogo (Word)</button>
      ${OD.account ? html`<button class="btn pri block" onClick=${() => odSync([r], settings)}><${Icon} n="share" s=${18} /> Carica su OneDrive</button>`
        : html`<button class="btn pri block" onClick=${() => sendToOneDrive(r, settings)}><${Icon} n="share" s=${18} /> Invia report e foto a OneDrive</button>`}
      <button class="btn block" onClick=${() => exportRecords([r], settings)}><${Icon} n="archive" s=${18} /> Salva tutto in un file ZIP</button>
      <button class="btn danger block" onClick=${() => onDelete(r)}><${Icon} n="trash" s=${18} /> Elimina sopralluogo</button>
    </div>
  </div>`;
}

/* ---------------- report Word ----------------
   Struttura neutra (nessun logo o intestazione di cliente): dati generali, anagrafica,
   schede con checklist e valutazione, criticità con legenda, riepilogo e foto.
   Se il sopralluogo nasce da un report importato, le righe nuove o modificate sono in rosso. */
async function hsReportDocx(r, s) {
  const D = window.docx;
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, BorderStyle, ShadingType, Footer, PageNumber, VerticalAlign, PageBreak } = D;
  const RED = 'C00000';
  const imp = !!r.base;
  const txt = (t, o = {}) => new TextRun({ text: String(t ?? ''), font: 'Calibri', size: o.size || 20, bold: o.bold, color: o.color, italics: o.italics });
  const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: o.after ?? 80, before: o.before ?? 0 }, alignment: o.align, keepNext: o.keepNext });
  // testo su più righe: in rosso le righe che non c'erano nel report di partenza
  const lines = (text, baseText, o = {}) => {
    const t = String(text || '').trim();
    if (!t) return [p(txt('-', { color: '7F7F7F', size: o.size }), { after: 0 })];
    const old = new Set(String(baseText || '').split('\n').map(x => x.trim()).filter(Boolean));
    return t.split('\n').map(l => l.trim()).filter(Boolean).map((l, i, a) =>
      p(txt(l, { size: o.size, bold: o.bold, color: imp && !old.has(l) ? RED : undefined }), { after: i < a.length - 1 ? 40 : 0 }));
  };
  const line = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
  const B = { top: line, bottom: line, left: line, right: line };
  const W = 9638;
  const cell = (children, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: B, verticalAlign: o.va || VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 },
    columnSpan: o.span, children: Array.isArray(children) ? children : [children] });
  const hcell = (t, w) => cell(p(txt(t, { bold: true, size: 18 }), { after: 0 }), w, { fill: 'F2F2F2' });
  const table = (cols, rows) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cols, rows });
  const kv = list => table([2700, W - 2700], list.map(([a, b]) => new TableRow({ cantSplit: true, children: [
    cell(p(txt(a, { bold: true }), { after: 0 }), 2700, { fill: 'F2F2F2' }), cell(Array.isArray(b) ? b : p(txt(b), { after: 0 }), W - 2700)] })));
  const h1 = t => p(txt(t, { size: 30, bold: true, color: '243257' }), { before: 360, after: 140, keepNext: true });
  const h2 = t => p(txt(t, { size: 24, bold: true }), { before: 260, after: 100, keepNext: true });
  const h3 = t => p(txt(t, { size: 20, bold: true, color: '404040' }), { before: 120, after: 60, keepNext: true });

  // foto: griglia tre per riga, didascalia sotto
  const photoGrid = async (items) => {
    const cw = Math.floor(W / 3), rows = [];
    for (let i = 0; i < items.length; i += 3) {
      const cells = [];
      for (let j = 0; j < 3; j++) {
        const it = items[i + j];
        if (!it) { cells.push(cell(p(txt(''), { after: 0 }), cw)); continue; }
        const ph = await photoForDoc(it.id, 1000);
        const iw = 185, kids = [];
        if (ph) kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new ImageRun({ data: ph.data, transformation: { width: iw, height: Math.round(iw * ph.h / ph.w) } })] }));
        kids.push(p(txt(it.cap, { size: 16, color: '404040' }), { after: 0, align: AlignmentType.CENTER }));
        cells.push(cell(kids, cw, { va: VerticalAlign.TOP }));
      }
      rows.push(new TableRow({ cantSplit: true, children: cells }));
    }
    return rows.length ? [table([cw, cw, W - 2 * cw], rows)] : [];
  };

  const body = [
    p(txt('Sopralluogo H&S', { size: 40, bold: true, color: '243257' }), { after: 60 }),
    p(txt(placeDoc(r) || 'Immobile', { size: 24 }), { after: 200 }),
    kv([['Commessa', r.commessa], ['Cliente / committente', r.cliente], ['Proprietà', r.proprieta], ['Immobile', placeDoc(r)],
      ['Data sopralluogo', fmtD(r.data)], ['Tecnico', r.tecnico], ['Presenti', r.presenti], ['Report di riferimento', r.fonte]].filter(([, v]) => v)),
  ];

  // anagrafica
  const an = HS_ANAG.filter(([k]) => (r.anag || {})[k]);
  const cat = r.catasto || [];
  if (an.length || cat.length) {
    body.push(h1('Anagrafica immobile'));
    if (an.length) body.push(kv(an.map(([k, l]) => [l, lines(r.anag[k], r.anag[k])])));
    if (cat.length) {
      body.push(h3('Dati catastali'));
      const cw = [1800, 1800, 2600, 1600, W - 7800];
      body.push(table(cw, [new TableRow({ tableHeader: true, children: ['Catasto', 'Foglio', 'Particella / mappali', 'Sub', 'Categoria'].map((t, i) => hcell(t, cw[i])) }),
        ...cat.map(x => new TableRow({ cantSplit: true, children: [x.tipo === 'T' ? 'Terreni' : 'Fabbricati', x.foglio, x.particella, x.tipo === 'T' ? '' : x.sub, x.tipo === 'T' ? '' : x.categoria]
          .map((t, i) => cell(p(txt(t || '-'), { after: 0 }), cw[i])) }))]));
    }
  }

  // schede
  body.push(h1('Schede'));
  const crit = r.criticita || [];
  const bs = k => (r.base && r.base.sez && r.base.sez[k]) || { risp: {}, sit: {}, mig: '' };
  for (const [i, S] of HS_SEZ.entries()) {
    const d = hsD(r, S.k), b = bs(S.k);
    body.push(h2(`${i + 1}. ${S.t}`));
    if (d.na) { body.push(p(txt('Non applicabile all\'immobile in esame.', { italics: true }))); continue; }
    const vs = S.voci.filter(v => d.risp[v.rif] || d.note[v.rif]);
    if (vs.length) {
      const cw = [700, 4900, 900, W - 6500];
      body.push(table(cw, [new TableRow({ tableHeader: true, children: ['Cod.', 'Aspetto esaminato', 'Esito', 'Note'].map((t, j) => hcell(t, cw[j])) }),
        ...vs.map(v => {
          const a = d.risp[v.rif], es = hsEsito(v, a), changed = imp && a && b.risp[v.rif] !== a;
          return new TableRow({ cantSplit: true, children: [
            cell(p(txt(v.rif, { bold: true, size: 18 }), { after: 0 }), cw[0]),
            cell(p(txt(v.t, { size: 18 }), { after: 0 }), cw[1]),
            cell(p(txt(HS_ANS[a] || '-', { bold: true, size: 18, color: changed ? RED : es === 'ko' ? RED : undefined }), { after: 0, align: AlignmentType.CENTER }), cw[2]),
            cell(lines(d.note[v.rif], '', { size: 18 }), cw[3])] });
        })]));
    }
    const sitRows = hsSubKeys(S).map(k => [k === HS_SUB0 ? 'Situazione rilevata' : k, lines(d.sit[k], b.sit[k])]);
    const pr = hsPrio(d.prio), comp = [d.propr && 'Proprietà', d.cond && 'Conduttore'].filter(Boolean).join(' / ');
    body.push(p(txt(''), { after: 60 }));
    body.push(kv([...sitRows, ['Attività di miglioramento', lines(d.mig, b.mig)],
      ['Natura del rischio', d.natura || '-'], ['Costo indicativo', d.costo || '-'],
      ['Priorità di intervento', [p(txt(pr ? `${pr.v} – ${pr.l}` : '-', { bold: !!pr, color: pr ? pr.w : undefined }), { after: 0 })]],
      ['Competenza', comp || '-'], ['Termine di completamento', d.termine || '-']]));
    const ph = (d.foto || []).map((id, k) => ({ id, cap: `${S.t} – foto ${k + 1}` }));
    if (ph.length) { body.push(p(txt(''), { after: 60 })); body.push(...await photoGrid(ph)); }
  }

  // criticità
  body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(h1('Criticità e azioni consigliate'));
  const cs = [...crit].sort((a, b) => HS_SEZ.findIndex(S => S.k === a.sez) - HS_SEZ.findIndex(S => S.k === b.sez) || (+a.gravita || 9) - (+b.gravita || 9));
  if (!cs.length) body.push(p(txt('Alla data del sopralluogo non sono state rilevate criticità.', { italics: true })));
  else {
    const cw = [800, 2600, 2100, 1000, W - 6500];
    body.push(table(cw, [new TableRow({ tableHeader: true, children: ['Cod.', 'Situazione rilevata', 'Rischio evidenziato', 'Gravità', 'Azioni consigliate / misure di prevenzione'].map((t, j) => hcell(t, cw[j])) }),
      ...cs.map(c => {
        const bc = (r.base && r.base.crit && r.base.crit[c.id]) || null, g = hsPrio(c.gravita);
        const B2 = f => bc ? bc[f] : '';
        const newRow = imp && !bc;
        return new TableRow({ cantSplit: true, children: [
          cell(p(txt(c.rif || (hsSezOf(c.sez) || {}).t || '-', { bold: true, size: 18, color: newRow ? RED : undefined }), { after: 0 }), cw[0]),
          cell(lines(c.situazione, B2('situazione'), { size: 18 }), cw[1]),
          cell(lines(c.rischio, B2('rischio'), { size: 18 }), cw[2]),
          cell(p(txt(g ? g.g : '-', { bold: true, size: 18, color: g ? g.w : undefined }), { after: 0, align: AlignmentType.CENTER }), cw[3]),
          cell(lines(c.azione, B2('azione'), { size: 18 }), cw[4])] });
      })]));
  }
  body.push(h3('Legenda gravità'));
  body.push(kv(HS_PRIO.map(x => [`${x.v} – ${x.g}`, x.d.replace(/^R/, 'La situazione rilevata r') + '.'])));

  // riepilogo
  body.push(h1('Riepilogo schede'));
  {
    const cw = [500, 2900, 1500, 1200, 1000, 1300, W - 8400];
    body.push(table(cw, [new TableRow({ tableHeader: true, children: ['N.', 'Scheda', 'Natura del rischio', 'Costo indicativo', 'Priorità', 'Competenza', 'Termine'].map((t, j) => hcell(t, cw[j])) }),
      ...HS_SEZ.map((S, i) => {
        const d = hsD(r, S.k), pr = hsPrio(d.prio), vuoto = d.na || (!d.prio && !d.natura);
        const comp = [d.propr && 'Proprietà', d.cond && 'Conduttore'].filter(Boolean).join('/');
        return new TableRow({ cantSplit: true, children: [String(i + 1), S.t + (d.na ? ' (N.A.)' : ''), vuoto ? '-' : d.natura || '-', vuoto ? '-' : d.costo || '-', vuoto ? '-' : pr ? String(pr.v) : '-', vuoto ? '-' : comp || '-', vuoto ? '-' : d.termine || '-']
          .map((t, j) => cell(p(txt(t, { size: 18, bold: j === 4 && !!pr && !vuoto, color: j === 4 && pr && !vuoto ? pr.w : undefined }), { after: 0, align: j === 1 ? undefined : AlignmentType.CENTER }), cw[j])) });
      })]));
  }

  // foto delle criticità
  const cph = [];
  cs.forEach(c => (c.foto || []).forEach((id, k) => cph.push({ id, cap: `${c.rif || (hsSezOf(c.sez) || {}).t || ''} – ${(c.situazione || '').slice(0, 70)}${(c.situazione || '').length > 70 ? '…' : ''}` })));
  if (cph.length) { body.push(h1('Documentazione fotografica delle criticità')); body.push(...await photoGrid(cph)); }

  body.push(p(txt(''), { before: 400 }));
  body.push(kv([['Redatto da', r.tecnico || ''], ['Verificato da', s.verificatoDa || '']].filter(([, v]) => v)));

  const doc = new Document({
    creator: r.tecnico || 'Nembo', title: 'Sopralluogo H&S ' + (r.commessa || r.codice),
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [txt(`${r.codice} · Sopralluogo H&S · pag. `, { size: 16, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '7F7F7F', font: 'Calibri' })] })] }) },
      children: body,
    }],
  });
  return Packer.toBlob(doc);
}
