import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addResourceToModule } from "@/app/(app)/modules/[id]/retained/actions";
import { createDraftResource } from "@/app/(app)/resources/actions";
import { AddToModule } from "@/components/resources/add-to-module";
import {
  familyCounts,
  FAMILIES,
  FAMILY_LABELS,
  FAMILY_LINKS,
  inFamily,
} from "@/lib/resources/family";
import { readResourceFilters, type ResourceGrouping } from "@/lib/resources/filters";
import {
  AUDIENCE_LABELS,
  groupByCategory,
  groupByKind,
  KIND_LABELS,
  RESOURCE_KINDS,
  STATUS_LABELS,
  UNCLASSIFIED_LABEL,
  type ResourceGroup,
} from "@/lib/resources/kind";
import { SEARCH_FIELD_LABELS } from "@/lib/resources/search";
import { listResources, resourceFacets, type ResourceWithUsage } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Bibliothèque" };

/** Taille d'une page : « Afficher plus » en ajoute autant, rien n'est jamais masqué. */
const PAGE_SIZE = 50;

const SELECT_CLASS = "border-input h-9 rounded-md border bg-transparent px-3 text-sm";

const GROUPINGS: Record<ResourceGrouping, string> = {
  none: "Sans regroupement",
  kind: "Par type",
  category: "Par matière",
};

function ResourceRow({ r }: { r: ResourceWithUsage }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Link
        href={`/resources/${r.id}`}
        className="focus-visible:ring-ring min-w-0 flex-1 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        <strong className="block">{r.title}</strong>
        <span className="text-muted-foreground block text-sm">
          {[
            r.category,
            r.moduleCount === 0
              ? "Pas encore utilisée"
              : `Utilisée dans ${r.moduleCount} module${r.moduleCount > 1 ? "s" : ""}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {r.excerpt ? (
          <span className="text-muted-foreground block text-xs">
            {SEARCH_FIELD_LABELS[r.excerpt.field]} : {r.excerpt.before}
            <mark className="bg-yellow-200 text-black">{r.excerpt.match}</mark>
            {r.excerpt.after}
          </span>
        ) : null}
      </Link>
      <span className="flex flex-wrap items-center gap-1.5">
        {r.archived_at ? <Pill>Archivée</Pill> : null}
        {r.audience === "teacher" ? <Pill tone="lock">Toi seule</Pill> : null}
        {r.tags.slice(0, 2).map((t) => (
          <Pill key={t}>{t}</Pill>
        ))}
        <Pill>{r.kind ? KIND_LABELS[r.kind] : "Type à définir"}</Pill>
        <Pill tone={r.status === "ready" ? "ok" : "warn"}>
          {r.status === "ready" ? "Prête" : STATUS_LABELS[r.status]}
        </Pill>
      </span>
      <AddToModule resourceId={r.id} action={addResourceToModule.bind(null, r.id)} />
    </li>
  );
}

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const sp = await searchParams;
  const { filters, group } = readResourceFilters(sp);

  const [listed, facets] = await Promise.all([listResources(filters), resourceFacets()]);
  const counts = familyCounts(listed);
  const resources = inFamily(listed, filters.family);
  // Les onglets gardent les autres filtres de l'URL.
  const familyHref = (family?: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k !== "family" && typeof v === "string" && v) params.set(k, v);
    }
    if (family) params.set("family", family);
    const qs = params.toString();
    return qs ? `/resources?${qs}` : "/resources";
  };
  const pageCount = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const shown = resources.slice(0, pageCount * PAGE_SIZE);
  const groups: ResourceGroup<ResourceWithUsage>[] | null =
    group === "kind" ? groupByKind(shown) : group === "category" ? groupByCategory(shown) : null;

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k !== "page" && typeof v === "string" && v) params.set(k, v);
    }
    params.set("page", String(page));
    return `/resources?${params.toString()}`;
  };
  const ready = resources.filter((r) => r.status === "ready").length;
  const toBuild = resources.length - ready;
  const statusHref = (status?: string) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k !== "status" && typeof v === "string" && v) params.set(k, v);
    }
    if (status) params.set("status", status);
    const qs = params.toString();
    return qs ? `/resources?${qs}` : "/resources";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Bibliothèque</h1>
          <p className="text-muted-foreground">
            Ce que tu enseignes, rangé par nature. Chaque chose garde avec elle ce qui va avec.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="touch">
            <Link href="/resources/new#import">Importer</Link>
          </Button>
          <Button asChild size="touch">
            <Link href="/resources/new">
              <Plus aria-hidden />
              Créer
            </Link>
          </Button>
        </div>
      </div>

      <nav aria-label="Familles de la bibliothèque" className="border-b">
        <ul className="flex flex-wrap gap-x-6">
          {[undefined, ...FAMILIES].map((f) => {
            const active = filters.family === f;
            return (
              <li key={f ?? "all"}>
                <Link
                  href={familyHref(f)}
                  aria-current={active ? "page" : undefined}
                  className={`focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 border-b-[3px] text-[0.95rem] font-semibold focus-visible:ring-2 focus-visible:outline-none ${active ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent"}`}
                >
                  {f ? FAMILY_LABELS[f] : "Toutes"}
                  {f ? <span className="text-xs opacity-80">({counts[f]})</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
        {filters.family && FAMILY_LINKS[filters.family].length ? (
          <p className="text-muted-foreground py-2 text-sm">
            Rattaché à cette famille :{" "}
            {FAMILY_LINKS[filters.family].map((l, i) => (
              <span key={l.href}>
                {i > 0 ? ", " : ""}
                <Link href={l.href} className="underline underline-offset-2">
                  {l.label}
                </Link>
              </span>
            ))}
            .
          </p>
        ) : null}
      </nav>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 text-sm">
        Aussi dans la bibliothèque :
        {[
          { label: "Questions", href: "/questions" },
          { label: "Grilles", href: "/assessments/grids" },
          { label: "Phrases", href: "/assessments/comments" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            {l.label}
          </Link>
        ))}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-card rounded-xl border px-4 py-2">
          <span className="text-muted-foreground text-sm">
            {filters.family ? FAMILY_LABELS[filters.family] : "Toutes les ressources"}
          </span>
          <strong className="font-heading block text-2xl">{resources.length}</strong>
        </div>
        <p className="text-muted-foreground text-sm">
          Cours {counts.courses} · Ateliers {counts.workshops} · Évaluations {counts.assessments} ·
          QCM {counts.quizzes}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Statut">
        {[
          { label: `Toutes · ${resources.length}`, status: undefined },
          { label: `Prêtes · ${ready}`, status: "ready" },
          { label: `À construire · ${toBuild}`, status: "progress" },
        ].map((c) => {
          const active = (filters.status ?? undefined) === c.status;
          return (
            <Link
              key={c.label}
              href={statusHref(c.status)}
              aria-current={active ? "true" : undefined}
              className={`focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl border-[1.5px] px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${active ? "bg-primary text-primary-foreground border-transparent" : "bg-muted/40"}`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <form className="space-y-3" role="search" aria-label="Filtrer les ressources">
        {filters.family ? <input type="hidden" name="family" value={filters.family} /> : null}
        {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-1">
            <Label htmlFor="q">Recherche</Label>
            <Input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Chercher : titre, tag, contenu…"
            />
          </div>
          <Button type="submit" variant="secondary" size="touch">
            Filtrer
          </Button>
        </div>
        <details>
          <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer items-center rounded-sm text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
            Plus de filtres
          </summary>
          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="kind">Type</Label>
              <select
                id="kind"
                name="kind"
                defaultValue={filters.kind ?? ""}
                className={SELECT_CLASS}
              >
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
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="archived" value="1" defaultChecked={filters.archived} />
              Archivées
            </label>
          </div>
        </details>
      </form>

      <form
        action={createDraftResource}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed p-3"
        aria-label="Création rapide"
      >
        <div className="max-w-full min-w-0 space-y-1">
          <Label htmlFor="draft-title">Ressource à construire</Label>
          <Input id="draft-title" name="title" required maxLength={200} placeholder="Titre" />
        </div>
        <div className="max-w-full min-w-0 space-y-1">
          <Label htmlFor="draft-note">Note d’intention</Label>
          <Input
            id="draft-note"
            name="intentNote"
            maxLength={2000}
            placeholder="Ex. Un TP pour pratiquer les tests d’accessibilité"
            className="w-80 max-w-full"
          />
        </div>
        <Button type="submit" variant="secondary" size="touch">
          Noter à construire
        </Button>
      </form>

      <p className="text-muted-foreground text-sm" role="status">
        {resources.length} ressource{resources.length > 1 ? "s" : ""}
      </p>

      {resources.length === 0 ? (
        <EmptyState
          title={
            Object.keys(sp).length ? "Aucune ressource ne correspond" : "Ta bibliothèque est vide"
          }
          description={
            Object.keys(sp).length
              ? "Enlève un filtre pour en voir plus."
              : "Crée une ressource ou importe un export Notion, Word ou Markdown."
          }
          actions={
            Object.keys(sp).length
              ? [{ label: "Effacer les filtres", href: "/resources" }]
              : [{ label: "Créer une ressource", href: "/resources/new" }]
          }
        />
      ) : groups ? (
        <div className="space-y-6">
          {groups.map((g, i) => (
            <section
              key={g.key}
              aria-labelledby={`group-${i}`}
              className="bg-card rounded-xl border p-5"
            >
              <h2 id={`group-${i}`} className="flex items-baseline gap-2 text-lg font-semibold">
                {g.label}
                <span className="text-muted-foreground text-sm font-normal">
                  ({g.items.length})
                </span>
              </h2>
              <ul className="divide-y">
                {g.items.map((r) => (
                  <ResourceRow key={r.id} r={r} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <section aria-label="Liste" className="bg-card rounded-xl border p-5">
          <ul className="divide-y">
            {shown.map((r) => (
              <ResourceRow key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
      {resources.length > PAGE_SIZE ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground text-sm" role="status">
            {shown.length} sur {resources.length}
          </p>
          {shown.length < resources.length ? (
            <Button asChild variant="secondary" size="touch">
              <Link href={pageHref(pageCount + 1)} scroll={false}>
                Afficher plus
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
