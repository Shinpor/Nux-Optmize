import twilio from 'twilio';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

export const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

function toWhatsAppAddress(phone: string): string {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

export async function sendFreeFormMessage(toPhone: string, body: string): Promise<void> {
  await twilioClient.messages.create({
    from: env.TWILIO_WHATSAPP_NUMBER,
    to: toWhatsAppAddress(toPhone),
    body,
  });
}

export async function sendTemplateMessage(
  toPhone: string,
  contentSid: string,
  variables: Record<string, string>,
): Promise<void> {
  await twilioClient.messages.create({
    from: env.TWILIO_WHATSAPP_NUMBER,
    to: toWhatsAppAddress(toPhone),
    contentSid,
    contentVariables: JSON.stringify(variables),
  });
}
