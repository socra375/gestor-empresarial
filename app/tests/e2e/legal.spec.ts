import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Los documentos legales se abren por hash (#/terminos, #/privacidad...),
// sin sesión ni credenciales: se prueban contra el build real bajo el base
// path de GitHub Pages, con el contraste real que jsdom no puede medir.
const DOCS = [
  ['terminos', 'Términos y condiciones'],
  ['privacidad', 'Política de privacidad'],
  ['cookies', 'Política de cookies y almacenamiento'],
  ['reembolsos', 'Política de reembolsos'],
] as const;

test.describe('Documentos legales', () => {
  for (const [doc, title] of DOCS) {
    test(`#/${doc} carga, sobrevive a una recarga y no tiene violaciones de accesibilidad`, async ({ page }) => {
      await page.goto(`./#/${doc}`);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

      await page.reload();
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('se puede navegar entre documentos y volver', async ({ page }) => {
    await page.goto('./');
    await page.goto('./#/terminos');
    await page.getByRole('navigation', { name: 'Documentos legales' }).getByRole('link', { name: 'Política de reembolsos' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Política de reembolsos' })).toBeVisible();

    await page.getByRole('link', { name: '← Volver' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible();
  });
});
