import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture seule : accessibilité transversale de la coque (US-119) sur trois pages représentatives.
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

test("coque : lien d’évitement, repères uniques, axe et pas de défilement horizontal à 320 px", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);

  // Un module existant pour la fiche et une sous-page.
  await page.goto("/modules");
  const first = page.locator("main a[href^='/modules/']:not([href='/modules/new'])").first();
  const hasModule = (await first.count()) > 0;
  const urls = ["/dashboard"];
  if (hasModule) {
    const href = (await first.getAttribute("href"))!.split("?")[0].split("#")[0];
    urls.push(href, `${href}/billing`);
  }

  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    for (const url of urls) {
      await page.goto(url);
      await expect(page.locator("main")).toHaveCount(1);
      const navs = await page
        .locator("nav:visible")
        .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
      expect(navs.every(Boolean)).toBe(true);
      expect(new Set(navs).size).toBe(navs.length);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .disableRules(["region"])
        .analyze();
      expect(results.violations, `${url} @${width}`).toEqual([]);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `défilement horizontal ${url} @${width}`).toBeLessThanOrEqual(0);
    }
  }

  // Lien d'évitement : premier élément focusable, visible au focus, déplace le focus dans le contenu.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contenu")).toBeFocused();
});
