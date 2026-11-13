import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { DeleteCommentButton } from "@/components/assessments/delete-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhraseManager } from "@/components/settings/phrase-manager";
import { appPhrasesPreview, PARTS, PART_LABELS } from "@/lib/appreciations/draft";
import { listPhrases } from "@/lib/appreciations/queries";
import { commentTags, listComments } from "@/lib/assessments/queries";

export const metadata: Metadata = { title: "Phrases de commentaire" };

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
  // Une seule page « Phrases » (doublon D8) : correction (banque insérable pendant la correction)
  // ou appréciation (formulations du gabarit, insérables dans l'appréciation).
  const appreciation = sp.type === "appreciation";
  // Retour vers l'appréciation d'une personne (jamais une adresse libre).
  const retour =
    typeof sp.retour === "string" &&
    /^\/modules\/[0-9a-f-]{36}\/appreciations(\/[0-9a-f-]{36})?$/.test(sp.retour)
      ? sp.retour
      : null;

  const tabs = (
    <nav aria-label="Sortes de phrases" className="border-b">
      <ul className="flex flex-wrap gap-x-6">
        {[
          { key: false, label: "Correction", href: "/assessments/comments" },
          {
            key: true,
            label: "Appréciation",
            href: `/assessments/comments?type=appreciation${retour ? `&retour=${encodeURIComponent(retour)}` : ""}`,
          },
        ].map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              aria-current={appreciation === t.key ? "page" : undefined}
              className={`focus-visible:ring-ring inline-flex min-h-11 items-center border-b-[3px] text-sm font-medium focus-visible:ring-2 focus-visible:outline-none ${appreciation === t.key ? "border-primary text-foreground" : "text-muted-foreground hover:text-foreground border-transparent"}`}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  if (appreciation) {
    const phrases = await listPhrases();
    const appPhrases = appPhrasesPreview();
    return (
      <div className="space-y-6">
        {retour ? (
          <Link href={retour} className="text-sm underline underline-offset-2">
            ← Revenir à l’appréciation
          </Link>
        ) : null}
        <div>
          <h1>Phrases de commentaire</h1>
          <p className="text-muted-foreground">
            Tes formulations d’appréciation, par partie : elles passent avant celles de l’appli et
            s’insèrent dans l’appréciation.
          </p>
        </div>
        {tabs}
        <PhraseManager phrases={phrases} />
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            Les formulations de l’appli (en lecture), par partie
          </summary>
          <p className="text-muted-foreground mt-1 text-xs">
            Les tiennes passent avant. L’appli varie aussi le début de phrase (« Pendant les
            séances, », « Pour aller plus loin, »…).
          </p>
          {PARTS.map((part) => (
            <div key={part} className="mt-2">
              <h2 className="text-sm font-semibold">{PART_LABELS[part]}</h2>
              <ul className="text-muted-foreground list-disc pl-5">
                {appPhrases[part].map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      </div>
    );
  }

  const [comments, tags] = await Promise.all([listComments({ q, category, tag }), commentTags()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Phrases de commentaire</h1>
          <p className="text-muted-foreground">
            Phrases de correction, par critère : elles s’insèrent pendant la correction.
          </p>
        </div>
        <Button asChild>
          <Link href="/assessments/comments/new">
            <Plus aria-hidden />
            Nouvelle phrase
          </Link>
        </Button>
      </div>

      {tabs}

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
            className="border-input bg-field h-8 rounded-lg border px-2.5 text-sm"
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
            className="border-input bg-field h-8 rounded-lg border px-2.5 text-sm"
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
        <EmptyState
          title="Aucun commentaire"
          description="Crée-en pour gagner du temps lors des corrections."
          actions={[{ label: "Nouvelle phrase", href: "/assessments/comments/new" }]}
        />
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm">{c.text}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="secondary">{CATEGORY_LABELS[c.category]}</Badge>
                  {c.criterion_label ? (
                    <Badge variant="outline">Critère : {c.criterion_label}</Badge>
                  ) : null}
                  {c.subject ? <Badge variant="outline">Matière : {c.subject}</Badge> : null}
                  {c.use_count > 0 ? (
                    <Badge variant="outline">Utilisée {c.use_count} fois</Badge>
                  ) : null}
                  {c.tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost">
                  <Link href={`/assessments/comments/${c.id}/edit`}>
                    <Pencil aria-hidden />
                    Modifier
                    <span className="sr-only"> la phrase</span>
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
