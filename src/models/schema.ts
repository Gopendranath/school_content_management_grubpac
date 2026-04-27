import { pgTable, uuid, varchar, text, integer, timestamp, check, unique, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const content = pgTable('content', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  subject: varchar('subject', { length: 100 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: varchar('file_type', { length: 10 }).notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  rotationDuration: integer('rotation_duration'), // minutes
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uploadedByIdx: index('content_uploaded_by_idx').on(table.uploadedBy),
  statusIdx: index('content_status_idx').on(table.status),
  subjectIdx: index('content_subject_idx').on(table.subject),
}));

export const contentSlots = pgTable('content_slots', {
  id: uuid('id').primaryKey().defaultRandom(),
  teacherId: uuid('teacher_id').references(() => users.id),
  subject: varchar('subject', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const contentSchedule = pgTable('content_schedule', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentId: uuid('content_id').references(() => content.id, { onDelete: 'cascade' }),
  slotId: uuid('slot_id').references(() => contentSlots.id),
  rotationOrder: integer('rotation_order').notNull(),
  duration: integer('duration').notNull(), // minutes
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  slotIdIdx: index('content_schedule_slot_id_idx').on(table.slotId),
  contentIdIdx: index('content_schedule_content_id_idx').on(table.contentId),
}));