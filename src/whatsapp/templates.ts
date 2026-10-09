import { loadEnv } from '../config/env.js';

const env = loadEnv();

export function classReminderTemplateParams(params: {
  studentName: string;
  className: string;
  startsAtFormatted: string;
}): string[] {
  return [params.studentName, params.className, params.startsAtFormatted];
}

export const CLASS_REMINDER_TEMPLATE_NAME = env.WHATSAPP_TEMPLATE_CLASS_REMINDER;
export const TEMPLATE_LANGUAGE = env.WHATSAPP_TEMPLATE_LANGUAGE;
