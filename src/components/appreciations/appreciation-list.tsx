"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Wand2 } from "lucide-react";

import { proposeAllDrafts, setReported } from "@/app/(app)/modules/[id]/appreciations/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import {
  appreciationStatus,
  countText,
  LIST_FILTER_LABELS,
  matchesFilter,
  modifiedSinceReport,
  STATUS_LABELS,
  textOnly,
  type ListFilter,
} from "@/lib/appreciations/appreciation";

export interface ListRow {
  studentId: string;
  firstName: string;
  lastName: string;
  text: string;
  /** Texte au moment du report ; `null` = pas reportée. */
  reportedText: string | null;
  proposal: boolean;
  average: number | null;
}

/** Liste alphabétique des appréciations : filtre, copie du texte seul, case « Reportée dans Hyperplanning ». */
export function AppreciationList({
  moduleId,
  max,
  rows,
}: {
  moduleId: string;
  max: number;
  rows: ListRow[];
}) {
  const [filter, setFilter] = useState<ListFilter>("all");
  const [reported, setReportedState] = useState(
    () => new Map(rows.map((r) => [r.studentId, r.reportedText])),
  );
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [proposing, setProposing] = useState(false);
  const todoCount = rows.filter((r) => r.text.trim() === "").length;

  async function proposeAll() {
    setProposing(true);
    setMessage("Brouillons en préparation…");
    const r = await proposeAllDrafts(moduleId);
    setProposing(false);
    setMessage(
      r.error
        ? r.error
        : `${r.count} brouillon${r.count > 1 ? "s proposés" : " proposé"} : relis-les un par un, rien n’est copié sans toi.`,
    );
    router.refresh();
  }
  const [, startTransition] = useTransition();

  const toggle = (row: ListRow, value: boolean) => {
    setReportedState((m) => new Map(m).set(row.studentId, value ? row.text : null));
    startTransition(async () => {
      const r = await setReported(moduleId, row.studentId, value);
      if (r.error) {
        setReportedState((m) => new Map(m).set(row.studentId, row.reportedText));
        setMessage(r.error);
      }
    });
  };

  async function copy(row: ListRow) {
    try {
      await navigator.clipboard.writeText(textOnly(row.text));
      setMessage(`Appréciation de ${row.firstName} ${row.lastName} copiée (texte seul).`);
      toggle(row, true);
    } catch {
      setMessage("Copie impossible depuis ce navigateur : sélectionne le texte à la main.");
    }
  }

  const shown = rows.filter((r) =>
    matchesFilter(filter, r.text, reported.get(r.studentId) ?? null, max),
  );

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Filtrer" className="flex flex-wrap gap-1">
        {(Object.keys(LIST_FILTER_LABELS) as ListFilter[]).map((f) => (
          <Button
            key={f}
            type="button"
            size="touch"
            variant={filter === f ? "default" : "secondary"}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {LIST_FILTER_LABELS[f]} ·{" "}
            {
              rows.filter((r) => matchesFilter(f, r.text, reported.get(r.studentId) ?? null, max))
                .length
            }
          </Button>
        ))}
      </div>
      {todoCount > 0 ? (
        <Button
          type="button"
          variant="secondary"
          size="touch"
          disabled={proposing}
          onClick={() => void proposeAll()}
        >
          <Wand2 aria-hidden />
          {proposing
            ? "Brouillons en préparation…"
            : "Proposer pour toutes les appréciations à écrire"}
          <span className="sr-only"> ({todoCount})</span>
        </Button>
      ) : null}
      <p role="status" className="min-h-5 text-sm font-medium">
        {message}
      </p>
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-sm">Personne dans ce filtre.</p>
      ) : (
        <ul className="divide-y">
          {shown.map((r) => {
            const status = appreciationStatus(r.text, max);
            const name = `${r.firstName} ${r.lastName}`;
            const rep = reported.get(r.studentId) ?? null;
            const modified = modifiedSinceReport(r.text, rep);
            return (
              <li
                key={r.studentId}
                id={`student-${r.studentId}`}
                className="scroll-mt-20 space-y-1 py-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    aria-hidden
                    className="bg-primary/20 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  >
                    {r.firstName.charAt(0)}
                    {r.lastName.charAt(0)}
                  </span>
                  <strong className="min-w-0 flex-1">{name}</strong>
                  <span className="text-muted-foreground text-sm">
                    Note{" "}
                    {r.average !== null
                      ? r.average.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                      : "—"}
                  </span>
                  <Pill
                    tone={status === "written" ? "ok" : status === "too_long" ? "lock" : "warn"}
                  >
                    {r.proposal && status !== "todo" ? "Proposé, à relire" : STATUS_LABELS[status]}
                  </Pill>
                  {modified ? <Pill tone="warn">Modifiée depuis le report</Pill> : null}
                  <span className="text-muted-foreground text-sm">
                    {r.text.trim() ? countText(r.text).chars : 0} caractères
                  </span>
                </div>
                {r.text.trim() ? (
                  <p className="text-muted-foreground pl-12 text-sm">{r.text}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  <Button asChild variant="ghost" size="touch">
                    <Link href={`/modules/${moduleId}/appreciations/${r.studentId}`}>
                      {r.text.trim() ? "Relire" : "Écrire"}
                      <span className="sr-only"> l’appréciation de {name}</span>
                    </Link>
                  </Button>
                  {r.text.trim() ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="touch"
                        disabled={status === "too_long" || r.proposal}
                        onClick={() => void copy(r)}
                      >
                        <Copy aria-hidden />
                        Copier pour Hyperplanning
                        <span className="sr-only"> : {name}</span>
                      </Button>
                      <label className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-5"
                          checked={rep !== null}
                          onChange={(e) => toggle(r, e.target.checked)}
                        />
                        Reportée dans Hyperplanning
                        <span className="sr-only"> : {name}</span>
                      </label>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
