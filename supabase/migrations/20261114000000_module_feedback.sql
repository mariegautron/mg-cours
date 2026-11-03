-- Questionnaire de retour des étudiant·es en fin de module : un lien de classe par module, des
-- réponses ANONYMES (aucun lien avec une personne), une synthèse pour l'enseignante.
--
-- SÉCURITÉ (même modèle que le QCM et l'espace étudiant·e) :
--  · tables sans aucun droit pour `anon`, RLS propriétaire (conventions) ;
--  · l'anonyme n'exécute que DEUX fonctions `security definer` : `mg_feedback_form` (nom du module
--    seulement) et `mg_feedback_submit` (enregistre une réponse, rien n'est relisible) ;
--  · le lien est un secret de 256 bits ; son haché sert à la recherche, le jeton en clair est
--    gardé (réservé à l'enseignante par la RLS) pour reprojeter le QR ou renvoyer le mail.
-- Nouvelles tables : sans elles, la page « Retour des étudiant·es » dit qu'elle arrive.

create table public.module_feedback_link (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  token text not null check (token ~ '^[A-Za-z0-9_-]{43}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un seul lien actif par module.
create unique index module_feedback_link_active_idx
  on public.module_feedback_link (module_id) where revoked_at is null;

create table public.module_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  link_id uuid not null references public.module_feedback_link (id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object' and length(answers::text) <= 12000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index module_feedback_module_idx on public.module_feedback (module_id, created_at desc);

select public.mg_apply_conventions(array['module_feedback_link', 'module_feedback']);
revoke all on public.module_feedback_link, public.module_feedback from anon;

-- Nom du module, si le lien est actif.
create function public.mg_feedback_form(p_link_hash text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.module_feedback_link%rowtype;
  m_name text;
begin
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into l from public.module_feedback_link where token_hash = p_link_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select name into m_name from public.module where id = l.module_id;
  return jsonb_build_object('status', 'ok', 'module_name', m_name);
end;
$$;

-- Enregistre une réponse anonyme.
create function public.mg_feedback_submit(p_link_hash text, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.module_feedback_link%rowtype;
begin
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 12000 then
    return jsonb_build_object('status', 'bad_answers');
  end if;
  select * into l from public.module_feedback_link where token_hash = p_link_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  insert into public.module_feedback (owner_id, module_id, link_id, answers)
    values (l.owner_id, l.module_id, l.id, p_answers);
  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.mg_feedback_form(text) from public, anon, authenticated;
revoke all on function public.mg_feedback_submit(text, jsonb) from public, anon, authenticated;
grant execute on function public.mg_feedback_form(text) to anon;
grant execute on function public.mg_feedback_submit(text, jsonb) to anon;
