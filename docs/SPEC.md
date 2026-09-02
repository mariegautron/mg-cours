# Spec fonctionnelle — écrans livrés

> Complétée au fil des epics. Vue produit consolidée ; règles métier dans `YNOV-RULES.md`.

## Connexion (`/login`)

- E-mail + mot de passe (Supabase Auth, compte unique).
- Redirige vers `?next=` si présent, sinon `/dashboard`.
- `proxy.ts` protège toutes les routes hors `/login` ; utilisateur connecté sur `/login` → `/dashboard`.

## Coquille applicative (`(app)/layout`)

- Barre latérale gauche : Tableau de bord, Modules, Ressources, Étudiants, Évaluations,
  Facturation, Réglages. En-tête : bouton repli + e-mail.
- Thème sombre par défaut.

## Ressources (E2)

Support pédagogique **réutilisable** dans N modules (≈ base « Ressources » de Notion).

### Liste `/resources`

- Cartes : titre, description (2 lignes), catégorie + tags, « Utilisée dans N modules ».
- Recherche plein texte (titre + description), filtres catégorie / tag / afficher les archivées.
- État vide → invite à créer.

### Création `/resources/new` · Édition `/resources/[id]/edit`

- Champs : **titre** (obligatoire), description, catégorie, lien (URL validée), tags
  (saisie séparée par virgules → tableau), contenu (Markdown, textarea mono).
- Validation zod côté serveur, erreurs par champ reliées (`aria-describedby` + `role="alert"`).

### Détail `/resources/[id]`

- Titre, description, catégorie/tags, lien externe.
- **Utilisation** : liste des modules (nom + année) où la ressource est employée, triés par
  année décroissante ; lien vers chaque module.
- Contenu Markdown affiché en bloc préformaté (rendu riche : plus tard).
- Actions : Modifier · Archiver / Désarchiver · Supprimer (confirmation `AlertDialog`).

### Règles

- `resource.archived_at` : une ressource archivée reste liée à ses cours mais sort des listes
  par défaut.
- Suppression : `course_resource` en `on delete cascade` (les liens disparaissent, pas les cours).
- Fichiers joints : prévus (Storage), non livrés en E2.
