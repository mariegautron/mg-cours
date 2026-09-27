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

## ADR-015 — Dépôt de fichiers : direct navigateur → Storage

Les fonctions serveur (Vercel) plafonnent le corps de requête à ~4,5 Mo : un dépôt via Server Action échouerait en
production pour des slides. Le navigateur envoie donc le fichier directement dans le bucket privé `module-documents`
(RLS : dossier `<owner_id>/…`), puis une Server Action enregistre la ligne `module_document` après avoir vérifié le
préfixe du chemin. Limite 50 Mo par fichier. Seuls les documents légers sont déposés (attendus, trames, factures) : les slides restent dans Figma (lien), le stockage gratuit étant limité (~1 Go au total).

## ADR-016 — Historique des ressources par déclencheur SQL

Un déclencheur `before update` sur `resource` copie l'état précédent dans `resource_version` dès qu'un champ de
contenu change (30 versions max). Choisi plutôt qu'un code applicatif : il couvre aussi les imports et scripts, et ne
peut pas être oublié. Restaurer = ré-écrire la ressource ; l'état courant est lui-même sauvegardé, donc rien n'est perdu.
Pas de diff ligne à ligne (hors besoin), l'affichage montre la version complète.

## ADR-017 — Fiche pédagogique : extraction de texte « au mieux », sans OCR ni IA

`unpdf` lit le texte du PDF côté serveur ; des expressions régulières (`src/lib/modules/fiche.ts`, testées) repèrent
YCODE, niveau, heures, etc. Seules les valeurs trouvées préremplissent le formulaire, toujours relues avant
enregistrement. Pas d'OCR (PDF scanné → message clair) ni de service externe : gratuit, rapide, prévisible. Limite 4 Mo
(plafond des Server Actions sur Vercel). Heuristiques à affiner avec une vraie fiche YNOV.

## ADR-018 — Réglages : pas de masquage des champs sensibles, pas de mention « chiffré »

Une suggestion de revue proposait de masquer IBAN/SIRET/NDA (façon `FR76 •••• •••• 4068`, révélation au clic) et
d'afficher « 🔒 Données chiffrées ». Écarté : l'app n'a qu'un seul compte, protégé par l'authentification et la RLS
(`owner_id = auth.uid()`) — masquer ajoute de la friction de saisie sans gain réel, et rien n'est chiffré au niveau
applicatif, donc l'afficher serait une promesse inexacte. À la place : validations (SIRET Luhn, IBAN, NDA, téléphone),
regroupement de l'IBAN à la saisie, et une phrase neutre « Visible uniquement par vous ; reprise sur vos factures ».
Idem écartés : tooltip TVA (la mention explicative est déjà en clair, meilleur pour l'accessibilité), toast de
confirmation (le message `role="status"` inline suffit), accordéon mobile (les groupes sont déjà empilés en une colonne
sur petit écran, un accordéon cacherait des champs obligatoires).

## ADR-019 — Markdown : un seul parseur maison, pas de bibliothèque (`react-markdown`)

Les ressources importées de Notion contiennent des tableaux (136 pages), des listes imbriquées, des cases à cocher et
des encadrés `<aside>` que le parseur maison (`src/lib/pdf/markdown.ts`) ne couvrait pas encore. Option écartée :
`react-markdown` côté web + parseur maison complété côté PDF — deux moteurs à maintenir en cohérence, pour un gain
douteux (react-pdf ne peut de toute façon pas consommer une AST react-markdown). Choisi : étendre le parseur unique
existant (déjà partagé par `components/markdown.tsx` et `lib/pdf/markdown-view.tsx`) avec tableaux GFM, séparateurs,
listes imbriquées (pile d'indentation, largeur variable, pas un multiple fixe), cases à cocher en lecture seule,
titres jusqu'à h6, callouts `<aside>` (récursifs, ré-appellent `parseMarkdown` sur leur contenu) et `<br>`. Tout HTML
non reconnu reste du texte : le parseur ne construit jamais de DOM à partir d'une chaîne (pas de
`dangerouslySetInnerHTML`), donc rien à échapper explicitement — la sécurité vient de l'absence d'interprétation.

## ADR-020 — « Faire cours » : présentation projetée, privée, rendue côté serveur

Besoin (27/09) : l'app doit servir à **faire** cours, pas seulement à le préparer. Choisi : un route group
`(present)` plein écran, privé (même contrôle d'auth que `(app)`, `proxy.ts` inchangé), projeté depuis la session de
l'enseignante. Les diapositives sont rendues côté serveur avec le parseur Markdown unique (ADR-019) et
`<Markdown size="present">` ; une coque client (`PresentShell`) ne gère que la navigation. Découpage automatique aux
titres `#`/`##` et aux `---` : aucun format « slides » à saisir, les ressources Notion existantes se projettent telles
quelles, en mode document par défaut. Écartés : route publique / lien étudiant·es (US-40a, après le 12/10, jeton
révocable + fonction `security definer`) ; fenêtre « présentateur » à deux écrans ; bibliothèque de slides
(reveal.js…) — deux moteurs de rendu et un format à maintenir.

## ADR-021 — Visibilité par ressource (`audience`), filtrage centralisé

Un corrigé ne doit jamais partir chez les étudiant·es. Choisi : colonne `resource.audience` (`students` \| `teacher`)
distincte du type (`kind`) — un corrigé peut être publié (quiz NR), un « projet » peut être réservé (réponses du
client). Tout ce qui sort vers les étudiant·es passe par `studentFacing()` : présentation, export PDF des cours, futurs
liens. La migration marque d'office `teacher` les titres « Corrigé… » et le tag « banque de questions » ; le script de
migration Notion affine. Proposition non retenue pour le 12/10 : blocs « Prof » masqués à l'intérieur d'un contenu.
