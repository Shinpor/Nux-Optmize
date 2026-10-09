import { loadEnv } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { MomenceAuthError } from './errors.js';

const env = loadEnv();

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cachedToken: CachedToken | undefined;

// Margem de seguranca para renovar o token antes de expirar de fato.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

/**
 * Retorna um access token valido, renovando via OAuth2 client_credentials
 * quando necessario. A URL/grant_type abaixo sao os assumidos para a API
 * Momence (client_credentials) - confirmar contra api.docs.momence.com.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - EXPIRY_SAFETY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  const response = await fetch(env.MOMENCE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.MOMENCE_CLIENT_ID,
      client_secret: env.MOMENCE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    logger.error({ status: response.status, body }, 'Falha ao obter token OAuth2 do Momence');
    throw new MomenceAuthError('Falha ao autenticar com a API do Momence', response.status, body);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

export function resetTokenCacheForTests(): void {
  cachedToken = undefined;
}
