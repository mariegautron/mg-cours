import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("suivi des rendus par jalon et par groupe", async ({ page }) => {
  test.setTimeout(120_000);
  await loginLight(page);
  const suffix = Date.now();
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Rendus ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  const names = [`Un ${suffix}`, `Deux ${suffix}`];
  for (const name of names) {
    await page.goto(`${moduleUrl}/groups/new`);
    await page.getByLabel("Nom du groupe").fill(name);
    await page.getByRole("button", { name: "Créer le groupe" }).click();
    await page.getByText(name).first().waitFor();
  }
  await page.goto(`${moduleUrl}/project`);
  await page.getByLabel("Titre du projet").fill("Projet");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await page.getByRole("button", { name: "Créer 3 évaluations" }).click();
  await page.getByText("3 évaluations créées.").waitFor();
  await page.getByRole("link", { name: /Jalon 1/ }).click();

  await expect(page.getByRole("heading", { name: /Rendus — 0\/2 rendu/ })).toBeVisible();
  await page.getByLabel(`Reçu le (${names[0]})`).fill("2026-11-03");
  await page.getByLabel(`Lien du rendu (${names[0]})`).fill("https://github.com/x/y");
  await page.getByRole("button", { name: `Enregistrer le rendu de ${names[0]}` }).click();
  await expect(page.getByText("Rendu enregistré.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Rendus — 1\/2 rendu reçu/ })).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Ouvrir le rendu de ${names[0]} (nouvel onglet)` }),
  ).toHaveAttribute("href", "https://github.com/x/y");

  await page.getByLabel(`Lien du rendu (${names[1]})`).fill("javascript:alert(1)");
  await page.getByLabel(`Reçu le (${names[1]})`).fill("2026-11-04");
  await page.getByRole("button", { name: `Enregistrer le rendu de ${names[1]}` }).click();
  await expect(page.getByRole("alert").filter({ hasText: "http" })).toBeVisible();

  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
