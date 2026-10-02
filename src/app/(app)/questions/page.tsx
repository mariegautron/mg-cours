import type { Metadata } from "next";
import Link from "next/link";
import { FileUp, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { DownloadButton } from "@/components/download-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filterQuestions, readQuestionFilters } from "@/lib/questions/filter";
import { listQuestions } from "@/lib/questions/queries";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/questions/types";

export const metadata: Metadata = { title: "Banque de questions" };

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

export default async function QuestionsPage({ searchParams }: PageProps<"/questions">) {
  const filters = readQuestionFilters(await searchParams);
  const all = await listQuestions();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Banque de questions</h1>
          <p className="text-muted-foreground">
            {active.length} question{active.length > 1 ? "s" : ""} pour tes QCM, à toi et non liées
            à un module.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/questions/new">
              <Plus aria-hidden />
              Nouvelle question
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
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

      <form
        role="search"
        aria-label="Filtrer les questions"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="space-y-1">
          <Label htmlFor="q">Recherche</Label>
          <Input id="q" name="q" type="search" defaultValue={filters.q} className="w-56" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category">Catégorie</Label>
          <select
            id="category"
            name="category"
            defaultValue={filters.category}
            className={SELECT_CLASS}
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c || "Sans catégorie"}
              </option>
            ))}
          </select>
        </div>
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
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      <p role="status" className="text-muted-foreground text-sm">
        {shown.length} question{shown.length > 1 ? "s" : ""} affichée{shown.length > 1 ? "s" : ""}.
      </p>

      {all.length === 0 ? (
        <EmptyState
          title="Pas encore de question"
          description="Écris la première ici, ou importe une banque exportée de Moodle au format XML."
          actions={[
            { label: "Écrire une question", href: "/questions/new" },
            { label: "Importer une banque", href: "/questions/import" },
          ]}
        />
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">Aucune question ne correspond à ces filtres.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((q) => (
            <li key={q.id}>
              <Link
                href={`/questions/${q.id}`}
                className="hover:bg-accent focus-visible:ring-ring block rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{q.name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                    <Badge variant="outline">
                      {Number(q.default_points)} pt{Number(q.default_points) > 1 ? "s" : ""}
                    </Badge>
                    {q.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
                  </div>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">{q.statement}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {q.category || "Sans catégorie"}
                  {q.tags.length ? ` · ${q.tags.join(", ")}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
