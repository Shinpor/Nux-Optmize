import twilio from 'twilio';
import { loadEnv } from '../config/env.js';

const env = loadEnv();

/**
 * Valida a assinatura X-Twilio-Signature do webhook inbound.
 * Usa PUBLIC_BASE_URL (fixo, de env) em vez de derivar do request,
 * para evitar divergencia causada por proxy/HTTPS termination no Railway.
 */
export function isValidTwilioSignature(params: {
  signatureHeader: string | undefined;
  path: string;
  body: Record<string, unknown>;
}): boolean {
  if (!params.signatureHeader) return false;

  const url = `${env.PUBLIC_BASE_URL}${params.path}`;
  return twilio.validateRequest(
    env.TWILIO_AUTH_TOKEN,
    params.signatureHeader,
    url,
    params.body as Record<string, string>,
  );
}
