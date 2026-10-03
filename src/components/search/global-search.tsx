"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, CircleHelp, GraduationCap, Library, Search } from "lucide-react";
import { Dialog } from "radix-ui";

import {
  MIN_QUERY_LENGTH,
  normalize,
  type SearchGroup,
  type SearchKind,
} from "@/lib/search/search";

const ICONS: Record<SearchKind, typeof Search> = {
  module: BookMarked,
  student: GraduationCap,
  resource: Library,
  question: CircleHelp,
};

const DEBOUNCE_MS = 200;

/**
 * Recherche globale (US-117) : champ « Rechercher… » du menu et raccourci Ctrl K / ⌘K. Boîte de
 * dialogue (focus piégé, Échap ferme, focus rendu au déclencheur) avec motif « combobox » :
 * flèches haut/bas, Entrée, résultats annoncés poliment. Aucune animation.
 */
export function GlobalSearch({
  variant = "field",
  hotkey = false,
  className,
}: {
  /** « field » : champ « Rechercher… » ; « icon » : bouton rond (rail, en-tête). */
  variant?: "field" | "icon";
  /** Une seule instance écoute Ctrl K / ⌘K (celle de l'en-tête, toujours montée). */
  hotkey?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  // `settled` : la réponse correspond à la requête affichée (évite « Aucun résultat » prématuré).
  const [settled, setSettled] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const flat = groups.flatMap((g) => g.results);
  const trimmed = query.trim();
  const searchable = normalize(trimmed).length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Ouvre par le déclencheur VISIBLE (menu, rail ou en-tête) : le focus lui revient à la fermeture.
        const visible = Array.from(
          document.querySelectorAll<HTMLElement>("[data-search-trigger]"),
        ).find((el) => el.offsetParent !== null);
        if (visible) visible.click();
        else setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { groups: SearchGroup[] };
        setGroups(data.groups);
        setActive(0);
        setFailed(false);
        setSettled(trimmed);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searchable]);

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setGroups([]);
      setSettled(null);
      setFailed(false);
      setActive(0);
    }
  };

  const go = (href: string) => {
    reset(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[active].href);
    }
  };

  const showResults = searchable && settled === trimmed && !failed;
  const status = !searchable
    ? ""
    : failed
      ? "La recherche n’a pas abouti."
      : showResults
        ? flat.length
          ? `${flat.length} résultat${flat.length > 1 ? "s" : ""}`
          : `Aucun résultat pour « ${trimmed} »`
        : "Recherche en cours…";

  let index = -1;

  return (
    <Dialog.Root open={open} onOpenChange={reset}>
      <Dialog.Trigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            data-search-trigger
            aria-label="Rechercher (raccourci : Ctrl K ou ⌘ K)"
            className={`border-input bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-11 items-center justify-center rounded-lg border focus-visible:ring-2 focus-visible:outline-none ${className ?? ""}`}
          >
            <Search aria-hidden className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            data-search-trigger
            className={`border-input bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none ${className ?? ""}`}
          >
            <Search aria-hidden className="size-4 shrink-0" />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="text-xs" aria-hidden>
              Ctrl K
            </kbd>
            <span className="sr-only">(raccourci : Ctrl K ou ⌘ K)</span>
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="bg-popover text-popover-foreground fixed top-[12vh] left-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border shadow-lg"
        >
          <Dialog.Title className="sr-only">Rechercher</Dialog.Title>
          <div className="border-b p-3">
            <label htmlFor={`${listId}-input`} className="sr-only">
              Rechercher un module, un·e étudiant·e, une ressource ou une question
            </label>
            <input
              id={`${listId}-input`}
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={showResults && flat.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                showResults && flat.length ? `${listId}-opt-${active}` : undefined
              }
              autoComplete="off"
              placeholder="Rechercher…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              className="focus-visible:ring-ring min-h-11 w-full rounded-lg bg-transparent px-2 text-base outline-none focus-visible:ring-2"
            />
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Résultats"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {showResults
              ? groups.map((g) => (
                  <div key={g.kind} role="group" aria-label={g.title}>
                    <p
                      aria-hidden
                      className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium"
                    >
                      {g.title}
                    </p>
                    {g.results.map((r) => {
                      index += 1;
                      const i = index;
                      const Icon = ICONS[r.kind];
                      return (
                        <div
                          key={`${r.kind}-${r.id}`}
                          id={`${listId}-opt-${i}`}
                          role="option"
                          aria-selected={i === active}
                          onMouseMove={() => setActive(i)}
                          onClick={() => go(r.href)}
                          className="aria-selected:bg-accent aria-selected:text-accent-foreground flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2"
                        >
                          <Icon aria-hidden className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{r.label}</span>
                            {r.detail ? (
                              <span className="text-muted-foreground block truncate text-xs">
                                {r.detail}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))
              : null}
          </div>

          <div role="status" aria-live="polite" className="text-muted-foreground px-4 pb-3 text-sm">
            {!searchable ? (
              <span>Tape au moins {MIN_QUERY_LENGTH} lettres pour chercher.</span>
            ) : showResults && flat.length === 0 ? (
              <span>
                Aucun résultat pour « {trimmed} ». Essaie un autre mot, un bout de nom suffit.
              </span>
            ) : (
              <span className={showResults && flat.length ? "sr-only" : undefined}>{status}</span>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
