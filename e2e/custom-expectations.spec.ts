import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Attendus ajoutés à la main : ajout, présence dans le rapprochement, modification, suppression.
test("attendu ajouté à la main : rapprochement, modification, suppression, axe", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Attendus main ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/expectations`);
  await page.getByLabel("Ajouter un attendu").fill("- Savoir animer un atelier zorglub");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Savoir animer un atelier zorglub")).toBeVisible();
  await expect(page.getByText("Ajouté par l’intervenante").first()).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto(`${moduleUrl}/matching`);
  const region = page.getByRole("region", { name: /Savoir animer un atelier zorglub/ });
  await expect(region.getByText("Ajouté par l’intervenante")).toBeVisible();

  await page.goto(`${moduleUrl}/expectations`);
  await page.getByRole("button", { name: /Modifier l’attendu « Savoir animer/ }).click();
  await page.getByLabel("Modifier l’attendu").fill("Savoir animer un atelier zorglub en équipe");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Savoir animer un atelier zorglub en équipe")).toBeVisible();

  await page.getByRole("button", { name: /Supprimer l’attendu/ }).click();
  await expect(page.getByText("Aucun attendu ajouté pour l’instant.")).toBeVisible();
});
