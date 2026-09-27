import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AudienceBadge, KindBadge } from "@/components/resources/resource-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { readResourceFilters, type ResourceGrouping } from "@/lib/resources/filters";
import {
  AUDIENCE_LABELS,
  groupByCategory,
  groupByKind,
  KIND_LABELS,
  RESOURCE_KINDS,
  UNCLASSIFIED_LABEL,
  type ResourceGroup,
} from "@/lib/resources/kind";
import { listResources, resourceFacets, type ResourceWithUsage } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Ressources" };

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

const GROUPINGS: Record<ResourceGrouping, string> = {
  kind: "Par type",
  category: "Par matière",
  none: "Sans regroupement",
};

function ResourceCard({ r }: { r: ResourceWithUsage }) {
  return (
    <Link
      href={`/resources/${r.id}`}
      className="hover:bg-accent focus-visible:ring-ring block h-full rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{r.title}</h3>
        {r.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
      </div>
      {r.description ? (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{r.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1">
        <KindBadge kind={r.kind} />
        <AudienceBadge audience={r.audience} />
        {r.category ? <Badge variant="secondary">{r.category}</Badge> : null}
        {r.tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 text-xs">
        {r.moduleCount === 0
          ? "Pas encore utilisée"
          : `Utilisée dans ${r.moduleCount} module${r.moduleCount > 1 ? "s" : ""}`}
      </p>
    </Link>
  );
}

function CardGrid({ items }: { items: ResourceWithUsage[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <li key={r.id}>
          <ResourceCard r={r} />
        </li>
      ))}
    </ul>
  );
}

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const { filters, group } = readResourceFilters(await searchParams);

  const [resources, facets] = await Promise.all([listResources(filters), resourceFacets()]);
  const groups: ResourceGroup<ResourceWithUsage>[] | null =
    group === "kind"
      ? groupByKind(resources)
      : group === "category"
        ? groupByCategory(resources)
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ressources</h1>
          <p className="text-muted-foreground">Supports réutilisables dans plusieurs modules.</p>
        </div>
        <Button asChild>
          <Link href="/resources/new">
            <Plus aria-hidden />
            Nouvelle ressource
          </Link>
        </Button>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Filtrer les ressources"
      >
        <div className="space-y-1">
          <Label htmlFor="q">Recherche</Label>
          <Input id="q" name="q" defaultValue={filters.q} placeholder="Titre, description…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="kind">Type</Label>
          <select id="kind" name="kind" defaultValue={filters.kind ?? ""} className={SELECT_CLASS}>
            <option value="">Tous</option>
            {RESOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
            <option value="none">{UNCLASSIFIED_LABEL}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="category">Matière</Label>
          <select
            id="category"
            name="category"
            defaultValue={filters.category ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Toutes</option>
            {facets.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audience">Visibilité</Label>
          <select
            id="audience"
            name="audience"
            defaultValue={filters.audience ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Toutes</option>
            <option value="students">{AUDIENCE_LABELS.students}</option>
            <option value="teacher">{AUDIENCE_LABELS.teacher}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tag">Tag</Label>
          <select id="tag" name="tag" defaultValue={filters.tag ?? ""} className={SELECT_CLASS}>
            <option value="">Tous</option>
            {facets.tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="group">Regrouper</Label>
          <select id="group" name="group" defaultValue={group} className={SELECT_CLASS}>
            {Object.entries(GROUPINGS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={filters.archived} />
          Archivées
        </label>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      <p className="text-muted-foreground text-sm" role="status">
        {resources.length} ressource{resources.length > 1 ? "s" : ""}
      </p>

      {resources.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucune ressource</EmptyTitle>
            <EmptyDescription>
              Aucune ressource ne correspond à ces filtres, ou aucune n’a encore été créée.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/resources/new">Nouvelle ressource</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : groups ? (
        <div className="space-y-8">
          {groups.map((g, i) => (
            <section key={g.key} aria-labelledby={`group-${i}`} className="space-y-3">
              <h2 id={`group-${i}`} className="flex items-baseline gap-2 text-lg font-medium">
                {g.label}
                <span className="text-muted-foreground text-sm font-normal">
                  ({g.items.length})
                </span>
              </h2>
              <CardGrid items={g.items} />
            </section>
          ))}
        </div>
      ) : (
        <CardGrid items={resources} />
      )}
    </div>
  );
}
