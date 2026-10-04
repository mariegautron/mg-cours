-- « Où rendre » : l'endroit où les étudiant·es déposent leur travail (Moodle, section…), repris dans
-- le cadre projeté et dans le cadre de l'évaluation individuelle. Additif : une colonne nullable ;
-- sans elle, le champ répond « disponible après la mise à jour ».
alter table public.assessment add column if not exists where_to_submit text;
