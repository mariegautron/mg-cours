"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ActionError } from "@/components/action-error";
import {
  saveCheckpointResult,
  type CheckpointActionState,
} from "@/app/(app)/modules/[id]/jalons/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Textarea } from "@/components/ui/textarea";
import {
  CHECKPOINT_STATUSES,
  CHECKPOINT_STATUS_LABEL,
  FEEDBACK_TEMPLATE,
  type CheckpointStatus,
} from "@/lib/checkpoints/checkpoints";

/** État du jalon, retour écrit (destiné à l'étudiant·e) et note privée (jamais montrée). */
export function CheckpointForm({
  moduleId,
  checkpointId,
  studentId,
  initial,
}: {
  moduleId: string;
  checkpointId: string;
  studentId: string;
  initial: { status: CheckpointStatus; feedback_md: string; private_note: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<CheckpointActionState>({});

  function submit(formData: FormData) {
    start(async () => {
      const result = await saveCheckpointResult(moduleId, checkpointId, studentId, {
        status: String(formData.get("status") ?? ""),
        feedback_md: String(formData.get("feedback_md") ?? ""),
        private_note: String(formData.get("private_note") ?? ""),
      });
      setState(result);
      if (!result.error) router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="font-heading text-lg font-bold">État du jalon</legend>
        <div className="flex flex-wrap gap-2">
          {CHECKPOINT_STATUSES.map((s) => (
            <label
              key={s}
              className="has-[:checked]:bg-accent has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold has-[:focus-visible]:ring-2"
            >
              <input
                type="radio"
                name="status"
                value={s}
                defaultChecked={initial.status === s}
                className="size-4"
              />
              {CHECKPOINT_STATUS_LABEL[s]}
            </label>
          ))}
        </div>
        <p className="text-muted-foreground text-sm">
          La date de décision se remplit quand tu passes le jalon à « Validé » ou « Refusé ».
        </p>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="feedback_md" className="font-heading block text-lg font-bold">
          Retour écrit
        </label>
        <p id="feedback-help" className="text-muted-foreground text-sm">
          Court, destiné à l’étudiant·e : décision, ce qui est en place, ce qui manque, prochaine
          étape.
        </p>
        <Textarea
          id="feedback_md"
          name="feedback_md"
          rows={8}
          maxLength={10000}
          aria-describedby="feedback-help"
          defaultValue={initial.feedback_md || FEEDBACK_TEMPLATE}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="private_note" className="font-heading block text-lg font-bold">
          Note privée{" "}
          <span className="text-muted-foreground text-sm font-normal">(jamais montrée)</span>
        </label>
        <p id="private-help" className="text-muted-foreground text-sm">
          Niveaux et remarques pour toi seule. L’étudiant·e ne la verra jamais.
        </p>
        <Textarea
          id="private_note"
          name="private_note"
          rows={5}
          maxLength={10000}
          aria-describedby="private-help"
          defaultValue={initial.private_note}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PendingButton type="submit" size="touch" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer
        </PendingButton>
        {state.message ? (
          <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.message}
          </p>
        ) : null}
        {state.error ? <ActionError error={state.error} /> : null}
      </div>
    </form>
  );
}
