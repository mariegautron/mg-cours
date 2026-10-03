import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminDocsChecklist } from "@/components/modules/admin-docs-checklist";
import { ArchiveModuleButton } from "@/components/modules/archive-module-button";
import { ModuleDangerZone } from "@/components/modules/module-danger-zone";
import { ModuleDocuments } from "@/components/modules/module-documents";
import { Button } from "@/components/ui/button";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { experienceNotes } from "@/lib/modules/duplicate-evaluations";
import { getModule, getModuleCourses, getModuleDocuments } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Documents du module" };

export default async function ModuleDocumentsPage({
  params,
}: PageProps<"/modules/[id]/documents">) {
  const { id } = await params;
  const [mod, courses, documents, assessments] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getModuleDocuments(id),
    listModuleAssessments(id),
  ]);
  if (!mod) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <section aria-labelledby="documents">
        <h1 id="documents" className="font-heading mb-3 text-2xl font-bold">
          Documents{documents.length ? ` (${documents.length})` : ""}
        </h1>
        {mod.slides_url ? (
          <p className="mb-3">
            <Button asChild size="sm" variant="secondary">
              <a href={mod.slides_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                Ouvrir les slides (Figma)
                <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
              </a>
            </Button>
          </p>
        ) : null}
        <ModuleDocuments moduleId={mod.id} documents={documents} />
      </section>

      <section aria-labelledby="billing" className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="billing" className="text-lg font-medium">
              Facturation
            </h2>
            <p className="text-muted-foreground text-sm">
              Conditions YNOV, mentions obligatoires et facture Factur-X.
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${mod.id}/billing`}>Voir la facturation</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="admin-docs" className="space-y-4">
        <h2 id="admin-docs" className="mb-3 text-lg font-medium">
          Documents administratifs
        </h2>
        <AdminDocsChecklist
          moduleId={mod.id}
          adminDocs={(mod.admin_docs as Record<string, boolean>) ?? {}}
        />
      </section>

      <section aria-labelledby="danger" className="space-y-4">
        <h2 id="danger" className="mb-3 text-lg font-medium">
          Actions
        </h2>
        <div className="space-y-6">
          <ArchiveModuleButton id={mod.id} archived={!!mod.archived_at} name={mod.name} />
          <ModuleDangerZone
            id={mod.id}
            name={mod.name}
            year={mod.year}
            assessmentExperience={experienceNotes(assessments)}
            experience={courses.flatMap((c, i) =>
              c.retro_note?.trim()
                ? [{ number: i + 1, title: c.title, text: c.retro_note.trim() }]
                : [],
            )}
          />
        </div>
      </section>
    </div>
  );
}
