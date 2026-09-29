"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import type { NotebookState } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { StudentPhoto } from "@/components/students/student-photo";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notebookStudents, OBSERVATION_TAGS } from "@/lib/notebook/notebook";

type Action = (state: NotebookState, formData: FormData) => Promise<NotebookState>;

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  photo_path: string | null;
}

/**
 * Observations en direct : liste filtrable des étudiant·es du module ; un appui ouvre un petit
 * formulaire (texte facultatif, puis une étiquette = un bouton qui enregistre).
 */
export function ObservationPanel({ action, students }: { action: Action; students: Student[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  // Étiquette pressée : seule elle affiche l'attente, les autres attendent la fin de l'envoi.
  const [pressedTag, setPressedTag] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | undefined>(undefined);
  const firstTagRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>());
  const filterId = useId();

  const visible = notebookStudents([{ members: students }], query);

  // Après un enregistrement réussi : on referme et on rend le focus au nom de l'étudiant·e.
  if (state.savedAt && state.savedAt !== lastSaved) {
    setLastSaved(state.savedAt);
    setOpenId(null);
  }
  const closedAfterSave = useRef<string | null>(null);
  useEffect(() => {
    if (openId) {
      closedAfterSave.current = openId;
      firstTagRef.current?.focus();
    } else if (closedAfterSave.current) {
      triggerRefs.current.get(closedAfterSave.current)?.focus();
      closedAfterSave.current = null;
    }
  }, [openId]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={filterId}>Filtrer par nom</Label>
        <Input
          id={filterId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-describedby={`${filterId}-count`}
        />
        <p id={`${filterId}-count`} className="text-muted-foreground text-xs" aria-live="polite">
          {visible.length} étudiant·e{visible.length > 1 ? "s" : ""}
        </p>
      </div>

      <p role="status" className="min-h-5 text-sm font-medium">
        {state.message ?? ""}
      </p>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      {students.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun·e étudiant·e : ajoutez d’abord des membres aux groupes du module.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {visible.map((s) => {
            const name = `${s.first_name} ${s.last_name}`;
            const open = openId === s.id;
            const panelId = `observe-${s.id}`;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) triggerRefs.current.set(s.id, el);
                    else triggerRefs.current.delete(s.id);
                  }}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-12 w-full items-center gap-2 px-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                >
                  <StudentPhoto student={s} size="sm" />
                  <span className="font-medium">{name}</span>
                  <span className="sr-only"> : ajouter une observation</span>
                </button>
                {open ? (
                  <form id={panelId} action={formAction} className="bg-muted/40 space-y-3 p-3">
                    <input type="hidden" name="studentId" value={s.id} />
                    <div className="space-y-1">
                      <Label htmlFor={`${panelId}-note`}>Note (facultatif)</Label>
                      <Textarea id={`${panelId}-note`} name="note" rows={2} maxLength={1000} />
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium">
                        Étiquette — un appui enregistre l’observation pour {name}
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {OBSERVATION_TAGS.map((t, i) => (
                          <PendingButton
                            key={t.value}
                            ref={i === 0 ? firstTagRef : undefined}
                            type="submit"
                            name="tag"
                            value={t.value}
                            variant="secondary"
                            pending={pending && pressedTag === t.value}
                            pendingLabel="Enregistrement…"
                            disabled={pending && pressedTag !== t.value}
                            onClick={() => setPressedTag(t.value)}
                            className="min-h-11"
                          >
                            {t.label}
                          </PendingButton>
                        ))}
                      </div>
                    </fieldset>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
