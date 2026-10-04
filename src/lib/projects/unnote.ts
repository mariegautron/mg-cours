/** « Ne plus noter cette phase » : confirmation demandée selon les notes déjà saisies. Fonctions pures. */

/** Sans note : une confirmation simple ; avec des notes : il faut retaper « supprimer ». */
export function unnoteConfirmation(gradeCount: number): "simple" | "typed" {
  return gradeCount > 0 ? "typed" : "simple";
}

export const UNNOTE_WORD = "supprimer";

/** Le mot retapé est-il « supprimer » ? Casse, accents et espaces autour ignorés. */
export function unnoteWordMatches(typed: string): boolean {
  return (
    typed.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim() ===
    UNNOTE_WORD
  );
}

/** Message de la confirmation. */
export function unnoteMessage(gradeCount: number): string {
  return gradeCount > 0
    ? `Cette évaluation et ses ${gradeCount} note${gradeCount > 1 ? "s" : ""} seront supprimées.`
    : "Cette évaluation et ses notes seront supprimées.";
}
