import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Valida a assinatura X-Hub-Signature-256 do webhook da Meta: HMAC-SHA256
 * do corpo bruto (raw body) usando o App Secret, comparado com
 * timingSafeEqual para evitar timing attacks.
 */
export function isValidMetaSignature(params: {
  rawBody: Buffer;
  signatureHeader: string | undefined;
  appSecret: string;
}): boolean {
  if (!params.signatureHeader?.startsWith('sha256=')) return false;

  const receivedHex = params.signatureHeader.slice('sha256='.length);
  const expectedHex = createHmac('sha256', params.appSecret).update(params.rawBody).digest('hex');

  const received = Buffer.from(receivedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');

  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
