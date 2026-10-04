"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

import {
  associateForExpectation,
  searchLibraryForExpectation,
  unlinkFromExpectation,
  type LibraryPage,
} from "@/app/(app)/modules/[id]/matching/actions";
import { Pill } from "@/components/dashboard/pill";
import { MatchingForm } from "@/components/modules/matching-form";
import { KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KIND_LABELS, RESOURCE_KINDS } from "@/lib/resources/kind";
import { SEARCH_FIELD_LABELS } from "@/lib/resources/search";

const SELECT_CLASS = "border-input h-11 rounded-md border bg-transparent px-3 text-sm";

/**
 * « Chercher dans la bibliothèque » : retrouver une ressource que la correspondance par mots n'a pas
 * proposée et l'associer à CET attendu. La recherche (et le contenu) reste côté serveur.
 */
export function LibrarySearch({
  moduleId,
  expectationId,
  linkedIds,
  categories,
}: {
  moduleId: string;
  expectationId: string;
  linkedIds: string[];
  categories: string[];
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<LibraryPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const searched = useRef(0);

  const active = q.trim().length >= 2 || kind !== "" || category !== "";

  useEffect(() => {
    if (!active) return;
    const run = ++searched.current;
    const timer = setTimeout(() => {
      setLoading(true);
      searchLibraryForExpectation(moduleId, expectationId, { q, kind, category, page })
        .then((r) => {
          if (run !== searched.current) return;
          setResult(r);
          setFailed(false);
        })
        .catch(() => {
          if (run === searched.current) setFailed(true);
        })
        .finally(() => {
          if (run === searched.current) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [moduleId, expectationId, q, kind, category, page, active, linkedIds.length]);

  const shown = active ? result : null;
  const linked = new Set(linkedIds);
  const status = !active
    ? "Tape au moins 2 caractères ou choisis un filtre."
    : failed
      ? "La recherche n’a pas abouti. Réessaie."
      : loading && !shown
        ? "Recherche…"
        : shown
          ? `${shown.total} ressource${shown.total > 1 ? "s" : ""} trouvée${shown.total > 1 ? "s" : ""}${shown.total ? ` · page ${shown.page} sur ${shown.pageCount}` : ""}.`
          : "";

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="font-heading text-base font-bold">Chercher dans la bibliothèque</h4>
      <p className="text-muted-foreground text-sm">
        Une ressource que tu connais n’est pas proposée ? Cherche-la dans toute la bibliothèque
        (titre, tags, matière, description, contenu).
      </p>
      <div
        role="search"
        aria-label="Chercher dans la bibliothèque"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor={`${id}-q`}>Chercher dans la bibliothèque…</Label>
          <Input
            id={`${id}-q`}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-kind`}>Type</Label>
          <select
            id={`${id}-kind`}
            className={SELECT_CLASS}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous</option>
            {RESOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        {categories.length ? (
          <div className="space-y-1">
            <Label htmlFor={`${id}-category`}>Matière</Label>
            <select
              id={`${id}-category`}
              className={SELECT_CLASS}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
        {status}
      </p>
      {shown && shown.hits.length ? (
        <ul className="flex flex-col gap-2.5" aria-label="Résultats de la recherche">
          {shown.hits.map((h) => {
            const isLinked = linked.has(h.id);
            return (
              <li key={h.id} className="bg-muted/40 space-y-2 rounded-xl p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/resources/${h.id}`}
                        className="font-bold underline-offset-2 hover:underline"
                      >
                        {h.title}
                      </Link>
                      <KindBadge kind={h.kind} />
                      <Pill>{h.wholeCourse ? "Cours complet" : "Brique"}</Pill>
                      <StatusBadge status={h.status} />
                    </div>
                    {h.tags.length ? (
                      <p className="text-muted-foreground text-xs">Tags : {h.tags.join(" · ")}</p>
                    ) : null}
                    {h.excerpt ? (
                      <p className="text-muted-foreground text-xs">
                        {SEARCH_FIELD_LABELS[h.excerpt.field]} : {h.excerpt.before}
                        <mark className="bg-yellow-200 text-black">{h.excerpt.match}</mark>
                        {h.excerpt.after}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-sm">
                      {h.alsoFor.length
                        ? `Déjà rapprochée de : ${h.alsoFor.join(", ")}.`
                        : "Déjà rapprochée : aucun autre attendu."}
                    </p>
                  </div>
                  {isLinked ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="ok">Associée</Pill>
                      <MatchingForm
                        action={unlinkFromExpectation.bind(null, moduleId, expectationId, h.id)}
                        label="Retirer"
                        pendingLabel="Retrait…"
                        variant="ghost"
                        ariaLabel={`Retirer ${h.title} (recherche)`}
                      />
                    </div>
                  ) : (
                    <MatchingForm
                      action={associateForExpectation.bind(null, moduleId, expectationId, h.id)}
                      label="Associer à cet attendu"
                      pendingLabel="Association…"
                      ariaLabel={`Associer ${h.title} à cet attendu (recherche)`}
                    />
                  )}
                </div>
                <Link
                  href={`/modules/${moduleId}/matching?e=${expectationId}&r=${h.id}`}
                  scroll={false}
                  className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
                >
                  Aperçu sans quitter l’écran
                  <span className="sr-only"> : {h.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {shown && shown.pageCount > 1 ? (
        <nav aria-label="Pages de résultats" className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={shown.page <= 1 || loading}
            onClick={() => setPage(shown.page - 1)}
          >
            Page précédente
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={shown.page >= shown.pageCount || loading}
            onClick={() => setPage(shown.page + 1)}
          >
            Page suivante
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
