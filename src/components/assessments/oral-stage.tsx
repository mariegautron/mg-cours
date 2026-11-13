"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

import { setSlotStatus } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/actions";
import { GradingSession, type SessionSection } from "@/components/assessments/grading-session";
import { OralSpace, type OralSpaceInit } from "@/components/assessments/oral-space";
import { OralTimer } from "@/components/assessments/oral-timer";
import type { PlanSlot } from "@/components/assessments/oral-plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import type { GridWithCriteria } from "@/lib/assessments/queries";
import { firstWaiting, nextWaiting } from "@/lib/assessments/oral";
import type { OralCriterion } from "@/lib/assessments/oral-space";
import type { Tables } from "@/types/db";

export interface StageSlot extends PlanSlot {
  members: string[];
  theme: string | null;
}

/**
 * US-92 : passage en cours. Le chronomètre suit le groupe courant, la grille de correction s'ouvre sur
 * ce groupe (les autres copies restent montées, masquées : enregistrement automatique et garde
 * anti-perte de `GradingSession`, pondération individuelle de `GradeForm`), « Groupe suivant » marque le
 * groupe passé et ouvre le suivant.
 */
export function OralStage({
  moduleId,
  assessmentId,
  slots,
  sections,
  grid,
  maxScore,
  comments,
  autoValidatedIds,
  subject,
  absenceRule,
  spaces,
  oralCriteria,
}: {
  moduleId: string;
  assessmentId: string;
  slots: StageSlot[];
  sections: SessionSection[];
  grid: GridWithCriteria | null;
  maxScore: number;
  comments: Tables<"predefined_comment">[];
  autoValidatedIds: string[];
  subject: string | null;
  absenceRule?: "keep_group_grade" | "makeup";
  /** Espaces de correction par groupe ; absent si la table n'est pas encore en base (ancienne grille). */
  spaces?: Record<string, { members: { id: string; name: string }[]; init: OralSpaceInit }>;
  oralCriteria?: OralCriterion[];
}) {
  const [activeGroupId, setActiveGroupId] = useState(
    () => (firstWaiting(slots) ?? slots[slots.length - 1])?.groupId ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  // Groupes dont le chronomètre a démarré : leur statut passe à « en cours ».
  const [started, setStarted] = useState<Set<string>>(new Set());

  const index = Math.max(
    0,
    slots.findIndex((s) => s.groupId === activeGroupId),
  );
  const active = slots[index];
  if (!active) return null;

  function activate(groupId: string) {
    setActiveGroupId(groupId);
    // La copie n'est visible qu'après le rendu : le titre du groupe reçoit alors le focus.
    setTimeout(() => document.getElementById(`copy-${groupId}-title`)?.focus(), 0);
  }

  function goNext() {
    startTransition(async () => {
      const current = active;
      await setSlotStatus(moduleId, assessmentId, current.id, "done");
      const next = nextWaiting(
        slots.map((s) => (s.id === current.id ? { ...s, status: "done" as const } : s)),
        current.id,
      );
      if (next) {
        setMessage(`Groupe suivant : ${next.groupName}.`);
        activate(next.groupId);
      } else {
        setMessage("Tous les groupes sont passés.");
      }
    });
  }

  const previous = slots[index - 1];
  const last = nextWaiting(slots, active.id) === null;

  return (
    <div className="space-y-3">
      <section aria-labelledby="stage-title" className="space-y-1 rounded-lg border px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="stage-title" className="text-sm font-semibold">
            Passage {index + 1} sur {slots.length} — {active.groupName}
          </h2>
          <Badge variant={active.status === "done" ? "default" : "outline"}>
            {active.status === "done" ? "passé" : started.has(active.id) ? "en cours" : "à passer"}
          </Badge>
          {active.start && active.end ? (
            <span className="text-muted-foreground text-sm">
              {active.start}–{active.end}
            </span>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!previous || pending}
              onClick={() => previous && activate(previous.groupId)}
            >
              <ChevronLeft aria-hidden />
              Groupe précédent
            </Button>
            {spaces ? null : (
              <PendingButton
                type="button"
                size="sm"
                pending={pending}
                pendingLabel={last ? "Fin de l’oral…" : "Passage au groupe suivant…"}
                onClick={goNext}
              >
                {last ? <Flag aria-hidden /> : <ChevronRight aria-hidden />}
                {last ? "Terminer l’oral" : "Groupe suivant"}
              </PendingButton>
            )}
          </div>
        </div>
        {active.theme || active.members.length ? (
          <p className="text-muted-foreground text-sm">
            {active.theme ? `Thème : ${active.theme}` : ""}
            {active.theme && active.members.length ? " · " : ""}
            {active.members.length ? `Membres : ${active.members.join(", ")}` : ""}
          </p>
        ) : null}
        <div role="status" aria-live="polite" className="text-sm">
          {message}
        </div>
      </section>

      <OralTimer
        key={active.id}
        durationMinutes={active.effectiveMinutes}
        onStart={() => setStarted((prev) => new Set(prev).add(active.id))}
      />

      <section aria-labelledby="stage-grid" className="space-y-3">
        <h2 id="stage-grid" className="sr-only text-sm font-semibold">
          Correction du groupe {active.groupName}
        </h2>
        {spaces && oralCriteria ? (
          slots.map((slot) => {
            const space = spaces[slot.groupId];
            if (!space) return null;
            return (
              <div key={slot.groupId} hidden={slot.groupId !== active.groupId}>
                <OralSpace
                  moduleId={moduleId}
                  assessmentId={assessmentId}
                  subjectId={slot.groupId}
                  subjectName={slot.groupName}
                  isGroup
                  members={space.members}
                  criteria={oralCriteria}
                  autoValidatedIds={autoValidatedIds}
                  maxScore={maxScore}
                  schoolRule={absenceRule ?? "keep_group_grade"}
                  init={space.init}
                  onNext={goNext}
                  nextLabel={last ? "Terminer l’oral" : "Groupe suivant"}
                  nextPending={pending}
                  afterOral={slot.status === "done"}
                />
              </div>
            );
          })
        ) : (
          <GradingSession
            sections={sections}
            grid={grid}
            maxScore={maxScore}
            comments={comments}
            autoValidatedIds={autoValidatedIds}
            subject={subject}
            absenceRule={absenceRule}
            activeId={active.groupId}
            onActivate={(groupId) => {
              setMessage("");
              setActiveGroupId(groupId);
            }}
          />
        )}
      </section>
    </div>
  );
}
