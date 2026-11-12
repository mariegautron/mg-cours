"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectionTheme = "light" | "dark";

const STORAGE_KEY = "projection-theme";

const Ctx = createContext<{ theme: ProjectionTheme | null; toggle: () => void } | null>(null);

function readStored(): ProjectionTheme | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Thème des vues projetées (Présenter, Diapositives, frise), réglé à part de celui de l'appli :
 * un fond très sombre passe mal sur certains projecteurs de salle. Le choix est mémorisé sur ce
 * navigateur ; tant qu'il n'y en a pas, la projection suit le thème de l'appli.
 * Les jetons clairs / sombres sont redéclarés sur `.theme-light` / `.theme-dark` (globals.css).
 */
export function ProjectionThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ProjectionTheme | null>(null);

  useEffect(() => {
    // Lecture après l'hydratation : le serveur ne connaît pas ce réglage local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(readStored());
  }, []);

  function toggle() {
    const isDark =
      theme === "dark" || (theme === null && document.documentElement.classList.contains("dark"));
    const next: ProjectionTheme = isDark ? "light" : "dark";
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour cette fenêtre seulement.
    }
  }

  return (
    <Ctx.Provider value={{ theme, toggle }}>
      <div
        className={cn(
          "bg-background text-foreground min-h-dvh",
          theme === "light" && "theme-light",
          theme === "dark" && "theme-dark",
        )}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

/** Bouton « clair / sombre » de la projection (remplace la bascule de thème de l'appli). */
export function ProjectionThemeToggle({ className }: { className?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx) return null;
  const dark = ctx.theme === "dark";
  const light = ctx.theme === "light";
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-touch"
      className={className}
      aria-label="Projection : passer en clair ou en sombre"
      title="Projection claire / sombre"
      onClick={ctx.toggle}
    >
      {dark ? (
        <Sun aria-hidden />
      ) : light ? (
        <Moon aria-hidden />
      ) : (
        <>
          <Sun aria-hidden className="hidden dark:block" />
          <Moon aria-hidden className="dark:hidden" />
        </>
      )}
    </Button>
  );
}
