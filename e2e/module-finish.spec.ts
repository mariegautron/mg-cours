import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Terminer le module : liste de vérification, mot privé, rangement.
test("terminer le module : ce qu'il reste, ce que je retiens, ranger", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const name = `Module à terminer ${Date.now()}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/finish`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Terminer le module", level: 1 })).toBeVisible();
  await expect(page.getByText("Toutes les séances sont faites")).toBeVisible();
  await expect(page.getByText("Facture envoyée et payée")).toBeVisible();
  await expect(page.getByText("Rien n’est bloquant")).toBeVisible();
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "docs/captures/terminer-module.png" });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  const retro = page.getByLabel("Ce que je retiens de ce module");
  if (await retro.count()) await retro.fill("Commencer le projet dès la séance 1.");
  await page.getByRole("button", { name: "Terminer et ranger" }).click();
  await page.waitForURL("**/modules");
  await expect(page.getByText(`« ${name} » est terminé.`)).toBeVisible();
});
