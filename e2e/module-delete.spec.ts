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

// Trois accès à la suppression : onglet Documents, menu « ⋯ » de la liste, zone sensible de la fiche.
test("supprimer un module depuis la liste (⋯) et depuis la fiche (zone sensible)", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const stamp = Date.now();
  const make = async (name: string) => {
    await page.goto("/modules/new");
    await page.getByLabel("Nom du module").fill(name);
    await page.getByLabel("Année").fill("2026");
    await page.getByLabel("Nombre d’heures total").fill("21");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
    return page.url();
  };
  const nameA = `Module liste ${stamp}`;
  const nameB = `Module fiche ${stamp}`;
  await make(nameA);
  const urlB = await make(nameB);

  // Fiche : zone sensible.
  await page.goto(urlB);
  await page.getByRole("heading", { name: "Zone sensible" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Supprimer le module/ }).click();
  const dialogB = page.getByRole("alertdialog");
  await dialogB.getByLabel(/retape le nom/).fill(nameB);
  await dialogB.getByRole("button", { name: "Supprimer définitivement" }).click();
  await page.waitForURL(/\/modules\?deleted=/, { timeout: 60_000 });
  await expect(page.getByText(`Module « ${nameB} » supprimé.`)).toBeVisible();

  // Liste : menu « ⋯ » de la ligne.
  await page.goto("/modules?filter=to_prepare");
  await page.getByRole("button", { name: `Plus d’actions : ${nameA}` }).click();
  await page.getByRole("button", { name: `Supprimer le module : ${nameA}` }).click();
  const dialogA = page.getByRole("alertdialog");
  await dialogA.getByLabel(/retape le nom/).fill(nameA);
  await dialogA.getByRole("button", { name: "Supprimer définitivement" }).click();
  await page.waitForURL(/\/modules\?deleted=/, { timeout: 60_000 });
  await expect(page.getByText(`Module « ${nameA} » supprimé.`)).toBeVisible();
});
