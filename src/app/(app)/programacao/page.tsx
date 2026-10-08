import { redirect } from "next/navigation";
import { ProgramacaoView } from "@/components/programacao/programacao-view";
import { getCurrentProfile } from "@/lib/auth";
import { BLOCO_SELECT } from "@/lib/programacao";
import { createClient } from "@/lib/supabase/server";
import type { BlocoWithRelations, ProfileRef } from "@/lib/types";

export const metadata = { title: "Programação" };

export default async function ProgramacaoPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: blocos }, { data: profiles }] = await Promise.all([
    supabase
      .from("blocos")
      .select(BLOCO_SELECT)
      // Filtro no embed: o contador do card é de CONVERSA (ver BLOCO_SELECT).
      .eq("bloco_events.tipo", "comentario")
      .order("ordem"),
    supabase
      .from("profiles")
      .select("id, nome, funcao, foto_url")
      .eq("ativo", true)
      .order("nome"),
  ]);

  return (
    <ProgramacaoView
      blocos={(blocos ?? []) as BlocoWithRelations[]}
      profiles={(profiles ?? []) as ProfileRef[]}
      meuId={profile.id}
      souAdmin={profile.papel === "admin"}
    />
  );
}
