import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { buildServer } from './http/server.js';
import { startScheduledJobs } from './jobs/scheduler.js';
import { logger } from './shared/logger.js';

async function main() {
  const env = loadEnv();

  const app = await buildServer();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info({ port: env.PORT }, 'Servidor HTTP iniciado.');

  startScheduledJobs();
}

main().catch((error) => {
  logger.error({ error }, 'Erro fatal ao iniciar a aplicacao');
  process.exit(1);
});
