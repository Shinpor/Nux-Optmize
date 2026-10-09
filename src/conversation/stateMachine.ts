import { db } from '../db/client.js';
import { conversationStates, inboundMessageLog, students } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { ConversationState } from './states.js';
import type { ConversationContext, ConversationStateValue, HandlerContext, HandlerResult } from './states.js';
import { identifyByPhone, handleAwaitingEmail, handleNotFoundGuidance } from './handlers/identification.js';
import { handleMainMenu } from './handlers/mainMenu.js';
import { handleListingClasses, handleConfirmingBooking } from './handlers/bookingFlow.js';
import { handleListingMyBookings, handleConfirmingCancel } from './handlers/cancelFlow.js';
import { MAIN_MENU_TEXT } from './formatting.js';
import { logger } from '../shared/logger.js';

const GLOBAL_RESET_WORDS = new Set(['menu', 'cancelar']);

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
 * em texto livre (menus/respostas do fluxo). Mensagens de template aprovado
 * (confirmacao/lembrete) sao enviadas diretamente pelos handlers via
 * src/whatsapp/outboundMessenger.ts e nao passam por aqui.
 *
 * Idempotencia de webhook: se messageSid ja foi processado, retorna [].
 */
export async function handleInboundMessage(params: {
  whatsappPhone: string;
  text: string;
  messageSid: string;
}): Promise<string[]> {
  const alreadyProcessed = await db
    .select()
    .from(inboundMessageLog)
    .where(eq(inboundMessageLog.twilioMessageSid, params.messageSid))
    .limit(1);

  if (alreadyProcessed.length > 0) {
    logger.info({ messageSid: params.messageSid }, 'Mensagem inbound ja processada, ignorando.');
    return [];
  }

  const student = await getOrCreateStudent(params.whatsappPhone);
  const existingState = await getConversationState(params.whatsappPhone);

  let currentState: ConversationStateValue =
    (existingState?.currentState as ConversationStateValue) ?? ConversationState.START;
  let currentContext: ConversationContext = (existingState?.context as ConversationContext) ?? {};

  const trimmedText = params.text.trim();

  let result: HandlerResult;

  if (!student.momenceCustomerId && currentState !== ConversationState.AWAITING_EMAIL && currentState !== ConversationState.NOT_FOUND_GUIDANCE) {
    result = await identifyByPhone({
      studentId: student.id,
      whatsappPhone: student.whatsappPhone,
      momenceCustomerId: student.momenceCustomerId,
      studentName: student.name,
      text: trimmedText,
      context: currentContext,
    });
  } else if (
    GLOBAL_RESET_WORDS.has(trimmedText.toLowerCase()) &&
    student.momenceCustomerId &&
    currentState !== ConversationState.AWAITING_EMAIL
  ) {
    result = { nextState: ConversationState.MAIN_MENU, nextContext: {}, messages: [MAIN_MENU_TEXT] };
  } else {
    result = await dispatch(currentState, {
      studentId: student.id,
      whatsappPhone: student.whatsappPhone,
      momenceCustomerId: student.momenceCustomerId,
      studentName: student.name,
      text: trimmedText,
      context: currentContext,
    });
  }

  currentState = result.nextState;
  currentContext = result.nextContext;

  await persistState(student.whatsappPhone, currentState, currentContext);
  await db.insert(inboundMessageLog).values({ twilioMessageSid: params.messageSid });

  return result.messages;
}
