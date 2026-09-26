"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { archiveModule, unarchiveModule } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";

export function ArchiveModuleButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await (archived ? unarchiveModule(id) : archiveModule(id));
          })
        }
      >
        {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {archived ? "Désarchiver le module" : "Archiver le module"}
      </Button>
      <p className="text-muted-foreground text-sm">
        Un module archivé (année passée) disparaît du tableau de bord, de la facturation et de la
        liste des modules, sauf avec « Afficher les archivés ».
      </p>
    </div>
  );
}
