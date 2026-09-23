# Déploiement & recette

## Architecture de prod

Vercel (Next.js 16) → Supabase Cloud (projet `mg-cours`, région `eu-central-1` : Postgres + Auth).
Aucun autre service obligatoire ; **Resend** (e-mails) est optionnel.

## Variables d'environnement (Vercel → Settings → Environment Variables, _Production_)

| Variable                        | Rôle                                                       | Obligatoire                      |
| ------------------------------- | ---------------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL du projet (`https://<ref>.supabase.co`)                | oui                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé **publishable** Supabase                               | oui                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | clé **secret** (serveur uniquement, marquer « Sensitive ») | prévue, pas utilisée aujourd'hui |
| `NEXT_PUBLIC_APP_URL`           | URL publique (`https://mg-cours.vercel.app`)               | oui                              |
| `RESEND_API_KEY`                | envoi des résultats et factures par e-mail                 | non (fonction désactivée sinon)  |
| `RESEND_FROM`                   | expéditeur vérifié dans Resend                             | avec `RESEND_API_KEY`            |

Les variables `NEXT_PUBLIC_*` sont figées **au build** : après modification → **redéployer**.
Ne jamais nommer un fichier d'identifiants `.env.production.local` (voir ADR-009).

## Mise en place de Supabase Cloud (une fois)

1. **Schéma** : `pnpm exec supabase db push --project-ref <ref> --password <mot de passe base>`
   (les migrations sont additives ; état actuel : 4 migrations appliquées).
2. **Compte** : Authentication → Users → _Add user_ (e-mail + mot de passe, _Auto Confirm User_).
3. **Fermer les inscriptions** : Authentication → Sign In / Providers → désactiver
   _Allow new users to sign up_. ⚠️ Par défaut l'API d'inscription est publique : sans ça, n'importe qui
   peut créer un compte (il ne verrait pas tes données — RLS testée — mais consommerait ta base).
4. RLS : déjà active sur les 16 tables via les migrations (le réglage « automatic RLS » du projet peut
   rester désactivé).

## Premier déploiement — checklist de recette (à faire une fois en prod)

1. `/login` → connexion avec ton compte.
2. **Réglages** : profil complet (SIRET, TVA ou 293 B, tarif, RIB avec IBAN) + écoles.
3. Créer un module (école, YCODE, heures, **1re séance**, référence bon de commande), ses séances, un groupe
   avec des étudiants (import CSV possible).
4. Générer la trame → télécharger le PDF → « Marquer comme envoyée ».
5. Créer les évaluations minimales, saisir les notes, cocher les 5 documents administratifs.
6. **Facture d'essai** : Générer la facture → télécharger le **PDF Factur-X** et le **XML** → les faire
   valider par YNOV / la Plateforme Agréée **avant** la première vraie facture.
   (La lib Factur-X charge WASM/XSD à l'exécution : si la génération échoue sur Vercel, c'est ici qu'on le verra.)
7. Supprimer la facture d'essai si elle n'a pas été envoyée (bouton « Supprimer la facture »).

## Ce qui est vérifié automatiquement

- CI GitHub Actions à chaque push : lint, format, typecheck, tests unitaires (83+), build, puis e2e complets
  sur un Supabase local (parcours ressource → module → étudiants → évaluations → trame → facture Factur-X,
  accessibilité axe, **isolation RLS entre deux comptes**).
- Prod : `/login` répond 200 ; toute route privée et toute route `/api/*` redirigent vers `/login` sans session.

## Retour arrière

- Code : `git revert` + push (Vercel redéploie).
- Base : les migrations sont additives ; ne pas supprimer de colonne en prod sans sauvegarde.
- Facture erronée non envoyée : la supprimer et la régénérer ; envoyée : émettre un avoir (hors MVP).

## Risques connus

- Facture Factur-X : hypothèses fiscales (catégorie « E » + identifiant FC en franchise) et PDF/A-3 à faire
  valider par YNOV/la PA ; non testé sur Vercel avant la recette ci-dessus.
- E-mails : inactifs tant que Resend n'est pas configuré (l'app l'indique clairement).
- Pas de sauvegarde automatique configurée côté app : activer les sauvegardes Supabase (plan payant) ou
  exporter régulièrement.
