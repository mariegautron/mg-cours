import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { restoreResourceVersion } from "@/app/(app)/resources/actions";
import { Button } from "@/components/ui/button";
import { getResource, listResourceVersions } from "@/lib/resources/queries";

export async function generateMetadata({
  params,
}: PageProps<"/resources/[id]/history">): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);
  return { title: resource ? `Historique — ${resource.title}` : "Historique" };
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export default async function ResourceHistoryPage({
  params,
}: PageProps<"/resources/[id]/history">) {
  const { id } = await params;
  const [resource, versions] = await Promise.all([getResource(id), listResourceVersions(id)]);
  if (!resource) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Historique — {resource.title}</h1>
        <p className="text-muted-foreground">
          <Link href={`/resources/${id}`} className="underline underline-offset-2">
            Retour à la ressource
          </Link>
          {" · "}Les 30 dernières versions sont conservées. Restaurer une version sauvegarde d’abord
          l’état actuel.
        </p>
      </div>

      {versions.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune version antérieure : elles apparaissent à chaque modification.
        </p>
      ) : (
        <ol className="space-y-3">
          {versions.map((v) => (
            <li key={v.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  Version du <time dateTime={v.created_at}>{when(v.created_at)}</time>
                </p>
                <form action={restoreResourceVersion.bind(null, id, v.id)}>
                  <Button type="submit" size="sm" variant="secondary">
                    <RotateCcw aria-hidden />
                    Restaurer cette version
                    <span className="sr-only"> du {when(v.created_at)}</span>
                  </Button>
                </form>
              </div>
              <p className="text-sm">{v.title}</p>
              {v.description ? (
                <p className="text-muted-foreground text-sm">{v.description}</p>
              ) : null}
              {v.content ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm underline underline-offset-2">
                    Voir le contenu
                    <span className="sr-only"> de la version du {when(v.created_at)}</span>
                  </summary>
                  <pre className="bg-muted mt-2 overflow-x-auto rounded-md p-3 text-sm whitespace-pre-wrap">
                    {v.content}
                  </pre>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
