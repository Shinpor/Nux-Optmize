import { loadEnv } from '../config/env.js';
import { getAccessToken } from './authClient.js';
import { mapMomenceError } from './errors.js';
import type {
  MomenceBooking,
  MomenceMember,
  MomencePackage,
  MomenceSession,
} from './types.js';

const env = loadEnv();

/**
 * IMPORTANTE: os caminhos de endpoint abaixo (/sessions, /members, /bookings, ...)
 * sao provisorios. Nao foi possivel acessar https://api.docs.momence.com neste
 * ambiente (bloqueio de rede) para confirmar os nomes reais da Host API.
 * Antes de usar em produção, confirme cada endpoint contra a doc oficial e
 * ajuste aqui + em docs/momence-api-notes.md.
 */

async function momenceFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${env.MOMENCE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw mapMomenceError(response.status, body);
  }

  return (await response.json()) as T;
}

export async function listUpcomingSessions(params: {
  fromDate: Date;
  toDate: Date;
}): Promise<MomenceSession[]> {
  const query = new URLSearchParams({
    from: params.fromDate.toISOString(),
    to: params.toDate.toISOString(),
    ...(env.MOMENCE_HOST_ID ? { hostId: env.MOMENCE_HOST_ID } : {}),
  });
  return momenceFetch<MomenceSession[]>(`/sessions?${query.toString()}`);
}

export async function findMemberByPhoneOrEmail(params: {
  phone?: string;
  email?: string;
}): Promise<MomenceMember | null> {
  const query = new URLSearchParams();
  if (params.phone) query.set('phone', params.phone);
  if (params.email) query.set('email', params.email);

  try {
    const members = await momenceFetch<MomenceMember[]>(`/members?${query.toString()}`);
    return members[0] ?? null;
  } catch (error) {
    if ((error as { name?: string }).name === 'MomenceNotFoundError') {
      return null;
    }
    throw error;
  }
}

export async function getMemberActivePackages(memberId: string): Promise<MomencePackage[]> {
  const packages = await momenceFetch<MomencePackage[]>(`/members/${memberId}/packages`);
  return packages.filter((pkg) => pkg.active && pkg.creditsRemaining > 0);
}

export async function createBooking(params: {
  memberId: string;
  sessionId: string;
}): Promise<MomenceBooking> {
  return momenceFetch<MomenceBooking>('/bookings', {
    method: 'POST',
    body: JSON.stringify({ memberId: params.memberId, sessionId: params.sessionId }),
  });
}

export async function cancelBooking(params: { bookingId: string }): Promise<void> {
  await momenceFetch<void>(`/bookings/${params.bookingId}/cancel`, {
    method: 'POST',
  });
}
