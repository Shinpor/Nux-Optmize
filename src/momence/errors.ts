export class MomenceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'MomenceApiError';
  }
}

export class MomenceAuthError extends MomenceApiError {
  name = 'MomenceAuthError';
}

/** type: err-session-is-full (retornado por POST /host/checkout) */
export class MomenceSessionFullError extends MomenceApiError {
  name = 'MomenceSessionFullError';
}

/** type: err-incompatible-membership */
export class MomenceIncompatibleMembershipError extends MomenceApiError {
  name = 'MomenceIncompatibleMembershipError';
}

/** type: err-payment-failed */
export class MomencePaymentFailedError extends MomenceApiError {
  name = 'MomencePaymentFailedError';
}

interface MomenceErrorBody {
  type?: string;
  message?: string;
}

/**
 * Mapeia erros da API do Momence. Os erros do fluxo de checkout vem com
 * um corpo `{ type, message }` (status 400) - mapeamos por esse campo
 * `type`, nao pelo status HTTP, que e sempre 400 para todos eles.
 */
export function mapMomenceError(status: number, body: unknown): MomenceApiError {
  const type = (body as MomenceErrorBody | undefined)?.type;
  const message = `Momence API respondeu com status ${status}${type ? ` (type=${type})` : ''}`;

  switch (type) {
    case 'err-session-is-full':
      return new MomenceSessionFullError(message, status, body);
    case 'err-incompatible-membership':
      return new MomenceIncompatibleMembershipError(message, status, body);
    case 'err-payment-failed':
      return new MomencePaymentFailedError(message, status, body);
    default:
      if (status === 401 || status === 403) {
        return new MomenceAuthError(message, status, body);
      }
      return new MomenceApiError(message, status, body);
  }
}
