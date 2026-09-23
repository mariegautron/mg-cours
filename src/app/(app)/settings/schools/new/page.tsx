import type { Metadata } from "next";

import { createSchool } from "@/app/(app)/settings/actions";
import { SchoolForm } from "@/components/settings/school-form";

export const metadata: Metadata = { title: "Nouvelle école" };

export default function NewSchoolPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle école</h1>
      <SchoolForm action={createSchool} />
    </div>
  );
}
