"use client";

import { useState, useTransition } from "react";

import {
  createFeedbackLink,
  revokeFeedbackLink,
  sendFeedbackEmails,
  type FeedbackActionState,
} from "@/app/(app)/modules/[id]/feedback/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Lien du questionnaire : copier, envoyer par e-mail à la classe, remplacer, arrêter. */
export function FeedbackControls({
  moduleId,
  url,
  sentAt,
}: {
  moduleId: string;
  url: string | null;
  sentAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FeedbackActionState>({});
  const [copied, setCopied] = useState(false);

  const run = (fn: () => Promise<FeedbackActionState>) => start(async () => setState(await fn()));

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      {url ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="feedback-url" className="sr-only">
              Lien du questionnaire
            </label>
            <Input id="feedback-url" readOnly value={url} className="min-w-0 flex-1" />
            <Button type="button" variant="outline" size="touch" onClick={copy}>
              {copied ? "Lien copié" : "Copier le lien"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="touch"
              disabled={pending}
              onClick={() => run(() => sendFeedbackEmails(moduleId))}
            >
              {sentAt ? "Renvoyer par e-mail" : "Envoyer par e-mail aux étudiant·es"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="touch"
              disabled={pending}
              onClick={() => run(() => createFeedbackLink(moduleId))}
            >
              Remplacer le lien
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="touch"
              disabled={pending}
              onClick={() => run(() => revokeFeedbackLink(moduleId))}
            >
              Arrêter le questionnaire
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          size="touch"
          disabled={pending}
          onClick={() => run(() => createFeedbackLink(moduleId))}
        >
          Créer le lien du questionnaire
        </Button>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {state.error ? (
          <span className="text-destructive">{state.error}</span>
        ) : (
          (state.message ?? "")
        )}
      </p>
    </div>
  );
}
