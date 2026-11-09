# Décisions de la nuit du 9 au 10 novembre 2026

Arnaud absent : chaque décision prise seule, l'option la plus prudente et réversible. À relire.

## Commits et migrations à appliquer

| Commit | Contenu | Migration |
| ------ | ------- | --------- |
| `7317f78` (+ doc `b62703d`) | Règles de notation par école (rattrapages lot 6) | `20261126000000_school_grading_rules.sql` |
| `617c161` | Chrono du QCM au premier affichage des questions (lot 4) | `20261126000001_quiz_clock_first_question.sql` |

Ordre : appliquer les migrations avant (ou juste après) le push ; sans elles, l'appli garde les valeurs par défaut (YNOV) et l'ancien chrono, rien ne casse.

## Décisions

1. **Règles de notation : normalisation sur 20 non réglable.** Toutes les écoles connues notent sur 20 (Hyperplanning) ; un réglage de plus serait inutile aujourd'hui.
2. **Règle « absence non prévenue = 0 » (0d) pas transformée en réglage d'école.** Le choix « Absent·e · garde la note du groupe » existe déjà sur chaque copie de groupe (0e) : Marie choisit au cas par cas, plus souple qu'un réglage.
3. **Adresse e-mail des étudiant·es (22).** L'adresse enregistrée passait déjà avant le modèle ; le modèle reste une proposition quand aucune adresse n'est enregistrée (envoi des liens de QCM). Seul le texte d'aide a changé.
4. **Rattrapage d'un travail de groupe (21).** Seulement si l'école a la règle « Rattrapage individuel » ; le rattrapage est individuel, sa note compte avec le coefficient de la note de groupe qu'elle remplace.
5. **Chrono du QCM.** Recalé une seule fois, dans les 5 min après « Commencer », tant qu'aucune réponse n'est enregistrée : impossible de s'en servir pour regagner du temps.
6. **Point d'étape = le type existant « Point d'étape ».** Pas de nouvelle colonne « type » : une évaluation est un point d'étape quand son type est « Point d'étape (sans note) » (l'ancien libellé « non noté, hors moyenne » est reconnu et repris). Les retours vont dans une table à part (`progress_review`) : un point d'étape n'a jamais de note, donc aucune moyenne ne peut changer. Un ancien « point d'étape » qui aurait déjà des notes les garde dans les moyennes (rien n'est filtré sur les notes) ; il sort seulement du décompte « Prévues / notes exigées ».
7. **Publication des retours.** « Terminer le retour » ferme le dépôt ; les étudiant·es ne voient le retour qu'après « Mettre à jour l'espace étudiant » sur l'écran de commentaire (version figée). Modifier un retour terminé le repasse « en cours » ; l'ancienne version publiée reste visible jusqu'à la publication suivante. Choix fait pour coller à la règle « Mettre à jour » de l'espace.
8. **« Proposer » du point d'étape** : gabarit selon le repère, vouvoiement pour un groupe, tutoiement pour une personne ; jamais les notes privées. Le commentaire global proposé reprend les repères posés.
9. **Retrait des anciens « Jalons » (suivi non noté P1…P6).** Pages, composants, code et route de fichiers supprimés, bouton « Jalons » retiré de la fiche module. **Tables `checkpoint` / `checkpoint_result` gardées en base** (rien d'effacé ; elles restent dans « Exporter mes données »). À décider : les supprimer pour de bon si Marie n'y a rien saisi.
10. **Rappel dans l'évaluation notée** : encart « Points d'étape » repliable dans l'espace de correction (oral et rendu), avec l'historique par critère. L'écran projeté de l'oral ne le montre jamais (il ne lit pas ces données).
11. **Pas de tests écrits ni lancés** (règle d'Arnaud : le PC plante). Seulement types et lint, en fin de lot.
