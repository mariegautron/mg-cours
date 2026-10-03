import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, CopyPlus, Pencil } from "lucide-react";

import { duplicateQuestion, setQuestionArchived } from "@/app/(app)/questions/actions";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/questions/question-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQuestion } from "@/lib/questions/queries";
import { setQuestionResources } from "@/app/(app)/questions/link-actions";
import { LinkPicker } from "@/components/questions/link-picker";
import { listQuestionLinks } from "@/lib/questions/link-queries";
import { listResources } from "@/lib/resources/queries";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/questions/types";

export async function generateMetadata({
  params,
}: PageProps<"/questions/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: (await getQuestion(id))?.name ?? "Question" };
}

export default async function QuestionPage({ params, searchParams }: PageProps<"/questions/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const [q, links, resources] = await Promise.all([
    getQuestion(id),
    listQuestionLinks(),
    listResources(),
  ]);
  if (!q) notFound();
  const linkedIds = links.pairs.filter((p) => p.questionId === id).map((p) => p.resourceId);
  const linkedResources = resources.filter((r) => linkedIds.includes(r.id));
  const type = q.type as QuestionType;
  const points = Number(q.default_points);

  return (
    <div className="max-w-3xl space-y-6">
      <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
        <Link href="/questions" className="underline-offset-2 hover:underline">
          Banque de questions
        </Link>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{q.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{QUESTION_TYPE_LABELS[type]}</Badge>
            <Badge variant="outline">{q.category || "Sans catégorie"}</Badge>
            <Badge variant="outline">
              {points} pt{points > 1 ? "s" : ""}
            </Badge>
            {q.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
            {q.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href={`/questions/${id}/edit`}>
              <Pencil aria-hidden />
              Modifier
            </Link>
          </Button>
          <form action={duplicateQuestion.bind(null, id)}>
            <Button type="submit" size="sm" variant="secondary">
              <CopyPlus aria-hidden />
              Dupliquer
            </Button>
          </form>
          <form action={setQuestionArchived.bind(null, id, !q.archived_at)}>
            <Button type="submit" size="sm" variant="secondary">
              {q.archived_at ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
              {q.archived_at ? "Désarchiver" : "Archiver"}
            </Button>
          </form>
        </div>
      </div>
      {typeof error === "string" ? (
        <p role="alert" className="text-destructive text-sm">
          La duplication a échoué : {error}.
        </p>
      ) : null}

      <section aria-labelledby="preview" className="space-y-3">
        <h2 id="preview" className="text-lg font-medium">
          Aperçu tel que l’étudiant·e le voit
        </h2>
        <QuestionView
          idPrefix="preview"
          label="Question"
          type={type}
          statement={q.statement}
          points={points}
          choices={q.choices.map((c) => ({ id: c.id, text: c.text }))}
        />
      </section>

      <section aria-labelledby="origin" className="space-y-3">
        <h2 id="origin" className="text-lg font-medium">
          Ressource d’origine
        </h2>
        {!links.available ? (
          <p className="text-muted-foreground text-sm">
            La liaison sera disponible après la mise à jour de la base de données.
          </p>
        ) : (
          <>
            {linkedResources.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Cette question n’est liée à aucune ressource.
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {linkedResources.map((r) => (
                  <li key={r.id}>
                    <Link href={`/resources/${r.id}`} className="underline underline-offset-2">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Lier à des ressources
              </summary>
              <div className="mt-3">
                <LinkPicker
                  action={setQuestionResources.bind(null, id)}
                  items={resources.map((r) => ({
                    id: r.id,
                    label: r.title,
                    hint: r.category ?? undefined,
                  }))}
                  selected={linkedIds}
                  legend="Ressources"
                  filterLabel="Chercher une ressource à lier"
                />
              </div>
            </details>
          </>
        )}
      </section>

      <section aria-labelledby="answer" className="space-y-3">
        <h2 id="answer" className="text-lg font-medium">
          Corrigé (pour toi seule)
        </h2>
        {type === "numerical" ? (
          <p>
            Valeur attendue : <strong>{q.numeric_value}</strong>
            {q.numeric_tolerance ? ` (± ${q.numeric_tolerance})` : ""}
          </p>
        ) : type === "open" ? (
          <p className="text-muted-foreground text-sm">Réponse libre : relue à la main.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {q.choices.map((c) => (
              <li key={c.id}>
                <span className="font-medium">
                  {Number(c.fraction) > 0
                    ? "Bonne réponse"
                    : Number(c.fraction) < 0
                      ? "Pénalisé"
                      : "Fausse"}
                  {Number(c.fraction) !== 0 && Number(c.fraction) !== 1
                    ? ` (${Math.round(Number(c.fraction) * 100)} %)`
                    : ""}
                  {" : "}
                </span>
                {c.text}
                {c.feedback ? <span className="text-muted-foreground"> — {c.feedback}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {q.general_feedback ? (
          <div>
            <h3 className="mb-1 font-medium">Retour général</h3>
            <Markdown source={q.general_feedback} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
