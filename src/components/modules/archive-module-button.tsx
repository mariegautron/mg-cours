"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import { archiveModule, unarchiveModule } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";

export function ArchiveModuleButton({ id, archived }: { id: string; archived: boolean }) {
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

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={toggle}>
        {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {archived ? "Restaurer le module" : "Archiver le module"}
      </Button>
      <p className="text-muted-foreground text-sm">
        Un module archivé (année passée) disparaît du tableau de bord, de la facturation et des
        modules actifs ; il reste consultable dans l’onglet « Archivés ».
      </p>
    </div>
  );
}
