import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("un bouton d’action affiche son attente, garde sa largeur, reste focalisable et ignore le second appui", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module attente ${Date.now()}`);
  await page.getByLabel("Année").fill("2025");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  // Ralentit les Server Actions pour laisser voir l'état d'attente (et compte les appels).
  let actionCalls = 0;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      actionCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });

  await openTab(page, /Administratif/);
  const button = page.getByRole("button", { name: "Archiver le module" });
  const widthBefore = (await button.boundingBox())!.width;
  await button.click();

  const busy = page.locator("button[aria-busy=true]");
  await expect(busy).toContainText("Archivage…");
  // Pas `disabled` : le bouton garde le focus et sa place dans l'ordre de tabulation.
  await expect(busy).toBeEnabled();
  await expect(busy).toBeFocused();
  // Largeur conservée : pas de saut de mise en page.
  const widthDuring = (await busy.boundingBox())!.width;
  expect(Math.abs(widthDuring - widthBefore)).toBeLessThanOrEqual(2);
  // Un second appui identique pendant l'envoi est ignoré.
  await busy.click();

  await expect(page.getByRole("button", { name: "Restaurer le module" })).toBeVisible();
  expect(actionCalls).toBe(1);
});
