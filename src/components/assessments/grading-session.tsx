"use client";

import { useCallback, useId, useRef, useState } from "react";

import type { GradeFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { GradeForm, type CopyControls } from "@/components/assessments/grade-form";
import type { MemberOverride } from "@/lib/assessments/attendance";
import { Celebration } from "@/components/celebration";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GridWithCriteria } from "@/lib/assessments/queries";
import {
  correctionProgress,
  neighborId,
  type CopyStatus,
  type ObservationLine,
} from "@/lib/assessments/session";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
import type { Tables } from "@/types/db";

type Action = (state: GradeFormState, formData: FormData) => Promise<GradeFormState>;

export interface SessionItem {
  /** Clé de la copie (identifiant de l'étudiant·e ou du groupe). */
  id: string;
  title: string;
  action: Action;
  grade?: Tables<"grade">;
  observations: ObservationLine[];
  /** Note de groupe : membres et ajustements individuels enregistrés. */
  members?: { id: string; name: string }[];
  memberOverrides?: Record<string, MemberOverride>;
  /** Thème du projet fil rouge du groupe (US-89). */
  theme?: string | null;
}

export interface SessionSection {
  id: string;
  /** Titre de section (groupe) ; `null` : pas de titre. */
  title: string | null;
  /** Texte affiché quand la section n'a aucune copie. */
  empty?: string;
  items: SessionItem[];
}

/**
 * Correction d'une évaluation sur une page : toutes les copies, avancement « 12/30 corrigées »,
 * enregistrement automatique par copie, « Enregistrer tout », avertissement avant de quitter, navigation
 * d'une copie à l'autre et vue « un critère pour toute la classe ».
 */
export function GradingSession({
  sections,
  grid,
  maxScore,
  comments,
  autoValidatedIds,
  subject,
  activeId,
  onActivate,
}: {
  sections: SessionSection[];
  grid: GridWithCriteria | null;
  maxScore: number;
  comments: Tables<"predefined_comment">[];
  autoValidatedIds: string[];
  subject: string | null;
  /**
   * Oral (US-92) : une seule copie visible, celle du groupe qui passe. Les autres restent montées
   * (masquées), donc leur saisie, l'enregistrement automatique et la garde anti-perte continuent.
   */
  activeId?: string;
  /** Appelé quand la navigation (liste des copies, précédente / suivante) choisit une autre copie. */
  onActivate?: (id: string) => void;
}) {
  const uid = useId();
  const items = sections.flatMap((s) => s.items);
  const ids = items.map((i) => i.id);
  const [status, setStatus] = useState<Record<string, CopyStatus>>({});
  const controls = useRef(new Map<string, CopyControls>());
  const [view, setView] = useState<"copy" | "criterion">("copy");
  const criteria = grid?.criteria ?? [];
  const [criterionId, setCriterionId] = useState(criteria[0]?.id ?? "");

  const onStatus = useCallback((id: string, next: CopyStatus) => {
    setStatus((prev) => {
      const current = prev[id];
      if (current && current.corrected === next.corrected && current.dirty === next.dirty) {
        return prev;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const register = useCallback((id: string, copy: CopyControls | null) => {
    if (copy) controls.current.set(id, copy);
    else controls.current.delete(id);
  }, []);

  const progress = correctionProgress(
    items.map(
      (i) => status[i.id] ?? { corrected: (i.grade?.value ?? null) !== null, dirty: false },
    ),
  );
  useUnsavedChangesGuard(progress.dirty > 0);
  // Jalon : toutes les copies corrigées et enregistrées. On ne fête que le passage de « il en reste »
  // à « tout est corrigé » pendant cette visite, pas une évaluation déjà terminée à l'ouverture.
  const complete = progress.total > 0 && progress.done === progress.total && progress.dirty === 0;
  const [wasIncomplete, setWasIncomplete] = useState(!complete);
  if (!complete && !wasIncomplete) setWasIncomplete(true);
  const celebrate = complete && wasIncomplete;

  function saveAll() {
    for (const copy of controls.current.values()) {
      if (copy.isDirty()) copy.save();
    }
  }

  function focusCopy(id: string) {
    const focus = () => {
      const heading = document.getElementById(`copy-${id}-title`);
      heading?.scrollIntoView({ block: "start" });
      heading?.focus();
    };
    if (onActivate) {
      onActivate(id);
      // La copie choisie n'est visible qu'après le rendu suivant.
      setTimeout(focus, 0);
    } else {
      focus();
    }
  }

  function moveCriterion(direction: -1 | 1) {
    const next = neighborId(
      criteria.map((c) => c.id),
      criterionId,
      direction,
    );
    if (next) setCriterionId(next);
  }

  const canFocusCriterion = criteria.length > 0 && activeId === undefined;
  const focused = view === "criterion" && canFocusCriterion ? criterionId : null;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby={`${uid}-progress`}
        className="bg-background sticky top-0 z-10 space-y-3 rounded-lg border p-3"
      >
        <h2 id={`${uid}-progress`} className="sr-only">
          Avancement de la correction
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="font-medium">
            {progress.label}
          </p>
          <p className="text-muted-foreground text-sm">
            {progress.dirty > 0
              ? `${progress.dirty} copie${progress.dirty > 1 ? "s" : ""} à enregistrer`
              : "Tout est enregistré"}
          </p>
          <Button type="button" size="sm" disabled={progress.dirty === 0} onClick={saveAll}>
            Enregistrer tout
          </Button>
        </div>
        <div aria-live="polite">
          {celebrate ? (
            <Celebration>Tout est corrigé. Tu peux envoyer les résultats.</Celebration>
          ) : null}
        </div>

        {canFocusCriterion ? (
          <div className="flex flex-wrap items-end gap-3">
            <div role="group" aria-label="Mode de correction" className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={view === "copy" ? "default" : "outline"}
                aria-pressed={view === "copy"}
                onClick={() => setView("copy")}
              >
                Une copie à la fois
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "criterion" ? "default" : "outline"}
                aria-pressed={view === "criterion"}
                onClick={() => setView("criterion")}
              >
                Un critère pour toute la classe
              </Button>
            </div>
            {view === "criterion" ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`${uid}-criterion`} className="text-xs">
                    Critère affiché
                  </Label>
                  <select
                    id={`${uid}-criterion`}
                    value={criterionId}
                    onChange={(e) => setCriterionId(e.target.value)}
                    className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
                  >
                    {criteria.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    neighborId(
                      criteria.map((c) => c.id),
                      criterionId,
                      -1,
                    ) === null
                  }
                  onClick={() => moveCriterion(-1)}
                >
                  Critère précédent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    neighborId(
                      criteria.map((c) => c.id),
                      criterionId,
                      1,
                    ) === null
                  }
                  onClick={() => moveCriterion(1)}
                >
                  Critère suivant
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {items.length > 1 ? (
          <nav aria-label="Copies">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {items.map((i) => {
                const done = status[i.id]?.corrected ?? (i.grade?.value ?? null) !== null;
                return (
                  <li key={i.id}>
                    <a
                      href={`#copy-${i.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        focusCopy(i.id);
                      }}
                      className="underline-offset-2 hover:underline"
                    >
                      {i.title}
                    </a>
                    <span className="text-muted-foreground">{done ? " (corrigée)" : ""}</span>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </section>

      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={section.title ? `${uid}-${section.id}` : undefined}
          className="space-y-4"
        >
          {section.title ? (
            <h2 id={`${uid}-${section.id}`} className="text-lg font-semibold">
              {section.title}
            </h2>
          ) : null}
          {section.items.length === 0 && section.empty ? (
            <p className="text-muted-foreground">{section.empty}</p>
          ) : null}
          {section.items.map((item) => (
            <div key={item.id} hidden={activeId !== undefined && item.id !== activeId}>
              <GradeForm
                id={item.id}
                action={item.action}
                title={item.title}
                grid={grid}
                maxScore={maxScore}
                grade={item.grade}
                comments={comments}
                autoValidatedIds={autoValidatedIds}
                subject={subject}
                focusCriterionId={focused}
                observations={item.observations}
                members={item.members}
                memberOverrides={item.memberOverrides}
                theme={item.theme}
                onStatus={onStatus}
                register={register}
                onNavigate={(direction) => {
                  const next = neighborId(ids, item.id, direction);
                  if (next) focusCopy(next);
                }}
                hasPrev={neighborId(ids, item.id, -1) !== null}
                hasNext={neighborId(ids, item.id, 1) !== null}
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
