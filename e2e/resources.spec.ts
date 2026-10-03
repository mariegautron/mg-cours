import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
// Identifiants du seed.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

test("crée une ressource et la retrouve dans la liste", async ({ page }) => {
  await login(page);

  await page.goto("/resources");
  await expect(page.getByRole("heading", { name: "Bibliothèque", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Nouvelle ressource" }).first().click();
  const title = `Scrum – bases ${Date.now()}`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption("course");
  await page.getByLabel("Description").fill("Cérémonies et rôles Scrum.");
  await page.getByLabel("Tags").fill("agile, scrum");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(page.getByText("Pas encore utilisée dans un module.")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto("/resources");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("classe une ressource (type, matière, visibilité), filtre et regroupe la liste", async ({
  page,
}) => {
  await login(page);
  const stamp = Date.now();
  const subject = `Matière ${stamp}`;
  const title = `Notes de préparation ${stamp}`;

  await page.goto("/resources/new");
  await page.getByLabel("Titre").fill(title);
  // Type obligatoire : le formulaire refuse l'envoi sans type.
  await expect(page.getByLabel("Type")).toHaveAttribute("required", "");
  await page.getByLabel("Type").selectOption("teacher_notes");
  await expect(page.getByRole("radio", { name: /Enseignante uniquement/ })).toBeChecked();
  await page.getByLabel("Matière").fill(subject);
  await openTab(page, "Aperçu");
  await expect(page.getByText("Rien à afficher pour l’instant.")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  await expect(page.getByText("Enseignante uniquement").first()).toBeVisible();
  // Pas de bouton « Présenter » pour une ressource enseignante.
  await expect(page.getByRole("link", { name: "Présenter" })).toHaveCount(0);

  // Filtres Type / Matière / Visibilité + regroupement par matière.
  await page.goto("/resources");
  await page.getByLabel("Type").selectOption("teacher_notes");
  await page.getByLabel("Matière").selectOption(subject);
  await page.getByLabel("Visibilité").selectOption("teacher");
  await page.getByLabel("Regrouper").selectOption("category");
  await page.getByRole("button", { name: "Filtrer" }).click();

  await expect(page).toHaveURL(/audience=teacher/);
  await expect(page.getByRole("heading", { name: new RegExp(subject), level: 2 })).toBeVisible();
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card.getByText("Enseignante uniquement")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("1 ressource");

  // Regroupement par type.
  await page.getByLabel("Regrouper").selectOption("kind");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page.getByRole("heading", { name: /^Notes/, level: 2 })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Visibilité étudiant·es : la ressource disparaît.
  await page.goto(`/resources?audience=students&category=${encodeURIComponent(subject)}`);
  await expect(page.getByRole("status")).toHaveText("0 ressource");
});

test("US-57 : note une ressource à construire, la filtre et l'enregistre depuis le formulaire", async ({
  page,
}) => {
  await login(page);
  const title = `TP de démonstration ${Date.now()}`;

  await page.goto("/resources");
  await page.getByLabel("Ressource à construire").fill(title);
  await expect(page.locator("#draft-note")).toHaveCount(1);
  await page.locator("#draft-note").fill("Un TP sur les tests d’accessibilité.");
  await page.getByRole("button", { name: "Noter à construire" }).click();

  await page.goto(`/resources?status=progress&q=${encodeURIComponent(title)}`);
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card.getByText("À construire", { exact: true })).toBeVisible();

  await card.click();
  await expect(page.getByText("Un TP sur les tests d’accessibilité.")).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.goto(`/resources?status=ready&q=${encodeURIComponent(title)}`);
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
});
