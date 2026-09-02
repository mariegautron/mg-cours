import type { Metadata } from "next";

import { createResource } from "@/app/(app)/resources/actions";
import { ResourceForm } from "@/components/resources/resource-form";

export const metadata: Metadata = { title: "Nouvelle ressource" };

export default function NewResourcePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle ressource</h1>
      <ResourceForm action={createResource} />
    </div>
  );
}
