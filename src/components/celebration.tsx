import type { ReactNode } from "react";

import { Mascot } from "@/components/mascot";

/**
 * Jalon franchi, célébré sobrement : une phrase, la mascotte « party » (réservée à ces seuls
 * moments), éventuellement une action. Sans animation. Le conteneur qui l'accueille porte
 * `aria-live="polite"` pour l'annoncer ; ce composant n'ajoute pas de `role="status"` (les pages
 * en ont déjà d'autres).
 */
export function Celebration({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div
      data-slot="celebration"
      className="bg-card halo flex flex-wrap items-center gap-3 rounded-xl border p-3"
    >
      <Mascot mood="party" float={false} className="size-14 shrink-0" />
      <p className="font-medium">{children}</p>
      {action}
    </div>
  );
}
