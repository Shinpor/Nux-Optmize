import { describe, expect, it } from 'vitest';
import { parseWhatsAppWebhookPayload } from './webhookPayloadParser.js';

function wrapValue(value: unknown) {
  return { entry: [{ changes: [{ value }] }] };
}

describe('parseWhatsAppWebhookPayload', () => {
  it('parseia uma mensagem de texto', () => {
    const body = wrapValue({
      contacts: [{ wa_id: '5511987654321', profile: { name: 'Ana' } }],
      messages: [{ from: '5511987654321', id: 'wamid.1', type: 'text', text: { body: 'oi' } }],
    });

    expect(parseWhatsAppWebhookPayload(body)).toEqual([
      { kind: 'message_text', waId: '5511987654321', wamid: 'wamid.1', profileName: 'Ana', text: 'oi' },
    ]);
  });

  it('parseia uma resposta de lista interativa', () => {
    const body = wrapValue({
      messages: [
        {
          from: '5511987654321',
          id: 'wamid.2',
          type: 'interactive',
          interactive: { type: 'list_reply', list_reply: { id: 'sess-1' } },
        },
      ],
    });

    expect(parseWhatsAppWebhookPayload(body)).toEqual([
      { kind: 'message_interactive', waId: '5511987654321', wamid: 'wamid.2', profileName: undefined, optionId: 'sess-1' },
    ]);
  });

  it('parseia uma resposta de botao interativo', () => {
    const body = wrapValue({
      messages: [
        {
          from: '5511987654321',
          id: 'wamid.3',
          type: 'interactive',
          interactive: { type: 'button_reply', button_reply: { id: 'sim' } },
        },
      ],
    });

    expect(parseWhatsAppWebhookPayload(body)).toEqual([
      { kind: 'message_interactive', waId: '5511987654321', wamid: 'wamid.3', profileName: undefined, optionId: 'sim' },
    ]);
  });

  it('marca tipos nao suportados (ex: imagem) como message_unsupported', () => {
    const body = wrapValue({
      messages: [{ from: '5511987654321', id: 'wamid.4', type: 'image' }],
    });

    expect(parseWhatsAppWebhookPayload(body)).toEqual([
      { kind: 'message_unsupported', waId: '5511987654321', wamid: 'wamid.4' },
    ]);
  });

  it('parseia um aviso de status de entrega', () => {
    const body = wrapValue({
      statuses: [{ id: 'wamid.5', recipient_id: '5511987654321', status: 'failed', errors: [{ code: 131047 }] }],
    });

    expect(parseWhatsAppWebhookPayload(body)).toEqual([
      { kind: 'status', waId: '5511987654321', wamid: 'wamid.5', status: 'failed', errorCode: 131047 },
    ]);
  });

  it('parseia um eco de coexistencia (smb_message_echoes)', () => {
    const body = wrapValue({
      smb_message_echoes: [{ id: 'wamid.6', to: '5511987654321' }],
    });

    expect(parseWhatsAppWebhookPayload(body)).toEqual([
      { kind: 'echo', waId: '5511987654321', wamid: 'wamid.6' },
    ]);
  });

  it('processa varias mensagens de uma mesma notificacao', () => {
    const body = wrapValue({
      messages: [
        { from: '111', id: 'a', type: 'text', text: { body: '1' } },
        { from: '222', id: 'b', type: 'text', text: { body: '2' } },
      ],
    });

    expect(parseWhatsAppWebhookPayload(body)).toHaveLength(2);
  });
});
