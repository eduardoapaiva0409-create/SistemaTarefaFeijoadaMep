-- ════════════════════════════════════════════════════════════════════════════
-- Materiais — vídeos, imagens e artes do marketing
-- ════════════════════════════════════════════════════════════════════════════
-- Uma "pasta compartilhada" para o marketing subir o que for usado na
-- divulgação da Feijoada. O arquivo mora no bucket `materiais` do Storage; a
-- tabela `materiais` guarda o que o Storage não sabe: nome original, pasta,
-- descrição e quem enviou. Pastas têm um nível só — é um evento, não um Drive.

-- ────────────────────────────────────────────────────────────────────────────
-- material_pastas
-- ────────────────────────────────────────────────────────────────────────────
create table public.material_pastas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(btrim(nome)) between 1 and 80),
  criado_por uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- materiais
-- ────────────────────────────────────────────────────────────────────────────
create table public.materiais (
  id          uuid primary key default gen_random_uuid(),

  -- Apagar a pasta NÃO apaga os arquivos: eles voltam para a raiz.
  pasta_id    uuid references public.material_pastas (id) on delete set null,

  -- Nome como a pessoa enviou ("Flyer final (2).png") — é o que a tela mostra
  -- e o nome que o arquivo ganha ao baixar.
  nome        text not null check (char_length(btrim(nome)) between 1 and 200),

  -- Caminho no bucket: "<uuid>/<nome-sem-acento>". O uuid garante unicidade;
  -- mover de pasta mexe só em `pasta_id`, o arquivo não sai do lugar.
  caminho     text not null unique,

  -- JPEG de ~480px gerado no navegador no envio (de imagem, ou um quadro do
  -- vídeo), no mesmo "<uuid>/" do arquivo. A grade carrega só isso: foto de
  -- celular tem 5–10 MB, e trinta delas numa tela comeriam a cota de tráfego.
  -- Null = o navegador não decodificou o formato (HEIC no Chrome, por ex.).
  miniatura   text,

  mime        text,
  tamanho     bigint not null default 0 check (tamanho >= 0),
  descricao   text,

  enviado_por uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index materiais_pasta_idx on public.materiais (pasta_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════════════════
-- Todo mundo da organização vê e envia. Organizar (renomear, mover, descrever)
-- é colaborativo; apagar fica com quem enviou/criou ou com o admin.
alter table public.material_pastas enable row level security;
alter table public.materiais       enable row level security;

create policy material_pastas_select on public.material_pastas
  for select to authenticated using (true);

create policy material_pastas_insert on public.material_pastas
  for insert to authenticated
  with check (criado_por = auth.uid() or public.is_admin());

create policy material_pastas_update on public.material_pastas
  for update to authenticated
  using (criado_por = auth.uid() or public.is_admin());

create policy material_pastas_delete on public.material_pastas
  for delete to authenticated
  using (criado_por = auth.uid() or public.is_admin());

create policy materiais_select on public.materiais
  for select to authenticated using (true);

create policy materiais_insert on public.materiais
  for insert to authenticated
  with check (enviado_por = auth.uid());

create policy materiais_update on public.materiais
  for update to authenticated using (true) with check (true);

create policy materiais_delete on public.materiais
  for delete to authenticated
  using (enviado_por = auth.uid() or public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- Storage — bucket `materiais`
-- ════════════════════════════════════════════════════════════════════════════
-- PÚBLICO para leitura: o link do arquivo abre sem login, para dar para mandar
-- o vídeo no WhatsApp ou para quem vai imprimir a arte. O caminho tem um uuid,
-- então não dá para adivinhar URL. LISTAR o bucket, porém, só logado — a
-- policy de select abaixo é só para `authenticated`.
--
-- Sem `file_size_limit` no bucket: vale o limite global do projeto (Storage →
-- Settings). No plano Free ele é de 50 MB por arquivo, o que barra vídeo
-- longo; no Pro dá para subir até 500 GB.
insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', true)
on conflict (id) do nothing;

-- Remover um arquivo exige SELECT além de DELETE no Storage.
create policy "materiais_select_autenticado" on storage.objects
  for select to authenticated
  using (bucket_id = 'materiais');

create policy "materiais_insert_autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materiais');

-- `owner_id` é o `sub` do JWT de quem enviou (texto, não uuid).
create policy "materiais_delete_dono_ou_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'materiais'
    and (owner_id = (select auth.uid())::text or public.is_admin())
  );
