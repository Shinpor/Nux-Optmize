export interface BrPhoneVariants {
  with9: string;
  without9: string;
}

/**
 * Normaliza um telefone brasileiro para as duas variantes possiveis
 * (com e sem o 9o digito apos o DDD), sempre com codigo do pais (55)
 * e so digitos. O WhatsApp manda o wa_id sem "+" e, por vezes, sem o 9o
 * digito (ex: 551187654321 em vez de 5511987654321).
 */
export function normalizeBrPhone(raw: string): BrPhoneVariants {
  const digits = raw.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
  const ddd = withCountryCode.slice(2, 4);
  const rest = withCountryCode.slice(4);

  if (rest.length === 9) {
    return { with9: `55${ddd}${rest}`, without9: `55${ddd}${rest.slice(1)}` };
  }

  return { with9: `55${ddd}9${rest}`, without9: `55${ddd}${rest}` };
}
