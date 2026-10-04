import { expect, test } from "@playwright/test";

// Enregistrement automatique côté serveur : la ressource existe dès que le titre et le type sont
// connus, « Marquer comme prête » la met à jour sans en créer une seconde.
test("ressource : enregistrée toute seule, puis marquée prête sans doublon", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const title = `Brouillon auto ${Date.now()}`;
  await page.goto("/resources/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Titre", { exact: true }).fill(title);
  await page.getByRole("radiogroup", { name: "C’est un…" }).getByText("Cours").click();
  await page.getByLabel("Contenu (Markdown)").fill("# Premier jet\n\nPas fini.");
  await expect(page.getByText(/Enregistré automatiquement à/)).toBeVisible({ timeout: 20_000 });

  // La bibliothèque la montre déjà, « à construire ».
  const lib = await page.context().newPage();
  await lib.goto(`/resources?q=${encodeURIComponent(title)}`);
  await expect(lib.getByText(title).first()).toBeVisible();
  await lib.close();

  await page.getByRole("button", { name: "Marquer comme prête" }).click();
  await page.waitForURL(/\/resources\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

  await page.goto(`/resources?q=${encodeURIComponent(title)}`);
  await expect(page.getByRole("link", { name: title })).toHaveCount(1);
});

// « Où l'utiliser ? » : la ressource créée est retenue pour le module choisi.
test("ressource créée depuis le rapprochement : titre prérempli et retenue pour le module", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const stamp = Date.now();
  const moduleName = `Module où l’utiliser ${stamp}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(moduleName);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  const title = `Atelier retenu ${stamp}`;
  await page.goto(
    `/resources/new?module=${moduleUrl.split("/").pop()}&title=${encodeURIComponent(title)}`,
  );
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(title);
  await expect(page.getByLabel(/Où l’utiliser/)).toHaveValue(moduleUrl.split("/").pop()!);
  await page.getByRole("radiogroup", { name: "C’est un…" }).getByText("Atelier").click();
  await page.getByRole("button", { name: "Marquer comme prête" }).click();
  await page.waitForURL(/\/resources\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  await page.goto(`${moduleUrl}/courses/new`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel(title)).toBeVisible();
});
