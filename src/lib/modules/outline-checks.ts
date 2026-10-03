/**
 * Écran « Progression pédagogique » : la liste « Avant de générer ». Fonctions pures : chaque
 * point dit ce qui est prêt ou ce qui manque, avec où le compléter. Aucun point ne bloque.
 */
import { calculateDuration, formatDuration } from "./course-duration";

export interface OutlineCourse {
  position: number;
  title: string;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  objectives: string[];
  /** Date de dernière modification du contenu de la séance. */
  contentUpdatedAt: string | null;
}

export interface OutlineCheckInput {
  courses: OutlineCourse[];
  moduleHours: number;
  /** Évaluations hors rattrapage. */
  assessments: { total: number; linked: number };
  expectations: { total: number; uncovered: number; objectives: number; units: number };
}

export interface OutlineCheck {
  key: string;
  ok: boolean;
  title: string;
  detail: string;
  /** Page où compléter, relative au module (`/courses`, `/matching`…). */
  to?: string;
  toLabel?: string;
}

/** Titre vide ou titre par défaut « Séance 3 » : la séance n'a pas encore de vrai titre. */
export function isPlaceholderTitle(title: string): boolean {
  const t = title.trim();
  return t === "" || /^séance\s*\d+$/i.test(t);
}

/** « Séance 1 », « Séances 1 et 4 », « Séances 1, 4 et 6 ». */
export function formatNumbers(numbers: number[]): string {
  const n = [...numbers].sort((a, b) => a - b);
  if (n.length === 0) return "";
  if (n.length === 1) return `Séance ${n[0]}`;
  return `Séances ${n.slice(0, -1).join(", ")} et ${n.at(-1)}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « 2 objectifs pédagogiques · 2 unités ». */
export function expectationsSummary(objectives: number, units: number): string {
  return `${plural(objectives, "objectif pédagogique", "objectifs pédagogiques")} · ${plural(units, "unité", "unités")}`;
}

export function outlineChecks(input: OutlineCheckInput): OutlineCheck[] {
  const { courses, moduleHours, assessments, expectations } = input;
  const numbered = courses.map((c, i) => ({ ...c, number: i + 1 }));
  const checks: OutlineCheck[] = [];

  // 1. Séances datées et volume d'heures.
  const dated = numbered.filter((c) => c.sessionDate);
  const planned = dated.reduce(
    (sum, c) => sum + (calculateDuration(c.startTime, c.endTime) ?? 0),
    0,
  );
  if (courses.length === 0) {
    checks.push({
      key: "dated",
      ok: false,
      title: "Aucune séance",
      detail: "La progression se construit à partir des séances du module",
      to: "/schedule",
      toLabel: "saisir le planning",
    });
  } else if (dated.length < courses.length) {
    const missing = courses.length - dated.length;
    checks.push({
      key: "dated",
      ok: false,
      title: `${plural(missing, "séance", "séances")} sans date`,
      detail: formatNumbers(numbered.filter((c) => !c.sessionDate).map((c) => c.number)),
      to: "/courses",
      toLabel: "les dater",
    });
  } else {
    checks.push({
      key: "dated",
      ok: true,
      title: `${plural(courses.length, "séance datée", "séances datées")}`,
      detail:
        planned > 0
          ? moduleHours > 0
            ? `${formatDuration(planned)} sur ${formatDuration(moduleHours)} du module`
            : formatDuration(planned)
          : "Horaires non renseignés",
    });
  }

  // 2. Dates de mise à jour.
  if (courses.length > 0) {
    const stale = numbered.filter((c) => !c.contentUpdatedAt);
    checks.push(
      stale.length === 0
        ? {
            key: "updated",
            ok: true,
            title: "Dates de mise à jour à jour",
            detail: "Chaque séance a sa date de dernière modification",
          }
        : {
            key: "updated",
            ok: false,
            title: `${plural(stale.length, "séance", "séances")} sans date de mise à jour`,
            detail: `${formatNumbers(stale.map((c) => c.number))} · la date se pose dès que le contenu est modifié`,
            to: "/courses",
            toLabel: "ouvrir les séances",
          },
    );
  }

  // 3. Évaluations rattachées.
  if (assessments.total === 0) {
    checks.push({
      key: "assessments",
      ok: false,
      title: "Aucune évaluation prévue",
      detail: "Les évaluations rattachées aux séances apparaissent dans la progression",
      to: "/assessments",
      toLabel: "voir les évaluations",
    });
  } else if (assessments.linked < assessments.total) {
    const missing = assessments.total - assessments.linked;
    checks.push({
      key: "assessments",
      ok: false,
      title: `${plural(missing, "évaluation", "évaluations")} à rattacher à une séance`,
      detail: `${assessments.linked} sur ${assessments.total} rattachées`,
      to: "/assessments",
      toLabel: "voir le fil rouge",
    });
  } else {
    checks.push({
      key: "assessments",
      ok: true,
      title: `${plural(assessments.total, "évaluation rattachée", "évaluations rattachées")} aux séances`,
      detail: "Chacune apparaît dans la séance concernée",
      to: "/assessments",
      toLabel: "voir le fil rouge",
    });
  }

  if (courses.length > 0) {
    // 4. Titres.
    const untitled = numbered.filter((c) => isPlaceholderTitle(c.title));
    checks.push(
      untitled.length === 0
        ? { key: "titles", ok: true, title: "Toutes les séances ont un titre", detail: "" }
        : {
            key: "titles",
            ok: false,
            title: `${plural(untitled.length, "séance sans titre", "séances sans titre")}`,
            detail: formatNumbers(untitled.map((c) => c.number)),
            to: "/courses",
            toLabel: "les compléter",
          },
    );

    // 5. Objectifs.
    const noGoals = numbered.filter((c) => c.objectives.length === 0);
    checks.push(
      noGoals.length === 0
        ? { key: "goals", ok: true, title: "Toutes les séances ont des objectifs", detail: "" }
        : {
            key: "goals",
            ok: false,
            title: `${plural(noGoals.length, "séance sans objectifs", "séances sans objectifs")}`,
            detail: `${formatNumbers(noGoals.map((c) => c.number))} · un attendu au moins par séance suffit`,
            to: "/matching",
            toLabel: "rapprocher les attendus",
          },
    );
  }

  // 6. Attendus couverts.
  if (expectations.total === 0) {
    checks.push({
      key: "expectations",
      ok: false,
      title: "Aucun attendu enregistré",
      detail: "La progression s'appuie sur les attendus de l'école",
      to: "/expectations",
      toLabel: "lire la fiche",
    });
  } else if (expectations.uncovered > 0) {
    checks.push({
      key: "expectations",
      ok: false,
      title: `${plural(expectations.uncovered, "attendu non couvert", "attendus non couverts")}`,
      detail: `${expectationsSummary(expectations.objectives, expectations.units)} · tu peux générer quand même : ils seront signalés dans le PDF`,
      to: "/matching",
      toLabel: "rapprocher",
    });
  } else {
    checks.push({
      key: "expectations",
      ok: true,
      title: "Tous les attendus sont couverts",
      detail: expectationsSummary(expectations.objectives, expectations.units),
    });
  }

  return checks;
}

/** Phrase du bandeau d'échéance. `null` quand la progression est déjà envoyée. */
export function deadlineBanner(
  level: "sent" | "overdue" | "urgent" | "warning" | "ok" | "unknown",
  daysUntilDue: number | null,
  dueFr: string | null,
): { strong: string; rest: string; tone: "warn" | "info" } | null {
  if (level === "sent") return null;
  if (level === "unknown" || daysUntilDue === null || !dueFr) {
    return {
      strong: "Pas encore d'échéance.",
      rest: "Renseigne la date de la 1re séance : YNOV demande la progression 15 jours avant.",
      tone: "info",
    };
  }
  if (daysUntilDue < 0) {
    const n = -daysUntilDue;
    return {
      strong: `Échéance : ${dueFr}, dépassée de ${n} jour${n > 1 ? "s" : ""}.`,
      rest: "Ce n'est pas bloquant, mais envoie la progression dès qu'elle est prête : YNOV la demande 15 jours avant la 1re séance.",
      tone: "warn",
    };
  }
  const when =
    daysUntilDue === 0 ? "aujourd'hui" : `dans ${daysUntilDue} jour${daysUntilDue > 1 ? "s" : ""}`;
  return {
    strong: `Échéance : ${dueFr}, ${when}.`,
    rest: "YNOV demande la progression 15 jours avant la 1re séance.",
    tone: level === "urgent" ? "warn" : "info",
  };
}
