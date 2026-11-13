/**
 * Phase d'un module (lot N4) : Préparer · Enseigner · Clôturer. Fonction pure.
 * - Préparer : tant que la 1re séance n'a pas eu lieu ;
 * - Enseigner : jusqu'à la dernière séance passée ;
 * - Clôturer : ensuite (ou module terminé / archivé).
 */
import type { ModuleStep, StepKey } from "@/lib/ynov/module-steps";

export type ModulePhase = "prepare" | "teach" | "close";

export const PHASES: { key: ModulePhase; label: string; param: string }[] = [
  { key: "prepare", label: "Préparer", param: "preparer" },
  { key: "teach", label: "Enseigner", param: "enseigner" },
  { key: "close", label: "Clôturer", param: "cloturer" },
];

export function phaseFromParam(value: unknown): ModulePhase | null {
  return PHASES.find((p) => p.param === value)?.key ?? null;
}

export function modulePhase(input: {
  today: string;
  closed: boolean;
  courses: readonly { session_date: string | null; completion?: string | null }[];
}): ModulePhase {
  if (input.closed) return "close";
  const dates = input.courses
    .map((c) => c.session_date)
    .filter((d): d is string => !!d)
    .sort();
  const anyDone = input.courses.some((c) => c.completion === "done" || c.completion === "partial");
  if (dates.length === 0) return anyDone ? "teach" : "prepare";
  if (dates[0] > input.today && !anyDone) return "prepare";
  if (dates[dates.length - 1] < input.today) return "close";
  return "teach";
}

/**
 * Étapes de préparation (contenu PROVISOIRE : Arnaud redéfinit la liste de « Préparer »). Reprend
 * les étapes actuelles de `module-steps.ts`.
 */
export const PREPARE_STEP_KEYS: StepKey[] = [
  "fiche",
  "sessions",
  "planning",
  "outline",
  "send",
  "share",
  "class",
];

/** Étapes de fin de module (avis à part : il a sa propre page). */
export const CLOSE_STEP_KEYS: StepKey[] = ["appreciations", "admin", "invoice", "finish"];

export function stepsFor(steps: readonly ModuleStep[], keys: readonly StepKey[]): ModuleStep[] {
  return keys.flatMap((k) => steps.filter((s) => s.key === k));
}

/** Une phase est finie quand toutes ses étapes le sont (Enseigner : quand on est passé à Clôturer). */
export function phaseDone(phase: ModulePhase, current: ModulePhase, steps: readonly ModuleStep[]) {
  if (phase === "prepare")
    return (
      current !== "prepare" || stepsFor(steps, PREPARE_STEP_KEYS).every((s) => s.state === "done")
    );
  if (phase === "teach") return current === "close";
  return stepsFor(steps, CLOSE_STEP_KEYS).every((s) => s.state === "done");
}
