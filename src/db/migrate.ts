import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';
import { logger } from '../shared/logger.js';

async function main() {
  logger.info('Rodando migracoes do banco de dados...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  logger.info('Migracoes aplicadas com sucesso.');
  await pool.end();
}

main().catch((error) => {
  logger.error({ error }, 'Falha ao rodar migracoes');
  process.exit(1);
});
