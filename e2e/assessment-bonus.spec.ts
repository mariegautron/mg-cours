import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Note bonus de certification : barème à bandes, score → note sur 20, jamais pénalisante.
test("note bonus : score de certification, barème, effet sur la moyenne", async ({ page }) => {
  test.setTimeout(180_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Bonus ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, { firstNames: ["Ana"] });
  const moduleUrl = setup.moduleUrl;

  const createDirect = async (title: string) => {
    await page.goto(`${moduleUrl}/assessments/new`);
    await page.getByLabel("Titre", { exact: true }).fill(title);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/assessments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    return page.url();
  };
  const regularUrl = await createDirect(`Contrôle ${suffix}`);
  const bonusUrl = await createDirect(`Certification ${suffix}`);

  // Note normale : 10 / 20.
  await page.goto(`${regularUrl}/correct`);
  await page.getByLabel(/Note \(\/20\)/).fill("10");
  await expect(page.getByText(/Enregistré à/)).toBeVisible({ timeout: 20_000 });

  // Évaluation bonus : barème Opquast par défaut, enregistré.
  await page.goto(bonusUrl);
  await page.getByLabel(/Note bonus de certification/).check();
  await page.getByRole("button", { name: "Enregistrer la note bonus" }).click();
  await expect(page.getByText("Note bonus enregistrée.")).toBeVisible({ timeout: 20_000 });

  // Score 725 → note 12 / 20 ; hors barème → erreur claire ; absent → pas de note.
  await page.goto(`${bonusUrl}/correct`);
  const score = page.getByLabel(/Score de certification/);
  await score.fill("725");
  await expect(page.getByText("Note bonus : 12 / 20")).toBeVisible();
  await expect(page.getByText(/Enregistré à/)).toBeVisible({ timeout: 20_000 });
  await score.fill("1500");
  await expect(page.getByText(/n’entre dans aucune bande/)).toBeVisible();
  await score.fill("725");
  await expect(page.getByText("Note bonus : 12 / 20")).toBeVisible();

  // Moyenne : (10×3 + 12×3) / 6 = 11 → le bonus ajoute 1 point, sans compter dans les notes exigées.
  await page.goto(`${moduleUrl}/assessments`);
  await expect(page.getByText(/dont bonus certification \+1\.00/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Bonus certification").first()).toBeVisible();
});
