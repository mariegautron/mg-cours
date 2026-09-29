import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-56 : la recherche porte sur le contenu et les tags, sans accent ni casse, avec extrait", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();

  const title = `Support sobriété ${stamp}`;
  await page.goto("/resources/new");
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption("course");
  await page.getByLabel("Tags").fill(`écoconception${stamp}`);
  await page
    .getByLabel("Contenu (Markdown)")
    .fill(`# Plan\n\nOn évoque la **frugalité** numérique${stamp}.`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

  // Liste : contenu (sans accent, en majuscules) → extrait mis en évidence.
  await page.goto(`/resources?q=${encodeURIComponent(`FRUGALITE numerique${stamp}`)}`);
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card.getByText(/Contenu :/)).toBeVisible();
  await expect(card.locator("mark")).toHaveText("frugalité");

  // Liste : tag sans accent.
  await page.goto(`/resources?q=${encodeURIComponent(`ecoconception${stamp}`)}`);
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  await expect(page.getByText(/Tag :/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Sélecteur de séance.
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module recherche ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.goto(`${page.url()}/courses/new`);
  await page.getByLabel("Rechercher une ressource").fill(`frugalite numerique${stamp}`);
  await expect(page.getByLabel(title)).toBeVisible();
  await expect(page.getByText(/Contenu :/)).toBeVisible();
  await page.getByLabel("Rechercher une ressource").fill(`introuvable${stamp}`);
  await expect(page.getByLabel(title)).toHaveCount(0);
});
