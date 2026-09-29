import { expect, type Page } from "@playwright/test";

/**
 * Ouvre un onglet de la fiche module. Un clic donné avant l'hydratation de la page est perdu :
 * on recommence jusqu'à ce que l'onglet soit réellement sélectionné.
 */
export async function openTab(page: Page, name: string | RegExp) {
  const tab = page.getByRole("tab", { name });
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}
