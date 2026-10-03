/**
 * Résultats d'un QCM côté enseignante : taux de réussite par question (« ce qui a posé problème »)
 * et moyenne. Fonctions pures, sur les tentatives rendues.
 */
export interface StatAttempt {
  /** Questions tirées (dans l'ordre affiché), avec leur identifiant et leur énoncé. */
  drawn: { question_id: string; statement: string; points: number }[];
  /** Points obtenus par position (1 = première question), `null` : pas encore corrigé. */
  earned: (number | null)[];
}

export interface QuestionStat {
  questionId: string;
  statement: string;
  /** Réussite entre 0 et 100, `null` si aucune copie corrigée n'a cette question. */
  percent: number | null;
  /** Nombre de copies corrigées où la question est tombée. */
  answered: number;
}

/** Réussite par question, de la plus ratée à la mieux réussie ; les questions sans copie corrigée passent en dernier. */
export function questionStats(attempts: readonly StatAttempt[]): QuestionStat[] {
  const acc = new Map<
    string,
    { statement: string; earned: number; max: number; answered: number }
  >();
  for (const a of attempts) {
    a.drawn.forEach((q, i) => {
      const got = a.earned[i];
      const entry = acc.get(q.question_id) ?? {
        statement: q.statement,
        earned: 0,
        max: 0,
        answered: 0,
      };
      if (got !== null && got !== undefined && q.points > 0) {
        entry.earned += got;
        entry.max += q.points;
        entry.answered += 1;
      }
      acc.set(q.question_id, entry);
    });
  }
  return [...acc.entries()]
    .map(([questionId, e]) => ({
      questionId,
      statement: e.statement,
      percent: e.max > 0 ? Math.round((e.earned / e.max) * 100) : null,
      answered: e.answered,
    }))
    .sort(
      (a, b) =>
        (a.percent ?? 101) - (b.percent ?? 101) || a.statement.localeCompare(b.statement, "fr"),
    );
}

/** Moyenne des notes sur le barème (`null` sans note). */
export function averageScore(scores: readonly (number | null)[]): number | null {
  const values = scores.filter((s): s is number => s !== null);
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}
