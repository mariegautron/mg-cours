"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { LayoutGrid, List } from "lucide-react";

import { ActionError } from "@/components/action-error";
import type { NotebookState } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { StudentPhoto } from "@/components/students/student-photo";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clampActive, findStudents, moveActive, tagForKey } from "@/lib/notebook/live";
import { OBSERVATION_TAGS, type ObservationTag } from "@/lib/notebook/notebook";
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
}: {
  action: Action;
  students: Student[];
  /** Notes et groupe de chaque étudiant·e : active les filtres et les compteurs du trombinoscope. */
  stats?: Record<string, StudentStat>;
  defaultView?: "list" | "grid";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">(defaultView);
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<ObservationTag | null>(null);
  // Étiquette pressée : seule elle affiche l'attente, les autres attendent la fin de l'envoi.
  const [pressedTag, setPressedTag] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | undefined>(undefined);
  const noteRef = useRef<HTMLInputElement>(null);
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
    setOpenId(null);
    setSelectedTag(null);
  }
  const closedAfterSave = useRef<string | null>(null);
  useEffect(() => {
    if (openId) {
      closedAfterSave.current = openId;
      noteRef.current?.focus();
    } else if (closedAfterSave.current) {
      triggerRefs.current.get(closedAfterSave.current)?.focus();
      closedAfterSave.current = null;
    }
  }, [openId]);

  const open = (id: string) => {
    setSelectedTag(null);
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
          const typing = e.target instanceof HTMLInputElement;
          const tag = tagForKey(e.key);
          // 1 à 5 : l'étiquette ; dans le champ de saisie, avec Alt pour ne pas gêner la frappe.
          if (tag && (!typing || e.altKey)) {
            e.preventDefault();
            setSelectedTag(tag);
          }
        }}
        className="bg-muted/40 space-y-3 p-3"
      >
        <input type="hidden" name="studentId" value={s.id} />
        <input type="hidden" name="tagDefault" value={selectedTag ?? "other"} />
        <div className="space-y-1">
          <Label htmlFor={`${panelId}-note`}>Note (facultatif)</Label>
          <Input
            id={`${panelId}-note`}
            ref={noteRef}
            name="note"
            maxLength={1000}
            autoComplete="off"
            aria-describedby={`${panelId}-keys`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <p id={`${panelId}-keys`} className="text-muted-foreground text-xs">
            Entrée enregistre (étiquette «{" "}
            {OBSERVATION_TAGS.find((t) => t.value === (selectedTag ?? "other"))?.label} »), Échap
            annule. 1 à 5, ou Alt + 1 à 5 ici, choisissent l’étiquette.
          </p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Étiquette — un appui enregistre l’observation pour {name}
          </legend>
          <div className="flex flex-wrap gap-2">
            {OBSERVATION_TAGS.map((t, i) => (
              <PendingButton
                key={t.value}
                type="submit"
                name="tag"
                value={t.value}
                variant={selectedTag === t.value ? "default" : "secondary"}
                aria-pressed={selectedTag === t.value}
                pending={pending && pressedTag === t.value}
                pendingLabel="Enregistrement…"
                disabled={pending && pressedTag !== t.value}
                onClick={() => setPressedTag(t.value)}
                size="touch"
              >
                <kbd aria-hidden className="mr-1 text-xs opacity-70">
                  {i + 1}
                </kbd>
                {t.label}
              </PendingButton>
            ))}
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
                  ? `${stats[s.id].total} note${stats[s.id].total > 1 ? "s" : ""}`
                  : "aucune note",
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
            { key: "none", label: `Sans note · ${withoutNote}` },
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
        {selectedName ? ` · sélection : ${selectedName} (Entrée pour noter, ↑ ↓ pour changer)` : ""}
      </p>

      <p role="status" className="min-h-5 text-sm font-medium">
        {state.message ?? ""}
      </p>
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
    </div>
  );
}
