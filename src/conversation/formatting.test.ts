import { describe, expect, it } from 'vitest';
import { formatClassList, formatMyBookingsList } from './formatting.js';
import type { MomenceSession } from '../momence/types.js';
import type { DisplayBooking } from './formatting.js';

describe('formatClassList', () => {
  it('retorna mensagem de vazio quando nao ha sessoes', () => {
    const { text, options } = formatClassList([]);
    expect(text).toContain('Não encontrei aulas');
    expect(options).toEqual({});
  });

  it('numera as sessoes e mapeia numero -> id', () => {
    const sessions: MomenceSession[] = [
      { id: 'sess-1', className: 'Lagree 50', startsAt: '2026-01-01T10:00:00Z', endsAt: '2026-01-01T10:50:00Z', instructor: null, spotsAvailable: 3 },
      { id: 'sess-2', className: 'Lagree HIIT', startsAt: '2026-01-02T10:00:00Z', endsAt: '2026-01-02T10:50:00Z', instructor: null, spotsAvailable: 1 },
    ];

    const { text, options } = formatClassList(sessions);

    expect(options).toEqual({ '1': 'sess-1', '2': 'sess-2' });
    expect(text).toContain('1. Lagree 50');
    expect(text).toContain('2. Lagree HIIT');
  });

  it('exibe "vagas disponiveis" quando a capacidade e ilimitada (Infinity)', () => {
    const sessions: MomenceSession[] = [
      { id: 'sess-1', className: 'Lagree 50', startsAt: '2026-01-01T10:00:00Z', endsAt: '2026-01-01T10:50:00Z', instructor: null, spotsAvailable: Infinity },
    ];

    const { text } = formatClassList(sessions);
    expect(text).toContain('vagas disponíveis');
  });
});

describe('formatMyBookingsList', () => {
  it('retorna mensagem de vazio quando nao ha reservas', () => {
    const { text, options } = formatMyBookingsList([]);
    expect(text).toContain('não tem nenhuma reserva');
    expect(options).toEqual({});
  });

  it('numera as reservas e mapeia numero -> id do Momence', () => {
    const bookings: DisplayBooking[] = [
      { id: '555', className: 'Lagree 50', startsAt: '2026-01-01T10:00:00Z' },
    ];

    const { options, text } = formatMyBookingsList(bookings);
    expect(options).toEqual({ '1': '555' });
    expect(text).toContain('Lagree 50');
  });
});
