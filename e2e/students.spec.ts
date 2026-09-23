import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("crée un·e étudiant·e, un groupe, et les relie", async ({ page }) => {
  await login(page);

  // Étudiant·e manuel·le.
  await page.goto("/students/new");
  const suffix = Date.now();
  await page.getByLabel("Prénom").fill("Léa");
  await page.getByLabel("Nom", { exact: true }).fill(`Martin${suffix}`);
  await page.getByLabel("E-mail").fill(`lea.martin.${suffix}@ynov.com`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: `Léa Martin${suffix}` })).toBeVisible();

  // Groupe sur le module exemple (seed).
  await page.goto("/modules");
  await page
    .getByRole("link", { name: /Méthodologies Agile/ })
    .first()
    .click();
  await page.getByRole("link", { name: "Ajouter un groupe" }).click();
  const groupName = `Groupe A ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();

  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Léa Martin${suffix}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();
  await expect(page.getByText("Membres (1)")).toBeVisible();
  await expect(page.getByRole("link", { name: `Léa Martin${suffix}` })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});

test("importe des étudiant·es depuis un CSV", async ({ page }) => {
  await login(page);
  await page.goto("/students/import");

  const suffix = Date.now();
  const csv = `Nom,Prénom,Email\nDupont,Jean,jean.dupont.${suffix}@ynov.com\nInvalide,,\n`;

  await page.setInputFiles("#file", {
    name: "etudiants.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  });
  await page.getByRole("button", { name: "Analyser le fichier" }).click();

  await expect(page.getByText("1 à importer")).toBeVisible();
  await expect(page.getByText("1 en erreur")).toBeVisible();

  await page.getByRole("button", { name: /Confirmer l’import/ }).click();
  await expect(page.getByText("1 étudiant·e importé·e.")).toBeVisible();
});
