import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerWhatsAppWebhookRoute } from './whatsappWebhook.js';
import { loadEnv } from '../../config/env.js';

const env = loadEnv();

async function buildTestApp() {
  const app = Fastify({ logger: false });
  registerWhatsAppWebhookRoute(app);
  await app.ready();
  return app;
}

describe('GET /webhooks/whatsapp (verificacao)', () => {
  it('responde 200 com o challenge quando o verify_token esta correto', async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/webhooks/whatsapp',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': env.WHATSAPP_VERIFY_TOKEN,
        'hub.challenge': 'challenge-123',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('challenge-123');

    await app.close();
  });

  it('responde 403 quando o verify_token esta errado', async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/webhooks/whatsapp',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'token-errado',
        'hub.challenge': 'challenge-123',
      },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });
});
