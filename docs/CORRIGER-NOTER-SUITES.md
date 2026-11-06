# « Corriger et noter » — suites (US-173)

État après le commit `d5eaee7`. Les numéros renvoient aux 24 problèmes du prompt d'origine.
Aucun test n'a été écrit ni lancé (demande explicite : ils font planter le poste). Vérifié
seulement : `tsc --noEmit`, ESLint, Prettier. Rien n'a été regardé dans le navigateur.

## Reste à faire

### P0
- **#4 — QCM dans la vue de correction.** Seul un bandeau avec lien vers la relecture du QCM a été
  ajouté. Il manque l'affichage des réponses QCM directement dans la correction, à côté de la grille.
- **#14 — Relecture d'une copie QCM.** Reste une page à part : pas d'enregistrement automatique, pas
  de « précédent / suivant », pas de commentaire par question, pas de bouton Enregistrer collant.

### P1
- **#13 — En entier.** Seule une partie est faite (libellés, repli de la liste des copies).
- **#16 — Bloc-notes privé par groupe pour l'oral.** Demande une colonne (ou table) en base et une
  règle RLS. Non commencé. Le statut « en cours » au démarrage du chrono est fait.
- **#18 — Comparer comme vue « par critère ».** Seul un lien « Comparer un critère » existe. La vue
  Comparer n'est pas intégrée au sélecteur « par copie / par critère ».

### P2
- **#19 — « Voir comme l'étudiant·e ».** Aperçu absent. Audit à faire : vérifier que l'aperçu et le
  PDF n'incluent jamais le carnet d'observations, les brouillons ni le bloc-notes d'oral.

### Technique
- **Copies partielles déjà en base.** Elles gardent leur note jusqu'au prochain enregistrement
  (aucune garde à la lecture). Option : migration qui met `value = null` sur les copies incomplètes.
- **Comparer.** `saveCriterionCell` n'est pas protégé contre l'écrasement entre onglets (la fusion
  par champ ne couvre que `saveGrade`).
- **Tests.** `session.test.ts` et `menu.test.ts` ont été adaptés mais pas lancés. Aucun test ajouté
  pour `merge.ts`, `gradingProgress`, ni le parcours Playwright à 1366×768.
- **Vérification visuelle** à 1366×768, 1280×720 et zoom 125 % : critère « premier palier visible
  sans défiler » non confirmé.

## Questions pour Marie

1. **QCM + grille (#4).** Quand une copie a une note QCM automatique et une note de grille, laquelle
   fait foi dans la moyenne ? La grille, le QCM, ou une combinaison ?
2. **Copie en cours (#2).** Une copie à moitié corrigée doit-elle rester hors moyenne (choix actuel)
   ou compter avec les critères déjà posés ?
3. **Bloc-notes d'oral (#16).** Veux-tu un bloc-notes privé par groupe pendant l'oral ? Doit-il
   rester visible après l'oral, ou être supprimé à la clôture ?
4. **Vue « par critère » (#18).** Veux-tu que Comparer remplace l'actuelle vue « par critère »,
   ou que les deux coexistent ?
5. **Aperçu étudiant·e (#19).** Veux-tu voir la copie exactement comme l'étudiant·e la recevra
   avant l'envoi des résultats ? Obligatoire avant l'envoi, ou optionnel ?
6. **Conflit entre onglets.** Quand deux onglets modifient le même champ, le message propose de
   recharger. Préfères-tu pouvoir choisir quelle version garder ?
7. **Copies partielles anciennes.** On remet à « en cours » (sans note) celles déjà enregistrées
   avec une note incomplète, ou on les laisse comme elles sont ?
