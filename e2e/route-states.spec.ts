import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture seule : états de route (page introuvable, zone de statut de navigation).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("un module inexistant affiche « page introuvable » avec une issue, sans écran technique", async ({
  page,
}) => {
  await login(page);
  await page.goto("/modules/00000000-0000-0000-0000-000000000000");
  await expect(
    page.getByRole("heading", { name: "Cette page n’existe pas (ou plus)", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour au tableau de bord" })).toBeVisible();
  // La coque reste là : on n'est pas éjectée de l'application.
  await expect(page.getByRole("link", { name: "Modules" }).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("la coque expose une seule zone de statut pour l’annonce « Chargement… »", async ({
  page,
}) => {
  await login(page);
  await page.goto("/dashboard");
  const status = page.locator("[data-slot=navigation-status]");
  await expect(status).toHaveAttribute("aria-live", "polite");
  // Une seule zone d'annonce de navigation.
  await expect(page.locator("[data-slot=navigation-status]")).toHaveCount(1);
  await expect(status).toHaveText("");
  await expect(page.locator("[data-slot=navigation-progress]")).toBeHidden();
});
