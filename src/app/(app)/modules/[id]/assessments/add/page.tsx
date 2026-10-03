import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SchoolGradeForm } from "@/components/assessments/school-grade-form";
import { Button } from "@/components/ui/button";
import { listGrids } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Ajouter une évaluation" };

/** Ajouter une évaluation (US-126) : depuis une grille de la bibliothèque, en créer une, ou une note de l'école. */
export default async function AddAssessmentPage({
  params,
}: PageProps<"/modules/[id]/assessments/add">) {
  const { id } = await params;
  const [mod, grids] = await Promise.all([getModule(id), listGrids()]);
  if (!mod) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Ajouter une évaluation — {mod.name}</h1>
        <p className="text-muted-foreground">Trois façons de faire, au choix.</p>
      </div>

      <section aria-labelledby="from-library" className="space-y-3 rounded-lg border p-4">
        <h2 id="from-library" className="text-lg font-medium">
          Depuis la bibliothèque
        </h2>
        <p className="text-muted-foreground text-sm">
          Choisis une grille de correction que tu as déjà : elle sera appliquée à la nouvelle
          évaluation de ce module.
        </p>
        {grids.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune grille pour l’instant.{" "}
            <Link href="/assessments/grids/new" className="underline underline-offset-2">
              Créer une grille
            </Link>
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {grids.map((g) => (
              <li key={g.id}>
                <Button asChild variant="outline" size="touch" className="w-full justify-start">
                  <Link href={`/modules/${id}/assessments/new?grille=${g.id}`}>
                    {g.name}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {g.criteria.length} critère{g.criteria.length > 1 ? "s" : ""}
                    </span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="create" className="space-y-3 rounded-lg border p-4">
        <h2 id="create" className="text-lg font-medium">
          En créer une nouvelle
        </h2>
        <p className="text-muted-foreground text-sm">
          Sujet, grille, groupes, date : le formulaire complet.
        </p>
        <Button asChild>
          <Link href={`/modules/${id}/assessments/new`}>Créer une évaluation</Link>
        </Button>
      </section>

      <section aria-labelledby="school" className="space-y-3 rounded-lg border p-4">
        <h2 id="school" className="text-lg font-medium">
          Une note de l’école
        </h2>
        <p className="text-muted-foreground text-sm">
          Une note que l’école impose (contrôle continu) : pas de sujet ni de grille, tu saisis
          seulement les notes.
        </p>
        <SchoolGradeForm moduleId={id} />
      </section>
    </div>
  );
}
