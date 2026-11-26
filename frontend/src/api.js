async function request(path, options, fallback) {
  const response = await fetch(path, { ...options, credentials: 'same-origin' });
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html') && (response.status === 401 || response.status === 403 || response.redirected)) {
    throw new Error('Netlify restringió el acceso al sitio. Recarga la página y, si se solicita, vuelve a iniciar sesión en Netlify antes de reintentar.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || fallback);
  }
  return response;
}

export async function api(path, options = {}) {
  const response = await request(path, options, 'No fue posible completar la solicitud.');
  return response.json();
}

export async function readAnalysis(id, update) {
  const response = await request(`/api/cases/${id}/analysis`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmProcessing: true }),
  }, 'No se pudo iniciar el análisis.');
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
