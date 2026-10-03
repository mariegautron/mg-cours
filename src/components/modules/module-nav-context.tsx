"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type OpenModule = { id: string; name: string } | null;

const Ctx = createContext<{ module: OpenModule; setModule: (m: OpenModule) => void }>({
  module: null,
  setModule: () => {},
});

/** Le module ouvert, partagé entre sa page (qui le connaît) et le menu latéral (qui l'affiche). */
export function ModuleNavProvider({ children }: { children: React.ReactNode }) {
  const [module, setModule] = useState<OpenModule>(null);
  const value = useMemo(() => ({ module, setModule }), [module]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOpenModule(): OpenModule {
  return useContext(Ctx).module;
}

/** Déclare le module ouvert tant que sa page est affichée. */
export function ModuleNavRegister({ id, name }: { id: string; name: string }) {
  const { setModule } = useContext(Ctx);
  useEffect(() => {
    setModule({ id, name });
    return () => setModule(null);
  }, [id, name, setModule]);
  return null;
}
