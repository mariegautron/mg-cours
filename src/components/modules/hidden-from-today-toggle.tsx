"use client";

import { useState, useTransition } from "react";
import { EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

import { setHiddenFromToday } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";

/** « Masquer d'Aujourd'hui » / « Afficher dans Aujourd'hui » (lot 6, point 28). */
export function HiddenFromTodayToggle({ moduleId, hidden }: { moduleId: string; hidden: boolean }) {
  const [value, setValue] = useState(hidden);
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const next = !value;
          const res = await setHiddenFromToday(moduleId, next);
          if (res.error) {
            toast.error(res.error);
            return;
          }
          setValue(next);
          toast.success(
            next
              ? "Module masqué d’Aujourd’hui : il ne compte plus sur le tableau de bord."
              : "Module de nouveau affiché dans Aujourd’hui.",
            {
              action: {
                label: "Annuler",
                onClick: () =>
                  start(async () => {
                    const undo = await setHiddenFromToday(moduleId, !next);
                    if (!undo.error) setValue(!next);
                  }),
              },
            },
          );
        })
      }
    >
      {value ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      {value ? "Afficher dans Aujourd’hui" : "Masquer d’Aujourd’hui"}
    </Button>
  );
}
