"use client";

import { useState, useTransition } from "react";

import { setMakeupDate } from "@/app/(app)/modules/[id]/assessments/makeup-action";

/** Date du rattrapage, depuis la page Rattrapages (frise, tableau de bord, message « Prévenir »). */
export function MakeupDateForm({
  moduleId,
  makeupId,
  initial,
  who = "",
}: {
  /** Prénoms des personnes concernées, pour le nom accessible du champ. */
  who?: string;
  moduleId: string;
  makeupId: string;
  initial: string | null;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      Date du rattrapage
      <input
        type="date"
        aria-label={who ? `Date du rattrapage de ${who}` : "Date du rattrapage"}
        defaultValue={initial?.slice(0, 10) ?? ""}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value;
          start(async () => {
            const res = await setMakeupDate(moduleId, makeupId, value);
            setMessage(res.error ?? (value ? "Date enregistrée." : "Date retirée."));
          });
        }}
        className="border-input bg-background min-h-9 rounded-md border px-2"
      />
      <span role="status" className="text-muted-foreground text-xs">
        {message}
      </span>
    </label>
  );
}
