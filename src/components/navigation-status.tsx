"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useLinkStatus } from "next/link";

/** Délai avant d'afficher le filet : une navigation rapide ne doit pas faire clignoter l'écran. */
const SHOW_AFTER_MS = 150;

const NavigationContext = createContext<(() => () => void) | null>(null);

/**
 * Indicateur de navigation unique de la coque : un filet de progression en haut de l'écran et une
 * seule zone `role="status"` qui annonce « Chargement… ». Les liens (`LinkPending`) et les
 * squelettes de route (`RouteLoadingMarker`) déclarent chacun leur attente ; le filet reste
 * visible tant qu'au moins une attente est en cours. Sans animation : `prefers-reduced-motion`
 * n'a donc rien à neutraliser, le filet est simplement affiché.
 */
export function NavigationStatusProvider({ children }: { children: ReactNode }) {
  const [waiting, setWaiting] = useState(0);
  const [visible, setVisible] = useState(false);

  const register = useCallback(() => {
    setWaiting((n) => n + 1);
    return () => setWaiting((n) => Math.max(0, n - 1));
  }, []);

  useEffect(() => {
    if (waiting === 0) {
      const hide = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(hide);
    }
    const show = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(show);
  }, [waiting]);

  return (
    <NavigationContext.Provider value={register}>
      <div
        aria-hidden
        data-slot="navigation-progress"
        className={`bg-primary pointer-events-none fixed inset-x-0 top-0 z-50 h-1 origin-left ${
          visible ? "animate-nav-progress" : "hidden"
        }`}
      />
      <div role="status" data-slot="navigation-status" className="sr-only">
        {visible ? "Chargement…" : ""}
      </div>
      {children}
    </NavigationContext.Provider>
  );
}

/** Déclare une attente de navigation tant que `active` est vrai (sans effet hors coque). */
export function useNavigationPending(active: boolean) {
  const register = useContext(NavigationContext);
  useEffect(() => {
    if (!active || !register) return;
    return register();
  }, [active, register]);
}

/** À placer dans un `<Link>` : signale au filet que ce lien est en cours de navigation. */
export function LinkPending() {
  const { pending } = useLinkStatus();
  useNavigationPending(pending);
  return null;
}

/** Monté par les squelettes `loading.tsx` : la route est en cours de chargement. */
export function RouteLoadingMarker() {
  useNavigationPending(true);
  return null;
}
