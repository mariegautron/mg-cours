import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Lecture seule : recherche globale (Ctrl K), clavier et accessibilité de la boîte de dialogue.
test("Ctrl K ouvre la recherche, Échap la ferme et rend le focus, 0 violation axe", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  const trigger = page.getByRole("button", { name: /Rechercher/ });
  await trigger.focus();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();

  await input.fill("zzzzqx");
  await expect(dialog.getByText(/Rien pour « zzzzqx »/)).toBeVisible();
  const empty = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(empty.violations).toEqual([]);

  await input.fill("mod");
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
