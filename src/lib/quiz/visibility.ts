/**
 * Le corrigé n'est visible qu'une fois le QCM fermé POUR TOUT LE MONDE, rattrapages compris (sinon il
 * fuiterait vers les absent·es excusé·es). Miroir en TypeScript de `mg_quiz_family_closed` (SQL), pour
 * dire à Marie pourquoi le corrigé n'est pas encore visible.
 */
export function familyClosedReason(input: {
  /** Statuts du QCM d'origine et de ses rattrapages. */
  statuses: readonly ("draft" | "published" | "closed")[];
  /** Absent·es excusé·es de l'évaluation d'origine. */
  excusedCount: number;
  /** Un QCM de rattrapage existe. */
  hasMakeupQuiz: boolean;
}): string | null {
  const open = input.statuses.filter((s) => s !== "closed").length;
  if (open > 0)
    return `${open} QCM (dont les rattrapages) ne sont pas encore clôturés : le corrigé reste caché pour que rien ne fuite vers celles et ceux qui passent plus tard.`;
  if (input.excusedCount > 0 && !input.hasMakeupQuiz)
    return `${input.excusedCount} absent·e${input.excusedCount > 1 ? "s" : ""} excusé·e${input.excusedCount > 1 ? "s" : ""} n’ont pas encore de rattrapage : le corrigé reste caché.`;
  return null;
}
