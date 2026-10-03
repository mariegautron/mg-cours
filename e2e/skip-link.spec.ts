import { expect, test } from "@playwright/test";

// Lecture seule. RGAA 12.7 / WCAG 2.4.1 : lien d'évitement en premier, visible au focus.
test("le lien « Aller au contenu » est le premier arrêt clavier et déplace le focus sur le contenu", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.locator("#contenu")).toBeFocused();
});
