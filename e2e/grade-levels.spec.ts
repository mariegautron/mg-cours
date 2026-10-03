import { setCriterionComment, showCriterion, openCorrection } from "./helpers";
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

test("noter par palier : un choix attribue les points, propose la description, se pilote au clavier", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Thème clair : le contraste de la barre latérale en thème dark est vérifié dans design.spec.ts.
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await login(page);
  const suffix = Date.now();
  const gridName = `Grille Palier ${suffix}`;

  // Grille : « Structure » 6/4/2/0 et « Bouton » 2/1/0.
  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").first().fill("Structure");
  for (const [i, [points, description]] of [
    ["6", "Structure sémantique correcte"],
    ["4", "Structure approximative"],
    ["2", ""],
    ["0", ""],
  ].entries()) {
    await page.getByRole("button", { name: "Ajouter un palier au critère 1" }).click();
    await page.getByLabel(`Valeur du palier ${i + 1} (critère 1)`).fill(points);
    await page.getByLabel(`Description du palier ${i + 1} (critère 1)`).fill(description);
  }
  await page.getByRole("button", { name: "Ajouter un critère" }).click();
  await page.getByLabel("Libellé du critère 2").fill("Bouton");
  for (const [i, points] of ["2", "1", "0"].entries()) {
    await page.getByRole("button", { name: "Ajouter un palier au critère 2" }).click();
    await page.getByLabel(`Valeur du palier ${i + 1} (critère 2)`).fill(points);
  }
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();

  // Étudiant·e, module, groupe, évaluation.
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Yanis");
  await page.getByLabel("Nom", { exact: true }).fill(`Palier${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Palier ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Palier ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Yanis Palier${suffix}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();

  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Individuelle ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await openCorrection(page);
  await expect(page.getByText(`Yanis Palier${suffix}`).first()).toBeVisible();

  const total = page.getByRole("region", { name: "Total en direct" }).first();
  const structure = () => page.getByRole("group", { name: "Palier atteint pour Structure" });
  const bouton = () => page.getByRole("group", { name: "Palier atteint pour Bouton" });

  // Un choix attribue les points et met le total à jour en direct.
  await structure()
    .getByRole("radio", { name: /4 pts? Structure approximative/ })
    .check({ force: true });
  await expect(total).toContainText("4 / 8");
  await showCriterion(page, "Bouton");
  await bouton()
    .getByRole("radio", { name: /^2 pts?/ })
    .check({ force: true });
  await expect(total).toContainText("6 / 8");

  // La description du palier choisi est proposée comme base du commentaire du critère, sans écraser.
  await showCriterion(page, "Structure");
  await setCriterionComment(page, "Structure", "Bon début.");
  await page.getByRole("button", { name: /Insérer dans le commentaire/ }).click();
  await expect(page.getByLabel("Commentaire — Structure", { exact: true })).toHaveValue(
    "Bon début.\nStructure — Structure approximative",
  );
  await showCriterion(page, "Bouton");
  await expect(page.getByRole("button", { name: /Insérer/ })).toHaveCount(0);

  // Clavier : flèche bas sur le groupe passe au palier suivant.
  await showCriterion(page, "Structure");
  await structure()
    .getByRole("radio", { name: /4 pts?/ })
    .focus();
  await page.keyboard.press("ArrowDown");
  await expect(structure().getByRole("radio", { name: /^2 pts?/ })).toBeChecked();
  await expect(total).toContainText("4 / 8");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(page.getByText("Note enregistrée.")).toBeVisible();
  await expect(page.getByText("Note actuelle : 4 / 8 (10/20)")).toBeVisible();

  // Rechargement : les paliers choisis sont restitués.
  await page.reload();
  await expect(structure().getByRole("radio", { name: /^2 pts?/ })).toBeChecked();
  await showCriterion(page, "Bouton");
  await expect(bouton().getByRole("radio", { name: /^2 pts?/ })).toBeChecked();
});
