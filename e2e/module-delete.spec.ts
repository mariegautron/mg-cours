import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Supprimer un module : nom à retaper, message de confirmation, le module disparaît de la liste.
test("supprimer un module : confirmation par le nom, puis plus de trace", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  const name = `Module à supprimer ${Date.now()}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/documents`);
  await page.getByRole("button", { name: "Supprimer le module" }).click();
  const dialog = page.getByRole("alertdialog");
  const confirm = dialog.getByRole("button", { name: "Supprimer définitivement" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(/retape le nom/).fill("autre nom");
  await expect(confirm).toBeDisabled();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
  await dialog.getByLabel(/retape le nom/).fill(name.toLowerCase());
  await confirm.click();

  await page.waitForURL(/\/modules\?deleted=/);
  await expect(page.getByText(`Module « ${name} » supprimé.`)).toBeVisible();
  await expect(page.getByRole("link", { name })).toHaveCount(0);
  await page.goto(moduleUrl);
  await expect(
    page.getByRole("heading", { name: "Cette page n’existe pas", level: 1 }),
  ).toBeVisible();
});
