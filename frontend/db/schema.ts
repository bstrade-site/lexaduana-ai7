import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const cases = pgTable('customs_cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  client: text('client').notNull(),
  clientKey: text('client_key').notNull(),
  files: jsonb('files').$type<{ key: string; name: string }[]>().notNull(),
  record: jsonb('record').$type<Record<string, unknown>>().notNull(),
  analysis: jsonb('analysis').$type<Record<string, unknown>>(),
  version: integer('version').notNull().default(1),
  updatedBy: text('updated_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('customs_cases_client_idx').on(table.clientKey), index('customs_cases_updated_idx').on(table.updatedAt)]);
