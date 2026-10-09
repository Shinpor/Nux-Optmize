import type { FastifyInstance } from 'fastify';
import { loadEnv } from '../../config/env.js';
import { logger } from '../../shared/logger.js';
import { isValidMetaSignature } from '../../whatsapp/metaSignature.js';
import { parseWhatsAppWebhookPayload } from '../../whatsapp/webhookPayloadParser.js';
import { enqueueForPhone } from '../../whatsapp/messageQueue.js';
import { sendFreeFormReply } from '../../whatsapp/outboundMessenger.js';
import { handleInboundMessage, pauseBotForPhone } from '../../conversation/stateMachine.js';
import { MAIN_MENU_TEXT } from '../../conversation/formatting.js';

const env = loadEnv();

async function processWebhookEventsAsync(body: unknown): Promise<void> {
  for (const event of parseWhatsAppWebhookPayload(body)) {
    enqueueForPhone(event.waId, async () => {
      if (event.kind === 'echo') {
        await pauseBotForPhone(event.waId, env.HUMAN_TAKEOVER_MINUTES);
        return;
      }

      if (event.kind === 'status') {
        if (event.errorCode) {
          logger.error({ ...event }, 'Falha de entrega de mensagem WhatsApp');
        }
        return;
      }

      if (event.kind === 'message_unsupported') {
        await sendFreeFormReply(event.waId, 'Por aqui eu só entendo mensagens de texto 🙂');
        await sendFreeFormReply(event.waId, MAIN_MENU_TEXT);
        return;
      }

      const text = event.kind === 'message_interactive' ? event.optionId : event.text;
      const messages = await handleInboundMessage({
        whatsappPhone: event.waId,
        text,
        messageId: event.wamid,
      });

      for (const message of messages) {
        await sendFreeFormReply(event.waId, message);
      }
    });
  }
}

export function registerWhatsAppWebhookRoute(app: FastifyInstance): void {
  app.register(async (instance) => {
    instance.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    instance.get('/webhooks/whatsapp', async (request, reply) => {
      const query = request.query as Record<string, string>;

      if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === env.WHATSAPP_VERIFY_TOKEN) {
        return reply.code(200).type('text/plain').send(query['hub.challenge']);
      }

      return reply.code(403).send();
    });

    instance.post('/webhooks/whatsapp', async (request, reply) => {
      const rawBody = request.body as Buffer;
      const signatureHeader = request.headers['x-hub-signature-256'] as string | undefined;

      const isValid = isValidMetaSignature({
        rawBody,
        signatureHeader,
        appSecret: env.WHATSAPP_APP_SECRET,
      });

      if (!isValid) {
        logger.warn('Assinatura invalida no webhook do WhatsApp, rejeitando.');
        return reply.code(401).send();
      }

      // Responde 200 ja; a Meta reenvia a notificacao por ate 7 dias se a
      // resposta demorar ou falhar, entao processamos de forma assincrona.
      reply.code(200).send();

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(rawBody.toString('utf8'));
      } catch (error) {
        logger.error({ error }, 'Falha ao fazer parse do corpo do webhook do WhatsApp');
        return;
      }

      void processWebhookEventsAsync(parsedBody).catch((error) => {
        logger.error({ error }, 'Erro ao processar eventos do webhook do WhatsApp');
      });
    });
  });
}
