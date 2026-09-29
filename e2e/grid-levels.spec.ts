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

test("une grille se saisit avec des paliers propres à chaque critère", async ({ page }) => {
  test.setTimeout(60_000);
  // Thème clair : le contraste de la barre latérale en thème dark est vérifié dans design.spec.ts.
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await login(page);
  const gridName = `Grille Paliers ${Date.now()}`;

  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").fill("Structure");

  // Critère 1 : 6/4/2/0. Le barème du critère devient le palier le plus haut.
  const points = [0, 6, 2, 4];
  for (const [i, value] of points.entries()) {
    await page.getByRole("button", { name: "Ajouter un palier au critère 1" }).click();
    await expect(page.getByLabel(`Valeur du palier ${i + 1} (critère 1)`)).toBeFocused();
    await page.getByLabel(`Valeur du palier ${i + 1} (critère 1)`).fill(String(value));
  }
  await page
    .getByLabel("Description du palier 2 (critère 1)")
    .fill("Structure sémantique correcte");
  await expect(page.getByLabel("Points", { exact: true })).toHaveValue("6");

  // Critère 2 : 2/1/0, nombre de paliers différent.
  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé du critère 2").fill("Bouton");
  for (const [i, value] of [2, 1, 0].entries()) {
    await page.getByRole("button", { name: "Ajouter un palier au critère 2" }).click();
    await page.getByLabel(`Valeur du palier ${i + 1} (critère 2)`).fill(String(value));
  }
  await expect(page.getByText("Barème total : 8 points.")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();

  const card = page.getByRole("listitem").filter({ hasText: gridName }).first();
  await expect(card).toContainText("Structure (6)");
  await expect(card).toContainText("Bouton (2)");
  await expect(card).toContainText("6 pt — Structure sémantique correcte");

  // Réouverture : paliers triés du plus haut au plus bas, suppression d'un palier.
  await card.getByRole("link", { name: "Modifier" }).click();
  await expect(page.getByLabel("Valeur du palier 1 (critère 1)")).toHaveValue("6");
  await expect(page.getByLabel("Valeur du palier 4 (critère 1)")).toHaveValue("0");
  await page.getByRole("button", { name: "Supprimer le palier 1 du critère 1" }).click();
  await expect(page.getByLabel("Points", { exact: true }).first()).toHaveValue("4");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: gridName }).first()).toContainText(
    "Structure (4)",
  );
});
