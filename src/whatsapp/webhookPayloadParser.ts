export type ParsedWebhookEvent =
  | { kind: 'message_text'; waId: string; wamid: string; profileName?: string; text: string }
  | { kind: 'message_interactive'; waId: string; wamid: string; profileName?: string; optionId: string }
  | { kind: 'message_unsupported'; waId: string; wamid: string }
  | { kind: 'status'; waId: string; wamid: string; status: string; errorCode?: number }
  | { kind: 'echo'; waId: string; wamid: string };

interface MetaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: {
    type: string;
    list_reply?: { id: string };
    button_reply?: { id: string };
  };
}

interface MetaStatus {
  id: string;
  recipient_id: string;
  status: string;
  errors?: { code: number }[];
}

interface MetaEcho {
  id: string;
  to: string;
}

interface MetaContact {
  wa_id: string;
  profile?: { name?: string };
}

interface MetaChangeValue {
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
  smb_message_echoes?: MetaEcho[];
  contacts?: MetaContact[];
}

interface MetaWebhookBody {
  entry?: { changes?: { value?: MetaChangeValue }[] }[];
}

function profileNameFor(waId: string, contacts: MetaContact[] | undefined): string | undefined {
  return contacts?.find((contact) => contact.wa_id === waId)?.profile?.name;
}

function parseMessage(message: MetaMessage, contacts: MetaContact[] | undefined): ParsedWebhookEvent {
  const profileName = profileNameFor(message.from, contacts);

  if (message.type === 'text' && message.text) {
    return { kind: 'message_text', waId: message.from, wamid: message.id, profileName, text: message.text.body };
  }

  if (message.type === 'interactive' && message.interactive) {
    const optionId = message.interactive.list_reply?.id ?? message.interactive.button_reply?.id;
    if (optionId) {
      return { kind: 'message_interactive', waId: message.from, wamid: message.id, profileName, optionId };
    }
  }

  return { kind: 'message_unsupported', waId: message.from, wamid: message.id };
}

function parseStatus(status: MetaStatus): ParsedWebhookEvent {
  return {
    kind: 'status',
    waId: status.recipient_id,
    wamid: status.id,
    status: status.status,
    errorCode: status.errors?.[0]?.code,
  };
}

function parseEcho(echo: MetaEcho): ParsedWebhookEvent {
  return { kind: 'echo', waId: echo.to, wamid: echo.id };
}

/**
 * Converte o payload bruto do webhook da Meta (WhatsApp Cloud API) numa
 * lista de eventos planos, independente de Fastify/HTTP, para ser
 * facilmente testavel e processavel.
 */
export function parseWhatsAppWebhookPayload(body: unknown): ParsedWebhookEvent[] {
  const events: ParsedWebhookEvent[] = [];
  const entries = (body as MetaWebhookBody | undefined)?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      for (const message of value.messages ?? []) {
        events.push(parseMessage(message, value.contacts));
      }
      for (const status of value.statuses ?? []) {
        events.push(parseStatus(status));
      }
      for (const echo of value.smb_message_echoes ?? []) {
        events.push(parseEcho(echo));
      }
    }
  }

  return events;
}
