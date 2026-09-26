import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("conserve l’historique d’une ressource et restaure une ancienne version", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/resources/new");
  const title = `Historique ${Date.now()}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Contenu (Markdown)").fill("Version un");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Historique" }).click();
  await expect(page.getByText("Aucune version antérieure")).toBeVisible();

  await page.goBack();
  await page.getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Contenu (Markdown)").fill("Version deux");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Version deux")).toBeVisible();

  await page.getByRole("link", { name: "Historique" }).click();
  await page.getByText("Voir le contenu").click();
  await expect(page.getByText("Version un")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: /Restaurer cette version/ }).click();
  await page.waitForURL(/\/resources\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Version un")).toBeVisible();

  // L'état « Version deux » a été sauvegardé avant la restauration.
  await page.getByRole("link", { name: "Historique" }).click();
  await page.getByText("Voir le contenu").first().click();
  await expect(page.getByText("Version deux")).toBeVisible();
});
