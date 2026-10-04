import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProject } from "@/app/(app)/modules/[id]/project/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ProjectForm } from "@/components/projects/project-form";
import { SkeletonEditor } from "@/components/projects/skeleton-editor";
import { ThemeAssignment } from "@/components/projects/theme-assignment";
import { ThemesEditor } from "@/components/projects/themes-editor";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { SurprisesEditor } from "@/components/projects/surprises-editor";
import { listProjectSurprises } from "@/lib/projects/surprise-queries";
import { sortSurprises } from "@/lib/projects/surprises";
import { getModuleCourses } from "@/lib/modules/queries";
import { getModuleProject, listReusableProjects } from "@/lib/projects/queries";
import { getModule } from "@/lib/modules/queries";
import {
  PROJECT_ROLE_LABELS,
  projectSkeleton,
  remainingSkeleton,
} from "@/lib/ynov/project-skeleton";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/project">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod ? `Projet fil rouge — ${mod.name}` : "Projet fil rouge" };
}

export default async function ModuleProjectPage({ params }: PageProps<"/modules/[id]/project">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const project = await getModuleProject(id);
  const reusable = project ? [] : await listReusableProjects(id);
  const [courses, surprises] = project
    ? await Promise.all([getModuleCourses(id), listProjectSurprises(project.id)])
    : [[], { available: true, items: [] }];
  const courseOptions = courses.map((c, i) => ({ id: c.id, number: i + 1, title: c.title }));
  const courseOrder = new Map(courseOptions.map((c) => [c.id, c.number]));
  const proposed = project
    ? remainingSkeleton(
        projectSkeleton(mod.total_hours),
        project.assessments.map((a) => a.project_role!),
      )
    : [];

  const card = "bg-card rounded-3xl border p-5 shadow-sm";
  const hasThemes = !!project && project.themes.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Évaluations
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Le projet fil rouge : {hasThemes ? "plusieurs thèmes" : "le brief"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Un projet suivi tout au long du module : jalons, oral de fin de projet et évaluation
            individuelle sont des évaluations comme les autres, comptées dans les notes YNOV. Un
            projet se réutilise d’un module à l’autre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {project ? null : reusable.length > 0 ? (
            <Button asChild variant="outline">
              <Link href={`/modules/${mod.id}/project/reuse`}>Partir d’un projet existant</Link>
            </Button>
          ) : null}
          {project ? (
            <Button asChild variant="outline">
              <Link href={`/modules/${mod.id}/frise`}>Voir ce que voient les étudiant·es</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link href={`/modules/${mod.id}/assessments`}>← Les évaluations</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
        <div className="w-full min-w-0 flex-1 lg:basis-0">
          <ProjectForm key={project?.id ?? "new"} moduleId={mod.id} project={project} />
        </div>

        {project ? (
          <div className="w-full min-w-0 space-y-5 lg:w-[34rem] lg:flex-none">
            <section aria-labelledby="project-assessments" className={card}>
              <h2 id="project-assessments" className="font-heading mb-1 text-xl font-bold">
                Évaluations du projet ({project.assessments.length})
              </h2>
              <p className="text-muted-foreground mb-2 text-sm">
                Chaque évaluation a son livrable. Tu choisis lesquelles sont notées.
              </p>
              {project.assessments.length === 0 ? (
                <p className="text-muted-foreground border-t pt-3 text-sm">
                  Aucune évaluation rattachée. Propose le squelette plus bas.
                </p>
              ) : (
                <ul>
                  {project.assessments.map((a, i) => (
                    <li key={a.id} className="border-t">
                      <Link
                        href={`/modules/${mod.id}/assessments/${a.id}`}
                        className="hover:bg-accent/50 focus-visible:ring-ring flex min-h-14 items-center gap-3 rounded-lg py-2 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <Pill>{i + 1}</Pill>
                        <span className="min-w-0 flex-1">
                          <strong>{a.title}</strong>
                          <span className="text-muted-foreground block text-[0.8rem]">
                            {PROJECT_ROLE_LABELS[a.project_role!]} ·{" "}
                            {a.is_group_grade ? "note de groupe" : "note individuelle"}
                            {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""}
                          </span>
                        </span>
                        <Pill tone={a.gradeCount > 0 ? "ok" : "warn"}>
                          {a.gradeCount > 0 ? "Notée" : "À noter"}
                        </Pill>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="themes-heading" className={card}>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h2 id="themes-heading" className="font-heading text-xl font-bold">
                  Thèmes au choix ({project.themes.length})
                </h2>
              </div>
              <p className="text-muted-foreground mb-3 text-sm">
                Un seul sujet pour toute la classe, ou plusieurs thèmes : un ou plusieurs groupes
                par thème, attribués par tirage, par choix des groupes ou par toi.
              </p>
              <ThemesEditor
                moduleId={mod.id}
                initial={project.themes}
                groupsByTheme={Object.fromEntries(
                  project.themes.map((t) => [
                    t.id,
                    project.assignments
                      .filter((a) => a.theme_id === t.id)
                      .map((a) => project.groups.find((g) => g.id === a.student_group_id)?.name)
                      .filter((n): n is string => !!n),
                  ]),
                )}
              />
            </section>

            <section aria-labelledby="assignment-heading" className={card}>
              <h2 id="assignment-heading" className="font-heading mb-3 text-xl font-bold">
                Affectation des thèmes
              </h2>
              <ThemeAssignment
                moduleId={mod.id}
                themes={project.themes.map((t) => ({ id: t.id, title: t.title }))}
                groups={project.groups.map((g) => {
                  const a = project.assignments.find((x) => x.student_group_id === g.id);
                  return {
                    id: g.id,
                    name: g.name,
                    themeId: a?.theme_id ?? "",
                    method: a?.method ?? null,
                  };
                })}
                drawSeed={
                  project.assignments
                    .filter((a) => a.method === "draw" && a.draw_seed)
                    .sort((a, b) => (b.drawn_at ?? "").localeCompare(a.drawn_at ?? ""))[0]
                    ?.draw_seed ?? null
                }
              />
            </section>

            <section aria-labelledby="surprises-heading" className={card}>
              <h2 id="surprises-heading" className="font-heading mb-1 text-xl font-bold">
                Imprévus du client ({surprises.items.length})
              </h2>
              <p className="text-muted-foreground mb-3 text-sm">
                Des messages du client entre les séances, pour simuler les changements de besoin. Le
                jour de la séance, « Aujourd’hui » te le rappelle avec le message prêt à copier.
                Rien n’est envoyé par l’appli.
              </p>
              <SurprisesEditor
                moduleId={mod.id}
                items={sortSurprises(surprises.items, courseOrder)}
                courses={courseOptions}
                available={surprises.available}
              />
            </section>

            <section aria-labelledby="skeleton-heading" className={card}>
              <h2 id="skeleton-heading" className="font-heading mb-1 text-xl font-bold">
                Squelette proposé
              </h2>
              <p className="text-muted-foreground mb-3 text-sm">
                Déduit des notes exigées pour {mod.total_hours} h : 1 évaluation individuelle, 1
                oral, et un jalon pour chaque note restante. Modifie avant de créer.
              </p>
              <SkeletonEditor
                resetKey={project.assessments.map((a) => a.id).join(",")}
                moduleId={mod.id}
                totalHours={mod.total_hours}
                proposed={proposed}
                existing={project.assessments.map((a) => ({ isGroupGrade: a.is_group_grade }))}
              />
            </section>

            <section aria-labelledby="danger-heading" className="space-y-2 px-1">
              <h2 id="danger-heading" className="font-heading text-lg font-bold">
                Supprimer le projet
              </h2>
              <p className="text-muted-foreground text-sm">
                Les évaluations et leurs notes sont conservées, simplement détachées du projet.
              </p>
              <ConfirmDeleteButton
                itemName="le projet fil rouge"
                title="Supprimer le projet fil rouge ?"
                description="Le brief et le contexte client seront supprimés. Les évaluations et leurs notes sont conservées."
                onConfirm={deleteProject.bind(null, mod.id)}
              />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
