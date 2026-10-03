"use client";

import { useEffect } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { BREAKPOINTS } from "@/lib/nav/menu";

/**
 * Tablette (768–1023 px) : le menu latéral démarre en rail d'icônes ; il se redéploie à la
 * largeur ordinateur. Seuls les passages d'un seuil changent l'état : un choix de Marie (bouton
 * du menu) n'est pas écrasé tant que la largeur ne bouge pas de forme.
 */
export function RailSync() {
  const { setOpen } = useSidebar();
  useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`,
    );
    const sync = () => setOpen(!mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [setOpen]);
  return null;
}
