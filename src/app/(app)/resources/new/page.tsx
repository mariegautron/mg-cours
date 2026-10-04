import type { Metadata } from "next";

import { createResource } from "@/app/(app)/resources/actions";
import { ResourceForm } from "@/components/resources/resource-form";
import { listActiveModules } from "@/lib/modules/queries";
import { subjectSuggestions } from "@/lib/resources/kind";
import { resourceFacets } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Nouvelle ressource" };

export default async function NewResourcePage({ searchParams }: PageProps<"/resources/new">) {
  const sp = await searchParams;
  const [{ categories }, modules] = await Promise.all([resourceFacets(), listActiveModules()]);
  const moduleId = typeof sp.module === "string" ? sp.module : "";
  const title = typeof sp.title === "string" ? sp.title.slice(0, 200) : "";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle ressource</h1>
      <ResourceForm
        action={createResource}
        subjects={subjectSuggestions(categories)}
        modules={modules}
        defaultModuleId={modules.some((m) => m.id === moduleId) ? moduleId : ""}
        defaultTitle={title}
      />
    </div>
  );
}
