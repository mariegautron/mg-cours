"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Presentation } from "lucide-react";

import { recordProjection } from "@/app/(present)/present/modules/[id]/courses/[courseId]/presenter/actions";
import {
  addSessionNote,
  type SessionNoteState,
} from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { Markdown } from "@/components/markdown";

import type { PresentSlide } from "@/components/present/present-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findJumps,
  jumpEntries,
  previewIndex,
  searchLibrary,
  sectionStarts,
  type LibraryResource,
} from "@/lib/present/presenter";
import {
  clampIndex,
  clockInParis,
  minutesInParis,
  parseSyncMessage,
  remainingLabel,
} from "@/lib/present/sync";

export interface TeacherResource {
  id: string;
  title: string;
  kindLabel: string | null;
  /** Ressource pas encore prête : jamais projetée. */
  toBuild: boolean;
  /** Texte Markdown, dépliable dans la vue privée (jamais projeté). */
  content: string | null;
}

function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 10_000);
  return () => window.clearInterval(timer);
}
const minuteSnapshot = () => String(minutesInParis());
const serverSnapshot = () => "";

/**
 * US-64 : vue présentatrice, dans une seconde fenêtre. Elle suit la fenêtre projetée (même
 * origine, BroadcastChannel) et la pilote : diapositive courante et suivante, notes de séance,
 * ressources « Enseignante uniquement » (corrigés), heure et temps restant.
 * Rien de ce qui est affiché ici ne part vers la fenêtre projetée : seuls des indices circulent.
 */
export function PresenterView({
  title,
  backHref,
  slides,
  syncChannel,
  projectedHref,
  notes,
  teacherResources,
  endTime,
  sections,
  sectionKeys,
  library,
  moduleId,
  courseId,
  sessionNotes,
  projectionName,
}: {
  title: string;
  backHref: string;
  slides: PresentSlide[];
  syncChannel: string;
  projectedHref: string;
  notes: { label: string; text: string }[];
  teacherResources: TeacherResource[];
  /** Heure de fin (`HH:MM`) pour le temps restant, seulement le jour de la séance. */
  endTime: string | null;
  /** Déroulé : titres des sections, dans l'ordre des diapositives. */
  sections: string[];
  /** Clé stable de chaque section (même ordre), pour le journal de projection. */
  sectionKeys: string[];
  /** Ressources de la bibliothèque, pour en projeter une à l'improviste. */
  library: LibraryResource[];
  moduleId: string;
  courseId: string;
  /** Notes de séance déjà enregistrées (une ligne datée par note). */
  sessionNotes: string;
  /** Nom de la fenêtre projetée, pour la retrouver. */
  projectionName: string;
}) {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [privateIndex, setPrivateIndex] = useState<number | null>(null);
  const [jumpQuery, setJumpQuery] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [openAnswers, setOpenAnswers] = useState<Set<string>>(new Set());
  const [projectedNote, setProjectedNote] = useState("");
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const [noteState, noteAction, notePending] = useActionState<SessionNoteState, FormData>(
    addSessionNote.bind(null, moduleId, courseId),
    {},
  );
  const notes_ = noteState.notes ?? sessionNotes;
  const starts = useMemo(
    () =>
      sectionStarts(
        slides.map((s) => s.section),
        sections.length,
      ),
    [slides, sections.length],
  );
  const entries = useMemo(() => jumpEntries(sections, starts, slides), [sections, starts, slides]);
  const jumps = findJumps(jumpQuery, entries, total);
  const found = searchLibrary(libraryQuery, library);
  const minutes = useSyncExternalStore(subscribeMinute, minuteSnapshot, serverSnapshot);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(syncChannel);
    bc.onmessage = (event) => {
      const message = parseSyncMessage(event.data);
      if (message?.type === "state") setIndex(clampIndex(message.index, total));
    };
    // Reprendre là où en est la fenêtre projetée, si elle est ouverte.
    bc.postMessage({ type: "hello" });
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- canal ouvert après montage */
    setChannel(bc);
    return () => bc.close();
  }, [syncChannel, total]);

  const go = useCallback(
    (next: number) => {
      const target = clampIndex(next, total);
      setIndex(target);
      setPrivateIndex(null);
      channel?.postMessage({ type: "go", index: target });
    },
    [channel, total],
  );

  // Journal de projection (US-136) : chaque changement de section à l'écran de la classe est
  // enregistré, sans jamais bloquer ni retarder la projection (erreurs ignorées).
  const lastRecorded = useRef<string | null>(null);
  useEffect(() => {
    const section = slides[index]?.section;
    const key = section === undefined ? null : (sectionKeys[section] ?? null);
    if (!key || key === lastRecorded.current) return;
    lastRecorded.current = key;
    void recordProjection({ courseId, sectionKey: key, resourceId: null, kind: "projected" }).catch(
      () => {},
    );
  }, [index, slides, sectionKeys, courseId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        return;
      }
      // Espace sur un bouton ou un lien l'active : il ne doit pas aussi changer de diapositive.
      if (
        e.key === " " &&
        e.target instanceof HTMLElement &&
        /^(BUTTON|A)$/.test(e.target.tagName)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (["arrowright", "pagedown", " "].includes(key)) go(index + 1);
      else if (["arrowleft", "pageup"].includes(key)) go(index - 1);
      else if (key === "home") go(0);
      else if (key === "end") go(total - 1);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  const shownIndex = previewIndex(index, privateIndex);
  const isPrivate = privateIndex !== null && privateIndex !== index;
  const current = slides[shownIndex];
  const next = slides[shownIndex + 1];

  const openProjection = (href: string) => {
    window.open(href, projectionName);
  };
  const toggleAnswer = (id: string) =>
    setOpenAnswers((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  const clock = minutes ? clockInParis() : "";
  const remaining = minutes ? remainingLabel(Number(minutes), endTime) : null;

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <Button asChild variant="ghost" size="touch">
          <Link href={backHref}>Quitter la vue présentatrice</Link>
        </Button>
        <h1 className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">
          Vue présentatrice · {title}
        </h1>
        <Button asChild variant="ghost" size="touch">
          <a
            href={projectedHref}
            target={projectionName}
            onClick={(e) => {
              // Même fenêtre à chaque fois : on peut y projeter une ressource à l'improviste.
              e.preventDefault();
              openProjection(projectedHref);
            }}
          >
            <Presentation aria-hidden />
            Ouvrir la fenêtre projetée
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </Button>
        <div className="text-right tabular-nums">
          <p className="text-2xl leading-none font-semibold" aria-label="Heure à Paris">
            {clock}
          </p>
          {remaining ? <p className="text-muted-foreground text-sm">{remaining}</p> : null}
        </div>
      </header>

      <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section aria-labelledby="pv-current" className="space-y-2">
            <h2 id="pv-current" className="text-sm font-medium">
              Diapositive {total ? shownIndex + 1 : 0} sur {total}
              {current?.label ? ` : ${current.label}` : ""}
            </h2>
            {isPrivate ? (
              <p
                role="status"
                className="bg-muted flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-2 text-sm"
              >
                <span>
                  <strong>Pour toi seule</strong> : cette diapositive n’est pas projetée (la classe
                  voit la diapositive {index + 1}).
                </span>
                <Button
                  type="button"
                  size="touch"
                  variant="secondary"
                  onClick={() => setPrivateIndex(null)}
                >
                  Revenir à la diapositive projetée
                </Button>
              </p>
            ) : null}
            <div className="max-h-[55vh] overflow-auto rounded-lg border p-4">
              <div style={{ zoom: 0.5 }}>{current?.node}</div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="touch-lg"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft aria-hidden />
              Précédente
            </Button>
            <Button
              type="button"
              size="touch-lg"
              disabled={index >= total - 1}
              onClick={() => go(index + 1)}
            >
              Suivante
              <ChevronRight aria-hidden />
            </Button>
            <p aria-live="polite" className="text-muted-foreground text-sm">
              Affichée à l’écran : diapositive {index + 1}
            </p>
          </div>

          <section aria-labelledby="pv-jump" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-jump" className="font-medium">
              Aller directement à
            </h2>
            <div className="space-y-1">
              <Label htmlFor="pv-jump-input">Un titre ou un numéro de diapositive</Label>
              <Input
                id="pv-jump-input"
                type="search"
                autoComplete="off"
                value={jumpQuery}
                onChange={(e) => setJumpQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && jumps[0]) {
                    e.preventDefault();
                    go(jumps[0].index);
                    setJumpQuery("");
                  }
                }}
                placeholder="Objectifs, 7…"
              />
            </div>
            <div aria-live="polite" className="text-sm">
              {jumpQuery.trim() && jumps.length === 0 ? (
                <p className="text-muted-foreground">Rien ne porte ce titre dans le déroulé.</p>
              ) : null}
              {jumps.length ? (
                <ul className="flex flex-wrap gap-2">
                  {jumps.map((j) => (
                    <li key={`${j.kind}-${j.index}`}>
                      <Button
                        type="button"
                        size="touch"
                        variant="outline"
                        onClick={() => {
                          go(j.index);
                          setJumpQuery("");
                        }}
                      >
                        {j.label}
                        <span className="text-muted-foreground font-normal">
                          · diapo {j.index + 1}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="pv-flow" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-flow" className="font-medium">
              Déroulé de la séance
            </h2>
            <ol className="divide-y">
              {sections.map((title, i) =>
                starts[i] < 0 ? null : (
                  <li
                    key={i}
                    aria-current={slides[index]?.section === i ? "step" : undefined}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="min-w-0 flex-1 font-medium">
                      {title}
                      {slides[index]?.section === i ? (
                        <Badge variant="secondary" className="ml-2">
                          Projeté
                        </Badge>
                      ) : null}
                    </span>
                    <span className="flex gap-2">
                      <Button type="button" size="touch" onClick={() => go(starts[i])}>
                        Projeter<span className="sr-only"> : {title}</span>
                      </Button>
                      <Button
                        type="button"
                        size="touch"
                        variant="secondary"
                        onClick={() => {
                          setPrivateIndex(starts[i]);
                          void recordProjection({
                            courseId,
                            sectionKey: sectionKeys[i] ?? null,
                            resourceId: null,
                            kind: "private",
                          }).catch(() => {});
                        }}
                      >
                        Pour moi<span className="sr-only"> : {title}</span>
                      </Button>
                    </span>
                  </li>
                ),
              )}
            </ol>
            <p className="text-muted-foreground text-xs">
              « Projeter » change l’écran de la classe. « Pour moi » ne change que cette vue.
            </p>
          </section>

          <section aria-labelledby="pv-next" className="space-y-2">
            <h2 id="pv-next" className="text-sm font-medium">
              {next ? `Ensuite${next.label ? ` : ${next.label}` : ""}` : "Dernière diapositive"}
            </h2>
            {next ? (
              <div className="max-h-40 overflow-hidden rounded-lg border p-3 opacity-80">
                <div style={{ zoom: 0.3 }}>{next.node}</div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          <section aria-labelledby="pv-notes" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-notes" className="font-medium">
              Préparation de la séance
            </h2>
            {notes.length ? (
              <dl className="space-y-3 text-sm">
                {notes.map((n) => (
                  <div key={n.label}>
                    <dt className="text-muted-foreground font-medium">{n.label}</dt>
                    <dd className="whitespace-pre-wrap">{n.text}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune note pour cette séance.</p>
            )}
          </section>

          <section aria-labelledby="pv-mynotes" className="space-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="pv-mynotes" className="font-medium">
                Mes notes de séance
              </h2>
              <Badge variant="outline">Pour moi</Badge>
            </div>
            {notes_.trim() ? (
              <ul className="space-y-1 text-sm">
                {notes_
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune note pour l’instant.</p>
            )}
            <form action={noteAction} className="space-y-2" key={noteState.savedAt ?? "new"}>
              <div className="space-y-1">
                <Label htmlFor="pv-note">Ajouter une note</Label>
                <Input
                  id="pv-note"
                  name="note"
                  autoComplete="off"
                  placeholder="Ex. : revoir l’estimation avec le groupe 3"
                />
              </div>
              <Button type="submit" size="touch" variant="secondary" disabled={notePending}>
                {notePending ? "Enregistrement…" : "Enregistrer la note"}
              </Button>
              <p role="status" className="text-sm">
                {noteState.error ? (
                  <span className="text-destructive">{noteState.error}</span>
                ) : (
                  noteState.message
                )}
              </p>
            </form>
            <p className="text-muted-foreground text-xs">
              Les notes sont datées, retrouvées dans la clôture de la séance et jamais projetées.
            </p>
          </section>

          <section aria-labelledby="pv-teacher" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-teacher" className="font-medium">
              Enseignante uniquement
            </h2>
            {teacherResources.length ? (
              <ul className="space-y-2 text-sm">
                {teacherResources.map((r) => {
                  const open = openAnswers.has(r.id);
                  return (
                    <li key={r.id} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/resources/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                        >
                          {r.title}
                          <ExternalLink aria-hidden className="size-3.5" />
                          <span className="sr-only"> (nouvel onglet)</span>
                        </a>
                        {r.kindLabel ? <Badge variant="secondary">{r.kindLabel}</Badge> : null}
                        {r.toBuild ? <Badge variant="outline">À construire</Badge> : null}
                        <Badge variant="outline">Jamais projeté</Badge>
                      </div>
                      <Button
                        type="button"
                        size="touch"
                        variant="secondary"
                        aria-expanded={open}
                        aria-controls={`pv-answer-${r.id}`}
                        onClick={() => toggleAnswer(r.id)}
                      >
                        {open ? "Masquer le corrigé" : "Afficher le corrigé"}
                        <span className="sr-only"> : {r.title}</span>
                      </Button>
                      {open ? (
                        <div id={`pv-answer-${r.id}`} className="bg-muted/50 rounded-lg border p-3">
                          {r.content?.trim() ? (
                            <Markdown source={r.content} headingLevel={3} />
                          ) : (
                            <p className="text-muted-foreground">
                              Cette ressource n’a pas de texte : ouvre-la dans un nouvel onglet.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Aucun corrigé ni support réservé pour cette séance.
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Ces ressources ne sont jamais projetées.
            </p>
          </section>

          <section aria-labelledby="pv-lib" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-lib" className="font-medium">
              Une question sur autre chose ?
            </h2>
            <div className="space-y-1">
              <Label htmlFor="pv-lib-input">Chercher une ressource</Label>
              <Input
                id="pv-lib-input"
                type="search"
                autoComplete="off"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Estimation…"
              />
            </div>
            <div aria-live="polite" className="text-sm">
              {libraryQuery.trim().length >= 2 && found.length === 0 ? (
                <p className="text-muted-foreground">Aucune ressource ne porte ce titre.</p>
              ) : null}
              {projectedNote ? <p>{projectedNote}</p> : null}
            </div>
            {found.length ? (
              <ul className="divide-y text-sm">
                {found.map((r) => (
                  <li key={r.id} className="space-y-1 py-2">
                    <p className="font-medium">
                      {r.title}
                      {r.kindLabel ? (
                        <Badge variant="secondary" className="ml-2">
                          {r.kindLabel}
                        </Badge>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="touch" variant="secondary">
                        <a href={`/resources/${r.id}`} target="_blank" rel="noreferrer">
                          Pour moi<span className="sr-only"> : {r.title} (nouvel onglet)</span>
                        </a>
                      </Button>
                      {r.projectable ? (
                        <Button
                          type="button"
                          size="touch"
                          onClick={() => {
                            openProjection(`/present/resources/${r.id}`);
                            void recordProjection({
                              courseId,
                              sectionKey: null,
                              resourceId: r.id,
                              kind: "projected",
                            }).catch(() => {});
                            setProjectedNote(
                              `« ${r.title} » est projetée. Pour revenir au déroulé, ouvre la fenêtre projetée.`,
                            );
                          }}
                        >
                          Projeter<span className="sr-only"> : {r.title}</span>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Pas projetable : réservée à toi ou pas prête.
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-muted-foreground text-xs">
              « Pour moi » l’ouvre chez toi. « Projeter » remplace l’écran de la classe jusqu’à ce
              que tu rouvres le déroulé.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
