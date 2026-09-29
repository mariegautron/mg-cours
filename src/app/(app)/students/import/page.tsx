import type { Metadata } from "next";

import { listActiveModules } from "@/lib/modules/queries";
import { StudentsImportForm } from "@/components/students/students-import-form";

export const metadata: Metadata = { title: "Importer des étudiant·es" };

export default async function ImportStudentsPage() {
  const modules = await listActiveModules();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Importer des étudiant·es</h1>
        <p className="text-muted-foreground">
          Fichier CSV ou XLSX (export Hyperplanning, tableur…). Aperçu avant tout enregistrement.
        </p>
      </div>
      <StudentsImportForm modules={modules} />
    </div>
  );
}
