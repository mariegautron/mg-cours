import { expect, test } from "@playwright/test";

// « Où j'en suis » : chaque étape est un lien vers son écran, faite ou non, et le reste pour un module rangé.
test("où j'en suis : dix étapes cliquables, aussi pour un module rangé", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module étapes ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  const steps = page.getByRole("region", { name: "Où j’en suis" });
  await expect(steps.getByRole("link")).toHaveCount(10);
  // Étape à venir ou courante : un lien explicite vers son écran.
  await steps.getByRole("link", { name: /^Rapprocher les ressources : ouvrir/ }).click();
  await page.waitForURL(/\/matching/);

  // Module rangé : les mêmes dix liens, les écrans restent accessibles.
  await page.goto(`${moduleUrl}/documents`);
  await page.getByRole("button", { name: "Archiver le module" }).click();
  await page.waitForLoadState("networkidle");
  await page.goto(moduleUrl);
  await expect(page.getByText("Module rangé").first()).toBeVisible();
  const archivedSteps = page.getByRole("region", { name: "Où j’en suis" });
  await expect(archivedSteps.getByRole("link")).toHaveCount(10);
  await archivedSteps.getByRole("link", { name: /^Fiche de l’école et attendus : / }).click();
  await page.waitForURL(/\/expectations/);
});
