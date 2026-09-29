import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("phrases réutilisables : enregistrer une sélection, insérer en un clic, ordre par usage", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Phrases ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix);

  const sentence = `Pense aux labels ${suffix}.`;
  const edited = `Texte modifié ${suffix}.`;
  const comment = page.getByLabel("Appréciation");
  await comment.fill(`Bon travail. ${sentence}`);
  // Sélection de la seconde phrase seulement.
  await comment.evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(13, el.value.length);
  });
  await page.getByRole("button", { name: "Enregistrer la sélection comme phrase" }).click();

  // Le formulaire reprend la sélection et propose la matière courante (nom du module).
  await expect(page.getByLabel("Texte de la phrase")).toHaveValue(sentence);
  await expect(page.getByLabel("Matière de la phrase")).toHaveValue(setup.moduleName);
  await page.getByLabel("Critère de la phrase").selectOption({ label: "Structure" });
  await page.getByRole("button", { name: "Enregistrer la phrase" }).click();
  await expect(page.getByText("Phrase enregistrée.")).toBeAttached();

  const phrase = page.getByRole("button", {
    name: new RegExp(`Insérer : ${sentence.replace(".", "\\.")}`),
  });
  await expect(phrase).toBeVisible();
  await expect(phrase).toContainText(`Structure · ${setup.moduleName}`);

  // Insertion en un clic, au curseur : le texte autour est conservé.
  await comment.fill("Début. Fin.");
  await comment.evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(7, 7);
  });
  await phrase.click();
  await expect(comment).toHaveValue(`Début. ${sentence} Fin.`);

  // Second clic : ajout de la même phrase, et compteur d'usage visible.
  await phrase.click();
  await expect(phrase).toContainText("utilisée 2 fois");

  // Filtre par critère : « Générales » ne montre pas cette phrase.
  await page.getByLabel("Critère", { exact: true }).selectOption({ label: "Générales" });
  await expect(phrase).toHaveCount(0);
  await page.getByLabel("Critère", { exact: true }).selectOption({ label: "Structure" });
  await expect(phrase).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Enregistrer la note, puis modifier la phrase : le commentaire déjà écrit ne change pas (copie).
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();
  const written = await comment.inputValue();

  await page.goto("/assessments/comments");
  await page
    .getByRole("listitem")
    .filter({ hasText: sentence })
    .getByRole("link", { name: "Modifier" })
    .click();
  await page.getByLabel("Texte", { exact: true }).fill(edited);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  const item = page.getByRole("listitem").filter({ hasText: edited });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Critère : Structure");

  await page.goto(setup.assessmentUrl);
  await expect(page.getByLabel("Appréciation")).toHaveValue(written);
  // L'usage a été compté côté serveur (au moins une des deux insertions).
  await expect(
    page.getByRole("button", { name: new RegExp(`Insérer : ${edited.replace(".", "\\.")}`) }),
  ).toContainText(/utilisée \d+ fois/);
});
