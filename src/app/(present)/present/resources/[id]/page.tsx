import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { resourceSlides } from "@/components/present/deck";
import { PresentShell } from "@/components/present/present-shell";
import { getResource } from "@/lib/resources/queries";

export async function generateMetadata({
  params,
}: PageProps<"/present/resources/[id]">): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);
  return { title: resource ? `Présenter — ${resource.title}` : "Présentation" };
}

export default async function PresentResourcePage({
  params,
}: PageProps<"/present/resources/[id]">) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) notFound();

  // Garde-fou : une ressource réservée à l'enseignante ne se projette pas.
  if (resource.audience === "teacher") {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-12">
        <h1 className="text-2xl font-semibold">Ressource réservée à l’enseignante</h1>
        <p className="text-muted-foreground">
          « {resource.title} » est marquée « Enseignante uniquement » : elle n’est jamais projetée
          ni diffusée aux étudiant·es. Changez sa visibilité pour la présenter.
        </p>
        <Link href={`/resources/${resource.id}`} className="underline underline-offset-2">
          Retour à la ressource
        </Link>
      </main>
    );
  }

  return (
    <PresentShell
      title={resource.title}
      backHref={`/resources/${resource.id}`}
      backLabel="la ressource"
      sections={[resource.title]}
      slides={resourceSlides(0, resource)}
    />
  );
}
