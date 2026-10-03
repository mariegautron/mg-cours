"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Sombre par défaut ; « Comme mon système » et « Clair » se choisissent dans les réglages. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
