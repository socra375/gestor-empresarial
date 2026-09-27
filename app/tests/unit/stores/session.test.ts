import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  currentUserId,
  currentBusinessId,
  currentUserRole,
  currentBusiness,
  isAuthenticated,
  isAdmin,
  needsOnboarding,
  businessAccess,
  isBusinessBlocked,
  enabledModules,
  resetSession,
} from '../../../src/lib/stores/session';
import type { ModuleKey } from '../../../src/lib/types/businessAccess';

beforeEach(() => {
  resetSession();
});

describe('enabledModules', () => {
  it('mientras no se conoce el acceso, todos los módulos están activos', () => {
    expect([...get(enabledModules)].sort()).toEqual(['equipo', 'estadisticas', 'facturas']);
  });

  it('refleja los módulos que devuelve el acceso', () => {
    businessAccess.set({
      status: 'active',
      plan: 'anual',
      expires_at: null,
      reason: null,
      is_super_admin: false,
      modules: ['equipo'],
      trial_plan: null,
    });
    expect(get(enabledModules).has('facturas')).toBe(false);
    expect(get(enabledModules).has('equipo')).toBe(true);
  });
});

describe('isBusinessBlocked', () => {
  const base = {
    plan: 'anual' as const,
    expires_at: null,
    reason: null,
    is_super_admin: false,
    modules: ['facturas', 'equipo', 'estadisticas'] as ModuleKey[],
    trial_plan: null,
  };

  it('es false mientras no se conoce el acceso', () => {
    expect(get(isBusinessBlocked)).toBe(false);
  });

  it.each(['blocked', 'paused', 'expired'] as const)('es true con estado %s', (status) => {
    businessAccess.set({ ...base, status });
    expect(get(isBusinessBlocked)).toBe(true);
  });

  it.each(['new', 'trial', 'active'] as const)('es false con estado %s', (status) => {
    businessAccess.set({ ...base, status });
    expect(get(isBusinessBlocked)).toBe(false);
  });

  it('resetSession lo limpia', () => {
    businessAccess.set({ ...base, status: 'blocked' });
    resetSession();
    expect(get(isBusinessBlocked)).toBe(false);
  });
});

describe('isAuthenticated', () => {
  it('es false sin usuario y true en cuanto hay un id', () => {
    expect(get(isAuthenticated)).toBe(false);
    currentUserId.set('user-1');
    expect(get(isAuthenticated)).toBe(true);
  });
});

describe('isAdmin', () => {
  it('sigue el valor de currentUserRole', () => {
    expect(get(isAdmin)).toBe(true); // default: 'admin'
    currentUserRole.set('employee');
    expect(get(isAdmin)).toBe(false);
  });
});

describe('needsOnboarding', () => {
  it('un empleado nunca necesita onboarding, aunque no haya negocio cargado', () => {
    currentUserRole.set('employee');
    currentBusiness.set(null);
    expect(get(needsOnboarding)).toBe(false);
  });

  it('un admin sin negocio cargado todavía necesita onboarding', () => {
    currentUserRole.set('admin');
    currentBusiness.set(null);
    expect(get(needsOnboarding)).toBe(true);
  });

  it('un admin con onboarding_completed=false necesita onboarding', () => {
    currentUserRole.set('admin');
    currentBusiness.set({ id: 'biz-1', name: 'Mi Salón', onboarding_completed: false } as never);
    expect(get(needsOnboarding)).toBe(true);
  });

  it('un admin con onboarding_completed=true ya no necesita onboarding', () => {
    currentUserRole.set('admin');
    currentBusiness.set({ id: 'biz-1', name: 'Mi Salón', onboarding_completed: true } as never);
    expect(get(needsOnboarding)).toBe(false);
  });
});

describe('resetSession', () => {
  it('vuelve todos los stores a su estado inicial', () => {
    currentUserId.set('user-1');
    currentBusinessId.set('biz-1');
    currentUserRole.set('employee');
    currentBusiness.set({ id: 'biz-1' } as never);

    resetSession();

    expect(get(currentUserId)).toBeNull();
    expect(get(currentBusinessId)).toBeNull();
    expect(get(currentUserRole)).toBe('admin');
    expect(get(currentBusiness)).toBeNull();
  });
});
