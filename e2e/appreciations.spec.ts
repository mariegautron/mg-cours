import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// US-149a : appréciations écrites à la main, limite, enregistrement automatique, copie.
test("appréciations : saisie, limite, enregistrement, relecture, axe", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const suffix = Date.now();
  const student = `Appre${suffix}`;

  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Élève");
  await page.getByLabel("Nom", { exact: true }).fill(student);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/students/);
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Appréciations ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.goto(`${moduleUrl}/groups/new`);
  await page.getByLabel("Nom du groupe").fill(`Groupe ${suffix}`);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Élève ${student}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();
  await expect(page.getByText("Membres (1)")).toBeVisible();

  await page.goto(`${moduleUrl}/appreciations`);
  const field = page.getByLabel(`Appréciation de Élève ${student}`);
  await expect(field).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("À écrire", { exact: true })).toBeVisible();

  // Trop long : refusé avec le nombre de caractères en trop, rien n'est enregistré.
  await field.fill("x".repeat(260));
  await expect(page.getByText(/10 caractères en trop/).first()).toBeVisible();
  await expect(page.getByRole("listitem").getByRole("alert")).toContainText(
    "10 caractères en trop",
    { timeout: 8000 },
  );

  await field.fill("Travail sérieux et régulier.");
  await expect(
    page.getByRole("status").filter({ hasText: /enregistrée à \d{2}:\d{2}/ }),
  ).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Écrite", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Copier l’appréciation de/ }).click();
  await expect(page.getByText(/Appréciation de .* copié\./)).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${student.toUpperCase()} Élève : Travail sérieux et régulier.`,
  );

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.reload();
  await expect(page.getByLabel(`Appréciation de Élève ${student}`)).toHaveValue(
    "Travail sérieux et régulier.",
    { timeout: 20_000 },
  );
});
