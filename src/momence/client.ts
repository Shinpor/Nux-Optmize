import { loadEnv } from '../config/env.js';
import { getAccessToken } from './authClient.js';
import { mapMomenceError } from './errors.js';
import type {
  CheckoutPriceItem,
  CheckoutPurchasedItem,
  CompatibleMembershipItem,
  HostBoughtMembershipDto,
  HostMemberDto,
  HostMemberSessionDto,
  HostSessionDto,
  MomenceSession,
  Paginated,
} from './types.js';

const env = loadEnv();

async function momenceFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const call = async (token: string) =>
    fetch(`${env.MOMENCE_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

  let response = await call(await getAccessToken());

  if (response.status === 401) {
    response = await call(await getAccessToken({ forceRefresh: true }));
  }

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw mapMomenceError(response.status, body);
  }

  return (await response.json()) as T;
}

const SESSIONS_PAGE_SIZE = 200;

function toMomenceSession(dto: HostSessionDto): MomenceSession {
  const capacity = dto.capacity;
  return {
    id: String(dto.id),
    className: dto.name,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    instructor: dto.teacher ? `${dto.teacher.firstName} ${dto.teacher.lastName}` : null,
    spotsAvailable: capacity == null ? Infinity : capacity - dto.bookingCount,
  };
}

export async function listUpcomingSessions(params: {
  fromDate: Date;
  toDate: Date;
}): Promise<MomenceSession[]> {
  const sessions: HostSessionDto[] = [];
  let page = 0;

  while (true) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(SESSIONS_PAGE_SIZE),
      sortBy: 'startsAt',
      sortOrder: 'ASC',
      startAfter: params.fromDate.toISOString(),
      startBefore: params.toDate.toISOString(),
    });

    const result = await momenceFetch<Paginated<HostSessionDto>>(`/host/sessions?${query.toString()}`);
    sessions.push(...result.payload);

    const fetchedSoFar = (page + 1) * SESSIONS_PAGE_SIZE;
    if (fetchedSoFar >= result.pagination.totalCount) break;
    page += 1;
  }

  return sessions.filter((session) => !session.isCancelled && !session.isDraft).map(toMomenceSession);
}

export async function searchMembers(query: string): Promise<HostMemberDto[]> {
  const result = await momenceFetch<Paginated<HostMemberDto>>('/host/members/list', {
    method: 'POST',
    body: JSON.stringify({ page: 0, pageSize: 20, query }),
  });
  return result.payload;
}

export async function getActiveBoughtMemberships(memberId: number): Promise<HostBoughtMembershipDto[]> {
  const result = await momenceFetch<Paginated<HostBoughtMembershipDto>>(
    `/host/members/${memberId}/bought-memberships/active?page=0&pageSize=50`,
  );
  return result.payload;
}

export async function getCompatibleMemberships(params: {
  memberId: number;
  sessionId: number;
}): Promise<CompatibleMembershipItem[]> {
  const result = await momenceFetch<{ items: CompatibleMembershipItem[] }>(
    '/host/checkout/compatible-memberships',
    {
      method: 'POST',
      body: JSON.stringify({
        memberId: params.memberId,
        items: [{ id: '1', type: 'session', sessionId: params.sessionId }],
      }),
    },
  );
  return result.items;
}

export async function getCheckoutPrices(params: {
  memberId: number;
  sessionId: number;
  boughtMembershipId: number;
}): Promise<CheckoutPriceItem> {
  const result = await momenceFetch<{ itemsWithPrices: CheckoutPriceItem[] }>('/host/checkout/prices', {
    method: 'POST',
    body: JSON.stringify({
      memberId: params.memberId,
      items: [{ id: '1', type: 'session', sessionId: params.sessionId }],
      paymentMethods: [{ id: '1', type: 'membership', boughtMembershipId: params.boughtMembershipId }],
    }),
  });
  const [firstItem] = result.itemsWithPrices;
  if (!firstItem) {
    throw new Error('Momence nao retornou preco para o checkout.');
  }
  return firstItem;
}

export async function submitCheckout(params: {
  memberId: number;
  sessionId: number;
  boughtMembershipId: number;
  attemptedPriceInCurrency: number;
}): Promise<CheckoutPurchasedItem> {
  const result = await momenceFetch<{ purchasedItems: CheckoutPurchasedItem[] }>('/host/checkout', {
    method: 'POST',
    body: JSON.stringify({
      memberId: params.memberId,
      items: [
        {
          id: '1',
          type: 'session',
          sessionId: params.sessionId,
          attemptedPriceInCurrency: params.attemptedPriceInCurrency,
        },
      ],
      paymentMethods: [{ id: '1', type: 'membership', boughtMembershipId: params.boughtMembershipId }],
    }),
  });
  const [purchased] = result.purchasedItems;
  if (!purchased) {
    throw new Error('Momence nao retornou o item comprado no checkout.');
  }
  return purchased;
}

export async function cancelSessionBooking(params: {
  bookingId: number;
  isLateCancellation: boolean;
}): Promise<void> {
  await momenceFetch<void>(`/host/session-bookings/${params.bookingId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      refund: true,
      disableNotifications: false,
      isLateCancellation: params.isLateCancellation,
    }),
  });
}

export async function listMemberUpcomingSessions(
  memberId: number,
  params: { startAfter: Date },
): Promise<HostMemberSessionDto[]> {
  const query = new URLSearchParams({
    page: '0',
    pageSize: '50',
    sortBy: 'startsAt',
    sortOrder: 'ASC',
    startAfter: params.startAfter.toISOString(),
  });
  const result = await momenceFetch<Paginated<HostMemberSessionDto>>(
    `/host/members/${memberId}/sessions?${query.toString()}`,
  );
  return result.payload;
}
