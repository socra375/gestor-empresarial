export type LegalDoc = 'terminos' | 'privacidad' | 'cookies' | 'reembolsos';

export const LEGAL_DOCS: readonly LegalDoc[] = ['terminos', 'privacidad', 'cookies', 'reembolsos'];

/** Fecha de la versión vigente de los documentos legales; se guarda con cada aceptación. */
export const LEGAL_VERSION = '2026-09-27';

const TERMS_ACCEPTED_KEY = 'gestorTermsAccepted';

/** Si en este navegador ya se aceptó la versión vigente de Términos y Privacidad. */
export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(TERMS_ACCEPTED_KEY) === LEGAL_VERSION;
  } catch {
    return false;
  }
}

export function rememberTermsAccepted(): void {
  try {
    localStorage.setItem(TERMS_ACCEPTED_KEY, LEGAL_VERSION);
  } catch {
    // Sin localStorage (modo privado, etc.) la casilla simplemente se vuelve a mostrar.
  }
}

export function legalHref(doc: LegalDoc): string {
  return `#/${doc}`;
}

/** `#/privacidad` -> 'privacidad'. Anclas comunes como `#planes` devuelven null. */
export function parseLegalHash(hash: string): LegalDoc | null {
  const match = /^#\/([a-z]+)$/.exec(hash);
  const doc = match?.[1];
  return doc && (LEGAL_DOCS as readonly string[]).includes(doc) ? (doc as LegalDoc) : null;
}
