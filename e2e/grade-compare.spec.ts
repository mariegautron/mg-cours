import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// US-141 : comparer un critère entre les copies, modification en place, tri, écarts.
test("comparer un critère : modification en place, écart signalé, tri, accessibilité", async ({
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
  const gridName = `Grille Comparer ${suffix}`;

  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").first().fill("Priorisation");
  for (const [i, points] of ["6", "4", "2", "0"].entries()) {
    await page.getByRole("button", { name: "Ajouter un palier au critère 1" }).click();
    await page.getByLabel(`Valeur du palier ${i + 1} (critère 1)`).fill(points);
  }
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Grilles de correction" })).toBeVisible();

  const names = [`Ana${suffix}`, `Zoe${suffix}`];
  for (const name of names) {
    await page.goto("/students/new");
    await page.getByLabel("Prénom").fill("Élève");
    await page.getByLabel("Nom", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/students/);
  }
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Comparer ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Comparer ${suffix}`;
  await page.getByLabel("Nom du groupe").fill(groupName);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  for (const name of names) {
    await page
      .getByRole("listitem")
      .filter({ hasText: `Élève ${name}` })
      .getByRole("button", { name: /Ajouter/ })
      .click();
  }
  await page.goto(`${moduleUrl}/assessments/new`);
  await page.getByLabel("Titre").fill(`Comparer ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(`Élève ${names[0]}`).first()).toBeVisible();

  // Depuis la vue d'ensemble.
  await page.getByRole("link", { name: /Comparer un critère entre les étudiant·es/ }).click();
  await expect(page.getByRole("heading", { name: "Comparer un critère", level: 1 })).toBeVisible();

  const level = (who: string, name: string) =>
    page.getByRole("radiogroup", { name: `Palier de Élève ${who}` }).getByRole("radio", { name });
  const comment = (who: string) => page.getByLabel(`Commentaire — Élève ${who}`);

  // Modification en place : un clic sur un palier enregistre ; le commentaire s'enregistre à la sortie du champ.
  await level(names[0], "4 points").check({ force: true });
  await expect(page.getByText(/Enregistré à \d{2}:\d{2}/)).toBeVisible();
  await comment(names[0]).fill("Choix non justifiés.");
  await comment(names[0]).blur();
  await level(names[1], "6 points").check({ force: true });
  await comment(names[1]).fill("Choix non justifiés.");
  await comment(names[1]).blur();

  // Même commentaire à des paliers différents : signalé en mots, et le commentaire « revient ».
  await expect(page.getByText("Même commentaire, autre palier").first()).toBeVisible();
  await expect(page.getByText(/Commentaires qui reviennent/)).toBeVisible();

  // Tri : du plus haut au plus bas, Zoé (6) passe devant Ana (4).
  await page.getByLabel("Trier par").selectOption("points_desc");
  await expect(page.locator("tbody tr").first()).toContainText(`Élève ${names[1]}`);

  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "docs/captures/comparer-critere.png", fullPage: true });
  }
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Rechargement : tout est resté, et la vue d'ensemble compte les deux copies corrigées.
  await page.reload();
  await expect(level(names[1], "6 points")).toBeChecked();
  await expect(comment(names[0])).toHaveValue("Choix non justifiés.");
  await page.getByRole("link", { name: "← Vue d’ensemble" }).click();
  await expect(page.getByText(/^2 corrigés sur 2/)).toBeVisible();
});
