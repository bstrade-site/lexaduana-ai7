import { useEffect, useRef, useState } from 'react';
import { acceptInvite, getUser, handleAuthCallback, login, logout, onAuthChange, requestPasswordRecovery, updateUser } from '@netlify/identity';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CalendarClock, ChevronRight, ChevronDown, CircleHelp, FileCheck2, FileText, FolderClosed, LayoutDashboard, LockKeyhole, LogOut, Plus, Scale, Search, ShieldCheck, UploadCloud, Users, X } from 'lucide-react';
import { CaseEditor, api } from './CaseEditor.jsx';

const official = 'https://normograma.dian.gov.co/dian/compilacion/docs/';
const references = [
  ['Ley 2586 de 2026', 'Régimen sancionatorio y de decomiso aduanero', `${official}ley_2586_2026.htm`],
  ['Decreto 1165 de 2019', 'Régimen de aduanas', `${official}decreto_1165_2019.htm`],
  ['Resolución DIAN 46 de 2019', 'Reglamentación del régimen aduanero', `${official}resolucion_dian_0046_2019.htm`],
  ['Decreto Ley 920 de 2023', 'Referencia histórica para revisar la transición', `${official}decreto_0920_2023.htm`],
];
const panels = [
  [LayoutDashboard, 'Resumen'], [FolderClosed, 'Expedientes'], [BookOpen, 'Fuentes normativas'],
];
const metrics = [
  ['all', 'Expedientes', FolderClosed, 'Actos en la plataforma'], ['clients', 'Clientes', Users, 'Con expedientes registrados'],
  ['review', 'En revisión', FileCheck2, 'Dictámenes por revisar'], ['filed', 'Radicados', CalendarClock, 'Con radicado registrado'],
];
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' });
let initialAuth;

function Modal({title, close, children}) {
  const dialog = useRef(null);
  useEffect(() => { if (!dialog.current.open) dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="modal" aria-label={title} onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" onClick={close} aria-label="Cerrar"><X size={20}/></button></div>
    {children}
  </dialog>;
}

function AccessForm({mode, setMode, invite, close, refresh}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const title = { login: 'Acceso al equipo', invite: 'Aceptar invitación', recovery: 'Nueva contraseña', forgot: 'Recuperar contraseña' }[mode];
  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'forgot') {
        await requestPasswordRecovery(data.get('email'));
        setNotice('Si existe una cuenta asociada, recibirás un correo con instrucciones.');
        return;
      }
      if (mode === 'invite') await acceptInvite(invite, data.get('password'));
      else if (mode === 'recovery') await updateUser({ password: data.get('password') });
      else await login(data.get('email'), data.get('password'));
      await refresh(true);
      close();
    } catch (failure) {
      setError(failure.status === 401 ? 'El correo o la contraseña no son válidos.' : failure.status === 403 ? 'La cuenta aún no tiene acceso al equipo.' : 'No se pudo completar el acceso. Verifica los datos o solicita ayuda al administrador.');
    } finally { setBusy(false); }
  }
  return <Modal title={title} close={close}>
    <p className="muted">{mode === 'login' ? 'Ingresa con la cuenta que recibió la invitación de CEXTAC Business Group.' : 'Gestiona el acceso a tu cuenta interna de CEXTAC.'}</p>
    <form className="stack" onSubmit={submit} key={mode}>
      {['login', 'forgot'].includes(mode) && <label>Correo corporativo<input name="email" type="email" placeholder="nombre@empresa.com" autoComplete="email" required/></label>}
      {mode !== 'forgot' && <label>{mode === 'login' ? 'Contraseña' : 'Elige una contraseña'}<input name="password" type="password" minLength={mode === 'login' ? undefined : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required/></label>}
      {error && <p className="alert" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'Verificando…' : mode === 'forgot' ? 'Enviar enlace' : mode === 'login' ? 'Ingresar' : 'Guardar contraseña'} <ArrowRight size={17}/></button>
      {['login', 'forgot'].includes(mode) && <button type="button" className="text-button" onClick={() => { setError(''); setNotice(''); setMode(mode === 'login' ? 'forgot' : 'login'); }}>{mode === 'login' ? 'Olvidé mi contraseña' : 'Volver al inicio de sesión'}</button>}
    </form>
  </Modal>;
}

function Intake({ close, created, clients }) {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!files.length || files.length > 4 || files.some((file) => !/\.pdf$/i.test(file.name))) return setError('Adjunta entre uno y cuatro PDF.');
    if (files.reduce((sum, file) => sum + file.size, 0) > 8 * 1024 * 1024) return setError('El tamaño total no puede superar 8 MB.');
    const form = new FormData(event.currentTarget);
    for (const file of files) form.append('pdf', file);
    setBusy(true);
    try { created(await api('/api/cases', { method: 'POST', body: form })); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <Modal title="Nuevo expediente" close={() => { if (!busy) close(); }}>
    <p className="muted">Registra el cliente y adjunta el acto principal. Puedes incluir hasta tres soportes.</p>
    <form className="stack" onSubmit={submit}>
      <label>Nombre del cliente<input name="client" placeholder="Razón social o nombre completo" list="registered-clients" maxLength={180} minLength={2} required/></label>
      <datalist id="registered-clients">{clients.map((client) => <option key={client} value={client}/>)}</datalist>
      <label className="upload"><UploadCloud size={23}/><strong>Seleccionar archivos PDF</strong><span>Hasta 4 PDF · 8 MB en total</span><input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => setFiles([...event.target.files])}/></label>
      {!!files.length && <ol className="file-preview">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={16}/><span>{index === 0 ? 'Acto principal' : `Soporte ${index}`}: {file.name}</span><button type="button" className="icon-button" aria-label={`Quitar ${file.name}`} onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={15}/></button></li>)}</ol>}
      {error && <p className="alert" role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>{busy ? 'Guardando PDF…' : 'Crear expediente'} <ArrowRight size={17}/></button>
    </form>
  </Modal>;
}

function Status({item}) {
  const [variant, label] = item.filed ? ['done', 'Radicado'] : item.reviewed === 'true' ? ['done', 'Aprobado'] : item.analyzed ? ['review', 'En revisión'] : ['pending', 'Por analizar'];
  return <span className={`status ${variant}`}><i/>{label}</span>;
}

export default function App() {
  const [page, setPage] = useState('Resumen');
  const [modal, setModal] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [invite, setInvite] = useState('');
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [list, setList] = useState(null);
  const [listError, setListError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [openError, setOpenError] = useState('');
  const [opening, setOpening] = useState('');
  const [reload, setReload] = useState(0);

  async function refreshAuth(surface = false) {
    try {
      const user = await getUser();
      setSession(user ? await api('/api/session') : null);
    } catch (failure) {
      setSession(null);
      if (surface) throw failure;
    } finally { setSessionReady(true); }
  }

  useEffect(() => {
    let active = true;
    initialAuth ??= handleAuthCallback();
    initialAuth.then((result) => {
      if (!active) return;
      if (result?.type === 'invite' || result?.type === 'recovery') { setInvite(result.token ?? ''); setAuthMode(result.type); setModal('access'); }
    }).catch(() => { if (active) { setOpenError('El enlace de acceso no es válido o caducó.'); setModal('access'); } })
      .finally(() => { if (active) refreshAuth(); });
    const unsubscribe = onAuthChange((event) => {
      if (event === 'logout' || event === 'LOGOUT') { setSession(null); setSelected(null); setList(null); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const email = session?.email;
  useEffect(() => {
    if (!email) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setListError('');
      try {
        setList(await api(`/api/cases?search=${encodeURIComponent(search)}&offset=${offset}`, { signal: controller.signal }));
      } catch (failure) {
        if (failure.name !== 'AbortError') setListError(failure.message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 140);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [email, search, offset, reload]);

  function access() { setAuthMode('login'); setModal('access'); }
  function create() { if (session) setModal('new'); else access(); }
  function navigate(label) {
    if (label === 'Fuentes normativas') { setModal('sources'); return; }
    if (label === 'Expedientes' && !session) { access(); return; }
    setSelected(null); setPage(label); setSearch(''); setOffset(0); setOpenError('');
  }
  async function openCase(id) {
    setOpening(id); setOpenError('');
    try { setSelected(await api(`/api/cases/${id}`)); setPage('Expedientes'); }
    catch (failure) { setOpenError(failure.message); }
    finally { setOpening(''); }
  }
  async function signOut() {
    try { await logout(); }
    catch { setOpenError('No se pudo cerrar la sesión. Reintenta.'); return; }
    setSession(null); setSelected(null); setList(null); setPage('Resumen'); setSearch(''); setOffset(0);
  }
  function updated(record) { setSelected(record); setReload((value) => value + 1); }

  return <div className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('Resumen')} aria-label="LexAduana, inicio"><span className="brand-icon"><Scale size={23} strokeWidth={1.5}/></span><span><strong>LexAduana<span>.</span></strong><small>CEXTAC BUSINESS GROUP</small></span></button>
      <div className="rail-rule"/>
      <div className="nav-heading">ESPACIO DE TRABAJO</div>
      <nav aria-label="Navegación principal">{panels.map(([Icon, label]) => <button key={label} className={`nav-item ${page === label ? 'current' : ''}`} onClick={() => navigate(label)} aria-current={page === label ? 'page' : undefined}><Icon size={18}/><span>{label}</span>{page === label && <ChevronRight className="nav-arrow" size={14}/>}</button>)}</nav>
      <div className="rail-bottom">
        <button className="nav-item" onClick={() => setModal('help')}><CircleHelp size={17}/><span>Guía de uso</span></button>
        <div className="rail-rule"/>
        <div className="private-mark"><span><ShieldCheck size={17}/></span><div><strong>Entorno privado</strong><small>Operaciones · Colombia</small></div></div>
      </div>
    </aside>
    <main>
      <header className="topbar"><div className="crumb"><span>Espacio de trabajo</span><ChevronRight size={14}/><strong>{page}</strong></div>
        {session ? <div className="session"><span>{session.email}</span><button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={signOut}><LogOut size={18}/></button></div> : <button className="button signin" onClick={access}><LockKeyhole size={15}/> Acceso al equipo <ChevronDown size={14}/></button>}
      </header>
      <div className="content">
        {openError && <div className="alert" role="alert">{openError}</div>}
        {selected && session ? <CaseEditor key={selected.id} entry={selected} updated={updated} back={() => { setSelected(null); setReload((value) => value + 1); }}/> : <>
          <div className="page-head">
            <div><div className="eyebrow"><i/> GESTIÓN ADUANERA · COLOMBIA</div><h1>{page === 'Resumen' ? 'Panel de control' : 'Expedientes'}</h1><p>{page === 'Resumen' ? 'Gestiona actos, plazos y respuestas a la DIAN en un solo lugar.' : 'Consulta los actos registrados y encuentra su historial por cliente.'}</p></div>
            <button className="button primary" onClick={create}><Plus size={19}/> Nuevo expediente</button>
          </div>
          {page === 'Resumen' && <>
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-art" aria-hidden="true"/><div className="hero-copy"><div className="hero-kicker"><span/> CEXTAC BUSINESS GROUP</div><h2 id="hero-title">Defensa aduanera<br/>con <em>criterio jurídico.</em></h2><p>Del acto administrativo a la respuesta formal. Analiza documentos, contrasta la normativa y prepara el escrito para la DIAN.</p><button className="button hero-action" onClick={() => session ? navigate('Expedientes') : access()}>{session ? 'Consultar expedientes' : 'Ingresar al espacio de trabajo'} <ArrowUpRight size={17}/></button></div>
              <span className="hero-index" aria-hidden="true">CO <i/> DIAN</span>
            </section>
            <section aria-label="Indicadores de gestión" className="metrics">{metrics.map(([key, label, Icon, description]) => <div className="metric" key={key}><div className="metric-top"><span className="metric-icon"><Icon size={18}/></span><p>{label}</p></div><strong>{session && list ? list.totals[key] : '—'}</strong><small>{description}</small></div>)}</section>
          </>}
          <section className="panel registry" aria-labelledby="registry-title">
            <div className="section-head"><div><h2 id="registry-title">{page === 'Resumen' ? 'Expedientes recientes' : 'Registro de expedientes'}</h2><p>Actos administrativos, dictámenes y radicados por cliente.</p></div><label className="search"><Search size={17}/><input type="search" aria-label="Buscar por cliente o acto" placeholder="Buscar cliente o acto…" value={search} onChange={(event) => { setSearch(event.target.value); setOffset(0); }} readOnly={!session} onClick={() => { if (!session) access(); }}/></label></div>
            {!session ? <div className="empty"><span><LockKeyhole size={22}/></span><h3>{sessionReady ? 'Expedientes de acceso restringido' : 'Verificando acceso'}</h3><p>Los documentos y datos de clientes solo están disponibles para el equipo autorizado.</p><button className="text-button" onClick={access}>Iniciar sesión <ArrowRight size={16}/></button></div> : listError ? <div className="empty"><p role="alert">{listError}</p><button className="text-button" onClick={() => setReload((value) => value + 1)}>Reintentar</button></div> : !list?.items.length ? <div className="empty"><span><FolderClosed size={23}/></span><h3>{loading || !list ? 'Consultando expedientes…' : search ? 'No se encontraron expedientes' : 'Aún no hay expedientes'}</h3><p>{search ? 'Prueba con el nombre del cliente o el número de acto.' : 'Carga el primer acto de la DIAN para empezar.'}</p>{!loading && list && !search && <button className="text-button" onClick={create}>Crear expediente <ArrowRight size={16}/></button>}</div> : <>
              <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Acto administrativo</th><th>Estado</th><th>Actualización</th><th><span className="sr-only">Abrir</span></th></tr></thead><tbody>
                {list.items.map((item) => <tr key={item.id}><td><strong>{item.client}</strong></td><td>{item.type || 'Tipo por identificar'}<small>{item.act || 'Sin número registrado'}</small></td><td><Status item={item}/></td><td>{dateFormat.format(new Date(item.updatedAt))}</td><td><button className="icon-button" disabled={!!opening} onClick={() => openCase(item.id)} aria-label={`Abrir expediente de ${item.client}`}><ArrowUpRight size={17}/></button></td></tr>)}
              </tbody></table></div>
              {(offset > 0 || list.more) && <div className="pagination"><button className="button outline" disabled={!offset || loading} onClick={() => setOffset(offset - 50)}><ArrowLeft size={16}/> Anteriores</button><button className="button outline" disabled={!list.more || loading} onClick={() => setOffset(offset + 50)}>Siguientes <ArrowRight size={16}/></button></div>}
            </>}
          </section>
          <footer className="footer"><span><Scale size={15}/> LexAduana · CEXTAC Business Group</span><button className="text-button" onClick={() => setModal('sources')}>Consultar fuentes oficiales <ArrowUpRight size={14}/></button></footer>
        </>}
      </div>
    </main>
    {modal === 'access' && <AccessForm mode={authMode} setMode={setAuthMode} invite={invite} close={() => { setModal(''); setInvite(''); }} refresh={refreshAuth}/>}
    {modal === 'new' && session && <Intake close={() => setModal('')} created={(entry) => { setModal(''); setPage('Expedientes'); updated(entry); }} clients={[...new Set(list?.items.map(({client}) => client))]}/>}
    {modal === 'sources' && <Modal title="Fuentes normativas" close={() => setModal('')}><p className="muted">El análisis consulta el Normograma DIAN. Contrasta las citas y la vigencia aplicable al caso antes de firmar.</p><div className="source-list">{references.map(([title, summary, url]) => <a key={url} href={url} target="_blank" rel="noreferrer"><BookOpen size={19}/><span><strong>{title}</strong><small>{summary}</small></span><ArrowUpRight size={17}/></a>)}</div></Modal>}
    {modal === 'help' && <Modal title="Guía de uso" close={() => setModal('')}><ol className="guide"><li><UploadCloud size={18}/><span><strong>Registra el expediente.</strong> Identifica al cliente y carga primero el acto principal.</span></li><li><Scale size={18}/><span><strong>Revisa el dictamen.</strong> Comprueba hechos, fuentes y fechas de cómputo.</span></li><li><ArrowDownToLine size={18}/><span><strong>Exporta la respuesta.</strong> Aprueba y descarga el Word para firmar y enviar externamente.</span></li><li><FileCheck2 size={18}/><span><strong>Deja constancia.</strong> Registra la respuesta, el radicado y la resolución del caso.</span></li></ol></Modal>}
  </div>;
}
