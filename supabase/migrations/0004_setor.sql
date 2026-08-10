-- ════════════════════════════════════════════════════════════════════════════
-- Setor da pessoa dentro da organização da Feijoada do Escalada
-- ════════════════════════════════════════════════════════════════════════════
-- "Cargo" já era texto livre e passa a ser usado como "Função" (Apoio 3,
-- Coordenação Nova, Conselho...) — não precisa de coluna nova pra isso.
-- "Setor" é novo: qual equipe/frente a pessoa integra.

alter table public.profiles
  add column setor text
  check (setor in (
    'secretaria', 'tesouraria', 'marketing', 'infraestrutura',
    'decoracao', 'tios', 'entretenimento', 'bebidas', 'delivery'
  ));

comment on column public.profiles.setor is
  'Setor da pessoa na organização da Feijoada. Null = ainda não atribuído.';

-- handle_new_user precisa ler "setor" do metadata também, senão toda pessoa
-- nova nasceria sem setor mesmo que o formulário mande o valor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, email, cargo, papel, setor)
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
    nullif(new.raw_user_meta_data ->> 'setor', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
