"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PendingButtonProps = React.ComponentProps<typeof Button> & {
  /** Action en cours : le bouton reste focalisable et garde sa largeur, mais ignore les appuis. */
  pending?: boolean;
  /** Libellé au participe présent (« Archivage… », « Suppression… », « Ajout… »). */
  pendingLabel: string;
};

/**
 * Bouton avec état d'attente, à utiliser à la place de `disabled={pending}`.
 *
 * - `aria-busy` plutôt que `disabled` : le bouton garde son contraste et sa place dans l'ordre
 *   de tabulation (le focus n'est pas perdu), mais un second appui est ignoré (pas de doublon).
 * - Le libellé d'attente et le libellé normal occupent la même cellule : la largeur du bouton ne
 *   bouge pas, donc pas de saut de mise en page.
 * - La rotation de l'icône est neutralisée sous `prefers-reduced-motion` : le libellé « … » suffit.
 */
export function PendingButton({
  pending = false,
  pendingLabel,
  children,
  className,
  onClick,
  disabled,
  size,
  ...props
}: PendingButtonProps) {
  // Bouton d'icône seule : seule la rotation est visible, le libellé reste pour les lecteurs d'écran.
  const iconOnly = typeof size === "string" && size.startsWith("icon");
  return (
    <Button
      {...props}
      size={size}
      disabled={disabled}
      aria-busy={pending || undefined}
      className={cn("aria-busy:cursor-progress", className)}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      <span className="inline-grid items-center justify-items-center [&>*]:col-start-1 [&>*]:row-start-1">
        <span
          className={cn("inline-flex items-center gap-1.5", pending && "invisible")}
          aria-hidden={pending || undefined}
        >
          {children}
        </span>
        <span
          className={cn("inline-flex items-center gap-1.5", !pending && "invisible")}
          aria-hidden={!pending || undefined}
        >
          <Loader2 aria-hidden className="animate-spin motion-reduce:animate-none" />
          {iconOnly ? <span className="sr-only">{pendingLabel}</span> : pendingLabel}
        </span>
      </span>
    </Button>
  );
}
