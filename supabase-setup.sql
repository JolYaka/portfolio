-- ============================================================
--  Portfolio — stockage en ligne via Supabase
--  À coller dans : Supabase Dashboard > SQL Editor > New query > Run
--  Sûr à ré-exécuter (idempotent).
-- ============================================================

-- bcrypt (crypt / gen_salt). Sur Supabase, pgcrypto vit dans le schéma "extensions".
create extension if not exists pgcrypto with schema extensions;

-- 1) Table : une seule ligne (id = 1) = tout le contenu du portfolio.
create table if not exists public.portfolio (
  id         int primary key default 1,
  data       jsonb not null default '{}'::jsonb,
  code_hash  text  not null,
  updated_at timestamptz not null default now(),
  constraint portfolio_single_row check (id = 1)
);

-- 2) Ligne initiale. Code par défaut = "1234" (à changer depuis le site).
--    Ne fait rien si la ligne existe déjà (ne réinitialise pas le code).
insert into public.portfolio (id, data, code_hash)
values (1, '{}'::jsonb, extensions.crypt('1234', extensions.gen_salt('bf')))
on conflict (id) do nothing;

-- 3) RLS : lecture publique, aucune écriture directe.
alter table public.portfolio enable row level security;

drop policy if exists "portfolio public read" on public.portfolio;
create policy "portfolio public read"
  on public.portfolio for select
  using (true);
-- (Pas de policy INSERT/UPDATE/DELETE => écritures bloquées pour anon.)

-- 4) Fonctions serveur (SECURITY DEFINER) : elles seules peuvent écrire,
--    après vérification du code. search_path inclut "extensions" pour crypt().

-- 4a) Vérifie le code (au déverrouillage).
create or replace function public.verify_portfolio_code(p_code text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.portfolio
    where id = 1 and code_hash = crypt(p_code, code_hash)
  );
$$;

-- 4b) Enregistre le contenu (au bouton "Enregistrer"). Rejette si code faux.
create or replace function public.save_portfolio(p_code text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.portfolio
    where id = 1 and code_hash = crypt(p_code, code_hash)
  ) then
    raise exception 'code invalide';
  end if;
  update public.portfolio
     set data = p_data, updated_at = now()
   where id = 1;
end;
$$;

-- 4c) Change le code. Rejette si l'ancien code est faux.
create or replace function public.change_portfolio_code(p_old text, p_new text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if length(coalesce(p_new, '')) < 4 then
    raise exception 'nouveau code trop court';
  end if;
  if not exists (
    select 1 from public.portfolio
    where id = 1 and code_hash = crypt(p_old, code_hash)
  ) then
    raise exception 'ancien code invalide';
  end if;
  update public.portfolio
     set code_hash = crypt(p_new, gen_salt('bf'))
   where id = 1;
end;
$$;

-- 5) Autorise l'appel des fonctions depuis le site (rôle public "anon").
grant execute on function public.verify_portfolio_code(text)        to anon, authenticated;
grant execute on function public.save_portfolio(text, jsonb)        to anon, authenticated;
grant execute on function public.change_portfolio_code(text, text)  to anon, authenticated;

-- ============================================================
--  Fini. Récupère ensuite dans Settings > API :
--    - Project URL         -> SUPABASE_URL dans script.js
--    - Project API key (anon public) -> SUPABASE_ANON_KEY dans script.js
--  La clé "anon" est PUBLIQUE par nature : sans droit d'écriture (RLS),
--  elle ne permet que la lecture + l'appel des fonctions ci-dessus.
-- ============================================================
