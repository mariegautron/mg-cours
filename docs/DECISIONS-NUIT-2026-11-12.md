# Décisions de la nuit du 12 au 13 novembre 2026 (rebranding Marelle + corrections UX/UI)

Arnaud dort ; je tranche seul et je note ici chaque choix, pour qu'il puisse le relire et le
défaire. Sources : `docs/ux-ui-commun/prompt-corrections.md`, `docs/ux-ui-commun/rapport.md`,
prompt de rebranding (Library), planche « DA Marelle ». Aucun test lancé, aucune donnée touchée,
aucune migration. Vérification : `tsc --noEmit` + ESLint/Prettier sur les fichiers modifiés.

## Rebranding « Marelle » (lot R)

- **Margot dessinée tout de suite.** Le prompt §3 disait « garder la chouette tant que le dessin
  n'existe pas », mais le §4 et la planche valident déjà Margot (SVG du canvas). J'ai donc repris ce
  dessin dans `Mascot` (contour = texte, aile = accent, case de marelle = couleur de statut) avec les
  4 humeurs. Les anciennes humeurs restent acceptées (`happy`→contente, `thinking`→pensive,
  `party`→contente, `alert`→alerte) ; nouvelle `sleepy`→endormie, utilisée par défaut dans les états
  vides. Décorative par défaut ; `informative` lui donne `role="img"` et « Margot, la pie de Marelle… ».
- **Plus d'animation de flottement par défaut** (`float=false`) : esprit sobre demandé.
- **Logo** : tête de Margot + « marelle » en minuscules (§4 de la DA, plus récent que le « Marelle »
  en casse normale du §2). Le texte reste lu « Marelle » ; le lien a un libellé explicite.
- **Grande chouette du bas du menu retirée** ; icônes du menu monochromes, l'actif prend l'accent.
- **Jetons** : remplacés dans le bloc `.dark` existant (pas de second thème). Les anciens accents
  (`violet`, `coral`, `mint`, `sun`, `sky`) pointent désormais vers l'accent et les couleurs de
  statut : tout le code qui les utilise suit sans réécriture. Nouveaux jetons `--status-*`,
  `--field`, `--btn-border`, `--featured-border`, `--private`, `--margot-*`.
- **Thème clair** : gardé tel quel (violet), avec les mêmes pastilles de statut.
- **Halos et dégradés** : classes `.halo` et `.bg-shell` neutralisées, taches floues de la page de
  connexion supprimées. Ombres `shadow-xs/sm` mises à zéro (les menus flottants gardent les leurs).
- **Rayons** : `--radius` à 10 px (boutons, champs) ; `rounded-2xl` et `rounded-3xl` ramenés à
  16 px (cartes) par les jetons, sans toucher aux 160 usages.
- **Boutons** : 36 px dessinés, zone cliquable de 44 px par un pseudo-élément ; contour du bouton
  secondaire `#34343F` ; champs sur fond `#1F1F26` avec contour `#6A6A78` (3:1).
- **Focus** : règle globale `:focus-visible` (3 px accent, décalage 3 px).
- **Densité** : nouveau réglage « Compacte » (défaut) / « Confortable » dans Réglages > Apparence,
  cookie `density`, à côté de la taille du texte. Compacte = racine à 15 px, titre de page à 22 px.
- **Projection** : réglage clair / sombre propre aux vues projetées, mémorisé dans ce navigateur
  (`localStorage`), indépendant du thème de l'appli ; sans choix, la projection suit l'appli.
- **E-mails** : nom d'expéditeur « Marie via Marelle », adresse technique inchangée. **Sauf la
  facture** envoyée à l'école (identité de Marie, groupe B) : expéditeur inchangé.
- **PDF** : « Généré avec Marelle » en pied de page de la grille et des résultats ; noms de fichier
  tirés du titre (`grille-jalon-2-sprint-review.pdf`, `resultats-….pdf`). La progression et la
  facture (documents envoyés à l'école) ne portent pas la mention.
- **Aperçus de liens** : le lien de classe et l'espace étudiant·e ont pour titre le nom du module
  puis « Marelle » ; image d'aperçu commune sans aucune donnée privée (`opengraph-image.tsx`).
- **Exports** : fichiers `marelle-mes-donnees-….zip`, en-tête CSV « Marelle · export… ».
- **Restent « MG COURS » / « mg-cours » (groupes B et C, volontairement)** : nom du paquet, du
  projet Supabase et Vercel, domaine `mg-cours.vercel.app`, sel technique des QCM, migrations,
  seed, scripts de migration Notion, titres de sources Notion citées dans la doc, historique du
  BACKLOG.
