import { describe, expect, it } from 'vitest';
import { legalHref, parseLegalHash } from '../../../src/lib/utils/legal';

describe('parseLegalHash', () => {
  it.each(['terminos', 'privacidad', 'cookies', 'reembolsos'] as const)('reconoce #/%s', (doc) => {
    expect(parseLegalHash(`#/${doc}`)).toBe(doc);
  });

  it.each(['', '#', '#planes', '#demo', '#/', '#/otra', '#/terminos/extra'])('ignora "%s"', (hash) => {
    expect(parseLegalHash(hash)).toBeNull();
  });

  it('legalHref arma el hash que parseLegalHash entiende', () => {
    expect(parseLegalHash(legalHref('cookies'))).toBe('cookies');
  });
});
