import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

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
import { listResources, resourceFacets } from "@/lib/resources/queries";

export const metadata: Metadata = { title: "Ressources" };

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";
  const archived = sp.archived === "1";

  const [resources, facets] = await Promise.all([
    listResources({ q, category, tag, archived }),
    resourceFacets(),
  ]);

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

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="space-y-1">
          <Label htmlFor="q">Recherche</Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Titre, description…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category">Catégorie</Label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
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
          <Label htmlFor="tag">Tag</Label>
          <select
            id="tag"
            name="tag"
            defaultValue={tag}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Tous</option>
            {facets.tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={archived} />
          Archivées
        </label>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {resources.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucune ressource</EmptyTitle>
            <EmptyDescription>
              Créez une ressource, puis réutilisez-la dans autant de modules que nécessaire.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/resources/new">Nouvelle ressource</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <li key={r.id}>
              <Link
                href={`/resources/${r.id}`}
                className="hover:bg-accent focus-visible:ring-ring block h-full rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{r.title}</h2>
                  {r.archived_at ? <Badge variant="outline">Archivée</Badge> : null}
                </div>
                {r.description ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{r.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
