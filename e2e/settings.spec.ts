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

test("enregistre le profil et ajoute une école", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Réglages", level: 1 })).toBeVisible();
  await expect(page.getByText(/Profil complété à \d+ %/)).toBeVisible();

  // SIRET dont la clé de contrôle est invalide (14 chiffres, mais pas de Luhn).
  await page.getByLabel("SIRET").first().fill("123 456 789 00099");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Ce SIRET n’est pas valide (clé de contrôle).")).toBeVisible();

  await page.getByLabel("SIRET").first().fill("123 456 789 00007");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Modifications enregistrées")).toBeVisible();

  await page.getByLabel("SIRET").first().fill("123");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Le SIRET compte 14 chiffres.")).toBeVisible();
  await page.getByLabel("SIRET").first().fill("123 456 789 00007");

  // L'IBAN se regroupe par 4 au fur et à mesure de la saisie.
  await page.getByLabel("IBAN").fill("FR7630006000011234567890189");
  await expect(page.getByLabel("IBAN")).toHaveValue("FR76 3000 6000 0112 3456 7890 189");
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByText("Modifications enregistrées")).toBeVisible();

  await page.getByRole("link", { name: "Ajouter une école" }).click();
  const name = `École test ${Date.now()}`;
  await page.getByLabel("Nom de l’école").fill(name);
  await page.getByRole("button", { name: "Créer l’école" }).click();
  await expect(page.getByText(`École « ${name} » enregistrée.`)).toBeVisible();

  // Garde-fou : quitter une modification non enregistrée demande confirmation.
  await page.getByRole("link", { name: `Modifier ${name}` }).click();
  await expect(page.getByRole("heading", { name: `Modifier « ${name} »` })).toBeVisible();
  await page.getByLabel("Adresse").fill("Nantes");
  await page.getByRole("link", { name: "Annuler" }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Abandonner les modifications ?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuer la saisie" }).click();
  await expect(page.getByLabel("Adresse")).toHaveValue("Nantes");
  await page.getByRole("link", { name: "Annuler" }).click();
  await page.getByRole("button", { name: "Abandonner" }).click();
  await expect(page.getByRole("heading", { name: "Réglages", level: 1 })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
