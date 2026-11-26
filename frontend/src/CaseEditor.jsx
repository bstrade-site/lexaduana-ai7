import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowUpRight, BookOpen, CalendarClock, Check, CircleAlert, FileCheck2, FileText, Files, Scale, Sparkles } from 'lucide-react';
import { api, readAnalysis } from './api.js';

const tabs = [[Files, 'Ficha del expediente'], [Scale, 'Dictamen'], [FileCheck2, 'Respuesta Word']];
const letterFields = new Set(['subject', 'signer', 'capacity', 'contact', 'body', 'attachments']);
const editableFields = [...letterFields, 'responded', 'filed', 'radicado', 'outcome', 'reviewed'];

function Label({title, hint, children}) {
  return <label>{title}{children}{hint && <small>{hint}</small>}</label>;
}

function Section({icon: Icon, title, subtitle, children}) {
  return <section className="panel editor-section"><div className="editor-heading"><span className="metric-icon"><Icon size={20}/></span><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>{children}</section>;
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'Por confirmar';
}

function Datum({title, value, evidence}) {
  return <div><dt>{title}</dt><dd>{value || 'No identificado'}{evidence && <small>{evidence}</small>}</dd></div>;
}

function Roadmap({roadmap, citations}) {
  const references = new Map(citations.map((source) => [source.id, source]));
  return <Section icon={CalendarClock} title="Hoja de ruta de defensa" subtitle="Orden de actuación recomendado, sujeto a revisión jurídica. No forma parte del escrito para la DIAN.">
    <p className="subtle-box"><strong>Recomendación prioritaria:</strong> {roadmap.recommendation}</p>
    <ol className="roadmap">{roadmap.steps.map((step, index) => <li key={index}>
      <p className="roadmap-kicker">Paso {String(index + 1).padStart(2, '0')} · {step.timing}</p>
      <h3>{step.title}</h3>
      <p>{step.action}</p>
      <dl><div><dt>Responsable</dt><dd>{step.owner}</dd></div><div><dt>Entregable o constancia</dt><dd>{step.deliverable}</dd></div>{step.contingency && <div><dt>Si surge un obstáculo</dt><dd>{step.contingency}</dd></div>}</dl>
      <div className="roadmap-sources">{[...new Set(step.articleIds)].map((id) => {
        const source = references.get(id);
        return source && <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.name} · art. {source.article} <ArrowUpRight size={13}/></a>;
      })}</div>
    </li>)}</ol>
  </Section>;
}

export function CaseEditor({entry, updated, back}) {
  const [tab, setTab] = useState(0);
  const [record, setRecord] = useState(entry.record);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState('');
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const autoStarted = useRef(false);
  const analysis = entry.analysis;
  const facts = analysis?.facts;
  const dirty = editableFields.some((key) => record[key] !== entry.record[key]);
  const locked = saving || Boolean(progress);

  function assign(patch, reset = true) {
    setRecord((current) => ({ ...current, ...patch, ...(reset && Object.keys(patch).some((key) => letterFields.has(key) && patch[key] !== current[key]) ? { reviewed: false } : {}) }));
    setNotice('');
  }
  function field(key, title, props = {}) {
    const { hint, ...rest } = props;
    return <Label title={title} hint={hint}><input {...rest} disabled={locked} value={record[key] ?? ''} onChange={(event) => assign({ [key]: event.target.value })}/></Label>;
  }
  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const next = await api(`/api/cases/${entry.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: entry.version, record: Object.fromEntries(editableFields.map((key) => [key, record[key]])) }),
      });
      setRecord(next.record);
      updated(next); setNotice('Cambios guardados.');
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  const run = useCallback(async () => {
    setError(''); setNotice(''); setProgress('Preparando el análisis…');
    try {
      const next = await readAnalysis(entry.id, setProgress);
      setRecord(next.record); updated(next);
      if (next.analysisWarning) setError(next.analysisWarning);
      else setNotice('Ficha actualizada y dictamen generado. Revisa la hoja de ruta, las fuentes y los plazos antes de actuar.');
    }
    catch (failure) { setError(failure.message); }
    finally { setProgress(''); setConsent(false); }
  }, [entry.id, updated]);
  useEffect(() => {
    if (!entry.analyzeOnOpen || autoStarted.current) return;
    autoStarted.current = true;
    void run();
  }, [entry.analyzeOnOpen, run]);
  function switchTab(index) { setTab(index); setError(''); setNotice(''); }

  return <div className="case-editor">
    <button className="text-button back" onClick={back} disabled={locked}><ArrowLeft size={16}/> Volver a expedientes</button>
    <div className="page-head editor-page-head"><div><div className="eyebrow"><i/> EXPEDIENTE ADUANERO</div><h1>{entry.client || 'Cliente por identificar'}</h1><p>{entry.record.type || 'Acto administrativo DIAN'}{entry.record.act ? ` · ${entry.record.act}` : ''}</p></div><button className="button primary" disabled={locked || !dirty} onClick={save}><Check size={18}/> {saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    <nav aria-label="Secciones del expediente" className="editor-tabs">{tabs.map(([Icon, title], index) => <button key={title} className={tab === index ? 'active' : ''} aria-current={tab === index ? 'page' : undefined} disabled={locked} onClick={() => switchTab(index)}><Icon size={17}/> {title}</button>)}</nav>
    {error && <p className="alert" role="alert">{error}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    {dirty && !notice && <p className="unsaved" role="status">Tienes cambios sin guardar.</p>}
    {progress && <p className="analysis-progress" role="status"><i/>{progress}</p>}
    {tab === 0 && <>
      <Section icon={Files} title="Identificación del acto" subtitle="Ficha automática · Datos identificados en el PDF principal.">
        {!analysis && !progress && <p className="subtle-box">Si falta información, puedes ejecutar o reintentar el análisis desde <button className="text-button" onClick={() => switchTab(1)}>Dictamen</button>.</p>}
        <dl className="facts ficha-facts">
          <Datum title="Cliente" value={entry.client} evidence={record.clientEvidence || (entry.client ? 'Nombre registrado previamente; sin constancia extraída.' : '')}/>
          <Datum title="Número del acto" value={record.act}/>
          <Datum title="Tipo de acto" value={record.type}/>
          <Datum title="Dirección seccional o dependencia" value={record.office}/>
        </dl>
        <div className="file-links">{entry.files.map((name, index) => <a href={`/api/cases/${entry.id}/pdf/${index}`} download key={index}><FileText size={19}/><span><small>{index === 0 ? 'ACTO PRINCIPAL' : `SOPORTE ${index}`}</small><strong>{name}</strong></span><ArrowDownToLine size={17}/></a>)}</div>
      </Section>
      <Section icon={CalendarClock} title="Notificación y términos" subtitle="La fecha base se toma del evento acreditado que da inicio al término; no siempre coincide con la notificación.">
        <dl className="facts ficha-facts">
          <Datum title="Fecha de notificación" value={record.notificationDate && formatDate(record.notificationDate)} evidence={record.notificationEvidence || facts?.notificationEvidence}/>
          <Datum title="Modalidad" value={record.notificationMethod}/>
        </dl>
        <p className="muted small">Los vencimientos son estimados: se cuentan días hábiles posteriores a la fecha base. Verifica la norma, los cierres y las suspensiones antes de actuar.</p>
        <div className="term-grid">{[['response', 'Término para responder'], ['authority', 'Término de la DIAN para decidir']].map(([prefix, title]) => <div className="term-box stack" key={prefix}>
          <h3>{title}</h3>
          <dl className="facts term-facts">
            <Datum title="Fecha base (no se cuenta)" value={record[`${prefix}Base`] && formatDate(record[`${prefix}Base`])} evidence={record[`${prefix}BaseEvidence`]}/>
            <Datum title="Plazo en días hábiles" value={record[`${prefix}Days`]} evidence={record[`${prefix}Rule`]}/>
          </dl>
          <div className="term-result"><CalendarClock size={17}/><span>Vencimiento estimado <strong>{formatDate(entry.deadlines[prefix])}</strong></span></div>
        </div>)}</div>
        {record.exclusions.length > 0 && <p className="muted small">Fechas inhábiles adicionales registradas: {record.exclusions.join(', ')}.</p>}
      </Section>
      <Section icon={Scale} title="Valor declarado de la mercancía" subtitle="Solo se muestra si el PDF lo identifica expresamente como valor declarado, no como avalúo o sanción.">
        <dl className="facts term-facts"><Datum title="Importe declarado" value={record.declared && record.currency && `${record.declared} ${record.currency}`} evidence={record.declaredEvidence}/></dl>
      </Section>
      <Section icon={FileCheck2} title="Respuesta, radicación y resolución" subtitle="Registra las fechas reales y la decisión final; exportar el Word no equivale a radicar.">
        <div className="fields">
          {field('responded', 'Fecha de respuesta', { type: 'date' })}{field('filed', 'Fecha de radicación', { type: 'date' })}
          {field('radicado', 'Número de radicado', { maxLength: 120, placeholder: 'Número de confirmación DIAN' })}
        </div>
        <Label title="Resolución o resultado del expediente"><textarea rows="4" value={record.outcome} disabled={locked} maxLength={10000} onChange={(event) => assign({ outcome: event.target.value })} placeholder="Decisión, fecha y referencias del resultado"/></Label>
      </Section>
    </>}
    {tab === 1 && <>
      <Section icon={Sparkles} title={analysis ? 'Análisis documental y normativo' : 'Generar dictamen'} subtitle="La IA contrasta el acto con fuentes oficiales. El resultado necesita revisión jurídica.">
        {!analysis && <p className="muted">Se identifican los hechos, las pruebas disponibles, el valor declarado y los términos que podrían aplicar según el tipo de acto y su régimen.</p>}
        <label className="check-line"><input type="checkbox" checked={consent} disabled={locked} onChange={(event) => setConsent(event.target.checked)}/> Confirmo que el equipo está autorizado a procesar estos PDF con el proveedor de IA.</label>
        <button className="button primary" onClick={run} disabled={locked || !consent || dirty}><Sparkles size={17}/> {analysis ? 'Volver a analizar' : 'Analizar PDF'}</button>
      </Section>
      {analysis && <>
        <Section icon={FileText} title="Hallazgos del acto" subtitle="Contrasta los hechos extraídos con el PDF original.">
          <dl className="facts"><div><dt>Acto</dt><dd>{facts.type}{facts.act ? ` · ${facts.act}` : ''}</dd></div><div><dt>Notificación detectada</dt><dd>{facts.notificationDate || 'Sin fecha acreditada'}{facts.notificationMethod ? ` · ${facts.notificationMethod}` : ''}<small>{facts.notificationEvidence}</small></dd></div><div><dt>Valor declarado</dt><dd>{facts.declared && facts.currency ? `${facts.declared} ${facts.currency}` : 'No identificado'}<small>{facts.declaredEvidence}</small></dd></div></dl>
          <p className="prose">{facts.facts}</p>{facts.issues && <p className="subtle-box">{facts.issues}</p>}
        </Section>
        <Section icon={Scale} title="Dictamen para revisión" subtitle={`Fuentes consultadas el ${formatDate(analysis.checkedAt)}.`}>
          {analysis.unavailable.length > 0 && <p className="alert">No se pudieron consultar: {analysis.unavailable.join(', ')}.</p>}
          <p className="prose">{analysis.opinion}</p>
          {analysis.missing.length > 0 && <><h3>Verificaciones pendientes</h3><ul className="checklist">{analysis.missing.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
          <div className="term-grid">{[['Término del interesado', analysis.clientTerm], ['Término de la DIAN', analysis.authorityTerm]].map(([title, term]) => <div className="term-box" key={title}><h3>{title}</h3><p><strong>{term.days !== null ? `${term.days} ${term.unit}` : 'Pendiente de verificación'}</strong></p><p>{term.event}</p><p className="muted">{term.reasoning}</p></div>)}</div>
          <h3>Fuentes oficiales citadas</h3><div className="source-list">{analysis.citations.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer"><BookOpen size={18}/><span><strong>{source.name} · art. {source.article}</strong><small>{source.heading}</small></span><ArrowUpRight size={16}/></a>)}</div>
        </Section>
        {analysis.roadmap ? <Roadmap roadmap={analysis.roadmap} citations={analysis.citations}/> : <Section icon={CalendarClock} title="Hoja de ruta de defensa"><p className="muted">Este dictamen es anterior a la hoja de ruta. Vuelve a analizar el PDF para generarla y actualizar la ficha.</p></Section>}
      </>}
    </>}
    {tab === 2 && <Section icon={FileCheck2} title="Escrito dirigido a la DIAN" subtitle="Completa el encabezado y la firma. El Word contiene solo la respuesta formal, no el dictamen interno.">
      <div className="subtle-box instruction"><CircleAlert size={18}/><span>Revisa hechos, citas, anexos y canal de presentación. La aplicación no envía correos ni radica documentos.</span></div>
      {analysis && <button className="button outline" disabled={locked || (record.body === analysis.letter && record.subject === analysis.subject)} onClick={() => { assign({ body: analysis.letter.slice(0, 30000), subject: analysis.subject.slice(0, 250) }); setNotice('Propuesta copiada al editor.'); }}><Sparkles size={16}/> {record.body ? 'Reemplazar cuerpo con la propuesta' : 'Usar propuesta del dictamen'}</button>}
      <dl className="facts ficha-facts"><Datum title="Número del acto" value={record.act}/><Datum title="Dependencia destinataria" value={record.office}/></dl>
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

