import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1),

  MOMENCE_CLIENT_ID: z.string().min(1),
  MOMENCE_CLIENT_SECRET: z.string().min(1),
  MOMENCE_USERNAME: z.string().min(1),
  MOMENCE_PASSWORD: z.string().min(1),
  MOMENCE_API_BASE_URL: z.string().url().default('https://api.momence.com/api/v2'),
  LATE_CANCEL_HOURS: z.coerce.number().int().positive().default(12),

  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_GRAPH_API_VERSION: z.string().default('v24.0'),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default('pt_BR'),
  WHATSAPP_TEMPLATE_CLASS_REMINDER: z.string().default('lembrete_aula'),
  HUMAN_TAKEOVER_MINUTES: z.coerce.number().int().positive().default(120),

  REMINDER_CHECK_INTERVAL_MINUTES: z.coerce.number().int().positive().default(15),
  REMINDER_LEAD_TIME_MINUTES: z.coerce.number().int().positive().default(120),
  SESSION_CACHE_TTL_MINUTES: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variaveis de ambiente invalidas ou ausentes:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
