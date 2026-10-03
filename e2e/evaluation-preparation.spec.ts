import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("préparer une évaluation : grille, cadre, correction ; ajouter une évaluation ; axe et 320 px", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Prépa ${suffix}`;
  await createSimpleGrid(page, gridName, [
    ["Structure", 4],
    ["Contenu", 6],
  ]);
  const setup = await createAssessment(page, gridName, suffix, { firstNames: ["Ana", "Zoé"] });
  const axe = () =>
    new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

  await page.goto(setup.assessmentUrl);
  const gridCard = page.getByRole("region", { name: "Grille de correction" });
  await expect(gridCard.getByText("Structure")).toBeVisible();
  await expect(gridCard.getByText("Contenu")).toBeVisible();
  await expect(gridCard.getByText("10 points").first()).toBeVisible();
  await expect(gridCard.getByRole("status")).toContainText("Total 10 sur");
  const frame = page.getByRole("region", { name: "Le cadre pour les étudiant·es" });
  await expect(frame.getByText("À écrire", { exact: true })).toBeVisible();
  await expect(frame.getByText("À construire", { exact: true })).toBeVisible();
  const correction = page.getByRole("region", { name: "Pour la correction" });
  await expect(correction.getByText("Toi seule")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Utilisée dans 1 module/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mes phrases pour cette grille/ })).toBeVisible();

  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [setup.assessmentUrl, `${setup.moduleUrl}/assessments/add`]) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      expect((await axe()).violations, `${url} @${width}`).toEqual([]);
      expect(await overflow(), `débordement ${url} @${width}`).toBeLessThanOrEqual(0);
    }
  }

  // Ajouter ou rattacher : l'évaluation du module est listée avec les notes exigées.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${setup.moduleUrl}/assessments/add`);
  await expect(page.getByRole("heading", { name: "Les évaluations du module" })).toBeVisible();
  await expect(page.getByText(/Notes exigées par l’école/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(`Ouvrir : Évaluation ${suffix}`) }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Depuis la bibliothèque" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Une note de l’école" })).toBeVisible();
});
