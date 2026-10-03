import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";
import { importBank, prepareLinks } from "./quiz-setup";

// Générer un QCM depuis les questions liées à une ressource : réserve, règles, tirages dans la réserve.
test("QCM généré depuis une ressource : tirage au sort, réserve, copies préparées", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await loginLight(page);
  const suffix = Date.now();
  await importBank(page, suffix, 4, 0);

  await page.goto("/resources/new");
  const title = `Cours QCM ${suffix}`;
  await page.getByLabel("Titre", { exact: true }).fill(title);
  await page.getByLabel("Type").selectOption("course");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await page.getByText("Lier des questions").click();
  await page.getByLabel("Chercher une question").fill(`QCM${suffix}_`);
  for (const n of [1, 2, 3, 4]) {
    await page.getByRole("checkbox", { name: new RegExp(`QCM${suffix}_${n}`) }).check();
  }
  await page.getByRole("button", { name: "Enregistrer les liens" }).click();
  await expect(page.getByText("Liens enregistrés.")).toBeVisible();

  await createSimpleGrid(page, `Grille Gén ${suffix}`, [["Structure", 4]]);
  const setup = await createAssessment(page, `Grille Gén ${suffix}`, suffix, {
    firstNames: ["Ana", "Zoé"],
  });
  await page.goto(`${setup.assessmentUrl}/quiz/generate`);
  await page.getByRole("checkbox", { name: new RegExp(title) }).check();
  await page.getByLabel("Nombre de questions").fill("2");
  await page.getByRole("button", { name: "Tirer au sort" }).click();
  await expect(page.getByText("2 questions tirées.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /3\. Le QCM \(2 questions\)/ })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole("button", { name: "Créer le QCM" }).click();
  await page.waitForURL(/\/quiz$/);
  await expect(page.getByText(/pioche dans 2 questions choisies/)).toBeVisible();

  await page.getByRole("button", { name: "Publier le QCM" }).click();
  await expect(page.getByText("Publié", { exact: true })).toBeVisible();
  const links = await prepareLinks(page);
  expect(Object.keys(links)).toHaveLength(2);
});
