import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { History, Presentation } from "lucide-react";

import { addResourceToModule } from "@/app/(app)/modules/[id]/retained/actions";
import { AddToModule } from "@/components/resources/add-to-module";
import { Markdown, markdownOutline } from "@/components/markdown";
import { AudienceBadge, KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { resourceSlides } from "@/components/present/deck";
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
  const [resource, modules, links, bank] = await Promise.all([
    getResource(id),
    getResourceModules(id),
    listQuestionLinks(),
    listQuestions(),
  ]);
  if (!resource) notFound();
  const files = parseResourceFiles(resource.files);
  const outline = resource.content ? markdownOutline(resource.content, "c") : [];
  const teacherOnly = resource.audience === "teacher";
  const linkedIds = links.pairs.filter((p) => p.resourceId === id).map((p) => p.questionId);
  const linkedQuestions = bank.filter((q) => linkedIds.includes(q.id));

  const slideCount = teacherOnly ? 0 : resourceSlides(0, resource).length;
  const card = "bg-card rounded-xl border p-5";
  const tab =
    "focus-visible:ring-ring inline-flex min-h-11 items-center border-b-[3px] border-transparent text-[0.95rem] font-semibold text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:outline-none";
  const modifiedOn = new Date(resource.updated_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-start">
      <section aria-labelledby="res-title" className={`${card} min-w-0 flex-[3_1_0] space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1
            id="res-title"
            className="font-heading flex flex-wrap items-center gap-2 text-3xl font-bold tracking-tight"
          >
            {resource.title}
            {resource.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
          </h1>
          <Button asChild variant="ghost" size="touch">
            <Link href="/resources">← Bibliothèque</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <KindBadge kind={resource.kind} />
          <AudienceBadge audience={resource.audience} />
          <StatusBadge status={resource.status} />
          {resource.status === "ready" ? <Badge variant="secondary">Prête</Badge> : null}
          {resource.audience === "students" ? <Badge variant="outline">Étudiant·es</Badge> : null}
          {resource.category ? <Badge variant="secondary">{resource.category}</Badge> : null}
        </div>
        {resource.archived_at ? null : (
          <AddToModule
            resourceId={resource.id}
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

        <nav aria-label="Vues de la ressource" className="border-b">
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <span aria-current="page" className={`${tab} border-primary text-foreground`}>
                Lire
              </span>
            </li>
            <li>
              <Link href={`/resources/${resource.id}/edit`} className={tab}>
                Modifier
              </Link>
            </li>
            {teacherOnly ? null : (
              <li>
                <Link href={`/present/resources/${resource.id}`} className={tab}>
                  Diapositives · {slideCount}
                </Link>
              </li>
            )}
            <li>
              <a href="#linked-questions" className={tab}>
                Questions · {linkedQuestions.length}
              </a>
            </li>
          </ul>
        </nav>

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
          <section aria-labelledby="content" className="bg-muted/40 max-w-prose rounded-xl p-4">
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
            <Link href={`/resources/${resource.id}/edit`} className="underline underline-offset-2">
              Écrire le contenu
            </Link>
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          Dernière modification le {modifiedOn}.
          {slideCount > 0
            ? ` Les diapos sont découpées automatiquement : ${slideCount} diapositive${slideCount > 1 ? "s" : ""}.`
            : ""}
        </p>

        <section aria-labelledby="linked-questions" className="space-y-3 border-t pt-4">
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
      </section>

      <aside
        className="min-w-0 flex-[2_1_0] space-y-4 lg:sticky lg:top-4 lg:max-w-md lg:self-start"
        aria-label="Informations"
      >
        <section aria-labelledby="usage" className={card}>
          <h2 id="usage" className="font-heading mb-2 text-lg font-bold">
            Où elle sert
          </h2>
          {modules.length === 0 ? (
            <p className="text-muted-foreground text-sm">Pas encore utilisée dans un module.</p>
          ) : (
            <ul className="divide-y text-sm">
              {modules.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <Link href={`/modules/${m.id}`} className="underline underline-offset-2">
                    {m.name}
                  </Link>
                  <span className="text-muted-foreground">{m.year}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="danger" className={card}>
          <h2 id="danger" className="font-heading mb-2 text-lg font-bold">
            Actions
          </h2>
          <div className="flex flex-col items-start gap-2">
            {teacherOnly ? null : (
              <Button asChild>
                <Link href={`/present/resources/${resource.id}`}>
                  <Presentation aria-hidden />
                  Présenter
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href={`/resources/${resource.id}/history`}>
                <History aria-hidden />
                Historique
              </Link>
            </Button>
            <ResourceActions id={resource.id} archived={!!resource.archived_at} />
          </div>
        </section>

        <section aria-labelledby="visibility" className={card}>
          <h2 id="visibility" className="font-heading mb-1 text-lg font-bold">
            Classement
          </h2>
          <p className="text-muted-foreground text-sm">
            {AUDIENCE_LABELS[resource.audience]}
            {teacherOnly
              ? " : jamais projetée ni incluse dans l’export PDF des cours."
              : " : projetable et incluse dans l’export PDF des cours."}
          </p>
          {resource.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {resource.tags.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </section>

        {outline.length > 1 ? (
          <nav aria-labelledby="outline" className={card}>
            <h2 id="outline" className="font-heading mb-2 text-lg font-bold">
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

        <section aria-labelledby="files" className={card}>
          <h2 id="files" className="font-heading mb-2 text-lg font-bold">
            Fichiers
            {files.length ? ` (${files.length})` : ""}
          </h2>
          <ResourceFiles resourceId={resource.id} files={files} />
        </section>
      </aside>
    </div>
  );
}
