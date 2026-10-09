import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { listMemberUpcomingSessions } from '../../momence/client.js';
import { bookSessionForMember, MomenceBookingUnavailableError } from '../../momence/booking.js';
import { MomenceSessionFullError } from '../../momence/errors.js';
import { db } from '../../db/client.js';
import { botBookings } from '../../db/schema.js';
import { MAIN_MENU_TEXT, formatSessionDateTime } from '../formatting.js';
import { sendFreeFormReply } from '../../whatsapp/outboundMessenger.js';

type SessionDetails = Record<string, { className: string; startsAtIso: string }>;

export async function handleListingClasses(ctx: HandlerContext): Promise<HandlerResult> {
  const choice = ctx.text.trim();
  const sessionId = ctx.context.classOptions?.[choice];
  const details = sessionId ? (ctx.context.sessionDetails as SessionDetails | undefined)?.[sessionId] : undefined;

  if (!sessionId || !details) {
    return {
      nextState: ConversationState.LISTING_CLASSES,
      nextContext: ctx.context,
      messages: ['Opção inválida. Responda com o número de uma das aulas listadas, ou "menu" para voltar.'],
    };
  }

  return {
    nextState: ConversationState.CONFIRMING_BOOKING,
    nextContext: { ...ctx.context, selectedSessionId: sessionId },
    messages: [
      `Confirmar reserva em "${details.className}" - ${formatSessionDateTime(details.startsAtIso)}?`,
      'Responda SIM para confirmar, ou "menu" para cancelar.',
    ],
  };
}

export async function handleConfirmingBooking(ctx: HandlerContext): Promise<HandlerResult> {
  const answer = ctx.text.trim().toLowerCase();
  const sessionId = ctx.context.selectedSessionId;
  const details = sessionId ? (ctx.context.sessionDetails as SessionDetails | undefined)?.[sessionId] : undefined;

  if (answer !== 'sim' || !sessionId || !details || !ctx.momenceCustomerId) {
    return {
      nextState: ConversationState.CONFIRMING_BOOKING,
      nextContext: ctx.context,
      messages: ['Responda SIM para confirmar a reserva, ou "menu" para cancelar.'],
    };
  }

  const memberId = Number(ctx.momenceCustomerId);
  const numericSessionId = Number(sessionId);

  const existingSessions = await listMemberUpcomingSessions(memberId, { startAfter: new Date() });
  const alreadyBooked = existingSessions.some(
    (item) => item.session.id === numericSessionId && item.cancelledAt === null,
  );

  if (alreadyBooked) {
    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: ['Você já tem uma reserva nessa aula. ' + MAIN_MENU_TEXT],
    };
  }

  try {
    const { sessionBookingId } = await bookSessionForMember({ memberId, sessionId: numericSessionId });

    await db.insert(botBookings).values({
      momenceBookingId: String(sessionBookingId),
      studentId: ctx.studentId,
      momenceSessionId: sessionId,
      className: details.className,
      classStartsAt: new Date(details.startsAtIso),
      status: 'CONFIRMED',
      confirmationSentAt: new Date(),
    });
  } catch (error) {
    if (error instanceof MomenceBookingUnavailableError) {
      return {
        nextState: ConversationState.MAIN_MENU,
        nextContext: {},
        messages: [`Não foi possível reservar: ${error.message}. Fale com a recepção se precisar de ajuda.`, MAIN_MENU_TEXT],
      };
    }
    if (error instanceof MomenceSessionFullError) {
      return {
        nextState: ConversationState.MAIN_MENU,
        nextContext: {},
        messages: ['Essa aula acabou de lotar. Confira os horários de novo. ' + MAIN_MENU_TEXT],
      };
    }
    throw error;
  }

  await sendFreeFormReply(
    ctx.whatsappPhone,
    `Reserva confirmada: "${details.className}" - ${formatSessionDateTime(details.startsAtIso)}. Te esperamos na Nux House! 💪`,
  );

  return {
    nextState: ConversationState.MAIN_MENU,
    nextContext: {},
    messages: [MAIN_MENU_TEXT],
  };
}
