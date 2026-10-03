import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { localEnv } from "./env";
import { openTab } from "./helpers";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
test("archive un module : masqué de la liste puis visible dans l’onglet « Rangés »", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  const name = `Module archivable ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2025");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");

  await openTab(page, /Administratif/);
  await page.getByRole("button", { name: "Archiver le module" }).click();
  await expect(page.getByRole("button", { name: "Restaurer le module" })).toBeVisible();
  // Fiche du module : carte « Ce module est terminé ».
  await page.goto(page.url().replace(/\/documents$/, ""));
  await expect(
    page.getByRole("heading", { name: "Ce module est terminé", level: 2 }),
  ).toBeVisible();
  const done = await new AxeBuilder({ page })
    .exclude("[data-sonner-toaster]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(done.violations).toEqual([]);

  await page.goto("/modules?filter=to_prepare");
  await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);

  await page.goto("/modules?filter=archived");
  await expect(page.getByRole("link", { name: /^Rangés · \d+$/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();

  await page.goto("/billing");
  await expect(page.getByText(name)).toHaveCount(0);
});

test("US-160 : terminer un module depuis la liste, avec annulation pendant 10 secondes", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/modules/new");
  const name = `Module à terminer ${Date.now()}`;
  await page.getByLabel("Nom du module").fill(name);
  await page.getByLabel("Année").fill("2025");
  await page.getByLabel("Nombre d’heures total").fill("21");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/modules\/[0-9a-f-]{36}$/);

  // « En cours » = au moins une séance faite : on crée une séance puis on la marque faite (API locale).
  const moduleUrl = page.url();
  const moduleId = moduleUrl.split("/").pop()!;
  await page.goto(`${moduleUrl}/courses/new`);
  await page.getByLabel("Titre de la séance").fill("Séance unique");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForURL(/\/courses(\/[0-9a-f-]{36})?$/);
  const env = localEnv();
  const res = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/course?module_id=eq.${moduleId}`,
    {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ completion: "done" }),
    },
  );
  expect(res.ok).toBe(true);

  await page.goto("/modules");
  const row = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, level: 2 }) });
  await expect(row.getByText("Cours faits")).toBeVisible();
  await row.getByRole("button", { name: `Terminer : ${name}` }).click();
  const dialog = page.getByRole("alertdialog", { name: "Terminer le module" });
  await expect(dialog.getByText(`Terminer « ${name} » ?`)).toBeVisible();
  await dialog.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page.getByText(`« ${name} » est terminé.`)).toBeVisible();
  await expect(page.getByRole("heading", { name, level: 2 })).toHaveCount(0);

  // Annuler pendant les 10 secondes : le module revient dans « En cours ».
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();

  // Terminer pour de bon : « Terminés », puis Ranger → « Rangés ».
  await row.getByRole("button", { name: `Terminer : ${name}` }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Terminer", exact: true })
    .click();
  await expect(page.getByText(`« ${name} » est terminé.`)).toBeVisible();
  await page.goto("/modules?filter=finished");
  const finished = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, level: 2 }) });
  await expect(finished.getByText("Terminé", { exact: true })).toBeVisible();
  await finished.getByRole("button", { name: `Ranger : ${name}` }).click();
  await expect(page.getByText(`« ${name} » est rangé.`)).toBeVisible();
});
