import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, loginLight } from "./grading-setup";

// Critère à points libres avec attendus détaillés : éditeur de grille puis cases pendant la correction.
test("attendus d'un critère : saisis dans la grille, cochés à la correction, conservés", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille oral ${suffix}`;

  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").first().fill("Clarté de l’oral");
  await page.getByLabel("Points", { exact: true }).first().fill("6");
  await page.getByText("Description et attendus").first().click();
  await page
    .getByLabel("Attendus détaillés (un par ligne, facultatif)")
    .fill("Présente le contexte\nRespecte le temps\nRépond aux questions");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: "Grilles de correction" }).waitFor();

  await createAssessment(page, gridName, suffix);
  const attendus = page.getByRole("group", { name: "Attendus — Clarté de l’oral" });
  await expect(attendus).toBeVisible();
  await expect(attendus.getByText("0 attendu sur 3")).toBeVisible();
  await attendus.getByRole("checkbox", { name: "Présente le contexte" }).check();
  await attendus.getByRole("checkbox", { name: "Répond aux questions" }).check();
  await expect(attendus.getByText("2 attendus sur 3")).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.getByLabel(/Clarté de l’oral \(\/6\)/).fill("4");
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();

  await page.reload();
  const again = page.getByRole("group", { name: "Attendus — Clarté de l’oral" });
  await expect(again.getByRole("checkbox", { name: "Présente le contexte" })).toBeChecked();
  await expect(again.getByRole("checkbox", { name: "Respecte le temps" })).not.toBeChecked();
  await expect(again.getByRole("checkbox", { name: "Répond aux questions" })).toBeChecked();
});
