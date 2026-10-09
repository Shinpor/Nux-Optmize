import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  whatsappPhone: text('whatsapp_phone').notNull().unique(),
  momenceCustomerId: text('momence_customer_id'),
  name: text('name'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversationStates = pgTable('conversation_states', {
  whatsappPhone: text('whatsapp_phone').primaryKey(),
  currentState: text('current_state').notNull(),
  context: jsonb('context').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessionCache = pgTable('session_cache', {
  momenceSessionId: text('momence_session_id').primaryKey(),
  className: text('class_name').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  instructor: text('instructor'),
  spotsAvailable: integer('spots_available').notNull().default(0),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});

export const botBookings = pgTable(
  'bot_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    momenceBookingId: text('momence_booking_id').notNull().unique(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    momenceSessionId: text('momence_session_id').notNull(),
    classStartsAt: timestamp('class_starts_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: ['CONFIRMED', 'CANCELLED'] })
      .notNull()
      .default('CONFIRMED'),
    confirmationSentAt: timestamp('confirmation_sent_at', { withTimezone: true }),
    reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
    reminderAttempts: integer('reminder_attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [index('bot_bookings_reminder_due_idx').on(table.classStartsAt, table.reminderSentAt)],
);

export const inboundMessageLog = pgTable('inbound_message_log', {
  twilioMessageSid: text('twilio_message_sid').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});
