import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomExpectations } from "@/components/modules/custom-expectations";
import { SplitLongExpectations } from "@/components/modules/split-long-expectations";
import { planExpectationSplits } from "@/lib/modules/expectations";
import { ExpectationsEditor } from "@/components/modules/expectations-editor";
import { Button } from "@/components/ui/button";
import { splitExpectations } from "@/lib/modules/custom-expectations";
import { createClient } from "@/lib/supabase/server";
import { getModule, getModuleDocuments, getModuleExpectations } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Attendus de l’école" };

export default async function ExpectationsPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/expectations">) {
  const { id } = await params;
  const { saved } = await searchParams;
  const [mod, expectations, documents] = await Promise.all([
    getModule(id),
    getModuleExpectations(id),
    getModuleDocuments(id),
  ]);
  if (!mod) notFound();

  const { school, custom } = splitExpectations(expectations);
  const supabase = await createClient();
  const { error: originError } = await supabase
    .from("module_expectation")
    .select("origin")
    .limit(1);
  const doc = documents.find((d) => d.kind === "school_expectations") ?? null;

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

      <SplitLongExpectations moduleId={mod.id} plans={planExpectationSplits(school)} />

      <ExpectationsEditor
        // Remonté quand le découpage change les attendus enregistrés (l'éditeur garde son propre état).
        key={school.map((e) => `${e.id}:${e.label.length}`).join("|")}
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
        initial={school.map((e) => ({
          id: e.id,
          kind: e.kind,
          label: e.label,
          hours: e.hours,
          modality: (e.modality as "FFP" | "TDP" | null) ?? null,
        }))}
      />

      <CustomExpectations
        moduleId={mod.id}
        available={!originError}
        items={custom.map((e) => ({ id: e.id, label: e.label }))}
      />

      <section aria-labelledby="planning" className="space-y-2 rounded-lg border p-4">
        <h2 id="planning" className="text-lg font-medium">
          Séances
        </h2>
        <p className="text-muted-foreground text-sm">
          Les attendus ne créent jamais de séance. Les séances viennent du planning (créneaux datés)
          : colle l’export du planning pour les ajouter, avec un aperçu avant de valider.
        </p>
        <Button asChild variant="secondary">
          <Link href={`/modules/${mod.id}/schedule`}>Ajouter des séances depuis un planning</Link>
        </Button>
      </section>
    </div>
  );
}
