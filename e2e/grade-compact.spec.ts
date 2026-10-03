import { setCriterionComment } from "./helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// US-140 : « Tous les critères d'un coup » : pastilles de paliers, clavier, commentaire par axe,
// palier moyen, total en direct, enregistrement et relecture.
test("vue compacte : paliers en pastilles, clavier, commentaire d'axe, palier moyen", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => window.localStorage.setItem("theme", "light"));
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const suffix = Date.now();
  const gridName = `Grille Compacte ${suffix}`;

  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByRole("button", { name: "Ajouter un axe" }).click();
  await page.getByLabel("Nom de l’axe 1").fill("Backlog");
  await page.getByRole("button", { name: "Ajouter un axe" }).click();
  await page.getByLabel("Nom de l’axe 2").fill("Estimation");
  const criteria = [
    ["Stories", "Backlog"],
    ["Priorisation", "Backlog"],
    ["Cohérence", "Estimation"],
  ];
  for (const [i, [label, axis]] of criteria.entries()) {
    if (i > 0) await page.getByRole("button", { name: "Ajouter un critère" }).click();
    await page.getByLabel(`Libellé du critère ${i + 1}`).fill(label);
    await page.getByLabel(`Axe du critère ${i + 1}`).selectOption({ label: axis });
    for (const [j, points] of ["3", "2", "1", "0"].entries()) {
      await page.getByRole("button", { name: `Ajouter un palier au critère ${i + 1}` }).click();
      await page.getByLabel(`Valeur du palier ${j + 1} (critère ${i + 1})`).fill(points);
    }
  }
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();

  const student = `Compact${suffix}`;
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Élève");
  await page.getByLabel("Nom", { exact: true }).fill(student);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/students/);
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Compact ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Compact ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Élève ${student}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();
  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Compacte ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByRole("button", { name: "Enregistrer" }).click();

  const form = page.getByRole("form", { name: `Élève ${student}` });
  await expect(form).toBeVisible();
  await form.getByRole("button", { name: "Tous les critères d’un coup" }).click();

  const group = (name: string) => form.getByRole("radiogroup", { name });
  // Pastille : un clic choisit le palier ; le total suit.
  await group("Stories (3 points)").getByRole("radio", { name: "2 points" }).check({ force: true });
  await expect(form.getByRole("region", { name: "Total en direct" })).toContainText("2 / 9");

  // Clavier : ↓ passe au critère suivant, un chiffre choisit le palier de ces points.
  await group("Stories (3 points)").getByRole("radio", { name: "2 points" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(group("Priorisation (3 points)").getByRole("radio").first()).toBeFocused();
  await page.keyboard.press("3");
  await expect(
    group("Priorisation (3 points)").getByRole("radio", { name: "3 points" }),
  ).toBeChecked();
  await expect(form.getByRole("region", { name: "Total en direct" })).toContainText("5 / 9");

  // Palier moyen pour ce qui n'est pas noté : « Cohérence » passe à 2 points, rien d'autre ne bouge.
  await form.getByRole("button", { name: /palier moyen/ }).click();
  await expect(
    group("Cohérence (3 points)").getByRole("radio", { name: "2 points" }),
  ).toBeChecked();
  await expect(group("Stories (3 points)").getByRole("radio", { name: "2 points" })).toBeChecked();
  await expect(form.getByRole("region", { name: "Total en direct" })).toContainText("7 / 9");

  // Commentaire d'un critère (« + commentaire ») et d'un axe.
  await form.getByRole("button", { name: /\+ commentaire pour Stories/ }).click();
  await setCriterionComment(form, "Stories", "Valeur claire.");
  await form.getByLabel(/Un mot pour tout l’axe « Backlog »/).fill("Backlog clair.");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await form.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(form.getByText("Note enregistrée.")).toBeVisible();

  // Relecture : tout est restitué, y compris le commentaire d'axe.
  await page.reload();
  const again = page.getByRole("form", { name: `Élève ${student}` });
  await again.getByRole("button", { name: "Tous les critères d’un coup" }).click();
  await expect(
    again
      .getByRole("radiogroup", { name: "Priorisation (3 points)" })
      .getByRole("radio", { name: "3 points" }),
  ).toBeChecked();
  await expect(again.getByLabel(/Un mot pour tout l’axe « Backlog »/)).toHaveValue(
    "Backlog clair.",
  );
  await expect(again.getByLabel("Commentaire — Stories", { exact: true })).toHaveValue(
    "Valeur claire.",
  );
});
