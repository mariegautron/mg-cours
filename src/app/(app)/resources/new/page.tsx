import type { Metadata } from "next";

import { createResource } from "@/app/(app)/resources/actions";
import { ResourceForm } from "@/components/resources/resource-form";
import { listActiveModules } from "@/lib/modules/queries";
import { subjectSuggestions } from "@/lib/resources/kind";
import { resourceFacets } from "@/lib/resources/queries";
import { readCourseOrigin } from "@/lib/resources/course-origin";

export const metadata: Metadata = { title: "Nouvelle ressource" };

export default async function NewResourcePage({ searchParams }: PageProps<"/resources/new">) {
  const sp = await searchParams;
  const [{ categories }, modules, origin] = await Promise.all([
    resourceFacets(),
    listActiveModules(),
    readCourseOrigin(sp),
  ]);
  const moduleId = typeof sp.module === "string" ? sp.module : "";
  const title = typeof sp.title === "string" ? sp.title.slice(0, 200) : "";
  return (
    <div className="space-y-6">
      <div>
        {origin ? (
          <p className="text-primary text-xs font-bold tracking-widest uppercase">
            Pour la {origin.label.replace(/^Séance/, "séance")}
          </p>
        ) : null}
        <h1 className="text-2xl font-semibold">Nouvelle ressource</h1>
        {origin ? (
          <p className="text-muted-foreground text-sm">
            À l’enregistrement, elle est retenue pour le module et ajoutée à la fin du déroulé.
          </p>
        ) : null}
      </div>
      <ResourceForm
        action={createResource}
        subjects={subjectSuggestions(categories)}
        modules={modules}
        defaultModuleId={modules.some((m) => m.id === moduleId) ? moduleId : ""}
        defaultTitle={title}
        origin={origin}
      />
    </div>
  );
}
