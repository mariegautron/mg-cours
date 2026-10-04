# Règles métier YNOV

Source : Notion « MG COURS - Documentation Projet COMPLETE » (2026-09-01) + procédure
« FACTURATION INTERVENANTS - NYC » + e-mail YNOV du 25/06/2026.

## 1. Système de notation

| Heures du module | Notes totales | Notes de groupe | Notes individuelles |
| ---------------- | ------------- | --------------- | ------------------- |
| 4 à 16 h         | 2             | 1               | 1                   |
| 20 à 48 h        | 3             | 2               | 1                   |
| 52 à 70 h        | 5             | 3               | 2                   |

- Coefficients : **note de groupe ×1**, **note individuelle ×3**.
- Toute note est d'abord **ramenée sur 20** : barème de l'évaluation = `max_score`, sinon
  total des critères de la grille, sinon 20 (ex. 15/30 → 10/20, oral Moodle 18/24 → 15/20).
  Une grille peut être notée sur un autre barème (grille /30 notée /20 : 24/30 → 16/20).
- Total des points = Σ(note sur 20 × coefficient).
- Exemple (module 21 h) : 2 notes de groupe (14, 16) + 1 individuelle (12)
  → points = 14 + 16 + 36 = 66 ; poids = 5 ; moyenne = 13,2.
- Les notes doivent aussi être **saisies dans Hyperplanning** (vérifié par YNOV).

Implémentation : `src/lib/ynov/notation.ts` (testé).

## 2. Workflow « iceberg » (5 étapes obligatoires)

1. Préparation du cours (contenu selon syllabus / compétences).
2. Dépôt du plan de cours sur Moodle — **15 jours avant la 1re séance**.
3. Mise à disposition des supports sur Moodle (section organisée).
4. Dépôt sujets + grilles d'évaluation sur Moodle **+ saisie des notes sur Hyperplanning**.
5. Animation du module.

Si une seule étape manque → **facture bloquée / rejetée par YNOV**.

### États suivis dans l'app

`fiche_received → module_created → outline_generated → plan_on_moodle →
materials_on_moodle → outline_sent → subjects_on_moodle → grades_in_hp →
grades_in_mg → admin_docs_ok → invoice_ready → invoice_sent → paid`

`invoice_ready` est **bloqué** tant que :

- la progression pédagogique n'est pas envoyée **ET**
- le nombre de notes saisies < minimum requis (§1) **ET**
- les documents administratifs ne sont pas tous cochés
  (fiche de positionnement, supports Moodle, sujets/grilles Moodle, notes Hyperplanning).
  La progression pédagogique n'est **pas** une case : c'est la condition « envoyée » ci-dessus,
  déduite du dépôt du PDF ou de « Marquer comme envoyée » (US-70).

Implémentation : `src/lib/ynov/iceberg.ts`.

## 3. Progression pédagogique

**Vocabulaire** (US-78) : la **trame** est le modèle fourni par YNOV pour rédiger la
progression ; le document produit et envoyé par la formatrice est la **progression
pédagogique**. L'interface ne parle que de « progression pédagogique ». Le modèle YNOV n'est pas
stocké : ses règles (J-15, contenu par séance, dates de mise à jour) sont codées dans l'app. Les
identifiants de code (`outline`, `trame.ts`) restent inchangés.

- Document obligatoire **avant** le début des cours, envoyé à l'école 15 j avant la 1re séance.
- `trame_due_date = first_session_date − 15 jours`. Alerte dans l'app à J-15 puis J-7.
- Contenu : nom du module + YCODE, niveau, année, formatrice, **date de dernière MAJ**,
  puis une section par cours (titre, objectifs, modalités d'animation, modalités
  d'évaluation, matériel) avec la **date de dernière MAJ de chaque cours**.
- Statut : `à envoyer → envoyée → validée`.

## 4. Facture — mentions obligatoires

**Prestataire (Marie)** : raison sociale / nom-prénom · adresse · SIRET (14 chiffres) ·
n° TVA intracommunautaire (si applicable) · téléphone · e-mail.

**Client YNOV** : YNOV CAMPUS · SIRET `80442673200033` · e-mail
`fournisseurs-nantes@ynov.com` · identifiant PA `804426732_YZ_YNOV_NAN`.

**Corps** : numéro unique séquentiel (`AAAA-NNN`) · date d'émission · **référence bon de
commande / convention (obligatoire)** · nom de l'intervenante · désignation
`Prestation d'enseignement – Module [nom] (YCODE : [ycode]) – [h] heures` · quantité (heures)
· prix unitaire HT · montant HT · TVA 20 % · montant TVA · montant TTC · **une ligne par
YCODE** · paiement à 30 jours fin de mois · date d'échéance · mode = virement · **RIB**
(obligatoire pour la 1re facture).

Règles : 1 seule facture par mois après exécution des cours ; pas de paiement en août / décembre.

## 5. Facturation électronique (obligatoire depuis le 01/09/2026)

La facture **PDF simple n'est plus acceptée**. Deux canaux :

- **Plateforme Agréée (PA)** — recommandé : facture structurée **Factur-X** (PDF/A-3 + XML CII,
  norme française) déposée vers l'identifiant YNOV `804426732_YZ_YNOV_NAN` (SIRET
  `80442673200033`). Via Chorus Pro ou autre PA.
- **E-mail** (transition, à confirmer avec YNOV) : `fournisseurs-nantes@ynov.com`,
  objet `FACTURE – [raison sociale] – [N° facture]`, **1 seul fichier** conforme.

L'app génère du **Factur-X** dès le départ (profil BASIC). Implémentation : `src/lib/ynov/invoice.ts`

- lib CII dédiée.

## Note bonus de certification (ex. Opquast)

Une évaluation **individuelle** peut être marquée « note bonus de certification » (page de
l'évaluation → « Note bonus »). Règles, appliquées par `lib/ynov/notation.ts` (`averageWithBonus`) et
`lib/assessments/score-scale.ts` :

- **Saisie** : à la correction, on saisit le **score** (0 à 1000) ; la note sur 20 se calcule par un
  **barème à bandes** entières inclusives (modifiable ; barème Opquast proposé : 0–99 → 2, 100–199 → 4,
  … 939–1000 → 20, bornes à confirmer avec l'école). Score hors de toutes les bandes : erreur claire.
  Score vide : pas de note. Le serveur recalcule toujours la note depuis le score.
- **Notes exigées** : une note bonus **ne compte pas** dans les notes exigées d'après les heures, ni
  dans « Évaluations prévues ».
- **Moyenne (décision provisoire, à valider par Marie)** : le bonus est **jamais pénalisant**.
  Moyenne finale = le plus élevé de (moyenne **sans** le bonus) et (moyenne pondérée **avec** la note
  bonus, individuelle ×3), puis plafond à **20**. Une note bonus basse ou une absence de certification
  ne baisse donc jamais la moyenne.
- **Affichage** : « Bonus certification : +x,x point(s) sur la moyenne » (effet réel) dans la copie, la
  vue d'ensemble des moyennes, les appréciations, le PDF et la page étudiante ; « sans effet » quand le
  bonus ne remonte pas la moyenne. La note bonus n'entre pas dans le bilan de classe d'un module terminé.
