import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Règles par école (US-162) : création d'une école, puis ses règles.
test("règles par école : enregistrement, validation du modèle d'adresse, axe", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const name = `École règles ${Date.now()}`;
  await page.goto("/settings/schools/new");
  await page.getByLabel(/^Nom/).fill(name);
  await page.getByRole("button", { name: "Créer l’école" }).click();
  await page.waitForURL(/\/settings(\?|$)/);

  const form = page.getByRole("form", { name });
  await expect(form).toBeVisible();
  await form.getByLabel("Rattrapage individuel").check();
  await form.getByLabel("Adresse e-mail des étudiant·es").fill("{prenom}.{surnom}@ecole.fr");
  await form.getByRole("button", { name: "Enregistrer les règles" }).click();
  await expect(form.getByText(/Variable inconnue/)).toBeVisible();

  await form.getByLabel("Adresse e-mail des étudiant·es").fill("{prenom}.{nom}@ecole.fr");
  await form.getByLabel(/Longueur maximale/).fill("300");
  await form.getByRole("button", { name: "Enregistrer les règles" }).click();
  await expect(form.getByText("Règles enregistrées.")).toBeVisible();

  await page.reload();
  const again = page.getByRole("form", { name });
  await expect(again.getByLabel("Rattrapage individuel")).toBeChecked();
  await expect(again.getByLabel(/Longueur maximale/)).toHaveValue("300");
  await expect(again.getByText(/Exemple : eloise\.dupont-martin@ecole\.fr/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
