import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createSimpleGrid, loginLight } from "./grading-setup";

// US-126 : évaluations du module, notes exigées, trois façons d'en ajouter une.
test("évaluations du module : notes exigées, grille de la bibliothèque, note de l'école", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Biblio ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Évals ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.goto(`${moduleUrl}/groups/new`);
  await page.getByLabel("Nom du groupe").fill(`Groupe Évals ${suffix}`);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await expect(page.getByText("Membres (0)")).toBeVisible();

  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText(/21 h : 3 notes exigées\. Il te manque 3 notes/)).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("link", { name: "Ajouter une évaluation" }).click();
  await expect(
    page.getByRole("heading", { name: /Ajouter une évaluation/, level: 1 }),
  ).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Depuis la bibliothèque : la grille arrive présélectionnée.
  await page.getByRole("link", { name: new RegExp(gridName) }).click();
  await expect(page.getByLabel("Grille de correction (optionnel)")).toHaveValue(/.+/);

  // Note de l'école.
  await page.goto(`${moduleUrl}/assessments/add`);
  await page.getByLabel("Titre de la note").fill("Contrôle continu 1");
  await page.getByRole("button", { name: "Créer la note de l’école" }).click();
  await page
    .getByRole("heading", { name: "Contrôle continu 1", level: 1 })
    .waitFor({ timeout: 20_000 });
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText(/Note de l'école · coefficient 1/)).toBeVisible();
});
