-- US-166 — Espace étudiant·e : lien PERSONNEL par étudiant·e et par module.
--
-- Une ligne par lien : jeton aléatoire de 256 bits dont SEUL le haché SHA-256 est stocké. Le lien
-- identifie la personne (prénom, résultats qu'elle a le droit de voir) ; le contenu du module vient
-- de l'instantané publié du module (`module_share_link`), jamais d'une autre table.
--
-- SÉCURITÉ (même modèle que le QCM, les résultats et la frise) :
--  · aucun accès direct de `anon` à la table : droits retirés + RLS (conventions) sans politique anonyme ;
--  · l'anonyme n'a accès qu'à UNE fonction `security definer`, `mg_student_view`, qui reçoit le
--    HACHÉ du jeton et ne renvoie que : le prénom de cette personne, l'instantané publié du module
--    et SES résultats déjà publiés (`result_link`, sans révoqués) ; jamais ceux des autres ;
--  · lien révoqué ou haché inconnu : « invalid », rien d'autre.
-- Nouvelle table : sans elle, les liens personnels sont indisponibles ; le lien de module reste.

create table public.module_student_link (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  module_id uuid not null references public.module (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  first_viewed_at timestamptz,
  view_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Un seul lien actif par personne et par module.
create unique index module_student_link_active_idx
  on public.module_student_link (module_id, student_id) where revoked_at is null;

select public.mg_apply_conventions(array['module_student_link']);

revoke all on public.module_student_link from anon;

create function public.mg_student_view(p_token_hash text, p_count boolean default true)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.module_student_link%rowtype;
  s_first text;
  m record;
  r jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into l from public.module_student_link where token_hash = p_token_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  if coalesce(p_count, true) then
    update public.module_student_link
      set view_count = view_count + 1,
          first_viewed_at = coalesce(first_viewed_at, now())
      where id = l.id;
  end if;
  select first_name into s_first from public.student where id = l.student_id;
  select payload, published_at into m
    from public.module_share_link where module_id = l.module_id and revoked_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('payload', rl.payload, 'published_at', rl.published_at)
                            order by rl.published_at desc), '[]'::jsonb)
    into r
    from public.result_link rl
    join public.assessment a on a.id = rl.assessment_id
    where a.module_id = l.module_id and rl.student_id = l.student_id and rl.revoked_at is null;
  return jsonb_build_object(
    'status', 'ok',
    'first_name', s_first,
    'payload', m.payload,
    'published_at', m.published_at,
    'results', r
  );
end;
$$;

revoke all on function public.mg_student_view(text, boolean) from public, anon, authenticated;
grant execute on function public.mg_student_view(text, boolean) to anon;
