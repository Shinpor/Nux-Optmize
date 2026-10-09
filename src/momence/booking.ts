import {
  cancelSessionBooking,
  getCheckoutPrices,
  getCompatibleMemberships,
  submitCheckout,
} from './client.js';

export class MomenceBookingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MomenceBookingUnavailableError';
  }
}

function mapIncompatibilityMessage(reason: string | undefined): string {
  switch (reason) {
    case 'session-bought-membership-no-event-credits-left':
      return 'seus créditos acabaram';
    case 'session-bought-membership-frozen':
      return 'seu plano está congelado';
    default:
      return 'seu plano não é compatível com essa aula';
  }
}

/**
 * Reserva uma sessao para um membro usando o pacote/plano compativel,
 * seguindo o fluxo de checkout do host em 3 chamadas (ver
 * docs/momence-api-notes.md).
 */
export async function bookSessionForMember(params: {
  memberId: number;
  sessionId: number;
}): Promise<{ sessionBookingId: number; membershipName: string }> {
  const items = await getCompatibleMemberships(params);
  const compatible = items.find((item) => !item.incompatibility);

  if (!compatible?.boughtMembership) {
    throw new MomenceBookingUnavailableError(mapIncompatibilityMessage(items[0]?.incompatibility));
  }

  const boughtMembershipId = compatible.boughtMembership.id;

  const { priceInCurrencyWithTax } = await getCheckoutPrices({
    ...params,
    boughtMembershipId,
  });

  const purchased = await submitCheckout({
    ...params,
    boughtMembershipId,
    attemptedPriceInCurrency: priceInCurrencyWithTax,
  });

  return {
    sessionBookingId: purchased.sessionBookingId,
    membershipName: compatible.boughtMembership.membership.name,
  };
}

/**
 * Cancela uma reserva no Momence. isLateCancellation e calculado aqui
 * (aviso ao aluno) com base em LATE_CANCEL_HOURS; o Momence pode ou nao
 * aplicar sua propria regra de cancelamento tardio (a confirmar - ver
 * docs/momence-api-notes.md).
 */
export async function cancelBookingForMember(params: {
  bookingId: number;
  classStartsAt: Date;
  lateCancelHours: number;
}): Promise<{ isLateCancellation: boolean }> {
  const hoursUntilClass = (params.classStartsAt.getTime() - Date.now()) / 3_600_000;
  const isLateCancellation = hoursUntilClass < params.lateCancelHours;

  await cancelSessionBooking({ bookingId: params.bookingId, isLateCancellation });

  return { isLateCancellation };
}

export function isLateCancellation(classStartsAt: Date, lateCancelHours: number): boolean {
  const hoursUntilClass = (classStartsAt.getTime() - Date.now()) / 3_600_000;
  return hoursUntilClass < lateCancelHours;
}
