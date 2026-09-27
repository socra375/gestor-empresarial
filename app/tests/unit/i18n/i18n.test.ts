import { describe, expect, it } from 'vitest';
import { TRANSLATIONS, LOCALES, DEFAULT_LOCALE, isLocale, t } from '../../../src/lib/i18n';

describe('paridad de claves entre idiomas', () => {
  const referenceKeys = Object.keys(TRANSLATIONS[DEFAULT_LOCALE]).sort();

  it('español tiene 412 claves (la referencia)', () => {
    expect(referenceKeys).toHaveLength(412);
  });

  it.each(LOCALES.filter((l) => l !== DEFAULT_LOCALE))(
    '%s tiene exactamente las mismas claves que español (ni de más, ni de menos)',
    (locale) => {
      const keys = Object.keys(TRANSLATIONS[locale]).sort();
      expect(keys).toEqual(referenceKeys);
    }
  );

  it.each(LOCALES)('%s no tiene ningún valor vacío', (locale) => {
    const empties = Object.entries(TRANSLATIONS[locale]).filter(([, v]) => !v || String(v).trim() === '');
    expect(empties).toEqual([]);
  });
});

describe('isLocale', () => {
  it('acepta los 6 idiomas soportados', () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
  });

  it('rechaza un código no soportado', () => {
    expect(isLocale('ja')).toBe(false);
  });
});

describe('t(locale, key, vars)', () => {
  it('devuelve la traducción en el idioma pedido', () => {
    expect(t('en', 'common.cancel')).toBe('Cancel');
    expect(t('fr', 'common.cancel')).toBe('Annuler');
    expect(t('pt', 'common.cancel')).toBe('Cancelar');
    expect(t('de', 'common.cancel')).toBe('Abbrechen');
    expect(t('it', 'common.cancel')).toBe('Annulla');
  });

  it('interpola variables {{var}}', () => {
    expect(t('es', 'auth.error', { msg: 'credenciales inválidas' })).toBe(
      'Error de autenticación: credenciales inválidas'
    );
  });

  it('interpola varias variables en la misma cadena', () => {
    expect(t('es', 'pay.summary', { client: 'Ana', services: 'Corte', total: '$500.00' })).toBe(
      'Ana — Corte | Total: $500.00'
    );
  });

  it('devuelve la clave cruda si no existe en ningún idioma', () => {
    // @ts-expect-error -- a propósito: clave inexistente para probar el último fallback
    expect(t('es', 'clave.que.no.existe')).toBe('clave.que.no.existe');
  });
});
