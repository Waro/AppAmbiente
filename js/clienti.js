/* Anagrafica clienti: dati, referenti e preferenze (foglio firme, invio email).
   I clienti sono record di tipo 'cli': si salvano sul dispositivo, nei backup e nella sincronizzazione come le attività. */

let _clienti = [];
const setClienti = l => { _clienti = l || []; };
const cliNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const clienteDi = nome => { const n = cliNorm(nome); return n ? _clienti.find(c => cliNorm(c.nome) === n) || null : null; };
const nomiClienti = records => [...new Set([..._clienti.map(c => c.nome), ...records.filter(x => x.cliente).map(x => x.cliente)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
function newCliente(x = {}) {
  return { id: uid('cli'), type: 'cli', nome: '', referente: '', telefono: '', email: '', sede: '', note: '',
    firme: false, firmeModello: '', mail: false, mailA: '', mailCc: '', createdAt: Date.now(), updatedAt: Date.now(), ...x };
}
const clienteIsEmpty = c => !c.nome && !c.referente && !c.telefono && !c.email && !c.sede && !c.note;

// email al cliente con i dati dell'attività (gli allegati si aggiungono nell'app di posta)
function mailCliente(r, s) {
  const c = clienteDi(r.cliente) || {};
  const to = c.mailA || c.email || '';
  const firma = `${s.tecnicoNome || ''} ${s.tecnicoCognome || ''}`.trim();
  const att = typeof TIPO_NOME === 'function' ? TIPO_NOME(r) : '';
  const subj = [r.commessa && 'Commessa ' + r.commessa, att, placeLabel(r)].filter(Boolean).join(' · ');
  const body = `Buongiorno${c.referente ? ' ' + c.referente : ''},\n\ninvio in allegato la documentazione relativa all'attività "${att}"${placeDoc(r) ? ' presso ' + placeDoc(r) : ''}${r.data ? ' del ' + fmtD(r.data) : ''}.\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti\n${firma}`;
  location.href = `mailto:${encodeURIComponent(to)}?${c.mailCc ? 'cc=' + encodeURIComponent(c.mailCc) + '&' : ''}subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
}
function MailCliente({ r, settings }) {
  const c = clienteDi(r.cliente);
  if (!c || !c.mail || !(c.mailA || c.email)) return null;
  return html`<button class="btn outline block" onClick=${() => mailCliente(r, settings)}><${Icon} n="share" s=${18} /> Email a ${c.nome}</button>`;
}

/* ---------------- elenco ---------------- */
function ClientiList({ records, clienti, open, activeId, acts, onImport }) {
  const [q, setQ] = useState('');
  const n = cliNorm(q);
  const list = clienti.filter(c => !n || cliNorm([c.nome, c.referente, c.sede, c.email].join(' ')).includes(n)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'));
  const att = c => records.filter(r => cliNorm(r.cliente) === cliNorm(c.nome)).length;
  const daAttivita = [...new Set(records.map(r => (r.cliente || '').trim()).filter(Boolean))].filter(x => !clienteDi(x));
  return html`<div class="content">
    <${LargeTitle} top eye="Strumenti" title="Clienti" sub=${`${clienti.length} ${clienti.length === 1 ? 'cliente' : 'clienti'}`} acts=${acts} />
    ${clienti.length > 4 && html`<div class="cerca-box"><${Icon} n="search" s=${19} /><input class="inp" type="search" value=${q} placeholder="Cerca un cliente" onInput=${e => setQ(e.target.value)} aria-label="Cerca un cliente" /></div>`}
    ${daAttivita.length > 0 && html`<button class="notice" style="width:100%;text-align:left;border:0;margin:0 0 12px" onClick=${() => onImport(daAttivita)}>
      ${daAttivita.length === 1 ? 'Un cliente delle attività non è' : daAttivita.length + ' clienti delle attività non sono'} in anagrafica: tocca per aggiungerli.</button>`}
    ${!clienti.length && html`<div class="empty"><b>Nessun cliente</b>Tocca + per aggiungerne uno. Qui salvi referenti e preferenze: foglio firme già pronto, email per l'invio dei documenti.</div>`}
    <div class="list">${list.map(c => { const k = att(c); return html`<button class=${'rcard' + (activeId === c.id ? ' on' : '')} key=${c.id} onClick=${() => open(c.id)}>
      <div class="r1"><span class="ttl" style="margin:0;font-size:var(--fs-lg)">${c.nome || 'Cliente senza nome'}</span><span class="dt">${k} ${k === 1 ? 'attività' : 'attività'}</span></div>
      ${(c.referente || c.sede) && html`<div class="sum">${[c.referente, c.sede].filter(Boolean).join(' · ')}</div>`}
      ${(c.firme || c.mail) && html`<div class="sum" style="color:var(--blue)">${[c.firme && 'Foglio firme', c.mail && 'Invio email'].filter(Boolean).join(' · ')}</div>`}
    </button>`; })}</div>
  </div>`;
}

/* ---------------- scheda ---------------- */
function ClienteForm({ rec: initial, records, settings, onSave, onDelete, embedded, onClose, openRec }) {
  const [c, up, saved] = useAutosave(initial, onSave);
  const mods = firmeModelli(settings);
  const att = records.filter(r => r.type !== 'cli' && cliNorm(r.cliente) === cliNorm(c.nome) && c.nome).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const doppio = c.nome && _clienti.some(x => x.id !== c.id && cliNorm(x.nome) === cliNorm(c.nome));
  return html`<div class="content form">
    <${DetailHead} eye="Cliente" title=${c.nome || 'Nuovo cliente'} sub=${[c.referente, c.sede].filter(Boolean).join(' · ')} saved=${saved} onClose=${embedded ? onClose : null} />
    <div class="card"><div class="grid2">
      <${Inp} cls="full" label="Ragione sociale" req value=${c.nome} set=${v => up({ nome: v })} placeholder="Come la scrivi nelle attività" />
      <${Inp} label="Referente" value=${c.referente} set=${v => up({ referente: v })} />
      <${Inp} label="Telefono" type="tel" value=${c.telefono} set=${v => up({ telefono: v })} />
      <${Inp} cls="full" label="Email" type="email" value=${c.email} set=${v => up({ email: v })} />
      <${InpGrow} cls="full" label="Sede" value=${c.sede} set=${v => up({ sede: v })} placeholder="Indirizzo della sede" />
    </div>${doppio && html`<div class="notice err" style="margin:10px 0 0">C'è già un cliente con questo nome.</div>`}</div>

    <div class="sec-h"><h3>Foglio firme</h3></div>
    <div class="card tight">
      <label class="fg-sw"><span>Prepara il foglio firme nelle nuove attività</span><${Toggle} on=${!!c.firme} label="Foglio firme nelle nuove attività" set=${v => up({ firme: v })} /></label>
      ${c.firme && html`<label class="fld" style="margin-top:10px"><span>Modello</span><select value=${c.firmeModello || ''} onChange=${e => up({ firmeModello: e.target.value })}>
        <option value="">In base all'attività</option>${mods.map(m => html`<option value=${m.id}>${m.titolo}</option>`)}</select></label>`}
      <p class="hint-p" style="margin:8px 0 0">Vale per DDA, Mappature, RA e Monitoraggi aria. Nel foglio ci sono i dati dell'attività e l'elenco dei campioni prelevati o dei manufatti valutati.</p>
    </div>

    <div class="sec-h"><h3>Invio email</h3></div>
    <div class="card tight">
      <label class="fg-sw"><span>Invia i documenti per email</span><${Toggle} on=${!!c.mail} label="Invio per email" set=${v => up({ mail: v })} /></label>
      ${c.mail && html`<div class="grid2" style="margin-top:10px">
        <${Inp} cls="full" label="Destinatari" value=${c.mailA} set=${v => up({ mailA: v })} placeholder=${c.email || 'indirizzi separati da virgola'} />
        <${Inp} cls="full" label="In copia" value=${c.mailCc} set=${v => up({ mailCc: v })} placeholder="Facoltativo" />
      </div>
      <p class="hint-p" style="margin:8px 0 0">Nelle attività del cliente, in Anagrafica, compare il tasto per preparare l'email.</p>`}
    </div>

    <div class="sec-h"><h3>Note</h3></div>
    <div class="card"><textarea class="inp" rows="3" value=${c.note} onInput=${e => up({ note: e.target.value })} aria-label="Note" placeholder="Accessi, orari, richieste particolari…"></textarea></div>

    <div class="sec-h"><h3>Attività · ${att.length}</h3></div>
    ${att.length ? html`<div class="list">${att.slice(0, 30).map(r => html`<button class="rcard" key=${r.id} onClick=${() => openRec(r)}>
      <div class="r1"><span class="id">${r.codice || TIPO_NOME(r)}</span><span class="t" style="flex:1;font-size:var(--fs-sm);color:var(--text2)">${TIPO_NOME(r)}</span><span class="dt">${fmtD(r.data)}</span></div>
      ${(r.commessa || placeLabel(r)) && html`<div class="sum">${[r.commessa, placeLabel(r)].filter(Boolean).join(' · ')}</div>`}</button>`)}</div>`
      : html`<div class="card"><div class="empty" style="padding:14px">Nessuna attività con questo nome cliente.</div></div>`}

    <div class="stack" style="margin-top:16px">
      <button class="btn danger block" onClick=${() => onDelete(c)}><${Icon} n="trash" s=${18} /> Elimina cliente</button>
    </div>
  </div>`;
}
