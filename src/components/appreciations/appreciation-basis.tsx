"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AverageLine } from "@/lib/assessments/queries";
import type { BasisObservation, CorrectionComment } from "@/lib/appreciations/basis-queries";
import {
  OBSERVATION_TAGS,
  OBSERVATION_TAG_LABELS,
  type ObservationTag,
} from "@/lib/notebook/notebook";

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
const dateFmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

function Block({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="rounded-lg border">
      <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-semibold">
        {title} ({count})
      </summary>
      <div className="border-t px-3 py-2 text-sm">{children}</div>
    </details>
  );
}

export interface GroupBasis {
  name: string;
  observations: BasisObservation[];
}

/**
 * « D'après » : tout ce qui peut nourrir l'appréciation, en blocs repliables, à côté du champ.
 * Notes (celles de la moyenne), commentaires de correction, observations (filtrables) et groupe.
 */
export function AppreciationBasisPanel({
  lines,
  average,
  comments,
  observations,
  group,
}: {
  lines: AverageLine[];
  average: number | null;
  comments: CorrectionComment[];
  observations: BasisObservation[];
  group?: GroupBasis | null;
}) {
  const [tag, setTag] = useState<ObservationTag | "all">("all");
  const shown = tag === "all" ? observations : observations.filter((o) => o.tag === tag);
  const groupObs = group?.observations ?? [];

  return (
    <div className="space-y-2">
      <Block title="Notes du module" count={lines.length}>
        {lines.length === 0 ? (
          <p className="text-muted-foreground">Aucune note saisie.</p>
        ) : (
          <>
            <ul className="divide-y">
              {lines.map((l) => (
                <li
                  key={`${l.assessmentId}-${l.kind}`}
                  className="flex flex-wrap justify-between gap-x-2 py-1"
                >
                  <span>
                    {l.title}
                    <span className="text-muted-foreground">
                      {" "}
                      · {l.kind === "group" ? "groupe" : "individuelle"}
                      {l.isBonus ? " · bonus" : ` · coef. ${l.coefficient}`}
                    </span>
                  </span>
                  <strong>
                    {fmt(l.value)} sur {fmt(l.max)}
                  </strong>
                </li>
              ))}
            </ul>
            {average !== null ? (
              <p className="mt-1 font-medium">Moyenne du module : {fmt(average)} sur 20</p>
            ) : null}
          </>
        )}
      </Block>

      <Block title="Commentaires de correction" count={comments.length}>
        {comments.length === 0 ? (
          <p className="text-muted-foreground">Aucun commentaire de correction.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={`${c.assessmentId}-${c.isGroup}`}>
                <p className="font-medium">
                  {c.assessmentTitle}
                  {c.isGroup ? (
                    <span className="text-muted-foreground"> · copie de groupe</span>
                  ) : null}
                </p>
                {c.strengths ? (
                  <p className="whitespace-pre-wrap">Points forts : {c.strengths}</p>
                ) : null}
                {c.progress ? <p className="whitespace-pre-wrap">Progrès : {c.progress}</p> : null}
                {c.feedback ? (
                  <p className="whitespace-pre-wrap">Commentaire : {c.feedback}</p>
                ) : null}
                {c.personalNote ? (
                  <p className="whitespace-pre-wrap">Mot personnel : {c.personalNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Mes observations" count={observations.length}>
        {observations.length === 0 ? (
          <p className="text-muted-foreground">Aucune observation sur cette personne.</p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Filtrer par étiquette"
              className="mb-2 flex flex-wrap gap-1"
            >
              {[{ value: "all" as const, label: "Toutes" }, ...OBSERVATION_TAGS].map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  size="sm"
                  variant={tag === t.value ? "default" : "secondary"}
                  aria-pressed={tag === t.value}
                  onClick={() => setTag(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <ul className="space-y-2">
              {shown.map((o) => (
                <li key={o.id}>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs">
                    <time dateTime={o.createdAt} className="font-semibold">
                      {dateFmt(o.createdAt)}
                    </time>
                    {o.courseTitle ? (
                      <span className="text-muted-foreground">{o.courseTitle}</span>
                    ) : null}
                    <Badge variant="outline">{OBSERVATION_TAG_LABELS[o.tag]}</Badge>
                  </p>
                  {o.note ? <p className="whitespace-pre-wrap">{o.note}</p> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </Block>

      {group ? (
        <Block title={`Le groupe ${group.name}`} count={groupObs.length}>
          {groupObs.length === 0 ? (
            <p className="text-muted-foreground">Aucune observation sur le groupe.</p>
          ) : (
            <ul className="space-y-2">
              {groupObs.map((o) => (
                <li key={o.id}>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs">
                    <time dateTime={o.createdAt} className="font-semibold">
                      {dateFmt(o.createdAt)}
                    </time>
                    {o.courseTitle ? (
                      <span className="text-muted-foreground">{o.courseTitle}</span>
                    ) : null}
                    <Badge variant="outline">{OBSERVATION_TAG_LABELS[o.tag]}</Badge>
                  </p>
                  {o.note ? <p className="whitespace-pre-wrap">{o.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Block>
      ) : null}
    </div>
  );
}
