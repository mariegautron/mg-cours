"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { reopenModule } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";

/** Fiche d'un module terminé : « Rouvrir le module » (il revient dans « En cours »). */
export function ReopenModuleButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="touch"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await reopenModule(id);
          if (r.ok) toast.success(`« ${name} » est de retour dans les modules en cours.`);
          else toast.error(r.error ?? "On n’a pas pu rouvrir le module.");
          router.refresh();
        })
      }
    >
      Rouvrir le module
    </Button>
  );
}
