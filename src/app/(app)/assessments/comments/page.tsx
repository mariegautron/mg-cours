import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DeleteCommentButton } from "@/components/assessments/delete-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commentTags, listComments } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Commentaires prédéfinis" };

const CATEGORY_LABELS: Record<string, string> = {
  positive: "Positif",
  negative: "Négatif",
  advice: "Conseil",
};

export default async function CommentsPage({ searchParams }: PageProps<"/assessments/comments">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const tag = typeof sp.tag === "string" ? sp.tag : "";

  const [comments, tags] = await Promise.all([listComments({ q, category, tag }), commentTags()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Commentaires prédéfinis</h1>
          <p className="text-muted-foreground">Bibliothèque réutilisable pour les appréciations.</p>
        </div>
        <Button asChild>
          <Link href="/assessments/comments/new">
            <Plus aria-hidden />
            Nouveau commentaire
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="space-y-1">
          <Label htmlFor="q">Recherche</Label>
          <Input id="q" name="q" defaultValue={q} />
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
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
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
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {comments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun commentaire</EmptyTitle>
            <EmptyDescription>Créez-en pour gagner du temps lors des corrections.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/assessments/comments/new">Nouveau commentaire</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm">{c.text}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary">{CATEGORY_LABELS[c.category]}</Badge>
                  {c.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={`/assessments/comments/${c.id}/edit`} aria-label="Modifier">
                    <Pencil aria-hidden />
                  </Link>
                </Button>
                <DeleteCommentButton id={c.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
