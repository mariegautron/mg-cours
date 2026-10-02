import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AudienceBadge, KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addResourceToModule } from "@/app/(app)/modules/[id]/retained/actions";
import { createDraftResource } from "@/app/(app)/resources/actions";
import { AddToModule } from "@/components/resources/add-to-module";
import { listActiveModules } from "@/lib/modules/queries";
import { readResourceFilters, type ResourceGrouping } from "@/lib/resources/filters";
import {
  AUDIENCE_LABELS,
  groupByCategory,
  groupByKind,
  KIND_LABELS,
  RESOURCE_KINDS,
  RESOURCE_STATUSES,
  STATUS_LABELS,
  UNCLASSIFIED_LABEL,
  type ResourceGroup,
} from "@/lib/resources/kind";
import { SEARCH_FIELD_LABELS } from "@/lib/resources/search";
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
      {r.excerpt ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {SEARCH_FIELD_LABELS[r.excerpt.field]} : {r.excerpt.before}
          <mark className="bg-yellow-200 text-black">{r.excerpt.match}</mark>
          {r.excerpt.after}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1">
        <KindBadge kind={r.kind} />
        <AudienceBadge audience={r.audience} />
        <StatusBadge status={r.status} />
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

function CardGrid({
  items,
  modules,
}: {
  items: ResourceWithUsage[];
  modules: { id: string; name: string; year: number }[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <li key={r.id}>
          <ResourceCard r={r} />
          <div className="mt-2">
            <AddToModule
              resourceId={r.id}
              modules={modules}
              action={addResourceToModule.bind(null, r.id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const { filters, group } = readResourceFilters(await searchParams);

  const [resources, facets, modules] = await Promise.all([
    listResources(filters),
    resourceFacets(),
    listActiveModules(),
  ]);
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
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/questions">Questions</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/assessments/grids">Grilles</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/assessments/comments">Phrases</Link>
          </Button>
          <Button asChild>
            <Link href="/resources/new">
              <Plus aria-hidden />
              Nouvelle ressource
            </Link>
          </Button>
        </div>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        role="search"
        aria-label="Filtrer les ressources"
      >
        <div className="space-y-1">
          <Label htmlFor="q">Recherche</Label>
          <Input id="q" name="q" defaultValue={filters.q} placeholder="Titre, tag, contenu…" />
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
          <Label htmlFor="status">Statut</Label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Tous</option>
            {RESOURCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
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

      <form
        action={createDraftResource}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
        aria-label="Création rapide"
      >
        <div className="space-y-1">
          <Label htmlFor="draft-title">Ressource à construire</Label>
          <Input id="draft-title" name="title" required maxLength={200} placeholder="Titre" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="draft-note">Note d’intention</Label>
          <Input
            id="draft-note"
            name="intentNote"
            maxLength={2000}
            placeholder="Ex. Un TP pour pratiquer les tests d’accessibilité"
            className="w-80 max-w-full"
          />
        </div>
        <Button type="submit" variant="secondary">
          Noter à construire
        </Button>
      </form>

      <p className="text-muted-foreground text-sm" role="status">
        {resources.length} ressource{resources.length > 1 ? "s" : ""}
      </p>

      {resources.length === 0 ? (
        <EmptyState
          title="Aucune ressource"
          description="Rien ne correspond à ces filtres, ou ta bibliothèque est encore vide. Crée une ressource ou importe un export Notion, Word ou Markdown."
          actions={[{ label: "Créer une ressource", href: "/resources/new" }]}
        />
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
              <CardGrid items={g.items} modules={modules} />
            </section>
          ))}
        </div>
      ) : (
        <CardGrid items={resources} modules={modules} />
      )}
    </div>
  );
}
