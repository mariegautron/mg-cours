import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";
import { openTab, setScore, showCriterion } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("correction sans perte : avancement, enregistrement automatique, garde, vue par critère", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Session ${suffix}`;
  await createSimpleGrid(page, gridName, [
    ["Structure", 4],
    ["Contenu", 6],
  ]);
  const setup = await createAssessment(page, gridName, suffix, { firstNames: ["Ana", "Zoé"] });
  const [ana, zoe] = setup.studentNames;
  const anaForm = page.getByRole("form", { name: ana });
  const zoeForm = page.getByRole("form", { name: zoe });
  const progress = page.getByRole("status").filter({ hasText: /corrigées?$/ });
  const beforeUnloadPrevented = () =>
    page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

  await expect(progress).toHaveText("0/2 corrigée");
  await expect(page.getByText("Tout est enregistré")).toBeVisible();

  // Noter un critère : l'avancement suit la frappe, la copie est « à enregistrer » et protégée.
  await setScore(anaForm, "Structure", "3");
  await expect(progress).toHaveText("1/2 corrigée");
  await expect(anaForm.getByText("Modifications non enregistrées")).toBeVisible();
  expect(await beforeUnloadPrevented()).toBe(true);

  // Enregistrement automatique, sans clic : la garde se lève.
  await expect(anaForm.getByText("Note enregistrée.")).toBeVisible({ timeout: 10_000 });
  expect(await beforeUnloadPrevented()).toBe(false);
  await page.reload();
  await expect(page.getByRole("form", { name: ana }).getByLabel("Structure (/4)")).toHaveValue("3");
  await expect(progress).toHaveText("1/2 corrigée");

  // US-138 : vue d'ensemble, avancement global et « Continuer » vers la prochaine copie.
  const overview = page.getByRole("region", { name: "Où j’en suis" });
  await expect(overview.getByText(/^1 corrigé sur 2/)).toBeVisible();
  await expect(overview.getByRole("row", { name: new RegExp(`${ana}.*Corrigé`) })).toBeVisible();
  await expect(
    overview.getByRole("link", { name: new RegExp(`Continuer la correction : ${zoe}`) }),
  ).toBeVisible();

  // Un simple commentaire ne fait pas une copie corrigée (pas de faux 0) ; « Enregistrer tout ».
  await anaForm.getByRole("button", { name: new RegExp(`${zoe} →`) }).click();
  await zoeForm
    .getByLabel("Commentaire libre", { exact: true })
    .fill("Absent·e à l'oral, à revoir.");
  await expect(zoeForm.getByText("Modifications non enregistrées")).toBeVisible();
  await expect(page.getByText("1 copie à enregistrer")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer tout" }).click();
  await expect(zoeForm.getByText("Note enregistrée.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Tout est enregistré")).toBeVisible();
  await expect(progress).toHaveText("1/2 corrigée");

  // Vue « un critère pour toute la classe » : un seul critère par copie, le reste est conservé.
  await page.getByRole("button", { name: "Un critère pour toute la classe" }).click();
  await page.getByLabel("Critère affiché").selectOption({ label: "Contenu" });
  await expect(anaForm.getByLabel("Structure (/4)")).toHaveCount(0);
  await setScore(anaForm, "Contenu", "5");
  await setScore(zoeForm, "Contenu", "2");
  await expect(progress).toHaveText("2/2 corrigées");
  await expect(anaForm.getByText("Total : 8 / 10")).toBeVisible();

  // Navigation clavier d'une copie à l'autre.
  await anaForm.getByRole("button", { name: new RegExp(`${zoe} →`) }).click();
  await expect(page.locator('h3[tabindex="-1"]', { hasText: zoe })).toBeFocused();
  await zoeForm.getByRole("button", { name: new RegExp(`← ${ana}`) }).click();
  await expect(page.locator('h3[tabindex="-1"]', { hasText: ana })).toBeFocused();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Retour à la vue par copie : la saisie de l'autre critère est intacte ; tout s'enregistre seul.
  await page.getByRole("button", { name: "Une copie à la fois" }).click();
  await expect(anaForm.getByLabel("Structure (/4)")).toHaveValue("3");
  await expect(page.getByText("Tout est enregistré")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await showCriterion(page.getByRole("form", { name: ana }), "Contenu");
  await expect(page.getByRole("form", { name: ana }).getByLabel("Contenu (/6)")).toHaveValue("5");
  await anaForm.getByRole("button", { name: new RegExp(`${zoe} →`) }).click();
  await expect(
    page.getByRole("form", { name: zoe }).getByLabel("Commentaire libre", { exact: true }),
  ).toHaveValue("Absent·e à l'oral, à revoir.");
});

test("les observations de cours du carnet restent consultables pendant la correction", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Observ ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix);

  // Une séance, puis une observation sur l'étudiant·e depuis le carnet.
  await page.goto(setup.moduleUrl);
  await openTab(page, /Séances/);
  await page.getByRole("link", { name: "Ajouter une séance" }).click();
  await page.getByLabel("Titre de la séance").fill(`Séance ${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await openTab(page, /Séances/);
  await page.getByRole("link", { name: `Carnet de séance : Séance ${suffix}` }).click();
  await page.getByLabel("Filtrer par nom").fill("yanis");
  await page
    .getByRole("button", { name: `${setup.studentName} : ajouter une observation` })
    .click();
  await page.getByLabel("Note (facultatif)").fill("Très bonne question sur le backlog");
  await page.getByRole("button", { name: "Question pertinente" }).click();
  await expect(page.getByText("Notées pendant cette séance (1)")).toBeVisible();

  await page.goto(setup.assessmentUrl);
  const form = page.getByRole("form", { name: setup.studentName });
  await form.getByText("Observations de cours (1)").click();
  await expect(form.getByText("Très bonne question sur le backlog")).toBeVisible();
  await expect(form.getByText(/Question pertinente/)).toBeVisible();
});
