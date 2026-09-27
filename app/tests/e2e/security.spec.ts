import { test, expect, type Page } from '@playwright/test';

// La CSP va como <meta> en el build (GitHub Pages no permite encabezados).
// Se prueba contra el build real: que esté, que bloquee scripts inyectados
// y que no rompa nada propio de la app (cero violaciones al cargar).
function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

test.describe('Política de seguridad de contenido (CSP)', () => {
  test('el build la incluye y la app carga sin violaciones', async ({ page }) => {
    const violations = collectCspViolations(page);
    await page.goto('./');
    await expect(page.locator('h1').first()).toBeVisible();

    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain('connect-src');

    await page.goto('./#/privacidad');
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible();
    expect(violations).toEqual([]);
  });

  test('un script inyectado en la página no se ejecuta', async ({ page }) => {
    const violations = collectCspViolations(page);
    await page.goto('./');
    await expect(page.locator('h1').first()).toBeVisible();

    // Simula una inyección de HTML (lo que haría un XSS): un <script> en
    // línea y un onerror. Con la CSP ninguno de los dos corre.
    await page.evaluate(() => {
      const holder = document.createElement('div');
      holder.innerHTML = '<img src="x" onerror="window.__inyectado = true">';
      document.body.appendChild(holder);
      const script = document.createElement('script');
      script.textContent = 'window.__inyectado = true;';
      document.body.appendChild(script);
    });
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => (window as unknown as { __inyectado?: boolean }).__inyectado)).toBeUndefined();
    expect(violations.length).toBeGreaterThan(0);
  });
});
