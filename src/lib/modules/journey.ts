import type { AssessmentWithMeta } from "@/lib/assessments/queries";
import type { NoteProgress } from "@/lib/ynov/notation";
import type { InvoiceContext } from "@/lib/ynov/invoice";
import type { CoverageSummary } from "@/lib/modules/matching";
import type {
  CourseWithResources,
  ModuleExpectation,
  ModuleWithSchool,
} from "@/lib/modules/queries";
import type { Tables } from "@/types/db";
import { isOutlineSent } from "@/lib/ynov/iceberg";
import { invoiceBlockers, missingInvoiceData, REQUIRED_ADMIN_DOCS } from "@/lib/ynov/invoice";
import { moduleSteps, type ModuleSteps } from "@/lib/ynov/module-steps";
import type { trameStatus } from "@/lib/ynov/trame";

export interface JourneyData {
  mod: ModuleWithSchool;
  courses: CourseWithResources[];
  documents: Tables<"module_document">[];
  expectations: ModuleExpectation[];
  coverage: CoverageSummary;
  outline: Tables<"pedagogical_outline"> | null;
  assessments: AssessmentWithMeta[];
  notes: NoteProgress;
  trame: ReturnType<typeof trameStatus>;
  invoice: Tables<"invoice"> | null;
  invoiceCtx: InvoiceContext | null;
}

/** Contexte de `moduleSteps` à partir des données chargées de la fiche module. */
export function buildJourney(d: JourneyData): ModuleSteps {
  const adminDocsDone = (d.mod.admin_docs as Record<string, boolean>) ?? {};
  return moduleSteps({
    moduleId: d.mod.id,
    archived: !!d.mod.archived_at,
    hasFiche: d.documents.some((x) => x.kind === "school_expectations"),
    expectationsCount: d.expectations.length,
    coverage: d.coverage,
    courses: {
      total: d.courses.length,
      ready: d.courses.filter((c) => c.prep_status === "ready").length,
      // Clôture du carnet : une séance clôturée « faite » ou « partielle » a bien eu lieu.
      done: d.courses.filter((c) => c.completion === "done" || c.completion === "partial").length,
    },
    outlineGeneratedAt: d.outline?.generated_at ?? null,
    outlineSent:
      isOutlineSent(d.mod.iceberg_state) || d.documents.some((x) => x.kind === "outline_sent"),
    outlineDueDate: d.trame.dueDate ? d.trame.dueDate.toISOString() : null,
    notes: {
      entered: d.notes.enteredTotal,
      required: d.notes.requirement.total,
      satisfied: d.notes.satisfied,
    },
    // Toute évaluation du module compte, rattachée à une séance ou non (un rattrapage n'est pas une note de plus).
    plannedAssessments: d.assessments.filter((a) => !a.makeup_of_id).length,
    adminDocs: {
      done: REQUIRED_ADMIN_DOCS.filter((x) => adminDocsDone[x.key]).length,
      total: REQUIRED_ADMIN_DOCS.length,
    },
    invoice: d.invoice?.status ?? null,
    billingReady: d.invoiceCtx
      ? invoiceBlockers(d.invoiceCtx).length + missingInvoiceData(d.invoiceCtx).length === 0
      : false,
  });
}

/** Bouton « Prochaine étape » de l'en-tête : étape + lien, ou « Tout est prêt » sans action. */
export type NextStepButton =
  | { kind: "action"; label: string; href: string }
  | { kind: "ready"; label: "Tout est prêt" }
  | null;

export function nextStepButton(journey: ModuleSteps): NextStepButton {
  if (journey.current) {
    return {
      kind: "action",
      label: journey.current.action.label,
      href: journey.current.action.href,
    };
  }
  return journey.steps.length ? { kind: "ready", label: "Tout est prêt" } : null;
}
