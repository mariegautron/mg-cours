import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-62 : lier des ressources à une séance avec recherche, filtres et création inline", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();

  const create = async (title: string, kind: string) => {
    await page.goto("/resources/new");
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Type").selectOption(kind);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  };
  const cours = `Cours éthique ${stamp}`;
  const atelier = `Atelier audit ${stamp}`;
  await create(cours, "course");
  await create(atelier, "workshop");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module picker ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  // Retenir l'atelier pour ce module.
  await page.goto("/resources?q=" + encodeURIComponent(atelier));
  await page
    .getByLabel("Ajouter au module…")
    .selectOption({ label: `Module picker ${stamp} (2026)` });
  await page.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText(/Ressource retenue pour/)).toBeVisible();

  await page.goto(`${moduleUrl}/courses/new`);
  await page.getByLabel("Titre de la séance").fill("Séance avec ressources");

  // Recherche sans tenir compte des accents ni de la casse.
  const search = page.getByLabel("Rechercher une ressource");
  await search.fill(`ETHIQUE ${stamp}`);
  await expect(page.getByLabel(cours)).toBeVisible();
  await expect(page.getByLabel(atelier)).toHaveCount(0);
  await page.getByLabel(cours).check();

  // La sélection survit au filtrage.
  await search.fill(String(stamp));
  await page.getByRole("combobox", { name: "Type", exact: true }).selectOption("workshop");
  await expect(page.getByLabel(cours)).toHaveCount(0);
  await expect(page.getByLabel(atelier)).toBeVisible();
  await expect(page.getByRole("group", { name: "Retenues du module" })).toBeVisible();
  await page.getByLabel("Retenues du module", { exact: true }).check();
  await page.getByLabel(atelier).check();
  await expect(page.getByText(/2 liées à la séance/)).toBeVisible();

  // Création inline : liée immédiatement, « à construire ».
  await page.getByText("Créer une ressource", { exact: true }).click();
  const inline = `TP inline ${stamp}`;
  await page.getByLabel("Titre de la nouvelle ressource").fill(inline);
  await page.getByRole("button", { name: "Créer et lier" }).click();
  await expect(page.getByText(/créée \(à construire\) et liée/)).toBeVisible();
  await expect(page.getByText(/3 liées à la séance/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  await expect(page).toHaveURL(/\/courses(\/[0-9a-f-]{36})?$/);
  for (const title of [cours, atelier, inline]) {
    await expect(page.getByText(title).first()).toBeVisible();
  }
});
