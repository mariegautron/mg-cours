"use client";

import { useState, useTransition } from "react";

import {
  publishAppreciations,
  unpublishAppreciations,
} from "@/app/(app)/modules/[id]/appreciations/actions";
import { Button } from "@/components/ui/button";

/** Publier / retirer les appréciations des espaces étudiant·es, avec confirmation dans la page. */
export function AppreciationPublication({
  moduleId,
  published,
  pendingNames,
}: {
  moduleId: string;
  published: number;
  pendingNames: string[];
}) {
  const [confirm, setConfirm] = useState<"publish" | "unpublish" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();
  const n = pendingNames.length;

  const run = (kind: "publish" | "unpublish") =>
    startTransition(async () => {
      const r = await (kind === "publish" ? publishAppreciations : unpublishAppreciations)(
        moduleId,
      );
      setConfirm(null);
      setMessage(
        r.error ??
          (kind === "publish"
            ? "Appréciations publiées dans les espaces."
            : "Appréciations retirées des espaces."),
      );
    });

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-sm">
        {published === 0
          ? "Aucune appréciation n’est visible par les étudiant·es."
          : `${published} appréciation${published > 1 ? "s" : ""} visible${published > 1 ? "s" : ""} dans les espaces, page « Notes et corrigés ».`}{" "}
        Une modification reste privée tant que tu ne publies pas à nouveau.
      </p>
      {n > 0 ? (
        <p className="text-sm">
          À publier ({n}) : {pendingNames.join(", ")}.
        </p>
      ) : null}
      {confirm ? (
        <div className="bg-muted space-y-2 rounded-lg p-3">
          <p className="text-sm font-medium">
            {confirm === "publish"
              ? `Chaque personne verra sa propre appréciation (${n} à publier). Confirmer ?`
              : "Plus personne ne verra son appréciation dans son espace. Confirmer ?"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="touch" disabled={busy} onClick={() => run(confirm)}>
              {confirm === "publish" ? "Oui, publier" : "Oui, retirer"}
            </Button>
            <Button
              type="button"
              size="touch"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="touch"
            disabled={n === 0}
            onClick={() => setConfirm("publish")}
          >
            Publier dans les espaces
          </Button>
          {published > 0 ? (
            <Button
              type="button"
              size="touch"
              variant="secondary"
              onClick={() => setConfirm("unpublish")}
            >
              Retirer des espaces
            </Button>
          ) : null}
        </div>
      )}
      <p role="status" className="min-h-5 text-sm font-medium">
        {message}
      </p>
    </div>
  );
}
