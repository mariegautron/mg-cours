import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentsImportForm } from "@/components/students/students-import-form";
import { getModule } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Ajouter les étudiant·es" };

/** Import ouvert depuis un module : on reste dans le module, module et année imposés. */
export default async function ModuleImportStudentsPage({
  params,
}: PageProps<"/modules/[id]/groups/import">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl">Ajouter les étudiant·es</h1>
        <p className="text-muted-foreground">
          Dépose l’export Hyperplanning (CSV ou XLSX) tel quel. Aperçu avant tout enregistrement.
        </p>
      </div>
      <StudentsImportForm
        modules={[]}
        fixedModule={{ id: mod.id, name: mod.name, year: mod.year }}
      />
    </div>
  );
}
