import { describe, expect, it, beforeEach } from 'vitest';
import { clearPendingTrial, getPendingTrial, isPaidPlan, setPendingTrial } from '../../../src/lib/utils/pendingTrial';

beforeEach(() => localStorage.clear());

describe('pendingTrial', () => {
  it('guarda, lee y limpia el plan elegido', () => {
    setPendingTrial('mensual');
    expect(getPendingTrial()).toBe('mensual');
    clearPendingTrial();
    expect(getPendingTrial()).toBeNull();
  });

  it('ignora valores que no son un plan pagado', () => {
    localStorage.setItem('gestorTrialPlan', 'prueba');
    expect(getPendingTrial()).toBeNull();
    expect(isPaidPlan('anual')).toBe(true);
    expect(isPaidPlan('gratis')).toBe(false);
    expect(isPaidPlan(null)).toBe(false);
  });
});
