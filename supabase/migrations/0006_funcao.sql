-- ════════════════════════════════════════════════════════════════════════════
-- Função vira lista fechada + setor de Coordenação
-- ════════════════════════════════════════════════════════════════════════════
-- Até aqui "função" era a coluna `cargo`, texto livre ("Apoio 3", "Coordenação
-- Nova", "Conselho"). Texto livre não filtra: cada pessoa escreve diferente e
-- o filtro vira uma lista de variações. A organização da Feijoada tem três
-- funções de verdade — Coordenação, Apoio e Conselheiro — então a coluna passa
-- a ser lista fechada e ganha o nome que a interface já usava: `funcao`.

alter table public.profiles rename column cargo to funcao;

-- Normaliza o que já estava gravado como texto livre antes de fechar a lista.
-- O que não encaixar em nenhuma das três vira null (= sem função definida),
-- e não bloqueia a migration com erro de check.
update public.profiles
set funcao = case
  when funcao ilike '%coorden%'  then 'coordenacao'
  when funcao ilike '%apoio%'    then 'apoio'
  when funcao ilike '%conselh%'  then 'conselheiro'
  else null
end
where funcao is not null;

alter table public.profiles
  add constraint profiles_funcao_check
  check (funcao in ('coordenacao', 'apoio', 'conselheiro'));

comment on column public.profiles.funcao is
  'Função da pessoa na organização da Feijoada. Null = ainda não atribuída.';

-- ────────────────────────────────────────────────────────────────────────────
-- Setor de Coordenação — a frente que coordena as outras também é um setor.
-- ────────────────────────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_setor_check;

alter table public.profiles
  add constraint profiles_setor_check
  check (setor in (
    'coordenacao', 'secretaria', 'tesouraria', 'marketing', 'infraestrutura',
    'decoracao', 'tios', 'entretenimento', 'bebidas', 'delivery'
  ));

-- handle_new_user acompanha o rename: o metadata agora manda 'funcao'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, funcao, papel, setor, foto_url, tem_acesso)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'funcao', ''),
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
