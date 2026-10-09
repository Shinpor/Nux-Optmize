import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { listUpcomingSessions, listMemberUpcomingSessions } from '../../momence/client.js';
import { MAIN_MENU_TEXT, formatClassList, formatMyBookingsList } from '../formatting.js';
import type { DisplayBooking } from '../formatting.js';

const LISTING_DAYS_AHEAD = 7;

export async function handleViewBookingsRequest(ctx: HandlerContext): Promise<HandlerResult> {
  if (!ctx.momenceCustomerId) {
    return { nextState: ConversationState.MAIN_MENU, nextContext: {}, messages: [MAIN_MENU_TEXT] };
  }

  const memberSessions = await listMemberUpcomingSessions(Number(ctx.momenceCustomerId), {
    startAfter: new Date(),
  });

  const bookings: DisplayBooking[] = memberSessions
    .filter((item) => item.cancelledAt === null)
    .map((item) => ({
      id: String(item.id),
      className: item.session.name,
      startsAt: item.session.startsAt,
    }));

  const { text, options } = formatMyBookingsList(bookings);
  const bookingDetails = Object.fromEntries(
    bookings.map((booking) => [booking.id, { className: booking.className, startsAtIso: booking.startsAt }]),
  );

  return {
    nextState: ConversationState.LISTING_MY_BOOKINGS,
    nextContext: { bookingOptions: options, bookingDetails },
    messages: [text],
  };
}

export async function handleMainMenu(ctx: HandlerContext): Promise<HandlerResult> {
  const choice = ctx.text.trim();

  if (choice === '1') {
    const now = new Date();
    const toDate = new Date(now.getTime() + LISTING_DAYS_AHEAD * 24 * 60 * 60 * 1000);
    const sessions = await listUpcomingSessions({ fromDate: now, toDate });
    const available = sessions.filter((session) => session.spotsAvailable > 0);

    const { text, options } = formatClassList(available);
    const sessionDetails = Object.fromEntries(
      available.map((session) => [
        session.id,
        { className: session.className, startsAtIso: session.startsAt },
      ]),
    );

    return {
      nextState: ConversationState.LISTING_CLASSES,
      nextContext: { classOptions: options, sessionDetails },
      messages: [text],
    };
  }

  if (choice === '2') {
    return handleViewBookingsRequest(ctx);
  }

  return {
    nextState: ConversationState.MAIN_MENU,
    nextContext: {},
    messages: ['Não entendi. ' + MAIN_MENU_TEXT],
  };
}
