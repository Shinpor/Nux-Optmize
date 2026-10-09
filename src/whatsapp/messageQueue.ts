import { logger } from '../shared/logger.js';

const queues = new Map<string, Promise<unknown>>();

/**
 * Encadeia tarefas por numero de telefone (wa_id), garantindo que mensagens
 * simultaneas do mesmo aluno sejam processadas uma por vez e nao corrompam
 * o estado da conversa. Suficiente porque a Railway roda uma instancia so.
 */
export function enqueueForPhone(waId: string, task: () => Promise<void>): void {
  const previous = queues.get(waId) ?? Promise.resolve();
  const next = previous.then(task).catch((error) => {
    logger.error({ error, waId }, 'Erro ao processar mensagem na fila do telefone');
  });
  queues.set(waId, next);
}
