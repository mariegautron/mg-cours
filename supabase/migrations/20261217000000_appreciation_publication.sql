-- Publication de l'appréciation du module dans l'espace étudiant·e. Rien n'est visible sans un geste
-- de l'enseignante : `published_text` est la photo du texte au moment de la publication (null = pas
-- publiée). Modifier `text` ensuite ne change pas ce que la personne voit. Aucune donnée modifiée.
alter table public.appreciation
  add column published_text text,
  add column published_at timestamptz;
