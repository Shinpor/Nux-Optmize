import { loadEnv } from '../config/env.js';

const env = loadEnv();

export const TEMPLATES = {
  BOOKING_CONFIRMATION: env.TWILIO_BOOKING_CONFIRMATION_TEMPLATE_SID,
  CLASS_REMINDER: env.TWILIO_CLASS_REMINDER_TEMPLATE_SID,
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

export function bookingConfirmationVariables(params: {
  studentName: string;
  className: string;
  startsAtFormatted: string;
}): Record<string, string> {
  return {
    '1': params.studentName,
    '2': params.className,
    '3': params.startsAtFormatted,
  };
}

export function classReminderVariables(params: {
  studentName: string;
  className: string;
  startsAtFormatted: string;
}): Record<string, string> {
  return {
    '1': params.studentName,
    '2': params.className,
    '3': params.startsAtFormatted,
  };
}
