import type { Metadata } from "next";
import Link from "next/link";
import { Archive, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { type ModuleFilter, parseModuleFilter, splitModules } from "@/lib/modules/archive-filter";
import { listModules, type ModuleWithSchool } from "@/lib/modules/queries";
import { cn } from "@/lib/utils";
import { requiredNotes } from "@/lib/ynov/notation";
import { trameStatus } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Modules" };

const TRAME_BADGE: Record<
  string,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  sent: { label: "Progression envoyée", variant: "secondary" },
  overdue: { label: "Progression en retard", variant: "destructive" },
  urgent: { label: "Progression — J-7", variant: "destructive" },
  warning: { label: "Progression — J-15", variant: "outline" },
  ok: { label: "Progression OK", variant: "outline" },
  unknown: { label: "1re séance à renseigner", variant: "outline" },
};

const FILTER_HREF: Record<ModuleFilter, string> = {
  active: "/modules",
  archived: "/modules?filter=archived",
  all: "/modules?filter=all",
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

export default async function ModulesPage({ searchParams }: PageProps<"/modules">) {
  const filter = parseModuleFilter(await searchParams);
  const { active, archived } = splitModules(await listModules({ includeArchived: true }));

  const tabs: { value: ModuleFilter; label: string }[] = [
    { value: "active", label: `Actifs (${active.length})` },
    { value: "archived", label: `Archivés (${archived.length})` },
    { value: "all", label: `Tous (${active.length + archived.length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Modules</h1>
          <p className="text-muted-foreground">
            Tous vos modules, toutes écoles et toutes années confondues.
          </p>
        </div>
        <Button asChild>
          <Link href="/modules/new">
            <Plus aria-hidden />
            Nouveau module
          </Link>
        </Button>
      </div>

      <nav aria-label="Filtrer les modules">
        <ul className="bg-muted inline-flex flex-wrap gap-1 rounded-lg p-1">
          {tabs.map((t) => (
            <li key={t.value}>
              <Link
                href={FILTER_HREF[t.value]}
                aria-current={filter === t.value ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring block rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                  filter === t.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {filter === "active" ? (
        active.length > 0 ? (
          <ModuleGrid modules={active} />
        ) : archived.length > 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Aucun module actif</EmptyTitle>
              <EmptyDescription>
                {plural(archived.length, "module archivé")}. Créez un module pour la nouvelle année
                ou retrouvez vos modules passés.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="flex-row flex-wrap justify-center">
              <Button asChild>
                <Link href="/modules/new">Nouveau module</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={FILTER_HREF.archived}>Voir les archivés</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Aucun module</EmptyTitle>
              <EmptyDescription>Créez votre premier module pour commencer.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/modules/new">Nouveau module</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : filter === "archived" ? (
        archived.length > 0 ? (
          <ModuleGrid modules={archived} />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Aucun module archivé</EmptyTitle>
              <EmptyDescription>
                Archivez un module depuis sa fiche une fois l’année terminée.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : active.length + archived.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun module</EmptyTitle>
            <EmptyDescription>Créez votre premier module pour commencer.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-8">
          {active.length > 0 ? (
            <section aria-labelledby="modules-actifs" className="space-y-3">
              <h2 id="modules-actifs" className="text-lg font-semibold">
                Actifs
              </h2>
              <ModuleGrid modules={active} headingLevel={3} />
            </section>
          ) : null}
          {archived.length > 0 ? (
            <section aria-labelledby="modules-archives" className="space-y-3">
              <h2 id="modules-archives" className="text-lg font-semibold">
                Archivés
              </h2>
              <ModuleGrid modules={archived} headingLevel={3} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ModuleGrid({
  modules,
  headingLevel = 2,
}: {
  modules: ModuleWithSchool[];
  headingLevel?: 2 | 3;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m) => (
        <li key={m.id}>
          <ModuleCard module={m} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

function ModuleCard({
  module: m,
  headingLevel,
}: {
  module: ModuleWithSchool;
  headingLevel: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const meta = (
    <p className="text-muted-foreground text-sm">
      {m.school?.name ?? "École non renseignée"} · {m.level ?? "—"} · {m.year}
    </p>
  );
  const cardClass =
    "hover:bg-accent focus-visible:ring-ring block h-full rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none";

  if (m.archived_at) {
    return (
      <Link href={`/modules/${m.id}`} className={cn(cardClass, "bg-muted border-dashed")}>
        <Heading className="flex items-start gap-2 font-medium">
          <Archive aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          {m.name}
        </Heading>
        {meta}
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge variant="outline">Archivé le {formatDate(m.archived_at)}</Badge>
          <Badge variant="secondary">{m.total_hours} h</Badge>
        </div>
      </Link>
    );
  }

  const notes = requiredNotes(m.total_hours);
  const badge = TRAME_BADGE[trameStatus(m.first_session_date, m.iceberg_state).level];
  return (
    <Link href={`/modules/${m.id}`} className={cardClass}>
      <Heading className="font-medium">{m.name}</Heading>
      {meta}
      <div className="mt-3 flex flex-wrap gap-1">
        <Badge variant="secondary">{m.total_hours} h</Badge>
        <Badge variant="outline">
          {notes.total} note{notes.total > 1 ? "s" : ""} min.
        </Badge>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
    </Link>
  );
}
