import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { importCourses } from "@/app/(app)/modules/[id]/import-courses/actions";
import { CourseImportForm } from "@/components/modules/course-import-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getImportableCourses,
  getModule,
  getModuleCourses,
  listImportSources,
} from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Importer des séances" };

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

export default async function ImportCoursesPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/import-courses">) {
  const { id } = await params;
  const { source } = await searchParams;
  const sourceId = typeof source === "string" ? source : "";

  const [mod, existing, sources] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listImportSources(id),
  ]);
  if (!mod) notFound();

  const chosen = sources.find((s) => s.id === sourceId);
  const courses = chosen ? await getImportableCourses(chosen.id) : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/modules/${mod.id}#courses`} className="text-sm underline underline-offset-2">
          ← {mod.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Importer des séances d’un autre module</h1>
        <p className="text-muted-foreground">
          Reprends le contenu de séances déjà préparées : elles sont ajoutées à la suite de celles
          de ce module, à préparer.
        </p>
      </div>

      {sources.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm">
          Aucun autre module ne contient de séance pour l’instant.
        </p>
      ) : (
        <form
          className="flex flex-wrap items-end gap-3"
          role="search"
          aria-label="Choix du module source"
        >
          <div className="space-y-1">
            <Label htmlFor="source">Module source</Label>
            <select
              id="source"
              name="source"
              defaultValue={chosen?.id ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">Choisir un module…</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.year}) — {s.courseCount} séance{s.courseCount > 1 ? "s" : ""}
                  {s.archived ? " · archivé" : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">
            Voir les séances
          </Button>
        </form>
      )}

      {chosen ? (
        <CourseImportForm
          key={chosen.id}
          action={importCourses.bind(null, mod.id, chosen.id)}
          moduleId={mod.id}
          sourceName={chosen.name}
          courses={courses}
          existingCount={existing.length}
        />
      ) : null}
    </div>
  );
}
