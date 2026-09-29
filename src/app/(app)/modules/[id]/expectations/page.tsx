import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { proposeSkeleton } from "@/app/(app)/modules/[id]/expectations/actions";
import { ExpectationsEditor } from "@/components/modules/expectations-editor";
import { Button } from "@/components/ui/button";
import {
  getModule,
  getModuleCourses,
  getModuleDocuments,
  getModuleExpectations,
} from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Attendus de l’école" };

export default async function ExpectationsPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/expectations">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const [mod, expectations, documents, courses] = await Promise.all([
    getModule(id),
    getModuleExpectations(id),
    getModuleDocuments(id),
    getModuleCourses(id),
  ]);
  if (!mod) notFound();

  const doc = documents.find((d) => d.kind === "school_expectations") ?? null;
  const hasUnits = expectations.some((e) => e.kind === "unit");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/modules/${mod.id}`} className="text-sm underline underline-offset-2">
          ← {mod.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Attendus de l’école</h1>
        <p className="text-muted-foreground">
          Objectifs pédagogiques du module et objectif de chaque unité, lus dans la fiche YNOV.
        </p>
      </div>

      {saved ? (
        <p role="status" className="rounded-md border p-3 text-sm">
          Attendus enregistrés.{" "}
          <Link href={`/modules/${mod.id}/matching`} className="underline underline-offset-2">
            Rapprocher avec les ressources
          </Link>
        </p>
      ) : null}

      <ExpectationsEditor
        moduleId={mod.id}
        moduleHours={mod.total_hours}
        document={
          doc
            ? {
                id: doc.id,
                name: doc.name,
                readable: doc.mime === "application/pdf" || /\.pdf$/i.test(doc.name),
              }
            : null
        }
        initial={expectations.map((e) => ({
          id: e.id,
          kind: e.kind,
          label: e.label,
          hours: e.hours,
          modality: (e.modality as "FFP" | "TDP" | null) ?? null,
        }))}
      />

      {hasUnits ? (
        <section aria-labelledby="skeleton" className="space-y-2 rounded-lg border p-4">
          <h2 id="skeleton" className="text-lg font-medium">
            Squelette de séances
          </h2>
          <p className="text-muted-foreground text-sm">
            Propose une séance vide par unité enregistrée (
            {courses.length
              ? `à la suite des ${courses.length} séance${courses.length > 1 ? "s" : ""} existante${courses.length > 1 ? "s" : ""}`
              : "le module n’a pas encore de séance"}
            ). Un repère seulement : renomme, fusionne ou supprime ces séances librement.
          </p>
          <form action={proposeSkeleton.bind(null, mod.id)}>
            <Button type="submit" variant="secondary">
              Proposer un squelette de séances depuis les unités
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
