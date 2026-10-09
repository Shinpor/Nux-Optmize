import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { createBooking, getMemberActivePackages } from '../../momence/client.js';
import { db } from '../../db/client.js';
import { botBookings } from '../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { MAIN_MENU_TEXT, formatSessionDateTime } from '../formatting.js';
import { sendApprovedTemplate } from '../../whatsapp/outboundMessenger.js';
import { bookingConfirmationVariables } from '../../whatsapp/templates.js';

export async function handleListingClasses(ctx: HandlerContext): Promise<HandlerResult> {
  const choice = ctx.text.trim();
  const sessionId = ctx.context.classOptions?.[choice];
  const details = sessionId
    ? (ctx.context.sessionDetails as Record<string, { className: string; startsAtIso: string }> | undefined)?.[sessionId]
    : undefined;

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
  const details = sessionId
    ? (ctx.context.sessionDetails as Record<string, { className: string; startsAtIso: string }> | undefined)?.[sessionId]
    : undefined;

  if (answer !== 'sim' || !sessionId || !details || !ctx.momenceCustomerId) {
    return {
      nextState: ConversationState.CONFIRMING_BOOKING,
      nextContext: ctx.context,
      messages: ['Responda SIM para confirmar a reserva, ou "menu" para cancelar.'],
    };
  }

  const activePackages = await getMemberActivePackages(ctx.momenceCustomerId);
  if (activePackages.length === 0) {
    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: [
        'Você não tem créditos ou pacote ativo para reservar essa aula. Fale com a recepção para renovar seu plano.',
        MAIN_MENU_TEXT,
      ],
    };
  }

  const existing = await db
    .select()
    .from(botBookings)
    .where(
      and(
        eq(botBookings.studentId, ctx.studentId),
        eq(botBookings.momenceSessionId, sessionId),
        eq(botBookings.status, 'CONFIRMED'),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    const booking = await createBooking({ memberId: ctx.momenceCustomerId, sessionId });
    await db.insert(botBookings).values({
      momenceBookingId: booking.id,
      studentId: ctx.studentId,
      momenceSessionId: sessionId,
      classStartsAt: new Date(details.startsAtIso),
      status: 'CONFIRMED',
      confirmationSentAt: new Date(),
    });
  }

  await sendApprovedTemplate(
    ctx.whatsappPhone,
    'BOOKING_CONFIRMATION',
    bookingConfirmationVariables({
      studentName: ctx.studentName ?? 'aluno(a)',
      className: details.className,
      startsAtFormatted: formatSessionDateTime(details.startsAtIso),
    }),
  );

  return {
    nextState: ConversationState.MAIN_MENU,
    nextContext: {},
    messages: [MAIN_MENU_TEXT],
  };
}
