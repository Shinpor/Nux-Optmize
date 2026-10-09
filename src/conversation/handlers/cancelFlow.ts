import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { cancelBooking } from '../../momence/client.js';
import { db } from '../../db/client.js';
import { botBookings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { MAIN_MENU_TEXT, formatSessionDateTime } from '../formatting.js';

export async function handleListingMyBookings(ctx: HandlerContext): Promise<HandlerResult> {
  const choice = ctx.text.trim();
  const bookingId = ctx.context.bookingOptions?.[choice];

  if (!bookingId) {
    return {
      nextState: ConversationState.LISTING_MY_BOOKINGS,
      nextContext: ctx.context,
      messages: ['Opção inválida. Responda com o número de uma das reservas listadas, ou "menu" para voltar.'],
    };
  }

  const [booking] = await db.select().from(botBookings).where(eq(botBookings.id, bookingId)).limit(1);
  if (!booking) {
    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: ['Essa reserva não foi encontrada. ' + MAIN_MENU_TEXT],
    };
  }

  return {
    nextState: ConversationState.CONFIRMING_CANCEL,
    nextContext: { ...ctx.context, selectedBookingId: bookingId },
    messages: [
      `Confirmar cancelamento da reserva de ${formatSessionDateTime(booking.classStartsAt)}?`,
      'Responda SIM para cancelar, ou "menu" para voltar.',
    ],
  };
}

export async function handleConfirmingCancel(ctx: HandlerContext): Promise<HandlerResult> {
  const answer = ctx.text.trim().toLowerCase();
  const bookingId = ctx.context.selectedBookingId;

  if (answer !== 'sim' || !bookingId) {
    return {
      nextState: ConversationState.CONFIRMING_CANCEL,
      nextContext: ctx.context,
      messages: ['Responda SIM para confirmar o cancelamento, ou "menu" para voltar.'],
    };
  }

  const [booking] = await db.select().from(botBookings).where(eq(botBookings.id, bookingId)).limit(1);
  if (!booking) {
    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: ['Essa reserva não foi encontrada. ' + MAIN_MENU_TEXT],
    };
  }

  await cancelBooking({ bookingId: booking.momenceBookingId });
  await db
    .update(botBookings)
    .set({ status: 'CANCELLED', cancelledAt: new Date() })
    .where(eq(botBookings.id, bookingId));

  return {
    nextState: ConversationState.MAIN_MENU,
    nextContext: {},
    messages: ['Reserva cancelada com sucesso. ' + MAIN_MENU_TEXT],
  };
}
