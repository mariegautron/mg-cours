/** « Attendus évalués » d'une évaluation : logique pure (comptage, sélection valide). */

/** « 2 sur 6 », ou « Aucun » quand rien n'est choisi. */
export function evaluatedLabel(selected: number, total: number): string {
  if (total === 0) return "Aucun attendu dans le module";
  return selected === 0 ? `Aucun sur ${total}` : `${selected} sur ${total}`;
}

/** Garde les identifiants qui sont bien des attendus du module, sans doublon, dans l'ordre reçu. */
export function validSelection(chosen: string[], moduleExpectationIds: string[]): string[] {
  const allowed = new Set(moduleExpectationIds);
  return [...new Set(chosen)].filter((id) => allowed.has(id));
}
