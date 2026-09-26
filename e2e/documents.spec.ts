import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("dépose, télécharge et supprime les attendus de l’école d’un module", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Documents ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Déposer un fichier \(attendus/).setInputFiles({
    name: "attendus-ecole.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await page.getByRole("button", { name: "Déposer", exact: true }).first().click();
  await expect(page.getByText("attendus-ecole.pdf").first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: /Télécharger attendus-ecole\.pdf/ }).click();
  expect((await download).suggestedFilename()).toBe("attendus-ecole.pdf");

  await page.getByRole("button", { name: /Supprimer attendus-ecole\.pdf/ }).click();
  await expect(page.getByText("attendus-ecole.pdf")).toHaveCount(0);
});
