import { assertStringIncludes } from 'jsr:@std/assert@1';
import { formatSignupMessage } from './message.ts';

Deno.test('incluye empresa, correo y la prueba elegida', () => {
  const out = formatSignupMessage({
    name: 'Las canas',
    email: 'dueña@example.com',
    business_type: 'group',
    team_size: 3,
    trial_plan: 'semestral',
    expires_at: '2026-10-15T12:00:00Z',
  });
  assertStringIncludes(out, 'Empresa: Las canas');
  assertStringIncludes(out, 'Correo: dueña@example.com');
  assertStringIncludes(out, 'Con equipo (3 personas)');
  assertStringIncludes(out, 'Prueba del plan semestral (20 días) — vence 2026-10-15');
  assertStringIncludes(out, '/estado dueña@example.com');
});

Deno.test('sin plan elegido muestra la prueba genérica', () => {
  const out = formatSignupMessage({
    name: 'Salón X',
    email: 'x@example.com',
    business_type: 'individual',
    team_size: null,
    trial_plan: null,
    expires_at: null,
  });
  assertStringIncludes(out, 'Prueba genérica (7 días) — vence —');
  assertStringIncludes(out, 'Tipo: Individual');
});
