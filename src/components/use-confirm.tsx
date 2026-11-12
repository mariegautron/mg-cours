"use client";

import { useCallback, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmOptions {
  /** Nomme l'objet : « Régénérer le lien de Léa ? ». */
  title: string;
  /** Dit la conséquence : ce qui change, ce qui ne se défait pas. */
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Confirmation dans l'appli (jamais la boîte du navigateur) avant une action qui ne se défait pas.
 * `const [confirm, dialog] = useConfirm();` puis `if (!(await confirm({...}))) return;` et rendre
 * `{dialog}` dans le composant.
 */
export function useConfirm(): [(options: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const dialog = (
    <AlertDialog open={options !== null} onOpenChange={(open) => (open ? null : close(false))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          <AlertDialogDescription>{options?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {options?.cancelLabel ?? "Annuler"}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={options?.destructive ? "destructive" : "default"}
            onClick={() => close(true)}
          >
            {options?.confirmLabel ?? "Confirmer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog];
}
