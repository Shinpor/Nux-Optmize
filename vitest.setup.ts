// Valores dummy para que os modulos que chamam loadEnv() no top-level
// (ex: src/momence/client.ts, src/db/client.ts) nao quebrem durante os
// testes unitarios, que nao dependem de credenciais reais.
const defaults: Record<string, string> = {
  PUBLIC_BASE_URL: 'https://example.test',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
  MOMENCE_CLIENT_ID: 'test-client-id',
  MOMENCE_CLIENT_SECRET: 'test-client-secret',
  MOMENCE_USERNAME: 'bot@example.test',
  MOMENCE_PASSWORD: 'test-password',
  WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  WHATSAPP_PHONE_NUMBER_ID: 'test-phone-number-id',
  WHATSAPP_BUSINESS_ACCOUNT_ID: 'test-waba-id',
  WHATSAPP_APP_SECRET: 'test-app-secret',
  WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
