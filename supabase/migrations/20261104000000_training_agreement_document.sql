-- Convention de formation professionnelle d'un module : un PDF déposé dans l'onglet Documents,
-- comme la progression envoyée. Additif : ajoute seulement une valeur à l'énumération existante.
alter type public.module_document_kind add value if not exists 'training_agreement';
