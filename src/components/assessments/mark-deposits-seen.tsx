"use client";

import { useEffect } from "react";

import { markDepositsSeen } from "@/app/(app)/modules/[id]/assessments/submission-items-actions";

/** Marque les nouveaux rendus comme vus une fois la page affichée : la notification disparaît à la visite suivante. */
export function MarkDepositsSeen({
  assessmentId,
  active,
}: {
  assessmentId: string;
  active: boolean;
}) {
  useEffect(() => {
    if (active) void markDepositsSeen(assessmentId);
  }, [assessmentId, active]);
  return null;
}
