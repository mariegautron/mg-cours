import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTab, setScore, showCriterion, openCorrection } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

test("modifier une grille conserve les identifiants et demande confirmation pour un critère noté", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await login(page);
  const suffix = Date.now();

  // Grille à 2 critères.
  await page.goto("/assessments/grids/new");
  const gridName = `Grille Édition ${suffix}`;
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").first().fill("Présentation");
  await page.getByLabel("Points").first().fill("4");
  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé du critère 2").fill("Contenu");
  await page.getByLabel("Points").last().fill("6");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: gridName })).toBeVisible();

  // Module, étudiant·e, groupe, évaluation notée sur cette grille.
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Léa");
  await page.getByLabel("Nom", { exact: true }).fill(`Girard${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Grille ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Grille ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Léa Girard${suffix}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Oral ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await openCorrection(page);

  await expect(page.getByText(`Léa Girard${suffix}`).first()).toBeVisible();
  await setScore(page, "Présentation", "3");
  await setScore(page, "Contenu", "5");
  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();
  await expect(page.getByText("Note actuelle : 8 / 10 (16/20)")).toBeVisible();

  // b. Renommer un critère et lui ajouter une description : la note détaillée reste intacte.
  await page.goto("/assessments/grids");
  await page
    .getByRole("listitem")
    .filter({ hasText: gridName })
    .getByRole("link", { name: "Modifier" })
    .click();
  await expect(page.getByRole("heading", { name: `Modifier « ${gridName} »` })).toBeVisible();
  await page.getByLabel("Libellé du critère 1").first().fill("Présentation orale");
  await page.getByText("Description et attendus (facultatifs)").first().click();
  await page
    .getByLabel("Description du critère 1")
    .fill("6 pts : excellent\n4 pts : correct\n0 pt : absent");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();

  await page.goto(moduleUrl);
  await openTab(page, /Groupes/);
  await page.getByRole("link", { name: "Voir les évaluations" }).click();
  await page.getByRole("link", { name: `Oral ${suffix}` }).click();
  await openCorrection(page);
  await expect(page.getByLabel("Présentation orale (/4)")).toHaveValue("3");
  await showCriterion(page, "Contenu");
  await expect(page.getByLabel("Contenu (/6)")).toHaveValue("5");
  await expect(page.getByText("Note actuelle : 8 / 10 (16/20)")).toBeVisible();
  await showCriterion(page, "Présentation orale");
  await page.getByText("Voir le barème").click();
  await expect(page.getByText("6 pts : excellent")).toBeVisible();

  // c. Supprimer un critère noté : confirmation demandée avant d'enregistrer.
  await page.goto("/assessments/grids");
  await page
    .getByRole("listitem")
    .filter({ hasText: gridName })
    .getByRole("link", { name: "Modifier" })
    .click();
  await page.getByRole("button", { name: "Supprimer le critère 2" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByRole("heading", { name: "Supprimer un critère déjà noté ?" }),
  ).toBeVisible();
  await expect(page.getByText(/utilise le critère « Contenu »/)).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Confirmer et enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();

  // La note détaillée du critère supprimé a disparu, la note globale (value) est conservée.
  await page.goto(moduleUrl);
  await openTab(page, /Groupes/);
  await page.getByRole("link", { name: "Voir les évaluations" }).click();
  await page.getByRole("link", { name: `Oral ${suffix}` }).click();
  await openCorrection(page);
  await expect(page.getByLabel("Présentation orale (/4)")).toHaveValue("3");
  await expect(
    page.getByRole("group", { name: "Critères" }).getByRole("button", { name: /Contenu/ }),
  ).toHaveCount(0);
});
