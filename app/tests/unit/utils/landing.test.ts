import { beforeEach, describe, expect, it } from 'vitest';
import { requestAccountSwitch, showsLandingAfter } from '../../../src/lib/utils/landing';

beforeEach(() => sessionStorage.clear());

describe('showsLandingAfter', () => {
  it('al cerrar sesión se vuelve a la página de presentación', () => {
    expect(showsLandingAfter('SIGNED_OUT')).toBe(true);
  });

  it.each(['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'PASSWORD_RECOVERY'] as const)(
    '%s no fuerza la página de presentación',
    (event) => {
      expect(showsLandingAfter(event)).toBe(false);
    }
  );
});

describe('cambio de cuenta', () => {
  it('"Agregar o cambiar cuenta" lleva al acceso, no a la landing, una sola vez', () => {
    requestAccountSwitch();
    expect(showsLandingAfter('SIGNED_OUT')).toBe(false);
    // El pedido se consume: el próximo cierre de sesión normal vuelve a la landing.
    expect(showsLandingAfter('SIGNED_OUT')).toBe(true);
  });
});
