import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`) avec la table expectation_resource.
test("Associer lie la ressource à CET attendu seulement ; recherche dans la bibliothèque", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  const stamp = Date.now();
  const word = `zorglub${stamp}`;
  const hidden = `qwertyu${stamp}`;

  // Deux ressources : l'une correspond aux deux attendus, l'autre n'est proposée à aucun.
  const createResource = async (title: string) => {
    await page.goto("/resources/new");
    await page.getByLabel("Titre").fill(title);
    await page.getByLabel("Type").selectOption("workshop");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
  };
  const shared = `Atelier ${word} commun`;
  const apart = `Support ${hidden} distinct`;
  await createResource(shared);
  await createResource(apart);

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Liens ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.goto(`${moduleUrl}/expectations`);
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel(/Ou coller le texte/)
    .fill(`Cadrer le besoin ${word}\nÉvaluer les résultats ${word}`);
  await page.getByRole("button", { name: "Lire ce texte" }).click();
  await expect(page.getByText(/2 objectifs et 0 unité lus/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer les attendus" }).click();
  await expect(page.getByText("Attendus enregistrés.")).toBeVisible();
  await page.goto(`${moduleUrl}/matching`);
  await page.waitForLoadState("networkidle");

  // « Associer » sur le premier attendu : le second reste sans ressource.
  await page.getByRole("link", { name: /Cadrer le besoin/ }).click();
  const first = page.getByRole("region", { name: /Cadrer le besoin/ });
  await first
    .getByRole("button", { name: `Associer ${shared} à cet attendu`, exact: true })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "1 couvert" })).toContainText(
    "1 sans ressource",
    { timeout: 20_000 },
  );
  await expect(
    first
      .getByRole("region", { name: "Ressources associées à cet attendu" })
      .getByRole("link", { name: shared }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Évaluer les résultats/ }).click();
  const second = page.getByRole("region", { name: /Évaluer les résultats/ });
  await expect(
    second.getByRole("button", { name: `Associer ${shared} à cet attendu`, exact: true }),
  ).toBeVisible();
  await expect(second.getByText("Aucune ressource associée pour l’instant.")).toBeVisible();

  // Recherche dans la bibliothèque : une ressource hors propositions, associée à CET attendu.
  await expect(second.getByRole("link", { name: apart, exact: true })).toHaveCount(0);
  await second.getByLabel("Chercher dans la bibliothèque…").fill(hidden);
  await expect(second.getByText(/1 ressource trouvée/)).toBeVisible({ timeout: 20_000 });
  await second
    .getByRole("button", { name: `Associer ${apart} à cet attendu (recherche)`, exact: true })
    .click();
  await expect(
    second
      .getByRole("region", { name: "Ressources associées à cet attendu" })
      .getByRole("link", { name: apart }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("status").filter({ hasText: "2 couverts" })).toBeVisible();
});
