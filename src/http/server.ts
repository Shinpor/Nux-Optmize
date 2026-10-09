import Fastify from 'fastify';
import { registerHealthRoute } from './routes/health.js';
import { registerWhatsAppWebhookRoute } from './routes/whatsappWebhook.js';

export async function buildServer() {
  const app = Fastify({ logger: false });

  registerHealthRoute(app);
  registerWhatsAppWebhookRoute(app);

  return app;
}
