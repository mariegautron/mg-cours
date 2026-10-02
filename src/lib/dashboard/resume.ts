/**
 * E20 / US-122 : « Reprendre là où tu t'étais arrêtée ». Fonctions pures : on garde le travail
 * en cours le plus récent, à partir des horodatages déjà présents (pas de nouvelle table).
 */
export type ResumeKind = "resource_draft" | "session_prep";

export interface ResumeCandidate {
  kind: ResumeKind;
  title: string;
  /** Contexte : module, type… */
  context?: string;
  href: string;
  /** Date ISO de la dernière modification. */
  updatedAt: string;
}

/** Au-delà, ce n'est plus « là où tu t'étais arrêtée » : on ne propose rien. */
export const RESUME_MAX_AGE_DAYS = 30;

const ORDER: ResumeKind[] = ["session_prep", "resource_draft"];

/** Le plus récent d'abord, puis par type, puis par titre ; `null` s'il n'y a rien d'assez récent. */
export function pickResume(
  candidates: ResumeCandidate[],
  now: Date = new Date(),
): ResumeCandidate | null {
  const limit = now.getTime() - RESUME_MAX_AGE_DAYS * 86_400_000;
  const recent = candidates.filter((c) => {
    const t = Date.parse(c.updatedAt);
    return Number.isFinite(t) && t >= limit && t <= now.getTime() + 60_000;
  });
  recent.sort(
    (a, b) =>
      Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
      ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) ||
      a.title.localeCompare(b.title, "fr"),
  );
  return recent[0] ?? null;
}

const dayInParis = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

/** « aujourd’hui à 17:40 », « hier à 17:40 », « le 12/10 ». */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  const day = dayInParis(d);
  const today = dayInParis(now);
  if (day === today) return `aujourd’hui à ${time}`;
  const yesterday = dayInParis(new Date(now.getTime() - 86_400_000));
  if (day === yesterday) return `hier à ${time}`;
  return `le ${d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" })}`;
}

export const RESUME_LABELS: Record<ResumeKind, { prefix: string; action: string }> = {
  resource_draft: { prefix: "Brouillon de ressource", action: "Reprendre l’écriture" },
  session_prep: { prefix: "Séance en préparation", action: "Reprendre la préparation" },
};
