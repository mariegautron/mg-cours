/**
 * Écran « Où j'en suis » refait sur la maquette (OuJenSuis, OuJenSuisPret, OuJenSuisFini) : la grande
 * carte du haut dit quoi faire maintenant, en une phrase et un bouton. Fonctions pures.
 */
import type { ModuleStep, ModuleSteps, StepKey } from "@/lib/ynov/module-steps";

export type HeroKind = "step" | "ready" | "finished";

export interface HeroLink {
  label: string;
  href: string;
}

export interface Hero {
  kind: HeroKind;
  eyebrow: string;
  title: string;
  text: string;
  primary: HeroLink | null;
  secondary: HeroLink | null;
  /** « Terminer et ranger » : le bouton est le composant de confirmation, pas un lien. */
  offerFinish: boolean;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Titre de la grande carte pour l'étape courante (à la forme verbale, tutoiement). */
const HEADLINES: Record<StepKey, string> = {
  fiche: "Lire la fiche de l’école et tes attendus",
  matching: "Rapprocher tes ressources des attendus",
  sessions: "Construire tes séances",
  planning: "Prévoir tes évaluations et le fil rouge",
  outline: "Générer la progression pédagogique",
  send: "Envoyer la progression à l’école",
  teach: "Faire cours",
  assess: "Noter les évaluations",
  admin: "Cocher les documents administratifs",
  invoice: "Facturer le module",
};

const TEXTS: Record<StepKey, (s: ModuleStep) => string> = {
  fiche: () =>
    "Dépose la fiche de l’école : je lis les attendus du module, tu les corriges avant de continuer.",
  matching: (s) =>
    `${cap(s.summary)}. Je te propose les ressources qui correspondent ; tu retiens, ou tu notes ce qu’il te reste à construire.`,
  sessions: (s) =>
    `${cap(s.summary)}. Prépare chaque séance : déroulé, ressources, consigne de fin.`,
  planning: (s) =>
    `${cap(s.summary)}. Prévois les évaluations et le fil rouge, et place-les dans tes séances, pour atteindre les notes exigées.`,
  outline: () =>
    "Les séances sont prêtes : génère la progression pédagogique que l’école attend, tu la relis avant de l’envoyer.",
  send: (s) => `${cap(s.summary)}. Envoie la progression à l’école, puis marque-la comme envoyée.`,
  teach: (s) => `${cap(s.summary)}. Tout est en place : ouvre ta séance du jour.`,
  assess: (s) => `${cap(s.summary)}. Saisis les notes manquantes pour pouvoir facturer.`,
  admin: (s) => `${cap(s.summary)}. Coche les documents administratifs reçus ou envoyés.`,
  invoice: (s) => `${cap(s.summary)}. La facture est la dernière étape du module.`,
};

/** Libellé du bouton « passer à l'étape d'après ». */
const SKIP: Partial<Record<StepKey, string>> = {
  fiche: "Passer au rapprochement",
  matching: "Passer aux séances",
  sessions: "Passer aux évaluations",
  planning: "Passer à la progression",
  outline: "Passer à l’envoi",
  send: "Passer à la suite",
};

const PREP_KEYS: StepKey[] = ["fiche", "matching", "sessions", "planning", "outline", "send"];

/** « 12/10 » depuis AAAA-MM-JJ. */
export function shortDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function buildHero(input: {
  moduleId: string;
  journey: ModuleSteps;
  /** Date de la première séance (AAAA-MM-JJ) ou `null`. */
  firstSessionDate: string | null;
  firstCourse: { id: string; position: number } | null;
  courses: { total: number; done: number };
  /** Module terminé ou rangé : la carte le dit, sans bouton de rangement. */
  closed: boolean;
}): Hero | null {
  const { journey, moduleId } = input;
  if (journey.steps.length === 0 && !input.closed) return null;
  const base = `/modules/${moduleId}`;

  if (input.closed || (journey.steps.length > 0 && journey.current === null)) {
    return {
      kind: "finished",
      eyebrow: `${journey.steps.length || 10} étapes sur ${journey.steps.length || 10}`,
      title: "Ce module est terminé",
      text: input.closed
        ? "Il est terminé : tout reste consultable (notes, résultats publiés, observations, facture, fil rouge)."
        : "Cours faits, notes saisies, facture payée. Tu peux le ranger.",
      primary: null,
      secondary: null,
      offerFinish: !input.closed,
    };
  }

  const current = journey.current!;
  const prepared = PREP_KEYS.every((k) => journey.steps.find((s) => s.key === k)?.state === "done");
  if (current.key === "teach" && prepared && input.courses.done === 0) {
    const date = input.firstSessionDate ? shortDay(input.firstSessionDate) : null;
    return {
      kind: "ready",
      eyebrow: `Prochaine étape · ${current.number} sur ${journey.steps.length}`,
      title: date ? `Tout est prêt pour le ${date}` : "Tout est prêt",
      text: `Les ${input.courses.total} séances, les évaluations et la progression envoyée : il ne reste plus qu’à faire cours.`,
      primary: input.firstCourse
        ? {
            label: `Voir la séance ${input.firstCourse.position}`,
            href: `${base}/courses/${input.firstCourse.id}/edit`,
          }
        : null,
      secondary: { label: "Préparer les groupes", href: `${base}/groups/wizard` },
      offerFinish: false,
    };
  }

  const nextTodo = journey.steps.find((s) => s.number > current.number && s.state !== "done");
  return {
    kind: "step",
    eyebrow: `Prochaine étape · ${current.number} sur ${journey.steps.length}`,
    title: HEADLINES[current.key],
    text: TEXTS[current.key](current),
    primary: { label: `${current.action.label} →`, href: current.action.href },
    secondary:
      SKIP[current.key] && nextTodo
        ? { label: SKIP[current.key]!, href: nextTodo.action.href }
        : null,
    offerFinish: false,
  };
}

/** Les étapes d'après la préparation s'estompent tant qu'elles ne sont pas en cours. */
export function isLater(
  step: Pick<ModuleStep, "key" | "state">,
  currentKey: StepKey | null,
): boolean {
  if (step.state === "done" || step.key === currentKey) return false;
  return !PREP_KEYS.includes(step.key);
}

/** « Fait · 6 attendus » / « 0 couvert sur 6 » : sous-titre d'une étape. */
export function stepSubtitle(step: Pick<ModuleStep, "state" | "summary">): string {
  return step.state === "done" ? `Fait · ${step.summary}` : cap(step.summary);
}
