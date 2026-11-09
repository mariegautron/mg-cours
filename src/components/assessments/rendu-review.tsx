"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { OralSpace, type OralSpaceInit } from "@/components/assessments/oral-space";
import { Button } from "@/components/ui/button";
import type { OralCriterion } from "@/lib/assessments/oral-space";
import { lateLabel, lateMinutes, parisDayTime } from "@/lib/deposits/rules";
import { itemTitle, type SubmissionItemLike } from "@/lib/projects/submission-items";

export interface RenduCopy {
  id: string;
  name: string;
  isGroup: boolean;
  members: { id: string; name: string }[];
  init: OralSpaceInit;
  items: SubmissionItemLike[];
}

const isPdf = (i: SubmissionItemLike) => /\.pdf$/i.test(i.file_name ?? "");
const isImage = (i: SubmissionItemLike) => /\.(png|jpe?g|gif|webp)$/i.test(i.file_name ?? "");

/**
 * Corriger un rendu (fichiers ou liens) : le rendu à gauche, la grille en lettres à droite, une
 * copie à la fois. Même espace de correction que l'oral (lettres, notes privées, écriture tout ou
 * rien, mode lecture d'une note écrite).
 */
export function RenduReview({
  moduleId,
  assessmentId,
  title,
  copies,
  criteria,
  autoValidatedIds,
  maxScore,
  schoolRule,
  deadline,
  initialId,
}: {
  moduleId: string;
  assessmentId: string;
  title: string;
  copies: RenduCopy[];
  criteria: OralCriterion[];
  autoValidatedIds: string[];
  maxScore: number | null;
  schoolRule: "keep_group_grade" | "makeup";
  /** Date limite du dépôt (ISO) : le retard est affiché, sans effet sur la note. */
  deadline: string | null;
  initialId?: string;
}) {
  const start = Math.max(
    0,
    copies.findIndex((c) => c.id === initialId),
  );
  const [index, setIndex] = useState(start);
  const copy = copies[index];
  if (!copy) return <p>Aucune copie à corriger : coche des groupes dans l’évaluation.</p>;
  const go = (d: number) => setIndex((i) => Math.min(copies.length - 1, Math.max(0, i + d)));
  const deposit = copy.items
    .filter((i) => i.added_by === "student" && i.submitted_at)
    .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""))[0];
  const late =
    deposit?.submitted_at && deadline
      ? lateMinutes(new Date(deadline), new Date(deposit.submitted_at))
      : 0;
  const preview = copy.items.find((i) => i.kind !== "link" && (isPdf(i) || isImage(i)));
  const fileHref = (i: SubmissionItemLike) =>
    `/api/assessments/${assessmentId}/submissions/${i.id}`;

  return (
    <div className="space-y-3">
      <div className="bg-background/95 sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3 py-2 backdrop-blur">
        <p className="font-semibold">
          {title} · copie {index + 1} sur {copies.length} : {copy.name}
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={() => go(-1)}
          >
            <ChevronLeft aria-hidden />
            Précédente
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === copies.length - 1}
            onClick={() => go(1)}
          >
            Suivante
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section
          aria-labelledby="rendu-title"
          className="bg-card space-y-3 rounded-2xl border p-4 lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto"
        >
          <h2 id="rendu-title" className="font-heading text-lg font-bold">
            Rendu
          </h2>
          {copy.items.length === 0 ? (
            <div className="space-y-2 text-sm">
              <p>Pas de rendu.</p>
              <Link
                href={`/modules/${moduleId}/assessments/${assessmentId}#rendus`}
                className="font-semibold underline underline-offset-2"
              >
                Ajouter un rendu reçu ailleurs
              </Link>
            </div>
          ) : (
            <>
              {deposit?.submitted_at ? (
                <p className="text-muted-foreground text-sm">
                  Déposé le {parisDayTime(deposit.submitted_at)}
                  {deposit.submitted_by_name ? ` par ${deposit.submitted_by_name}` : ""}
                  {late > 0 ? ` · en retard de ${lateLabel(late)}` : ""}
                </p>
              ) : null}
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {copy.items.map((i) => (
                  <li key={i.id}>
                    <a
                      href={i.kind === "link" && i.url ? i.url : fileHref(i)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      {itemTitle(i)}
                      <ExternalLink aria-hidden className="size-3.5" />
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  </li>
                ))}
              </ul>
              {preview ? (
                isPdf(preview) ? (
                  <iframe
                    title={`Aperçu : ${itemTitle(preview)}`}
                    src={fileHref(preview)}
                    className="h-[70dvh] w-full rounded-lg border"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileHref(preview)}
                    alt={`Rendu : ${itemTitle(preview)}`}
                    className="w-full rounded-lg border"
                  />
                )
              ) : null}
            </>
          )}
        </section>

        <div className="min-w-0">
          <OralSpace
            key={copy.id}
            moduleId={moduleId}
            assessmentId={assessmentId}
            subjectId={copy.id}
            subjectName={copy.name}
            isGroup={copy.isGroup}
            members={copy.members}
            criteria={criteria}
            autoValidatedIds={autoValidatedIds}
            maxScore={maxScore}
            schoolRule={schoolRule}
            init={copy.init}
            onNext={index < copies.length - 1 ? () => go(1) : undefined}
            nextLabel="Copie suivante"
            variant="rendu"
          />
        </div>
      </div>
    </div>
  );
}
