"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ActionError } from "@/components/action-error";
import { finishModule, saveRetrospective, undoFinishModule } from "@/app/(app)/modules/actions";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_MAX, UNDO_WINDOW_MS } from "@/lib/modules/archive-undo";

/**
 * « Ce que je retiens » + « Terminer le module » (seul endroit pour terminer et pour écrire son
 * retour), avec « Annuler » 10 secondes. Module déjà terminé : « Enregistrer mon retour » seulement.
 */
export function FinishModuleForm({
  id,
  name,
  askNote,
  initialNote,
  finished = false,
}: {
  id: string;
  name: string;
  askNote: boolean;
  initialNote: string;
  finished?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState(false);
  const save = () =>
    start(async () => {
      const result = await saveRetrospective(id, note);
      if (!result.ok) {
        setError(result.error ?? "On n’a pas pu enregistrer ton retour. Réessaie.");
        return;
      }
      setError(null);
      setSaved(true);
      router.refresh();
    });

  const finish = () =>
    start(async () => {
      const result = await finishModule(id, askNote ? note : null);
      if (!result.ok || !result.finishedAt) {
        setError(result.error ?? "On n’a pas pu terminer le module. Réessaie.");
        return;
      }
      const token = result.finishedAt;
      const archivedInstead = result.archivedInstead ?? false;
      toast.success(`« ${name} » est terminé.`, {
        description: "Il est archivé dans « Terminés ». Tu peux le rouvrir.",
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
      // Message « … est terminé · Annuler » affiché par la liste des modules (8 s).
      router.push(
        `/modules?termine=${id}&t=${encodeURIComponent(token)}&a=${archivedInstead ? 1 : 0}`,
      );
    });

  return (
    <div className="space-y-3">
      {askNote ? (
        <div className="space-y-1">
          <Label htmlFor="retro-note">Ce que je retiens de ce module</Label>
          <Textarea
            id="retro-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
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
        pendingLabel="Enregistrement…"
        onClick={finished ? save : finish}
      >
        {finished ? "Enregistrer mon retour" : "Terminer le module"}
      </PendingButton>
      {saved ? (
        <p role="status" className="text-sm">
          Retour enregistré.
        </p>
      ) : null}
    </div>
  );
}
