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

export class MomenceNotFoundError extends MomenceApiError {
  name = 'MomenceNotFoundError';
}

export class MomenceNoCreditError extends MomenceApiError {
  name = 'MomenceNoCreditError';
}

export class MomenceSessionFullError extends MomenceApiError {
  name = 'MomenceSessionFullError';
}

/**
 * Mapeia status HTTP para erros de dominio tipados.
 * Os codigos exatos usados pela API Momence para "sem credito" e "aula cheia"
 * (hoje assumidos como 422/409) precisam ser confirmados contra a doc oficial
 * e contra o corpo real de erro retornado (ver docs/momence-api-notes.md).
 */
export function mapMomenceError(status: number, body: unknown): MomenceApiError {
  const message = `Momence API respondeu com status ${status}`;

  if (status === 401 || status === 403) {
    return new MomenceAuthError(message, status, body);
  }
  if (status === 404) {
    return new MomenceNotFoundError(message, status, body);
  }
  if (status === 409) {
    return new MomenceSessionFullError(message, status, body);
  }
  if (status === 422) {
    return new MomenceNoCreditError(message, status, body);
  }
  return new MomenceApiError(message, status, body);
}
