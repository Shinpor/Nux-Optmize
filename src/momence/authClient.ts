import { loadEnv } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { MomenceAuthError } from './errors.js';

const env = loadEnv();

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

let cachedToken: CachedToken | undefined;

// Margem de seguranca para renovar o token antes de expirar de fato.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

function basicAuthHeader(): string {
  const raw = `${env.MOMENCE_CLIENT_ID}:${env.MOMENCE_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

async function requestToken(body: URLSearchParams): Promise<CachedToken> {
  const response = await fetch(`${env.MOMENCE_API_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(),
    },
    body,
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => undefined);
    logger.error({ status: response.status, body: responseBody }, 'Falha ao autenticar com a API do Momence');
    throw new MomenceAuthError('Falha ao autenticar com a API do Momence', response.status, responseBody);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

function loginWithPassword(): Promise<CachedToken> {
  return requestToken(
    new URLSearchParams({
      grant_type: 'password',
      username: env.MOMENCE_USERNAME,
      password: env.MOMENCE_PASSWORD,
    }),
  );
}

function refreshAccessToken(refreshToken: string): Promise<CachedToken> {
  return requestToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  );
}

/**
 * Retorna um access token valido. Usa cache em memoria e renova via
 * refresh_token quando expirado; se a renovacao falhar, faz login
 * completo de novo com usuario/senha.
 */
export async function getAccessToken(opts?: { forceRefresh?: boolean }): Promise<string> {
  const now = Date.now();

  if (!opts?.forceRefresh && cachedToken && cachedToken.expiresAt - EXPIRY_SAFETY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  if (cachedToken?.refreshToken) {
    try {
      cachedToken = await refreshAccessToken(cachedToken.refreshToken);
      return cachedToken.accessToken;
    } catch (error) {
      logger.warn({ error }, 'Falha ao renovar token do Momence via refresh_token, fazendo login completo');
    }
  }

  cachedToken = await loginWithPassword();
  return cachedToken.accessToken;
}

export function resetTokenCacheForTests(): void {
  cachedToken = undefined;
}
