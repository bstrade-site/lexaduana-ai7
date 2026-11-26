import { z } from 'zod';
import { validDate, businessDeadline } from './calendar.mjs';

const text = (max) => z.string().trim().max(max);
const date = text(10).refine((value) => !value || validDate(value), 'Fecha no válida.');
const days = z.number().int().min(1).max(365).nullable();

export const defaultRecord = {
  act: '', type: '', notificationDate: '', notificationMethod: '', responseBase: '', responseDays: null,
  responseRule: '', authorityBase: '', authorityDays: null, authorityRule: '', exclusions: [],
  responded: '', filed: '', radicado: '', declared: '', currency: '', declaredEvidence: '', outcome: '',
  office: '', subject: '', signer: '', capacity: '', contact: '', body: '', attachments: '', reviewed: false,
};

const recordSchema = z.object({
  act: text(120), type: text(150), notificationDate: date, notificationMethod: text(240),
  responseBase: date, responseDays: days, responseRule: text(500),
  authorityBase: date, authorityDays: days, authorityRule: text(500), exclusions: z.array(date).max(365),
  responded: date, filed: date, radicado: text(120),
  declared: text(24).refine((value) => !value || /^\d{1,17}(\.\d{1,4})?$/.test(value), 'Importe no válido.'),
  currency: text(3).refine((value) => !value || /^[A-Z]{3}$/.test(value), 'Moneda no válida.'),
  declaredEvidence: text(500), outcome: text(10000), office: text(240), subject: text(250),
  signer: text(180), capacity: text(200), contact: text(350), body: text(30000), attachments: text(4000), reviewed: z.boolean(),
});

export const clientName = text(180).min(2);
export const reviewedFields = ['act', 'office', 'subject', 'body', 'signer', 'capacity', 'contact'];
export const recordUpdate = z.object({ version: z.number().int().positive(), client: clientName, record: recordSchema }).superRefine(({record}, ctx) => {
  if (Boolean(record.declared) !== Boolean(record.currency)) ctx.addIssue({ code: 'custom', message: 'Registra el importe junto con su moneda.' });
  if (Boolean(record.filed) !== Boolean(record.radicado)) ctx.addIssue({ code: 'custom', message: 'Registra juntos la fecha de radicación y el número de radicado.' });
  if (record.reviewed && (reviewedFields.some((field) => !record[field]) || /\[(?:pendiente|completar|verificar)/i.test(record.body))) ctx.addIssue({ code: 'custom', message: 'Completa los datos de la carta y resuelve los campos pendientes antes de aprobarla.' });
});

export function deadlines(record) {
  return {
    response: record.responseRule ? businessDeadline(record.responseBase, record.responseDays, record.exclusions) : null,
    authority: record.authorityRule ? businessDeadline(record.authorityBase, record.authorityDays, record.exclusions) : null,
  };
}
