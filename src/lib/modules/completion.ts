/**
 * US-131 : états « tout est prêt » et « terminé » de la page d'un module. Fonctions pures.
 */
import type { ModuleSteps } from "@/lib/ynov/module-steps";

export type ModuleStage = "in_progress" | "all_ready" | "finished";

/** Rangé = terminé ; sinon toutes les étapes faites = tout est prêt ; sinon en cours. */
export function moduleStage(journey: ModuleSteps, archived: boolean): ModuleStage {
  if (archived) return "finished";
  return journey.steps.length > 0 && journey.current === null ? "all_ready" : "in_progress";
}

export interface CompletionFacts {
  courses: { total: number; done: number };
  notes: { entered: number; required: number };
  invoice: "draft" | "ready" | "sent" | "paid" | null;
  totalHours: number | null;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

const INVOICE_TEXT = {
  draft: "facture en préparation",
  ready: "facture prête",
  sent: "facture envoyée",
  paid: "facture payée",
} as const;

/** Une phrase courte par chiffre qui compte, dans cet ordre : séances, notes, heures, facture. */
export function completionLines(f: CompletionFacts): string[] {
  const lines: string[] = [];
  if (f.courses.total > 0) {
    lines.push(
      `${f.courses.done} séance${f.courses.done > 1 ? "s" : ""} sur ${f.courses.total} faite${f.courses.done > 1 ? "s" : ""}`,
    );
  }
  if (f.notes.required > 0 || f.notes.entered > 0) {
    lines.push(
      plural(f.notes.entered, "note saisie", "notes saisies") +
        (f.notes.required ? ` (${f.notes.required} exigée${f.notes.required > 1 ? "s" : ""})` : ""),
    );
  }
  if (f.totalHours) lines.push(`${f.totalHours} heures`);
  if (f.invoice) lines.push(INVOICE_TEXT[f.invoice]);
  return lines;
}

export const STAGE_TEXT = {
  all_ready: {
    title: "Tout est prêt",
    body: "Toutes les étapes sont faites. Tu peux ranger ce module : il quittera le tableau de bord et la facturation, et reste consultable.",
  },
  finished: {
    title: "Module terminé",
    body: "Ce module est rangé. Tout reste consultable ; tu peux le rouvrir si besoin.",
  },
} as const;
