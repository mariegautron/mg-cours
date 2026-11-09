"use client";

import { useEffect, useId, useState } from "react";

import { findLibraryResources } from "@/app/(app)/resources/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Found = { id: string; title: string; ready: boolean };

/** Recherche en direct dans toute la bibliothèque ; chaque résultat a un bouton d'action. */
export function LibrarySearch({
  label,
  actionLabel,
  onPick,
  exclude = [],
}: {
  label: string;
  /** Libellé du bouton de chaque résultat (« Ajouter », « Copier »). */
  actionLabel: string;
  onPick: (found: Found) => Promise<void> | void;
  exclude?: string[];
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const found = await findLibraryResources(q);
      if (!stale) setResults(found);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const shown = query.trim().length < 2 ? null : results?.filter((r) => !exclude.includes(r.id));
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-q`}>{label}</Label>
      <Input
        id={`${id}-q`}
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Titre, tag, contenu…"
      />
      {shown ? (
        shown.length === 0 ? (
          <p role="status" className="text-muted-foreground text-sm">
            Rien pour « {query.trim()} ».
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2" role="list">
            {shown.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">
                  {r.title}
                  {r.ready ? null : <span className="text-muted-foreground"> · à construire</span>}
                </span>
                <button
                  type="button"
                  disabled={busy !== null}
                  aria-busy={busy === r.id || undefined}
                  onClick={async () => {
                    setBusy(r.id);
                    try {
                      await onPick(r);
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className="hover:bg-accent focus-visible:ring-ring min-h-11 shrink-0 rounded-xl border px-3 font-semibold focus-visible:ring-2 focus-visible:outline-none"
                >
                  {busy === r.id ? "…" : actionLabel}
                  <span className="sr-only"> : {r.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
