import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

const xml = (suffix: number) => `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
<question type="category"><category><text>$course$/top/Import${suffix}</text></category></question>
<question type="multichoice">
  <name><text>IMP${suffix}_A</text></name>
  <questiontext format="html"><text><![CDATA[<p>Quel rôle porte le backlog ${suffix} ?</p>]]></text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>1</defaultgrade><single>true</single>
  <answer fraction="100"><text>Le Product Owner</text></answer>
  <answer fraction="0"><text>Le Scrum Master</text></answer>
</question>
<question type="essay">
  <name><text>IMP${suffix}_B</text></name>
  <questiontext format="html"><text><![CDATA[<p>Explique le RGAA ${suffix}.</p>]]></text></questiontext>
  <generalfeedback format="html"><text></text></generalfeedback>
  <defaultgrade>3</defaultgrade>
</question>
<question type="shortanswer">
  <name><text>IMP${suffix}_C</text></name>
  <questiontext format="html"><text>x</text></questiontext>
</question>
</quiz>`;

test("banque de questions : créer, importer, chercher, aperçu, dupliquer, archiver", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();

  // Création d'une question à choix multiples.
  await page.goto("/questions/new");
  expect((await axe(page)).violations).toEqual([]);
  await page.getByLabel("Nom court").fill(`CREE${suffix}`);
  await page.getByLabel("Type de question").selectOption("multiple_choice");
  await page.getByLabel("Catégorie").fill(`Cat${suffix}`);
  await page
    .getByLabel("Énoncé (Markdown)")
    .fill(`Quels sont les **événements** Scrum ${suffix} ?`);
  await page.getByLabel("Choix 1", { exact: true }).fill("Daily");
  await page.getByLabel("Choix 2", { exact: true }).fill("Ménage");
  await page.getByRole("button", { name: "Ajouter un choix" }).click();
  await page.getByLabel("Choix 3", { exact: true }).fill("Review");
  await page.getByRole("checkbox", { name: "Bonne réponse" }).nth(2).check();
  expect((await axe(page)).violations).toEqual([]);
  await page.getByRole("button", { name: "Enregistrer la question" }).click();

  // Aperçu étudiant·e : fieldset + legend, cases à cocher, aucune bonne réponse dans l'aperçu.
  await expect(page.getByRole("heading", { name: `CREE${suffix}` })).toBeVisible();
  const preview = page.getByRole("group", { name: /Question/ });
  await expect(preview.getByRole("checkbox", { name: "Daily" })).toBeVisible();
  await expect(preview.getByText("Bonne réponse")).toHaveCount(0);
  await expect(
    page.getByRole("listitem").filter({ hasText: /^Bonne réponse \(50 %\) : Daily/ }),
  ).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /^Fausse.*Ménage/ })).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);

  // Erreur claire : pas de bonne réponse cochée.
  await page.getByRole("link", { name: "Modifier" }).click();
  await page.getByRole("checkbox", { name: "Bonne réponse" }).nth(0).uncheck();
  await page.getByRole("checkbox", { name: "Bonne réponse" }).nth(2).uncheck();
  await page.getByRole("button", { name: "Enregistrer la question" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "pas enregistrée" })).toContainText(
    "Coche au moins une bonne réponse.",
  );

  // Import Moodle XML : vérification sans écriture, puis import ; second import = doublons ignorés.
  await page.goto("/questions/import");
  expect((await axe(page)).violations).toEqual([]);
  const file = {
    name: "banque.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(xml(suffix)),
  };
  await page.getByLabel("Fichier Moodle XML").setInputFiles(file);
  await page.getByRole("button", { name: "Vérifier le fichier" }).click();
  await expect(page.getByRole("status")).toContainText(
    "3 questions dans le fichier : 2 à importer, 0 déjà",
  );
  await expect(page.getByRole("status")).toContainText("type « shortanswer » non repris");
  await page.getByRole("button", { name: "Importer 2 questions" }).click();
  await expect(page.getByRole("status")).toContainText("2 questions importées.");
  await page.getByLabel("Fichier Moodle XML").setInputFiles(file);
  await page.getByRole("button", { name: "Vérifier le fichier" }).click();
  await expect(page.getByRole("status")).toContainText("0 à importer, 2 déjà dans ta banque");

  // Fichier invalide : message clair.
  await page
    .getByLabel("Fichier Moodle XML")
    .setInputFiles({ name: "x.xml", mimeType: "application/xml", buffer: Buffer.from("<html/>") });
  await page.getByRole("button", { name: "Vérifier le fichier" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "balise" })).toContainText(
    "la balise <quiz> est introuvable",
  );

  // Liste : recherche sans accent, filtre par type et catégorie.
  await page.goto(`/questions?q=${encodeURIComponent(`explique le rgaa ${suffix}`)}`);
  await expect(page.getByRole("link", { name: new RegExp(`IMP${suffix}_B`) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`IMP${suffix}_A`) })).toHaveCount(0);
  await page.goto(
    `/questions?category=${encodeURIComponent(`Import${suffix}`)}&type=single_choice`,
  );
  await expect(page.getByRole("status")).toContainText("1 question affichée");
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "docs/captures/qcm-banque.png" });
  }
  expect((await axe(page)).violations).toEqual([]);

  // Duplication puis archivage.
  await page.getByRole("link", { name: new RegExp(`IMP${suffix}_A`) }).click();
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await expect(page.getByLabel("Nom court")).toHaveValue(`IMP${suffix}_A (copie)`);
  await page.goto(`/questions?q=${suffix}_A`);
  await page.getByRole("link", { name: /\(copie\)/ }).click();
  await page.getByRole("button", { name: "Archiver" }).click();
  await expect(page).toHaveURL(/\/questions$/);
  await page.goto(`/questions?q=${suffix}_A`);
  await expect(page.getByRole("link", { name: /\(copie\)/ })).toHaveCount(0);
  await page.goto(`/questions?q=${suffix}_A&archived=1`);
  await expect(page.getByRole("link", { name: /\(copie\)/ })).toBeVisible();

  // Export Moodle XML : contient les questions filtrées.
  const res = await page.request.get(`/api/questions/export?q=${suffix}_B`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain(`IMP${suffix}_B`);
});
