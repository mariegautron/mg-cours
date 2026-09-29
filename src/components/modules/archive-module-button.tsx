"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { archiveModule, unarchiveModule } from "@/app/(app)/modules/actions";
import { PendingButton } from "@/components/ui/pending-button";

export function ArchiveModuleButton({
  id,
  archived,
  compact = false,
}: {
  id: string;
  archived: boolean;
  /** Sans texte d'aide (ex. bandeau « module archivé »). */
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (archived) {
        await unarchiveModule(id);
        toast.success("Module restauré", {
          description:
            "Il réapparaît dans le tableau de bord, la facturation et les modules actifs.",
        });
      } else {
        await archiveModule(id);
        toast.success("Module archivé", {
          description: "Il n’apparaît plus que dans l’onglet « Archivés » de la liste des modules.",
          action: { label: "Annuler", onClick: () => void unarchiveModule(id) },
        });
      }
    });
  }

  const button = (
    <PendingButton
      type="button"
      variant="secondary"
      pending={pending}
      pendingLabel={archived ? "Restauration…" : "Archivage…"}
      onClick={toggle}
    >
      {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
      {archived ? "Restaurer le module" : "Archiver le module"}
    </PendingButton>
  );
  if (compact) return button;

  return (
    <div className="space-y-2">
      {button}
      <p className="text-muted-foreground text-sm">
        Un module archivé (année passée) disparaît du tableau de bord, de la facturation et des
        modules actifs ; il reste consultable dans l’onglet « Archivés ».
      </p>
    </div>
  );
}
