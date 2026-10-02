import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { createAssessment, createSimpleGrid, loginLight } from "./grading-setup";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
const axe = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

function averageOf(page: import("@playwright/test").Page, name: string) {
  return page.getByRole("row").filter({ hasText: name }).getByRole("cell").nth(1);
}

test("note individuelle : non prévenu·e = 0, excusé·e = hors moyenne", async ({ page }) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Absence ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, {
    firstNames: ["Ana", "Zoé", "Léo"],
  });
  const [ana, zoe, leo] = setup.studentNames;
  const form = (name: string) => page.getByRole("form", { name });

  await form(ana).getByLabel("Structure (/4)").fill("4");
  await form(zoe).getByRole("radio", { name: "Absent·e non prévenu·e" }).check();
  await expect(form(zoe).getByText("Note 0 automatique (règle de l’école).")).toBeVisible();
  // Les critères disparaissent pour une copie absente ; la copie compte comme traitée.
  await expect(form(zoe).getByLabel("Structure (/4)")).toHaveCount(0);
  await form(leo).getByRole("radio", { name: "Absent·e excusé·e" }).check();
  await expect(form(leo).getByText(/non comptée dans la moyenne/)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /corrigées?$/ })).toHaveText(
    "3/3 corrigées",
  );

  expect((await axe(page)).violations).toEqual([]);
  // Enregistrement automatique (ou « Enregistrer tout », couvert dans grading-session.spec.ts).
  await expect(page.getByText("Tout est enregistré")).toBeVisible({ timeout: 10_000 });

  // Rechargement : les statuts sont restitués.
  await page.reload();
  await expect(form(zoe).getByRole("radio", { name: "Absent·e non prévenu·e" })).toBeChecked();
  await expect(form(leo).getByRole("radio", { name: "Absent·e excusé·e" })).toBeChecked();

  // Moyennes : 20 (présent·e), 0 (non prévenu·e), aucune (excusé·e).
  await page.goto(`${setup.moduleUrl}/assessments`);
  await expect(averageOf(page, ana)).toHaveText("20.00");
  await expect(averageOf(page, zoe)).toHaveText("0.00");
  await expect(averageOf(page, leo)).toHaveText("—");
});

test("note de groupe : présence par membre et mot personnel, jamais de retrait de points", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await loginLight(page);
  const suffix = Date.now();
  const gridName = `Grille Oral ${suffix}`;
  await createSimpleGrid(page, gridName, [["Structure", 4]]);
  const setup = await createAssessment(page, gridName, suffix, {
    groupGrade: true,
    firstNames: ["Ana", "Zoé", "Léo"],
  });
  const [ana, zoe, leo] = setup.studentNames;
  const form = page.getByRole("form", { name: /Note du groupe/ });

  await form.getByLabel("Structure (/4)").fill("3");

  // Plus de pondération : on ne retire jamais de points. Un mot pour Ana, facultatif, sans effet.
  await expect(form.getByLabel(`Pondération de ${ana} (%)`)).toHaveCount(0);
  await form.getByLabel(new RegExp(`^Un mot pour ${ana}`)).fill("Très investie sur les tests.");
  await form
    .getByRole("radiogroup", { name: `Présence de ${zoe}` })
    .getByText("Absent·e non prévenu·e")
    .click();
  await form
    .getByRole("radiogroup", { name: `Présence de ${leo}` })
    .getByText("Absent·e excusé·e")
    .click();

  // La note finale de chaque membre est écrite à côté de son nom (règle par défaut de l'école).
  await expect(form.getByText("non prévenu·e : 0")).toBeVisible();
  await expect(form.getByText("note de groupe gardée")).toBeVisible();
  await expect(form.getByText("= note de groupe")).toBeVisible();

  expect((await axe(page)).violations).toEqual([]);
  await form.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(form.getByText("Note enregistrée.")).toBeVisible();
  // L'enregistrement automatique et le clic peuvent se chevaucher : on attend la fin des envois.
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Tout est enregistré")).toBeVisible();

  // Rechargement : situations restituées, note du groupe intacte (15/20 = 3/4).
  await page.reload();
  const reloaded = page.getByRole("form", { name: /Note du groupe/ });
  await expect(reloaded.getByLabel(new RegExp(`^Un mot pour ${ana}`))).toHaveValue(
    "Très investie sur les tests.",
  );
  await expect(
    reloaded
      .getByRole("radiogroup", { name: `Présence de ${zoe}` })
      .getByLabel("Absent·e non prévenu·e"),
  ).toBeChecked();
  await expect(reloaded.getByText("Note actuelle : 3 / 4 (15/20)")).toBeVisible();

  // Moyennes : Ana 15 et Léo 15 (excusé : garde la note du groupe), Zoé 0 (non prévenue).
  await page.goto(`${setup.moduleUrl}/assessments`);
  await expect(averageOf(page, leo)).toHaveText("15.00");
  await expect(averageOf(page, ana)).toHaveText("15.00");
  await expect(averageOf(page, zoe)).toHaveText("0.00");

  // Le PDF de résultats se génère (fiches distinctes pour les membres ajustés).
  await page.goto(setup.assessmentUrl);
  const path = new URL(page.url()).pathname.replace("/modules/", "/api/modules/");
  const res = await page.request.get(`${path}/results`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
});
