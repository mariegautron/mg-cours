import { defineConfig, devices } from "@playwright/test";

// Port et dossier de build surchargeables (E2E_PORT, NEXT_DIST_DIR) pour lancer les e2e depuis
// deux copies de travail ou deux sessions sans que l'une réécrase le serveur de l'autre.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Un seul compte / un seul profil prestataire partagés : les tests s'exécutent en série.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Fenêtre haute : la barre d'actions collée en bas des formulaires de correction ne masque pas les champs.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
