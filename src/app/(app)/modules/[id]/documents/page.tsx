import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

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
    </div>
  );
}
