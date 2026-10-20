-- ════════════════════════════════════════════════════════════════════════════
-- Equipe — quem participa da organização, setor por setor
-- ════════════════════════════════════════════════════════════════════════════
-- A equipe é um organograma, não uma lista de acessos. Até aqui "quem está no
-- time" e "quem entra no sistema" eram a mesma tabela (`profiles`), e mostrar
-- alguém que só ajuda no dia exigia criar um usuário de mentira no Auth
-- (`tem_acesso = false`). Aqui é só nome, setor e função: sem e-mail, sem
-- login, sem vínculo com `profiles`. A mesma pessoa pode estar nas duas
-- tabelas (ou em dois setores) e ninguém tenta casar uma com a outra.

create table public.equipe_membros (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(btrim(nome)) between 1 and 80),

  -- Mesma lista de profiles.setor e tasks.setor (0006/0007). Setor novo entra
  -- nos três checks e em SETOR_ORDER (src/lib/format.ts).
  setor      text not null
             check (setor in (
               'coordenacao', 'secretaria', 'tesouraria', 'marketing', 'infraestrutura',
               'decoracao', 'tios', 'entretenimento', 'bebidas', 'delivery'
             )),

  -- Só as duas funções que o organograma mostra em cada setor.
  funcao     text not null default 'apoio'
             check (funcao in ('coordenacao', 'apoio')),

  criado_por uuid references public.profiles (id) on delete set null,

  -- A ordem dentro do grupo é a de inclusão — sem coluna `ordem`, ninguém
  -- precisa arrastar um nome.
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════════════
-- Montar a equipe é a várias mãos (cada coordenação preenche o seu setor);
-- tirar alguém fica com quem incluiu ou com o admin — o acordo da Programação.
alter table public.equipe_membros enable row level security;

create policy equipe_membros_select on public.equipe_membros
  for select to authenticated using (true);

create policy equipe_membros_insert on public.equipe_membros
  for insert to authenticated
  with check (criado_por = auth.uid() or public.is_admin());

create policy equipe_membros_update on public.equipe_membros
  for update to authenticated using (true) with check (true);

create policy equipe_membros_delete on public.equipe_membros
  for delete to authenticated
  using (criado_por = auth.uid() or public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- Ponto de partida: quem já estava em `profiles` com setor e função entra no
-- organograma uma vez, para ninguém redigitar. Daqui em diante as duas listas
-- seguem separadas. `criado_por` fica nulo — só o admin tira essas linhas.
-- ────────────────────────────────────────────────────────────────────────────
insert into public.equipe_membros (nome, setor, funcao, created_at)
select nome, setor, funcao, created_at
from public.profiles
where ativo
  and setor is not null
  and funcao in ('coordenacao', 'apoio');
