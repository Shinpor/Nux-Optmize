import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { registerHealthRoute } from './routes/health.js';
import { registerTwilioWebhookRoute } from './routes/twilioWebhook.js';

export async function buildServer() {
  const app = Fastify({ logger: false });

  await app.register(formbody);

  registerHealthRoute(app);
  registerTwilioWebhookRoute(app);

  return app;
}
