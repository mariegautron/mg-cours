import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Assistant « Constituer les groupes » : tirage puis création (crée des groupes dans un module jetable).
test("tirage en trois étapes, groupes créés, axe 0 violation", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const suffix = Date.now();
  for (const first of ["Ana", "Bob", "Cléo"]) {
    await page.goto("/students/new");
    await page.getByLabel("Prénom").fill(first);
    await page.getByLabel("Nom", { exact: true }).fill(`Wizard${suffix}`);
    await page
      .getByLabel("E-mail")
      .fill(`${first.toLowerCase().replace("é", "e")}.${suffix}@ynov.com`);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: `${first} Wizard${suffix}` })).toBeVisible();
  }
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Assistant ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: /Continuer/ }).click();
  await page.getByLabel("Date de la 1re séance").fill("2026-10-12");
  await page.getByRole("button", { name: /^Créer le module/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;

  const axe = () =>
    new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

  // Étape 1 : la manière (au hasard par défaut), nombre de groupes et taille liés.
  await page.goto(`/modules/${id}/groups/wizard`);
  await expect(
    page.getByRole("heading", { name: "Constituer les groupes", level: 1 }),
  ).toBeFocused();
  await expect(page.locator("[aria-current=step]")).toContainText("La manière");
  await page.getByLabel("Nombre de groupes", { exact: true }).fill("2");
  await expect(page.getByText(/en 2 groupes/)).toBeVisible();
  expect((await axe()).violations).toEqual([]);
  await page.getByRole("button", { name: /Tirer les groupes au hasard/ }).click();

  // Étape 2 : le tirage, verrouillage d'un groupe et d'une personne, renommage, échange.
  await expect(page.getByRole("heading", { name: "Le tirage", level: 1 })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "placé·es" })).toBeVisible();
  await page.getByLabel("Nom du groupe 1").fill("Les Licornes");
  await page.getByRole("button", { name: /^Verrouiller Les Licornes/ }).click();
  await expect(page.getByText("Verrouillé", { exact: true })).toBeVisible();
  const licornes = page.getByRole("listitem").filter({ has: page.getByLabel("Nom du groupe 1") });
  const before = await licornes
    .getByRole("strong")
    .allTextContents()
    .catch(() => []);
  await page.getByRole("button", { name: "Refaire le tirage" }).click();
  await expect(page.getByLabel("Nom du groupe 1")).toHaveValue("Les Licornes");
  if (before.length) {
    expect(await licornes.getByRole("strong").allTextContents()).toEqual(before);
  }
  expect((await axe()).violations).toEqual([]);

  // Étape 3 : récapitulatif puis enregistrement.
  await page.getByRole("button", { name: /Continuer : récapitulatif/ }).click();
  await expect(
    page.getByRole("heading", { name: "Récapitulatif des groupes", level: 1 }),
  ).toBeFocused();
  await expect(page.getByText("Vérifications")).toBeVisible();
  expect((await axe()).violations).toEqual([]);
  await page.getByRole("button", { name: /^Enregistrer les 2 groupes/ }).click();
  await expect(page.getByRole("heading", { name: /groupes? créés?/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Projeter la liste des groupes" })).toBeVisible();

  // La liste projetée : noms seulement, sans menu.
  await page.getByRole("link", { name: "Projeter la liste des groupes" }).click();
  await page.waitForURL(/\/present\/modules\/.+\/groups/);
  await expect(page.getByText("Les Licornes").first()).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});

test("ils choisissent : je saisis, personne par personne, avec groupes d'une personne", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const suffix = Date.now();
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Choix ${suffix}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: /Enregistrer/ }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;

  await page.goto(`/modules/${id}/groups/wizard`);
  await page.getByRole("radio", { name: /Ils choisissent/ }).check();
  await page.getByLabel("Nombre de groupes", { exact: true }).fill("2");
  await page.getByRole("button", { name: /Saisir les groupes choisis/ }).click();
  await expect(page.getByRole("heading", { name: /Ils choisissent/, level: 1 })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Sans groupe" })).toBeVisible();

  // Une personne choisie, ajoutée au premier groupe, puis échangée / retirée.
  await page
    .getByRole("button", { pressed: false, name: /\w/ })
    .filter({ hasText: /\./ })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Ajouter .* ici$/ })
    .first()
    .click();
  await expect(page.getByRole("status").filter({ hasText: "placé·es" })).toContainText("1 sur");
  await page
    .getByRole("button", { name: /^Retirer .* de Groupe 1/ })
    .first()
    .click();
  await expect(page.getByRole("status").filter({ hasText: "placé·es" })).toContainText("0 sur");
  await page.getByRole("button", { name: "Ajouter un groupe" }).click();
  await expect(page.getByLabel("Nom du groupe 3")).toBeVisible();
  await page.getByRole("button", { name: /Continuer : récapitulatif/ }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Place au moins une personne" }),
  ).toBeVisible();
});
