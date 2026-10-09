import { ConversationState } from '../states.js';
import type { HandlerContext, HandlerResult } from '../states.js';
import { searchMembers } from '../../momence/client.js';
import type { HostMemberDto } from '../../momence/types.js';
import { normalizeBrPhone } from '../../shared/phone.js';
import { db } from '../../db/client.js';
import { students } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { MAIN_MENU_TEXT } from '../formatting.js';

const GUIDANCE_MESSAGE =
  'Não encontrei seu cadastro na Nux House com esse e-mail. Fale com a recepção para confirmar seu cadastro, ou envie novamente o e-mail usado na matrícula.';

function memberFullName(member: HostMemberDto): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

function phoneMatches(memberPhone: string | null, variants: { with9: string; without9: string }): boolean {
  if (!memberPhone) return false;
  const memberVariants = normalizeBrPhone(memberPhone);
  return (
    memberVariants.with9 === variants.with9 ||
    memberVariants.without9 === variants.without9
  );
}

/**
 * Busca o aluno pelo telefone, tentando a variante completa, a variante
 * sem o 9o digito e, por fim, so os ultimos 8 digitos (filtrando
 * localmente pelo telefone normalizado antes de aceitar qualquer match).
 */
async function findUniqueMemberByPhone(waId: string): Promise<HostMemberDto | 'none' | 'ambiguous'> {
  const variants = normalizeBrPhone(waId);
  const lastEightDigits = variants.without9.slice(-8);

  const queries = [variants.with9, variants.without9, lastEightDigits];

  for (const query of queries) {
    const results = await searchMembers(query);
    const matches = results.filter((member) => phoneMatches(member.phoneNumber, variants));

    if (matches.length === 1) return matches[0]!;
    if (matches.length > 1) return 'ambiguous';
  }

  return 'none';
}

async function findMemberByEmail(email: string): Promise<HostMemberDto | null> {
  const normalized = email.trim().toLowerCase();
  const results = await searchMembers(normalized);
  return results.find((member) => member.email.toLowerCase() === normalized) ?? null;
}

async function linkStudentToMember(studentId: string, member: HostMemberDto, email?: string): Promise<void> {
  await db
    .update(students)
    .set({
      momenceCustomerId: String(member.id),
      name: memberFullName(member),
      ...(email ? { email } : {}),
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));
}

/**
 * Tenta identificar o aluno pelo telefone do WhatsApp. Chamado automaticamente
 * pelo orquestrador quando o aluno ainda nao tem momence_customer_id vinculado.
 */
export async function identifyByPhone(ctx: HandlerContext): Promise<HandlerResult> {
  const match = await findUniqueMemberByPhone(ctx.whatsappPhone);

  if (match !== 'none' && match !== 'ambiguous') {
    await linkStudentToMember(ctx.studentId, match);
    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: [`Oi, ${memberFullName(match)}! Bem-vinda(o) à Nux House 💪`, MAIN_MENU_TEXT],
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
  const member = await findMemberByEmail(email);

  if (member) {
    await linkStudentToMember(ctx.studentId, member, email.toLowerCase());
    return {
      nextState: ConversationState.MAIN_MENU,
      nextContext: {},
      messages: [`Encontrei seu cadastro, ${memberFullName(member)}! Já vinculei seu WhatsApp. 🎉`, MAIN_MENU_TEXT],
    };
  }

  return {
    nextState: ConversationState.NOT_FOUND_GUIDANCE,
    nextContext: {},
    messages: [GUIDANCE_MESSAGE],
  };
}

export async function handleNotFoundGuidance(ctx: HandlerContext): Promise<HandlerResult> {
  return handleAwaitingEmail(ctx);
}
