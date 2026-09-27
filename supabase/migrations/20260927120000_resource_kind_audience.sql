-- Classement des ressources (docs/specs/ressources-classement.md) :
-- - kind : type pédagogique (nullable pour l'existant, obligatoire dans le formulaire) ;
-- - audience : `teacher` = jamais diffusé aux étudiant·es (présentation, export PDF, liens) ;
-- - category reste la matière.

create type public.resource_kind as enum (
  'course', 'workshop', 'project', 'template',
  'answer_key', 'question_bank', 'reference', 'teacher_notes'
);

create type public.resource_audience as enum ('students', 'teacher');

alter table public.resource
  add column kind public.resource_kind,
  add column audience public.resource_audience not null default 'students';

create index resource_kind_idx on public.resource (kind);

-- Garde-fou immédiat sur l'existant (le script de migration affine ensuite) :
-- corrigés et banques de questions ne partent plus chez les étudiant·es par défaut.
update public.resource
set kind = 'answer_key', audience = 'teacher'
where title ilike 'corrigé%';

update public.resource
set kind = 'question_bank', audience = 'teacher'
where kind is null and 'banque de questions' = any (tags);
