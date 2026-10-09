import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isValidMetaSignature } from './metaSignature.js';

const appSecret = 'test-app-secret';
const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));

function sign(body: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('isValidMetaSignature', () => {
  it('aceita uma assinatura valida', () => {
    const signatureHeader = sign(rawBody, appSecret);
    expect(isValidMetaSignature({ rawBody, signatureHeader, appSecret })).toBe(true);
  });

  it('rejeita uma assinatura calculada com outro secret', () => {
    const signatureHeader = sign(rawBody, 'secret-errado');
    expect(isValidMetaSignature({ rawBody, signatureHeader, appSecret })).toBe(false);
  });

  it('rejeita quando o header esta ausente', () => {
    expect(isValidMetaSignature({ rawBody, signatureHeader: undefined, appSecret })).toBe(false);
  });

  it('rejeita quando o header nao comeca com sha256=', () => {
    expect(isValidMetaSignature({ rawBody, signatureHeader: 'abcdef', appSecret })).toBe(false);
  });
});
