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

/** Déplie « Autres options de facturation » (facture Factur-X complète) sur la page d'un module. */
export async function openOtherBilling(page: Page) {
  await page.getByText("Autres options de facturation").click();
}

/** Ouvre un module depuis la liste, quel que soit son état (En cours, À préparer, Terminés, Rangés). */
export async function openModuleFromList(page: Page, name: string | RegExp) {
  for (const filter of ["", "?filter=to_prepare", "?filter=finished", "?filter=archived"]) {
    await page.goto(`/modules${filter}`);
    const link = page.getByRole("link", { name }).first();
    if ((await link.count()) > 0) {
      await link.click();
      return;
    }
  }
  throw new Error(`Module introuvable dans la liste : ${String(name)}`);
}
