import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().min(1),

  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_WHATSAPP_NUMBER: z.string().min(1),
  TWILIO_BOOKING_CONFIRMATION_TEMPLATE_SID: z.string().min(1),
  TWILIO_CLASS_REMINDER_TEMPLATE_SID: z.string().min(1),

  MOMENCE_CLIENT_ID: z.string().min(1),
  MOMENCE_CLIENT_SECRET: z.string().min(1),
  MOMENCE_API_BASE_URL: z.string().url().default('https://api.momence.com/api/v2'),
  MOMENCE_OAUTH_TOKEN_URL: z.string().url().default('https://api.momence.com/oauth/token'),
  MOMENCE_HOST_ID: z.string().optional(),

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
