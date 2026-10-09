import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { findMemberByPhoneOrEmail } from '../../momence/client.js';
import { db } from '../../db/client.js';
import { students } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { MAIN_MENU_TEXT } from '../formatting.js';

const GUIDANCE_MESSAGE =
  'Não encontrei seu cadastro na Nux House com esse e-mail. Fale com a recepção para confirmar seu cadastro, ou envie novamente o e-mail usado na matrícula.';

/**
 * Tenta identificar o aluno pelo telefone do WhatsApp. Chamado automaticamente
 * pelo orquestrador quando o aluno ainda nao tem momence_customer_id vinculado.
 */
export async function identifyByPhone(ctx: HandlerContext): Promise<HandlerResult> {
  const member = await findMemberByPhoneOrEmail({ phone: ctx.whatsappPhone });

  if (member) {
    await db
      .update(students)
      .set({ momenceCustomerId: member.id, name: member.name, updatedAt: new Date() })
      .where(eq(students.id, ctx.studentId));

    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: [`Oi, ${member.name}! Bem-vinda(o) à Nux House 💪`, MAIN_MENU_TEXT],
    };
  }

  return {
    nextState: ConversationState.AWAITING_EMAIL,
    nextContext: {},
    messages: [
      'Oi! Não encontrei seu número vinculado ao cadastro da Nux House. Pode me enviar o e-mail que você usou na matrícula?',
    ],
  };
}

export async function handleAwaitingEmail(ctx: HandlerContext): Promise<HandlerResult> {
  const email = ctx.text.trim();
  const member = await findMemberByPhoneOrEmail({ email });

  if (member) {
    await db
      .update(students)
      .set({
        momenceCustomerId: member.id,
        name: member.name,
        email,
        updatedAt: new Date(),
      })
      .where(eq(students.id, ctx.studentId));

    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: [`Encontrei seu cadastro, ${member.name}! Já vinculei seu WhatsApp. 🎉`, MAIN_MENU_TEXT],
    };
  }

  return {
    nextState: ConversationState.NOT_FOUND_GUIDANCE,
    nextContext: {},
    messages: [GUIDANCE_MESSAGE],
  };
}

export async function handleNotFoundGuidance(ctx: HandlerContext): Promise<HandlerResult> {
  const email = ctx.text.trim();
  const member = await findMemberByPhoneOrEmail({ email });

  if (member) {
    await db
      .update(students)
      .set({
        momenceCustomerId: member.id,
        name: member.name,
        email,
        updatedAt: new Date(),
      })
      .where(eq(students.id, ctx.studentId));

    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: [`Encontrei seu cadastro, ${member.name}! Já vinculei seu WhatsApp. 🎉`, MAIN_MENU_TEXT],
    };
  }

  return {
    nextState: ConversationState.NOT_FOUND_GUIDANCE,
    nextContext: {},
    messages: [GUIDANCE_MESSAGE],
  };
}
