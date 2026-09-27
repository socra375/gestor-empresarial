import { describe, expect, it, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

const apiMock = vi.hoisted(() => ({
  chooseTrialPlan: vi.fn(),
  getMyBusinessAccess: vi.fn(),
  notifySignup: vi.fn(),
}));
vi.mock('../../../src/lib/api/businessAccess', () => apiMock);

const { startPlanTrial, finishSignup } = await import('../../../src/lib/actions/plans');
const { setPendingTrial, getPendingTrial } = await import('../../../src/lib/utils/pendingTrial');
const { businessAccess, resetSession } = await import('../../../src/lib/stores/session');

beforeEach(() => {
  vi.clearAllMocks();
  resetSession();
  localStorage.clear();
  apiMock.notifySignup.mockResolvedValue(undefined);
});

describe('startPlanTrial', () => {
  it('elige la prueba y refresca el acceso con el nuevo vencimiento', async () => {
    apiMock.chooseTrialPlan.mockResolvedValue('2026-10-15T00:00:00Z');
    const refreshed = {
      status: 'trial',
      plan: 'prueba',
      expires_at: '2026-10-15T00:00:00Z',
      reason: null,
      is_super_admin: false,
      modules: ['facturas', 'equipo', 'estadisticas'],
      trial_plan: 'semestral',
    };
    apiMock.getMyBusinessAccess.mockResolvedValue(refreshed);

    await startPlanTrial('semestral');

    expect(apiMock.chooseTrialPlan).toHaveBeenCalledWith('semestral');
    expect(get(businessAccess)).toEqual(refreshed);
  });

  it('si la BD lo rechaza, propaga el error y no toca el acceso', async () => {
    apiMock.chooseTrialPlan.mockRejectedValue(new Error('La prueba de un plan ya fue elegida'));

    await expect(startPlanTrial('anual')).rejects.toThrow('ya fue elegida');
    expect(apiMock.getMyBusinessAccess).not.toHaveBeenCalled();
    expect(get(businessAccess)).toBeNull();
  });
});

describe('finishSignup', () => {
  it('aplica la prueba del plan elegido en la landing, la olvida y avisa', async () => {
    setPendingTrial('semestral');
    apiMock.chooseTrialPlan.mockResolvedValue('2026-10-15T00:00:00Z');
    apiMock.getMyBusinessAccess.mockResolvedValue({ status: 'trial', trial_plan: 'semestral' });

    await finishSignup();

    expect(apiMock.chooseTrialPlan).toHaveBeenCalledWith('semestral');
    expect(getPendingTrial()).toBeNull();
    expect(apiMock.notifySignup).toHaveBeenCalledOnce();
  });

  it('sin plan elegido solo avisa', async () => {
    await finishSignup();
    expect(apiMock.chooseTrialPlan).not.toHaveBeenCalled();
    expect(apiMock.notifySignup).toHaveBeenCalledOnce();
  });

  it('nunca lanza: ni si la prueba se rechaza ni si el aviso falla', async () => {
    setPendingTrial('anual');
    apiMock.chooseTrialPlan.mockRejectedValue(new Error('ya elegida'));
    apiMock.notifySignup.mockRejectedValue(new Error('sin red'));

    await expect(finishSignup()).resolves.toBeUndefined();
    expect(getPendingTrial()).toBeNull();
  });
});
