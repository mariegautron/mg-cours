import { cache } from "react";

import { listModuleAssessments, moduleNoteProgress } from "@/lib/assessments/queries";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { getModuleCoverage } from "@/lib/modules/coverage-queries";
import { buildJourney } from "@/lib/modules/journey";
import {
  getModule,
  getModuleCourses,
  getModuleDocuments,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";
import { isModuleShared } from "@/lib/modules/frise-queries";
import { getAppreciationProgress } from "@/lib/appreciations/queries";
import { getOutline } from "@/lib/outline/queries";
import { trameStatus } from "@/lib/ynov/trame";
import { loadMakeupGroups } from "@/lib/assessments/makeup-queries";
import { loadRoster } from "@/lib/students/enrollment";

/** Parcours du module pour la coque des sous-pages (la fiche calcule le sien avec ses données). */
export const getModuleJourney = cache(async (id: string) => {
  const mod = await getModule(id);
  if (!mod) return null;
  const [courses, documents, retained, expectations, assessments, outline, invoiceCtx, invoice] =
    await Promise.all([
      getModuleCourses(id),
      getModuleDocuments(id),
      getRetainedResources(id),
      getModuleExpectations(id),
      listModuleAssessments(id),
      getOutline(id),
      loadInvoiceContext(id),
      getInvoiceByModule(id),
    ]);
  const [notes, coverage, shared, appreciations, makeupGroups, roster] = await Promise.all([
    moduleNoteProgress(id, mod.total_hours, assessments),
    getModuleCoverage(id, expectations, retained),
    isModuleShared(id),
    getAppreciationProgress(id),
    loadMakeupGroups(id),
    loadRoster(id),
  ]);
  const makeupRows = makeupGroups.flatMap((g) => g.rows);
  return buildJourney({
    mod,
    courses,
    documents,
    expectations,
    coverage,
    outline,
    assessments,
    notes,
    trame: trameStatus(
      mod.first_session_date,
      mod.iceberg_state,
      new Date(),
      outline?.status === "sent" ||
        outline?.status === "validated" ||
        documents.some((x) => x.kind === "outline_sent"),
    ),
    invoice,
    invoiceCtx,
    shared,
    roster,
    appreciations,
    makeups: {
      pending: makeupRows.filter((r) => r.step !== "done").length,
      total: makeupRows.length,
    },
  });
});
