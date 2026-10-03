import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
}

async function createResource(page: Page, title: string, kind: string, content: string) {
  await page.goto("/resources/new");
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption(kind);
  await page.getByLabel("Contenu (Markdown)").fill(content);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  return page.url().split("/").pop()!;
}

test("faire cours : déroulé projeté d'une séance, sans les ressources enseignante", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Animations réduites : axe ne doit pas mesurer un contraste en plein fondu d'entrée.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  const stamp = Date.now();

  const lesson = `RACI ${stamp}`;
  await createResource(
    page,
    lesson,
    "course",
    "# Qui fait quoi ?\n\nLa matrice RACI.\n\n## Les quatre rôles\n\nR, A, C, I.\n\n---\n\nÀ vous de jouer.",
  );
  const answerKey = `Corrigé RACI ${stamp}`;
  const answerKeyId = await createResource(page, answerKey, "answer_key", "Réponse secrète.");
  // Un corrigé est « Enseignante uniquement » par défaut.
  await expect(page.getByText("Enseignante uniquement").first()).toBeVisible();

  await page.goto("/modules/new");
  const moduleName = `Gestion de projet ${stamp}`;
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByLabel("Présentation aux étudiant·es").fill("## Bienvenue\n\nOn va piloter.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill("Rôles et responsabilités");
  await page.getByLabel("Date", { exact: true }).fill("2099-01-15");
  await page.getByLabel("Objectifs pédagogiques").fill("Construire une matrice RACI");
  await page.getByLabel(lesson, { exact: true }).check();
  await page.getByLabel(answerKey, { exact: true }).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Ressources groupées par type sur la fiche module, corrigé repéré.
  await expect(page.getByText("Corrigé", { exact: true }).first()).toBeVisible();

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Faire cours : Rôles et responsabilités" }).click();
  await expect(page.getByRole("heading", { name: "Rôles et responsabilités" })).toBeVisible();
  await expect(page.getByText("Construire une matrice RACI")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Les quatre rôles" })).toBeVisible();
  // Garde-fou : le corrigé n'est jamais projeté.
  await expect(page.getByText("Réponse secrète.")).toHaveCount(0);
  await expect(page.getByText(answerKey)).toHaveCount(0);
  expect(await axe(page), "document").toEqual([]);

  // Mode diapositives au clavier.
  await page.getByRole("button", { name: "Diapositives" }).click();
  await expect(page.getByText(/^Diapositive 1 sur \d+/)).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/^Diapositive 2 sur \d+/)).toBeVisible();
  await page.keyboard.press("End");
  const counter = await page.getByText(/^Diapositive \d+ sur \d+/).textContent();
  const [, current, total] = counter!.match(/(\d+) sur (\d+)/)!;
  expect(current).toBe(total);
  await expect(page.getByRole("heading", { name: "Fin du module" })).toBeVisible();
  expect(await axe(page), "diapositives").toEqual([]);
  // Projecteur : le thème clair doit rester lisible.
  await page.getByRole("button", { name: /Changer de thème/ }).click();
  expect(await axe(page), "diapositives, autre thème").toEqual([]);

  await page.getByRole("link", { name: /Quitter/ }).click();
  await expect(page.getByRole("heading", { name: moduleName, level: 1 })).toBeVisible();

  // Présentation du module aux étudiant·es.
  await page.getByRole("link", { name: "Présenter le module" }).click();
  await page.waitForURL(/\/present\/modules\/[^/]+$/);
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Au programme" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comment vous serez évalué·es" })).toBeVisible();
  await expect(page.getByText(answerKey)).toHaveCount(0);
  expect(await axe(page), "module").toEqual([]);

  // Une ressource enseignante ne se projette pas, même par URL directe.
  await page.goto(`/present/resources/${answerKeyId}`);
  await expect(
    page.getByRole("heading", { name: "Ressource réservée à l’enseignante" }),
  ).toBeVisible();
  await expect(page.getByText("Réponse secrète.")).toHaveCount(0);
});
