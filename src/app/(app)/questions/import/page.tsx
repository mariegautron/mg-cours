import type { Metadata } from "next";

import { ImportForm } from "@/components/questions/import-form";

export const metadata: Metadata = { title: "Importer des questions" };

export default function ImportQuestionsPage() {
  return (
    <div className="space-y-6">
      <h1>Importer des questions</h1>
      <ImportForm />
    </div>
  );
}
