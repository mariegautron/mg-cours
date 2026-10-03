import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-77 : import vers les groupes d'un module et ajout de membres en masse", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();

  const moduleName = `Module groupes ${stamp}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  // Import : la colonne « groupe » = groupe du module, plus un groupe pour tout le monde.
  await page.goto("/students/import");
  await page.getByLabel("Module", { exact: true }).selectOption({ label: `${moduleName} (2026)` });
  await page.getByLabel("un groupe du module (créé s’il n’existe pas)").check();
  await page.getByLabel("Ajouter tout le monde au groupe").fill(`Classe ${stamp}`);
  const csv =
    "Nom,Prénom,Email,Groupe\n" +
    `Alpha${stamp},Ana,ana.${stamp}@ynov.com,TP1\n` +
    `Beta${stamp},Ben,ben.${stamp}@ynov.com,TP1\n` +
    `Gamma${stamp},Gil,gil.${stamp}@ynov.com,TP2\n`;
  await page.setInputFiles("#file", {
    name: "etudiants.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  });
  await expect(page.getByText("3 à importer")).toBeVisible();
  await expect(
    page.getByText(/3 groupes à créer \(TP1, Classe \d+, TP2\) ; 6 appartenances\./),
  ).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.getByRole("button", { name: /Confirmer l’import \(3\)/ }).click();
  await expect(
    page.getByText(/6 appartenances aux groupes de « .+ » \(3 groupes créés\)/),
  ).toBeVisible();

  // Le groupe TP1 contient ses deux membres ; la « Classe » les trois.
  await page.goto(`${moduleUrl}/groups`);
  await page.getByRole("link", { name: /^TP1/ }).click();
  await expect(page.getByRole("heading", { name: "Membres (2)" })).toBeVisible();

  // Ajout en masse depuis un autre groupe : recherche puis sélection.
  await page.goto(`${moduleUrl}/groups/new`);
  await page.getByLabel("Nom du groupe").fill("Projet");
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page.waitForURL(/\/groups\/[0-9a-f-]{36}$/);

  await page.getByLabel("Rechercher un·e étudiant·e").fill(`alpha${stamp} `);
  await expect(page.getByRole("checkbox", { name: new RegExp(`Ana Alpha${stamp}`) })).toBeVisible();
  await page.getByRole("button", { name: /Tout sélectionner \(1\)/ }).click();
  await page.getByRole("button", { name: /Ajouter la sélection \(1\)/ }).click();
  await expect(page.getByRole("heading", { name: "Membres (1)" })).toBeVisible();
});
