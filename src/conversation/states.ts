export const ConversationState = {
  START: 'START',
  IDENTIFYING_BY_PHONE: 'IDENTIFYING_BY_PHONE',
  AWAITING_EMAIL: 'AWAITING_EMAIL',
  NOT_FOUND_GUIDANCE: 'NOT_FOUND_GUIDANCE',
  MAIN_MENU: 'MAIN_MENU',
  LISTING_CLASSES: 'LISTING_CLASSES',
  SELECTING_CLASS_FOR_BOOKING: 'SELECTING_CLASS_FOR_BOOKING',
  CONFIRMING_BOOKING: 'CONFIRMING_BOOKING',
  BOOKING_DONE: 'BOOKING_DONE',
  LISTING_MY_BOOKINGS: 'LISTING_MY_BOOKINGS',
  CONFIRMING_CANCEL: 'CONFIRMING_CANCEL',
  CANCEL_DONE: 'CANCEL_DONE',
} as const;

export type ConversationStateValue =
  (typeof ConversationState)[keyof typeof ConversationState];

export interface ConversationContext {
  // Mapeia numero exibido ao aluno -> momence session id (fluxo de reserva/listagem)
  classOptions?: Record<string, string>;
  // Detalhes da sessao (para exibir resumo/confirmacao), por momence session id
  sessionDetails?: Record<string, { className: string; startsAtIso: string }>;
  // Mapeia numero exibido ao aluno -> momence booking id (fluxo de cancelamento)
  bookingOptions?: Record<string, string>;
  // Detalhes da reserva (para exibir resumo/confirmacao), por momence booking id
  bookingDetails?: Record<string, { className: string; startsAtIso: string }>;
  // Sessao escolhida durante o fluxo de reserva, antes da confirmacao final
  selectedSessionId?: string;
  // Reserva escolhida durante o fluxo de cancelamento, antes da confirmacao final
  selectedBookingId?: string;
  [key: string]: unknown;
}

export interface HandlerContext {
  studentId: string;
  whatsappPhone: string;
  momenceCustomerId: string | null;
  studentName: string | null;
  text: string;
  context: ConversationContext;
}

export interface HandlerResult {
  nextState: ConversationStateValue;
  nextContext: ConversationContext;
  messages: string[];
}
