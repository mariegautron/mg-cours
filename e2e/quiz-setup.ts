import { expect, type Page } from "@playwright/test";

/** Banque de test importée en Moodle XML : `n` questions à choix unique + `open` réponses libres. */
export function bankXml(suffix: number, single = 12, open = 3) {
  const singles = Array.from(
    { length: single },
    (_, i) => `<question type="multichoice">
  <name><text>QCM${suffix}_${i + 1}</text></name>
  <questiontext format="html"><text><![CDATA[<p>Énoncé ${i + 1} du lot ${suffix}</p>]]></text></questiontext>
  <generalfeedback format="html"><text><![CDATA[<p>SECRET-GENERAL-${suffix}-${i + 1}</p>]]></text></generalfeedback>
  <defaultgrade>1</defaultgrade><single>true</single>
  <answer fraction="100"><text>Bonne ${i + 1}</text><feedback format="html"><text>SECRET-FB-${suffix}</text></feedback></answer>
  <answer fraction="0"><text>Mauvaise ${i + 1}</text></answer>
  <answer fraction="0"><text>Autre ${i + 1}</text></answer>
</question>`,
  ).join("\n");
  const opens = Array.from(
    { length: open },
    (_, i) => `<question type="essay">
  <name><text>OUV${suffix}_${i + 1}</text></name>
  <questiontext format="html"><text><![CDATA[<p>Explique le sujet ${i + 1} du lot ${suffix}</p>]]></text></questiontext>
  <generalfeedback format="html"><text><![CDATA[<p>SECRET-OUVERT-${suffix}</p>]]></text></generalfeedback>
  <defaultgrade>2</defaultgrade>
</question>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><quiz>
<question type="category"><category><text>$course$/top/Lot${suffix}</text></category></question>
${singles}
${opens}
</quiz>`;
}

export async function importBank(page: Page, suffix: number, single = 12, open = 3) {
  await page.goto("/questions/import");
  await page.getByLabel("Fichier Moodle XML").setInputFiles({
    name: "banque.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(bankXml(suffix, single, open)),
  });
  await page.getByRole("button", { name: "Vérifier le fichier" }).click();
  await page
    .getByRole("button", { name: `Importer ${single + open} questions` })
    .click({ timeout: 30_000 });
  await expect(page.getByRole("status")).toContainText(`${single + open} questions importées.`);
}

/** Crée le QCM (3 questions à choix unique à 1 pt + 1 réponse libre à 2 pts = 5 pts) et le publie. */
export async function createAndPublishQuiz(page: Page, assessmentUrl: string, suffix: number) {
  await page.goto(`${assessmentUrl}/quiz`);
  await page.getByRole("button", { name: "Créer le QCM" }).click();
  const rule1 = page.getByRole("group", { name: "Règle 1" });
  await rule1.getByLabel("Catégorie").fill(`Lot${suffix}`);
  await rule1.getByRole("checkbox", { name: "Choix unique" }).check();
  await rule1.getByLabel("Nombre de questions").fill("3");
  await rule1.getByLabel("Points par question").fill("1");
  await page.getByRole("button", { name: "Ajouter une règle" }).click();
  const rule2 = page.getByRole("group", { name: "Règle 2" });
  await rule2.getByLabel("Catégorie").fill(`Lot${suffix}`);
  await rule2.getByRole("checkbox", { name: "Réponse libre" }).check();
  await rule2.getByLabel("Nombre de questions").fill("1");
  await rule2.getByLabel("Points par question").fill("2");
  await expect(page.getByText("Total : 5 points pour chaque étudiant·e.")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer le QCM" }).click();
  await expect(page.getByText("Configuration enregistrée.")).toBeVisible();
  await page.getByRole("button", { name: "Publier le QCM" }).click();
  await expect(page.getByText("Publié", { exact: true })).toBeVisible();
}

/** Prépare les liens et renvoie « chemin du lien » par nom d'étudiant·e (le lien n'apparaît qu'une fois). */
export async function prepareLinks(page: Page): Promise<Record<string, string>> {
  // Les liens se préparent sur « Donner accès au QCM ».
  if (!page.url().includes("/quiz/links")) {
    await page.goto(page.url().replace(/\/quiz.*$/, "/quiz/links"));
    await page.waitForLoadState("networkidle");
  }
  await page.getByRole("button", { name: "Préparer les tirages et les liens" }).click();
  const table = page.getByRole("table", { name: "Liens personnels générés" });
  await expect(table).toBeVisible();
  const entries = await table.evaluate((t) =>
    [...t.querySelectorAll("tbody tr")].map((tr) => [
      tr.querySelector("th")?.textContent?.trim() ?? "",
      tr.querySelector("code")?.textContent?.trim() ?? "",
    ]),
  );
  const links: Record<string, string> = {};
  for (const [name, url] of entries) if (name && url) links[name] = new URL(url).pathname;
  return links;
}
