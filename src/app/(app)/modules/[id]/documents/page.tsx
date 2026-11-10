import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { DownloadButton } from "@/components/download-button";
import { ModuleDocuments } from "@/components/modules/module-documents";
import { Button } from "@/components/ui/button";
import { getModule, getModuleDocuments } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Documents du module" };

export default async function ModuleDocumentsPage({
  params,
}: PageProps<"/modules/[id]/documents">) {
  const { id } = await params;
  const [mod, documents] = await Promise.all([getModule(id), getModuleDocuments(id)]);
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

      {/* Exports pour Moodle : une seule fois, ici (doublon D25), plus sur chaque séance. */}
      <section aria-labelledby="moodle" className="space-y-3 rounded-lg border p-4">
        <h2 id="moodle" className="text-lg font-medium">
          Pour Moodle
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Cours en PDF :</span>
          <DownloadButton
            href={`/api/modules/${mod.id}/courses`}
            doneLabel="Cours téléchargés (un seul PDF)."
          >
            Un seul PDF
          </DownloadButton>
          <DownloadButton
            href={`/api/modules/${mod.id}/courses?format=zip`}
            kind="zip"
            doneLabel="Cours téléchargés (un PDF par séance)."
          >
            Un PDF par séance (zip)
          </DownloadButton>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Évaluations (sujet, critères, correction type) :
          </span>
          <DownloadButton
            href={`/api/modules/${mod.id}/evaluations`}
            kind="zip"
            doneLabel="Évaluations téléchargées (un dossier par évaluation)."
          >
            Toutes les évaluations (zip)
          </DownloadButton>
          <DownloadButton
            href={`/api/modules/${mod.id}/outline`}
            doneLabel="Progression pédagogique téléchargée."
          >
            Progression pédagogique (PDF)
          </DownloadButton>
        </div>
      </section>
    </div>
  );
}
