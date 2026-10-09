import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { listUpcomingSessions } from '../../momence/client.js';
import { db } from '../../db/client.js';
import { botBookings } from '../../db/schema.js';
import { and, asc, eq, gt } from 'drizzle-orm';
import { MAIN_MENU_TEXT, formatClassList, formatMyBookingsList } from '../formatting.js';

const LISTING_DAYS_AHEAD = 7;

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
    const bookings = await db
      .select()
      .from(botBookings)
      .where(
        and(
          eq(botBookings.studentId, ctx.studentId),
          eq(botBookings.status, 'CONFIRMED'),
          gt(botBookings.classStartsAt, new Date()),
        ),
      )
      .orderBy(asc(botBookings.classStartsAt));

    const { text, options } = formatMyBookingsList(bookings);

    return {
      nextState: ConversationState.LISTING_MY_BOOKINGS,
      nextContext: { bookingOptions: options },
      messages: [text],
    };
  }

  return {
    nextState: ConversationState.MAIN_MENU,
    nextContext: {},
    messages: ['Não entendi. ' + MAIN_MENU_TEXT],
  };
}
