import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Perfil de quem está logado. Usa getClaims() (assinatura verificada
 * localmente, ~0ms) em vez de getUser(), que faria um round-trip ao Auth a
 * cada render de Server Component.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();

  if (profile) return profile as Profile;

  // Auto-reparo: usuário criado no Auth antes do trigger existir. Cria o perfil
  // no primeiro acesso para não deixar ninguém preso numa tela vazia.
  const email = typeof claims.email === "string" ? claims.email : null;
  const { data: criado } = await supabase
    .from("profiles")
    .insert({
      id: claims.sub,
      nome: email?.split("@")[0] ?? "Sem nome",
      email,
    })
    .select("*")
    .maybeSingle();

  return (criado as Profile) ?? null;
}
