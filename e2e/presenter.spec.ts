import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function createResource(page: Page, title: string, kind: string, content: string) {
  await page.goto("/resources/new");
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption(kind);
  await page.getByLabel("Contenu (Markdown)").fill(content);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
}

test("US-64 : vue présentatrice synchronisée avec la fenêtre projetée, sans fuite vers l'écran", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

  const lesson = `Support ${stamp}`;
  const answerKey = `Corrigé secret ${stamp}`;
  await createResource(page, lesson, "course", "# Premier point\n\nTexte.\n\n---\n\nSecond point.");
  await createResource(page, answerKey, "answer_key", "Réponse cachée.");

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Présentatrice ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Titre de la séance").fill("Séance présentée");
  await page.getByLabel("Date", { exact: true }).fill(today);
  await page.getByLabel("Début").fill("00:00");
  await page.getByLabel("Fin").fill("23:59");
  await page.getByLabel("Modalités d’animation").fill("Commencer par un tour de table.");
  await page.getByLabel("Rechercher une ressource").fill(String(stamp));
  await page.getByLabel(lesson).check();
  await page.getByLabel(answerKey).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/#courses$/);
  await openTab(page, /Séances/);
  const href = await page
    .getByRole("link", { name: /^Faire cours : Séance présentée/ })
    .getAttribute("href");

  // Fenêtre projetée.
  await page.goto(href!);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /Séance présentée/ }).first()).toBeVisible();

  // Fenêtre présentatrice, dans le même navigateur.
  const presenter = await context.newPage();
  await presenter.emulateMedia({ reducedMotion: "reduce" });
  await presenter.goto(`${href}/presenter`);
  await presenter.waitForLoadState("networkidle");
  await expect(presenter.getByRole("heading", { name: /^Diapositive 1 sur \d+/ })).toBeVisible();
  await expect(presenter.getByText("Commencer par un tour de table.")).toBeVisible();
  await expect(presenter.getByRole("link", { name: new RegExp(answerKey) })).toBeVisible();
  await expect(presenter.getByText("Il reste", { exact: false })).toBeVisible();
  await expect(presenter.getByLabel("Heure à Paris")).toHaveText(/^\d{2}:\d{2}$/);

  // Rien de réservé ni de privé dans la fenêtre projetée.
  const projectedHtml = await page.content();
  for (const secret of [answerKey, "Réponse cachée", "tour de table"]) {
    expect(projectedHtml).not.toContain(secret);
  }

  // La présentatrice pilote la fenêtre projetée…
  await presenter.getByRole("button", { name: "Suivante" }).click();
  await expect(presenter.getByRole("heading", { name: /^Diapositive 2 sur/ })).toBeVisible();
  await expect(page.getByText(/Diapositive 2 sur/)).toBeVisible();

  // …et la fenêtre projetée renvoie sa diapositive à la présentatrice.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText(/Diapositive 3 sur/)).toBeVisible();
  await expect(presenter.getByRole("heading", { name: /^Diapositive 3 sur/ })).toBeVisible();

  const axe = await new AxeBuilder({ page: presenter })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
