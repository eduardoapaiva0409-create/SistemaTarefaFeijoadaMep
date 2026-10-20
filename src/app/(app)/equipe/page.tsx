import { redirect } from "next/navigation";
import { EquipeView } from "@/components/equipe/equipe-view";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EquipeMembro } from "@/lib/types";

export const metadata = { title: "Equipe" };

export default async function EquipePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: membros } = await supabase
    .from("equipe_membros")
    .select("*")
    .order("created_at");

  return (
    <EquipeView
      membros={(membros ?? []) as EquipeMembro[]}
      meuId={profile.id}
      souAdmin={profile.papel === "admin"}
    />
  );
}
