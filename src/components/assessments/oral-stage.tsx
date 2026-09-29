"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

import { setSlotStatus } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/actions";
import { GradingSession, type SessionSection } from "@/components/assessments/grading-session";
import { OralTimer } from "@/components/assessments/oral-timer";
import type { PlanSlot } from "@/components/assessments/oral-plan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import type { GridWithCriteria } from "@/lib/assessments/queries";
import { firstWaiting, nextWaiting } from "@/lib/assessments/oral";
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
}) {
  const [activeGroupId, setActiveGroupId] = useState(
    () => (firstWaiting(slots) ?? slots[slots.length - 1])?.groupId ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

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
    <div className="space-y-6">
      <section aria-labelledby="stage-title" className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="stage-title" className="text-lg font-semibold">
            Passage {index + 1} sur {slots.length} — {active.groupName}
          </h2>
          <div className="flex items-center gap-2">
            <Badge variant={active.status === "done" ? "default" : "outline"}>
              {active.status === "done" ? "passé" : "à passer"}
            </Badge>
            {active.start && active.end ? (
              <span className="text-muted-foreground text-sm">
                {active.start}–{active.end}
              </span>
            ) : null}
          </div>
        </div>
        {active.theme ? <p className="text-sm">Thème : {active.theme}</p> : null}
        {active.members.length ? (
          <p className="text-muted-foreground text-sm">Membres : {active.members.join(", ")}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!previous || pending}
            onClick={() => previous && activate(previous.groupId)}
          >
            <ChevronLeft aria-hidden />
            Groupe précédent
          </Button>
          <PendingButton
            type="button"
            pending={pending}
            pendingLabel={last ? "Fin de l’oral…" : "Passage au groupe suivant…"}
            onClick={goNext}
          >
            {last ? <Flag aria-hidden /> : <ChevronRight aria-hidden />}
            {last ? "Terminer l’oral" : "Groupe suivant"}
          </PendingButton>
        </div>
        <div role="status" aria-live="polite" className="text-sm">
          {message}
        </div>
      </section>

      <OralTimer key={active.id} durationMinutes={active.effectiveMinutes} />

      <section aria-labelledby="stage-grid" className="space-y-3">
        <h2 id="stage-grid" className="sr-only">
          Grille de correction du groupe {active.groupName}
        </h2>
        <GradingSession
          sections={sections}
          grid={grid}
          maxScore={maxScore}
          comments={comments}
          autoValidatedIds={autoValidatedIds}
          subject={subject}
          activeId={active.groupId}
          onActivate={(groupId) => {
            setMessage("");
            setActiveGroupId(groupId);
          }}
        />
      </section>
    </div>
  );
}
