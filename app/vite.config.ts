/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// GitHub Pages de proyecto sirve desde /<nombre-del-repo>/, no desde la raíz
// del dominio. El repo se llama hoy "gestor-empresarial" (renombrado desde
// "Le-salon-de-Nathalie"; no hay CNAME de dominio propio en el repo) — la
// URL real confirmada es https://socra375.github.io/gestor-empresarial/.
// Un `base` mal puesto aquí es exactamente el tipo de error que rompe todos
// los assets en silencio recién hecho el corte de la Fase 7; por eso la
// prueba de tests/e2e/base-path.spec.ts existe desde esta misma fase.
//
// Vercel (segunda dirección, <proyecto>.vercel.app) sirve la app desde la
// raíz del dominio y define VERCEL=1 durante su build; GitHub Actions, los
// tests y `npm run dev` no la definen, así que siguen con el prefijo.
const BASE = process.env.VERCEL ? '/' : '/gestor-empresarial/';

export default defineConfig({
  base: BASE,
  plugins: [svelte()],
  // Sin esto, Vitest resuelve los componentes .svelte a su build de
  // servidor (SSR) en vez del de navegador -- @testing-library/svelte
  // necesita el de navegador para poder montar el componente en jsdom.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: false,
  },
});
