-- Report d'une séance à la suivante : à la clôture, un élément « à reporter » passe dans le déroulé
-- de la séance suivante. On garde ici de quoi l'annuler (lien d'origine, rang, séance cible) et les
-- éléments « pas fait volontairement ». Colonne additive : sans elle, la clôture fonctionne et le
-- report n'a simplement pas lieu.

alter table public.course
  add column carried_over jsonb;
