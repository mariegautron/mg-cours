import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("US-80b : promotion par année scolaire, import d'une année pour un·e étudiant·e déjà en base", async ({
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
  const email = `promo.${stamp}@ynov.com`;
  const older = `B3 Dev ${stamp}`;
  const recent = `M1 Dev ${stamp}`;
  const imported = `M2 Dev ${stamp}`;

  // Création : promotion de l'année 2024-25.
  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill(`Promo${stamp}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Année scolaire").selectOption("2024");
  await page.getByLabel("Promotion / groupe").fill(older);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL("**/students");

  // Modification : la promotion de 2025-26 s'ajoute sans écraser celle de 2024-25.
  await page.getByLabel("Recherche", { exact: true }).fill(`Promo${stamp}`);
  await page.getByRole("button", { name: "Filtrer" }).click();
  await page.getByRole("link", { name: new RegExp(`Camille Promo${stamp}`) }).click();
  await page.getByRole("link", { name: "Modifier" }).click();
  await expect(page.getByLabel("Promotion / groupe")).toHaveValue("");
  await page.getByLabel("Année scolaire").selectOption("2024");
  await expect(page.getByLabel("Promotion / groupe")).toHaveValue(older);
  await page.getByLabel("Année scolaire").selectOption("2025");
  await page.getByLabel("Promotion / groupe").fill(recent);
  await page.getByRole("button", { name: "Enregistrer" }).click();

  const promotions = page.getByRole("region", { name: "Promotions" });
  await expect(promotions.getByText(older)).toBeVisible();
  await expect(promotions.getByText(recent)).toBeVisible();
  await expect(page.getByText(`${recent} · 2025-26`).first()).toBeVisible();
  const studentUrl = page.url();

  // Import 2026-27 : la promotion s'ajoute à l'étudiant·e déjà en base, une nouvelle personne est créée.
  await page.goto("/students/import");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Année scolaire").selectOption("2026");
  const csv = `Nom,Prénom,Email,Promotion\nPromo${stamp},Camille,${email},${imported}\nNouveau${stamp},Noa,noa.${stamp}@ynov.com,${imported}\n`;
  await page.setInputFiles("#file", {
    name: "promo.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf-8"),
  });
  await expect(page.getByText("Année 2026-27")).toBeVisible();
  await expect(page.getByText("1 à importer")).toBeVisible();
  await expect(page.getByText("1 déjà en base, à inscrire")).toBeVisible();
  await expect(page.getByText("déjà en base : inscription à 2026-27")).toBeVisible();
  await page.getByRole("button", { name: /Confirmer l’import \(2\)/ }).click();
  await expect(
    page.getByText(/1 étudiant·e importé·e\. 1 étudiant·e déjà en base inscrit·e à 2026-27\./),
  ).toBeVisible();

  // La fiche garde les trois années.
  await page.goto(studentUrl);
  const all = page.getByRole("region", { name: "Promotions" });
  for (const promo of [older, recent, imported]) await expect(all.getByText(promo)).toBeVisible();
  await expect(page.getByText(`${imported} · 2026-27`).first()).toBeVisible();
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Filtre « année scolaire » : chaque année ne montre que ses inscrit·es, avec la promo de l'année.
  await page.goto(`/students?year=2024&q=Promo${stamp}`);
  await expect(page.getByRole("link", { name: new RegExp(`Camille Promo${stamp}`) })).toContainText(
    older,
  );
  await page.goto(`/students?year=2026&scholarGroup=${encodeURIComponent(imported)}`);
  await expect(page.getByRole("link", { name: new RegExp(`Camille Promo${stamp}`) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`Noa Nouveau${stamp}`) })).toBeVisible();
  await page.goto(`/students?year=2025&scholarGroup=${encodeURIComponent(imported)}`);
  await expect(page.getByRole("link", { name: new RegExp(`Camille Promo${stamp}`) })).toHaveCount(
    0,
  );
});
