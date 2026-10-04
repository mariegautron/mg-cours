import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("supprimer les séances vides sans date : aperçu, confirmation par le nombre", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Séances vides ${Date.now()}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  // Deux séances sans date ni contenu.
  for (const title of ["Introduction à l'Agilité: - Valeurs", "Création d'un backlog produit"]) {
    await page.goto(`${moduleUrl}/courses/new`);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Titre de la séance").fill(title);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  }

  await page.goto(`${moduleUrl}/courses`);
  await page.waitForLoadState("networkidle");
  await page.getByText(/2 séances vides sans date/).click();
  await expect(page.getByText(/Création d'un backlog produit/).first()).toBeVisible();

  // Mauvais nombre : rien n'est supprimé.
  await page.getByLabel(/retape le nombre de séances/).fill("1");
  await page.getByRole("button", { name: "Supprimer les séances vides sans date" }).click();
  await expect(page.getByText("Retape 2 pour confirmer.")).toBeVisible();

  // Bon nombre : les deux séances disparaissent.
  await page.getByLabel(/retape le nombre de séances/).fill("2");
  await page.getByRole("button", { name: "Supprimer les séances vides sans date" }).click();
  await expect(page.getByText("Aucune séance")).toBeVisible({ timeout: 20_000 });
});
