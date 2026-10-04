import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// « Mot de passe oublié » : la demande répond pareil que l'adresse existe ou non ; un lien expiré ou
// sans session ramène à la demande ; aucun détour vers un autre site.
test("mot de passe oublié : réponse neutre, lien expiré, pas de redirection ouverte", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  await page.waitForURL("**/login/oubli");
  await expect(page.getByRole("heading", { name: "Mot de passe oublié", level: 1 })).toBeVisible();

  await page.getByLabel("Adresse e-mail").fill("pas-une-adresse");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  // Le navigateur refuse déjà une adresse invalide ; une adresse correcte inconnue répond pareil.
  await page.getByLabel("Adresse e-mail").fill(`inconnue.${Date.now()}@exemple.fr`);
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByText(/Si cette adresse correspond à un compte/)).toBeVisible({
    timeout: 20_000,
  });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(axe.violations).toEqual([]);

  // Sans session de récupération : retour à la demande, avec l'explication.
  await page.goto("/login/nouveau");
  await page.waitForURL(/\/login\/oubli\?expired=1/);
  await expect(page.getByText(/expiré ou a déjà servi/)).toBeVisible();

  // Code invalide : même retour ; `next` hors de l'appli est ignoré.
  await page.goto("/auth/callback?code=invalide&next=https://evil.example");
  await page.waitForURL(/\/login\/oubli\?expired=1/);
});
