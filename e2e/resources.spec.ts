import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
// Identifiants du seed.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("crée une ressource et la retrouve dans la liste", async ({ page }) => {
  await login(page);

  await page.goto("/resources");
  await expect(page.getByRole("heading", { name: "Ressources", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Nouvelle ressource" }).first().click();
  const title = `Scrum – bases ${Date.now()}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Description").fill("Cérémonies et rôles Scrum.");
  await page.getByLabel("Tags").fill("agile, scrum");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(page.getByText("Pas encore utilisée dans un module.")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto("/resources");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});
