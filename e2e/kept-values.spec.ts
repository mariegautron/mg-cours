import { expect, test } from "@playwright/test";

// Nécessite Supabase local (`pnpm db:start` + `pnpm db:reset`).
// « Ta saisie est conservée » doit être vrai : après une erreur du serveur, le formulaire garde ce
// qui a été saisi (React 19 vide sinon les champs non contrôlés à la fin de l'action).
test("une erreur de validation garde la saisie et propose une issue", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("marie@local.test");
  await page.getByLabel("Mot de passe").fill("password123");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading", { level: 1 }).first().waitFor();

  await page.goto("/students/new");
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Conservée");
  await page.getByLabel("E-mail").fill("pas-un-email");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).toHaveURL(/\/students\/new$/);
  await expect(page.getByLabel("Prénom")).toHaveValue("Camille");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Conservée");
  await expect(page.getByLabel("E-mail")).toHaveValue("pas-un-email");
});
