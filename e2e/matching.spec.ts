import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-54 : rapprocher attendus et ressources, retenir, noter à construire, couvrir par une séance", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  const stamp = Date.now();
  // Mot-clé unique : pas de collision avec les ressources déjà en base.
  const word = `zorglub${stamp}`;

  await page.goto("/resources/new");
  const title = `Audit ${word} accessibilité`;
  await page.getByLabel("Titre").fill(title);
  await page.getByLabel("Type").selectOption("workshop");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();

  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Rapprochement ${stamp}`);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();
  await page.waitForLoadState("networkidle");

  // Une séance pour couvrir le troisième attendu.
  await page.goto(`${moduleUrl}/courses/new`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Titre de la séance").fill("Séance de cadrage");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/#courses$/);

  // Trois attendus (texte collé, une ligne = un attendu).
  await page.goto(`${moduleUrl}/expectations`);
  await page.waitForLoadState("networkidle");
  await page
    .getByLabel(/Ou coller le texte/)
    .fill(
      `Réaliser un audit ${word}\nMaîtriser la fiscalité internationale quxblorf${stamp}\nPrésenter un projet en soutenance`,
    );
  await page.getByRole("button", { name: "Lire ce texte" }).click();
  await expect(page.getByText(/3 objectifs et 0 unité lus/)).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer les attendus" }).click();
  await expect(page.getByText("Attendus enregistrés.")).toBeVisible();

  await page.getByRole("link", { name: "Rapprocher avec les ressources" }).first().click();
  await page.waitForURL(/\/matching$/);
  await expect(page.getByRole("status").filter({ hasText: "0 couvert" })).toContainText(
    "3 sans ressource",
  );

  // Proposition par mots-clés, avec le type ; « Retenir » couvre l'attendu.
  const first = page.getByRole("region", { name: new RegExp(`Réaliser un audit ${word}`) });
  await expect(first.getByRole("link", { name: title })).toBeVisible();
  await expect(first.getByText(/Mots communs : .*zorglub/)).toBeVisible();
  await expect(first.getByText("Pas encore utilisée")).toBeVisible();
  await first.getByRole("button", { name: `Retenir ${title}` }).click();
  await expect(first.getByText("Retenue", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 couvert" })).toBeVisible();

  // « À construire » crée une ressource à construire, retenue et rapprochée de l'attendu.
  const second = page.getByRole("region", { name: /Maîtriser la fiscalité/ });
  await second.getByRole("button", { name: /à construire/i }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 couvert, 1 à construire" }),
  ).toBeVisible();
  await expect(second.getByText("À construire", { exact: true }).first()).toBeVisible();

  // Couvert par une séance.
  const third = page.getByRole("region", { name: /Présenter un projet/ });
  await third.getByLabel("Séance de cadrage").check();
  await third.getByRole("button", { name: /Enregistrer les séances/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "2 couverts, 1 à construire" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Bilan").getByRole("link", { name: /Maîtriser la fiscalité/ }),
  ).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);
});
