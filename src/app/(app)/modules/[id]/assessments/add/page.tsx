import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SchoolGradeForm } from "@/components/assessments/school-grade-form";
import { Button } from "@/components/ui/button";
import { reuseAssessment } from "@/app/(app)/modules/[id]/assessments/reuse-action";
import { listAllAssessments, listGrids } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Ajouter une évaluation" };

const card = "bg-card rounded-3xl border p-5 shadow-sm";

/**
 * Ajouter ou rattacher une évaluation (US-126, maquette « EvalAjouter ») : les façons d'en ajouter
 * une. La liste des évaluations du module et les notes exigées sont dans la vue d'ensemble (doublon D11).
 */
export default async function AddAssessmentPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/add">) {
  const { id } = await params;
  const jalon = (await searchParams).jalon === "1";
  const mod = await getModule(id);
  if (!mod) notFound();
  const grids = await listGrids();

  const otherAssessments = (await listAllAssessments()).filter(
    (a) => a.module_id !== id && !a.makeup_of_id,
  );

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Évaluations
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Ajouter une évaluation — {mod.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Quatre façons de faire, au choix. Les évaluations déjà prévues sont dans la vue
            d’ensemble.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${id}/assessments`}>← Vue d’ensemble</Link>
        </Button>
      </div>

      <div className="max-w-[48rem]">
        <div className="w-full min-w-0 space-y-4">
          <section aria-labelledby="ad" className={card}>
            <h2 id="ad" className="font-heading mb-3 text-2xl font-bold">
              Ajouter une évaluation
            </h2>
            <div className="flex flex-col gap-2.5">
              <section aria-labelledby="create" className="bg-muted/40 rounded-2xl border p-4">
                <h3 id="create" className="text-lg font-bold">
                  En créer une nouvelle
                </h3>
                <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
                  Sujet, grille, groupes, date : le formulaire complet.
                </p>
                <Button asChild>
                  <Link href={`/modules/${id}/assessments/new${jalon ? "?jalon=1" : ""}`}>
                    Créer une évaluation
                  </Link>
                </Button>
              </section>
              <section
                aria-labelledby="create-review"
                className="bg-muted/40 rounded-2xl border p-4"
              >
                <h3 id="create-review" className="text-lg font-bold">
                  Point d’étape
                </h3>
                <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
                  Un dépôt commenté par critère (en avance, sur la bonne voie, à revoir), rattaché à
                  l’évaluation notée qui le prend en compte. Non noté par défaut (hors moyenne), ou
                  noté si tu coches « Noté ».
                </p>
                <Button asChild variant="outline">
                  <Link href={`/modules/${id}/assessments/new?type=etape`}>
                    Créer un point d’étape
                  </Link>
                </Button>
              </section>
              {otherAssessments.length > 0 ? (
                <section
                  aria-labelledby="from-module"
                  className="bg-muted/40 rounded-2xl border p-4"
                >
                  <h3 id="from-module" className="text-lg font-bold">
                    Reprendre une évaluation d’un autre module
                  </h3>
                  <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
                    Sujet, grille, type, coefficient et fichiers joints sont copiés. Pas les notes,
                    ni les copies, ni ton retour d’expérience : tu choisis la date et la séance
                    ensuite.
                  </p>
                  <form action={reuseAssessment.bind(null, id)} className="flex flex-wrap gap-2">
                    <label htmlFor="reuse-source" className="sr-only">
                      Évaluation à reprendre
                    </label>
                    <select
                      id="reuse-source"
                      name="sourceId"
                      className="border-input min-h-11 min-w-0 flex-1 rounded-xl border bg-transparent px-3 text-sm"
                    >
                      {otherAssessments.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title} — {o.module?.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit">Reprendre</Button>
                  </form>
                </section>
              ) : null}
              <section
                aria-labelledby="from-library"
                className="bg-muted/40 rounded-2xl border p-4"
              >
                <h3 id="from-library" className="text-lg font-bold">
                  Depuis la bibliothèque
                </h3>
                <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
                  Reprendre une grille de correction déjà faite : elle est appliquée à la nouvelle
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
                        <Button
                          asChild
                          variant="outline"
                          size="touch"
                          className="h-auto min-h-11 w-full justify-start py-2 text-left whitespace-normal"
                        >
                          <Link
                            href={`/modules/${id}/assessments/new?grille=${g.id}${jalon ? "&jalon=1" : ""}`}
                          >
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

              <section aria-labelledby="school" className="bg-muted/40 rounded-2xl border p-4">
                <h3 id="school" className="text-lg font-bold">
                  Une note de l’école
                </h3>
                <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
                  La note vient de l’école (contrôle continu…) : tu saisis seulement les notes, sans
                  sujet ni grille.
                </p>
                <SchoolGradeForm moduleId={id} />
              </section>
            </div>
          </section>

          <section aria-labelledby="mo" className={card}>
            <h2 id="mo" className="font-heading mb-1.5 text-lg font-bold">
              Ce que tu peux changer, et où
            </h2>
            <div className="space-y-1.5 text-sm">
              <p>
                <strong>Dans ce module</strong> : date, séance, coefficient, ordre, consignes
                propres au module.
              </p>
              <p>
                <strong>Le contenu</strong> (sujet, grille, barème) : dans la Bibliothèque, sous «
                Grilles ».
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
