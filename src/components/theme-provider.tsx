"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Thème sombre par défaut, clair en option (choix PO). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
