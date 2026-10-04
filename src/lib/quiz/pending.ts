import type { StoredAnswer } from "@/lib/quiz/types";

/**
 * Réponses d'un QCM gardées sur l'appareil de l'étudiant·e tant qu'elles n'ont pas toutes été
 * envoyées (connexion coupée, onglet fermé puis rouvert). Rien d'autre que ses propres réponses.
 */
const key = (token: string) => `mg-quiz-pending:${token.slice(0, 16)}`;

export function storePendingAnswers(token: string, answers: Record<string, StoredAnswer>): void {
  try {
    localStorage.setItem(key(token), JSON.stringify(answers));
  } catch {
    /* stockage indisponible : on garde en mémoire seulement */
  }
}

export function clearPendingAnswers(token: string): void {
  try {
    localStorage.removeItem(key(token));
  } catch {
    /* sans effet */
  }
}

/** Réponses gardées sur l'appareil fusionnées avec celles du serveur ; `null` s'il n'y a rien de plus. */
export function mergePendingAnswers(
  token: string,
  fromServer: Record<string, StoredAnswer>,
): Record<string, StoredAnswer> | null {
  try {
    const raw = localStorage.getItem(key(token));
    if (!raw) return null;
    const stored = JSON.parse(raw) as Record<string, StoredAnswer>;
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return null;
    const merged = { ...fromServer, ...stored };
    return JSON.stringify(merged) === JSON.stringify(fromServer) ? null : merged;
  } catch {
    return null;
  }
}
