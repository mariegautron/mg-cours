import type { Metadata } from "next";
import Link from "next/link";
import { FileUp, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { DownloadButton } from "@/components/download-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterQuestions, readQuestionFilters } from "@/lib/questions/filter";
import { questionOrigins } from "@/lib/questions/link-queries";
import { originLabel } from "@/lib/questions/links";
import { listQuestions } from "@/lib/questions/queries";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/questions/types";

export const metadata: Metadata = { title: "Banque de questions" };

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

export default async function QuestionsPage({ searchParams }: PageProps<"/questions">) {
  const filters = readQuestionFilters(await searchParams);
  const [all, origins] = await Promise.all([listQuestions(), questionOrigins()]);
  const shown = filterQuestions(all, filters);
  const active = all.filter((q) => !q.archived_at);
  const categories = [...new Set(active.map((q) => q.category))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const tags = [...new Set(active.flatMap((q) => q.tags))].sort((a, b) => a.localeCompare(b, "fr"));
  const exportQuery = new URLSearchParams(
    Object.entries({
      q: filters.q,
      category: filters.category,
      type: filters.type,
      tag: filters.tag,
    }).filter(([, v]) => v),
  ).toString();

  const countOf = (c: string) => active.filter((q) => q.category === c).length;
  const chipHref = (category: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({
      q: filters.q,
      type: filters.type,
      tag: filters.tag,
      archived: filters.archived ? "1" : "",
      category,
    })) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `/questions?${qs}` : "/questions";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Banque de questions</h1>
          <p className="text-muted-foreground">
            {active.length} question{active.length > 1 ? "s" : ""}, à toi et non liées à un module.
            Chaque QCM en tire un nombre au hasard pour chaque étudiant·e, dans un ordre différent.
          </p>
        </div>
        <Button asChild size="touch">
          <Link href="/questions/new">
            <Plus aria-hidden />
            Ajouter une question
          </Link>
        </Button>
      </div>
      <Link
        href="/resources?family=quizzes"
        className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm text-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        ← Bibliothèque, famille QCM
      </Link>

      <nav aria-label="Thèmes" className="flex flex-wrap gap-2">
        {[
          { label: `Tous les thèmes · ${active.length}`, value: "" },
          ...categories.map((c) => ({
            label: `${c || "Sans catégorie"} · ${countOf(c)}`,
            value: c,
          })),
        ].map((c) => {
          const current = filters.category === c.value;
          return (
            <Link
              key={c.value || "all"}
              href={chipHref(c.value)}
              aria-current={current ? "true" : undefined}
              className={`focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl border-[1.5px] px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${current ? "bg-primary text-primary-foreground border-transparent" : "bg-muted/40"}`}
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      <form role="search" aria-label="Filtrer les questions" className="space-y-2">
        <input type="hidden" name="category" value={filters.category} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1">
            <Label htmlFor="q">Recherche</Label>
            <Input id="q" name="q" type="search" defaultValue={filters.q} />
          </div>
          <Button type="submit" variant="secondary" size="touch">
            Filtrer
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="touch">
              <Link href="/questions/import">
                <FileUp aria-hidden />
                Importer (Moodle XML)
              </Link>
            </Button>
            {shown.length > 0 ? (
              <DownloadButton
                href={`/api/questions/export${exportQuery ? `?${exportQuery}` : ""}`}
                kind="xml"
                doneLabel="Questions exportées."
              >
                Exporter (Moodle XML)
              </DownloadButton>
            ) : null}
          </div>
        </div>
        <details>
          <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer items-center rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
            Plus de filtres
          </summary>
          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" defaultValue={filters.type} className={SELECT_CLASS}>
                <option value="">Tous</option>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="tag">Tag</Label>
              <select id="tag" name="tag" defaultValue={filters.tag} className={SELECT_CLASS}>
                <option value="">Tous</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="archived" value="1" defaultChecked={filters.archived} />
              Archivées
            </label>
          </div>
        </details>
      </form>

      {all.length === 0 ? (
        <EmptyState
          title="Pas encore de question"
          description="Écris la première, copie-les depuis une ressource, ou importe une banque exportée de Moodle (XML)."
          actions={[
            { label: "Écrire une question", href: "/questions/new" },
            { label: "Importer une banque", href: "/questions/import" },
          ]}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title="Aucune question ne correspond"
          description="Enlève un filtre pour en voir plus."
          actions={[{ label: "Effacer les filtres", href: "/questions" }]}
        />
      ) : (
        <section aria-label="Questions" className="bg-card rounded-xl border p-5">
          <ul className="divide-y">
            {shown.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link
                  href={`/questions/${q.id}`}
                  className="focus-visible:ring-ring min-w-0 flex-1 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  <strong className="block">{q.name}</strong>
                  <span className="text-muted-foreground line-clamp-2 block text-sm">
                    {q.statement}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {q.category || "Sans catégorie"} · {QUESTION_TYPE_LABELS[q.type]} ·{" "}
                    {Number(q.default_points)} pt{Number(q.default_points) > 1 ? "s" : ""}
                    {q.tags.length ? ` · ${q.tags.join(", ")}` : ""}
                    {q.archived_at ? " · archivée" : ""}
                    {origins.get(q.id)?.length
                      ? ` · ${originLabel((origins.get(q.id) ?? []).map((r) => r.title))}`
                      : ""}
                  </span>
                </Link>
                <Button asChild variant="ghost" size="touch">
                  <Link href={`/questions/${q.id}/edit`}>Modifier</Link>
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p role="status" className="text-muted-foreground text-sm">
              {shown.length} question{shown.length > 1 ? "s" : ""} affichée
              {shown.length > 1 ? "s" : ""}
              {shown.length < active.length ? ` sur ${active.length}` : ""}.
            </p>
            <Button asChild variant="ghost" size="touch">
              <Link href="/resources?family=quizzes">Préparer un QCM avec cette banque</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
