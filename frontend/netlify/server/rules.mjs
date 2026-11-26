import { z } from 'zod';
import { validDate, businessDeadline } from './calendar.mjs';

const text = (max) => z.string().trim().max(max);
const date = text(10).refine((value) => !value || validDate(value), 'Fecha no válida.');
const days = z.number().int().min(1).max(365).nullable();

export const defaultRecord = {
  act: '', type: '', notificationDate: '', notificationMethod: '', responseBase: '', responseDays: null,
  responseRule: '', authorityBase: '', authorityDays: null, authorityRule: '', exclusions: [],
  clientEvidence: '', notificationEvidence: '', responseBaseEvidence: '', authorityBaseEvidence: '',
  responded: '', filed: '', radicado: '', declared: '', currency: '', declaredEvidence: '', outcome: '',
  office: '', subject: '', signer: '', capacity: '', contact: '', body: '', attachments: '', reviewed: false,
};

const recordSchema = z.object({
  responded: date, filed: date, radicado: text(120),
  outcome: text(10000), subject: text(250),
  signer: text(180), capacity: text(200), contact: text(350), body: text(30000), attachments: text(4000), reviewed: z.boolean(),
});

export const recordUpdate = z.object({ version: z.number().int().positive(), record: recordSchema }).superRefine(({record}, ctx) => {
  if (Boolean(record.filed) !== Boolean(record.radicado)) ctx.addIssue({ code: 'custom', message: 'Registra juntos la fecha de radicación y el número de radicado.' });
  if (record.reviewed && (['subject', 'body', 'signer', 'capacity', 'contact'].some((field) => !record[field]) || /\[(?:pendiente|completar|verificar)/i.test(record.body))) ctx.addIssue({ code: 'custom', message: 'Completa los datos de la carta y resuelve los campos pendientes antes de aprobarla.' });
});

export function populateCase(currentClient, currentRecord, facts, analysis) {
  const cut = (value, max) => value.trim().slice(0, max);
  const record = { ...defaultRecord, ...currentRecord };
  const clientEvidence = cut(facts.clientEvidence, 500);
  const extractedClient = cut(facts.client, 180);
  const hasClient = Boolean(clientEvidence && extractedClient.length >= 2);
  const client = hasClient ? extractedClient : record.clientEvidence ? '' : currentClient;
  const act = cut(facts.act, 120);
  const office = cut(facts.office, 240);
  const notificationEvidence = cut(facts.notificationEvidence, 500);
  const declaredEvidence = cut(facts.declaredEvidence, 500);
  const declared = facts.declared.trim();
  const currency = facts.currency.trim();
  const hasValue = declaredEvidence && /^\d{1,17}(\.\d{1,4})?$/.test(declared) && /^[A-Z]{3}$/.test(currency);
  const terms = {};
  for (const [prefix, term] of [['response', analysis?.clientTerm], ['authority', analysis?.authorityTerm]]) {
    const source = analysis?.citations.find(({id}) => id === term?.articleId);
    const supported = source && term.ruleQuote && term.unit.trim().toLowerCase() === 'días hábiles' && days.safeParse(term.days).success && term.days !== null;
    const event = supported && Number.isInteger(term.baseEventIndex) ? facts.proceduralDates[term.baseEventIndex] : null;
    const dated = event && validDate(event.date) && event.evidence.trim() && event.event.trim();
    terms[`${prefix}Rule`] = supported ? cut(`${source.name}, art. ${source.article}. ${term.event}`, 500) : '';
    terms[`${prefix}Days`] = supported ? term.days : null;
    terms[`${prefix}Base`] = dated ? event.date : '';
    terms[`${prefix}BaseEvidence`] = dated ? cut(`${event.event}: ${event.evidence}`, 500) : '';
  }
  return { client, record: {
    ...record, ...terms, act, office, type: cut(facts.type, 150),
    clientEvidence: hasClient ? clientEvidence : '',
    notificationDate: notificationEvidence && validDate(facts.notificationDate) ? facts.notificationDate : '',
    notificationMethod: notificationEvidence ? cut(facts.notificationMethod, 240) : '', notificationEvidence,
    declared: hasValue ? declared : '', currency: hasValue ? currency : '', declaredEvidence: hasValue ? declaredEvidence : '',
    reviewed: client === currentClient && act === record.act && office === record.office ? record.reviewed : false,
  } };
}

export function deadlines(record) {
  return {
    response: record.responseRule ? businessDeadline(record.responseBase, record.responseDays, record.exclusions) : null,
    authority: record.authorityRule ? businessDeadline(record.authorityBase, record.authorityDays, record.exclusions) : null,
  };
}
