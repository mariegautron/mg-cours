/**
 * Le QCM est-il vraiment ouvert aux étudiant·es en ce moment ? Sert à ne jamais projeter un QR
 * qui mène à « pas encore ouvert ». Fonctions pures.
 */

export type QuizAccess =
  | { open: true }
  | { open: false; reason: "draft" | "not_yet" | "ended" | "closed"; message: string };

const at = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  return `le ${day} à ${time}`;
};

export function quizAccess(
  quiz: { status: string; opens_at: string | null; closes_at: string | null },
  now: Date = new Date(),
): QuizAccess {
  const prefix = "Les étudiant·es verront « pas encore ouvert »";
  if (quiz.status === "closed") {
    return {
      open: false,
      reason: "closed",
      message: "QCM clôturé : plus personne ne peut le passer.",
    };
  }
  if (quiz.status !== "published") {
    return { open: false, reason: "draft", message: `${prefix} : le QCM n’est pas publié.` };
  }
  if (quiz.opens_at && new Date(quiz.opens_at) > now) {
    return {
      open: false,
      reason: "not_yet",
      message: `${prefix} : ouverture ${at(quiz.opens_at)}.`,
    };
  }
  if (quiz.closes_at && new Date(quiz.closes_at) <= now) {
    return {
      open: false,
      reason: "ended",
      message: `Les étudiant·es verront « fermé » : fermeture passée (${at(quiz.closes_at)}).`,
    };
  }
  return { open: true };
}

/**
 * « Ouvrir maintenant » : ouverture = maintenant ; fermeture repoussée à maintenant + durée + 10 min
 * si elle tombe avant (une heure par défaut sans durée).
 */
export function openNowWindow(
  quiz: { closes_at: string | null; duration_minutes: number | null },
  now: Date = new Date(),
): { opens_at: string; closes_at: string | null } {
  const minEnd = new Date(now.getTime() + ((quiz.duration_minutes ?? 60) + 10) * 60_000);
  const closes =
    quiz.closes_at && new Date(quiz.closes_at) >= minEnd ? quiz.closes_at : minEnd.toISOString();
  return { opens_at: now.toISOString(), closes_at: closes };
}

/** « Ferme à 18:00 » aujourd'hui, sinon « Ferme le 27/11 à 13:30 » (heure de Paris). */
export function closesAtLabel(closesAt: string | null, now: Date = new Date()): string | null {
  if (!closesAt) return null;
  const d = new Date(closesAt);
  const day = (x: Date) =>
    x.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  return day(d) === day(now) ? `Ferme à ${time}` : `Ferme le ${day(d)} à ${time}`;
}
