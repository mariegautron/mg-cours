import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteProject } from "@/app/(app)/modules/[id]/project/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Markdown } from "@/components/markdown";
import { ProjectForm } from "@/components/projects/project-form";
import { SkeletonEditor } from "@/components/projects/skeleton-editor";
import { ThemeAssignment } from "@/components/projects/theme-assignment";
import { ThemesEditor } from "@/components/projects/themes-editor";
import { Badge } from "@/components/ui/badge";
import { getModuleProject } from "@/lib/projects/queries";
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
  const proposed = project
    ? remainingSkeleton(
        projectSkeleton(mod.total_hours),
        project.assessments.map((a) => a.project_role!),
      )
    : [];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/modules/${mod.id}`} className="text-sm underline underline-offset-2">
          ← {mod.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Projet fil rouge</h1>
        <p className="text-muted-foreground">
          Un projet suivi tout au long du module : jalons, oral de fin de projet et évaluation
          individuelle sont des évaluations comme les autres, comptées dans les notes YNOV.
        </p>
      </div>

      <section aria-labelledby="project-heading" className="space-y-4">
        <h2 id="project-heading" className="text-lg font-medium">
          Le projet
        </h2>
        <ProjectForm moduleId={mod.id} project={project} />
        {project ? (
          <div className="space-y-4 rounded-lg border p-4">
            {project.brief_md ? (
              <div>
                <h3 className="mb-2 font-medium">Brief</h3>
                <Markdown source={project.brief_md} />
              </div>
            ) : null}
            {project.client_context_md ? (
              <div>
                <h3 className="mb-2 font-medium">Contexte client</h3>
                <Markdown source={project.client_context_md} />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {project ? (
        <>
          <section aria-labelledby="project-assessments" className="space-y-3">
            <h2 id="project-assessments" className="text-lg font-medium">
              Évaluations du projet ({project.assessments.length})
            </h2>
            {project.assessments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune évaluation rattachée. Proposez le squelette ci-dessous.
              </p>
            ) : (
              <ul className="space-y-2">
                {project.assessments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/modules/${mod.id}/assessments/${a.id}`}
                      className="hover:bg-accent focus-visible:ring-ring flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {PROJECT_ROLE_LABELS[a.project_role!]} ·{" "}
                          {a.is_group_grade ? "note de groupe" : "note individuelle"}
                          {a.date ? ` · ${new Date(a.date).toLocaleDateString("fr-FR")}` : ""}
                        </p>
                      </div>
                      <Badge variant={a.gradeCount > 0 ? "secondary" : "outline"}>
                        {a.gradeCount > 0 ? "notée" : "à noter"}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="themes-heading" className="space-y-3">
            <h2 id="themes-heading" className="text-lg font-medium">
              Thèmes au choix ({project.themes.length})
            </h2>
            <ThemesEditor moduleId={mod.id} initial={project.themes} />
          </section>

          <section aria-labelledby="assignment-heading" className="space-y-3">
            <h2 id="assignment-heading" className="text-lg font-medium">
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

          <section aria-labelledby="skeleton-heading" className="space-y-3">
            <h2 id="skeleton-heading" className="text-lg font-medium">
              Squelette proposé
            </h2>
            <p className="text-muted-foreground text-sm">
              Déduit des notes exigées pour {mod.total_hours} h : 1 évaluation individuelle, 1 oral,
              et un jalon pour chaque note restante. Modifiez avant de créer.
            </p>
            <SkeletonEditor
              resetKey={project.assessments.map((a) => a.id).join(",")}
              moduleId={mod.id}
              totalHours={mod.total_hours}
              proposed={proposed}
              existing={project.assessments.map((a) => ({ isGroupGrade: a.is_group_grade }))}
            />
          </section>

          <section aria-labelledby="danger-heading" className="space-y-2 border-t pt-4">
            <h2 id="danger-heading" className="text-lg font-medium">
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
        </>
      ) : null}
    </div>
  );
}
