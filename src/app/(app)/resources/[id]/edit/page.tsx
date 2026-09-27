import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateResource } from "@/app/(app)/resources/actions";
import { ResourceForm } from "@/components/resources/resource-form";
import { subjectSuggestions } from "@/lib/resources/kind";
import { getResource, resourceFacets } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Modifier la ressource" };

export default async function EditResourcePage({ params }: PageProps<"/resources/[id]/edit">) {
  const { id } = await params;
  const [resource, { categories }] = await Promise.all([getResource(id), resourceFacets()]);
  if (!resource) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier « {resource.title} »</h1>
      <ResourceForm
        action={updateResource.bind(null, id)}
        resource={resource}
        subjects={subjectSuggestions(categories)}
      />
    </div>
  );
}
