import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("crée un module, ajoute une séance liée à une ressource, coche un document", async ({
  page,
}) => {
  await login(page);

  // Une ressource pour lier au cours.
  await page.goto("/resources/new");
  const resourceTitle = `Kanban – bases ${Date.now()}`;
  await page.getByLabel("Titre").fill(resourceTitle);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: resourceTitle, level: 1 })).toBeVisible();

  // Module.
  await page.goto("/modules/new");
  const moduleName = `Méthodologies Agile ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByLabel("Date de la 1re séance").fill("2026-10-12");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();
  await expect(page.getByText(/0\/3/).first()).toBeVisible();
  await expect(page.getByText(/Échéance/).first()).toBeVisible();

  // Séance liée à la ressource.
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill("Introduction à l’Agilité");
  await page.getByLabel(resourceTitle).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByText("Séance 1")).toBeVisible();
  await expect(page.getByRole("link", { name: resourceTitle })).toBeVisible();

  // Document administratif.
  await page.getByLabel("Fiche de positionnement").click();
  await expect(page.getByLabel("Fiche de positionnement")).toBeChecked();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
