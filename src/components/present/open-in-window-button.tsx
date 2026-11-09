"use client";

import { Presentation } from "lucide-react";

import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/** Ouvre la projection dans sa propre fenêtre : la vue privée reste sur l'écran du portable. */
export function OpenInWindowButton({
  href,
  children,
  variant = "ghost",
  size,
}: {
  href: string;
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => {
        const url = `${href}${href.includes("?") ? "&" : "?"}fenetre=1`;
        const w = window.open(url, "mg-projection", "popup=yes,width=1280,height=720");
        if (!w) window.location.assign(url);
      }}
    >
      <Presentation aria-hidden />
      {children}
    </Button>
  );
}
