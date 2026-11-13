"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Lien vers un bloc replié (« Prêt pour le jour J ? » dans la Préparation repliée, par exemple) :
 * ouvre les `<details>` qui le contiennent puis fait défiler jusqu'à lui. Sans cela, le lien
 * mène à un titre vide.
 */
export function OpenOnHash() {
  const pathname = usePathname();
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      let parent = el.parentElement;
      let changed = false;
      while (parent) {
        if (parent instanceof HTMLDetailsElement && !parent.open) {
          parent.open = true;
          changed = true;
        }
        parent = parent.parentElement;
      }
      if (changed) el.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    // Clic sur un lien vers la même page avec le même ancre : pas de « hashchange ».
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (a) window.setTimeout(open, 0);
    };
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", open);
      document.removeEventListener("click", onClick);
    };
  }, [pathname]);
  return null;
}
