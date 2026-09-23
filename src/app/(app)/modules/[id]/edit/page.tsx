import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateModule } from "@/app/(app)/modules/actions";
import { ModuleForm } from "@/components/modules/module-form";
import { getModule, listSchools } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Modifier le module" };

export default async function EditModulePage({ params }: PageProps<"/modules/[id]/edit">) {
  const { id } = await params;
  const [mod, schools] = await Promise.all([getModule(id), listSchools()]);
  if (!mod) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Modifier « {mod.name} »</h1>
      <ModuleForm action={updateModule.bind(null, id)} schools={schools} module={mod} />
    </div>
  );
}
