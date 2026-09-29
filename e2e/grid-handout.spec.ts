import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extractText } from "unpdf";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
// Le PDF est téléchargé par le bouton (fetch + fichier), pas par un simple lien.
async function pdfText(download: import("@playwright/test").Download) {
  const bytes = new Uint8Array(await readFile((await download.path())!));
  expect(Buffer.from(bytes.subarray(0, 4)).toString()).toBe("%PDF");
  const { text } = await extractText(bytes, { mergePages: true });
  return text;
}

test("grille remise aux étudiant·es : PDF sans notes ni commentaires, depuis la grille et l'évaluation", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Remise ${suffix}`;
  await createSimpleGrid(page, gridName, [
    ["Structure", 4],
    ["Contenu", 6],
  ]);
  const setup = await createAssessment(page, gridName, suffix);

  // Une note avec des commentaires : rien de tout cela ne doit sortir dans la grille remise.
  await page.getByLabel("Structure (/4)").fill("3");
  await page.getByLabel("Contenu (/6)").fill("5");
  await page.getByLabel("Commentaire — Structure", { exact: true }).fill("Secret de correction");
  await page.getByLabel("Commentaire libre", { exact: true }).fill("Appréciation privée");
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();

  // Depuis la page des grilles.
  await page.goto("/assessments/grids");
  const card = page.getByRole("listitem").filter({ hasText: gridName });
  const link = card.getByRole("button", { name: /Grille pour les étudiant·es \(PDF\)/ });
  await expect(link).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const gridDownload = page.waitForEvent("download");
  await link.click();
  const gridText = await pdfText(await gridDownload);
  await expect(card.getByText(/Grille « .* » téléchargée\./)).toBeVisible();
  expect(gridText).toContain("Structure");
  expect(gridText).toContain("Contenu");
  expect(gridText).toContain("Barème : 10 points");
  expect(gridText).not.toContain("Secret de correction");
  expect(gridText).not.toContain("Appréciation privée");

  // Depuis l'évaluation : bloquée tant que le sujet est « à construire ».
  await page.goto(setup.assessmentUrl);
  await expect(page.getByRole("button", { name: /Grille pour les étudiant·es/ })).toHaveCount(0);
  const gridUrl = `/api/modules/${setup.moduleUrl.split("/modules/")[1]}/assessments/${setup.assessmentUrl.split("/assessments/")[1]}/grid`;
  expect((await page.request.get(gridUrl)).status()).toBe(409);

  await page.goto(`${setup.assessmentUrl}/edit`);
  await page.getByLabel("État de préparation").selectOption("ready");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("heading", { name: `Évaluation ${suffix}` }).waitFor();

  const button = page.getByRole("button", { name: /Grille pour les étudiant·es/ });
  await expect(button).toBeVisible();
  const download = page.waitForEvent("download");
  await button.click();
  const text = await pdfText(await download);
  expect(text).toContain(`Évaluation ${suffix}`);
  expect(text).toContain("Structure");
  expect(text).not.toContain("Secret de correction");
  expect(text).not.toContain("Appréciation privée");
  expect(text).not.toContain("Note :");
});
