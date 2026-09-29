import type { AttemptSummary } from "@/lib/quiz/queries";

/** État d'une copie pour Marie, en clair. */
export function attemptStatusLabel(a: AttemptSummary): string {
  if (a.revoked) return "Lien révoqué";
  if (a.status === "submitted") {
    if (!a.reviewComplete) return "Rendue : à relire";
    return a.submittedLate ? "Corrigée (rendue en retard)" : "Corrigée";
  }
  if (a.status === "in_progress") return "En cours";
  if (a.usedAt) return "Lien ouvert, pas commencée";
  return a.sentAt ? "Lien envoyé" : "Lien préparé";
}

/** Total « 7,5 / 11 » ou « — » ; partiel signalé tant qu'une réponse libre n'est pas relue. */
export function attemptScoreLabel(a: AttemptSummary): string {
  if (a.status !== "submitted" || a.score === null) return "—";
  const fmt = (n: number) => String(n).replace(".", ",");
  return `${fmt(a.score)} / ${fmt(a.totalPoints)}${a.reviewComplete ? "" : " (partiel)"}`;
}
