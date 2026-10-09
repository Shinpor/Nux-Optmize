import { sendFreeFormMessage, sendTemplateMessage } from './twilioClient.js';
import { TEMPLATES, type TemplateKey } from './templates.js';

/** Resposta de fluxo conversacional normal (dentro da janela de 24h). */
export async function sendFreeFormReply(phone: string, text: string): Promise<void> {
  await sendFreeFormMessage(phone, text);
}

/** Mensagem iniciada pelo negocio (confirmacao/lembrete) via template aprovado. */
export async function sendApprovedTemplate(
  phone: string,
  templateKey: TemplateKey,
  variables: Record<string, string>,
): Promise<void> {
  await sendTemplateMessage(phone, TEMPLATES[templateKey], variables);
}
