"use client";

import { useState } from "react";

import { saveCriterionCell } from "@/app/(app)/modules/[id]/assessments/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  compareCriterion,
  GAP_LABELS,
  pointsForRankKey,
  repeatedComments,
  sortCompareRows,
  sortedPoints,
  type CompareSort,
} from "@/lib/assessments/compare";
import { cn } from "@/lib/utils";

export interface ComparisonCopy {
  id: string;
  kind: "group" | "student";
  title: string;
  points: number | null;
  comment: string;
  absent: boolean;
}

interface Draft {
  points: number | null;
  comment: string;
  /** Dernière valeur enregistrée, pour ne réécrire que ce qui a changé. */
  savedPoints: number | null;
  savedComment: string;
  status: "idle" | "saving" | "saved" | "error";
  error?: string;
}

const SORTS: { value: CompareSort; label: string }[] = [
  { value: "name", label: "Nom" },
  { value: "points_desc", label: "Palier, du plus haut au plus bas" },
  { value: "points_asc", label: "Palier, du plus bas au plus haut" },
  { value: "gap", label: "Écart avec la médiane" },
];

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Comparer un critère entre les copies (US-141) : tous les groupes (ou étudiant·es) côte à côte,
 * palier et commentaire modifiables en place (chaque cellule s'enregistre), tri, répartition,
 * écarts signalés en mots. Clavier : ↑ ↓ changent de ligne, 1 à 4 choisissent le palier du plus
 * haut au plus bas.
 */
export function CriterionComparison({
  moduleId,
  assessmentId,
  criterion,
  copies,
}: {
  moduleId: string;
  assessmentId: string;
  criterion: {
    id: string;
    label: string;
    weight: number;
    levels: { points: number; description: string }[];
  };
  copies: ComparisonCopy[];
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      copies.map((c) => [
        c.id,
        {
          points: c.points,
          comment: c.comment,
          savedPoints: c.points,
          savedComment: c.comment,
          status: "idle" as const,
        },
      ]),
    ),
  );
  const [sort, setSort] = useState<CompareSort>("name");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const hasLevels = criterion.levels.length > 0;
  const ladder = sortedPoints(criterion.levels);

  const analysis = compareCriterion(
    copies.map((c) => ({
      id: c.id,
      title: c.title,
      absent: c.absent,
      scores: drafts[c.id]?.points === null ? {} : { [criterion.id]: drafts[c.id]?.points },
      comments: { [criterion.id]: drafts[c.id]?.comment ?? "" },
    })),
    criterion.id,
    criterion.levels,
  );
  const rows = sortCompareRows(analysis.rows, sort);
  const repeated = repeatedComments(analysis.rows);
  const copyById = new Map(copies.map((c) => [c.id, c]));

  async function save(copy: ComparisonCopy, points: number | null, comment: string) {
    setDrafts((d) => ({ ...d, [copy.id]: { ...d[copy.id], points, comment, status: "saving" } }));
    const result = await saveCriterionCell(
      moduleId,
      assessmentId,
      { kind: copy.kind, id: copy.id },
      criterion.id,
      points,
      comment,
    );
    if (result.error) {
      setDrafts((d) => ({
        ...d,
        [copy.id]: { ...d[copy.id], status: "error", error: result.error },
      }));
      return;
    }
    setDrafts((d) => ({
      ...d,
      [copy.id]: { ...d[copy.id], savedPoints: points, savedComment: comment, status: "saved" },
    }));
    setLastSaved(
      new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Paris",
      }),
    );
  }

  function onRowKey(e: React.KeyboardEvent<HTMLTableRowElement>, copy: ComparisonCopy) {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLInputElement && target.type !== "radio") return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const rowsEls = Array.from(
        e.currentTarget.closest("tbody")?.querySelectorAll<HTMLElement>("tr[data-copy]") ?? [],
      ).filter((r) => r.querySelector("input[type=radio]"));
      const i = rowsEls.indexOf(e.currentTarget);
      const next = rowsEls[i + (e.key === "ArrowDown" ? 1 : -1)];
      next?.querySelector<HTMLElement>("input[type=radio]:checked, input[type=radio]")?.focus();
      return;
    }
    const points = pointsForRankKey(criterion.levels, e.key);
    if (points !== null && hasLevels) {
      e.preventDefault();
      void save(copy, points, drafts[copy.id]?.comment ?? "");
    }
  }

  return (
    <section aria-labelledby="comparison" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="comparison" className="text-lg font-medium">
            {criterion.label}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              ({fmt(criterion.weight)} point{criterion.weight > 1 ? "s" : ""})
            </span>
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {analysis.median !== null
              ? `Palier médian : ${fmt(analysis.median)}`
              : "Aucune copie notée"}
            {analysis.unscored > 0 ? ` · ${analysis.unscored} sans note` : ""}
            {lastSaved ? ` · Enregistré à ${lastSaved}` : ""}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="compare-sort" className="text-xs">
            Trier par
          </Label>
          <select
            id="compare-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as CompareSort)}
            className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasLevels ? (
        <ul className="flex flex-wrap gap-2 text-sm" aria-label="Répartition par palier">
          {analysis.counts.map((c) => (
            <li key={c.points} className="rounded-md border px-2 py-1">
              {fmt(c.points)} pt{c.points > 1 ? "s" : ""} : <strong>{c.count}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      {repeated.length > 0 ? (
        <div className="space-y-1 rounded-md border border-dashed p-3 text-sm">
          <p className="font-medium">Commentaires qui reviennent</p>
          <ul className="space-y-1">
            {repeated.map((g) => (
              <li key={g.comment} className="text-muted-foreground">
                « {g.comment} » — {g.titles.length} copies : {g.titles.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Palier et commentaire de chaque copie pour le critère {criterion.label}
          </caption>
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th scope="col" className="py-2 pr-3 font-medium">
                Copie
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                {hasLevels ? "Palier" : "Points"}
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Commentaire pour ce critère
              </th>
              <th scope="col" className="py-2 font-medium">
                À vérifier
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const copy = copyById.get(r.id)!;
              const draft = drafts[r.id];
              return (
                <tr
                  key={r.id}
                  data-copy={r.id}
                  onKeyDown={(e) => onRowKey(e, copy)}
                  className={cn(
                    "border-b align-top last:border-0",
                    r.flags.includes("far_from_median") && "bg-muted/50",
                  )}
                >
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {r.title}
                    <span className="sr-only" aria-live="polite">
                      {draft?.status === "saving"
                        ? " : enregistrement…"
                        : draft?.status === "saved"
                          ? " : enregistré"
                          : draft?.status === "error"
                            ? ` : ${draft.error}`
                            : ""}
                    </span>
                  </th>
                  <td className="py-2 pr-3">
                    {r.absent ? (
                      <span className="text-muted-foreground">Absent·e : pas de note</span>
                    ) : hasLevels ? (
                      <div
                        role="radiogroup"
                        aria-label={`Palier de ${r.title}`}
                        className="flex flex-wrap gap-1.5"
                      >
                        {ladder.map((p) => (
                          <label
                            key={p}
                            className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-ring hover:bg-muted flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-3 font-medium has-[:focus-visible]:ring-2"
                          >
                            <input
                              type="radio"
                              name={`level-${r.id}`}
                              checked={
                                draft?.points !== null && Math.abs((draft?.points ?? -1) - p) < 1e-9
                              }
                              onChange={() => void save(copy, p, draft?.comment ?? "")}
                              className="sr-only"
                            />
                            {fmt(p)}
                            <span className="sr-only"> point{p > 1 ? "s" : ""}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        max={criterion.weight}
                        aria-label={`Points de ${r.title}`}
                        defaultValue={draft?.points ?? ""}
                        onBlur={(e) => {
                          const v =
                            e.target.value.trim() === ""
                              ? null
                              : Number(e.target.value.replace(",", "."));
                          if (v !== draft?.savedPoints && (v === null || Number.isFinite(v))) {
                            void save(copy, v, draft?.comment ?? "");
                          }
                        }}
                        className="w-24"
                      />
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      aria-label={`Commentaire — ${r.title}`}
                      value={draft?.comment ?? ""}
                      disabled={r.absent}
                      placeholder={r.points === null ? "Pas encore noté" : "Ajouter un mot…"}
                      autoComplete="off"
                      maxLength={4000}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [r.id]: { ...d[r.id], comment: e.target.value },
                        }))
                      }
                      onBlur={() => {
                        if (draft && draft.comment !== draft.savedComment) {
                          void save(copy, draft.points, draft.comment);
                        }
                      }}
                    />
                  </td>
                  <td className="py-2 text-xs">
                    {r.flags.length ? (
                      <ul>
                        {r.flags.map((f) => (
                          <li key={f}>{GAP_LABELS[f]}</li>
                        ))}
                      </ul>
                    ) : null}
                    {draft?.status === "error" ? (
                      <p role="alert" className="text-destructive">
                        {draft.error}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        ↑ ↓ changent de ligne · 1 à {Math.max(1, ladder.length)} choisissent le palier, du plus haut
        au plus bas · chaque changement s’enregistre tout seul. Rien n’est envoyé aux étudiant·es
        avant l’envoi des résultats.
      </p>
    </section>
  );
}
