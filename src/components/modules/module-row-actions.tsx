"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { reopenModule } from "@/app/(app)/modules/actions";
import type { ModuleListState } from "@/lib/modules/list-state";
import { buttonVariants } from "@/components/ui/button";

// Bouton secondaire commun (DA « Atelier », 32 px).

const BTN = buttonVariants({ variant: "secondary" });

/**
 * Actions rapides d'une ligne de module : Facture, et « Rouvrir » pour un module terminé. Terminer
 * se fait sur la page « Terminer le module » (dernière étape d'Où j'en suis) ; supprimer et
 * dupliquer, en bas de « Modifier le module » (doublons D16, D17).
 */
export function ModuleRowActions({
  id,
  name,
  state,
}: {
  id: string;
  name: string;
  state: ModuleListState;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const reopen = () =>
    start(async () => {
      const r = await reopenModule(id);
      if (!r.ok) toast.error(r.error ?? "On n’a pas pu rouvrir le module.");
      else toast.success(`« ${name} » est de nouveau en cours.`);
      router.refresh();
    });

  const done = state === "finished" || state === "archived";
  return (
    <>
      {state === "taught" || done ? (
        <Link href={`/modules/${id}/billing`} className={BTN}>
          Facture<span className="sr-only"> : {name}</span>
        </Link>
      ) : null}
      {done ? (
        <button type="button" className={BTN} disabled={pending} onClick={reopen}>
          Rouvrir<span className="sr-only"> : {name}</span>
        </button>
      ) : null}
    </>
  );
}
