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
  await page.getByRole("heading", { level: 1 }).first().waitFor();
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
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("À écrire", { exact: true })).toBeVisible({ timeout: 20_000 });
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "docs/captures/appreciations.png" });
  }
  await page.getByRole("link", { name: `Écrire l’appréciation de Élève ${student}` }).click();
  const field = page.getByLabel(`Appréciation de Élève ${student}`);
  await expect(field).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState("networkidle");

  // Trop long : refusé avec le nombre de caractères en trop, rien n'est enregistré.
  await field.fill("x".repeat(260));
  await expect(page.getByText(/10 caractères en trop/).first()).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "10 caractères en trop" })).toBeVisible({
    timeout: 8000,
  });

  await field.fill("Travail sérieux et régulier.");
  await expect(
    page.getByRole("status").filter({ hasText: /enregistrée à \d{2}:\d{2}/ }),
  ).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Écrite", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Copier pour Hyperplanning/ }).click();
  await expect(page.getByText(/Appréciation de .* copiée\./)).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${student.toUpperCase()} Élève : Travail sérieux et régulier.`,
  );
  if (process.env.CAPTURE) {
    await page.screenshot({ path: "docs/captures/appreciation-fiche.png" });
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.reload();
  await expect(page.getByLabel(`Appréciation de Élève ${student}`)).toHaveValue(
    "Travail sérieux et régulier.",
    { timeout: 20_000 },
  );

  // Retour à la liste : aperçu du texte, statut, export.
  await page.getByRole("link", { name: "← Toutes les appréciations" }).click();
  await expect(page.getByText("Travail sérieux et régulier.")).toBeVisible();
  await page.getByRole("button", { name: "Tout copier" }).click();
  await expect(page.getByText("Tout copié.")).toBeVisible();
});
