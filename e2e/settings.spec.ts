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

test("enregistre le profil et ajoute une école", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Réglages", level: 1 })).toBeVisible();

  await page.getByLabel("SIRET").first().fill("123 456 789 00012");
  await page.getByRole("button", { name: "Enregistrer le profil" }).click();
  await expect(page.getByText("Profil enregistré.")).toBeVisible();

  await page.getByLabel("SIRET").first().fill("123");
  await page.getByRole("button", { name: "Enregistrer le profil" }).click();
  await expect(page.getByText("Le SIRET compte 14 chiffres.")).toBeVisible();

  await page.getByRole("link", { name: "Ajouter une école" }).click();
  const name = `École test ${Date.now()}`;
  await page.getByLabel("Nom de l’école / campus").fill(name);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(name)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
