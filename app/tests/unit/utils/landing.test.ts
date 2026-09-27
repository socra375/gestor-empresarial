import { describe, expect, it } from 'vitest';
import { showsLandingAfter } from '../../../src/lib/utils/landing';

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
