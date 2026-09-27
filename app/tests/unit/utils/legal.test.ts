import { beforeEach, describe, expect, it } from 'vitest';
import {
  LEGAL_VERSION,
  hasAcceptedTerms,
  legalHref,
  parseLegalHash,
  rememberTermsAccepted,
} from '../../../src/lib/utils/legal';

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

describe('aceptación de Términos recordada en el navegador', () => {
  beforeEach(() => localStorage.clear());

  it('arranca sin aceptar y queda aceptada después de recordarla', () => {
    expect(hasAcceptedTerms()).toBe(false);
    rememberTermsAccepted();
    expect(hasAcceptedTerms()).toBe(true);
    expect(localStorage.getItem('gestorTermsAccepted')).toBe(LEGAL_VERSION);
  });

  it('una aceptación de otra versión no cuenta', () => {
    localStorage.setItem('gestorTermsAccepted', '2020-01-01');
    expect(hasAcceptedTerms()).toBe(false);
  });
});
