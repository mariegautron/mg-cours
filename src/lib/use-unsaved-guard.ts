import { useEffect } from "react";

/** Averti le navigateur (rechargement / fermeture) tant que `dirty` est vrai. Les navigations
 * internes (liens) doivent être interceptées séparément (voir `SchoolForm`/`ProfileForm`). */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
