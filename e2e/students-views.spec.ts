import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture + création d'une personne : tuiles / liste, indicateurs, fiche en sections, axe.
test("étudiant·es : tuiles et liste, fiche avec notes, présences, appréciations, rendus", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const suffix = Date.now();
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Inès");
  await page.getByLabel("Nom", { exact: true }).fill(`Vue${suffix}`);
  await page.getByLabel("E-mail").fill(`ines.${suffix}@ynov.com`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("link", { name: new RegExp(`Vue${suffix}`) }).click();
  await expect(page.getByRole("heading", { name: `Inès Vue${suffix}`, level: 1 })).toBeVisible();
  for (const name of [
    "Notes par module",
    "Présences",
    "Appréciations",
    "Rendus",
    "Journal d’observations",
  ]) {
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
  }
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "docs/captures/etudiant-fiche.png", fullPage: true });
  }
  const fiche = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(fiche.violations).toEqual([]);

  await page.goto("/students");
  const views = page.getByRole("navigation", { name: "Affichage de la liste" });
  await expect(views.getByRole("link", { name: "Liste" })).toHaveAttribute("aria-current", "page");
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "docs/captures/etudiants-liste.png" });
  }
  await views.getByRole("link", { name: "Trombinoscope" }).click();
  await page.waitForURL("**/students?view=tiles");
  await expect(page.getByRole("link", { name: new RegExp(`Vue${suffix}`) })).toBeVisible();
  const list = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(list.violations).toEqual([]);
});
