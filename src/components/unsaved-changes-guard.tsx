"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/components/use-confirm";

/**
 * À placer dans un `<form>` : prévient quand la saisie n'est pas enregistrée (fermeture de l'onglet
 * ou clic sur un lien de l'appli). Se réarme à l'envoi du formulaire.
 */
export function UnsavedChangesGuard() {
  const marker = useRef<HTMLSpanElement>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const router = useRouter();
  const [confirm, dialog] = useConfirm();

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
      // Confirmation dans l'appli (plus la boîte du navigateur) : on retient la navigation,
      // puis on la reprend si Marie choisit de quitter.
      e.preventDefault();
      e.stopPropagation();
      void confirm({
        title: "Quitter sans enregistrer ?",
        description:
          "Tu as des modifications non enregistrées sur cette page. Elles seront perdues.",
        confirmLabel: "Quitter sans enregistrer",
        cancelLabel: "Rester sur la page",
        destructive: true,
      }).then((ok) => {
        if (!ok) return;
        dirtyRef.current = false;
        router.push(url.pathname + url.search + url.hash);
      });
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
  }, [router, confirm]);

  return (
    <span ref={marker}>
      {dialog}
      <span role="status" className={dirty ? "text-warning text-sm font-medium" : "sr-only"}>
        {dirty ? "Tu as des modifications non enregistrées." : ""}
      </span>
    </span>
  );
}
