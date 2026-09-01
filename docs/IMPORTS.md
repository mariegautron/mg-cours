# Imports de données

Pas d'intégration API. Marie exporte depuis ses outils et téléverse dans l'app.
Chaque import : **upload → parse → écran de mapping → dry-run avec rapport → confirmation**.

## Étudiants — CSV / XLSX (E4)

- Colonnes attendues : `nom`, `prénom`, `email` (+ `numéro étudiant`, `groupe` optionnels).
- Validation : format e-mail, doublons (par e-mail).
- Photos : upload séparé (dossier / zip) ou trombinoscope Hyperplanning.

## Trombinoscope Hyperplanning — CSV / XLSX (E4)

- Export Hyperplanning « liste des étudiants avec photos ».
- Rapproché des étudiants existants par e-mail ou nom+prénom.

## Notes Hyperplanning — CSV / XLSX (E7, contrôle)

- Export des notes saisies dans HP.
- Comparé aux notes MG COURS → coche l'étape iceberg `grades_in_hp` et signale les écarts.
- MVP : la comparaison automatique est **hors périmètre** ; case à cocher manuelle en attendant.

## Migration Notion — export ZIP (E8, one-shot)

- `scripts/notion-migrate.ts` : lit un export Notion (Markdown + CSV) et peuple la base.
- Bases source : _Ressources_, _Activités pédagogiques_, _Séances_, _Évaluations_,
  _Étudiant·es_, _Groupes projet fil rouge_.
- Dry-run + rapport avant écriture. Sauvegarde manuelle Notion recommandée avant.

## Moodle — hors MVP

Import `.mbz` / CSV envisagé après le 12/10.
