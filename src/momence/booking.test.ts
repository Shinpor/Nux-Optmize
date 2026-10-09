import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as client from './client.js';
import { bookSessionForMember, cancelBookingForMember, isLateCancellation } from './booking.js';
import { MomenceBookingUnavailableError } from './booking.js';
import { MomenceSessionFullError } from './errors.js';

vi.mock('./client.js', () => ({
  getCompatibleMemberships: vi.fn(),
  getCheckoutPrices: vi.fn(),
  submitCheckout: vi.fn(),
  cancelSessionBooking: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('bookSessionForMember', () => {
  it('reserva com sucesso quando ha um item compativel', async () => {
    vi.mocked(client.getCompatibleMemberships).mockResolvedValue([
      {
        boughtMembership: { id: 10, eventCreditsLeft: 5, endDate: '2026-12-31', membership: { name: 'Pacote 10 aulas' } },
      },
    ]);
    vi.mocked(client.getCheckoutPrices).mockResolvedValue({ priceInCurrencyWithTax: 0 });
    vi.mocked(client.submitCheckout).mockResolvedValue({ type: 'session', sessionBookingId: 999 });

    const result = await bookSessionForMember({ memberId: 1, sessionId: 2 });

    expect(result).toEqual({ sessionBookingId: 999, membershipName: 'Pacote 10 aulas' });
    expect(client.submitCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ boughtMembershipId: 10, attemptedPriceInCurrency: 0 }),
    );
  });

  it('lanca MomenceBookingUnavailableError quando nenhum item e compativel', async () => {
    vi.mocked(client.getCompatibleMemberships).mockResolvedValue([
      { incompatibility: 'session-bought-membership-no-event-credits-left' },
    ]);

    await expect(bookSessionForMember({ memberId: 1, sessionId: 2 })).rejects.toThrow(
      MomenceBookingUnavailableError,
    );
  });

  it('propaga MomenceSessionFullError vindo do checkout', async () => {
    vi.mocked(client.getCompatibleMemberships).mockResolvedValue([
      { boughtMembership: { id: 10, eventCreditsLeft: 5, endDate: '2026-12-31', membership: { name: 'Pacote' } } },
    ]);
    vi.mocked(client.getCheckoutPrices).mockResolvedValue({ priceInCurrencyWithTax: 0 });
    vi.mocked(client.submitCheckout).mockRejectedValue(new MomenceSessionFullError('full', 400, { type: 'err-session-is-full' }));

    await expect(bookSessionForMember({ memberId: 1, sessionId: 2 })).rejects.toBeInstanceOf(MomenceSessionFullError);
  });
});

describe('cancelBookingForMember / isLateCancellation', () => {
  it('nao marca como tardio quando faltam mais horas que o limite', async () => {
    const classStartsAt = new Date(Date.now() + 48 * 3_600_000);
    expect(isLateCancellation(classStartsAt, 12)).toBe(false);

    const result = await cancelBookingForMember({ bookingId: 1, classStartsAt, lateCancelHours: 12 });
    expect(result.isLateCancellation).toBe(false);
    expect(client.cancelSessionBooking).toHaveBeenCalledWith({ bookingId: 1, isLateCancellation: false });
  });

  it('marca como tardio quando faltam menos horas que o limite', async () => {
    const classStartsAt = new Date(Date.now() + 2 * 3_600_000);
    expect(isLateCancellation(classStartsAt, 12)).toBe(true);

    const result = await cancelBookingForMember({ bookingId: 1, classStartsAt, lateCancelHours: 12 });
    expect(result.isLateCancellation).toBe(true);
    expect(client.cancelSessionBooking).toHaveBeenCalledWith({ bookingId: 1, isLateCancellation: true });
  });
});
