import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { cancelBookingForMember, isLateCancellation } from '../../momence/booking.js';
import { db } from '../../db/client.js';
import { botBookings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { loadEnv } from '../../config/env.js';
import { MAIN_MENU_TEXT, formatSessionDateTime } from '../formatting.js';

const env = loadEnv();

type BookingDetails = Record<string, { className: string; startsAtIso: string }>;

export async function handleListingMyBookings(ctx: HandlerContext): Promise<HandlerResult> {
  const choice = ctx.text.trim();
  const bookingId = ctx.context.bookingOptions?.[choice];
  const details = bookingId ? (ctx.context.bookingDetails as BookingDetails | undefined)?.[bookingId] : undefined;

  if (!bookingId || !details) {
    return {
      nextState: ConversationState.LISTING_MY_BOOKINGS,
      nextContext: ctx.context,
      messages: ['Opção inválida. Responda com o número de uma das reservas listadas, ou "menu" para voltar.'],
    };
  }

  const lateWarning = isLateCancellation(new Date(details.startsAtIso), env.LATE_CANCEL_HOURS)
    ? '\n⚠️ Atenção: faltam poucas horas para essa aula, você pode perder o crédito ao cancelar agora.'
    : '';

  return {
    nextState: ConversationState.CONFIRMING_CANCEL,
    nextContext: { ...ctx.context, selectedBookingId: bookingId },
    messages: [
      `Confirmar cancelamento da reserva "${details.className}" - ${formatSessionDateTime(details.startsAtIso)}?${lateWarning}`,
      'Responda SIM para cancelar, ou "menu" para voltar.',
    ],
  };
}

export async function handleConfirmingCancel(ctx: HandlerContext): Promise<HandlerResult> {
  const answer = ctx.text.trim().toLowerCase();
  const bookingId = ctx.context.selectedBookingId;
  const details = bookingId ? (ctx.context.bookingDetails as BookingDetails | undefined)?.[bookingId] : undefined;

  if (answer !== 'sim' || !bookingId || !details) {
    return {
      nextState: ConversationState.CONFIRMING_CANCEL,
      nextContext: ctx.context,
      messages: ['Responda SIM para confirmar o cancelamento, ou "menu" para voltar.'],
    };
  }

  await cancelBookingForMember({
    bookingId: Number(bookingId),
    classStartsAt: new Date(details.startsAtIso),
    lateCancelHours: env.LATE_CANCEL_HOURS,
  });

  await db
    .update(botBookings)
    .set({ status: 'CANCELLED', cancelledAt: new Date() })
    .where(eq(botBookings.momenceBookingId, bookingId));

  return {
    nextState: ConversationState.MAIN_MENU,
    nextContext: {},
    messages: ['Reserva cancelada com sucesso. ' + MAIN_MENU_TEXT],
  };
}
