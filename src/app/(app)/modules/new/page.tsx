import type { Metadata } from "next";

import { createModule } from "@/app/(app)/modules/actions";
import { ModuleForm } from "@/components/modules/module-form";
import { listSchools } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Nouveau module" };

export default async function NewModulePage() {
  const schools = await listSchools();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouveau module</h1>
      <ModuleForm action={createModule} schools={schools} />
    </div>
  );
}
