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
  await page.getByRole("heading", { level: 1 }).first().waitFor();
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
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  await openTab(page, /Séances/);
  const startHref = await page
    .getByRole("link", { name: /^Faire cours : Séance présentée/ })
    .getAttribute("href");
  const href = startHref!.replace("/modules/", "/present/modules/").replace(/\/start$/, "");

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

  // US-134 : « Pour moi » n'affiche qu'en privé, la classe garde sa diapositive.
  await presenter.getByRole("button", { name: `Pour moi : ${lesson}` }).click();
  await expect(presenter.getByText(/cette diapositive n’est pas projetée/)).toBeVisible();
  await expect(page.getByText(/Diapositive 3 sur/)).toBeVisible();
  await presenter.getByRole("button", { name: "Revenir à la diapositive projetée" }).click();

  // Aller directement à : un numéro projette cette diapositive.
  await presenter.getByLabel("Un titre ou un numéro de diapositive").fill("2");
  await presenter.keyboard.press("Enter");
  await expect(page.getByText(/Diapositive 2 sur/)).toBeVisible();

  // Le corrigé se déplie dans la vue privée seulement.
  await presenter.getByRole("button", { name: `Afficher le corrigé : ${answerKey}` }).click();
  await expect(presenter.getByText("Réponse cachée.")).toBeVisible();
  expect(await page.content()).not.toContain("Réponse cachée");

  // Note de séance datée, enregistrée sans table dédiée.
  await presenter.getByLabel("Ajouter une note").fill("Insister sur la valeur");
  await presenter.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(presenter.getByText("Note enregistrée.")).toBeVisible();
  await expect(presenter.getByText(/\] Insister sur la valeur/)).toBeVisible();
  expect(await page.content()).not.toContain("Insister sur la valeur");

  // US-136 : la projection est retenue et relue à la clôture (statut en mots, ressource projetée).
  const notebookUrl = href!.replace("/present", "") + "/notebook";
  await expect(async () => {
    await presenter.goto(notebookUrl);
    await expect(presenter.getByText(/Relevé de la projection/)).toBeVisible({ timeout: 2000 });
    await expect(presenter.getByText(`Projeté à`, { exact: false }).first()).toBeVisible({
      timeout: 2000,
    });
  }).toPass({ timeout: 20_000 });
  await expect(presenter.getByText(lesson).first()).toBeVisible();
  await presenter.goto(`${href}/presenter`);
  await presenter.waitForLoadState("networkidle");

  const axe = await new AxeBuilder({ page: presenter })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
