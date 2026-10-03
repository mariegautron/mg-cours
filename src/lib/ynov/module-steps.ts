/**
 * E18 : « Où j'en suis » — parcours d'un module en 10 étapes, de la fiche de l'école au paiement.
 * Fonction pure, source unique du badge « Prochaine étape » de la fiche module. La facturation
 * (`/billing`) continue d'utiliser `nextStep()` (next-step.ts) pour ses raisons de blocage.
 * Les étapes ne sont pas rigides : un module déjà réalisé valide directement les étapes concernées.
 */
import type { CoverageSummary } from "@/lib/modules/matching";

export type StepState = "done" | "todo" | "in_progress" | "waiting";
export type StepKey =
  | "fiche"
  | "matching"
  | "sessions"
  | "planning"
  | "outline"
  | "send"
  | "teach"
  | "assess"
  | "admin"
  | "invoice";

export interface ModuleStepsContext {
  moduleId: string;
  archived: boolean;
  /** Un document « Attendus de l'école » est déposé. */
  hasFiche: boolean;
  expectationsCount: number;
  coverage: CoverageSummary;
  courses: { total: number; ready: number; done: number };
  /** Progression générée (date ISO) ou `null`. */
  outlineGeneratedAt: string | null;
  /** Progression envoyée (état iceberg) ou PDF déposé. */
  outlineSent: boolean;
  /** Échéance J-15 (date ISO) ou `null` sans date de 1re séance. */
  outlineDueDate: string | null;
  notes: { entered: number; required: number; satisfied: boolean };
  /** Évaluations (hors rattrapages) rattachées à une séance. */
  plannedAssessments: number;
  adminDocs: { done: number; total: number };
  invoice: "draft" | "ready" | "sent" | "paid" | null;
  /** Aucun blocage de processus ni donnée de facturation manquante. */
  billingReady: boolean;
}

export interface ModuleStep {
  key: StepKey;
  number: number;
  title: string;
  state: StepState;
  /** Détail chiffré : « 6 attendus », « 3/6 faites »… */
  summary: string;
  action: { label: string; href: string };
  /** Formulation pour le badge : « Prochaine étape : {badge} ». */
  badge: string;
}

export interface ModuleSteps {
  /** Vide pour un module archivé. */
  steps: ModuleStep[];
  /** Première étape non terminée ; `null` si tout est fait ou module archivé. */
  current: ModuleStep | null;
  /** « Prochaine étape : … », « Parcours terminé » ; `null` pour un module archivé. */
  badge: string | null;
}

export const STATE_LABELS: Record<StepState, string> = {
  done: "Fait",
  todo: "À faire",
  in_progress: "En cours",
  waiting: "En attente",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

const dateFr = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

/** « 4 couverts, 2 à construire » (+ « 1 sans ressource »). */
export function coverageSummary(c: CoverageSummary): string {
  const parts = [plural(c.covered, "couvert")];
  if (c.toBuild) parts.push(`${c.toBuild} à construire`);
  if (c.uncovered) parts.push(`${c.uncovered} sans ressource`);
  return parts.join(", ");
}

export function moduleSteps(ctx: ModuleStepsContext): ModuleSteps {
  if (ctx.archived) return { steps: [], current: null, badge: null };

  const base = `/modules/${ctx.moduleId}`;
  const { courses, coverage, notes, adminDocs, invoice } = ctx;

  // Module déjà réalisé : progression envoyée = préparation faite ; facture émise = tout le reste.
  const prepared = ctx.outlineSent || invoice !== null;
  const delivered = invoice !== null;

  const ficheDone = prepared || (ctx.hasFiche && ctx.expectationsCount > 0);
  const matchingDone =
    prepared || (ctx.expectationsCount > 0 && coverage.total > 0 && coverage.uncovered === 0);
  const sessionsDone = prepared || courses.ready >= 1;
  const planningDone = prepared || (notes.required > 0 && ctx.plannedAssessments >= notes.required);
  const outlineDone = prepared || ctx.outlineGeneratedAt !== null;
  const sendDone = prepared;
  const teachDone = delivered || (courses.total > 0 && courses.done === courses.total);
  const assessDone = delivered || notes.satisfied;
  const adminDone = delivered || (adminDocs.total > 0 && adminDocs.done === adminDocs.total);

  const inProgress = (done: boolean, started: boolean): StepState =>
    done ? "done" : started ? "in_progress" : "todo";

  let invoiceState: StepState = "todo";
  let invoiceSummary = ctx.billingReady ? "facture à générer" : "blocages à lever avant la facture";
  let invoiceAction = { label: "Voir la facturation", href: `${base}/billing` };
  let invoiceBadge = "lever les blocages de facturation";
  if (invoice === "paid") {
    invoiceState = "done";
    invoiceSummary = "facture payée";
    invoiceBadge = "facture payée";
  } else if (invoice === "sent") {
    invoiceState = "waiting";
    invoiceSummary = "facture envoyée, paiement à suivre";
    invoiceAction = { label: "Suivre le paiement", href: `${base}/billing` };
    invoiceBadge = "suivre le paiement de la facture";
  } else if (invoice) {
    invoiceState = "in_progress";
    invoiceSummary = "facture à envoyer";
    invoiceAction = { label: "Envoyer la facture", href: `${base}/billing` };
    invoiceBadge = "envoyer la facture";
  } else if (ctx.billingReady) {
    invoiceAction = { label: "Générer la facture", href: `${base}/billing` };
    invoiceBadge = "générer la facture";
  }

  const steps: Omit<ModuleStep, "number">[] = [
    {
      key: "fiche",
      title: "Fiche de l’école et attendus",
      state: inProgress(ficheDone, ctx.hasFiche || ctx.expectationsCount > 0),
      summary:
        ctx.expectationsCount > 0
          ? plural(ctx.expectationsCount, "attendu")
          : ctx.hasFiche
            ? "fiche déposée, attendus à lire"
            : "aucune fiche déposée",
      action: { label: "Lire les attendus de la fiche", href: `${base}/expectations` },
      badge: "lire les attendus de la fiche",
    },
    {
      key: "matching",
      title: "Rapprocher les ressources",
      state: inProgress(matchingDone, coverage.covered + coverage.toBuild > 0),
      summary: ctx.expectationsCount > 0 ? coverageSummary(coverage) : "aucun attendu à rapprocher",
      action: { label: "Rapprocher mes ressources", href: `${base}/matching` },
      badge: "rapprocher les ressources des attendus",
    },
    {
      key: "sessions",
      title: "Construire les séances",
      state: inProgress(sessionsDone, courses.total > 0),
      summary:
        courses.total > 0
          ? `${plural(courses.total, "séance")}, ${plural(courses.ready, "prête")}`
          : "aucune séance",
      action:
        courses.total > 0
          ? { label: "Préparer mes séances", href: `${base}/courses` }
          : { label: "Créer les séances", href: `${base}/schedule` },
      badge: courses.total > 0 ? "préparer les séances" : "créer les séances",
    },
    {
      key: "planning",
      title: "Prévoir les évaluations et le fil rouge",
      state: inProgress(planningDone, ctx.plannedAssessments > 0),
      summary: `${ctx.plannedAssessments} / ${notes.required} ${notes.required > 1 ? "notes prévues" : "note prévue"}`,
      action: { label: "Prévoir mes évaluations", href: `${base}/assessments` },
      badge: "prévoir les évaluations et le fil rouge",
    },
    {
      key: "outline",
      title: "Générer la progression pédagogique",
      state: outlineDone ? "done" : "todo",
      summary: ctx.outlineGeneratedAt
        ? `générée le ${dateFr(ctx.outlineGeneratedAt)}`
        : "pas encore générée",
      action: { label: "Générer la progression", href: `${base}/outline` },
      badge: "générer la progression pédagogique",
    },
    {
      key: "send",
      title: "Envoyer la progression (échéance J-15)",
      state: sendDone ? "done" : "todo",
      summary: ctx.outlineSent
        ? "envoyée"
        : ctx.outlineDueDate
          ? `à envoyer avant le ${dateFr(ctx.outlineDueDate)}`
          : "date de la 1re séance à renseigner",
      action:
        !ctx.outlineSent && !ctx.outlineDueDate
          ? { label: "Renseigner la date de la 1re séance", href: `${base}/edit` }
          : { label: "Envoyer la progression", href: `${base}/outline` },
      badge: "envoyer la progression pédagogique",
    },
    {
      key: "teach",
      title: "Faire cours",
      state: inProgress(teachDone, courses.done > 0),
      summary: `${courses.done}/${courses.total} faites`,
      action: { label: "Faire cours", href: `/present/modules/${ctx.moduleId}` },
      badge: "faire cours",
    },
    {
      key: "assess",
      title: "Évaluer",
      state: inProgress(assessDone, notes.entered > 0),
      summary: `${notes.entered}/${notes.required} ${notes.required > 1 ? "notes" : "note"}`,
      action: { label: "Saisir les notes", href: `${base}/assessments` },
      badge: `saisir les notes manquantes (${notes.entered}/${notes.required} requises)`,
    },
    {
      key: "admin",
      title: "Documents administratifs",
      state: inProgress(adminDone, adminDocs.done > 0),
      summary: `${adminDocs.done}/${adminDocs.total}`,
      action: { label: "Cocher les documents", href: `${base}/documents` },
      badge: "cocher les documents administratifs",
    },
    {
      key: "invoice",
      title: "Facturer",
      state: invoiceState,
      summary: invoiceSummary,
      action: invoiceAction,
      badge: invoiceBadge,
    },
  ];

  const numbered = steps.map((s, i) => ({ ...s, number: i + 1 }));
  const current = numbered.find((s) => s.state !== "done") ?? null;
  return {
    steps: numbered,
    current,
    badge: current ? `Prochaine étape : ${current.badge}` : "Parcours terminé",
  };
}
