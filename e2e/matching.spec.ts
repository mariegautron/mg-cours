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
  await page.getByRole("heading", { level: 1 }).first().waitFor();
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
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);

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

  // Proposition par mots-clés, avec le type ; « Associer à cet attendu » couvre l'attendu.
  const first = page.getByRole("region", { name: new RegExp(`Réaliser un audit ${word}`) });
  await expect(first.getByRole("link", { name: title, exact: true })).toBeVisible();
  await expect(
    first.locator("p", { hasText: new RegExp(`Mots de l’attendu retrouvés dans .*${word}`) }),
  ).toBeVisible();
  await expect(
    first.getByRole("listitem").filter({ hasText: title }).getByText("Pas encore utilisée"),
  ).toBeVisible();
  await first.getByRole("button", { name: `Associer ${title} à cet attendu` }).click();
  await expect(first.getByText("Associée", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 couvert" })).toBeVisible();

  // « À construire » crée une ressource à construire, retenue et rapprochée de l'attendu.
  await page.getByRole("link", { name: /Maîtriser la fiscalité/ }).click();
  const second = page.getByRole("region", { name: /Maîtriser la fiscalité/ });
  await second.getByRole("button", { name: "Créer et retenir" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "1 couvert, 1 à construire" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(second.getByText("À construire", { exact: true }).first()).toBeVisible();

  // L'association à une séance ne se fait plus ici : un lien discret mène à l'écran Séances.
  await page.getByRole("link", { name: /Présenter un projet/ }).click();
  const third = page.getByRole("region", { name: /Présenter un projet/ });
  await expect(third.getByLabel("Séance de cadrage")).toHaveCount(0);
  await expect(
    third.getByRole("link", { name: /Dire quelle séance traite cet attendu/ }),
  ).toHaveAttribute("href", `${new URL(moduleUrl).pathname}/courses`);
  await expect(page.getByRole("link", { name: /Maîtriser la fiscalité.*À voir/ })).toBeVisible();

  // Filtre « Sans ressource » : plus aucun attendu dans ce cas ; « À construire » en garde un.
  await page.getByRole("link", { name: /^À construire · 1/ }).click();
  await expect(page.getByRole("link", { name: /Maîtriser la fiscalité/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Réaliser un audit/ })).toHaveCount(0);

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // « Ce n'est pas la bonne » : la ressource n'est plus proposée pour cet attendu, même après rechargement.
  await page.getByRole("link", { name: /^Tous · 3/ }).click();
  await page.getByRole("link", { name: /Réaliser un audit/ }).click();
  await page.waitForLoadState("networkidle");
  const audit = page.getByRole("region", { name: new RegExp(`Réaliser un audit ${word}`) });
  await audit.getByRole("button", { name: `Retirer ${title}`, exact: true }).click();
  await expect(
    audit.getByRole("button", { name: `Associer ${title} à cet attendu`, exact: true }),
  ).toBeVisible();
  // L'aperçu s'ouvre dans un panneau à droite, sans quitter l'écran.
  await audit
    .getByRole("link", { name: /^Aperçu sans quitter l’écran/ })
    .first()
    .click();
  const panel = page.getByRole("complementary", { name: "Aperçu" });
  await expect(panel.getByText(title, { exact: true })).toBeVisible();
  await expect(panel.getByText(/Déjà rapprochée/)).toBeVisible();
  const axePanel = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axePanel.violations).toEqual([]);
  await panel.getByRole("button", { name: `Ce n’est pas la bonne : ${title}` }).click();
  await expect(audit.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("region", { name: new RegExp(`Réaliser un audit ${word}`) }).getByRole("link", {
      name: title,
      exact: true,
    }),
  ).toHaveCount(0);
  if (process.env.CAPTURE) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "docs/captures/rapprochement-v2.png", fullPage: true });
  }
});
