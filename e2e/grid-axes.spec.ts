import { setScore, showCriterion, openCorrection } from "./helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

test("axes, référence, bonus et critère validé d'office : total ramené sur 20 puis plafonné", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Thème clair : le contraste de la barre latérale en thème dark est vérifié dans design.spec.ts.
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await login(page);
  const suffix = Date.now();
  const gridName = `Grille Axes ${suffix}`;

  // Grille : 2 axes, 3 critères notés (8 + 12 = 20 points) et 1 bonus (+0,5) hors barème.
  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByRole("button", { name: "Ajouter un axe" }).click();
  await page.getByLabel("Nom de l’axe 1").fill("Structure");
  await page.getByRole("button", { name: "Ajouter un axe" }).click();
  await page.getByLabel("Nom de l’axe 2").fill("Composants");

  await page.getByLabel("Libellé du critère 1").first().fill("Header et footer");
  await page.getByLabel("Points", { exact: true }).first().fill("8");
  await page.getByLabel("Axe du critère 1").selectOption({ label: "Structure" });
  await page.getByLabel("Référence du critère 1").fill("RGAA 1.3.1");

  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé du critère 2").fill("Onglets");
  await page.getByLabel("Points", { exact: true }).nth(1).fill("12");
  await page.getByLabel("Axe du critère 2").selectOption({ label: "Composants" });

  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé du critère 3").fill("Lighthouse supérieur à 90");
  await page.getByLabel("Points", { exact: true }).nth(2).fill("0.5");
  await page.getByLabel("Axe du critère 3").selectOption({ label: "Composants" });
  await page.getByLabel("Bonus hors barème (critère 3)").check();
  await expect(
    page.getByText("Barème total : 20 points (+ 0.5 de bonus hors barème)."),
  ).toBeVisible();

  const editorAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(editorAxe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();
  const card = page.getByRole("listitem").filter({ hasText: gridName }).first();
  await expect(card).toContainText("3 critères · 20 points");
  await expect(card.getByRole("heading", { name: "Structure" })).toBeVisible();
  await expect(card).toContainText("Header et footer (8) · RGAA 1.3.1");
  await expect(card).toContainText("Lighthouse supérieur à 90 (0.5) · bonus hors barème");

  // Module, étudiant·e, groupe, évaluation.
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Ines");
  await page.getByLabel("Nom", { exact: true }).fill(`Axes${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Axes ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Axes ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Ines Axes${suffix}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Fil rouge ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByLabel("Barème (note sur)").fill("20");
  await page.getByRole("checkbox", { name: "Header et footer" }).check();
  await expect(page.getByRole("checkbox", { name: "Lighthouse supérieur à 90" })).toHaveCount(0);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await openCorrection(page);

  // Saisie : Header et footer validé d'office (8/8), sous-totaux et total en direct.
  await expect(page.getByText(`Ines Axes${suffix}`).first()).toBeVisible();
  await expect(page.getByText("Validé d’office : 8 / 8")).toBeVisible();
  await expect(page.getByLabel(/^Header et footer \(\//)).toHaveCount(0);
  await expect(page.getByText("Référence : RGAA 1.3.1")).toBeVisible();

  const total = page.getByRole("region", { name: "Total en direct" });
  await setScore(page, "Onglets", "6");
  await expect(total).toContainText("8 / 8");
  await expect(total).toContainText("6 / 12 + 0 de bonus");
  await expect(total).toContainText("14 / 20");

  await setScore(page, "Onglets", "12");
  await showCriterion(page, "Lighthouse supérieur à 90");
  await page.getByRole("spinbutton", { name: /^Lighthouse supérieur à 90/ }).fill("0.5");
  await expect(total).toContainText("20 / 20");
  await expect(total).toContainText("plafonné à 20");

  const gradeAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(gradeAxe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();
  await expect(page.getByText("Note actuelle : 20 / 20")).toBeVisible();

  // Rendu : le PDF de résultats se génère (le contenu détaillé est couvert par les tests unitaires).
  const assessmentPath = new URL(page.url()).pathname.replace(/\/correct$/, "");
  const res = await page.request.get(
    `${assessmentPath.replace("/modules/", "/api/modules/")}/results`,
  );
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("pdf");
});
