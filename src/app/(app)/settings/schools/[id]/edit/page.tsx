import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateSchool } from "@/app/(app)/settings/actions";
import { SchoolForm } from "@/components/settings/school-form";
import { getSchool } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Modifier l’école" };

export default async function EditSchoolPage({ params }: PageProps<"/settings/schools/[id]/edit">) {
  const { id } = await params;
  const school = await getSchool(id);
  if (!school) notFound();

  return (
    <SchoolForm
      title={`Modifier « ${school.name} »`}
      action={updateSchool.bind(null, id)}
      school={school}
    />
  );
}
