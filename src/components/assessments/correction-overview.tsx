"use client";

import Link from "next/link";
import { useState } from "react";

import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import {
  COPY_STATE_LABELS,
  filterRows,
  progressNote,
  submissionLabel,
  type CopyState,
  type Overview,
  type OverviewFilter,
} from "@/lib/assessments/overview";
import { cn } from "@/lib/utils";

const TONE: Record<CopyState, "ok" | "wip" | "warn"> = {
  todo: "warn",
  in_progress: "wip",
  done: "ok",
};

const FILTER_LABELS: Record<OverviewFilter, string> = {
  all: "Tous",
  todo: "À corriger",
  done: "Corrigés",
  missing: "Non rendus",
};

const AVATAR_TONES = ["bg-mint", "bg-sun", "bg-sky", "bg-coral", "bg-primary"];

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

/**
 * Vue d'ensemble de la correction (maquette « CorrVue », US-138) : à gauche chaque copie avec son
 * statut en mots, une barre d'avancement et des filtres ; à droite « Où j'en suis » (reprendre la
 * prochaine copie), la cohérence entre copies et les chiffres du moment. Un clic sur une ligne
 * ouvre la copie plus bas sur la page (ancre).
 */
export function CorrectionOverview({
  overview,
  maxScore,
  noun,
  compareHref,
  phrasesHref,
  correctHref,
}: {
  overview: Overview;
  maxScore: number;
  /** « groupe » ou « étudiant·e », pour les libellés. */
  noun: string;
  /** Comparer un critère entre les copies (US-141) ; absent sans grille. */
  compareHref?: string | null;
  /** Phrases de correction rangées par critère ; absent sans grille. */
  phrasesHref?: string | null;
  /** Page de correction plein écran ; `?copy=` ouvre une copie. */
  correctHref: string;
}) {
  const [filter, setFilter] = useState<OverviewFilter>("all");
  const rows = filterRows(overview.rows, filter);
  const counts: Record<OverviewFilter, number> = {
    all: overview.total,
    todo: overview.todo + overview.inProgress,
    done: overview.done,
    missing: overview.rows.filter((r) => r.received === false).length,
  };
  const tracked = overview.rows.some((r) => r.received !== undefined);
  const filters = (Object.keys(FILTER_LABELS) as OverviewFilter[]).filter(
    (f) => f !== "missing" || tracked,
  );
  const { next, total } = overview;
  const plural = noun === "groupe" ? "groupes" : "étudiant·es";
  const withContext = overview.rows.some((r) => r.context);

  return (
    <section aria-labelledby="overview" className="space-y-3">
      <h2 id="overview" className="text-lg font-medium">
        Où j’en suis
      </h2>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="bg-card min-w-0 flex-[1_1_0] space-y-3 rounded-xl border p-5 lg:flex-[3_1_0]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-lg font-semibold">
              {overview.label}
              {overview.average !== null
                ? ` · moyenne ${fmt(overview.average)} / ${fmt(maxScore)}`
                : ""}
            </p>
            <div role="group" aria-label="Filtrer les copies" className="flex flex-wrap gap-2">
              {filters.map((f) => (
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
          </div>
          {total > 0 ? (
            <div
              role="img"
              aria-label={`${overview.done} corrigé${overview.done > 1 ? "s" : ""}, ${overview.inProgress} en cours, ${overview.todo} à corriger`}
              className="bg-muted flex h-2.5 overflow-hidden rounded-full"
            >
              <span className="bg-mint" style={{ width: `${(overview.done / total) * 100}%` }} />
              <span
                className="bg-sky"
                style={{ width: `${(overview.inProgress / total) * 100}%` }}
              />
            </div>
          ) : null}

          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune copie dans cette liste.</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Copies de l’évaluation et état de leur correction
                </caption>
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      {noun.charAt(0).toUpperCase() + noun.slice(1)}
                    </th>
                    {withContext ? (
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Thème
                      </th>
                    ) : null}
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Personnes
                    </th>
                    {tracked ? (
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Rendu
                      </th>
                    ) : null}
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Statut
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={cn("border-b last:border-0", next?.id === r.id && "bg-primary/10")}
                      aria-current={next?.id === r.id ? "true" : undefined}
                    >
                      <th scope="row" className="py-1 pr-3 text-left font-medium">
                        <a
                          href={`${correctHref}?copy=${r.id}`}
                          className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {r.title}
                        </a>
                      </th>
                      {withContext ? (
                        <td className="text-muted-foreground py-1 pr-3">{r.context ?? "—"}</td>
                      ) : null}
                      <td className="py-1 pr-3">
                        {r.members?.length ? (
                          <span className="flex items-center">
                            <span aria-hidden className="flex -space-x-1">
                              {r.members.slice(0, 4).map((m, i) => (
                                <span
                                  key={`${m}-${i}`}
                                  className={cn(
                                    "text-background ring-card flex size-7 items-center justify-center rounded-full text-[11px] font-bold ring-2",
                                    AVATAR_TONES[i % AVATAR_TONES.length],
                                  )}
                                >
                                  {initialsOf(m)}
                                </span>
                              ))}
                            </span>
                            <span className="sr-only">{r.members.join(", ")}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {tracked ? (
                        <td className="py-1 pr-3">
                          {(() => {
                            const sub = submissionLabel(r);
                            return sub ? <Pill tone={sub.tone}>{sub.label}</Pill> : "—";
                          })()}
                        </td>
                      ) : null}
                      <td className="py-1 pr-3">
                        <Pill tone={TONE[r.state]}>
                          {COPY_STATE_LABELS[r.state]}
                          {r.state === "in_progress" && r.scored !== null
                            ? ` · ${r.scored} sur ${r.total}`
                            : ""}
                        </Pill>
                      </td>
                      <td className="py-1 text-right font-semibold tabular-nums">
                        {r.value !== null ? fmt(r.value) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Clique une ligne pour ouvrir la copie. Tout s’enregistre au fur et à mesure.
          </p>
        </div>

        <div className="min-w-0 flex-[1_1_0] space-y-4">
          <section
            aria-labelledby="go"
            className="bg-primary/10 border-primary/50 rounded-xl border p-5"
          >
            <p className="text-primary text-xs font-bold tracking-widest uppercase">
              Prochaine copie
            </p>
            {next ? (
              <>
                <h3 id="go" className="mt-1 text-xl font-semibold">
                  {next.state === "in_progress" ? "Reprendre" : "Continuer avec"} {next.title}
                </h3>
                <p className="text-muted-foreground mt-1 mb-3 text-sm">
                  {next.state === "in_progress"
                    ? progressNote(next)
                    : `Elle n’est pas encore commencée.`}
                </p>
                <Button asChild size="touch" className="w-full">
                  <Link href={`${correctHref}?copy=${next.id}`}>
                    {next.state === "in_progress" ? "Reprendre" : "Continuer"}
                    <span className="sr-only"> la correction : {next.title}</span>
                  </Link>
                </Button>
              </>
            ) : (
              <h3 id="go" className="mt-1 text-xl font-semibold">
                {total > 0 ? "Tout est corrigé." : "Aucune copie."}
              </h3>
            )}
          </section>

          {tracked && counts.missing > 0 ? (
            <section aria-labelledby="ab" className="bg-card rounded-xl border p-5">
              <h3 id="ab" className="mb-2 text-lg font-semibold">
                Non rendus
              </h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                {overview.rows
                  .filter((r) => r.received === false)
                  .map((r) => (
                    <li key={r.id}>
                      <strong className="text-foreground">{r.title}</strong> :{" "}
                      {submissionLabel(r)
                        ?.label.replace("Non rendu, ", "")
                        .replace("Non rendu", "rien reçu")}
                    </li>
                  ))}
              </ul>
              <p className="text-muted-foreground mt-2 text-xs">
                Excusé·e : un rattrapage est possible. Non prévenu·e : la note est 0. Un rendu reçu
                autrement ? Ouvre la personne et ajoute ses fichiers ou un lien.
              </p>
            </section>
          ) : null}

          {compareHref ? (
            <section aria-labelledby="crit" className="bg-card rounded-xl border p-5">
              <h3 id="crit" className="mb-1 text-lg font-semibold">
                Vérifier la cohérence
              </h3>
              <p className="text-muted-foreground mb-3 text-sm">
                Un critère, tous les {plural} côte à côte : pour harmoniser notes et commentaires.
              </p>
              <Button asChild variant="secondary" size="touch" className="w-full">
                <Link href={compareHref}>
                  Comparer un critère
                  <span className="sr-only">
                    {" "}
                    entre les {noun === "groupe" ? "groupes" : "étudiant·es"}
                  </span>
                </Link>
              </Button>
              {phrasesHref ? (
                <Button asChild variant="ghost" size="touch" className="mt-2 w-full">
                  <Link href={phrasesHref}>Phrases de correction</Link>
                </Button>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="stat" className="bg-card rounded-xl border p-5">
            <h3 id="stat" className="mb-2 text-lg font-semibold">
              Pour l’instant
            </h3>
            <dl className="divide-y text-sm">
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-muted-foreground">
                  Moyenne ({overview.done} corrigé{overview.done > 1 ? "s" : ""})
                </dt>
                <dd className="font-semibold">
                  {overview.average !== null ? fmt(overview.average) : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-muted-foreground">Restent à corriger</dt>
                <dd className="font-semibold">{overview.todo + overview.inProgress}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </section>
  );
}
