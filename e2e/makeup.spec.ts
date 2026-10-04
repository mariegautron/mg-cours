import { nextCopy, setScore } from "./helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("rattrapage : seul·es les absent·es excusé·es, même grille, la note remplace l'absence", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Rattrapage ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, {
    firstNames: ["Ana", "Zoé", "Léo"],
  });
  const [ana, zoe, leo] = setup.studentNames;
  const form = (name: string) => page.getByRole("form", { name });

  await setScore(form(ana), "Structure", "4");
  await nextCopy(page);
  await form(leo).getByRole("radio", { name: "Absent·e non prévenu·e" }).check();
  await nextCopy(page);
  await form(zoe).getByRole("radio", { name: "Absent·e excusé·e" }).check();
  await expect(page.getByText("Tout est enregistré")).toBeVisible({ timeout: 10_000 });

  // L'évaluation d'origine propose le rattrapage : seule Zoé (excusée) est concernée.
  await page.goto(setup.assessmentUrl);
  // US-100 : tableau à recopier dans Hyperplanning (excusé·e sans note, non prévenu·e à 0).
  const assessmentPath = new URL(page.url()).pathname;
  await page.goto(`${setup.assessmentUrl}/results`);
  const hp = page.getByRole("region", { name: "À saisir dans Hyperplanning" });
  await expect(hp.getByRole("row").filter({ hasText: "Ana" })).toContainText("20,00");
  await expect(hp.getByRole("row").filter({ hasText: "Zoé" })).toContainText("Absent·e excusé·e");
  await expect(hp.getByRole("row").filter({ hasText: "Léo" })).toContainText("0,00");
  const csv = await page.request.get(
    assessmentPath.replace("/modules/", "/api/modules/") + "/hyperplanning",
  );
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Note /20");
  await page.goto(setup.assessmentUrl);
  const panel = page.getByRole("region", { name: "Rattrapage" });
  await expect(panel.getByText(new RegExp(`Absent·es excusé·es \\(1\\) : ${zoe}`))).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
  await panel.getByRole("button", { name: "Préparer le rattrapage" }).click();

  // On arrive sur le formulaire du rattrapage : sujet copié en brouillon.
  await expect(
    page.getByRole("heading", { name: `Modifier « Rattrapage — Évaluation ${suffix} »` }),
  ).toBeVisible();
  await page.goto(page.url().replace(/\/edit$/, ""));
  await expect(page.getByText("Rattrapage de")).toBeVisible();
  await expect(page.getByText(`pour : ${zoe}`)).toBeVisible();
  await expect(page.getByText("À construire")).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  // Seule Zoé peut être notée dans le rattrapage (page de correction).
  await page.goto(`${page.url()}/correct`);
  await page.waitForLoadState("networkidle");
  await expect(form(zoe)).toBeVisible();
  await expect(form(ana)).toHaveCount(0);
  await expect(form(leo)).toHaveCount(0);
  await setScore(form(zoe), "Structure", "3");
  await expect(page.getByText("Tout est enregistré")).toBeVisible({ timeout: 10_000 });

  // Le rattrapage ne compte pas comme une note de plus ; sa note remplace l'absence excusée.
  // « Tout est enregistré » s'affiche aussi avant que la saisie soit prise en compte : on recharge
  // jusqu'à ce que la note du rattrapage soit bien en base.
  const average = (name: string) =>
    page.getByRole("row").filter({ hasText: name }).getByRole("cell").nth(1);
  await expect(async () => {
    await page.goto(`${setup.moduleUrl}/assessments`);
    await expect(page.getByText("Rattrapage · ")).toBeVisible();
    await expect(average(zoe)).toHaveText("15.00", { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await expect(average(ana)).toHaveText("20.00");
  await expect(average(leo)).toHaveText("0.00");

  // US-148 : écran « Rattrapages » : Zoé, rattrapage noté, note remplacée.
  await page.goto(`${setup.moduleUrl}/rattrapages`);
  await expect(page.getByRole("heading", { name: /^Rattrapages —/, level: 1 })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: zoe })).toContainText("Note remplacée");
  await expect(page.getByText("0 à rattraper, 1 note remplacée.")).toBeVisible();
  if (process.env.CAPTURE) {
    await page.screenshot({ path: "docs/captures/rattrapages.png", fullPage: true });
  }
  expect((await axe(page)).violations).toEqual([]);

  // Une seule évaluation « notée » côté YNOV : 1 note individuelle, pas 2.
  await page.goto(`${setup.moduleUrl}/groups`);
  await expect(page.getByText(/2 évaluations \(1 avec des notes saisies\) · 1\//)).toBeVisible();

  // Retour sur l'originale : le rattrapage est lié, plus rien à ajouter.
  await page.goto(setup.assessmentUrl);
  await expect(page.getByRole("region", { name: "Rattrapage" })).toContainText(
    `Rattrapage — Évaluation ${suffix}`,
  );
  await expect(
    page.getByRole("button", { name: /Préparer le rattrapage|Ajouter .* au rattrapage/ }),
  ).toHaveCount(0);
});

test("rattrapage refusé pour une note de groupe", async ({ page }) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Rattrapage Groupe ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, { groupGrade: true });
  await page.goto(setup.assessmentUrl);
  await expect(page.getByRole("region", { name: "Rattrapage" })).toHaveCount(0);
});
