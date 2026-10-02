-- US-136 — Journal de projection : ce que Marie projette (ou ouvre « pour elle ») depuis la vue
-- présentatrice, par séance. Il sert à la clôture (en avance / pile / en retard / ordre changé) et
-- à l'écran de fin de séance. Données privées de Marie : RLS `owner_id = auth.uid()`, aucun accès
-- anonyme, la page projetée n'en lit rien. Purement additif.
--
-- `section_key` : clé stable de la section du déroulé (`opening`, `resource:<id>`,
-- `subject:<titre>`, `closing`) ; vide pour une ressource projetée à l'improviste (`resource_id`).
-- `kind` : `projected` = envoyé à l'écran de la classe ; `private` = « Pour moi », vue privée seule.

create table public.projection_event (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id uuid not null references public.course (id) on delete cascade,
  resource_id uuid references public.resource (id) on delete set null,
  section_key text,
  kind text not null check (kind in ('projected', 'private')),
  projected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projection_event_course_idx on public.projection_event (course_id, projected_at);

select public.mg_apply_conventions(array['projection_event']);
