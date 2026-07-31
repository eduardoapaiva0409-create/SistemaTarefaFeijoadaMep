import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role — ignora RLS e acessa a Admin API do Auth.
 * SÓ pode ser importado de Server Actions / route handlers: a chave dá poder
 * total sobre o banco e nunca pode chegar ao browser.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está no .env.local. Sem ela não dá para " +
        "criar acessos pelo sistema — dá para cadastrar a pessoa direto no " +
        "painel do Supabase (Authentication → Users → Add user)."
    );
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
