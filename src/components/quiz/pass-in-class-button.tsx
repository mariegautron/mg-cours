"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { passInClass } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";

/** « Faire passer en classe (QR) » : prépare tout, puis ouvre la projection dans un nouvel onglet. */
export function PassInClassButton({
  moduleId,
  assessmentId,
  primary,
}: {
  moduleId: string;
  assessmentId: string;
  primary: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="touch"
        variant={primary ? "default" : "outline"}
        disabled={pending}
        className="h-auto w-full py-2 whitespace-normal"
        onClick={() => {
          // Onglet ouvert tout de suite (sinon le navigateur le bloque), rempli une fois prêt.
          const tab = window.open("", "_blank");
          setError("");
          start(async () => {
            const res = await passInClass(moduleId, assessmentId);
            if (res.error || !res.url) {
              tab?.close();
              setError(res.error ?? "Impossible de préparer le QCM.");
              return;
            }
            if (tab) tab.location.href = res.url;
            else window.open(res.url, "_blank");
            router.refresh();
          });
        }}
      >
        {pending ? "Préparation…" : "Faire passer en classe (QR)"}
        <span className="sr-only"> (nouvel onglet)</span>
      </Button>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
