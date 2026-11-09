"use client";

import { seeOthers } from "@/lib/plural";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  PenLine,
  GraduationCap,
  Library,
  Search,
} from "lucide-react";
import { Dialog } from "radix-ui";

import {
  GROUP_LIMIT,
  MIN_QUERY_LENGTH,
  normalize,
  type SearchGroup,
  type SearchKind,
} from "@/lib/search/search";

const ICONS: Record<SearchKind, typeof Search> = {
  goto: ArrowRight,
  module: BookMarked,
  course: CalendarDays,
  student: GraduationCap,
  resource: Library,
  question: CircleHelp,
  assessment: ClipboardCheck,
  grid: ClipboardCheck,
  appreciation: PenLine,
  makeup: CalendarDays,
};

const DEBOUNCE_MS = 200;
/** Au-delà, « Toujours en cours… » avec un bouton pour relancer. */
const SLOW_MS = 5000;

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
  const pathname = usePathname();
  const moduleId = /^\/modules\/([0-9a-f-]{36})/.exec(pathname ?? "")?.[1] ?? null;
  const [open, setOpen] = useState(false);
  // Catégories dépliées (« Voir les N autres ») et requête lente.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [slow, setSlow] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  // `settled` : la réponse correspond à la requête affichée (évite « Aucun résultat » prématuré).
  const [settled, setSettled] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = groups.map((g) => ({
    ...g,
    results: expanded.has(g.kind) ? g.results : g.results.slice(0, GROUP_LIMIT),
  }));
  const flat = shown.flatMap((g) => g.results);
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
    // Une requête à la fois : la précédente est annulée, seule la dernière réponse s'affiche.
    const controller = new AbortController();
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      slowTimer = setTimeout(() => setSlow(true), SLOW_MS);
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (moduleId) params.set("module", moduleId);
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { groups: SearchGroup[] };
        if (controller.signal.aborted) return;
        setGroups(data.groups);
        setExpanded(new Set());
        setActive(0);
        setFailed(false);
        setSettled(trimmed);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      } finally {
        clearTimeout(slowTimer);
        if (!controller.signal.aborted) setSlow(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(slowTimer);
      controller.abort();
      setSlow(false);
    };
  }, [trimmed, searchable, moduleId, retry]);

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
        : slow
          ? "Toujours en cours… réessaie"
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
              ? shown.map((g) => (
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
                    {g.total > g.results.length ? (
                      g.moreHref ? (
                        <button
                          type="button"
                          onClick={() => go(g.moreHref!)}
                          className="text-primary hover:bg-accent min-h-11 w-full rounded-lg px-2 text-left text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {seeOthers(g.total - g.results.length)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpanded((prev) => new Set(prev).add(g.kind))}
                          className="text-primary hover:bg-accent min-h-11 w-full rounded-lg px-2 text-left text-sm font-medium underline-offset-2 hover:underline"
                        >
                          {seeOthers(g.total - g.results.length)}
                        </button>
                      )
                    ) : null}
                  </div>
                ))
              : null}
          </div>

          <div role="status" aria-live="polite" className="text-muted-foreground px-4 pb-3 text-sm">
            {!searchable ? (
              <span>Tape au moins {MIN_QUERY_LENGTH} lettres pour chercher.</span>
            ) : showResults && flat.length === 0 ? (
              <span className="flex flex-wrap items-center gap-3">
                <span>
                  Rien pour « {trimmed} ». Vérifie l’orthographe ou cherche un mot plus court.
                </span>
                <button
                  type="button"
                  className="text-foreground focus-visible:ring-ring/50 min-h-11 rounded-md px-3 font-semibold underline underline-offset-2 focus-visible:ring-3"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                >
                  Effacer la recherche
                </button>
              </span>
            ) : slow && !showResults ? (
              <span className="flex flex-wrap items-center gap-3">
                <span>{status}</span>
                <button
                  type="button"
                  className="text-foreground focus-visible:ring-ring/50 min-h-11 rounded-md px-3 font-semibold underline underline-offset-2 focus-visible:ring-3"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Réessayer
                </button>
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
