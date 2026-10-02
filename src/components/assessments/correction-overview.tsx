"use client";

import { useState } from "react";
import { Check, CircleDashed, PencilLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  COPY_STATE_LABELS,
  filterRows,
  progressNote,
  type CopyState,
  type Overview,
  type OverviewFilter,
} from "@/lib/assessments/overview";

const ICON: Record<CopyState, typeof Check> = {
  todo: CircleDashed,
  in_progress: PencilLine,
  done: Check,
};

const FILTER_LABELS: Record<OverviewFilter, string> = {
  all: "Tous",
  todo: "À corriger",
  done: "Corrigés",
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Vue d'ensemble de la correction (US-138) : chaque copie avec son statut en mots, l'avancement
 * global et « Continuer » vers la prochaine copie à reprendre. Un clic sur une ligne ouvre la
 * copie plus bas sur la page (ancre).
 */
export function CorrectionOverview({
  overview,
  maxScore,
  noun,
}: {
  overview: Overview;
  maxScore: number;
  /** « groupe » ou « étudiant·e », pour les libellés. */
  noun: string;
}) {
  const [filter, setFilter] = useState<OverviewFilter>("all");
  const rows = filterRows(overview.rows, filter);
  const counts: Record<OverviewFilter, number> = {
    all: overview.total,
    todo: overview.todo + overview.inProgress,
    done: overview.done,
  };
  const { next } = overview;

  return (
    <section aria-labelledby="overview" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="overview" className="text-lg font-medium">
            Où j’en suis
          </h2>
          <p role="status" className="text-muted-foreground text-sm">
            {overview.label}
            {overview.average !== null
              ? ` · moyenne ${fmt(overview.average)} / ${fmt(maxScore)}`
              : ""}
          </p>
        </div>
        {next ? (
          <Button asChild>
            <a href={`#copy-${next.id}-title`}>
              {next.state === "in_progress" ? "Reprendre" : "Continuer"}
              <span className="sr-only"> la correction : {next.title}</span>
            </a>
          </Button>
        ) : overview.total > 0 ? (
          <p className="text-sm font-medium">Tout est corrigé.</p>
        ) : null}
      </div>

      {next ? (
        <p className="text-muted-foreground text-sm">
          Prochaine copie : <strong className="text-foreground">{next.title}</strong>
          {next.state === "in_progress" ? ` · ${progressNote(next)}` : ""}
        </p>
      ) : null}

      <div role="group" aria-label="Filtrer les copies" className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as OverviewFilter[]).map((f) => (
          <Button
            key={f}
            type="button"
            size="touch"
            variant={filter === f ? "default" : "outline"}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABELS[f]} · {counts[f]}
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune copie dans cette liste.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Copies de l’évaluation et état de leur correction</caption>
            <thead>
              <tr className="text-muted-foreground border-b text-left">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {noun.charAt(0).toUpperCase() + noun.slice(1)}
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Personnes
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Statut
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const Icon = ICON[r.state];
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <th scope="row" className="py-1 pr-3 text-left font-medium">
                      <a
                        href={`#copy-${r.id}-title`}
                        className="focus-visible:ring-ring inline-flex min-h-11 flex-col justify-center rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {r.title}
                        {r.context ? (
                          <span className="text-muted-foreground text-xs font-normal">
                            {r.context}
                          </span>
                        ) : null}
                      </a>
                    </th>
                    <td className="text-muted-foreground py-1 pr-3">
                      {r.members?.length ? r.members.join(", ") : "—"}
                    </td>
                    <td className="py-1 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon aria-hidden className="size-4" />
                        {COPY_STATE_LABELS[r.state]}
                        {r.state === "in_progress" && r.scored !== null
                          ? ` · ${r.scored} sur ${r.total}`
                          : ""}
                      </span>
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {r.value !== null ? fmt(r.value) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
