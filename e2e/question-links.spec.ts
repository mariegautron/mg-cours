import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";
import { importBank } from "./quiz-setup";

// Lier des questions à une ressource (depuis la ressource et depuis la question), affichage dans la banque.
test("questions liées : depuis la ressource, depuis la question, banque, axe", async ({ page }) => {
  test.setTimeout(180_000);
  await loginLight(page);
  const suffix = Date.now();
  await importBank(page, suffix, 3, 1);

  await page.goto("/resources/new");
  const title = `Cours lié ${suffix}`;
  await page.getByLabel("Titre", { exact: true }).fill(title);
  await page.getByLabel("Type").selectOption("course");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  const resourceUrl = page.url();

  await expect(page.getByRole("heading", { name: "Questions liées (0)" })).toBeVisible();
  await page.getByText("Lier des questions").click();
  await page.getByLabel("Chercher une question").fill(`QCM${suffix}_1`);
  await page.getByRole("checkbox", { name: new RegExp(`QCM${suffix}_1`) }).check();
  await page.getByRole("button", { name: "Enregistrer les liens" }).click();
  await expect(page.getByText("Liens enregistrés.")).toBeVisible();
  await page.goto(resourceUrl);
  await expect(page.getByRole("heading", { name: "Questions liées (1)" })).toBeVisible();
  await expect(page.getByRole("link", { name: `QCM${suffix}_1` })).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Banque : la ressource d'origine apparaît.
  await page.goto(`/questions?q=QCM${suffix}_1`);
  await expect(page.getByText(`Ressource d’origine : ${title}`)).toBeVisible();

  // Depuis la question : lier une seconde question, retirer le lien de la première.
  await page.goto(`/questions?q=QCM${suffix}_2`);
  await page
    .getByRole("link", { name: new RegExp(`QCM${suffix}_2`) })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Ressource d’origine" })).toBeVisible();
  await page.getByText("Lier à des ressources").click();
  await page.getByLabel("Chercher une ressource à lier").fill(title);
  await page.getByRole("checkbox", { name: new RegExp(title) }).check();
  await page.getByRole("button", { name: "Enregistrer les liens" }).click();
  await expect(page.getByText("Liens enregistrés.")).toBeVisible();
  await page.goto(resourceUrl);
  await expect(page.getByRole("heading", { name: "Questions liées (2)" })).toBeVisible();
});
