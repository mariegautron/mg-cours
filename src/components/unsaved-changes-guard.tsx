"use client";

import { useEffect, useRef, useState } from "react";

/**
 * À placer dans un `<form>` : prévient quand la saisie n'est pas enregistrée (fermeture de l'onglet
 * ou clic sur un lien de l'appli). Se réarme à l'envoi du formulaire.
 */
export function UnsavedChangesGuard() {
  const marker = useRef<HTMLSpanElement>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    const onInput = () => {
      dirtyRef.current = true;
      setDirty(true);
    };
    const onSubmit = () => {
      dirtyRef.current = false;
      setDirty(false);
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented) return;
      const a = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;
      if (
        !window.confirm("Tu as des modifications non enregistrées. Quitter cette page quand même ?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        dirtyRef.current = false;
      }
    };
    form.addEventListener("input", onInput);
    form.addEventListener("change", onInput);
    form.addEventListener("submit", onSubmit);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      form.removeEventListener("input", onInput);
      form.removeEventListener("change", onInput);
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <span ref={marker}>
      <span
        role="status"
        className={dirty ? "text-sm font-medium text-amber-700 dark:text-amber-400" : "sr-only"}
      >
        {dirty ? "Tu as des modifications non enregistrées." : ""}
      </span>
    </span>
  );
}
