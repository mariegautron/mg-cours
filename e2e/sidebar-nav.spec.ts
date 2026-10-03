import { expect, test } from "@playwright/test";

// Lecture seule : menu latéral à cinq entrées, entrée courante marquée, pages hors menu joignables.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();
}

const ENTRIES = [
  ["Aujourd’hui", "/dashboard"],
  ["Modules", "/modules"],
  ["Étudiant·es", "/students"],
  ["Bibliothèque", "/resources"],
  ["Réglages", "/settings"],
] as const;

test("le menu a cinq entrées, l’entrée courante est marquée, cibles de 44 px", async ({ page }) => {
  await login(page);
  const menu = page.locator("[data-sidebar=menu]");
  await expect(menu.getByRole("link")).toHaveCount(5);
  for (const [label, href] of ENTRIES) {
    const link = menu.getByRole("link", { name: label });
    await expect(link).toHaveAttribute("href", href);
    const box = await link.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expect(menu.getByRole("link", { name: "Aujourd’hui" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await menu.getByRole("link", { name: "Bibliothèque" }).click();
  await page.waitForURL("**/resources");
  await expect(menu.getByRole("link", { name: "Bibliothèque" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(menu.getByRole("link", { name: "Aujourd’hui" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("les pages sorties du menu restent joignables par un lien visible", async ({ page }) => {
  await login(page);
  await page.goto("/modules");
  await page.getByRole("link", { name: "Facturation" }).click();
  await page.waitForURL("**/billing");
  await page.goto("/modules");
  await page.getByRole("link", { name: "Évaluations" }).click();
  await page.waitForURL("**/assessments");
  await page.goto("/resources");
  for (const [name, url] of [
    ["Questions", "**/questions"],
    ["Grilles", "**/assessments/grids"],
    ["Phrases", "**/assessments/comments"],
  ] as const) {
    await page.goto("/resources");
    await page.getByRole("link", { name, exact: true }).click();
    await page.waitForURL(url);
  }
});

test("module ouvert : ses six entrées sous « Modules » dans le menu, repliables, sans barre horizontale", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await login(page);
  const name = `Module Menu ${Date.now()}`;
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  const sub = page.getByRole("navigation", { name });
  await expect(sub.getByRole("link")).toHaveCount(6);
  await expect(sub.getByRole("link", { name: "Où j’en suis" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const link of await sub.getByRole("link").all()) {
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  // La barre horizontale a disparu sur ordinateur.
  await expect(page.getByRole("navigation", { name: "Sections du module (liens)" })).toHaveCount(0);

  await sub.getByRole("link", { name: "Facture" }).click();
  await page.waitForURL(`${moduleUrl}/billing`);
  await expect(sub.getByRole("link", { name: "Facture" })).toHaveAttribute("aria-current", "page");
  await expect(sub.getByRole("link", { name: "Où j’en suis" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  // Repli et dépli au clavier.
  const toggle = page.getByRole("button", { name: "Replier le menu du module" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Déplier le menu du module" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(sub.getByRole("link", { name: "Facture" })).toBeHidden();
  await page.keyboard.press("Enter");
  await expect(sub.getByRole("link", { name: "Facture" })).toBeVisible();

  // Hors module : le sous-menu disparaît.
  await page.goto("/students");
  await expect(page.getByRole("navigation", { name })).toHaveCount(0);

  // Tablette : le menu est un rail d'icônes, la barre horizontale reprend les six liens.
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(`${moduleUrl}/billing`);
  await expect(
    page
      .getByRole("navigation", { name: "Sections du module (liens)" })
      .getByRole("link", { name: "Documents" }),
  ).toBeVisible();

  // Téléphone : « Plus » ouvre le tiroir avec le module.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`${moduleUrl}/billing`);
  await page.getByRole("button", { name: "Plus" }).click();
  const drawerSub = page.getByRole("dialog").getByRole("navigation", { name });
  await expect(drawerSub.getByRole("link")).toHaveCount(6);
  await drawerSub.getByRole("link", { name: "Séances" }).click();
  await page.waitForURL(`${moduleUrl}/courses`);
});
