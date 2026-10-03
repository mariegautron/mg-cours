import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
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

test("apparence, taille du texte, export et compte", async ({ page }) => {
  await login(page);
  await page.goto("/settings");
  const theme = page.getByRole("radiogroup", { name: "Thème" });
  await theme.getByText("Clair", { exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(theme.getByRole("radio", { name: "Clair" })).toBeChecked();
  await theme.getByText("Sombre", { exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const size = page.getByRole("radiogroup", { name: "Taille du texte" });
  await size.getByText("Plus grand", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await expect(page.getByRole("status").filter({ hasText: "Taille du texte" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");
  await page.getByRole("radiogroup", { name: "Taille du texte" }).getByText("Texte normal").click();
  await expect(page.locator("html")).toHaveAttribute("data-text-size", "normal");

  const res = await page.request.get("/api/export");
  expect(res.status()).toBe(200);
  expect(Object.keys(await res.json())).toContain("teacher_profile");

  await page.getByLabel("Nouveau mot de passe").fill("court");
  await page.getByLabel("Confirmer le mot de passe").fill("court");
  await page.getByRole("button", { name: "Changer le mot de passe" }).click();
  await expect(page.getByText(/au moins 8 caractères/)).toBeVisible();

  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({ path: "docs/captures/reglages.png", fullPage: true });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.waitForURL("**/login");
});
