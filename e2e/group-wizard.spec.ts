import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Assistant « Constituer les groupes » : tirage puis création (crée des groupes dans un module jetable).
test("tirage en trois étapes, groupes créés, axe 0 violation", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const suffix = Date.now();
  for (const first of ["Ana", "Bob", "Cléo"]) {
    await page.goto("/students/new");
    await page.getByLabel("Prénom").fill(first);
    await page.getByLabel("Nom", { exact: true }).fill(`Wizard${suffix}`);
    await page
      .getByLabel("E-mail")
      .fill(`${first.toLowerCase().replace("é", "e")}.${suffix}@ynov.com`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: `${first} Wizard${suffix}` })).toBeVisible();
  }
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Assistant ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByLabel("Date de la 1re séance").fill("2026-10-12");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;

  await page.goto(`/modules/${id}/groups/wizard`);
  await expect(
    page.getByRole("heading", { name: "Comment constituer les groupes ?" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Tirage au sort" })).toBeVisible();
  await page.getByRole("button", { name: "Tirer au sort" }).click();
  await expect(page.getByText(/groupes?, écart de taille/)).toBeVisible();
  const res = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(res.violations).toEqual([]);
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Récapitulatif" })).toBeVisible();
  await page.getByRole("button", { name: "Créer les groupes" }).click();
  await expect(page.getByRole("heading", { name: /groupes? créés?/ })).toBeVisible();
});
