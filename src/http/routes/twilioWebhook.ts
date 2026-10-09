import type { FastifyInstance, FastifyRequest } from 'fastify';
import { isValidTwilioSignature } from '../../whatsapp/signatureValidation.js';
import { sendFreeFormReply } from '../../whatsapp/outboundMessenger.js';
import { handleInboundMessage } from '../../conversation/stateMachine.js';
import { logger } from '../../shared/logger.js';

interface TwilioInboundBody {
  From: string;
  Body: string;
  MessageSid: string;
  [key: string]: unknown;
}

function normalizePhone(from: string): string {
  return from.startsWith('whatsapp:') ? from.slice('whatsapp:'.length) : from;
}

export function registerTwilioWebhookRoute(app: FastifyInstance): void {
  app.post('/webhooks/twilio/inbound', async (request: FastifyRequest, reply) => {
    const body = request.body as TwilioInboundBody;
    const signatureHeader = request.headers['x-twilio-signature'] as string | undefined;

    const isValid = isValidTwilioSignature({
      signatureHeader,
      path: '/webhooks/twilio/inbound',
      body: body as Record<string, unknown>,
    });

    if (!isValid) {
      logger.warn({ from: body?.From }, 'Assinatura Twilio invalida, rejeitando webhook.');
      return reply.code(403).send();
    }

    // Responde rapido ao Twilio; processamento acontece antes do send mas
    // sem bloquear indefinidamente (fluxo e sincrono por turno de conversa).
    try {
      const phone = normalizePhone(body.From);
      const messages = await handleInboundMessage({
        whatsappPhone: phone,
        text: body.Body ?? '',
        messageSid: body.MessageSid,
      });

      for (const message of messages) {
        await sendFreeFormReply(phone, message);
      }
    } catch (error) {
      logger.error({ error }, 'Erro ao processar mensagem inbound do Twilio');
    }

    return reply.code(200).send();
  });
}
