import type { Metadata } from "next";
import Link from "next/link";

import { ImportForm } from "@/components/questions/import-form";

export const metadata: Metadata = { title: "Importer des questions" };

export default function ImportQuestionsPage() {
  return (
    <div className="space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
        <Link href="/questions" className="underline-offset-2 hover:underline">
          Banque de questions
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold">Importer des questions</h1>
      <ImportForm />
    </div>
  );
}
