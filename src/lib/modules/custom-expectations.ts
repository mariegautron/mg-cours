/**
 * US-125 : attendus ajoutés à la main (« ajouté par l'intervenante »). Fonctions pures.
 */

export const CUSTOM_ORIGIN_LABEL = "Ajouté par l’intervenante";
export const MAX_CUSTOM_LABEL = 1000;

interface WithOrigin {
  origin?: string | null;
}

export const isCustomExpectation = (e: WithOrigin): boolean => e.origin === "custom";

/** Sépare les attendus de la fiche de l'école et ceux ajoutés à la main (colonne absente → tous « école »). */
export function splitExpectations<T extends WithOrigin>(
  items: readonly T[],
): { school: T[]; custom: T[] } {
  return {
    school: items.filter((e) => !isCustomExpectation(e)),
    custom: items.filter(isCustomExpectation),
  };
}

/** Libellé d'un attendu ajouté : une ligne, sans puce, borné. */
export function cleanCustomLabel(
  input: string,
): { ok: true; label: string } | { ok: false; error: string } {
  const label = input
    .replace(/^[\s]*(?:[-•*·▪●◦–—]|\d{1,2}[.)])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (label.length < 3)
    return { ok: false, error: "Écris l’attendu en quelques mots (3 caractères au moins)." };
  if (label.length > MAX_CUSTOM_LABEL) {
    return { ok: false, error: `${MAX_CUSTOM_LABEL} caractères au plus.` };
  }
  return { ok: true, label };
}

/** Position du prochain attendu : à la suite de tous les existants. */
export function nextExpectationPosition(positions: readonly number[]): number {
  return positions.length ? Math.max(...positions) + 1 : 0;
}

/** « 4 objectifs de l'école, 2 ajoutés par toi ». */
export function originSummary(items: readonly WithOrigin[]): string {
  const { school, custom } = splitExpectations(items);
  const parts = [`${school.length} de l’école`];
  if (custom.length) parts.push(`${custom.length} ajouté${custom.length > 1 ? "s" : ""} par toi`);
  return parts.join(", ");
}

/** Message de l'unicité `module_expectation (module_id, kind, lower(btrim(label)))` (lot 7). */
export const EXPECTATION_EXISTS = "Cet attendu existe déjà.";

/** Clé d'unicité d'un attendu dans son module : même type, même libellé (casse et espaces ignorés). */
export function expectationKey(e: { kind: string; label: string }): string {
  return `${e.kind}:${e.label.trim().toLowerCase()}`;
}

/** Garde le premier de chaque attendu en double (même clé), dans l'ordre. */
export function dedupeExpectations<T extends { kind: string; label: string }>(
  items: readonly T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((e) => {
    const k = expectationKey(e);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Erreur Postgres d'unicité (23505). */
export const isUniqueViolation = (error: { code?: string } | null | undefined): boolean =>
  error?.code === "23505";
