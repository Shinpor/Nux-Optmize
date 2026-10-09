import { loadEnv } from '../config/env.js';
import { logger } from '../shared/logger.js';

const env = loadEnv();

interface GraphErrorBody {
  error?: { message?: string; code?: number };
}

async function graphFetch(body: unknown): Promise<void> {
  const url = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => undefined)) as GraphErrorBody | undefined;
    const code = errorBody?.error?.code;
    logger.error({ status: response.status, code, errorBody }, 'Falha ao enviar mensagem via WhatsApp Cloud API');
    // code 131047: janela de 24h expirada, era necessario um template aprovado.
    throw new Error(`Falha ao enviar mensagem WhatsApp (code=${code ?? 'desconhecido'})`);
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await graphFetch({ messaging_product: 'whatsapp', to, type: 'text', text: { body } });
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
): Promise<void> {
  await graphFetch({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }],
    },
  });
}
