import { randomUUID } from 'node:crypto';
import type { Config } from '@netlify/server';
import { getStore } from '@netlify/blobs';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { cases } from '../../db/schema.js';
import { analyze } from './analysis.mjs';
import { makeLetter } from './letter.mjs';
import { deadlines, defaultRecord, populateCase, recordUpdate } from './rules.mjs';

export const config: Config = { path: '/api/*' };

const pdfLimit = 8 * 1024 * 1024;
const anonymousActor = 'anonymous';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const pdfStore = () => getStore({ name: 'customs-case-documents', consistency: 'strong' });
const clientKey = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers });
}

async function bounded(req: Request, limit: number) {
  if (Number(req.headers.get('content-length')) > limit) throw new ApiError(413, 'La solicitud supera el tamaño permitido.');
  const reader = req.body?.getReader();
  if (!reader) throw new ApiError(400, 'No se recibió contenido.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new ApiError(413, 'La solicitud supera el tamaño permitido.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, length);
}

function detail(row: typeof cases.$inferSelect) {
  const record = { ...defaultRecord, ...row.record };
  return { id: row.id, client: row.client, version: row.version, files: row.files.map(({name}) => name), record, analysis: row.analysis, deadlines: deadlines(record), updatedAt: row.updatedAt };
}

async function listCases(url: URL) {
  const search = clientKey(url.searchParams.get('search')?.slice(0, 180).trim() ?? '');
  const offset = Math.min(50000, Math.max(0, Number.parseInt(url.searchParams.get('offset') ?? '0', 10) || 0));
  const filter = search ? sql`(strpos(${cases.clientKey}, ${search}) > 0 or strpos(lower(${cases.record}->>'act'), ${search}) > 0)` : undefined;
  const [rows, [totals]] = await Promise.all([
    db.select({ id: cases.id, client: cases.client, updatedAt: cases.updatedAt,
      act: sql<string>`${cases.record}->>'act'`, type: sql<string>`${cases.record}->>'type'`,
      filed: sql<string>`${cases.record}->>'filed'`, reviewed: sql<string>`${cases.record}->>'reviewed'`,
      analyzed: sql<boolean>`${cases.analysis} is not null`,
    }).from(cases).where(filter).orderBy(desc(cases.updatedAt), desc(cases.id)).offset(offset).limit(51),
    db.select({ all: sql<number>`count(*)::int`, clients: sql<number>`count(distinct nullif(${cases.clientKey}, ''))::int`,
      filed: sql<number>`(count(*) filter (where ${cases.record}->>'filed' <> ''))::int`,
      review: sql<number>`(count(*) filter (where ${cases.analysis} is not null and ${cases.record}->>'reviewed' = 'false' and ${cases.record}->>'filed' = ''))::int`,
    }).from(cases),
  ]);
  return json({ items: rows.slice(0, 50), more: rows.length > 50, totals });
}

async function createCase(req: Request) {
  const data = await bounded(req, pdfLimit + 32768);
  const form = await new Response(data, { headers: { 'Content-Type': req.headers.get('content-type') ?? '' } }).formData().catch(() => null);
  const files = form?.getAll('pdf') ?? [];
  if (!files.length || files.length > 4 || files.some((file) => typeof file === 'string')) throw new ApiError(400, 'Adjunta entre uno y cuatro archivos PDF.');
  const uploads = files as File[];
  if (uploads.reduce((sum, file) => sum + file.size, 0) > pdfLimit) throw new ApiError(413, 'Los PDF no pueden superar 8 MB en total.');
  for (const upload of uploads) {
    if (!/\.pdf$/i.test(upload.name) || await upload.slice(0, 5).text() !== '%PDF-') throw new ApiError(400, 'Adjunta archivos PDF válidos.');
  }
  const id = randomUUID();
  const stored = [];
  const store = pdfStore();
  try {
    for (const [index, file] of uploads.entries()) {
      const key = `${id}/${index}`;
      await store.set(key, await file.arrayBuffer());
      stored.push({ key, name: file.name.slice(0, 180).replace(/[\u0000-\u001f\u007f]/g, '') });
    }
    const [created] = await db.insert(cases).values({ id, client: '', clientKey: '', files: stored, record: defaultRecord, updatedBy: anonymousActor }).returning();
    return json(detail(created), 201);
  } catch (error) {
    await Promise.allSettled(stored.map(({key}) => store.delete(key)));
    throw error;
  }
}

function analysisStream(row: typeof cases.$inferSelect) {
  const encoder = new TextEncoder();
  let active = true;
  return new Response(new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => { if (active) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); };
      send({ progress: 'Cargando los PDF del expediente…' });
      const heartbeat = setInterval(() => send({}), 8000);
      let facts: Parameters<typeof populateCase>[2] | undefined;
      async function persist(extracted: Parameters<typeof populateCase>[2], analysis: Awaited<ReturnType<typeof analyze>> | null, warning?: string) {
        const { client, record } = populateCase(row.client, row.record, extracted, analysis);
        const [updated] = await db.update(cases).set({ client, clientKey: clientKey(client), record, analysis, version: row.version + 1, updatedAt: new Date(), updatedBy: anonymousActor })
          .where(and(eq(cases.id, row.id), eq(cases.version, row.version))).returning();
        if (!updated) send({ error: 'El expediente cambió durante el análisis. Ábrelo de nuevo antes de reintentar.' });
        else send({ result: { ...detail(updated), analysisWarning: warning } });
      }
      try {
        const store = pdfStore();
        const files = await Promise.all(row.files.map(async ({key, name}) => {
          const bytes = await store.get(key, { type: 'arrayBuffer' });
          if (!bytes) throw new Error('DOCUMENTO_NO_DISPONIBLE');
          return { name, bytes };
        }));
        const analysis = await analyze(files, (progress) => send({ progress }), (extracted) => { facts = extracted; });
        facts = undefined;
        await persist(analysis.facts, analysis);
      } catch (error) {
        const messages: Record<string, string> = {
          ACTO_NO_IDENTIFICADO: 'No se identificó un acto aduanero legible. Verifica el PDF principal.',
          NORMOGRAMA_NO_DISPONIBLE: 'No se pudo contrastar la normativa oficial. Reintenta más tarde.',
          SIN_FUNDAMENTO_VERIFICABLE: 'No se obtuvieron citas verificables para este acto. No se generó un dictamen.',
          DOCUMENTO_NO_DISPONIBLE: 'No se encontró uno de los PDF archivados.',
        };
        const message = error instanceof Error && Object.hasOwn(messages, error.message) ? messages[error.message] : 'No se completó el análisis. El expediente y sus PDF siguen guardados.';
        if (facts && !row.analysis) {
          try { await persist(facts, null, `Se guardaron los datos del PDF. ${message}`); }
          catch { send({ error: message }); }
        } else send({ error: message });
      } finally { clearInterval(heartbeat); if (active) controller.close(); }
    },
    cancel() { active = false; },
  }), { headers: { ...headers, 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const [, api, resource, id, action, fileIndex, ...rest] = url.pathname.split('/');
    if (api !== 'api' || rest.length) return json({ error: 'Ruta no encontrada.' }, 404);
    if (resource !== 'cases') return json({ error: 'Ruta no encontrada.' }, 404);
    const origin = req.headers.get('origin');
    if (['POST', 'PATCH'].includes(req.method) && origin !== null && origin !== url.origin) {
      throw new ApiError(403, 'Origen de la solicitud no autorizado.');
    }
    if (!id && req.method === 'GET') return await listCases(url);
    if (!id && req.method === 'POST') return await createCase(req);
    if (!id || !uuid.test(id)) return json({ error: 'Expediente no encontrado.' }, 404);
    const [row] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    if (!row) return json({ error: 'Expediente no encontrado.' }, 404);
    if (!action && req.method === 'GET') return json(detail(row));
    if (!action && req.method === 'PATCH') {
      const payload = await bounded(req, 256 * 1024);
      let data;
      try { data = JSON.parse(payload.toString('utf8')); } catch { throw new ApiError(400, 'JSON no válido.'); }
      const input = recordUpdate.safeParse(data);
      if (!input.success) throw new ApiError(400, input.error.issues[0]?.message ?? 'Revisa los datos del expediente.');
      const { record: manual, version } = input.data;
      const record = { ...defaultRecord, ...row.record, ...manual };
      if (record.reviewed && (!row.client || !record.act || !record.office)) throw new ApiError(400, 'El PDF debe identificar al cliente, el número del acto y la dependencia antes de aprobar el escrito.');
      const [updated] = await db.update(cases).set({ record, version: version + 1, updatedAt: new Date(), updatedBy: anonymousActor })
        .where(and(eq(cases.id, id), eq(cases.version, version))).returning();
      if (!updated) throw new ApiError(409, 'Otra persona modificó el expediente. Vuelve a abrirlo para continuar.');
      return json(detail(updated));
    }
    if (action === 'analysis' && !fileIndex && req.method === 'POST') {
      const data = await bounded(req, 1024);
      let consent;
      try { consent = JSON.parse(data.toString('utf8'))?.confirmProcessing; } catch { throw new ApiError(400, 'JSON no válido.'); }
      if (consent !== true) throw new ApiError(400, 'Confirma el procesamiento de los PDF por IA.');
      return analysisStream(row);
    }
    if (action === 'pdf' && fileIndex && /^\d$/.test(fileIndex) && req.method === 'GET') {
      const file = row.files[Number(fileIndex)];
      const data = file ? await pdfStore().get(file.key, { type: 'arrayBuffer' }) : null;
      if (!data) throw new ApiError(404, 'PDF no encontrado.');
      return new Response(data, { headers: { ...headers, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="documento-${Number(fileIndex) + 1}.pdf"` } });
    }
    if (action === 'word' && !fileIndex && req.method === 'GET') {
      const record = { ...defaultRecord, ...row.record };
      if (!record.reviewed) throw new ApiError(409, 'Guarda y aprueba el escrito antes de descargarlo.');
      const document = await makeLetter(row.client, record);
      return new Response(new Uint8Array(document), { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': 'attachment; filename="Respuesta-DIAN.docx"' } });
    }
    return json({ error: 'Ruta no encontrada.' }, 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    return json({ error: 'No fue posible completar la operación. Intenta nuevamente.' }, 500);
  }
}
