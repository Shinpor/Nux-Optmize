import cron from 'node-cron';
import { loadEnv } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { runReminderJob } from './sendReminders.js';

const env = loadEnv();

export function startScheduledJobs(): void {
  const cronExpression = `*/${env.REMINDER_CHECK_INTERVAL_MINUTES} * * * *`;

  cron.schedule(cronExpression, () => {
    runReminderJob().catch((error) => {
      logger.error({ error }, 'Erro ao executar job de lembretes agendado');
    });
  });

  logger.info({ cronExpression }, 'Job de lembretes agendado.');
}
