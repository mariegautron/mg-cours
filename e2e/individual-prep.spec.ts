import { expect, test } from "@playwright/test";

import { createSimpleGrid, loginLight } from "./grading-setup";

// US-144 : préparer une évaluation individuelle (cadre selon le type, rattrapage préparé d'avance).
test("évaluation individuelle : cadre selon le type et rattrapage préparé d'avance", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Prépa ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Prépa ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Prépa ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await expect(page.getByText("Membres (0)")).toBeVisible();

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Épreuve ${suffix}`);
  await page.getByLabel("Type", { exact: true }).fill("En classe (écrit)");
  await expect(page.getByLabel("Date de l'épreuve")).toBeVisible();
  await expect(page.getByText("Indique la durée en minutes.")).toBeVisible();
  await page.getByLabel("Durée (minutes)").fill("45");
  await expect(page.getByText("Indique la durée en minutes.")).toHaveCount(0);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByLabel(/Préparer dès maintenant le sujet de rattrapage/).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: `Épreuve ${suffix}` }).waitFor();

  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText(`Rattrapage — Épreuve ${suffix}`)).toBeVisible();
});
