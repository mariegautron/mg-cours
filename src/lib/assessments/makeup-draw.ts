/**
 * Point d'accroche « nouveau tirage » d'un rattrapage de QCM (US-96 → US-95).
 *
 * Quand l'évaluation d'origine est un QCM à tirage individuel, le rattrapage doit tirer de nouvelles
 * questions pour chaque étudiant·e concerné·e, en excluant celles déjà vues (complétées par des questions
 * déjà vues si la banque est trop petite, avec un compte-rendu à Marie). Tant que le QCM n'existe pas,
 * il n'y a rien à tirer : l'appel est sans effet et le rattrapage se prépare comme un sujet ordinaire.
 */
export interface MakeupDrawInput {
  originalId: string;
  makeupId: string;
  studentIds: readonly string[];
}

export interface MakeupDrawResult {
  /** Nombre d'étudiant·es dont le tirage a été refait. */
  redrawn: number;
  /** Avertissements à afficher à Marie (ex. « 2 questions sur 10 déjà vues »). */
  warnings: string[];
}

export async function redrawQuizForMakeup(input: MakeupDrawInput): Promise<MakeupDrawResult> {
  void input;
  return { redrawn: 0, warnings: [] };
}
