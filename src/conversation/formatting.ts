import type { MomenceSession } from '../momence/types.js';
import type { botBookings } from '../db/schema.js';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export function formatSessionDateTime(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  return dateFormatter.format(date);
}

export function formatClassList(sessions: MomenceSession[]): {
  text: string;
  options: Record<string, string>;
} {
  if (sessions.length === 0) {
    return {
      text: 'Não encontrei aulas com vaga disponível nos próximos dias. Tente novamente mais tarde! 🙏',
      options: {},
    };
  }

  const options: Record<string, string> = {};
  const lines = sessions.map((session, index) => {
    const number = String(index + 1);
    options[number] = session.id;
    return `${number}. ${session.className} - ${formatSessionDateTime(session.startsAt)} (${session.spotsAvailable} vaga(s))`;
  });

  return {
    text: [
      'Aqui estão as próximas aulas com vaga disponível:',
      ...lines,
      '',
      'Responda com o número da aula para reservar, ou "menu" para voltar.',
    ].join('\n'),
    options,
  };
}

type BotBooking = typeof botBookings.$inferSelect;

export function formatMyBookingsList(bookings: BotBooking[]): {
  text: string;
  options: Record<string, string>;
} {
  if (bookings.length === 0) {
    return {
      text: 'Você não tem nenhuma reserva futura. Digite "menu" para ver as opções.',
      options: {},
    };
  }

  const options: Record<string, string> = {};
  const lines = bookings.map((booking, index) => {
    const number = String(index + 1);
    options[number] = booking.id;
    return `${number}. ${formatSessionDateTime(booking.classStartsAt)}`;
  });

  return {
    text: [
      'Suas próximas reservas:',
      ...lines,
      '',
      'Responda com o número da reserva para cancelar, ou "menu" para voltar.',
    ].join('\n'),
    options,
  };
}

export const MAIN_MENU_TEXT = [
  'O que você gostaria de fazer?',
  '1. Ver horários disponíveis',
  '2. Ver/cancelar minhas reservas',
  '',
  'Responda com o número da opção.',
].join('\n');
