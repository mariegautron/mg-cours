"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ActionError } from "@/components/action-error";
import { finishModule, undoFinishModule } from "@/app/(app)/modules/actions";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_MAX, UNDO_WINDOW_MS } from "@/lib/modules/archive-undo";

/** « Ce que je retiens » + « Terminer et ranger » : même geste que la liste, avec « Annuler » 10 secondes. */
export function FinishModuleForm({
  id,
  name,
  askNote,
  initialNote,
}: {
  id: string;
  name: string;
  askNote: boolean;
  initialNote: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finish = () =>
    start(async () => {
      const result = await finishModule(id, askNote ? note : null);
      if (!result.ok || !result.finishedAt) {
        setError(result.error ?? "On n’a pas pu ranger le module. Réessaie.");
        return;
      }
      const token = result.finishedAt;
      const archivedInstead = result.archivedInstead ?? false;
      toast.success(`« ${name} » est terminé.`, {
        description: "Il est dans « Terminés ». Tu peux le rouvrir.",
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Annuler",
          onClick: () =>
            void undoFinishModule(id, token, archivedInstead).then((r) => {
              if (r.ok) toast.success(`« ${name} » est de retour dans les modules en cours.`);
              else toast.error(r.error ?? "On n’a pas pu annuler.");
              router.refresh();
            }),
        },
      });
      router.push("/modules");
    });

  return (
    <div className="space-y-3">
      {askNote ? (
        <div className="space-y-1">
          <Label htmlFor="retro-note">Ce que je retiens de ce module</Label>
          <Textarea
            id="retro-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={NOTE_MAX}
            placeholder="Ce qui a marché, ce que je changerais…"
          />
        </div>
      ) : null}
      {error ? <ActionError error={error} /> : null}
      <PendingButton
        type="button"
        size="touch"
        pending={pending}
        pendingLabel="Rangement…"
        onClick={finish}
      >
        Terminer et ranger
      </PendingButton>
    </div>
  );
}
