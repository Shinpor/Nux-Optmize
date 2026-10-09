import { describe, expect, it } from 'vitest';
import { formatClassList, formatMyBookingsList } from './formatting.js';
import type { MomenceSession } from '../momence/types.js';
import type { botBookings } from '../db/schema.js';

type BotBooking = typeof botBookings.$inferSelect;

describe('formatClassList', () => {
  it('retorna mensagem de vazio quando nao ha sessoes', () => {
    const { text, options } = formatClassList([]);
    expect(text).toContain('Não encontrei aulas');
    expect(options).toEqual({});
  });

  it('numera as sessoes e mapeia numero -> id', () => {
    const sessions: MomenceSession[] = [
      { id: 'sess-1', className: 'Lagree 50', startsAt: '2026-01-01T10:00:00Z', spotsAvailable: 3 },
      { id: 'sess-2', className: 'Lagree HIIT', startsAt: '2026-01-02T10:00:00Z', spotsAvailable: 1 },
    ];

    const { text, options } = formatClassList(sessions);

    expect(options).toEqual({ '1': 'sess-1', '2': 'sess-2' });
    expect(text).toContain('1. Lagree 50');
    expect(text).toContain('2. Lagree HIIT');
  });
});

describe('formatMyBookingsList', () => {
  it('retorna mensagem de vazio quando nao ha reservas', () => {
    const { text, options } = formatMyBookingsList([]);
    expect(text).toContain('não tem nenhuma reserva');
    expect(options).toEqual({});
  });

  it('numera as reservas e mapeia numero -> id local', () => {
    const bookings: BotBooking[] = [
      {
        id: 'booking-1',
        momenceBookingId: 'm-1',
        studentId: 'student-1',
        momenceSessionId: 'sess-1',
        classStartsAt: new Date('2026-01-01T10:00:00Z'),
        status: 'CONFIRMED',
        confirmationSentAt: null,
        reminderSentAt: null,
        reminderAttempts: 0,
        createdAt: new Date(),
        cancelledAt: null,
      },
    ];

    const { options } = formatMyBookingsList(bookings);
    expect(options).toEqual({ '1': 'booking-1' });
  });
});
