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
- Total des points = Σ(note × coefficient).
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

- la trame pédagogique n'est pas envoyée **ET**
- le nombre de notes saisies < minimum requis (§1) **ET**
- les documents administratifs ne sont pas tous cochés
  (fiche de positionnement, progression pédagogique, supports Moodle, sujets/grilles Moodle).

Implémentation : `src/lib/ynov/iceberg.ts`.

## 3. Trame pédagogique

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
