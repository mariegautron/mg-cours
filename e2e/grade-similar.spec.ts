import { expect, test } from "@playwright/test";

// US-139 : « Déjà noté chez les autres » : le même palier ailleurs dans la classe, et son commentaire
// repris en un clic ; Alt + flèches passent d'une copie à l'autre.
test("déjà noté chez les autres : même palier et commentaire en un clic", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const suffix = Date.now();
  const gridName = `Grille Similaire ${suffix}`;

  await page.goto("/assessments/grids/new");
  await page.getByLabel("Nom de la grille").fill(gridName);
  await page.getByLabel("Libellé du critère 1").fill("Priorisation");
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
  await page.getByLabel("Nom du module").fill(`Module Similaire ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  await page.goto(`${moduleUrl}/groups/new`);
  const groupName = `Groupe Similaire ${suffix}`;
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
  await page.getByLabel("Titre").fill(`Individuelle ${suffix}`);
  await page.getByRole("checkbox", { name: groupName }).check();
  await page.getByLabel("Grille de correction (optionnel)").selectOption({ label: gridName });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(`Élève ${names[0]}`).first()).toBeVisible();

  const ana = page.getByRole("form", { name: `Élève ${names[0]}` });
  const zoe = page.getByRole("form", { name: `Élève ${names[1]}` });

  // Ana : palier 4 + commentaire, enregistrés.
  await ana.getByRole("radio", { name: "4 pt" }).check();
  await ana.getByLabel("Commentaire — Priorisation", { exact: true }).fill("Choix non justifiés.");
  await ana.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(ana.getByText("Note enregistrée.")).toBeVisible();

  // Zoé : tant qu'aucun palier n'est choisi, rien n'est proposé ; au même palier, la suggestion apparaît.
  await expect(zoe.getByText("Déjà noté chez les autres")).toHaveCount(0);
  await zoe.getByRole("radio", { name: "4 pt" }).check();
  await expect(zoe.getByText("Déjà noté chez les autres")).toBeVisible();
  await expect(zoe.getByText(/Choix non justifiés\./).first()).toBeVisible();
  await zoe.getByRole("button", { name: /Même palier et commentaire/ }).click();
  await expect(zoe.getByLabel("Commentaire — Priorisation", { exact: true })).toHaveValue(
    "Choix non justifiés.",
  );
  // Un autre palier : plus de suggestion.
  await zoe.getByRole("radio", { name: "6 pt" }).check();
  await expect(zoe.getByText("Déjà noté chez les autres")).toHaveCount(0);

  // Clavier : Alt + flèche droite passe à la copie suivante (focus sur son titre).
  await ana.getByLabel("Commentaire — Priorisation", { exact: true }).focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(page.getByRole("heading", { name: `Élève ${names[1]}`, level: 3 })).toBeFocused();
});
