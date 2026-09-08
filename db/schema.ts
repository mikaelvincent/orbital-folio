import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const content = sqliteTable(
  'content',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    draft: text('draft').notNull(),
    published: text('published'),
    revision: integer('revision').notNull().default(1),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_content_kind').on(t.kind),
    uniqueIndex('idx_content_draft_slug').on(
      t.kind,
      sql`json_extract(${t.draft}, '$.slug')`,
    ),
    uniqueIndex('idx_content_published_slug').on(
      t.kind,
      sql`json_extract(${t.published}, '$.slug')`,
    ),
  ],
);
export const admins = sqliteTable('admins', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
});
export const inquiries = sqliteTable('inquiries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  intent: text('intent').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expires: integer('expires').notNull(),
});
export const sessions = sqliteTable('sessions', {
  hash: text('hash').primaryKey(),
  expires: integer('expires').notNull(),
});
export const audit = sqliteTable('audit', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  actor: text('actor').notNull(),
  createdAt: text('created_at').notNull(),
});
