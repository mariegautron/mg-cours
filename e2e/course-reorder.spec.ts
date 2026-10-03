import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-61 : monter / descendre une séance au clavier depuis le menu « ⋯ », renumérotation, plus de champ Position", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Ordre ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  for (const title of ["Alpha", "Bravo", "Charlie"]) {
    await page.goto(`${moduleUrl}/courses/new`);
    await expect(page.getByLabel("Position")).toHaveCount(0);
    await page.getByLabel("Titre de la séance").fill(title);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  }

  await openTab(page, /Séances/);
  // La liste étroite montre toutes les séances ; la séance ouverte porte monter / descendre.
  const list = page.getByRole("complementary", { name: /Les 3 séances/ });
  const titles = list.getByRole("listitem");
  await expect(titles).toHaveCount(3);
  await expect(titles.nth(0)).toContainText("Alpha");
  await expect(titles.nth(1)).toContainText("Bravo");
  await expect(titles.nth(2)).toContainText("Charlie");

  // Alpha ne peut pas monter, Charlie ne peut pas descendre.
  await list.getByRole("link", { name: /Alpha/ }).click();
  await expect(page.getByRole("button", { name: "Monter la séance 1" })).toBeDisabled();
  await list.getByRole("link", { name: /Charlie/ }).click();
  await expect(page.getByRole("button", { name: "Descendre la séance 3" })).toBeDisabled();

  // Au clavier : Charlie monte deux fois.
  await page.getByRole("button", { name: "Monter la séance 3" }).focus();
  await page.keyboard.press("Enter");
  await expect(titles.nth(1)).toContainText("Charlie");
  await expect(page.getByRole("status").filter({ hasText: "séance 2 sur 3" })).toHaveCount(1);
  await page.getByRole("button", { name: "Monter la séance 2" }).focus();
  await page.keyboard.press("Enter");
  await expect(titles.nth(0)).toContainText("Charlie");
  await expect(titles.nth(1)).toContainText("Alpha");
  await expect(titles.nth(2)).toContainText("Bravo");

  // Supprimer demande confirmation ; « Annuler » ne supprime rien.
  await list.getByRole("link", { name: /Bravo/ }).click();
  await expect(page.getByRole("heading", { name: "Bravo", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /^Supprimer/ }).click();
  await expect(page.getByRole("alertdialog", { name: "Supprimer la séance 3 ?" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(titles).toHaveCount(3);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // L'ordre persiste et le titre se change dans la séance ouverte (enregistrement automatique).
  await page.goto(`${moduleUrl}/courses`);
  await page.waitForURL(/\/courses\/[0-9a-f-]{36}$/);
  await list.getByRole("link", { name: /Alpha/ }).click();
  // Avant l'hydratation, une saisie est perdue : on recommence jusqu'à l'annonce d'enregistrement.
  await expect(async () => {
    await page.getByLabel("Titre de la séance").fill("Alpha 2");
    await expect(page.getByText(/^Enregistré à \d\d:\d\d$/)).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
  await page.reload();
  await expect(titles.nth(0)).toContainText("Charlie");
  await expect(titles.nth(1)).toContainText("Alpha 2");
  await expect(titles.nth(2)).toContainText("Bravo");
});
