import { expect, type Locator, type Page } from "@playwright/test";

/** Zones d'un module, devenues des pages (plus d'onglets sur la fiche) : nom d'onglet → chemin. */
const MODULE_ZONES: [RegExp, string][] = [
  [/^S[ée]ances/, "/courses"],
  [/^Groupes/, "/groups"],
  [/^Administratif/, "/documents"],
  [/^Progression/, "/outline"],
];

/**
 * Ouvre une zone du module (anciennement un onglet de la fiche) en allant sur sa page. Pour un
 * vrai onglet ARIA d'une autre page (ex. « Aperçu » du formulaire de ressource), on clique dessus.
 */
export async function openTab(page: Page, name: string | RegExp) {
  const label = typeof name === "string" ? name : name.source.replace(/\\/g, "");
  const zone = MODULE_ZONES.find(([re]) => re.test(label));
  const moduleId = page.url().match(/\/modules\/([0-9a-f-]{36})/)?.[1];
  if (zone && moduleId) {
    const target = `/modules/${moduleId}${zone[1]}`;
    // Un enregistrement qui redirige vers la page visée peut être en cours : on le laisse finir
    // (aller ailleurs tout de suite interromprait l'action).
    await page
      .waitForURL((url) => url.pathname.startsWith(target), { timeout: 3_000 })
      .catch(() => undefined);
    if (!new URL(page.url()).pathname.startsWith(target)) await page.goto(target);
    return;
  }
  const tab = page.getByRole("tab", { name });
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true", { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
}

/** Déplie « Autres options de facturation » (facture Factur-X complète) sur la page d'un module. */
export async function openOtherBilling(page: Page) {
  const summary = page.getByText("Autres options de facturation");
  await expect(summary).toHaveCount(1);
  await summary.click();
}

/** Ouvre un module depuis la liste, quel que soit son état (En cours, À préparer, Terminés, Rangés). */
export async function openModuleFromList(page: Page, name: string | RegExp) {
  for (const filter of ["", "?filter=to_prepare", "?filter=finished", "?filter=archived"]) {
    await page.goto(`/modules${filter}`);
    const link = page.getByRole("link", { name }).first();
    if ((await link.count()) > 0) {
      await link.click();
      await page.waitForURL(/\/modules\/[0-9a-f-]{36}/);
      return;
    }
  }
  throw new Error(`Module introuvable dans la liste : ${String(name)}`);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Affiche un critère dans « Un critère à la fois » (clic sur son onglet) ; sans effet s'il n'y a pas d'onglets. */
export async function showCriterion(scope: Page | Locator, label: string) {
  const tab = scope
    .getByRole("group", { name: "Critères", exact: true })
    .getByRole("button", { name: new RegExp(`^(Bonus · )?${esc(label)}`) });
  if ((await tab.count()) > 0) await tab.first().click();
}

/** Saisit les points d'un critère numérique (champ « Libellé (/N) »). */
export async function setScore(scope: Page | Locator, label: string, value: string) {
  await showCriterion(scope, label);
  await scope
    .getByLabel(new RegExp(`^${esc(label)} \\(/`))
    .first()
    .fill(value);
}

/** Saisit le commentaire d'un critère (champ « Commentaire — Libellé »). */
export async function setCriterionComment(scope: Page | Locator, label: string, text: string) {
  await showCriterion(scope, label);
  await scope.getByLabel(`Commentaire — ${label}`, { exact: true }).fill(text);
}

/** Passe à la copie suivante (une seule copie est affichée à la fois). */
export async function nextCopy(page: Page) {
  await page
    .getByRole("button", { name: /^(?!Critère).* →$/ })
    .first()
    .click();
}

/** Revient à la première copie (après un rechargement, par exemple). */
export async function firstCopy(page: Page) {
  for (let i = 0; i < 20; i++) {
    const prev = page.getByRole("button", { name: /^← (?!Critère)/ });
    if ((await prev.count()) === 0) return;
    await prev.first().click();
  }
}

/** Après la création d'une évaluation : ouvre sa page de correction plein écran. */
export async function openCorrection(page: Page) {
  await page.waitForURL(/\/assessments\/[0-9a-f-]{36}$/);
  await page.goto(`${page.url()}/correct`);
  await page.getByRole("heading", { name: /^Corriger/, level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
}
