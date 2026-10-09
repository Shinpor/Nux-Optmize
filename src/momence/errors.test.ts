import { describe, expect, it } from 'vitest';
import {
  MomenceAuthError,
  MomenceNoCreditError,
  MomenceNotFoundError,
  MomenceSessionFullError,
  mapMomenceError,
} from './errors.js';

describe('mapMomenceError', () => {
  it('mapeia 401 e 403 para MomenceAuthError', () => {
    expect(mapMomenceError(401, {})).toBeInstanceOf(MomenceAuthError);
    expect(mapMomenceError(403, {})).toBeInstanceOf(MomenceAuthError);
  });

  it('mapeia 404 para MomenceNotFoundError', () => {
    expect(mapMomenceError(404, {})).toBeInstanceOf(MomenceNotFoundError);
  });

  it('mapeia 409 para MomenceSessionFullError', () => {
    expect(mapMomenceError(409, {})).toBeInstanceOf(MomenceSessionFullError);
  });

  it('mapeia 422 para MomenceNoCreditError', () => {
    expect(mapMomenceError(422, {})).toBeInstanceOf(MomenceNoCreditError);
  });
});
