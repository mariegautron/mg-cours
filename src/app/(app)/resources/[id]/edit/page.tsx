import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateResource } from "@/app/(app)/resources/actions";
import { ResourceForm } from "@/components/resources/resource-form";
import { subjectSuggestions } from "@/lib/resources/kind";
import { getResource, getResourceUsage, resourceFacets } from "@/lib/resources/queries";
import { schoolYearOf } from "@/lib/modules/list-state";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { readCourseOrigin } from "@/lib/resources/course-origin";

export const metadata: Metadata = { title: "Modifier la ressource" };

export default async function EditResourcePage({
  params,
  searchParams,
}: PageProps<"/resources/[id]/edit">) {
  const { id } = await params;
  const sp = await searchParams;
  const [resource, { categories }, origin, usage] = await Promise.all([
    getResource(id),
    resourceFacets(),
    readCourseOrigin(sp),
    getResourceUsage(id),
  ]);
  if (!resource) notFound();
  // Ressource partagée : une modification change tous les modules qui l'utilisent.
  const from = origin ? usage.find((m) => m.id === origin.moduleId) : null;
  // Séances qui ne gardent que certaines parties (sans la colonne : aucune).
  const { data: partial, error: partialError } = await (
    await createClient()
  )
    .from("course_resource")
    .select("course_id")
    .eq("resource_id", id)
    .not("selected_sections", "is", null);
  const partialCount = partialError ? 0 : (partial ?? []).length;

  return (
    <div className="space-y-6">
      <h1>Modifier « {resource.title} »</h1>
      {usage.length > 1 ? (
        <div
          role="note"
          className="border-status-todo bg-muted space-y-2 rounded-xl border p-3 text-sm"
        >
          <p>
            <strong>Utilisée dans {usage.length} modules</strong> :{" "}
            {usage.map((m) => `${m.name} (${schoolYearOf(m.year)})`).join(", ")}. Ta modification
            changera les {usage.length}.
            {partialCount
              ? ` ${partialCount} séance${partialCount > 1 ? "s" : ""} n’en ${partialCount > 1 ? "gardent" : "garde"} que certaines parties.`
              : ""}
          </p>
          <Link
            href={`/resources/${id}?dupliquer=1${origin ? `&module=${origin.moduleId}&course=${origin.courseId}` : ""}#dupliquer`}
            className="font-semibold underline underline-offset-2"
          >
            {from
              ? `Faire plutôt une copie pour ${from.name} (${schoolYearOf(from.year)})`
              : "Faire plutôt une copie"}
          </Link>
        </div>
      ) : null}
      <ResourceForm
        action={updateResource.bind(null, id)}
        resource={resource}
        subjects={subjectSuggestions(categories)}
        origin={origin}
      />
    </div>
  );
}
