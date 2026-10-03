"use client";

import { useState, useTransition } from "react";

import {
  createClassLink,
  releaseName,
  revokeClassLink,
  type ClassLinkState,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/qr/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";

/** Boutons du QR de classe : créer / remplacer / arrêter le lien, libérer un nom. */
export function ClassLinkControls({
  moduleId,
  assessmentId,
  hasLink,
  releasable,
}: {
  moduleId: string;
  assessmentId: string;
  hasLink: boolean;
  releasable: { attemptId: string; name: string }[];
}) {
  const [state, setState] = useState<ClassLinkState>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ClassLinkState>) => start(async () => setState(await fn()));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => run(() => createClassLink(moduleId, assessmentId))}
        >
          {hasLink ? "Remplacer le QR code" : "Créer le QR code"}
        </Button>
        {hasLink ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => revokeClassLink(moduleId, assessmentId))}
          >
            Arrêter le QR code
          </Button>
        ) : null}
      </div>
      {releasable.length ? (
        <ul className="space-y-2">
          {releasable.map((r) => (
            <li
              key={r.attemptId}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>{r.name}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                aria-label={`Libérer le nom ${r.name}`}
                onClick={() => run(() => releaseName(moduleId, assessmentId, r.attemptId))}
              >
                Libérer
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {state.error ? <ActionError error={state.error} /> : null}
    </div>
  );
}
