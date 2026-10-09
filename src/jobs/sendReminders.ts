import { and, eq, gte, isNull, lte } from 'drizzle-orm';
import { db, pool } from '../db/client.js';
import { botBookings, students } from '../db/schema.js';
import { loadEnv } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { sendApprovedTemplate } from '../whatsapp/outboundMessenger.js';
import { classReminderVariables } from '../whatsapp/templates.js';
import { formatSessionDateTime } from '../conversation/formatting.js';

const env = loadEnv();

const MAX_REMINDER_ATTEMPTS = 3;

/**
 * Tenta "reivindicar" atomicamente uma reserva para envio de lembrete.
 * So retorna true se este processo foi quem conseguiu marcar reminder_sent_at,
 * evitando envio duplicado entre execucoes concorrentes/lentas do cron.
 */
async function claimReminder(bookingId: string): Promise<boolean> {
  const result = await db
    .update(botBookings)
    .set({ reminderSentAt: new Date() })
    .where(and(eq(botBookings.id, bookingId), isNull(botBookings.reminderSentAt)))
    .returning({ id: botBookings.id });

  return result.length > 0;
}

async function releaseReminderClaim(bookingId: string, attempts: number): Promise<void> {
  await db
    .update(botBookings)
    .set({ reminderSentAt: null, reminderAttempts: attempts + 1 })
    .where(eq(botBookings.id, bookingId));
}

export async function runReminderJob(): Promise<void> {
  const now = new Date();
  const leadTimeEnd = new Date(now.getTime() + env.REMINDER_LEAD_TIME_MINUTES * 60 * 1000);

  const dueBookings = await db
    .select({
      id: botBookings.id,
      classStartsAt: botBookings.classStartsAt,
      reminderAttempts: botBookings.reminderAttempts,
      studentId: botBookings.studentId,
    })
    .from(botBookings)
    .where(
      and(
        eq(botBookings.status, 'CONFIRMED'),
        isNull(botBookings.reminderSentAt),
        gte(botBookings.classStartsAt, now),
        lte(botBookings.classStartsAt, leadTimeEnd),
      ),
    );

  let sent = 0;

  for (const booking of dueBookings) {
    if (booking.reminderAttempts >= MAX_REMINDER_ATTEMPTS) {
      continue;
    }

    const claimed = await claimReminder(booking.id);
    if (!claimed) continue;

    try {
      const [student] = await db.select().from(students).where(eq(students.id, booking.studentId)).limit(1);
      if (!student) {
        logger.warn({ bookingId: booking.id }, 'Aluno nao encontrado para lembrete, pulando.');
        continue;
      }

      await sendApprovedTemplate(
        student.whatsappPhone,
        'CLASS_REMINDER',
        classReminderVariables({
          studentName: student.name ?? 'aluno(a)',
          className: 'sua aula',
          startsAtFormatted: formatSessionDateTime(booking.classStartsAt),
        }),
      );
      sent += 1;
    } catch (error) {
      logger.error({ error, bookingId: booking.id }, 'Falha ao enviar lembrete, revertendo claim.');
      await releaseReminderClaim(booking.id, booking.reminderAttempts);
    }
  }

  logger.info({ checked: dueBookings.length, sent }, 'Job de lembretes concluido.');
}

async function main() {
  await runReminderJob();
  await pool.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error({ error }, 'Erro fatal no job de lembretes');
    process.exit(1);
  });
}
