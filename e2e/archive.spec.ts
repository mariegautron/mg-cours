import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("archive un module : masqué de la liste puis visible dans l’onglet « Archivés »", async ({
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

  await page.getByRole("button", { name: "Archiver le module" }).click();
  await expect(page.getByRole("button", { name: "Restaurer le module" })).toBeVisible();

  await page.goto("/modules");
  await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);

  await page.getByRole("link", { name: /^Archivés \(\d+\)$/ }).click();
  await expect(page.getByRole("link", { name: /^Archivés/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();

  await page.getByRole("link", { name: /^Tous/ }).click();
  await expect(page.getByRole("heading", { name: "Archivés", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();

  await page.goto("/billing");
  await expect(page.getByText(name)).toHaveCount(0);
});
