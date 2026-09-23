import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
}

const IBAN = "FR7630006000011234567890189";

test("facturation YNOV : blocages puis facture Factur-X, envoi et paiement", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  const suffix = Date.now();

  // Profil prestataire complet (franchise 293 B).
  await page.goto("/settings");
  await page.getByLabel("Adresse", { exact: true }).fill("1 rue de l’Enseignement 44000 Nantes");
  await page.getByLabel("SIRET").fill("123 456 789 00012");
  await page.getByLabel("Tarif horaire HT (€)").fill("50");
  await page.getByLabel("RIB (IBAN + BIC)").fill(`IBAN ${IBAN}`);
  await page.getByLabel(/TVA non applicable/).check();
  await page.getByRole("button", { name: "Enregistrer le profil" }).click();
  await expect(page.getByText("Profil enregistré.")).toBeVisible();

  // École.
  await page.getByRole("link", { name: "Ajouter une école" }).click();
  const schoolName = `École Facture ${suffix}`;
  await page.getByLabel("Nom de l’école / campus").fill(schoolName);
  await page.getByLabel("SIRET").fill("80442673200033");
  await page.getByLabel("E-mail de facturation").fill("fournisseurs@example.fr");
  await page.getByLabel("Adresse", { exact: true }).fill("Nantes");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(schoolName)).toBeVisible();

  // Module de 4 h (→ 2 notes : 1 de groupe + 1 individuelle) avec toutes les mentions.
  await page.goto("/modules/new");
  await page.getByLabel("Nom du module").fill(`Module Facture ${suffix}`);
  await page.getByLabel("École", { exact: true }).selectOption({ label: schoolName });
  await page.getByLabel("Année").fill("2026");
  await page.getByLabel("YCODE").fill(`A2627_${String(suffix).slice(-4)}`);
  await page.getByLabel("Nombre d’heures total").fill("4");
  await page.getByLabel("Date de la 1re séance").fill("2026-12-01");
  await page.getByLabel("Référence bon de commande").fill("PO-2026-12345");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  const moduleUrl = page.url();

  // Facturation bloquée : rien n'est prêt.
  await page.goto(`${moduleUrl}/billing`);
  await expect(page.getByRole("heading", { name: /Facturation —/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Générer la facture" })).toBeDisabled();
  await expect(page.getByText(/Trame pédagogique envoyée/)).toBeVisible();

  // Étudiant·e + groupe + 2 évaluations notées.
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Ines");
  await page.getByLabel("Nom", { exact: true }).fill(`Faure${suffix}`);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await page.goto(moduleUrl);
  await page.getByRole("link", { name: "Ajouter un groupe" }).click();
  await page.getByLabel("Nom du groupe").fill(`Groupe F ${suffix}`);
  await page.getByRole("button", { name: "Créer le groupe" }).click();
  await page
    .getByRole("listitem")
    .filter({ hasText: `Ines Faure${suffix}` })
    .getByRole("button", { name: /Ajouter/ })
    .click();
  await expect(page.getByText("Membres (1)")).toBeVisible();

  for (const [title, isGroup, value] of [
    ["Projet", true, "14"],
    ["Oral", false, "12"],
  ] as const) {
    await page.goto(`${moduleUrl}/assessments/new`);
    await page.getByLabel("Titre").fill(`${title} ${suffix}`);
    await page.getByLabel("Groupe", { exact: true }).selectOption({ label: `Groupe F ${suffix}` });
    if (isGroup) await page.getByLabel(/Note de groupe/).check();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.getByLabel("Note", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Enregistrer la note" }).click();
    await expect(page.getByText("Note enregistrée.")).toBeVisible();
  }

  // Trame envoyée + documents administratifs.
  await page.goto(moduleUrl);
  await page.getByRole("button", { name: "Générer la trame" }).click();
  await expect(page.getByText(/Générée le/)).toBeVisible();
  await page.getByRole("button", { name: "Marquer comme envoyée" }).click();
  await expect(page.getByText(/envoyée le/)).toBeVisible();
  for (const label of [
    "Fiche de positionnement",
    "Progression pédagogique",
    "Supports déposés sur Moodle",
    "Sujets et grilles déposés sur Moodle",
    "Notes saisies dans Hyperplanning",
  ]) {
    await page.getByRole("switch", { name: label }).click();
    await expect(page.getByRole("switch", { name: label })).toBeChecked();
  }

  // Tout est vert : génération de la facture.
  await page.goto(`${moduleUrl}/billing`);
  await expect(page.getByText("Toutes les informations requises sont renseignées.")).toBeVisible();
  const generate = page.getByRole("button", { name: "Générer la facture" });
  await expect(generate).toBeEnabled();
  await generate.click();
  await expect(page.getByRole("heading", { name: /Facture \d{4}-\d{3}/ })).toBeVisible();
  await expect(page.getByText("200,00 €").first()).toBeVisible();

  // Téléchargements : PDF Factur-X et XML.
  const link = await page
    .getByRole("link", { name: /Télécharger le PDF Factur-X/ })
    .getAttribute("href");
  const pdf = await page.request.get(link!);
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  const xml = await page.request.get(link!.replace("/pdf", "/xml"));
  const xmlBody = await xml.text();
  expect(xmlBody).toContain("urn:cen.eu:en16931:2017");
  expect(xmlBody).toContain("PO-2026-12345");
  expect(xmlBody).toContain("TVA non applicable, art. 293 B du CGI");

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Envoi (manuel) puis paiement.
  await page.getByRole("button", { name: "Marquer comme envoyée" }).click();
  await expect(page.getByText("Envoyée", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Marquer comme payée" }).click();
  await expect(page.getByText("Payée", { exact: true })).toBeVisible();

  // Vue d'ensemble.
  await page.goto("/billing");
  await expect(page.getByText(new RegExp(`Module Facture ${suffix}`))).toBeVisible();
});
