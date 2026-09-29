"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_MODULE_TAB,
  isSectionAnchor,
  tabFromHash,
  type ModuleTab,
} from "@/lib/modules/tabs";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = () => window.location.hash;
const getServerHash = () => "";

/**
 * Onglets de la fiche module. L'onglet actif suit l'ancre de l'URL (`#courses` ouvre « Séances »,
 * `#billing` ouvre « Administratif » et fait défiler jusqu'à la section) et l'ancre suit l'onglet
 * choisi, pour qu'un rechargement ou un lien partagé retombe au même endroit.
 */
export function ModuleTabs({
  labels,
  children,
  defaultTab = DEFAULT_MODULE_TAB,
}: {
  labels: Record<ModuleTab, string>;
  children: ReactNode;
  /** Onglet ouvert sans ancre dans l'URL (celui qui demande une action, voir `defaultModuleTab`). */
  defaultTab?: ModuleTab;
}) {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const tab = hash ? tabFromHash(hash, defaultTab) : defaultTab;

  useEffect(() => {
    if (!isSectionAnchor(hash)) return;
    const id = decodeURIComponent(hash.slice(1));
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [hash, tab]);

  const select = (value: string) => {
    window.history.replaceState(null, "", `#${value}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <Tabs value={tab} onValueChange={select} className="space-y-4">
      <TabsList
        aria-label="Sections du module"
        className="bg-background sticky top-0 z-10 -mx-2 rounded-b-lg border-b px-2 py-2 shadow-sm"
      >
        {(Object.keys(labels) as ModuleTab[]).map((value) => (
          <TabsTrigger key={value} value={value} className="text-sm">
            {labels[value]}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
