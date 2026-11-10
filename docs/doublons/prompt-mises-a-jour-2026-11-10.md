# Doublons : mises à jour du 10 novembre 2026 (à lire AVEC prompt-claude-code-doublons.md)

Le prompt d'origine date du 9 novembre. Depuis, beaucoup de correctifs de parcours ont été codés. Ce fichier dit ce qui change.

## Étape 0 (avant tout code) : état des lieux
Pour chacune des 38 fiches D1 à D38 du rapport, regarde dans le code actuel de `main` si le doublon existe encore, a déjà été retiré, ou a changé de forme. Écris le résultat dans `docs/doublons/etat-des-lieux.md` (une ligne par fiche : « reste / déjà fait / changé + 1 phrase »). Ne refais pas ce qui est déjà fait.
Vérifie aussi `git status`, `git log -5` et si la branche `parcours-paralleles` est fusionnée dans `main`. Si elle ne l'est pas, ne touche pas aux fichiers qu'elle modifie (`git diff main...parcours-paralleles --stat`) et signale-le.

## Décisions d'Arnaud prises depuis (10/11) qui modifient le prompt
- **Lot 4 (D15) change** : un point d'étape peut être **noté OU non noté** (case « Noté », décochée par défaut ; ex. jalons notés de SCRUM). On NE retire PAS le type « point d'étape ». Une seule notion « Point d'étape » reste l'objectif, mais avec la case « Noté ».
- **Anciens Jalons (tables checkpoint / checkpoint_result)** : OK pour les retirer de l'interface SI rien n'est perdu (surtout SCRUM). On compte et on recopie d'abord (requête `decisions-nuit/jalons-a-verifier.sql`), on montre les chiffres à Arnaud, et on attend son feu vert avant toute suppression de table. Les tables restent en base en attendant.
- **Travail de groupe** : jamais de rattrapage ; absence excusée = garde la note du groupe.
- **Notes** : barème quelconque, note ramenée sur 20 arrondie au demi-point supérieur. Les moyennes gardées (lot 2, D10/D11) doivent toutes venir de ce calcul.
- **Questionnaire d'avis** : accessible depuis l'espace étudiant (bouton « Donner ton avis (anonyme) ») ; c'est voulu, ce n'est pas un doublon de lien (lot 5).
- **« Archivé »** reste le mot (pas « Rangé »). Lot 3 D16 : « Terminés » = modules archivés.
- **221 morceaux Notion** (ressources importées) : à trier dans ce chantier, lot 6 (D26/D28). Liste-les à Arnaud (combien, dans quelle famille, utilisés ou non dans un déroulé) avant de proposer quoi que ce soit. Rien n'est supprimé sans son accord.

## Règles rappelées
- Commit direct sur `main`, un commit par lot. Arnaud pousse lui-même.
- PAS de tests, PAS de `pnpm build` (le PC plante). Seulement typecheck + lint en fin de lot. Node 22 via `nvm use 22`.
- Tu ne peux pas lire la base de prod : écris les migrations et les requêtes de contrôle (avant/après) dans des fichiers, Arnaud les lance. N'écris aucune migration qui supprime une colonne ou une table dans ce lot.
- Mets à jour `docs/PARCOURS.md` à chaque lot.
- Une adresse retirée redirige ; aucun lien déjà donné ne casse.
