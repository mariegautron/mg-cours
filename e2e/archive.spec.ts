import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("archive un module : masqué de la liste puis visible dans l’onglet « Rangés »", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  const name = `Module archivable ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2025");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  await openTab(page, /Administratif/);
  await page.getByRole("button", { name: "Archiver le module" }).click();
  await expect(page.getByRole("button", { name: "Restaurer le module" })).toBeVisible();
  // US-131 : état « Module terminé » de la page.
  await expect(page.getByRole("heading", { name: "Module terminé", level: 2 })).toBeVisible();
  const done = await new AxeBuilder({ page })
    .exclude("[data-sonner-toaster]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(done.violations).toEqual([]);

  await page.goto("/modules");
  await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);

  await page.getByRole("link", { name: /^Rangés \(\d+\)$/ }).click();
  await expect(page.getByRole("link", { name: /^Rangés/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();

  await page.getByRole("link", { name: /^Tous/ }).click();
  await expect(page.getByRole("heading", { name: "Rangés", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();

  await page.goto("/billing");
  await expect(page.getByText(name)).toHaveCount(0);
});

test("US-160 : terminer un module depuis la liste, avec annulation pendant 10 secondes", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  const name = `Module à terminer ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2025");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  await page.goto("/modules");
  await page.getByRole("button", { name: `Terminer le module : ${name}` }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByText(`Terminer « ${name} » ?`)).toBeVisible();
  await dialog.getByRole("button", { name: "Terminer et ranger" }).click();
  await expect(page.getByText(`« ${name} » est rangé.`)).toBeVisible();
  await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);

  // Annuler pendant les 10 secondes : le module revient dans « En cours ».
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
});
