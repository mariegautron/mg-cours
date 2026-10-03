import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddPhrase } from "@/components/assessments/add-phrase";
import { Button } from "@/components/ui/button";
import { filterPhrases, rankPhrases, type Phrase } from "@/lib/assessments/phrases";
import { getAssessment, listComments } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Phrases de correction" };

const card = "bg-card space-y-2 rounded-xl border p-5";

/**
 * Phrases de correction d'une évaluation (maquette « BibPhrases ») : rangées par critère de la
 * grille, les plus utilisées d'abord ; le nombre d'utilisations montre les erreurs fréquentes.
 * La bibliothèque est commune : une phrase suit son critère (par libellé) d'une évaluation à l'autre.
 */
export default async function PhrasesPage({
  params,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/phrases">) {
  const { id, assessmentId } = await params;
  const [assessment, comments] = await Promise.all([getAssessment(assessmentId), listComments()]);
  if (!assessment || assessment.module_id !== id) notFound();

  const back = `/modules/${id}/assessments/${assessmentId}`;
  const phrases = comments as unknown as (Phrase & { id: string })[];
  const criteria = assessment.grading_grid?.criteria ?? [];
  const general = rankPhrases(filterPhrases(phrases, { kind: "general" }), null);

  const line = (p: Phrase) => (
    <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
      <strong className="min-w-0 flex-1 font-semibold">{p.text}</strong>
      <span className="text-muted-foreground text-sm">Utilisée {p.use_count} fois</span>
      <Button asChild variant="ghost" size="touch">
        <Link href={`/assessments/comments/${p.id}/edit`}>
          Modifier<span className="sr-only"> : {p.text}</span>
        </Link>
      </Button>
    </li>
  );

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
          <h1 className="text-3xl font-semibold">Phrases de correction : {assessment.title}</h1>
          <p className="text-muted-foreground">
            Rangées par critère de la grille, et proposées pendant la correction. Le nombre
            d’utilisations montre les erreurs fréquentes.
          </p>
        </div>
        <Button asChild variant="ghost" size="touch">
          <Link href={back}>← Retour à la correction</Link>
        </Button>
      </div>

      {criteria.length === 0 ? (
        <p className="text-muted-foreground">
          Cette évaluation n’a pas de grille : les phrases se rangent par critère. Choisis une
          grille dans « Modifier ».
        </p>
      ) : null}

      {criteria.map((c) => {
        const list = rankPhrases(
          filterPhrases(phrases, { kind: "criterion", id: c.id, label: c.label }),
          null,
        );
        return (
          <section key={c.id} aria-labelledby={`crit-${c.id}`} className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`crit-${c.id}`} className="text-lg font-semibold">
                {c.label}
              </h2>
              <span className="text-muted-foreground text-sm">
                {c.weight} point{c.weight > 1 ? "s" : ""}
              </span>
            </div>
            {list.length ? (
              <ul className="divide-y">{list.map(line)}</ul>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune phrase pour ce critère.</p>
            )}
            <AddPhrase criterionId={c.id} label={c.label} />
          </section>
        );
      })}

      <section aria-labelledby="general" className={card}>
        <h2 id="general" className="text-lg font-semibold">
          Phrases sans critère
        </h2>
        {general.length ? (
          <ul className="divide-y">{general.map(line)}</ul>
        ) : (
          <p className="text-muted-foreground text-sm">Aucune phrase générale.</p>
        )}
        <AddPhrase criterionId={null} label="sans critère" />
      </section>

      <p className="text-muted-foreground text-sm">
        Les phrases se créent aussi depuis la copie, en un clic.{" "}
        <Link href="/assessments/comments" className="underline underline-offset-2">
          Toute la bibliothèque de phrases
        </Link>
      </p>
    </div>
  );
}
