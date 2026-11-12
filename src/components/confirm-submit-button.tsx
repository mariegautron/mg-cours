"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/use-confirm";

/**
 * Bouton d'envoi de formulaire précédé d'une confirmation dans l'appli (nomme l'objet et la
 * conséquence). Utilisable dans un formulaire de composant serveur.
 */
export function ConfirmSubmitButton({
  title,
  description,
  confirmLabel,
  destructive,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type" | "onClick" | "title"> & {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [confirm, dialog] = useConfirm();
  return (
    <>
      <Button
        {...props}
        ref={ref}
        type="button"
        onClick={async () => {
          const form = ref.current?.form;
          if (!form) return;
          if (await confirm({ title, description, confirmLabel, destructive }))
            form.requestSubmit();
        }}
      >
        {children}
      </Button>
      {dialog}
    </>
  );
}
