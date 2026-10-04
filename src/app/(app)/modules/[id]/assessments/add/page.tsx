import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill } from "@/components/dashboard/pill";
import { SchoolGradeForm } from "@/components/assessments/school-grade-form";
import { Button } from "@/components/ui/button";
import { notesMessage, requirementLabel } from "@/lib/assessments/module-notes";
import { buildTimeline } from "@/lib/assessments/module-overview";
import { listGrids, listModuleAssessments, moduleNoteProgress } from "@/lib/assessments/queries";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { PROJECT_ROLE_LABELS } from "@/lib/ynov/project-skeleton";

export const metadata: Metadata = { title: "Ajouter une évaluation" };

const card = "bg-card rounded-3xl border p-5 shadow-sm";

/**
 * Ajouter ou rattacher une évaluation (US-126, maquette « EvalAjouter ») : à gauche les évaluations
 * du module et les notes exigées, à droite les trois façons d'en ajouter une.
 */
export default async function AddAssessmentPage({
  params,
}: PageProps<"/modules/[id]/assessments/add">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  const [grids, assessments, progress, courses] = await Promise.all([
    listGrids(),
    listModuleAssessments(id),
    moduleNoteProgress(id, mod.total_hours),
    getModuleCourses(id),
  ]);

  const regular = assessments.filter((a) => !a.makeup_of_id);
  const dueSession = new Map(
    buildTimeline(
      courses.map((c) => ({ id: c.id, title: c.title, date: c.session_date, toBuild: false })),
      regular.map((a) => ({
        id: a.id,
        title: a.title,
        courseId: a.course_id,
        role: a.project_role,
        isGroupGrade: a.is_group_grade,
        makeup: false,
      })),
    ).map((r) => [r.assessmentId, r.dueSession]),
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
            Trois façons de faire, au choix. Les évaluations du module sont à gauche.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${id}/assessments`}>← Vue d’ensemble</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
        <section aria-labelledby="in-module" className={`${card} w-full min-w-0 flex-1 lg:basis-0`}>
          <h2 id="in-module" className="font-heading mb-3 text-xl font-bold">
            Les évaluations du module
          </h2>
          <div className="bg-accent/40 border-primary/40 mb-2 rounded-2xl border p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>Notes exigées par l’école : {progress.requirement.total}</strong>
              <Pill tone={progress.satisfied ? "ok" : "warn"}>
                <span role="status">
                  {progress.enteredTotal} prévue{progress.enteredTotal > 1 ? "s" : ""} sur{" "}
                  {progress.requirement.total}
                </span>
              </Pill>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[0.8rem]">
              {requirementLabel(mod.total_hours, progress)}. {notesMessage(progress)} Tu peux en
              prévoir plus ; chaque évaluation ajoutée compte comme une note de plus.
            </p>
          </div>

          {regular.length === 0 ? (
            <p className="text-muted-foreground border-t pt-3 text-sm">
              Aucune évaluation dans ce module pour l’instant.
            </p>
          ) : (
            <ul>
              {regular.map((a) => {
                const session = dueSession.get(a.id);
                return (
                  <li
                    key={a.id}
                    className="flex min-h-[4.75rem] flex-wrap items-center gap-3 border-t py-3"
                  >
                    <div className="min-w-[min(14rem,100%)] flex-1">
                      <strong className="text-base">{a.title}</strong>
                      <div className="text-muted-foreground text-sm">
                        {a.project_role ? `${PROJECT_ROLE_LABELS[a.project_role]} · ` : ""}
                        {a.is_group_grade ? "groupe ×1" : "individuelle ×3"}
                        {session ? ` · séance ${session}` : ""}
                      </div>
                    </div>
                    <Pill tone={a.gradeCount > 0 ? "ok" : "warn"}>
                      {a.gradeCount > 0 ? "Noté" : "À noter"}
                    </Pill>
                    <Button asChild variant="ghost">
                      <Link href={`/modules/${id}/assessments/${a.id}`}>
                        Ouvrir<span className="sr-only"> : {a.title}</span>
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-muted-foreground mt-2.5 text-[0.8rem]">
            Le nombre de jalons, c’est simplement le nombre d’évaluations rattachées au module.
          </p>
        </section>

        <div className="w-full min-w-0 space-y-4 lg:w-[38rem] lg:flex-none">
          <section aria-labelledby="ad" className={card}>
            <h2 id="ad" className="font-heading mb-3 text-2xl font-bold">
              Ajouter une évaluation
            </h2>
            <div className="flex flex-col gap-2.5">
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

              <section aria-labelledby="create" className="bg-muted/40 rounded-2xl border p-4">
                <h3 id="create" className="text-lg font-bold">
                  En créer une nouvelle
                </h3>
                <p className="text-muted-foreground mt-0.5 mb-3 text-sm">
                  Sujet, grille, groupes, date : le formulaire complet.
                </p>
                <Button asChild>
                  <Link href={`/modules/${id}/assessments/new`}>Créer une évaluation</Link>
                </Button>
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
