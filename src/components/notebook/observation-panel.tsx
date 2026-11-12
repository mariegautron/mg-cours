"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

import { ActionError } from "@/components/action-error";
import {
  deleteObservationById,
  type NotebookState,
} from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { StudentPhoto } from "@/components/students/student-photo";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ObservationItem } from "@/components/notebook/observation-item";
import { GroupObservationPanel } from "@/components/notebook/group-observation-panel";
import type { CourseObservation, GroupObservationRow } from "@/lib/notebook/queries";
import {
  clampActive,
  findStudents,
  moveActive,
  observationAddedMessage,
  tagForKeyEvent,
} from "@/lib/notebook/live";
import { CHOOSABLE_OBSERVATION_TAGS, type ObservationTag } from "@/lib/notebook/notebook";
import { cn } from "@/lib/utils";

type Action = (state: NotebookState, formData: FormData) => Promise<NotebookState>;

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_path: string | null;
}

/**
 * Observations en direct, au clavier : on tape le début d'un nom, ↑ ↓ choisissent, Entrée ouvre la
 * personne ; dans le formulaire, un mot facultatif, 1 à 5 (ou Alt + 1 à 5 dans le champ) choisissent
 * l'étiquette, Entrée enregistre (« Autre » sans choix), Échap annule et rend le focus à la liste.
 * Un appui sur une étiquette enregistre aussi. « Liste » par défaut, « Photos » en grille.
 */
export interface StudentStat {
  /** Observations de tout le module. */
  total: number;
  /** Observations prises pendant cette séance. */
  today: number;
  group: string | null;
}

export function ObservationPanel({
  action,
  students,
  stats,
  defaultView = "list",
  recent,
  groupAction,
  groupList,
  groupRecent,
}: {
  action: Action;
  students: Student[];
  /** Notes et groupe de chaque étudiant·e : active les filtres et les compteurs du trombinoscope. */
  stats?: Record<string, StudentStat>;
  defaultView?: "list" | "grid";
  /** Observations déjà prises pendant cette séance (liste repliable, avec correction). */
  recent?: CourseObservation[];
  /** Observation sur un groupe entier : une ligne par groupe au-dessus de la liste des personnes. */
  groupAction?: Action;
  groupList?: { id: string; name: string; count: number }[];
  groupRecent?: GroupObservationRow[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">(defaultView);
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<ObservationTag | null>(null);
  const [lastSaved, setLastSaved] = useState<number | undefined>(undefined);
  const [toastOn, setToastOn] = useState(false);
  const [undone, setUndone] = useState<string | null>(null);
  // Retour immédiat : le message s'affiche au clic, sans attendre le serveur.
  const [optimistic, setOptimistic] = useState<{
    studentId: string;
    name: string;
    tag: ObservationTag;
    note: string;
  } | null>(null);
  const [retry, setRetry] = useState<{ studentId: string; note: string } | null>(null);
  const [seenState, setSeenState] = useState(state);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [noteLength, setNoteLength] = useState(0);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const filterId = useId();

  const [filter, setFilter] = useState<string>("all");
  const groupNames = stats
    ? [...new Set(Object.values(stats).flatMap((x) => (x.group ? [x.group] : [])))].sort((a, b) =>
        a.localeCompare(b, "fr"),
      )
    : [];
  const withoutNote = students.filter((s) => !stats?.[s.id]?.total).length;
  const visible = findStudents(students, query).filter((s) => {
    if (filter === "all" || !stats) return true;
    if (filter === "none") return !stats[s.id]?.total;
    return stats[s.id]?.group === filter;
  });
  const current = clampActive(active, visible.length);

  // Après un enregistrement réussi : on referme et on rend le focus au nom de l'étudiant·e.
  if (state.savedAt && state.savedAt !== lastSaved) {
    setLastSaved(state.savedAt);
    setOptimistic(null);
    setRetry(null);
    setToastOn(true);
    setOpenId(null);
    setSelectedTag(null);
  }
  // Échec : on le dit, on retire le message « Notée… » et on rouvre la saisie avec le texte gardé.
  if (seenState !== state) {
    setSeenState(state);
    if (state.error && optimistic) {
      setRetry({ studentId: optimistic.studentId, note: optimistic.note });
      setOpenId(optimistic.studentId);
      setOptimistic(null);
      setToastOn(false);
    }
  }
  useEffect(() => {
    if (!toastOn) return;
    const timer = window.setTimeout(() => setToastOn(false), 8000);
    return () => window.clearTimeout(timer);
  }, [toastOn, lastSaved]);
  const closedAfterSave = useRef<string | null>(null);
  useEffect(() => {
    if (openId) {
      closedAfterSave.current = openId;
      // Sans faire défiler la page : seul le panneau des étudiant·es défile pour montrer le formulaire.
      noteRef.current?.focus({ preventScroll: true });
      const form = noteRef.current?.form;
      const panel = form?.closest<HTMLElement>("[data-scroll-panel]");
      if (form && panel) {
        // Seul le panneau défile (jamais la page) : on amène le formulaire dans sa zone visible.
        const f = form.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        if (f.bottom > p.bottom) panel.scrollTop += f.bottom - p.bottom;
        else if (f.top < p.top) panel.scrollTop -= p.top - f.top;
      } else {
        form?.scrollIntoView({ block: "nearest" });
      }
    } else if (closedAfterSave.current) {
      triggerRefs.current.get(closedAfterSave.current)?.focus();
      closedAfterSave.current = null;
    }
  }, [openId]);

  const open = (id: string) => {
    setSelectedTag(null);
    setNoteLength(0);
    setOpenId(id);
  };
  const close = () => setOpenId(null);

  const onFilterKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && visible[current]) {
      e.preventDefault();
      open(visible[current].id);
      return;
    }
    const next = moveActive(current, e.key, visible.length);
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  };

  const onTriggerKey = (e: React.KeyboardEvent, index: number) => {
    const next = moveActive(index, e.key, visible.length);
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    triggerRefs.current.get(visible[next].id)?.focus();
  };

  const renderForm = (s: Student) => {
    const name = `${s.first_name} ${s.last_name}`;
    const panelId = `observe-${s.id}`;
    return (
      <form
        id={panelId}
        action={formAction}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
          }
          const typing =
            e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
          const tag = tagForKeyEvent(e);
          // 1 à 5 : l'étiquette. Dans le champ de note, tant qu'il est vide (ou avec Alt) : on ne
          // gêne pas la frappe d'un chiffre dans une note déjà commencée.
          const emptyNote =
            typing &&
            (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
            e.target.value === "";
          if (tag && !e.ctrlKey && !e.metaKey && (!typing || e.altKey || emptyNote)) {
            e.preventDefault();
            setSelectedTag(tag);
          }
        }}
        className="bg-muted/40 space-y-3 p-3"
      >
        <input type="hidden" name="studentId" value={s.id} />
        <input type="hidden" name="tagDefault" value={selectedTag ?? "other"} />
        <div className="space-y-1">
          <Label htmlFor={`${panelId}-note`}>Observation (facultatif)</Label>
          <Textarea
            id={`${panelId}-note`}
            ref={noteRef}
            name="note"
            maxLength={1000}
            rows={2}
            defaultValue={retry?.studentId === s.id ? retry.note : undefined}
            autoComplete="off"
            aria-describedby={`${panelId}-keys`}
            onChange={(e) => {
              setNoteLength(e.target.value.length);
              // Le champ s'agrandit avec le texte (remarques longues « Faits / Mon avis / À challenger »).
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 320)}px`;
            }}
            className="resize-y"
          />
          <p id={`${panelId}-keys`} className="text-muted-foreground text-xs">
            Un clic sur une étiquette enregistre.
            {noteLength >= 800 ? (
              <span className={noteLength >= 1000 ? "text-destructive ml-2 font-semibold" : "ml-2"}>
                {noteLength} / 1000 caractères
              </span>
            ) : null}
          </p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Étiquette pour {name}</legend>
          <div className="@container">
            <div className="grid grid-cols-1 gap-1.5 @md:grid-cols-2">
              {CHOOSABLE_OBSERVATION_TAGS.map((t) => (
                <PendingButton
                  key={t.value}
                  type="submit"
                  name="tag"
                  value={t.value}
                  variant={selectedTag === t.value ? "default" : "secondary"}
                  aria-pressed={selectedTag === t.value}
                  pendingLabel="Notée"
                  disabled={pending}
                  onClick={() => {
                    setUndone(null);
                    setOptimistic({
                      studentId: s.id,
                      name,
                      tag: t.value,
                      note: noteRef.current?.value ?? "",
                    });
                    setToastOn(true);
                    // On referme tout de suite, après le départ du formulaire.
                    window.setTimeout(() => setOpenId(null), 50);
                  }}
                  size="touch"
                  title={t.label}
                  aria-label={t.label}
                  className="w-full justify-start px-2 [&>span]:w-full [&>span]:justify-items-start"
                >
                  {t.label}
                </PendingButton>
              ))}
            </div>
          </div>
        </fieldset>
        <Button type="button" variant="ghost" size="touch" onClick={close}>
          Fermer
        </Button>
      </form>
    );
  };

  const triggerFor = (s: Student, index: number) => {
    const name = `${s.first_name} ${s.last_name}`;
    const isOpen = openId === s.id;
    return (
      <button
        type="button"
        ref={(el) => {
          if (el) triggerRefs.current.set(s.id, el);
          else triggerRefs.current.delete(s.id);
        }}
        aria-expanded={isOpen}
        aria-controls={`observe-${s.id}`}
        data-active={index === current ? "true" : undefined}
        onClick={() => (isOpen ? close() : open(s.id))}
        onFocus={() => setActive(index)}
        onKeyDown={(e) => onTriggerKey(e, index)}
        className={cn(
          "hover:bg-muted focus-visible:ring-ring flex min-h-12 w-full items-center gap-2 px-3 text-left focus-visible:ring-2 focus-visible:outline-none",
          index === current && "bg-muted/60",
          view === "grid" && "min-h-0 flex-col gap-1 rounded-lg border p-3 text-center",
        )}
      >
        <StudentPhoto student={s} size={view === "grid" ? "md" : "sm"} />
        <span className="font-medium">{name}</span>
        {stats?.[s.id] ? (
          <span className="text-muted-foreground flex flex-col text-xs">
            <span>
              {[
                stats[s.id].group,
                stats[s.id].total
                  ? `${stats[s.id].total} observation${stats[s.id].total > 1 ? "s" : ""}`
                  : "aucune observation",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {stats[s.id].today ? (
              <span className="text-mint font-semibold">+{stats[s.id].today} aujourd’hui</span>
            ) : null}
          </span>
        ) : null}
        <span className="sr-only"> : ajouter une observation</span>
      </button>
    );
  };

  const openStudent = students.find((s) => s.id === openId) ?? null;
  const selectedName = visible[current]
    ? `${visible[current].first_name} ${visible[current].last_name}`
    : null;

  return (
    <div className="space-y-3">
      {groupAction && groupList ? (
        <GroupObservationPanel action={groupAction} groups={groupList} recent={[]} />
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor={filterId}>Filtrer par nom</Label>
          <Input
            id={filterId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onFilterKey}
            autoComplete="off"
            aria-describedby={`${filterId}-count`}
          />
        </div>
        <div role="group" aria-label="Affichage" className="flex gap-1">
          <Button
            type="button"
            size="touch"
            variant={view === "list" ? "default" : "secondary"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List aria-hidden />
            Liste
          </Button>
          <Button
            type="button"
            size="touch"
            variant={view === "grid" ? "default" : "secondary"}
            aria-pressed={view === "grid"}
            onClick={() => setView("grid")}
          >
            <LayoutGrid aria-hidden />
            Photos
          </Button>
        </div>
      </div>
      {stats ? (
        <div role="group" aria-label="Filtrer" className="flex flex-wrap gap-1">
          {[
            { key: "all", label: `Tous · ${students.length}` },
            { key: "none", label: `Sans observation · ${withoutNote}` },
            ...groupNames.map((g) => ({ key: g, label: g })),
          ].map((f) => (
            <Button
              key={f.key}
              type="button"
              size="touch"
              variant={filter === f.key ? "default" : "secondary"}
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                setActive(0);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      ) : null}
      <p id={`${filterId}-count`} className="text-muted-foreground text-xs" aria-live="polite">
        {visible.length} étudiant·e{visible.length > 1 ? "s" : ""}
        {selectedName ? ` · sélection : ${selectedName}` : ""}
      </p>

      {/* Confirmation en surimpression : elle ne décale jamais la liste sous le curseur. */}
      <div
        className={
          toastOn && (optimistic || state.message)
            ? "bg-card fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg"
            : "sr-only"
        }
      >
        <p role="status">
          {optimistic
            ? observationAddedMessage(optimistic.name, optimistic.tag)
            : undone && undone === state.observationId
              ? "Observation annulée."
              : (state.message ?? "")}
        </p>
        {toastOn && (optimistic || (state.observationId && undone !== state.observationId)) ? (
          <Button
            type="button"
            size="touch"
            variant="outline"
            disabled={!!optimistic && pending}
            onClick={async () => {
              const id = state.observationId;
              if (!id) return;
              await deleteObservationById(id);
              setUndone(id);
              setOptimistic(null);
            }}
          >
            Annuler
          </Button>
        ) : null}
      </div>
      {state.error ? <ActionError error={state.error} /> : null}

      {students.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun·e étudiant·e : ajoute d’abord des membres aux groupes du module.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Personne ne porte ce nom. Essaie le début du prénom ou du nom.
        </p>
      ) : view === "list" ? (
        <ul className="divide-y rounded-lg border">
          {visible.map((s, i) => (
            <li key={s.id}>
              {triggerFor(s, i)}
              {openId === s.id ? renderForm(s) : null}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((s, i) => (
              <li key={s.id}>{triggerFor(s, i)}</li>
            ))}
          </ul>
          {openStudent && visible.some((s) => s.id === openStudent.id) ? (
            <div className="rounded-lg border">{renderForm(openStudent)}</div>
          ) : null}
        </>
      )}
      {recent ? (
        <details className="rounded-lg border">
          <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-medium">
            Notées pendant cette séance ({recent.length + (groupRecent?.length ?? 0)})
          </summary>
          {recent.length === 0 && !groupRecent?.length ? (
            <p className="text-muted-foreground px-3 pb-3 text-sm">Rien pour l’instant.</p>
          ) : (
            <ul className="divide-y text-sm">
              {/* Observations de groupe : au même endroit, marquées « Groupe … », modifiables. */}
              {(groupRecent ?? []).map((o) => (
                <li key={`g-${o.id}`} className="p-3">
                  <ObservationItem
                    id={o.id}
                    scope="group"
                    studentId={o.student_group_id}
                    tag={o.tag}
                    note={o.note}
                    heading={
                      <span className="font-medium">
                        Groupe {groupList?.find((g) => g.id === o.student_group_id)?.name ?? "—"}
                      </span>
                    }
                  />
                </li>
              ))}
              {recent.map((o) => (
                <li key={o.id} className="p-3">
                  <ObservationItem
                    id={o.id}
                    studentId={o.student?.id ?? ""}
                    tag={o.tag}
                    note={o.note}
                    students={students}
                    heading={
                      <span className="font-medium">
                        {o.student ? `${o.student.first_name} ${o.student.last_name}` : "—"}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </details>
      ) : null}
    </div>
  );
}
