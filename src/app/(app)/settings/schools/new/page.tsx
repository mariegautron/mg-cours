import type { Metadata } from "next";

import { createSchool } from "@/app/(app)/settings/actions";
import { SchoolForm } from "@/components/settings/school-form";

export const metadata: Metadata = { title: "Nouvelle école" };

export default function NewSchoolPage() {
  return <SchoolForm title="Nouvelle école" action={createSchool} />;
}
