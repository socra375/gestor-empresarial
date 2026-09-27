export type LegalDoc = 'terminos' | 'privacidad' | 'cookies' | 'reembolsos';

export const LEGAL_DOCS: readonly LegalDoc[] = ['terminos', 'privacidad', 'cookies', 'reembolsos'];

/** Fecha de la versión vigente de los documentos legales; se guarda con cada aceptación. */
export const LEGAL_VERSION = '2026-09-27';

export function legalHref(doc: LegalDoc): string {
  return `#/${doc}`;
}

/** `#/privacidad` -> 'privacidad'. Anclas comunes como `#planes` devuelven null. */
export function parseLegalHash(hash: string): LegalDoc | null {
  const match = /^#\/([a-z]+)$/.exec(hash);
  const doc = match?.[1];
  return doc && (LEGAL_DOCS as readonly string[]).includes(doc) ? (doc as LegalDoc) : null;
}
