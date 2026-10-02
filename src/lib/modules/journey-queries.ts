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
import { getOutline } from "@/lib/outline/queries";
import { trameStatus } from "@/lib/ynov/trame";

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
  const [notes, coverage] = await Promise.all([
    moduleNoteProgress(id, mod.total_hours, assessments),
    getModuleCoverage(id, expectations, retained),
  ]);
  return buildJourney({
    mod,
    courses,
    documents,
    expectations,
    coverage,
    outline,
    assessments,
    notes,
    trame: trameStatus(mod.first_session_date, mod.iceberg_state),
    invoice,
    invoiceCtx,
  });
});
