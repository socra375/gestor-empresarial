/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
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

// Política de seguridad de contenido (CSP) como <meta>, porque GitHub Pages
// no deja poner encabezados: aunque alguien lograra meter HTML en la página,
// el navegador no ejecuta scripts que no vengan del propio sitio, ni manda
// datos a otro servidor que no sea Supabase. Solo en el build: el servidor de
// desarrollo inyecta scripts propios para recargar en caliente.
// 'unsafe-inline' en estilos hace falta por los style="…" de los componentes;
// blob: en object-src deja abrir el PDF de las facturas.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'gestor-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  base: BASE,
  plugins: [svelte(), contentSecurityPolicy()],
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
