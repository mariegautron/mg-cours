import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function fichePdf(lines: string[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  lines.forEach((line, i) => page.drawText(line, { x: 40, y: 780 - i * 20, size: 11, font }));
  return Buffer.from(await doc.save());
}

test("propose la présentation aux étudiant·es depuis la fiche, et confirme avant de remplacer", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/modules/new");
  await page.waitForLoadState("networkidle");
  const intro = page.getByLabel("Présentation aux étudiant·es");

  // Sans fiche déposée : pas de bouton, une explication.
  await expect(page.getByRole("button", { name: "Proposer un texte depuis la fiche" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Dépose d’abord la fiche pédagogique")).toBeVisible();

  await page.getByLabel(/Fiche pédagogique \(PDF/).setInputFiles({
    name: "fiche.pdf",
    mimeType: "application/pdf",
    buffer: await fichePdf([
      "FICHE PEDAGOGIQUE",
      "Intitule du module : Analyse des besoins",
      "Volume horaire total : 28 h",
      "FFP : 10 h",
      "TDP : 18 h",
      "Description du cours : Module expert de cadrage de projets complexes.",
      "Maitrise de l'analyse approfondie des besoins via entretiens",
      "Objectifs pedagogiques :",
      "• Cartographier les parties prenantes et leurs roles (RACI/RASCI)",
      "• Conduire des entretiens d'expression de besoins",
      "• Analyser l'environnement technique existant (SWOT)",
      "Prerequis : Bachelor informatique - Gestion de projet",
    ]),
  });
  await expect(page.getByRole("status")).toContainText("Lus pour la présentation");

  const propose = page.getByRole("button", { name: "Proposer un texte depuis la fiche" });
  await propose.click();
  await expect(intro).toHaveValue(/^## Bienvenue !/);
  await expect(intro).toHaveValue(/vous serez capable de :/);
  await expect(intro).toHaveValue(/- cartographier les parties prenantes/);
  await expect(intro).toHaveValue(/## Prérequis/);
  await expect(intro).toHaveValue(/28 h d’enseignement/);
  await expect(page.getByText("Brouillon inséré")).toBeVisible();

  // Un texte déjà présent n'est remplacé qu'après confirmation.
  await intro.fill("Mon propre texte.");
  await propose.click();
  const keep = page.getByRole("button", { name: "Garder mon texte" });
  await expect(keep).toBeFocused();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await keep.click();
  await expect(intro).toHaveValue("Mon propre texte.");
  await expect(propose).toBeFocused();

  await propose.click();
  await page.getByRole("button", { name: "Remplacer par le brouillon" }).click();
  await expect(intro).toHaveValue(/^## Bienvenue !/);
  await expect(page.getByRole("group", { name: /contient déjà un texte/ })).toHaveCount(0);

  // Le brouillon s'enregistre avec le module, uniquement quand Marie valide le formulaire.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}(\?.*)?$/);
  await page.goto(`${page.url().split("?")[0]}/edit`);
  await expect(page.getByLabel("Présentation aux étudiant·es")).toHaveValue(/## Bienvenue !/);
});
