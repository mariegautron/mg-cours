import type { Metadata } from "next";

import { createGrid } from "@/app/(app)/assessments/grids/actions";
import { GridForm } from "@/components/assessments/grid-form";

export const metadata: Metadata = { title: "Nouvelle grille" };

export default function NewGridPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nouvelle grille de correction</h1>
      <GridForm action={createGrid} />
    </div>
  );
}
