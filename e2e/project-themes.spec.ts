import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("thèmes du projet : volontaire, tirage, nouveau tirage confirmé, thème en correction", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Thèmes ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  const groupNames = ["Alpha", "Beta", "Gamma"].map((n) => `${n} ${suffix}`);
  for (const name of groupNames) {
    await page.goto(`${moduleUrl}/groups/new`);
    await page.getByLabel("Nom du groupe").fill(name);
    await page.getByRole("button", { name: "Créer le groupe" }).click();
    await page.getByText(name).first().waitFor();
  }

  await page.goto(`${moduleUrl}/project`);
  await page.getByLabel("Titre du projet").fill("Refonte accessible");
  await page.getByRole("button", { name: "Créer le projet" }).click();
  await expect(page.getByRole("heading", { name: /Thèmes au choix/ })).toBeVisible();

  // Trois thèmes.
  for (const [i, title] of ["AssurLibre", "JustiFacile", "ClimActif"].entries()) {
    await page.getByRole("button", { name: "Ajouter un thème" }).click();
    await page.getByLabel(`Titre du thème ${i + 1}`).fill(title);
  }
  await page.getByRole("button", { name: "Enregistrer les thèmes" }).click();
  await expect(page.getByText("Thèmes enregistrés.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Thèmes au choix (3)" })).toBeVisible();

  // Alpha est volontaire pour ClimActif.
  await page.getByLabel(`Thème de ${groupNames[0]}`).selectOption({ label: "ClimActif" });
  await expect(page.getByText("Choix enregistré.")).toBeVisible();
  await expect(page.getByLabel(`Thème de ${groupNames[0]}`)).toHaveValue(/.+/);

  // Tirage pour Beta et Gamma : sans remise, donc AssurLibre et JustiFacile.
  await page.getByRole("button", { name: /Tirer au sort les groupes restants \(2\)/ }).click();
  await expect(page.getByText(/Tirage effectué pour 2 groupes \(graine/)).toBeVisible();
  const themeOf = async (name: string) =>
    page
      .getByLabel(`Thème de ${name}`)
      .evaluate((el: HTMLSelectElement) => el.selectedOptions[0].text);
  expect(await themeOf(groupNames[0])).toBe("ClimActif");
  expect([await themeOf(groupNames[1]), await themeOf(groupNames[2])].sort()).toEqual([
    "AssurLibre",
    "JustiFacile",
  ]);
  expect((await axe(page)).violations).toEqual([]);

  // Nouveau tirage : confirmation obligatoire, le volontaire est conservé.
  await page.getByRole("button", { name: "Refaire le tirage" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Les groupes volontaires");
  await page.getByRole("button", { name: "Annuler" }).click();
  // Attend la fin de l'animation de fermeture avant de rouvrir le dialogue.
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.getByRole("button", { name: "Refaire le tirage" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Refaire le tirage" }).click();
  await expect(page.getByText(/Tirage effectué pour 2 groupes/)).toBeVisible();
  expect(await themeOf(groupNames[0])).toBe("ClimActif");

  // Squelette, puis le thème apparaît sur la fiche de correction de l'oral.
  await page.getByRole("button", { name: "Créer 3 évaluations" }).click();
  await expect(page.getByText("3 évaluations créées.")).toBeVisible();
  await page.getByRole("link", { name: /Oral de fin de projet/ }).click();
  await expect(
    page
      .getByRole("form", { name: `Note du groupe « ${groupNames[0]} »` })
      .getByText("Thème : ClimActif"),
  ).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});
