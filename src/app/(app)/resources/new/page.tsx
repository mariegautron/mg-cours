import type { Metadata } from "next";

import { createResource } from "@/app/(app)/resources/actions";
import { ResourceForm } from "@/components/resources/resource-form";
import { subjectSuggestions } from "@/lib/resources/kind";
import { resourceFacets } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Nouvelle ressource" };

export default async function NewResourcePage() {
  const { categories } = await resourceFacets();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle ressource</h1>
      <ResourceForm action={createResource} subjects={subjectSuggestions(categories)} />
    </div>
  );
}
