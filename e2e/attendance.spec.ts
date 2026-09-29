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

test("note de groupe : absence et pondération justifiée par membre, sans toucher à la note du groupe", async ({
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

  // Pondération sans justification : refusée, avec un message qui nomme l'étudiant·e.
  await form.getByLabel(`Pondération de ${ana} (%)`).fill("80");
  await form.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(
    form
      .getByRole("alert")
      .filter({ hasText: `Justification obligatoire pour la pondération de ${ana}.` }),
  ).toBeVisible();
  await expect(
    form.getByLabel(`Justification de la pondération de ${ana} (obligatoire)`),
  ).toBeVisible();

  await form
    .getByLabel(`Justification de la pondération de ${ana}`)
    .fill("A peu contribué à l’oral.");
  await form.getByLabel(`Présence de ${zoe}`).selectOption({ label: "Absent·e non prévenu·e" });
  await expect(form.getByLabel(`Pondération de ${zoe} (%)`)).toHaveCount(0);

  expect((await axe(page)).violations).toEqual([]);
  await form.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(form.getByText("Note enregistrée.")).toBeVisible();

  // Rechargement : ajustements restitués, note du groupe intacte (15/20 = 3/4).
  await page.reload();
  const reloaded = page.getByRole("form", { name: /Note du groupe/ });
  await expect(reloaded.getByLabel(`Pondération de ${ana} (%)`)).toHaveValue("80");
  await expect(reloaded.getByLabel(`Justification de la pondération de ${ana}`)).toHaveValue(
    "A peu contribué à l’oral.",
  );
  await expect(reloaded.getByLabel(`Présence de ${zoe}`)).toHaveValue("absent_unexcused");
  await expect(reloaded.getByText("Note actuelle : 3 / 4 (15/20)")).toBeVisible();

  // Moyennes : Léo 15 (note du groupe), Ana 12 (80 %), Zoé 0 (absente non prévenue).
  await page.goto(`${setup.moduleUrl}/assessments`);
  await expect(averageOf(page, leo)).toHaveText("15.00");
  await expect(averageOf(page, ana)).toHaveText("12.00");
  await expect(averageOf(page, zoe)).toHaveText("0.00");

  // Le PDF de résultats se génère (fiches distinctes pour les membres ajustés).
  await page.goto(setup.assessmentUrl);
  const path = new URL(page.url()).pathname.replace("/modules/", "/api/modules/");
  const res = await page.request.get(`${path}/results`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
});
