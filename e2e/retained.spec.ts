import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-55 : retenir une ressource pour un module, la retrouver en tête de séance, la retirer", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const stamp = Date.now();

  await page.goto("/modules/new");
  const moduleName = `Module retenues ${stamp}`;
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto("/resources/new");
  const title = `Ressource retenue ${stamp}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption("course");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

  // Depuis la fiche ressource.
  await page.getByRole("button", { name: /Ajouter au module/ }).click();
  await page.getByLabel("Ajouter au module…").selectOption({ label: `${moduleName} (2026-2027)` });
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText(`Ressource retenue pour « ${moduleName} ».`)).toBeVisible();

  // Sur le module : section « Ressources retenues ».
  await page.goto(`${moduleUrl}/courses`);
  const section = page.getByRole("region", { name: /Ressources retenues \(1\)/ });
  await expect(section.getByRole("link", { name: title })).toBeVisible();

  // Proposée en premier quand on lie une séance.
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  const group = page.getByRole("group", { name: "Retenues du module" });
  await expect(group.getByLabel(title)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Retirer.
  await page.goto(`${moduleUrl}/courses`);
  await page.getByRole("button", { name: `Ne plus retenir ${title}` }).click();
  await expect(page.getByRole("region", { name: /Ressources retenues \(0\)/ })).toBeVisible();
});
