# Espace de correction d'un oral (lot 1)

Commits de `main` : US3 `3db2418`, logique `oral-space.ts`, puis l'écran (US1, US2, US4).
Aucun test écrit ni lancé (consigne : ils font planter le poste). Vérifié : `tsc`, ESLint, Prettier.
Rien n'a été regardé à l'écran, et aucune capture n'a été prise.

## Avant de déployer

1. **Sauvegarde** de la base cloud.
2. Relevé : `psql "$DATABASE_URL" -At -F $'\t' -f supabase/snapshots/grades-before-after.sql > avant.tsv`.
3. Appliquer `supabase/migrations/20261117000000_oral_space.sql`. Elle ne fait qu'AJOUTER la table
   `oral_space` : elle ne lit ni ne modifie aucune note, moyenne, appréciation ou résultat publié.
4. Refaire le relevé (`apres.tsv`) puis `diff avant.tsv apres.tsv` : aucune différence attendue.
   Refaire après avoir ouvert chaque oral existant et après un brouillon modifié puis abandonné.
5. Retour arrière : `drop table public.oral_space;` (rien d'autre n'en dépend).
6. Tant que la table n'existe pas, l'oral garde l'ancienne grille de correction (repli automatique).

## Ce qui est fait

- **US1** : une lettre A à D par critère (clic, Espace, Entrée ou touches A à D ; les flèches ne
  déplacent que le focus), sans point ni total. Disposition : en-tête compact, présence sur une
  ligne, critères à gauche, paliers au centre, notes privées à droite, barre du bas collante.
- **US2** : notes par critère, bloc-notes du groupe (« Pour toi seule, jamais envoyé »), notes par
  personne. Enregistrement champ par champ après environ 2 s, versions par champ, conflit : les deux
  versions sont montrées et Marie choisit. Coupure réseau : le texte reste, « Pas enregistré »,
  renvoi au retour du réseau. `oral_space` n'est lu que par la page de l'oral et ses actions.
- **US3** : une fenêtre ouverte comme projection (`window.name` = `mg-projection-…`) n'affiche, pour
  toute la correction d'une évaluation, que « Cet écran reste sur ton portable ».
  Limite : le serveur ne connaît pas le nom de la fenêtre, donc le contenu est dans les données de
  la page mais n'est jamais affiché. Un vrai contrôle serveur demanderait un marqueur envoyé avec la
  requête (cookie ou paramètre posé à l'ouverture de la projection) : à décider.
- **US4** : récapitulatif (lettres, points, présence, total), bouton « Écrire la note de groupe »
  grisé avec la raison, écriture refaite côté serveur depuis le brouillon enregistré, restauration de
  l'état précédent si une étape échoue (pas de transaction côté client), photo de la note écrite,
  badge « Note à réécrire » si une lettre ou une présence change. Rien n'est publié.
- **Oraux existants** : ils s'ouvrent avec leurs lettres (palier dont les points correspondent
  exactement), leurs commentaires et leurs présences ; règle d'absence d'origine par défaut ;
  récapitulatif « ancienne note → nouvelle note » par personne ; case « Remplacer les notes
  publiées ? » ; « Abandonner le brouillon » ; la note écrite et les résultats ne bougent pas avant
  l'écriture.

## Choix que la spécification ne tranchait pas

- Le brouillon est une table à part (`oral_space`) : tant que la note n'est pas écrite, `grade` n'est
  pas touché (donc ni moyennes ni résultats).
- Les notes par critère et par personne ne sont jamais recopiées dans les commentaires visibles par
  les étudiant·es (lot 2).
- Écriture sur un oral existant : les textes (points forts, progrès, commentaire, commentaires par
  critère) de la note sont conservés tels quels.
- Les présences « à poser » bloquent l'écriture (spec) ; sur un oral existant, elles sont reprises
  des réglages individuels.

## Pas fait

- **Oral individuel** : l'espace sait travailler sur une personne (`subject_id`), mais l'ordre de
  passage et la page de l'oral restent par groupe.
- **Mesure à 1366 × 768, 1280 × 720 et 125 %** : non faite. Test Playwright de bout en bout non écrit.
- **Vérification de la note écrite dans l'espace étudiant** via la publication : la note passe par
  `grade`, donc par le bandeau « Mettre à jour les notes publiées » existant ; non vérifié à l'écran.
- Test « bloc-notes jamais lu ailleurs » : remplacé par une vérification de code (`oral_space` n'est
  lu que dans `oral/page.tsx`, `oral/space-actions.ts`, `oral-space-server.ts`).
- Lots suivants (répartir les notes, commentaires proposés, comparaison, support PDF) : non commencés.
