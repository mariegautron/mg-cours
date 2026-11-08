"use client";

import { Presentation } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Ouvre la projection dans sa propre fenêtre : la vue privée reste sur l'écran du portable. */
export function OpenInWindowButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
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
