// DTOs crus da Host API do Momence (https://api.docs.momence.com,
// schema OpenAPI em https://static.momence.com/schema/api-v2-schema.yaml).

export interface HostSessionDto {
  id: number;
  name: string;
  type: string;
  startsAt: string;
  endsAt: string;
  durationInMinutes: number;
  capacity: number | null;
  bookingCount: number;
  teacher: { id: number; firstName: string; lastName: string } | null;
  isCancelled: boolean;
  isDraft: boolean;
  inPersonLocation: { id: number; name: string } | null;
}

export interface HostMemberDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
}

export interface HostMemberSessionDto {
  id: number; // bookingId
  cancelledAt: string | null;
  session: { id: number; name: string; startsAt: string; endsAt: string };
}

export interface HostBoughtMembershipDto {
  id: number;
  eventCreditsLeft: number | null;
  endDate: string;
  membership: { name: string };
}

export interface CompatibleMembershipItem {
  boughtMembership?: {
    id: number;
    eventCreditsLeft: number | null;
    endDate: string;
    membership: { name: string };
  };
  incompatibility?: string;
}

export interface CheckoutPriceItem {
  priceInCurrencyWithTax: number;
}

export interface CheckoutPurchasedItem {
  type: string;
  sessionBookingId: number;
}

export interface Paginated<T> {
  pagination: { page: number; pageSize: number; totalCount: number };
  payload: T[];
}

// Tipos de dominio usados pelo resto do bot (ids convertidos para string
// na borda do cliente, para casar com o schema do banco local).

export interface MomenceSession {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  instructor: string | null;
  /** Infinity quando a aula nao tem limite de capacidade (capacity == null). */
  spotsAvailable: number;
}

export interface MomenceMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}
