-- ════════════════════════════════════════════════════════════════════════════
-- Fotos dos participantes + pessoas sem login no sistema
-- ════════════════════════════════════════════════════════════════════════════
-- Nem todo participante da Feijoada vai acessar o sistema — muita gente só
-- precisa ficar registrada com nome, função e setor. `tem_acesso = false`
-- marca essa pessoa; ela ainda existe como profile (pode ser responsável por
-- tarefa) mas o e-mail/senha são gerados internamente, ninguém usa.

alter table public.profiles
  add column foto_url text,
  add column tem_acesso boolean not null default true;

comment on column public.profiles.foto_url is
  'URL pública da foto no bucket "avatars". Null = sem foto, mostra iniciais.';
comment on column public.profiles.tem_acesso is
  'false = pessoa só registrada (função/setor/foto), sem login real no sistema.';

-- ────────────────────────────────────────────────────────────────────────────
-- Bucket de fotos — público pra leitura (avatar de time pequeno, sem dado
-- sensível), escrita só por admin via is_admin() (mesma função das policies
-- de tasks/profiles).
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_admin());

create policy "avatars_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and public.is_admin());

create policy "avatars_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and public.is_admin());

-- handle_new_user precisa ler foto_url e tem_acesso do metadata também.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, cargo, papel, setor, foto_url, tem_acesso)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'cargo', ''),
    case
      when not exists (select 1 from public.profiles) then 'admin'
      when new.raw_user_meta_data ->> 'papel' = 'admin' then 'admin'
      else 'colaborador'
    end,
    nullif(new.raw_user_meta_data ->> 'setor', ''),
    nullif(new.raw_user_meta_data ->> 'foto_url', ''),
    coalesce((new.raw_user_meta_data ->> 'tem_acesso')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
