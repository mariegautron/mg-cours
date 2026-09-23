import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture seule (aucune écriture en base) : vérifie contraste et accessibilité des écrans
// principaux dans les deux thèmes avec la palette « ludique & colorée ».
const PAGES = [
  "/dashboard",
  "/modules",
  "/modules/new",
  "/resources",
  "/resources/new",
  "/students",
  "/students/import",
  "/assessments",
  "/assessments/grids",
  "/assessments/comments",
  "/billing",
  "/settings",
];

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

for (const theme of ["dark", "light"] as const) {
  test(`accessibilité (axe) des écrans principaux — thème ${theme}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript((t) => window.localStorage.setItem("theme", t), theme);

    // La page de connexion aussi (avant authentification).
    await page.goto("/login");
    const loginAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(loginAxe.violations, `login ${theme}`).toEqual([]);

    await login(page);
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);

    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`),
        `${path} (${theme})`,
      ).toEqual([]);
    }
  });
}

test("le bouton de thème bascule clair/sombre", async ({ page }) => {
  await login(page);
  const html = page.locator("html");
  const before = await html.getAttribute("class");
  await page.getByRole("button", { name: /Changer de thème/ }).click();
  await expect(html).not.toHaveAttribute("class", before ?? "");
});
