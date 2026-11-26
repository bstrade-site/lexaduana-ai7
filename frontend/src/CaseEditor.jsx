import { useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, BookOpen, CalendarClock, Check, CircleAlert, FileCheck2, FileText, Files, Scale, Sparkles } from 'lucide-react';
import { businessDeadline, validDate } from '../netlify/server/calendar.mjs';

const tabs = [[Files, 'Ficha del expediente'], [Scale, 'Dictamen'], [FileCheck2, 'Respuesta Word']];
const letterFields = new Set(['act', 'office', 'subject', 'signer', 'capacity', 'contact', 'body', 'attachments']);

export async function api(path, options = {}) {
  const response = await fetch(path, { ...options, credentials: 'omit' });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'No fue posible completar la solicitud.');
  }
  return response.json();
}

async function readAnalysis(id, update) {
  const response = await fetch(`/api/cases/${id}/analysis`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmProcessing: true }) });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'No se pudo iniciar el análisis.');
  }
  if (!response.body || !response.headers.get('content-type')?.startsWith('application/x-ndjson')) throw new Error('El servicio de análisis no está disponible.');
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const events = buffer.split('\n');
      buffer = events.pop();
      for (const line of events) {
        if (!line) continue;
        const event = JSON.parse(line);
        if (event.error) throw new Error(event.error);
        if (event.progress) update(event.progress);
        if (event.result) return event.result;
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  throw new Error('Se interrumpió la conexión. Vuelve a abrir el expediente para comprobar el estado.');
}

function Label({title, hint, children}) {
  return <label>{title}{children}{hint && <small>{hint}</small>}</label>;
}

function Section({icon: Icon, title, subtitle, children}) {
  return <section className="panel editor-section"><div className="editor-heading"><span className="metric-icon"><Icon size={20}/></span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>{children}</section>;
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Por confirmar';
}

export function CaseEditor({entry, updated, back}) {
  const [tab, setTab] = useState(0);
  const [record, setRecord] = useState(entry.record);
  const [client, setClient] = useState(entry.client);
  const [excluded, setExcluded] = useState(entry.record.exclusions.join(', '));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const analysis = entry.analysis;
  const facts = analysis?.facts;
  const exclusions = excluded.split(',').map((item) => item.trim()).filter(Boolean);
  const dirty = client !== entry.client || Object.keys(record).some((key) => key !== 'exclusions' && record[key] !== entry.record[key]) || exclusions.join(',') !== entry.record.exclusions.join(',');
  const locked = saving || Boolean(progress);
  const deadline = (prefix) => record[`${prefix}Rule`].trim() ? businessDeadline(record[`${prefix}Base`], record[`${prefix}Days`], exclusions) : null;

  function assign(patch, reset = true) {
    setRecord((current) => ({ ...current, ...patch, ...(reset && Object.keys(patch).some((key) => letterFields.has(key) && patch[key] !== current[key]) ? { reviewed: false } : {}) }));
    setNotice('');
  }
  function field(key, title, props = {}) {
    const { hint, ...rest } = props;
    return <Label title={title} hint={hint}><input {...rest} disabled={locked} value={record[key] ?? ''} onChange={(event) => assign({ [key]: rest.type === 'number' ? event.target.value === '' ? null : Number(event.target.value) : event.target.value })}/></Label>;
  }
  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const next = await api(`/api/cases/${entry.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: entry.version, client, record: { ...record, exclusions } }),
      });
      setRecord(next.record); setClient(next.client); setExcluded(next.record.exclusions.join(', '));
      updated(next); setNotice('Cambios guardados.');
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  async function run() {
    setError(''); setNotice(''); setProgress('Preparando el análisis…');
    try { updated(await readAnalysis(entry.id, setProgress)); setNotice('Dictamen generado. Revisa las fuentes y el escrito antes de usarlos.'); }
    catch (failure) { setError(failure.message); }
    finally { setProgress(''); setConsent(false); }
  }
  function applyFacts() {
    const patch = {};
    if (facts.act) patch.act = facts.act.slice(0, 120);
    if (facts.type) patch.type = facts.type.slice(0, 150);
    if (facts.office) patch.office = facts.office.slice(0, 240);
    if (!record.notificationDate && validDate(facts.notificationDate) && facts.notificationEvidence.trim()) patch.notificationDate = facts.notificationDate;
    if (!record.notificationMethod && facts.notificationMethod) patch.notificationMethod = facts.notificationMethod.slice(0, 240);
    if (/^\d{1,17}(\.\d{1,4})?$/.test(facts.declared) && /^[A-Z]{3}$/.test(facts.currency)) {
      patch.declared = facts.declared; patch.currency = facts.currency; patch.declaredEvidence = facts.declaredEvidence.slice(0, 500);
    }
    assign(patch); setTab(0); setNotice('Datos propuestos copiados. Verifícalos con el acto antes de guardar.');
  }
  function applyTerm(prefix, term) {
    const reference = analysis.citations.find(({id}) => id === term.articleId);
    if (!reference || !Number.isInteger(term.days) || term.days < 1 || term.days > 365 || !/h[áa]bil/i.test(term.unit)) return;
    assign({ [`${prefix}Days`]: term.days, [`${prefix}Rule`]: `${reference.name}, art. ${reference.article}. ${term.event}`.slice(0, 500) });
    setTab(0); setNotice('Término copiado. Confirma la norma y registra la fecha base del cómputo.');
  }
  function switchTab(index) { setTab(index); setError(''); setNotice(''); }

  return <div className="case-editor">
    <button className="text-button back" onClick={back} disabled={locked}><ArrowLeft size={16}/> Volver a expedientes</button>
    <div className="page-head editor-page-head"><div><div className="eyebrow"><i/> EXPEDIENTE ADUANERO</div><h1>{entry.client}</h1><p>{entry.record.type || 'Acto administrativo DIAN'}{entry.record.act ? ` · ${entry.record.act}` : ''}</p></div><button className="button primary" disabled={locked || !dirty} onClick={save}><Check size={18}/> {saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    <nav aria-label="Secciones del expediente" className="editor-tabs">{tabs.map(([Icon, title], index) => <button key={title} className={tab === index ? 'active' : ''} aria-current={tab === index ? 'page' : undefined} disabled={locked} onClick={() => switchTab(index)}><Icon size={17}/> {title}</button>)}</nav>
    {error && <p className="alert" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {dirty && !notice && <p className="unsaved" role="status">Tienes cambios sin guardar.</p>}
    {tab === 0 && <>
      <Section icon={Files} title="Identificación del acto" subtitle="Datos confirmados por el equipo y originales archivados.">
        <div className="fields">
          <Label title="Cliente"><input value={client} maxLength={180} onChange={(event) => { setClient(event.target.value); assign({ reviewed: false }); }}/></Label>
          {field('act', 'Número del acto', { maxLength: 120, placeholder: 'Número o referencia DIAN' })}
          {field('type', 'Tipo de acto', { maxLength: 150, placeholder: 'Ej. Acta de aprehensión' })}
          {field('office', 'Dirección seccional o dependencia', { maxLength: 240 })}
        </div>
        <div className="file-links">{entry.files.map((name, index) => <a href={`/api/cases/${entry.id}/pdf/${index}`} download key={index}><FileText size={19}/><span><small>{index === 0 ? 'ACTO PRINCIPAL' : `SOPORTE ${index}`}</small><strong>{name}</strong></span><ArrowDownToLine size={17}/></a>)}</div>
      </Section>
      <Section icon={CalendarClock} title="Notificación y términos" subtitle="Se cuentan los días hábiles posteriores a la fecha base: lunes a viernes, sin festivos nacionales ni exclusiones registradas.">
        {facts && <p className="subtle-box"><strong>Constancia detectada:</strong> {facts.notificationDate || 'Fecha no identificada'}{facts.notificationEvidence ? ` · ${facts.notificationEvidence}` : ''}.</p>}
        <div className="fields">
          {field('notificationDate', 'Fecha de notificación confirmada', { type: 'date' })}
          {field('notificationMethod', 'Modalidad y constancia', { maxLength: 240, placeholder: 'Ej. Electrónica, constancia de entrega' })}
        </div>
        <p className="muted small">La fecha base puede diferir de la fecha de notificación. Verifica el evento inicial correspondiente, las suspensiones y si el plazo se expresa en días hábiles.</p>
        <div className="term-grid">{[['response', 'Término para responder'], ['authority', 'Término de la DIAN para decidir']].map(([prefix, title]) => <div className="term-box stack" key={prefix}>
          <h3>{title}</h3>
          {field(`${prefix}Base`, 'Fecha base (no se cuenta)', { type: 'date' })}
          {field(`${prefix}Days`, 'Días hábiles', { type: 'number', min: 1, max: 365, step: 1 })}
          {field(`${prefix}Rule`, 'Norma y evento inicial verificados', { maxLength: 500 })}
          <div className="term-result"><CalendarClock size={17}/><span>Vencimiento <strong>{formatDate(deadline(prefix))}</strong></span></div>
        </div>)}</div>
        <Label title="Cierres o fechas inhábiles adicionales" hint="Fechas completas separadas por comas; verifica las suspensiones aplicables."><input value={excluded} onChange={(event) => setExcluded(event.target.value)} placeholder="AAAA-MM-DD, AAAA-MM-DD" maxLength={4300}/></Label>
      </Section>
      <Section icon={Scale} title="Valor declarado de la mercancía" subtitle="Registra el importe así identificado en el acto o sus soportes; no lo sustituyas por un avalúo o una sanción.">
        <div className="fields">{field('declared', 'Importe declarado', { inputMode: 'decimal', placeholder: 'Sin separadores de miles', maxLength: 24 })}
          <Label title="Moneda"><input value={record.currency} maxLength={3} placeholder="COP, USD…" onChange={(event) => assign({ currency: event.target.value.toUpperCase() })}/></Label>
        </div>
        {field('declaredEvidence', 'Documento, página y evidencia', { maxLength: 500 })}
      </Section>
      <Section icon={FileCheck2} title="Respuesta, radicación y resolución" subtitle="Registra las fechas reales y la decisión final; exportar el Word no equivale a radicar.">
        <div className="fields">
          {field('responded', 'Fecha de respuesta', { type: 'date' })}{field('filed', 'Fecha de radicación', { type: 'date' })}
          {field('radicado', 'Número de radicado', { maxLength: 120, placeholder: 'Número de confirmación DIAN' })}
        </div>
        <Label title="Resolución o resultado del expediente"><textarea rows="4" value={record.outcome} maxLength={10000} onChange={(event) => assign({ outcome: event.target.value })} placeholder="Decisión, fecha y referencias del resultado"/></Label>
      </Section>
    </>}
    {tab === 1 && <>
      <Section icon={Sparkles} title={analysis ? 'Análisis documental y normativo' : 'Generar dictamen'} subtitle="La IA contrasta el acto con fuentes oficiales. El resultado necesita revisión jurídica.">
        {!analysis && <p className="muted">Se identifican los hechos, las pruebas disponibles, el valor declarado y los términos que podrían aplicar según el tipo de acto y su régimen.</p>}
        <label className="check-line"><input type="checkbox" checked={consent} disabled={locked} onChange={(event) => setConsent(event.target.checked)}/> Confirmo que el equipo está autorizado a procesar estos PDF con el proveedor de IA.</label>
        <button className="button primary" onClick={run} disabled={locked || !consent || dirty}><Sparkles size={17}/> {analysis ? 'Volver a analizar' : 'Analizar PDF'}</button>
        {progress && <p className="analysis-progress" role="status"><i/>{progress}</p>}
      </Section>
      {analysis && <>
        <Section icon={FileText} title="Hallazgos del acto" subtitle="Verifica los hechos extraídos antes de copiarlos a la ficha.">
          <dl className="facts"><div><dt>Acto</dt><dd>{facts.type}{facts.act ? ` · ${facts.act}` : ''}</dd></div><div><dt>Notificación detectada</dt><dd>{facts.notificationDate || 'Sin fecha acreditada'}{facts.notificationMethod ? ` · ${facts.notificationMethod}` : ''}<small>{facts.notificationEvidence}</small></dd></div><div><dt>Valor declarado</dt><dd>{facts.declared && facts.currency ? `${facts.declared} ${facts.currency}` : 'No identificado'}<small>{facts.declaredEvidence}</small></dd></div></dl>
          <p className="prose">{facts.facts}</p>{facts.issues && <p className="subtle-box">{facts.issues}</p>}
          <button className="button outline" onClick={applyFacts} disabled={locked}>Copiar datos propuestos a la ficha</button>
        </Section>
        <Section icon={Scale} title="Dictamen para revisión" subtitle={`Fuentes consultadas el ${formatDate(analysis.checkedAt)}.`}>
          {analysis.unavailable.length > 0 && <p className="alert">No se pudieron consultar: {analysis.unavailable.join(', ')}.</p>}
          <p className="prose">{analysis.opinion}</p>
          {analysis.missing.length > 0 && <><h3>Verificaciones pendientes</h3><ul className="checklist">{analysis.missing.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
          <div className="term-grid">{[['response', 'Término del interesado', analysis.clientTerm], ['authority', 'Término de la DIAN', analysis.authorityTerm]].map(([prefix, title, term]) => <div className="term-box" key={prefix}><h3>{title}</h3><p><strong>{term.days !== null ? `${term.days} ${term.unit}` : term.unit || 'Pendiente de verificación'}</strong></p><p>{term.event}</p><p className="muted">{term.reasoning}</p>{term.days > 0 && term.days <= 365 && term.articleId && /h[áa]bil/i.test(term.unit) && <button className="text-button" disabled={locked} onClick={() => applyTerm(prefix, term)}>Copiar término a la ficha</button>}</div>)}</div>
          <h3>Fuentes oficiales citadas</h3><div className="source-list">{analysis.citations.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><BookOpen size={18}/><span><strong>{source.name} · art. {source.article}</strong><small>{source.heading}</small></span><ArrowUpRight size={16}/></a>)}</div>
        </Section>
      </>}
    </>}
    {tab === 2 && <Section icon={FileCheck2} title="Escrito dirigido a la DIAN" subtitle="Completa el encabezado y la firma. El Word contiene solo la respuesta formal, no el dictamen interno.">
      <div className="subtle-box instruction"><CircleAlert size={18}/><span>Revisa hechos, citas, anexos y canal de presentación. La aplicación no envía correos ni radica documentos.</span></div>
      {analysis && <button className="button outline" disabled={locked || (record.body === analysis.letter && record.subject === analysis.subject)} onClick={() => { assign({ body: analysis.letter.slice(0, 30000), subject: analysis.subject.slice(0, 250) }); setNotice('Propuesta copiada al editor.'); }}><Sparkles size={16}/> {record.body ? 'Reemplazar cuerpo con la propuesta' : 'Usar propuesta del dictamen'}</button>}
      <div className="fields">{field('act', 'Número del acto', { maxLength: 120 })}{field('office', 'Dependencia destinataria', { maxLength: 240 })}</div>
      {field('subject', 'Asunto', { maxLength: 250 })}
      <Label title="Cuerpo del escrito" hint="Incluye hechos, fundamentos, solicitudes y pruebas. Resuelve todo campo [PENDIENTE] de la propuesta."><textarea rows="15" value={record.body} maxLength={30000} onChange={(event) => assign({ body: event.target.value })}/></Label>
      <div className="fields">{field('signer', 'Nombre del firmante', { maxLength: 180 })}{field('capacity', 'Calidad en la que actúa', { maxLength: 200, placeholder: 'Ej. Representante legal' })}</div>
      {field('contact', 'Datos de contacto para notificaciones', { maxLength: 350 })}
      <Label title="Anexos" hint="Relaciona los anexos que acompañarán el envío."><textarea rows="4" value={record.attachments} maxLength={4000} onChange={(event) => assign({ attachments: event.target.value })}/></Label>
      <label className="check-line"><input type="checkbox" checked={record.reviewed} onChange={(event) => assign({ reviewed: event.target.checked })}/> He revisado la respuesta y sus fundamentos jurídicos. Apruebo la versión para firma.</label>
      {entry.record.reviewed && !dirty ? <a className="button primary" href={`/api/cases/${entry.id}/word`} download><ArrowDownToLine size={17}/> Descargar Word (.docx)</a> : <p className="muted small">Guarda la aprobación para habilitar la descarga.</p>}
    </Section>}
  </div>;
}

