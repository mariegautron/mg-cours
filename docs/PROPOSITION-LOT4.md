# Proposition — dépôts, QCM, documents joints, questionnaire (à valider par Marie avant tout code)

## 1. Déposer un rendu depuis l'espace
- Onglet « Évaluations » de l'espace : bouton « Déposer mon rendu » (fichier, lien, ou les deux), accusé de réception avec date et heure.
- Un dépôt par groupe (visible par ses membres) ou par personne, selon la note de groupe ou individuelle de l'évaluation.
- Un retard est signalé à Marie (« rendu en retard de 2 h »), jamais pénalisé ni affiché comme une faute à l'étudiant·e.
- Marie voit les dépôts dans « Rendus déposés » de l'évaluation. Elle peut en déposer un à la place d'une personne.
- Données : `submission` (évaluation, étudiant·e ou groupe, lien, date), `submission_file` (chemin Storage privé). RLS `owner_id`. Écriture par une fonction SQL anonyme qui reçoit le HACHÉ du jeton d'espace (même modèle que `mg_student_view`) : la personne ne peut déposer que pour elle ou son groupe.
- Reste privé : tout dépôt des autres, les notes, le carnet.

## 2. Passer le QCM depuis l'espace
- « Passer le QCM » apparaît quand un QCM est ouvert ; le lien du QCM est dérivé de l'espace, plus de collage à la main.
- Tiers-temps : durée allongée par étudiant·e, réglée par Marie sur la fiche de l'étudiant·e.

## 3. Documents joints aux cours
- Fichiers joints à une fiche, une séance ou une évaluation, téléchargeables depuis « Cours » (et à côté de « Déposer mon rendu » si rattachés à une évaluation).
- Visibilité « Pour toi seule » respectée ; publication différée possible comme les corrigés. Un fichier non publié n'entre jamais dans l'instantané.

## 4. Questionnaire de fin de module
- Lien « Donner mon avis » dans l'espace vers le questionnaire anonyme existant. Les réponses ne sont jamais reliées au jeton de l'espace : le lien ouvre le questionnaire de la classe, sans identifiant.

## Questions pour Marie
- Un dépôt peut-il être remplacé tant que l'évaluation est ouverte ?
- Après la date limite : dépôt refusé, ou accepté et signalé en retard ?
- Taille maximale par fichier ?
