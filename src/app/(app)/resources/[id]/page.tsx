import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, Pencil, Presentation } from "lucide-react";

import { addResourceToModule } from "@/app/(app)/modules/[id]/retained/actions";
import { AddToModule } from "@/components/resources/add-to-module";
import { listActiveModules } from "@/lib/modules/queries";
import { Markdown, markdownOutline } from "@/components/markdown";
import { AudienceBadge, KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { ResourceActions } from "@/components/resources/resource-actions";
import { ResourceFiles } from "@/components/resources/resource-files";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseResourceFiles, resolveImageSrc } from "@/lib/resources/files";
import { AUDIENCE_LABELS } from "@/lib/resources/kind";
import { getResource, getResourceModules } from "@/lib/resources/queries";
import { setResourceQuestions } from "@/app/(app)/questions/link-actions";
import { LinkPicker } from "@/components/questions/link-picker";
import { listQuestionLinks } from "@/lib/questions/link-queries";
import { linkedQuestionsTitle } from "@/lib/questions/links";
import { listQuestions } from "@/lib/questions/queries";

export async function generateMetadata({
  params,
}: PageProps<"/resources/[id]">): Promise<Metadata> {
  const { id } = await params;
  const resource = await getResource(id);
  return { title: resource?.title ?? "Ressource" };
}

export default async function ResourcePage({ params }: PageProps<"/resources/[id]">) {
  const { id } = await params;
  const [resource, modules, activeModules, links, bank] = await Promise.all([
    getResource(id),
    getResourceModules(id),
    listActiveModules(),
    listQuestionLinks(),
    listQuestions(),
  ]);
  if (!resource) notFound();
  const files = parseResourceFiles(resource.files);
  const outline = resource.content ? markdownOutline(resource.content, "c") : [];
  const teacherOnly = resource.audience === "teacher";
  const linkedIds = links.pairs.filter((p) => p.resourceId === id).map((p) => p.questionId);
  const linkedQuestions = bank.filter((q) => linkedIds.includes(q.id));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {resource.title}
            {resource.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
          </h1>
          <div className="flex flex-wrap gap-1">
            <KindBadge kind={resource.kind} />
            <AudienceBadge audience={resource.audience} />
            <StatusBadge status={resource.status} />
            {resource.category ? <Badge variant="secondary">{resource.category}</Badge> : null}
          </div>
          {resource.archived_at ? null : (
            <AddToModule
              resourceId={resource.id}
              modules={activeModules}
              action={addResourceToModule.bind(null, resource.id)}
            />
          )}
          {resource.intent_note ? (
            <p className="max-w-prose text-sm">
              <strong>À construire :</strong> {resource.intent_note}
            </p>
          ) : null}
          {resource.description ? (
            <p className="text-muted-foreground max-w-prose">{resource.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {teacherOnly ? null : (
            <Button asChild>
              <Link href={`/present/resources/${resource.id}`}>
                <Presentation aria-hidden />
                Présenter
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={`/resources/${resource.id}/edit`}>
              <Pencil aria-hidden />
              Modifier
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/resources/${resource.id}/history`}>
              <History aria-hidden />
              Historique
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          {resource.url ? (
            <p className="text-sm">
              Lien :{" "}
              <a
                href={resource.url}
                target="_blank"
                rel="noreferrer"
                className="break-all underline underline-offset-2"
              >
                {resource.url}
              </a>
            </p>
          ) : null}

          {resource.content ? (
            <section aria-labelledby="content" className="max-w-prose">
              <h2 id="content" className="sr-only">
                Contenu
              </h2>
              <Markdown
                source={resource.content}
                anchorPrefix="c"
                resolveImageSrc={(src) => resolveImageSrc(resource.id, src)}
              />
            </section>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Pas de contenu rédigé.{" "}
              <Link
                href={`/resources/${resource.id}/edit`}
                className="underline underline-offset-2"
              >
                Écrire le contenu
              </Link>
            </p>
          )}

          <section aria-labelledby="linked-questions" className="space-y-3 border-t pt-6">
            <h2 id="linked-questions" className="text-lg font-medium">
              {linkedQuestionsTitle(linkedQuestions.length)}
            </h2>
            {!links.available ? (
              <p className="text-muted-foreground text-sm">
                Les questions liées seront disponibles après la mise à jour de la base de données.
              </p>
            ) : (
              <>
                {linkedQuestions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Aucune question de la banque n’est liée à cette ressource.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {linkedQuestions.map((q) => (
                      <li key={q.id}>
                        <Link href={`/questions/${q.id}`} className="underline underline-offset-2">
                          {q.name}
                        </Link>
                        <span className="text-muted-foreground"> — {q.statement.slice(0, 90)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {bank.length ? (
                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Lier des questions
                    </summary>
                    <div className="mt-3">
                      <LinkPicker
                        action={setResourceQuestions.bind(null, id)}
                        items={bank
                          .filter((q) => !q.archived_at)
                          .map((q) => ({ id: q.id, label: q.name, hint: q.category || undefined }))}
                        selected={linkedIds}
                        legend="Questions de la banque"
                        filterLabel="Chercher une question"
                      />
                    </div>
                  </details>
                ) : null}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start" aria-label="Informations">
          {outline.length > 1 ? (
            <nav aria-labelledby="outline">
              <h2 id="outline" className="mb-2 text-sm font-medium">
                Sommaire
              </h2>
              <ol className="space-y-1 text-sm">
                {outline.map((h) => (
                  <li key={h.id} className={h.level === 2 ? "pl-3" : undefined}>
                    <a
                      href={`#${h.id}`}
                      className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <section aria-labelledby="visibility">
            <h2 id="visibility" className="mb-1 text-sm font-medium">
              Visibilité
            </h2>
            <p className="text-muted-foreground text-sm">
              {AUDIENCE_LABELS[resource.audience]}
              {teacherOnly
                ? " : jamais projetée ni incluse dans l’export PDF des cours."
                : " : projetable et incluse dans l’export PDF des cours."}
            </p>
          </section>

          {resource.tags.length ? (
            <section aria-labelledby="tags">
              <h2 id="tags" className="mb-1 text-sm font-medium">
                Tags
              </h2>
              <div className="flex flex-wrap gap-1">
                {resource.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="usage">
            <h2 id="usage" className="mb-1 text-sm font-medium">
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

          <section aria-labelledby="files">
            <h2 id="files" className="mb-1 text-sm font-medium">
              Fichiers
              {files.length ? ` (${files.length})` : ""}
            </h2>
            <ResourceFiles resourceId={resource.id} files={files} />
          </section>

          <section aria-labelledby="danger">
            <h2 id="danger" className="mb-1 text-sm font-medium">
              Actions
            </h2>
            <ResourceActions id={resource.id} archived={!!resource.archived_at} />
          </section>
        </aside>
      </div>
    </div>
  );
}
