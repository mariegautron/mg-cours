# Décisions d'architecture (ADR courts)

## ADR-001 — Next.js 16 plutôt que Vite SPA

`create-next-app` installe Next 16 (React 19). Route handlers serveur nécessaires pour
l'e-mail, la génération Factur-X et l'extraction PDF (secrets côté serveur). SPA Vite
aurait imposé un second runtime (Edge Functions).

## ADR-002 — Auth : Supabase Auth, 1 compte

Marie est seule utilisatrice. E-mail + mot de passe, compte créé via le dashboard Supabase.
RLS `owner_id = auth.uid()` partout → multi-utilisateur possible plus tard sans refonte.

## ADR-003 — Pas d'intégration API temps réel

Moodle / Hyperplanning / Notion : **import de fichiers** (CSV / XLSX / export ZIP) +
1 script one-shot pour la migration Notion. Évite la dépendance aux accès API YNOV.

## ADR-004 — Facturation électronique dès le départ

La facture PDF simple n'est plus acceptée (obligation 01/09/2026). Génération **Factur-X**
(PDF/A-3 + XML CII), profil BASIC, via une lib dédiée (pas de XML à la main). Canal PA ou
e-mail structuré selon confirmation YNOV.

## ADR-005 — Fusion « Séance » / « Activité pédagogique » → `course`

L'espace Notion de Marie distingue Séance et Activité. Pour le MVP, un `course` = une séance
datée liée à une `resource` principale (+ secondaires). Découpage plus fin possible en V2.

## ADR-006 — Modèle minimal, pas de sur-ingénierie

Pas de table de versioning des ressources, pas de `change_log`/audit, pas de state manager
(RSC + Server Actions), éditeur Markdown simple. On ajoute si un besoin réel apparaît.

## ADR-007 — BMAD « allégé », sans tooling installé

Rôles Product / Architecte / UX / Dev tenus via `docs/prd.md`, `docs/architecture.md`,
`docs/ux-ui-spec.md` — pas de `npx bmad init` (éviterait un dossier d'outil dans le repo et
la cérémonie lourde vs la deadline).

## ADR-008 — Aucune trace d'outil d'IA dans le repo

Ni commits, ni PR, ni UI, ni factures. `CLAUDE.md` (régénéré par `next dev`) est gitignoré ;
le fichier de gouvernance est `AGENTS.md`.

## ADR-009 — Credentials Supabase Cloud : jamais dans un nom de fichier « magique » Next.js

⚠️ **Piège vécu** : Next.js charge automatiquement `.env`, `.env.local`, `.env.production`,
`.env.production.local`, `.env.test`, `.env.test.local` selon `NODE_ENV` — avec
`.env.production.local` **prioritaire sur `.env.local`** pour `next build`/`next start`.
Un fichier `.env.production.local` créé pour simplement _stocker_ les identifiants du
projet Supabase Cloud a fait pointer `pnpm build` local vers la base cloud (vide) au lieu
du Supabase local, provoquant des échecs de connexion silencieux (aucune requête vers
`127.0.0.1:54321`, erreur générique « e-mail ou mot de passe incorrect »).
→ Les identifiants Supabase Cloud sont stockés dans **`.env.vercel.local`** (nom non
reconnu par Next.js, gitignoré comme tout `.env*`) : lisible pour référence, jamais chargé
automatiquement. Le déploiement réel utilisera les variables d'environnement du dashboard
Vercel, pas un fichier local.
