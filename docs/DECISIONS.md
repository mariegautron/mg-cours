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

## ADR-010 — Import CSV : toujours décoder le texte en UTF-8 nous-mêmes

⚠️ **Piège vécu (E4)** : `XLSX.read(arrayBuffer, { type: "array" })` décode les octets d'un
CSV texte en Latin-1 (« Prénom » devient « PrÃ©nom »), ce qui casse la reconnaissance de
colonnes accentuées et faisait échouer l'import CSV en silence (toutes les lignes en erreur,
sans qu'aucun test unitaire — écrit avec `type: "string"` — ne l'ait détecté). Attrapé par
le test e2e d'import.
→ `previewStudentsImport` (`src/app/(app)/students/actions.ts`) détecte l'extension/le type
MIME : un `.csv` est décodé en UTF-8 (`TextDecoder`) puis passé en `string` à
`parseStudentsFile` ; seul un vrai binaire XLSX passe par le chemin `ArrayBuffer`. Un test
de régression construit un classeur XLSX réel (`XLSX.write`) pour couvrir ce second chemin.

## ADR-011 — Factur-X : XML généré par gabarit, validé par la lib (ADR-004 précisé)

`@stafyniaksacha/facturx` (XSD + Schematron officiels EN 16931, génération PDF/A-3) est utilisée
pour **valider et embarquer** ; le XML CII est produit par un gabarit (`snapshotToXml`) plutôt que
via les classes du modèle, beaucoup plus verbeuses. Garde-fou : chaque émission appelle `check`
avec `schematron: true` et refuse d'enregistrer si le XML est invalide (testé : XML valide en
franchise 293 B et à 20 %, XML aux totaux faux rejeté). Profil **EN 16931** (et non BASIC) pour
rester dans le socle de la réforme française.
Hypothèses à confirmer avec YNOV / la PA : franchise 293 B = catégorie TVA « E » avec motif +
identifiant fiscal `FC` = SIREN ; adresses sans découpage postal (ligne libre + pays FR) ; PDF/A-3
non vérifié par veraPDF ici. → faire tester une **facture d'essai** avant la première vraie.

## ADR-012 — Facture immuable : instantané + une facture par module

`invoice.snapshot` fige vendeur, acheteur, ligne, montants et échéance ; PDF et XML sont
régénérés à partir de lui (pas de stockage de fichiers, pas de dérive si le profil change ensuite).
Une facture envoyée ne peut plus être supprimée. Contrainte unique `invoice(module_id)`.

## ADR-013 — Design : tokens CSS + illustrations SVG maison, sans dépendance

Palette, halos et animations en CSS pur (tokens `:root` / `.dark`, `@theme inline`) ; mascotte et logo en
SVG React (`mascot.tsx`) qui héritent des tokens → aucun asset binaire, aucune lib d'animation, thème clair
et sombre gratuits. Contrastes validés par calcul puis par axe-core (`e2e/design.spec.ts`, lecture seule,
2 thèmes × 12 écrans). Les documents PDF restent neutres (la facture ne porte jamais l'identité graphique).

## ADR-014 — Tarif horaire : uniquement sur le module

Le tarif varie selon l'école, le niveau et le module : `module.hourly_rate` est la seule source
(champ « Tarif horaire HT (€) » du formulaire module, copié à la duplication). Plus de tarif par défaut
sur `teacher_profile` (colonne supprimée). Facture bloquée tant que le tarif du module est vide.
