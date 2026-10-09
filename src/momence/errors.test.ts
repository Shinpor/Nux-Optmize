import { describe, expect, it } from 'vitest';
import {
  MomenceAuthError,
  MomenceIncompatibleMembershipError,
  MomencePaymentFailedError,
  MomenceSessionFullError,
  mapMomenceError,
} from './errors.js';

describe('mapMomenceError', () => {
  it('mapeia type err-session-is-full para MomenceSessionFullError', () => {
    expect(mapMomenceError(400, { type: 'err-session-is-full' })).toBeInstanceOf(MomenceSessionFullError);
  });

  it('mapeia type err-incompatible-membership para MomenceIncompatibleMembershipError', () => {
    expect(mapMomenceError(400, { type: 'err-incompatible-membership' })).toBeInstanceOf(
      MomenceIncompatibleMembershipError,
    );
  });

  it('mapeia type err-payment-failed para MomencePaymentFailedError', () => {
    expect(mapMomenceError(400, { type: 'err-payment-failed' })).toBeInstanceOf(MomencePaymentFailedError);
  });

  it('mapeia 401/403 sem type conhecido para MomenceAuthError', () => {
    expect(mapMomenceError(401, {})).toBeInstanceOf(MomenceAuthError);
    expect(mapMomenceError(403, undefined)).toBeInstanceOf(MomenceAuthError);
  });

  it('mapeia qualquer outro caso para o erro generico', () => {
    const error = mapMomenceError(500, { type: 'algo-desconhecido' });
    expect(error.constructor.name).toBe('MomenceApiError');
  });
});
