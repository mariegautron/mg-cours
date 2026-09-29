"use client";

import type { ComponentProps } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/** Bascule clair / sombre. Icônes pilotées en CSS (pas de flash d'hydratation). */
export function ThemeToggle({ size = "icon" }: { size?: ComponentProps<typeof Button>["size"] }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      aria-label="Changer de thème (clair / sombre)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun aria-hidden className="hidden dark:block" />
      <Moon aria-hidden className="dark:hidden" />
    </Button>
  );
}
