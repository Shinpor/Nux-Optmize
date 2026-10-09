import { db } from '../db/client.js';
import { conversationStates, inboundMessageLog, students } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ConversationState } from './states.js';
import type { ConversationContext, ConversationStateValue, HandlerContext, HandlerResult } from './states.js';
import { identifyByPhone, handleAwaitingEmail, handleNotFoundGuidance } from './handlers/identification.js';
import { handleMainMenu, handleViewBookingsRequest } from './handlers/mainMenu.js';
import { handleListingClasses, handleConfirmingBooking } from './handlers/bookingFlow.js';
import { handleListingMyBookings, handleConfirmingCancel } from './handlers/cancelFlow.js';
import { GENERIC_ERROR_MESSAGE, MAIN_MENU_TEXT } from './formatting.js';
import { logger } from '../shared/logger.js';

const GLOBAL_RESET_WORDS = new Set(['menu', 'voltar']);
const GLOBAL_CANCEL_WORDS = new Set(['cancelar']);

async function getOrCreateStudent(whatsappPhone: string) {
  const [existing] = await db.select().from(students).where(eq(students.whatsappPhone, whatsappPhone)).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(students).values({ whatsappPhone }).returning();
  if (!created) {
    throw new Error(`Falha ao criar registro de aluno para ${whatsappPhone}`);
  }
  return created;
}

async function getConversationState(whatsappPhone: string) {
  const [existing] = await db
    .select()
    .from(conversationStates)
    .where(eq(conversationStates.whatsappPhone, whatsappPhone))
    .limit(1);
  return existing;
}

async function persistState(
  whatsappPhone: string,
  nextState: ConversationStateValue,
  nextContext: ConversationContext,
): Promise<void> {
  await db
    .insert(conversationStates)
    .values({ whatsappPhone, currentState: nextState, context: nextContext, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: conversationStates.whatsappPhone,
      set: { currentState: nextState, context: nextContext, updatedAt: new Date() },
    });
}

/** Marca o bot pausado para esse telefone (coexistencia com atendimento humano). */
export async function pauseBotForPhone(whatsappPhone: string, minutes: number): Promise<void> {
  const pausedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await db
    .insert(conversationStates)
    .values({
      whatsappPhone,
      currentState: ConversationState.MAIN_MENU,
      context: {},
      botPausedUntil: pausedUntil,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: conversationStates.whatsappPhone,
      set: { botPausedUntil: pausedUntil, updatedAt: new Date() },
    });
}

function dispatch(state: ConversationStateValue, ctx: HandlerContext): Promise<HandlerResult> {
  switch (state) {
    case ConversationState.AWAITING_EMAIL:
      return handleAwaitingEmail(ctx);
    case ConversationState.NOT_FOUND_GUIDANCE:
      return handleNotFoundGuidance(ctx);
    case ConversationState.MAIN_MENU:
      return handleMainMenu(ctx);
    case ConversationState.LISTING_CLASSES:
      return handleListingClasses(ctx);
    case ConversationState.CONFIRMING_BOOKING:
      return handleConfirmingBooking(ctx);
    case ConversationState.LISTING_MY_BOOKINGS:
      return handleListingMyBookings(ctx);
    case ConversationState.CONFIRMING_CANCEL:
      return handleConfirmingCancel(ctx);
    default:
      return Promise.resolve({
        nextState: ConversationState.MAIN_MENU,
        nextContext: {},
        messages: [MAIN_MENU_TEXT],
      });
  }
}

/**
 * Processa uma mensagem inbound de um aluno e retorna as mensagens de resposta
 * em texto livre. Confirmacao/lembrete via template sao enviados diretamente
 * pelos handlers/jobs via src/whatsapp/outboundMessenger.ts.
 *
 * Idempotencia: grava o whatsappMessageId no INICIO via ON CONFLICT DO NOTHING;
 * se a linha ja existir (reenvio da Meta), retorna [] sem reprocessar.
 */
export async function handleInboundMessage(params: {
  whatsappPhone: string;
  text: string;
  messageId: string;
}): Promise<string[]> {
  const inserted = await db
    .insert(inboundMessageLog)
    .values({ whatsappMessageId: params.messageId })
    .onConflictDoNothing()
    .returning();

  if (inserted.length === 0) {
    logger.info({ messageId: params.messageId }, 'Mensagem inbound ja processada, ignorando.');
    return [];
  }

  const student = await getOrCreateStudent(params.whatsappPhone);
  const existingState = await getConversationState(params.whatsappPhone);

  if (existingState?.botPausedUntil && existingState.botPausedUntil.getTime() > Date.now()) {
    logger.info({ whatsappPhone: params.whatsappPhone }, 'Bot pausado (atendimento humano), ignorando mensagem.');
    return [];
  }

  const currentState: ConversationStateValue =
    (existingState?.currentState as ConversationStateValue) ?? ConversationState.START;
  const currentContext: ConversationContext = (existingState?.context as ConversationContext) ?? {};

  const trimmedText = params.text.trim();
  const handlerCtx: HandlerContext = {
    studentId: student.id,
    whatsappPhone: student.whatsappPhone,
    momenceCustomerId: student.momenceCustomerId,
    studentName: student.name,
    text: trimmedText,
    context: currentContext,
  };

  let result: HandlerResult;

  try {
    if (
      !student.momenceCustomerId &&
      currentState !== ConversationState.AWAITING_EMAIL &&
      currentState !== ConversationState.NOT_FOUND_GUIDANCE
    ) {
      result = await identifyByPhone(handlerCtx);
    } else if (
      GLOBAL_RESET_WORDS.has(trimmedText.toLowerCase()) &&
      student.momenceCustomerId &&
      currentState !== ConversationState.AWAITING_EMAIL
    ) {
      result = { nextState: ConversationState.MAIN_MENU, nextContext: {}, messages: [MAIN_MENU_TEXT] };
    } else if (
      GLOBAL_CANCEL_WORDS.has(trimmedText.toLowerCase()) &&
      student.momenceCustomerId &&
      currentState !== ConversationState.AWAITING_EMAIL
    ) {
      result = await handleViewBookingsRequest(handlerCtx);
    } else {
      result = await dispatch(currentState, handlerCtx);
    }
  } catch (error) {
    logger.error({ error, whatsappPhone: params.whatsappPhone }, 'Erro ao processar mensagem inbound');
    await persistState(student.whatsappPhone, currentState, currentContext);
    return [GENERIC_ERROR_MESSAGE];
  }

  await persistState(student.whatsappPhone, result.nextState, result.nextContext);

  return result.messages;
}
