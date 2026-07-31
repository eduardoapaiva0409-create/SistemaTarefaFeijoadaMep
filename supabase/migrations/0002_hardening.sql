-- ════════════════════════════════════════════════════════════════════════════
-- Endurecimento apontado pelo linter do Supabase (get_advisors)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. search_path fixo. Sem isso, quem controla o search_path da sessão pode
--    fazer a função resolver um objeto diferente do pretendido. Estas três não
--    referenciam nenhum objeto de schema, então `''` basta (pg_catalog é
--    sempre consultado).
alter function public.proxima_data(date, text)  set search_path = '';
alter function public.touch_updated_at()        set search_path = '';
alter function public.stamp_concluida_em()      set search_path = '';

-- 2. Funções de trigger não são API. Por padrão o Postgres concede EXECUTE a
--    PUBLIC, e o PostgREST então as expõe em /rest/v1/rpc/<nome> — chamáveis
--    até por quem não fez login. São SECURITY DEFINER, então ficam revogadas.
--    Trigger continua disparando: a permissão de EXECUTE é checada na CRIAÇÃO
--    do trigger, não a cada disparo.
revoke execute on function public.handle_new_user()          from public, anon, authenticated;
revoke execute on function public.log_task_changes()         from public, anon, authenticated;
revoke execute on function public.gerar_proxima_ocorrencia() from public, anon, authenticated;

-- 3. is_admin() e pode_editar_task() são usadas DENTRO das policies de RLS.
--    Tirar de `anon` (que não tem policy nenhuma) e de PUBLIC; `authenticated`
--    mantém, senão as policies que as chamam param de avaliar.
revoke execute on function public.is_admin()                 from public, anon;
revoke execute on function public.pode_editar_task(uuid)     from public, anon;
