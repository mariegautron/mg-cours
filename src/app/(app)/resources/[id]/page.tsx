import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { ResourceActions } from "@/components/resources/resource-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getResource, getResourceModules } from "@/lib/resources/queries";

export async function generateMetadata({
  params,
}: PageProps<"/resources/[id]">): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);
  return { title: resource?.title ?? "Ressource" };
}

export default async function ResourcePage({ params }: PageProps<"/resources/[id]">) {
  const { id } = await params;
  const [resource, modules] = await Promise.all([getResource(id), getResourceModules(id)]);
  if (!resource) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            {resource.title}
            {resource.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
          </h1>
          {resource.description ? (
            <p className="text-muted-foreground mt-1">{resource.description}</p>
          ) : null}
        </div>
        <Button asChild variant="secondary">
          <Link href={`/resources/${resource.id}/edit`}>
            <Pencil aria-hidden />
            Modifier
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {resource.category ? <Badge variant="secondary">{resource.category}</Badge> : null}
        {resource.tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>

      {resource.url ? (
        <p className="text-sm">
          Lien :{" "}
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {resource.url}
          </a>
        </p>
      ) : null}

      <section aria-labelledby="usage">
        <h2 id="usage" className="mb-2 text-lg font-medium">
          Utilisation
        </h2>
        {modules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Pas encore utilisée dans un module.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {modules.map((m) => (
              <li key={m.id}>
                <Link href={`/modules/${m.id}`} className="underline underline-offset-2">
                  {m.name}
                </Link>{" "}
                <span className="text-muted-foreground">— {m.year}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {resource.content ? (
        <section aria-labelledby="content">
          <h2 id="content" className="mb-2 text-lg font-medium">
            Contenu
          </h2>
          <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm whitespace-pre-wrap">
            {resource.content}
          </pre>
        </section>
      ) : null}

      <section aria-labelledby="danger">
        <h2 id="danger" className="mb-2 text-lg font-medium">
          Actions
        </h2>
        <ResourceActions id={resource.id} archived={!!resource.archived_at} />
      </section>
    </div>
  );
}
