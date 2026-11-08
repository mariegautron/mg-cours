"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

/** Nom des fenêtres projetées : `mg-projection-<séance>` (voir « Ouvrir la projection »). */
const PROJECTION_PREFIX = "mg-projection-";

export function isProjectionWindowName(name: string): boolean {
  return name.startsWith(PROJECTION_PREFIX);
}

const subscribe = () => () => {};

/**
 * Garde de l'écran de correction. Une fenêtre ouverte comme projection (son nom, qui survit aux
 * navigations) n'affiche jamais le contenu : tant que le nom n'est pas lu, côté serveur et au
 * premier rendu, on n'affiche qu'un cadre vide ; ensuite le contenu ou le message.
 *
 * Limite : le serveur ne peut pas connaître le nom de la fenêtre. Le contenu existe donc dans les
 * données de la page mais n'est jamais affiché dans une fenêtre de projection.
 */
export function ProjectionGuard({ children, home }: { children: React.ReactNode; home: string }) {
  const state = useSyncExternalStore(
    subscribe,
    () => (isProjectionWindowName(window.name) ? "projected" : "private"),
    () => "unknown",
  );
  if (state === "unknown") {
    return (
      <div role="status" aria-busy="true" className="min-h-40">
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }
  if (state === "projected") {
    return (
      <section role="alert" className="mx-auto max-w-xl space-y-3 py-16 text-center">
        <h1 className="font-heading text-3xl font-bold">Cet écran reste sur ton portable</h1>
        <p className="text-muted-foreground">
          La correction n’est jamais projetée. Garde cette fenêtre pour la classe et ouvre la
          correction dans la fenêtre de ton portable.
        </p>
        <Link href={home} className="font-semibold underline underline-offset-2">
          Aller au tableau de bord
        </Link>
      </section>
    );
  }
  return <>{children}</>;
}
