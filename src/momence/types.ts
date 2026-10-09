// Tipos provisorios: ajustar conforme a resposta real da API em
// https://api.docs.momence.com (ver docs/momence-api-notes.md).

export interface MomenceSession {
  id: string;
  className: string;
  startsAt: string; // ISO 8601
  instructor?: string;
  spotsAvailable: number;
}

export interface MomenceMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface MomencePackage {
  id: string;
  name: string;
  creditsRemaining: number;
  active: boolean;
}

export interface MomenceBooking {
  id: string;
  sessionId: string;
  memberId: string;
  status: string;
}
