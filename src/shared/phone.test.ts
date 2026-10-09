import { describe, expect, it } from 'vitest';
import { normalizeBrPhone } from './phone.js';

describe('normalizeBrPhone', () => {
  it('gera as duas variantes a partir de um numero com 9o digito e com 55', () => {
    expect(normalizeBrPhone('5511987654321')).toEqual({
      with9: '5511987654321',
      without9: '551187654321',
    });
  });

  it('gera as duas variantes a partir de um numero sem 9o digito e com 55', () => {
    expect(normalizeBrPhone('551187654321')).toEqual({
      with9: '5511987654321',
      without9: '551187654321',
    });
  });

  it('adiciona o codigo do pais quando ausente (com 9o digito)', () => {
    expect(normalizeBrPhone('11987654321')).toEqual({
      with9: '5511987654321',
      without9: '551187654321',
    });
  });

  it('adiciona o codigo do pais quando ausente (sem 9o digito)', () => {
    expect(normalizeBrPhone('1187654321')).toEqual({
      with9: '5511987654321',
      without9: '551187654321',
    });
  });

  it('ignora o "+" e outros caracteres nao numericos', () => {
    expect(normalizeBrPhone('+55 (11) 98765-4321')).toEqual({
      with9: '5511987654321',
      without9: '551187654321',
    });
  });
});
