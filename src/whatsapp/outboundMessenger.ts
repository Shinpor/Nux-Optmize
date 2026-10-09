import { sendWhatsAppText, sendWhatsAppTemplate } from './metaClient.js';
import { CLASS_REMINDER_TEMPLATE_NAME, TEMPLATE_LANGUAGE, classReminderTemplateParams } from './templates.js';

/** Resposta de fluxo conversacional normal (dentro da janela de 24h, texto livre). */
export async function sendFreeFormReply(phone: string, text: string): Promise<void> {
  await sendWhatsAppText(phone, text);
}

/** Lembrete de aula, fora da janela de 24h, via template aprovado. */
export async function sendClassReminderTemplate(
  phone: string,
  params: { studentName: string; className: string; startsAtFormatted: string },
): Promise<void> {
  await sendWhatsAppTemplate(
    phone,
    CLASS_REMINDER_TEMPLATE_NAME,
    TEMPLATE_LANGUAGE,
    classReminderTemplateParams(params),
  );
}
